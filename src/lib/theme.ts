/** Theme modes offered by the header switcher; "system" follows the OS setting. */
export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** daisyUI theme names (globals.css) applied via `data-theme` for each resolved mode. */
export const DAISY_THEMES = { light: "polymarket-light", dark: "polymarket" } as const;

const LABELS: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "System" };

const isThemeMode = (value: unknown): value is ThemeMode => THEME_MODES.includes(value as ThemeMode);

export function themeModeLabel(mode: unknown): string {
  return LABELS[isThemeMode(mode) ? mode : "system"];
}
