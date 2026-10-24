import Image from "next/image";
import { cn } from "@/lib/utils";

export function MarketImage({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return <div className={cn("shrink-0 rounded-md bg-base-300", className)} style={{ width: size, height: size }} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
