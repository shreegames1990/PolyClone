import { z } from "zod";

/**
 * Keeps the CLOB API credentials of an enabled trading session for the browser tab
 * (sessionStorage), so a refresh does not ask the wallet to sign again. Credentials can
 * read and cancel orders; placing an order still needs a wallet signature.
 */
export interface StoredCredentials {
  readonly key: string;
  readonly secret: string;
  readonly passphrase: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const credentialsSchema = z.object({ key: z.string().min(1), secret: z.string().min(1), passphrase: z.string().min(1) });

export function sessionKeyFor(eoa: string, tradingAddress: string): string {
  return `pm-trading-session:${eoa.toLowerCase()}:${tradingAddress.toLowerCase()}`;
}

export function saveSessionCredentials(storage: StorageLike | undefined, key: string, credentials: StoredCredentials): void {
  try {
    storage?.setItem(key, JSON.stringify(credentials));
  } catch {
    // Storage unavailable (private mode, blocked): the session just won't survive a refresh.
  }
}

export function loadSessionCredentials(storage: StorageLike | undefined, key: string): StoredCredentials | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = credentialsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearSessionCredentials(storage: StorageLike | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
