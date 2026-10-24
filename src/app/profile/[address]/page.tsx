import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Profile" };

export default function ProfilePage({ params }: PageProps<"/profile/[address]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: Pick<PageProps<"/profile/[address]">, "params">) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  return <PortfolioView user={address.toLowerCase()} isOwner={false} />;
}
