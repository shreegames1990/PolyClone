import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Could not load data from Polymarket",
  message = "The Polymarket API is unreachable. Check your connection and try again.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
