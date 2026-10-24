import { describe, expect, it } from "vitest";
import { DAISY_THEMES, THEME_MODES, themeModeLabel } from "./theme";

describe("theme config", () => {
  it("offers light, dark and system modes in that order", () => {
    expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  });

  it("maps light and dark to the daisyUI themes in globals.css", () => {
    expect(DAISY_THEMES).toEqual({ light: "polymarket-light", dark: "polymarket" });
  });

  it("labels modes and falls back to System for unknown values", () => {
    expect(themeModeLabel("dark")).toBe("Dark");
    expect(themeModeLabel(undefined)).toBe("System");
    expect(themeModeLabel("sepia")).toBe("System");
  });
});
