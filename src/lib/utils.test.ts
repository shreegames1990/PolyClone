import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn with design tokens", () => {
  it("treats type tokens as font sizes, not colors", () => {
    expect(cn("text-label text-muted-foreground")).toBe("text-label text-muted-foreground");
    expect(cn("text-caption", "text-yes")).toBe("text-caption text-yes");
  });

  it("lets a type token override a default size", () => {
    expect(cn("text-sm", "text-body-sm")).toBe("text-body-sm");
    expect(cn("text-display", "text-title")).toBe("text-title");
  });

  it("lets a daisyUI radius override a default radius", () => {
    expect(cn("rounded-xl", "rounded-box")).toBe("rounded-box");
    expect(cn("rounded-lg", "rounded-field")).toBe("rounded-field");
    expect(cn("rounded-md", "rounded-selector")).toBe("rounded-selector");
  });

  it("treats daisyUI theme colors as colors", () => {
    expect(cn("bg-base-200", "bg-base-300")).toBe("bg-base-300");
    expect(cn("text-label text-base-content/60")).toBe("text-label text-base-content/60");
  });

  it("still merges standard utilities", () => {
    expect(cn("h-8 bg-primary", "h-12 bg-yes")).toBe("h-12 bg-yes");
  });
});
