import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import crypto from "node:crypto";
import pg from "npm:pg@8.16.3";
import { PgBoss } from "npm:pg-boss@12.37.1";

const connectionString = Deno.env.get("SUPABASE_DB_URL") || "";
const Pool = (pg as any).Pool;
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});
const QUEUE = "mfw-capital-events-v1";
const CONSUMER = "mfw-capital-receipt-v1";

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch (_) {
    return false;
  }
}

async function authorised(req: Request) {
  const supplied = req.headers.get("x-mfw-outbox-token") || "";
  const r = await pool.query(
    `select secret_value
       from mfw_ops.runtime_secrets
      where control_key='outbox_relay_cron'
        and enabled=true
      limit 1`,
  );
  return Boolean(r.rowCount) && safeEqual(supplied, String(r.rows[0].secret_value || ""));
}

async function claim(limit = 25) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `select id,event_key,topic,aggregate_type,aggregate_id,payload,attempts
         from authority_outbox
        where (
          status in ('pending','failed') and available_at <= now()
        ) or (
          status='dispatching' and updated_at < now() - interval '5 minutes'
        )
        order by created_at asc
        for update skip locked
        limit $1`,
      [limit],
    );
    if (r.rowCount) {
      await client.query(
        `update authority_outbox
            set status='dispatching',
                attempts=attempts+1,
                last_error=null,
                updated_at=now()
          where id = any($1::uuid[])`,
        [r.rows.map((x: any) => x.id)],
      );
    }
    await client.query("COMMIT");
    return r.rows;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function markDispatched(id: string, jobId: string | null) {
  await pool.query(
    `update authority_outbox
        set status='dispatched',
            pg_boss_job_id=$2,
            dispatched_at=coalesce(dispatched_at,now()),
            updated_at=now(),
            last_error=null
      where id=$1`,
    [id, jobId],
  );
}

async function markFailed(id: string, error: unknown, attempts: number) {
  const delaySeconds = Math.min(3600, Math.max(5, Math.pow(2, Math.min(10, attempts)) * 5));
  await pool.query(
    `update authority_outbox
        set status='failed',
            last_error=$2,
            available_at=now()+($3::text || ' seconds')::interval,
            updated_at=now()
      where id=$1`,
    [id, String((error as any)?.message || error).slice(0, 1000), delaySeconds],
  );
}

async function receipt(job: any) {
  const data = job?.data || {};
  const payloadText = JSON.stringify(data.payload || {});
  const digest = crypto.createHash("sha256").update(payloadText).digest("hex");
  await pool.query(
    `insert into authority_delivery_receipts(
        outbox_id,event_key,topic,consumer,pg_boss_job_id,payload_digest,metadata
      ) values($1,$2,$3,$4,$5,$6,$7::jsonb)
      on conflict(event_key) do nothing`,
    [
      String(data.outboxId || ""),
      String(data.eventKey || ""),
      String(data.topic || ""),
      CONSUMER,
      String(job.id || ""),
      digest,
      JSON.stringify({
        aggregateType: data.aggregateType || null,
        aggregateId: data.aggregateId || null,
      }),
    ],
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!(await authorised(req))) return new Response("forbidden", { status: 403 });

  const boss = new PgBoss({
    connectionString,
    schema: "mfw_pgboss",
    application_name: "mfw-edge-outbox-relay",
    registerInstance: false,
    supervise: false,
    schedule: false,
    useListenNotify: false,
    max: 1,
  } as any);

  const stats = { claimed: 0, dispatched: 0, failed: 0, fetched: 0, completed: 0 };
  try {
    await boss.start();
    const existing = await boss.getQueue(QUEUE).catch(() => null);
    if (!existing) await boss.createQueue(QUEUE);

    const rows = await claim(25);
    stats.claimed = rows.length;

    for (const row of rows) {
      try {
        const jobId = await boss.send(QUEUE, {
          outboxId: row.id,
          eventKey: row.event_key,
          topic: row.topic,
          aggregateType: row.aggregate_type,
          aggregateId: row.aggregate_id,
          payload: row.payload,
        }, {
          retryLimit: 3,
          retryDelay: 5,
          retryBackoff: true,
          expireInSeconds: 120,
        } as any);
        await markDispatched(String(row.id), jobId ? String(jobId) : null);
        stats.dispatched++;
      } catch (e) {
        await markFailed(String(row.id), e, Number(row.attempts || 0) + 1);
        stats.failed++;
      }
    }

    while (true) {
      const jobs = await boss.fetch(QUEUE, { batchSize: 10 } as any);
      const batch = Array.isArray(jobs) ? jobs : (jobs ? [jobs] : []);
      if (!batch.length) break;
      stats.fetched += batch.length;
      for (const job of batch) {
        try {
          await receipt(job);
          await boss.complete(QUEUE, job.id);
          stats.completed++;
        } catch (e) {
          await boss.fail(QUEUE, job.id, String((e as any)?.message || e));
        }
      }
      if (batch.length < 10) break;
    }

    return Response.json({ status: "ok", queue: QUEUE, consumer: CONSUMER, ...stats });
  } catch (e) {
    return Response.json(
      { status: "error", error: String((e as any)?.message || e) },
      { status: 500 },
    );
  } finally {
    try { await boss.stop({ graceful: false } as any); } catch (_) {}
  }
});
