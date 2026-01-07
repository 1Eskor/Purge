"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Price Oracle using 1inch Quote API
 * 
 * For mainnet, the DEX aggregator (1inch) is the source of truth for pricing
 * because we're executing a swap. The quote tells us exactly how much USDC
 * we'll receive for any input token.
 * 
 * Architecture:
 * 1. User inputs token + amount
 * 2. Frontend calls 1inch Quote API (token → USDC)
 * 3. Quote returns exact USDC output = token's USD value
 * 4. Contract executes swap via 1inch Router
 * 5. (Optional) Pyth used for sanity checks on major tokens
 */

// USDC addresses per chain
const USDC_ADDRESSES: Record<number, string> = {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",      // Ethereum
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",   // Base
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",    // Optimism
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",   // Polygon
};

// Native token placeholder
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// 1inch API base URL
const ONEINCH_API_URL = "https://api.1inch.dev";

// Cache for quotes
const quoteCache: Record<string, { quote: SwapQuote; timestamp: number }> = {};
const CACHE_DURATION = 15000; // 15 seconds for quotes

export interface SwapQuote {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    protocols: any[];
    // Calculated values
    rate: number;          // Price per token in USD
    usdValue: number;      // Total USD value
    priceImpact?: number;  // Price impact percentage
}

interface QuoteParams {
    chainId: number;
    fromToken: string;
    toToken: string;
    amount: string;        // Amount in wei
    srcDecimals?: number;  // Source token decimals (for accurate price calculation)
}

