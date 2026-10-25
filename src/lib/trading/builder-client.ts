import { remoteBuilderSigning, type ApiKeyAuthorization } from "@polymarket/client";
import { z } from "zod";

/** Server route that signs builder requests (src/app/api/builder/sign/route.ts). */
export const BUILDER_SIGN_URL = "/api/builder/sign";

const statusSchema = z.object({ enabled: z.boolean() }).catch({ enabled: false });

/**
 * Builder authorization for createSecureClient: remote signing when the server has
 * POLY_BUILDER_* credentials, otherwise undefined. Enabling it without credentials
 * would make every order fail, because the SDK builder-signs all CLOB writes.
 */
export async function resolveBuilderAuth(): Promise<ApiKeyAuthorization | undefined> {
  try {
    const response = await fetch(BUILDER_SIGN_URL, { method: "GET", cache: "no-store" });
    if (!response.ok) return undefined;
    const { enabled } = statusSchema.parse(await response.json());
    return enabled ? remoteBuilderSigning({ url: BUILDER_SIGN_URL }) : undefined;
  } catch (error) {
    console.warn("[trading] builder signing check failed; continuing without it", error);
    return undefined;
  }
}
