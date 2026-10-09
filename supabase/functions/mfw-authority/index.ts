import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import process from "node:process";
import { createRequire } from "node:module";
import QRCode from "npm:qrcode@1.5.4";
import pg from "npm:pg@8.16.3";

const FUNCTION_NAME = "mfw-authority";
const require = createRequire(import.meta.url);

process.env.MFW_RUNTIME = "supabase-edge";
process.env.DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") || "";
process.env.MFW_REQUIRE_POSTGRES = "true";
process.env.MFW_EXTERNAL_REVERIFY_SCHEDULER =
  Deno.env.get("MFW_EXTERNAL_REVERIFY_SCHEDULER") || "false";
process.env.MFW_PUBLIC_BASE_URL =
  Deno.env.get("MFW_PUBLIC_BASE_URL") ||
  ((Deno.env.get("SUPABASE_URL") || "") + "/functions/v1/" + FUNCTION_NAME);
process.env.MFW_ALLOWED_ORIGIN =
  Deno.env.get("MFW_ALLOWED_ORIGIN") || "https://mfw-platform.onrender.com";
process.env.MFW_RELEASE_SHA =
  Deno.env.get("MFW_RELEASE_SHA") || "__MFW_RELEASE_SHA__";

(globalThis as any).__MFW_EDGE_RUNTIME__ = true;
(globalThis as any).__MFW_DATABASE_URL__ = Deno.env.get("SUPABASE_DB_URL") || "";
(globalThis as any).__MFW_ALLOWED_ORIGIN__ = process.env.MFW_ALLOWED_ORIGIN;
(globalThis as any).__MFW_PUBLIC_BASE_URL__ = process.env.MFW_PUBLIC_BASE_URL;
(globalThis as any).__MFW_RELEASE_SHA__ = process.env.MFW_RELEASE_SHA;
(globalThis as any).__MFW_QRCODE__ = QRCode;
(globalThis as any).__MFW_PG_POOL__ = (pg as any).Pool;

let authority: any = null;
function loadAuthority() {
  if (authority) return authority;
  (globalThis as any).__MFW_OFFICIAL_SNAPSHOT__ = require("./official-snapshot.js");
  authority = require("./server-v2.js");
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
    const loadedAuthority = loadAuthority();
    await loadedAuthority.initializeAuthority({ startScheduler: false });
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
