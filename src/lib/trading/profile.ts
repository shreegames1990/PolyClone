import { z } from "zod";
import { isAddress, type Address } from "viem";
import { pmGet } from "@/lib/polymarket/client-fetch";

const profileSchema = z
  .object({
    proxyWallet: z.string().nullish(),
    name: z.string().nullish(),
    pseudonym: z.string().nullish(),
    profileImage: z.string().nullish(),
  })
  .catch({});

export interface PolymarketProfile {
  readonly proxyWallet: Address | null;
  readonly name: string;
  readonly image: string;
}

export function parseProfile(raw: unknown): PolymarketProfile {
  const p = profileSchema.parse(raw);
  const proxy = p.proxyWallet && isAddress(p.proxyWallet) ? (p.proxyWallet as Address) : null;
  return { proxyWallet: proxy, name: p.name || p.pseudonym || "", image: p.profileImage || "" };
}

/**
 * Looks up the Polymarket profile (and proxy wallet) owned by an EOA.
 * Only a 404 means "no profile"; other failures throw so callers retry rather
 * than silently trading from the wrong wallet.
 */
export async function fetchProfile(address: string): Promise<PolymarketProfile> {
  try {
    return parseProfile(await pmGet("gamma", "public-profile", { address }));
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { proxyWallet: null, name: "", image: "" };
    throw error;
  }
}
