import { z } from "zod";

/**
 * Remote builder signing (`remoteBuilderSigning` in @polymarket/client): the browser
 * asks our server to sign relayer and CLOB write requests with Builder API credentials,
 * which never leave the server. Only the requests this app makes are signed.
 */
export const BUILDER_ENV = {
  key: "POLY_BUILDER_API_KEY",
  secret: "POLY_BUILDER_SECRET",
  passphrase: "POLY_BUILDER_PASSPHRASE",
} as const;

export interface BuilderCreds {
  readonly key: string;
  readonly secret: string;
  readonly passphrase: string;
}

/** Credentials from the environment, or null unless all three are set. */
export function readBuilderCreds(env: Record<string, string | undefined>): BuilderCreds | null {
  const key = env[BUILDER_ENV.key];
  const secret = env[BUILDER_ENV.secret];
  const passphrase = env[BUILDER_ENV.passphrase];
  return key && secret && passphrase ? { key, secret, passphrase } : null;
}

const QUERY = "(\\?[A-Za-z0-9_=&.%-]*)?";

/** Method + path pairs the SDK builder-signs for this app: CLOB order writes and relayer calls. */
const SIGNABLE: readonly { method: string; path: RegExp }[] = [
  { method: "POST", path: /^\/(order|orders|orders-scoring|submit)$/ },
  { method: "DELETE", path: /^\/(order|orders|cancel-all|cancel-market-orders)$/ },
  { method: "GET", path: new RegExp(`^/(deployed|v1/account/transactions/params)${QUERY}$`) },
  { method: "GET", path: /^\/v1\/account\/transactions\/[A-Za-z0-9-]{1,128}$/ },
];

/** The relayer and CLOB order payloads are a few KB; anything larger is not ours. */
const MAX_BODY_CHARS = 64_000;

const signRequestSchema = z.object({
  method: z.string(),
  path: z.string().max(512),
  body: z.string().max(MAX_BODY_CHARS).optional(),
});

export interface SignRequest {
  readonly method: string;
  readonly path: string;
  readonly body?: string;
}

export type ParseResult = { ok: true; value: SignRequest } | { ok: false; error: string };

export function parseSignRequest(raw: unknown): ParseResult {
  const parsed = signRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid signing request" };
  const { method, path, body } = parsed.data;
  if (!SIGNABLE.some((rule) => rule.method === method && rule.path.test(path))) {
    return { ok: false, error: "Request not allowed" };
  }
  return { ok: true, value: body === undefined ? { method, path } : { method, path, body } };
}

/** True when the browser's Origin matches the host serving the request (behind proxies too). */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0]!.trim();
  } catch {
    return false;
  }
}
