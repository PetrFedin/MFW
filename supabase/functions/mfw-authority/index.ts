import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import process from "node:process";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import QRCode from "npm:qrcode@1.5.4";
import pg from "npm:pg@8.16.3";

const FUNCTION_NAME = "mfw-authority";
const SOURCE_REPOSITORY = "PetrFedin/MFW";
const SOURCE_PATHS: Record<string, string> = {
  "server-v2.js": "mfw-api/server-v2.js",
  "brand365-store.js": "mfw-api/brand365-store.js",
  "social-providers.js": "mfw-api/social-providers.js",
  "feature-flags.js": "mfw-api/feature-flags.js",
  "reverification-catchup.js": "mfw-api/reverification-catchup.js",
  "organisation-registry.js": "mfw-api/organisation-registry.js",
  "organisation-credential.js": "mfw-api/organisation-credential.js",
  "capital-authority.js": "mfw-api/capital-authority.js",
  "event-data.js": "mfw/platform/event-data.js",
};
let authoritySources: Record<string, string> = {};
let sourceLoadPromise: Promise<Record<string, string>> | null = null;

const edgePublicBaseUrl =
  Deno.env.get("MFW_PUBLIC_BASE_URL") ||
  ((Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/" + FUNCTION_NAME);
const edgeAllowedOrigin =
  Deno.env.get("MFW_ALLOWED_ORIGIN") || "https://mfw-platform.onrender.com";
const edgeReleaseSha =
  Deno.env.get("MFW_RELEASE_SHA") || "__MFW_RELEASE_SHA__";

(globalThis as any).__MFW_EDGE_RUNTIME__ = true;
(globalThis as any).__MFW_DATABASE_URL__ = Deno.env.get("SUPABASE_DB_URL") || "";
(globalThis as any).__MFW_ALLOWED_ORIGIN__ = edgeAllowedOrigin;
(globalThis as any).__MFW_PUBLIC_BASE_URL__ = edgePublicBaseUrl;
(globalThis as any).__MFW_RELEASE_SHA__ = edgeReleaseSha;
(globalThis as any).__MFW_QRCODE__ = QRCode;
(globalThis as any).__MFW_PG_POOL__ = (pg as any).Pool;

const EdgePool = (pg as any).Pool;
const edgeControlPool = new EdgePool({
  connectionString: Deno.env.get("SUPABASE_DB_URL") || "",
  max: 1,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});
let schedulerDetectionPromise: Promise<boolean> | null = null;

async function detectExternalScheduler(): Promise<boolean> {
  if (schedulerDetectionPromise) return schedulerDetectionPromise;
  schedulerDetectionPromise = edgeControlPool.query(
    `SELECT EXISTS(
       SELECT 1 FROM cron.job
       WHERE jobname='mfw-social-reverification-6h'
         AND active
     ) AS active`,
  ).then((result: any) => Boolean(result.rows?.[0]?.active))
   .catch(() => false);
  return schedulerDetectionPromise;
}

function timingSafeTextEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
  } catch (_) {
    return false;
  }
}

async function verifyCronToken(request: Request): Promise<boolean> {
  const supplied = request.headers.get("x-mfw-cron-token") || "";
  if (!supplied) return false;
  const result = await edgeControlPool.query(
    `SELECT secret_value
       FROM mfw_ops.runtime_secrets
       WHERE control_key='social_reverify_cron'
         AND enabled=true
       LIMIT 1`,
  );
  if (!result.rowCount) return false;
  return timingSafeTextEqual(supplied, String(result.rows[0].secret_value || ""));
}

async function loadCanonicalSources() {
  if (sourceLoadPromise) return sourceLoadPromise;
  sourceLoadPromise = (async () => {
    if (!/^[a-f0-9]{40}$/i.test(edgeReleaseSha)) {
      throw new Error("edge_release_sha_invalid");
    }

    const result = await edgeControlPool.query(
      `SELECT filename, sha256, source_text
         FROM mfw_runtime.authority_sources
        WHERE release_sha=$1
        ORDER BY filename`,
      [edgeReleaseSha],
    );

    const required = Object.keys(SOURCE_PATHS).sort();
    const rows = result.rows || [];
    if (rows.length !== required.length) {
      throw new Error(
        "edge_source_registry_incomplete:" + rows.length + "/" + required.length,
      );
    }

    const loaded: Record<string, string> = {};
    for (const row of rows) {
      const filename = String(row.filename || "");
      const source = String(row.source_text || "");
      const expectedHash = String(row.sha256 || "").toLowerCase();

      if (!required.includes(filename)) {
        throw new Error("edge_source_registry_unexpected:" + filename);
      }
      if (!source.length) {
        throw new Error("edge_source_empty:" + filename);
      }

      const actualHash = crypto
        .createHash("sha256")
        .update(source, "utf8")
        .digest("hex");

      if (!timingSafeTextEqual(actualHash, expectedHash)) {
        throw new Error("edge_source_hash_mismatch:" + filename);
      }
      loaded[filename] = source;
    }

    for (const filename of required) {
      if (!loaded[filename]) {
        throw new Error("edge_source_missing:" + filename);
      }
    }

    authoritySources = loaded;
    return authoritySources;
  })().catch((error) => {
    sourceLoadPromise = null;
    throw error;
  });
  return sourceLoadPromise;
}

const cjsCache = new Map<string, any>();

