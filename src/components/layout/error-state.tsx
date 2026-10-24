import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Could not load data from Polymarket",
  message = "The Polymarket API is unreachable. Check your connection and try again.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-box border border-dashed py-16 text-center">
      <AlertTriangle className="size-8 text-base-content/60" />
      <p className="text-body font-semibold">{title}</p>
      <p className="max-w-md text-body-sm text-base-content/60">{message}</p>
    </div>
  );
}
