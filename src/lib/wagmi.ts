import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http, injected } from "wagmi";
import { polygon } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL;

export const hasWalletConnect = Boolean(projectId);

/**
 * With a WalletConnect project ID we use RainbowKit's full wallet list.
 * Without one we fall back to injected wallets (MetaMask, Rabby, …) so the
 * app still works locally with zero configuration.
 */
export const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: "Polymarket Clone",
      projectId,
      chains: [polygon],
      transports: { [polygon.id]: http(rpcUrl) },
      ssr: true,
    })
  : createConfig({
      chains: [polygon],
      connectors: [injected()],
      transports: { [polygon.id]: http(rpcUrl) },
      ssr: true,
    });
