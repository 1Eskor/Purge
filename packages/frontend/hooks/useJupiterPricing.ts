"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Jupiter API Integration for Solana Token Pricing
 * 
 * Jupiter is the premier DEX aggregator on Solana, similar to 1inch on EVM.
 * We use their Quote API to get real-time swap prices for any SPL token.
 * 
 * API Docs: https://station.jup.ag/docs/apis/swap-api
 */

// USDC on Solana (SPL Token)
export const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Native SOL (wrapped as wSOL for swaps)
export const WRAPPED_SOL = "So11111111111111111111111111111111111111112";

// Jupiter API endpoint
const JUPITER_API_URL = "https://quote-api.jup.ag/v6";

// Cache for quotes
const quoteCache: Record<string, { quote: JupiterQuote; timestamp: number }> = {};
const CACHE_DURATION = 15000; // 15 seconds

export interface JupiterQuote {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: any[];
    // Calculated values
    rate: number;
    usdValue: number;
}

interface JupiterQuoteParams {
    inputMint: string;   // Token mint address
    outputMint: string;  // Usually USDC
    amount: string;      // Amount in smallest unit (lamports)
    slippageBps?: number; // Slippage in basis points (default 50 = 0.5%)
    inputDecimals?: number; // Optional: provide decimals for accurate calculation
}

export interface SolanaToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    // Solana-specific
    chainId: 900; // Our convention for Solana
}

// Popular Solana tokens for quick access
export const POPULAR_SOLANA_TOKENS: SolanaToken[] = [
    {
        address: WRAPPED_SOL,
        symbol: "SOL",
        name: "Wrapped SOL",
        decimals: 9,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        chainId: 900,
    },
    {
        address: SOLANA_USDC,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        chainId: 900,
    },
    {
        address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKsnpxEZLu3",
        symbol: "JUP",
        name: "Jupiter",
        decimals: 6,
        logoURI: "https://static.jup.ag/jup/icon.png",
        chainId: 900,
    },
    {
        address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        symbol: "BONK",
        name: "Bonk",
        decimals: 5,
        logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
        chainId: 900,
    },
    {
        address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        symbol: "POPCAT",
        name: "Popcat",
        decimals: 9,
        logoURI: "https://bafkreidvkvuzyslw5jh5z242lgzwzhbi2kxxnpkxtr7zevtdwludopass4.ipfs.w3s.link/",
        chainId: 900,
    },
    {
        address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        symbol: "WIF",
        name: "dogwifhat",
        decimals: 6,
        logoURI: "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.cf-ipfs.com/",
        chainId: 900,
    },
    {
        address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
        symbol: "RENDER",
        name: "Render Token",
        decimals: 8,
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png",
        chainId: 900,
    },
    {
        address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
        symbol: "PYTH",
        name: "Pyth Network",
        decimals: 6,
        logoURI: "https://pyth.network/token.svg",
        chainId: 900,
    },
];