export function usePriceOracle() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Get the API key from environment
     */
    const getApiKey = useCallback((): string | null => {
        return process.env.NEXT_PUBLIC_1INCH_API_KEY || null;
    }, []);

    /**
     * Get a swap quote from 1inch API
     * This is the primary way to get token prices for any token
     */
    const getSwapQuote = useCallback(async (params: QuoteParams): Promise<SwapQuote | null> => {
        const { chainId, fromToken, toToken, amount, srcDecimals = 18 } = params;

        // Validate chainId
        if (!chainId || chainId === 0) {
            console.warn("Invalid chainId:", chainId);
            return null;
        }

        // Don't fetch for zero amounts
        if (!amount || amount === "0") {
            return null;
        }

        const cacheKey = `${chainId}-${fromToken}-${toToken}-${amount}`;
        const cached = quoteCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.quote;
        }

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const apiKey = getApiKey();
        if (!apiKey) {
            console.warn("No 1inch API key configured. Set NEXT_PUBLIC_1INCH_API_KEY in .env");
            // Return a mock quote for demo purposes
            return getMockQuote(params);
        }

        try {
            setIsLoading(true);
            setError(null);

            // Use our Next.js API proxy to avoid CORS issues
            const url = new URL(`/api/quote`, window.location.origin);
            url.searchParams.set("src", fromToken);
            url.searchParams.set("dst", toToken);
            url.searchParams.set("amount", amount);
            url.searchParams.set("chainId", chainId.toString());

            const response = await fetch(url.toString(), {
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`1inch API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Calculate rate and USD value
            const fromAmountNum = parseFloat(amount);
            const toAmountNum = parseFloat(data.dstAmount);

            // For USDC (6 decimals), adjust
            const usdcDecimals = 6;
            // Use the srcDecimals passed in (more reliable than API response)
            const fromDecimals = srcDecimals;

            const usdValue = toAmountNum / Math.pow(10, usdcDecimals);
            const tokenAmount = fromAmountNum / Math.pow(10, fromDecimals);
            const rate = tokenAmount > 0 ? usdValue / tokenAmount : 0;

            const quote: SwapQuote = {
                fromToken: data.srcToken?.address || fromToken,
                toToken: data.dstToken?.address || toToken,
                fromAmount: amount,
                toAmount: data.dstAmount,
                estimatedGas: data.gas || "0",
                protocols: data.protocols || [],
                rate,
                usdValue,
            };

            // Cache the result
            quoteCache[cacheKey] = {
                quote,
                timestamp: Date.now(),
            };

            return quote;
        } catch (err: any) {
            if (err.name === "AbortError") {
                return null; // Silently ignore aborted requests
            }
            console.error("Failed to get swap quote:", err);
            setError(err.message);
            return getMockQuote(params);
        } finally {
            setIsLoading(false);
        }
    }, [getApiKey]);

    /**
     * Mock quote for demo/development when no API key is set
     * Uses approximate prices for common tokens
     */
    const getMockQuote = useCallback((params: QuoteParams): SwapQuote => {
        const { fromToken, amount } = params;

        // Approximate prices for demo
        const mockPrices: Record<string, number> = {
            [NATIVE_TOKEN.toLowerCase()]: 3200,
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": 3200, // ETH
            "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": 95000, // WBTC
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 3200, // WETH
            "0x6982508145454ce325ddbe47a25d4ec3d2311933": 0.000012, // PEPE
            "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": 0.000024, // SHIB
            "0xd533a949740bb3306d119cc777fa900ba034cd52": 0.43, // CRV
            "0x6985884c4392d348587b19cb9eaaf157f13271cd": 1.41, // ZRO
        };

        const normalizedFrom = fromToken.toLowerCase();
        const price = mockPrices[normalizedFrom] || 1; // Default $1 for unknown

        const amountNum = parseFloat(amount);
        const decimals = 18; // Assume 18 for demo
        const tokenAmount = amountNum / Math.pow(10, decimals);
        const usdValue = tokenAmount * price;

        return {
            fromToken,
            toToken: USDC_ADDRESSES[1],
            fromAmount: amount,
            toAmount: (usdValue * 1e6).toString(), // USDC has 6 decimals
            estimatedGas: "200000",
            protocols: [],
            rate: price,
            usdValue,
        };
    }, []);

    /**
     * Get price for a token by getting a quote to USDC
     * 
     * @param tokenAddress - Token contract address
     * @param amount - Amount in token's smallest unit (wei)
     * @param chainId - Chain ID (default: 1 for Ethereum)
     */
    const getTokenPrice = useCallback(async (
        tokenAddress: string,
        amount: string,
        chainId: number = 1
    ): Promise<number> => {
        if (!amount || amount === "0") {
            return 0;
        }

        const usdcAddress = USDC_ADDRESSES[chainId];
        if (!usdcAddress) {
            console.warn(`USDC not configured for chain ${chainId}`);
            return 0;
        }

        const quote = await getSwapQuote({
            chainId,
            fromToken: tokenAddress,
            toToken: usdcAddress,
            amount,
        });

        return quote?.rate || 0;
    }, [getSwapQuote]);

    /**
     * Get USD value for a token amount
     */
    const getUsdValue = useCallback(async (
        tokenAddress: string,
        amount: string,
        chainId: number = 1
    ): Promise<number> => {
        if (!amount || amount === "0") {
            return 0;
        }

        const usdcAddress = USDC_ADDRESSES[chainId];
        if (!usdcAddress) {
            return 0;
        }

        const quote = await getSwapQuote({
            chainId,
            fromToken: tokenAddress,
            toToken: usdcAddress,
            amount,
        });

        return quote?.usdValue || 0;
    }, [getSwapQuote]);

    /**
     * Calculate USD value given amount and price
     */
    const calculateUsdValue = useCallback((
        amount: string | number,
        pricePerToken: number
    ): number => {
        const numAmount = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
        return numAmount * pricePerToken;
    }, []);

    /**
     * Format USD value for display
     */
    const formatUsd = useCallback((value: number): string => {
        if (value === 0) return "$0.00";
        if (value < 0.01) return "<$0.01";
        if (value < 1000) return `$${value.toFixed(2)}`;
        if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${(value / 1000000).toFixed(2)}M`;
    }, []);

    /**
     * Check if API key is configured
     */
    const isApiConfigured = useCallback((): boolean => {
        return !!getApiKey();
    }, [getApiKey]);

    return {
        getSwapQuote,
        getTokenPrice,
        getUsdValue,
        calculateUsdValue,
        formatUsd,
        isApiConfigured,
        isLoading,
        error,
    };
}
