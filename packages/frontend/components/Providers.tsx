"use client";

import * as React from "react";
import {
    RainbowKitProvider,
    getDefaultWallets,
    getDefaultConfig,
    darkTheme,
} from "@rainbow-me/rainbowkit";
import {
    argentWallet,
    trustWallet,
    ledgerWallet,
} from "@rainbow-me/rainbowkit/wallets";
import {
    mainnet,
    base,
    arbitrum,
    polygon,
    optimism,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import styles
import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

// 1. Wagmi Config (EVM)
const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
    appName: "Purge Protocol",
    projectId: "YOUR_PROJECT_ID", // TODO: Get a Reown Project ID
    wallets: [
        ...wallets,
        {
            groupName: "Other",
            wallets: [argentWallet, trustWallet, ledgerWallet],
        },
    ],
    chains: [
        base,
        mainnet,
        arbitrum,
        polygon,
        optimism,
    ],
    ssr: true,
});

const queryClient = new QueryClient();

// 2. Solana Config - Configurable via environment variable
// Set NEXT_PUBLIC_SOLANA_NETWORK=mainnet for mainnet, otherwise devnet
const USE_MAINNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet";
const network = USE_MAINNET ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network);
console.log("Solana Network:", network, "| RPC:", endpoint);

export function Providers({ children }: { children: React.ReactNode }) {
    // Memoize wallets to avoid re-initializing on re-renders
    const solanaWallets = React.useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#ffffff',
                        accentColorForeground: 'black',
                        borderRadius: 'medium',
                        overlayBlur: 'small',
                    })}
                >
                    <ConnectionProvider endpoint={endpoint}>
                        <WalletProvider wallets={solanaWallets} autoConnect>
                            <WalletModalProvider>
                                {children}
                            </WalletModalProvider>
                        </WalletProvider>
                    </ConnectionProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
