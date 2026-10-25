import { buildHmacSignature } from "@polymarket/client";
import { isSameOrigin, parseSignRequest, readBuilderCreds } from "@/lib/trading/builder-signing";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Remote builder signing for `remoteBuilderSigning({ url: "/api/builder/sign" })`.
 * Signs this app's relayer (gasless approvals) and CLOB order requests with the
 * server-only POLY_BUILDER_* credentials.
 */

/** Approval polling plus orders stay well under this per client. */
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const NO_STORE = { "cache-control": "no-store" };

const fail = (status: number, error: string) =>
  Response.json({ success: false, data: null, error }, { status, headers: NO_STORE });

const clientKey = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

/** Lets the browser enable remote signing only when the server can actually sign. */
export async function GET() {
  return Response.json({ enabled: readBuilderCreds(process.env) !== null }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const creds = readBuilderCreds(process.env);
  if (!creds) return fail(503, "Builder signing is not configured");
  if (!isSameOrigin(request.headers)) return fail(403, "Forbidden");
  if (!limiter.allow(clientKey(request))) return fail(429, "Too many requests");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "Invalid JSON");
  }
  const parsed = parseSignRequest(payload);
  if (!parsed.ok) return fail(400, parsed.error);

  const { method, path, body } = parsed.value;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await buildHmacSignature(creds.secret, timestamp, method, path, body);
    return Response.json(
      {
        POLY_BUILDER_API_KEY: creds.key,
        POLY_BUILDER_PASSPHRASE: creds.passphrase,
        POLY_BUILDER_SIGNATURE: signature,
        POLY_BUILDER_TIMESTAMP: `${timestamp}`,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[builder-sign] signing failed", method, path, error);
    return fail(500, "Could not sign the request");
  }
}
