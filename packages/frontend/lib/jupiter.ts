/**
 * Jupiter Swap Integration
 * Allows swapping any Solana token to USDC before purging
 */

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

// Devnet USDC Mint
const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
// Mainnet USDC Mint
const MAINNET_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Primary USDC Mint (defaults to Devnet one for this codebase context)
const USDC_MINT = DEVNET_USDC_MINT;

// Native SOL "mint" address (wrapped SOL)
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// Jupiter API endpoints
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";

export interface JupiterQuote {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: any[];
}

export interface SwapResult {
    success: boolean;
    txSignature?: string;
    outputAmount?: string;
    error?: string;
}

/**
 * Get a quote for swapping any token to USDC
 */
export async function getJupiterQuote(
    inputMint: string,
    inputAmount: number, // in token's smallest unit (lamports for SOL, etc.)
    slippageBps: number = 50 // 0.5% slippage default
): Promise<JupiterQuote | null> {
    try {
        // If input is already USDC (either network), no swap needed
        if (inputMint === DEVNET_USDC_MINT.toBase58() || inputMint === MAINNET_USDC_MINT.toBase58()) {
            return null;
        }

        const params = new URLSearchParams({
            inputMint,
            outputMint: MAINNET_USDC_MINT.toBase58(), // Jupiter uses Mainnet Mint for quotes
            amount: inputAmount.toString(),
            slippageBps: slippageBps.toString(),
        });

        const response = await fetch(`${JUPITER_QUOTE_API}?${params}`);

        if (!response.ok) {
            console.error("Jupiter quote failed:", await response.text());
            return null;
        }

        const quote = await response.json();
        console.log("Jupiter Quote:", quote);
        return quote;
    } catch (error) {
        console.error("Failed to get Jupiter quote:", error);
        return null;
    }
}

/**
 * Execute a swap via Jupiter
 */
export async function executeJupiterSwap(
    connection: Connection,
    quote: JupiterQuote,
    userPublicKey: PublicKey,
    signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<SwapResult> {
    try {
        // Get the swap transaction from Jupiter
        const swapResponse = await fetch(JUPITER_SWAP_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: userPublicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: "auto",
            }),
        });

        if (!swapResponse.ok) {
            const errorText = await swapResponse.text();
            console.error("Jupiter swap API error:", errorText);
            return { success: false, error: "Failed to get swap transaction" };
        }

        const swapData = await swapResponse.json();

        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // Sign the transaction
        const signedTransaction = await signTransaction(transaction);

        // Send the transaction
        const rawTransaction = signedTransaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2,
        });

        // Confirm the transaction
        const confirmation = await connection.confirmTransaction(txid, "confirmed");

        if (confirmation.value.err) {
            return { success: false, error: "Swap transaction failed on-chain" };
        }

        console.log("Jupiter swap successful:", txid);
        return {
            success: true,
            txSignature: txid,
            outputAmount: quote.outAmount,
        };
    } catch (error: any) {
        console.error("Jupiter swap failed:", error);
        return { success: false, error: error.message || "Swap failed" };
    }
}

/**
 * Check if a token needs swapping (i.e., is not USDC)
 */
export function needsSwap(tokenMint: string): boolean {
    return tokenMint !== DEVNET_USDC_MINT.toBase58() &&
        tokenMint !== MAINNET_USDC_MINT.toBase58();
}

/**
 * Get the USDC mint address for current context
 */
export function getUsdcMint(): PublicKey {
    return USDC_MINT; // Returns Devnet one by default logic here
}

/**
 * Get Devnet USDC Mint explicit
 */
export function getDevnetUsdcMint(): PublicKey {
    return DEVNET_USDC_MINT;
}

/**
 * Get Mainnet USDC Mint explicit
 */
export function getMainnetUsdcMint(): PublicKey {
    return MAINNET_USDC_MINT;
}

/**
 * Get wrapped SOL mint address
 */
export function getWsolMint(): PublicKey {
    return WSOL_MINT;
}
