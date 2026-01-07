"use client";

import { useAccount, useDisconnect as useWagmiDisconnect } from "wagmi";
import { useWallet as useSolanaWallet, useConnection } from "@solana/wallet-adapter-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState } from "react";
import { SOLANA_CHAIN_ID } from "../components/ChainSelector";
import { Program, AnchorProvider, Idl, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import purgeIdl from "../lib/purge_idl.json";

// Network Configuration
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet';

const SOLANA_CONFIG = {
    devnet: {
        PROGRAM_ID: new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re"),
        USDC_MINT: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
    },
    mainnet: {
        // TODO: Update this after deploying to Solana Mainnet
        PROGRAM_ID: new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re"),
        USDC_MINT: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // Official Mainnet USDC
    }
};

const { PROGRAM_ID, USDC_MINT } = SOLANA_CONFIG[NETWORK];

export interface PurgeStats {
    totalSupply: string;
    userBalance: string;
    treasuryBalance: string;
    lpBalance: string;
}

export function usePurgeProtocol() {
    // EVM Hooks
    const { address: evmAddress, isConnected: isEvmConnected, chainId: evmChainId } = useAccount();
    const { disconnect: disconnectEvm } = useWagmiDisconnect();
    const { openConnectModal } = useConnectModal();

    // Solana Hooks
    const { connection } = useConnection();
    const { publicKey: solanaPublicKey, connected: isSolanaConnected, disconnect: disconnectSolana, signTransaction, signAllTransactions } = useSolanaWallet();
    const { setVisible: setSolanaModalVisible } = useWalletModal();

    // Stats State (Placeholder for now)
    const [stats, setStats] = useState<PurgeStats>({
        totalSupply: "0",
        userBalance: "0",
        treasuryBalance: "0",
        lpBalance: "0",
    });

    // Unified State
    const isConnected = isEvmConnected || isSolanaConnected;

    // Determine active address and chain
    const address = isSolanaConnected && solanaPublicKey
        ? solanaPublicKey.toBase58()
        : evmAddress || "";

    const chainId = isSolanaConnected ? SOLANA_CHAIN_ID : evmChainId || 0;

    /**
     * Unified Connect Function
     */
    const connect = useCallback((preferredChainId?: number) => {
        if (preferredChainId === SOLANA_CHAIN_ID) {
            setSolanaModalVisible(true);
        } else {
            if (openConnectModal) {
                openConnectModal();
            } else {
                console.warn("RainbowKit Connect Modal not ready");
            }
        }
    }, [setSolanaModalVisible, openConnectModal]);

    /**
     * Unified Disconnect Function
     */
    const disconnect = useCallback(() => {
        if (isEvmConnected) disconnectEvm();
        if (isSolanaConnected) disconnectSolana();
    }, [isEvmConnected, isSolanaConnected, disconnectEvm, disconnectSolana]);

    // Mock Stats Fetcher
    const fetchStats = useCallback(async () => {
        // TODO: Implement multi-chain stats fetching
        console.log("Fetching stats... (Not Implemented)");
    }, []);

    // Helper: Calculate Purge Output
    const calculatePurgeOutput = useCallback((inputAmount: string) => {
        const amount = parseFloat(inputAmount) || 0;
        const tax = amount * 0.06; // 6% Total tax
        const output = amount - tax;
        return {
            output: output.toFixed(2),
            tax: tax.toFixed(2),
            lpTax: (amount * 0.03).toFixed(2),          // 3.0% POL
            reflectTax: (amount * 0.015).toFixed(2),     // 1.5% Reflection
            treasuryTax: (amount * 0.01).toFixed(2),      // 1.0% War Chest
            burnTax: (amount * 0.005).toFixed(2),         // 0.5% Burn
        };
    }, []);

    // Placeholder: Quote Purge
    const quotePurge = useCallback(async (amount: string): Promise<string> => {
        if (chainId === SOLANA_CHAIN_ID) {
            // Solana implementation would fetch standard tx fee + LZ quote estimate
            return "0.000005"; // 5000 lamports
        }
        return "0.001"; // EVM ETH
    }, [chainId]);

    /**
     * Execute Purge Transaction
     */
    const executePurge = useCallback(async (
        tokenAddress: string,
        amount: string,
        swapData: string = "0x"
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {

        // --- EVM EXECUTION ---
        if (!isSolanaConnected && isEvmConnected) {
            console.log("Executing EVM Purge...");
            alert("EVM Purge Logic Placeholder (requires backend contract deployment)");
            return { success: false, error: "Not Implemented for EVM" };
        }

        // --- SOLANA EXECUTION ---
        if (isSolanaConnected && solanaPublicKey) {
            console.log("Executing Solana Purge...");

            try {
                // Import Jupiter helpers
                const { needsSwap, getUsdcMint } = await import("../lib/jupiter");

                let finalUsdcAmount = parseFloat(amount);
                const isNonUsdcToken = needsSwap(tokenAddress);

                // Check if we're on Devnet (Jupiter only works on Mainnet)
                const isDevnet = connection.rpcEndpoint.includes("devnet");

                // If not USDC, need to swap via Jupiter (Mainnet only)
                if (isNonUsdcToken) {
                    if (isDevnet) {
                        // Jupiter doesn't support Devnet - inform user
                        return {
                            success: false,
                            error: `Jupiter swaps only work on Mainnet. On Devnet, please use USDC directly (${USDC_MINT.toBase58()}). You selected: ${tokenAddress}`
                        };
                    }

                    console.log("Token is not USDC, initiating Jupiter swap...");

                    // Dynamic import for mainnet Jupiter swap
                    const { getJupiterQuote, executeJupiterSwap } = await import("../lib/jupiter");

                    // Determine decimals - SOL is 9, most SPL tokens are 6 or 9
                    const isSol = tokenAddress === "So11111111111111111111111111111111111111112";
                    const decimals = isSol ? 9 : 6; // Default to 6 for SPL tokens
                    const inputAmountRaw = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

                    // Get Jupiter quote
                    const quote = await getJupiterQuote(tokenAddress, inputAmountRaw);

                    if (!quote) {
                        return { success: false, error: "Failed to get swap quote from Jupiter" };
                    }

                    console.log("Jupiter quote received:", quote.outAmount, "USDC (raw)");

                    // Execute the swap
                    if (!signTransaction) {
                        return { success: false, error: "Wallet doesn't support signing transactions" };
                    }

                    const swapResult = await executeJupiterSwap(
                        connection,
                        quote,
                        solanaPublicKey,
                        signTransaction as any
                    );

                    if (!swapResult.success) {
                        return { success: false, error: `Jupiter swap failed: ${swapResult.error}` };
                    }

                    console.log("Jupiter swap successful! USDC received:", swapResult.outputAmount);
                    finalUsdcAmount = parseInt(swapResult.outputAmount || "0") / 1_000_000; // Convert from raw to USDC
                }

                // Now proceed with the Purge using USDC
                // 1. Setup Provider
                // We need to shim the wallet because wallet-adapter doesn't expose a full Provider object expected by Anchor
                const provider = new AnchorProvider(
                    connection,
                    {
                        publicKey: solanaPublicKey,
                        signTransaction: signTransaction || (async (tx) => tx),
                        signAllTransactions: signAllTransactions || (async (txs) => txs),
                    },
                    AnchorProvider.defaultOptions()
                );

                // 2. Initialize Program (Anchor 0.29 uses 3 args: idl, programId, provider)

                console.log("Creating Anchor Program...");
                let program;
                try {
                    program = new Program(purgeIdl as Idl, PROGRAM_ID, provider);
                    console.log("Program created successfully. ID:", program.programId.toBase58());
                } catch (programError: any) {
                    console.error("FAILED TO CREATE PROGRAM:", programError);
                    alert("Failed to create Anchor Program object: " + programError.message);
                    return { success: false, error: "Program creation failed: " + programError.message };
                }

                // 3. Derive PDAs
                const [configPda] = await PublicKey.findProgramAddress(
                    [Buffer.from("config")],
                    PROGRAM_ID
                );

                console.log("--- DEBUG ---");
                console.log("Connection Endpoint:", connection.rpcEndpoint);
                console.log("Program ID:", PROGRAM_ID.toBase58());
                console.log("Derived Config PDA:", configPda.toBase58());
                console.log("--- DEBUG ---");

                const [vaultPda] = await PublicKey.findProgramAddress(
                    [Buffer.from("vault"), USDC_MINT.toBuffer()],
                    PROGRAM_ID
                );

                // 4. Token & Amount Parsing (use finalUsdcAmount which may have come from Jupiter swap)
                const amountBn = new BN(Math.floor(finalUsdcAmount * 1_000_000)); // 6 Decimals for USDC

                // 5. Get User's Token Account
                const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
                const userUsdc = await getAssociatedTokenAddress(
                    USDC_MINT,
                    solanaPublicKey
                );

                // 6. Execute Transaction
                console.log("Sending Purge transaction...");
                console.log("Config PDA:", configPda.toBase58());
                console.log("Vault PDA:", vaultPda.toBase58());
                console.log("Amount:", amountBn.toString());

                const tx = await program.methods
                    .purge(amountBn) // Only one argument: amount
                    .accounts({
                        user: solanaPublicKey,
                        userUsdc: userUsdc,
                        usdcMint: USDC_MINT,
                        config: configPda,
                        spokeUsdcVault: vaultPda,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    } as any)
                    .rpc();

                console.log("Purge Successful! Signature:", tx);
                return { success: true, txHash: tx };

            } catch (error: any) {
                console.error("Solana Purge Failed:", error);

                // Friendly error mapping
                let msg = error.message;
                if (msg.includes("Account does not exist")) msg = "Please initialize the Config account first.";
                if (msg.includes("insufficient funds")) msg = "Insufficient funds for transaction.";

                return { success: false, error: msg };
            }
        }

        return { success: false, error: "Wallet not connected" };

    }, [isEvmConnected, isSolanaConnected, solanaPublicKey, connection, signTransaction, signAllTransactions]);

    return {
        isConnected,
        address,
        chainId,
        connect,
        disconnect,
        stats,
        fetchStats,
        calculatePurgeOutput,
        quotePurge,
        executePurge,
    };
}
