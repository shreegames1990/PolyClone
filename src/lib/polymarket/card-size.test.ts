import { describe, expect, it } from "vitest";
import { cardSize } from "./card-size";
import { normalizeEvent } from "./normalize";

const market = (id: string, price: number) => ({ id, groupItemTitle: id, outcomes: '["Yes","No"]', outcomePrices: `["${price}","${1 - price}"]` });

describe("cardSize", () => {
  it("makes cards with a stacked market list wide", () => {
    const many = normalizeEvent({ id: "1", markets: ["a", "b", "c", "d"].map((m, i) => market(m, 0.4 - i * 0.05)) });
    expect(cardSize(many)).toBe("wide");
  });

  it("keeps binary, game and small multi-market cards standard", () => {
    expect(cardSize(normalizeEvent({ id: "2", markets: [market("only", 0.5)] }))).toBe("standard");
    expect(cardSize(normalizeEvent({ id: "3", markets: [market("a", 0.6), market("b", 0.3)] }))).toBe("standard");
  });
});
