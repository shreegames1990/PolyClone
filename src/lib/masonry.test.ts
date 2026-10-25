import { describe, expect, it } from "vitest";
import { MASONRY_ROW_PX, rowSpan } from "./masonry";

describe("rowSpan", () => {
  it("spans enough rows for the item plus the gap below it", () => {
    expect(MASONRY_ROW_PX).toBe(8);
    expect(rowSpan(200, 16)).toBe(27); // ceil((200 + 16) / 8)
    expect(rowSpan(201, 16)).toBe(28);
  });

  it("never returns less than one row", () => {
    expect(rowSpan(0, 0)).toBe(1);
    expect(rowSpan(-5, 16)).toBe(2);
  });
});
