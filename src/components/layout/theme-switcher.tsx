"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_MODES, themeModeLabel, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const noopSubscribe = () => () => {};

/** Header dropdown to pick Light / Dark / System (daisyUI dropdown, next-themes state). */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render the System icon until hydrated.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const current: ThemeMode = mounted && THEME_MODES.includes(theme as ThemeMode) ? (theme as ThemeMode) : "system";
  const CurrentIcon = ICONS[current];

  const choose = (mode: ThemeMode) => {
    setTheme(mode);
    // daisyUI dropdowns stay open while focused.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        aria-label={`Theme: ${themeModeLabel(current)}`}
        className="btn btn-ghost btn-square btn-sm text-base-content/70 hover:text-base-content"
      >
        <CurrentIcon className="size-5" />
      </button>
      <ul tabIndex={0} className="dropdown-content menu z-50 mt-2 w-40 rounded-box border border-border bg-base-200 p-1 shadow-lg">
        {THEME_MODES.map((mode) => {
          const Icon = ICONS[mode];
          return (
            <li key={mode}>
              <button
                type="button"
                aria-pressed={current === mode}
                onClick={() => choose(mode)}
                className={cn("gap-3 text-body-sm", current === mode && "bg-base-300 font-semibold")}
              >
                <Icon className="size-4" />
                {themeModeLabel(mode)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