function normalizeLocalModule(specifier: string): string {
  let id = specifier.replace(/^\.\//, "");
  if (!id.endsWith(".js")) id += ".js";
  return id;
}

function edgeRequire(specifier: string, parentId = "server-v2.js"): any {
  if (specifier === "crypto" || specifier === "node:crypto") return crypto;
  if (specifier === "qrcode") return QRCode;
  if (specifier === "pg") return pg;
  if (["http", "fs", "path", "vm", "node:http", "node:fs", "node:path", "node:vm"].includes(specifier)) {
    throw new Error("edge_forbidden_builtin:" + specifier + ":from:" + parentId);
  }
  if (!specifier.startsWith("./")) {
    throw new Error("edge_unknown_module:" + specifier + ":from:" + parentId);
  }

  const id = normalizeLocalModule(specifier);
  if (cjsCache.has(id)) return cjsCache.get(id).exports;
  const source = authoritySources[id];
  if (!source) throw new Error("edge_source_missing:" + id + ":from:" + parentId);

  const module = { exports: {} as any };
  cjsCache.set(id, module);
  const localRequire = (child: string) => edgeRequire(child, id);
  const execute = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    "process",
    "Buffer",
    source + "\n//# sourceURL=mfw-edge://" + id,
  );
  execute(localRequire, module, module.exports, id, ".", process, Buffer);
  return module.exports;
}

function loadOfficialSnapshot() {
  const source = authoritySources["event-data.js"];
  if (!source) throw new Error("edge_source_missing:event-data.js");
  const holder: any = {};
  const execute = new Function(
    "window",
    source + "\nreturn window.MFP_DATA;",
  );
  return execute(holder);
}

let authority: any = null;
async function loadAuthority() {
  if (authority) return authority;
  await loadCanonicalSources();
  (globalThis as any).__MFW_OFFICIAL_SNAPSHOT__ = loadOfficialSnapshot();
  authority = edgeRequire("./server-v2.js", "edge-entry");
  return authority;
}

type Listener = (value?: any) => void;

class NodeRequestShim {
  method: string;
  url: string;
  headers: Record<string, string>;
  socket: { remoteAddress: string };
  private body: string;
  private listeners: Record<string, Listener[]> = { data: [], end: [], error: [] };
  private scheduled = false;
  private flushed = false;

  constructor(request: Request, body: string) {
    const incoming = new URL(request.url);
    const functionPrefix = "/functions/v1/";
    let routedPath = incoming.pathname;
    if (incoming.pathname.startsWith(functionPrefix)) {
      const afterPrefix = incoming.pathname.slice(functionPrefix.length);
      const slash = afterPrefix.indexOf("/");
      routedPath = slash >= 0 ? afterPrefix.slice(slash) : "/";
    } else {
      const segments = incoming.pathname.split("/").filter(Boolean);
      if (segments.length && segments[0].startsWith(FUNCTION_NAME)) {
        routedPath = segments.length > 1 ? "/" + segments.slice(1).join("/") : "/";
      }
    }
    this.method = request.method.toUpperCase();
    this.url = routedPath + incoming.search;
    this.headers = {};
    request.headers.forEach((value, key) => {
      this.headers[key.toLowerCase()] = value;
    });
    this.socket = {
      remoteAddress:
        this.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        this.headers["cf-connecting-ip"] ||
        "supabase-edge",
    };
    this.body = body;
  }

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    if (event === "end" && !this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flushBody());
    }
    return this;
  }

  private flushBody() {
    if (this.flushed) return;
    this.flushed = true;
    try {
      if (this.body.length) {
        for (const listener of this.listeners.data || []) listener(this.body);
      }
      for (const listener of this.listeners.end || []) listener();
    } catch (error) {
      for (const listener of this.listeners.error || []) listener(error);
    }
  }
}

class NodeResponseShim {
  private status = 200;
  private headers = new Headers();
  private resolve!: (response: Response) => void;
  readonly response: Promise<Response>;

  constructor() {
    this.response = new Promise<Response>((resolve) => {
      this.resolve = resolve;
    });
  }

  writeHead(status: number, headers: Record<string, string | number> = {}) {
    this.status = status;
    for (const [key, value] of Object.entries(headers)) {
      this.headers.set(key, String(value));
    }
    return this;
  }

  end(body?: string | Uint8Array) {
    const noBody = this.status === 204 || this.status === 304;
    if (noBody) this.headers.delete("content-length");
    this.resolve(
      new Response(noBody ? null : (body ?? ""), {
        status: this.status,
        headers: this.headers,
      }),
    );
  }
}

Deno.serve(async (request: Request) => {
  try {
    const loadedAuthority = await loadAuthority();
    const schedulerActive = await detectExternalScheduler();
    (globalThis as any).__MFW_EXTERNAL_REVERIFY_SCHEDULER__ = schedulerActive;
    await loadedAuthority.initializeAuthority({ startScheduler: false });

    const requestPath = new URL(request.url).pathname;
    if (requestPath.endsWith("/__internal/reverify")) {
      if (request.method !== "POST") {
        return Response.json({ error: "method_not_allowed" }, { status: 405 });
      }
      if (!(await verifyCronToken(request))) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      const result = await loadedAuthority.runSocialReverificationExclusive("supabase_pg_cron");
      return Response.json({
        status: "ok",
        checked: Number(result?.checked || 0),
        inactive: Number(result?.inactive || 0),
        skipped: Number(result?.skipped || 0),
        errorCount: Array.isArray(result?.errors) ? result.errors.length : 0,
        completedAt: result?.completedAt || null,
      });
    }

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? ""
        : await request.text();
    const req = new NodeRequestShim(request, body);
    const res = new NodeResponseShim();
    await loadedAuthority.router(req, res);
    return await res.response;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "mfw_edge_request_failed",
        error: String((error as any)?.message || error),
      }),
    );
    const candidate = new URL(request.url).pathname.includes("-candidate");
    return Response.json(
      {
        error: "authority_unavailable",
        ...(candidate ? { detail: String((error as any)?.stack || (error as any)?.message || error) } : {}),
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
});