export function useJupiterPricing() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Get a swap quote from Jupiter API
     */
    const getJupiterQuote = useCallback(async (params: JupiterQuoteParams): Promise<JupiterQuote | null> => {
        const { inputMint, outputMint, amount, slippageBps = 50, inputDecimals } = params;

        // Don't fetch for zero amounts
        if (!amount || amount === "0") {
            return null;
        }

        const cacheKey = `${inputMint}-${outputMint}-${amount}`;
        const cached = quoteCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.quote;
        }

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setIsLoading(true);
            setError(null);

            // 1. Try Primary Jupiter API
            try {
                const url = new URL(`${JUPITER_API_URL}/quote`);
                url.searchParams.set("inputMint", inputMint);
                url.searchParams.set("outputMint", outputMint);
                url.searchParams.set("amount", amount);
                url.searchParams.set("slippageBps", slippageBps.toString());

                const response = await fetch(url.toString(), {
                    signal: abortControllerRef.current.signal,
                });

                if (!response.ok) {
                    throw new Error(`Jupiter API status: ${response.status}`);
                }

                const data = await response.json();

                // Calculate rate and USD value
                const inAmountNum = parseFloat(amount);
                const outAmountNum = parseFloat(data.outAmount);

                const inputToken = POPULAR_SOLANA_TOKENS.find(t => t.address === inputMint);
                const tokenDecimals = inputDecimals || inputToken?.decimals || 9;

                const usdcDecimals = 6; // USDC has 6 decimals on Solana

                const usdValue = outAmountNum / Math.pow(10, usdcDecimals);
                const tokenAmount = inAmountNum / Math.pow(10, tokenDecimals);
                const rate = tokenAmount > 0 ? usdValue / tokenAmount : 0;

                const quote: JupiterQuote = {
                    inputMint: data.inputMint,
                    outputMint: data.outputMint,
                    inAmount: data.inAmount,
                    outAmount: data.outAmount,
                    priceImpactPct: data.priceImpactPct,
                    routePlan: data.routePlan || [],
                    rate,
                    usdValue,
                };

                // Cache the result
                quoteCache[cacheKey] = { quote, timestamp: Date.now() };
                return quote;

            } catch (err: any) {
                if (err.name === "AbortError") throw err;
                console.warn("Primary Jupiter API failed, trying fallback...", err);

                // 2. Fallback Pricing (DexScreener -> CoinGecko)
                let priceUsd = 0;

                // Try DexScreener first (Better for long-tail/new tokens)
                try {
                    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${inputMint}`;
                    const dexResp = await fetch(dexUrl);
                    if (dexResp.ok) {
                        const dexData = await dexResp.json();
                        const pair = dexData.pairs?.find((p: any) => p.chainId === 'solana');
                        if (pair && pair.priceUsd) {
                            priceUsd = parseFloat(pair.priceUsd);
                        }
                    }
                } catch (dexErr) {
                    console.error("DexScreener pricing failed:", dexErr);
                }

                // If DexScreener failed, try CoinGecko
                if (priceUsd === 0) {
                    try {
                        // Special handling for SOL (Wrapped SOL)
                        if (inputMint === WRAPPED_SOL) {
                            const cgUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
                            const cgResp = await fetch(cgUrl);
                            if (cgResp.ok) {
                                const cgData = await cgResp.json();
                                if (cgData.solana?.usd) {
                                    priceUsd = cgData.solana.usd;
                                }
                            }
                        } else {
                            // General token handling via address
                            const cgUrl = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${inputMint}&vs_currencies=usd`;
                            const cgResp = await fetch(cgUrl);
                            if (cgResp.ok) {
                                const cgData = await cgResp.json();
                                // Handle potential lowercased keys
                                const priceData = cgData[inputMint.toLowerCase()] || cgData[inputMint];
                                if (priceData?.usd) {
                                    priceUsd = priceData.usd;
                                }
                            }
                        }
                    } catch (fallbackErr) {
                        console.error("CoinGecko pricing failed:", fallbackErr);
                    }
                }

                if (priceUsd === 0) {
                    throw new Error("No price data found in fallback (Jupiter, DexScreener, CoinGecko all failed)");
                }

                // Synthetic Quote Calculation
                const inputToken = POPULAR_SOLANA_TOKENS.find(t => t.address === inputMint);
                const tokenDecimals = inputDecimals || inputToken?.decimals || 9;
                const inAmountNum = parseFloat(amount) / Math.pow(10, tokenDecimals);

                const usdValue = inAmountNum * priceUsd;
                const outAmount = Math.floor(usdValue * 1000000).toString(); // USDC 6 decimals

                const syntheticQuote: JupiterQuote = {
                    inputMint,
                    outputMint: params.outputMint,
                    inAmount: amount,
                    outAmount,
                    priceImpactPct: "0",
                    routePlan: [],
                    rate: priceUsd,
                    usdValue
                };

                quoteCache[cacheKey] = { quote: syntheticQuote, timestamp: Date.now() };
                return syntheticQuote;
            }

        } catch (err: any) {
            if (err.name === "AbortError") {
                return null;
            }
            console.error("Failed to get pricing:", err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Search for Solana tokens by symbol or address
     */
    const searchSolanaTokens = useCallback(async (query: string): Promise<SolanaToken[]> => {
        if (!query || query.length < 2) {
            return POPULAR_SOLANA_TOKENS;
        }

        const queryLower = query.toLowerCase();

        // Check if it's a mint address (base58 encoded, typically 32-44 chars)
        if (query.length >= 32 && query.length <= 44) {
            // 1. Try Jupiter
            try {
                const response = await fetch(`https://tokens.jup.ag/token/${query}`);
                if (response.ok) {
                    const tokenInfo = await response.json();
                    return [{
                        address: tokenInfo.address,
                        symbol: tokenInfo.symbol,
                        name: tokenInfo.name,
                        decimals: tokenInfo.decimals,
                        logoURI: tokenInfo.logoURI,
                        chainId: 900,
                    }];
                }
                throw new Error(`Jupiter status: ${response.status}`);
            } catch (err) {
                console.warn("Jupiter failed, trying fallbacks...", err);

                // 2. Try DexScreener (Best for new pairs/memecoins)
                try {
                    const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${query}`);
                    if (dexResp.ok) {
                        const data = await dexResp.json();
                        const pair = data.pairs?.find((p: any) => p.chainId === 'solana');
                        if (pair && pair.baseToken) {
                            return [{
                                address: pair.baseToken.address,
                                symbol: pair.baseToken.symbol,
                                name: pair.baseToken.name,
                                decimals: 9, // DexScreener doesn't always provide decimals, default to 9 safe for UI display
                                logoURI: pair.info?.imageUrl,
                                chainId: 900,
                            }];
                        }
                    }
                } catch (dexErr) {
                    console.error("DexScreener token fetch failed", dexErr);
                }

                // 3. Try CoinGecko (Best for established tokens)
                try {
                    const cgResp = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${query}`);
                    if (cgResp.ok) {
                        const data = await cgResp.json();
                        return [{
                            address: query,
                            symbol: data.symbol ? data.symbol.toUpperCase() : "UNKNOWN",
                            name: data.name || "Unknown Token",
                            decimals: data.detail_platforms?.solana?.decimal_place || 9,
                            logoURI: data.image?.large || data.image?.small,
                            chainId: 900,
                        }];
                    }
                } catch (cgErr) {
                    console.error("CoinGecko Token Info fallback failed:", cgErr);
                }
            }
        }

        // Search in popular tokens first
        const matchingPopular = POPULAR_SOLANA_TOKENS.filter(
            t => t.symbol.toLowerCase().includes(queryLower) ||
                t.name.toLowerCase().includes(queryLower)
        );

        if (matchingPopular.length > 0) {
            return matchingPopular;
        }

        // Search fallbacks for text queries
        try {
            // 1. Try Jupiter List (Filtered)
            const response = await fetch(`https://tokens.jup.ag/tokens?tags=verified`);
            if (response.ok) {
                const tokens = await response.json();
                return tokens
                    .filter((t: any) =>
                        t.symbol.toLowerCase().includes(queryLower) ||
                        t.name.toLowerCase().includes(queryLower)
                    )
                    .slice(0, 10)
                    .map((t: any) => ({
                        address: t.address,
                        symbol: t.symbol,
                        name: t.name,
                        decimals: t.decimals,
                        logoURI: t.logoURI,
                        chainId: 900 as const,
                    }));
            }
            throw new Error("Jupiter list fetch failed");
        } catch (err) {
            console.warn("Jupiter list failed, trying DexScreener search...", err);

            // 2. Try DexScreener Search
            try {
                const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${query}`);
                if (dexResp.ok) {
                    const data = await dexResp.json();
                    if (data.pairs) {
                        const seen = new Set();
                        return data.pairs
                            .filter((p: any) => p.chainId === 'solana')
                            .filter((p: any) => {
                                if (seen.has(p.baseToken.address)) return false;
                                seen.add(p.baseToken.address);
                                return true;
                            })
                            .slice(0, 10)
                            .map((p: any) => ({
                                address: p.baseToken.address,
                                symbol: p.baseToken.symbol,
                                name: p.baseToken.name,
                                decimals: 9,
                                logoURI: p.info?.imageUrl,
                                chainId: 900,
                            }));
                    }
                }
            } catch (dexErr) {
                console.error("DexScreener search failed:", dexErr);
            }
        }

        return [];
    }, []);

    /**
     * Convert human-readable amount to lamports/smallest unit
     */
    const toSmallestUnit = useCallback((amount: string, decimals: number): string => {
        if (!amount || isNaN(parseFloat(amount))) return "0";
        const num = parseFloat(amount);
        return Math.floor(num * Math.pow(10, decimals)).toString();
    }, []);

    /**
     * Format USD value
     */
    const formatUsd = useCallback((value: number): string => {
        if (value === 0) return "$0.00";
        if (value < 0.01) return "<$0.01";
        if (value < 1000) return `$${value.toFixed(2)}`;
        if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${(value / 1000000).toFixed(2)}M`;
    }, []);

    return {
        getJupiterQuote,
        searchSolanaTokens,
        toSmallestUnit,
        formatUsd,
        isLoading,
        error,
        POPULAR_SOLANA_TOKENS,
        SOLANA_USDC,
        WRAPPED_SOL,
    };
}
