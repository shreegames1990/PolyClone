"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact "Value ▾" dropdown used in the trade panel (order type, expiry). */
export function PanelMenu<T extends string>({
  name,
  value,
  options,
  onChange,
  muted = false,
}: {
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Muted text (e.g. the "Expires" footer row). */
  muted?: boolean;
}) {
  const current = options.find((o) => o.value === value) ?? options[0]!;

  const choose = (next: T) => {
    onChange(next);
    // daisyUI dropdowns stay open while focused.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-label={`${name}: ${current.label}`}
        className={cn(
          "flex items-center gap-1 rounded-field px-1 py-1 text-body font-medium hover:text-base-content",
          muted ? "text-base-content/60" : "text-base-content",
        )}
      >
        {current.label}
        <ChevronDown className="size-4 opacity-70" />
      </button>
      <ul role="menu" tabIndex={0} className="dropdown-content menu z-20 mt-1 w-36 rounded-box border border-border bg-base-200 p-1 shadow-lg">
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => choose(o.value)}
              className={cn("text-body-sm", o.value === value && "bg-base-300 font-semibold")}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
