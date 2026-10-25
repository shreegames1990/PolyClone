import { describe, expect, it } from "vitest";
import { production } from "@polymarket/client";
import { POLYGON_CHAIN_ID, PUSD_ADDRESS } from "./config";

describe("Polymarket config", () => {
  it("matches the SDK's production chain and collateral token", () => {
    // `contracts` is not in the SDK's public types, so read it defensively.
    const contracts = (production as unknown as { contracts?: { collateralToken?: string } }).contracts;
    expect(production.chainId).toBe(POLYGON_CHAIN_ID);
    expect(contracts?.collateralToken?.toLowerCase()).toBe(PUSD_ADDRESS.toLowerCase());
  });
});
