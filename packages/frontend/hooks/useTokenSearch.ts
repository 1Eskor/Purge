"use client";

import { useState, useCallback, useEffect } from "react";

export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    chainId: number;
    priceUSD?: string;
}

interface TokenSearchHook {
    tokens: Token[];
    isLoading: boolean;
    error: string | null;
    searchTokens: (query: string) => void;
    resolveTokenFromAddress: (address: string, chainId?: number) => Promise<Token | null>;
    fetchTokenPrice: (tokenAddress: string, chainId: number) => Promise<string>;
    fetchTokenBalance: (tokenAddress: string, userAddress: string, provider: any) => Promise<string>;
    popularTokens: Token[];
}

// Popular tokens to show by default (with real addresses)
const POPULAR_TOKENS: Token[] = [
    {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        logoURI: "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
        chainId: 1,
    },
    {
        address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
        symbol: "PEPE",
        name: "Pepe",
        decimals: 18,
        logoURI: "https://tokens.1inch.io/0x6982508145454ce325ddbe47a25d4ec3d2311933.png",
        chainId: 1,
    },
    {
        address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
        symbol: "SHIB",
        name: "Shiba Inu",
        decimals: 18,
        logoURI: "https://tokens.1inch.io/0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce.png",
        chainId: 1,
    },
    {
        address: "0x4206931337dc273a630d328dA6441786BfaD668f",
        symbol: "DOGE",
        name: "Dogecoin (Wrapped)",
        decimals: 8,
        logoURI: "https://tokens.1inch.io/0x4206931337dc273a630d328da6441786bfad668f.png",
        chainId: 1,
    },
    {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        logoURI: "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
        chainId: 1,
    },
];

// Chain IDs we support
const SUPPORTED_CHAINS: Record<number, string> = {
    1: "ethereum",      // Ethereum
    8453: "base",       // Base  
    42161: "arbitrum",  // Arbitrum
    10: "optimism",     // Optimism
    137: "polygon",     // Polygon
};

// RPC endpoints for on-chain resolution
const RPC_ENDPOINTS: Record<number, string> = {
    1: "https://eth.llamarpc.com",
    8453: "https://base.llamarpc.com",
    42161: "https://arbitrum.llamarpc.com",
    10: "https://optimism.llamarpc.com",
    137: "https://polygon.llamarpc.com",
};

// ERC20 ABI for token info
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
];

export function useTokenSearch(): TokenSearchHook {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenList, setTokenList] = useState<Token[]>([]);

    // Fetch token list on mount
    useEffect(() => {
        fetchTokenList(1); // Default to Ethereum
    }, []);

    // Fetch token list from 1inch
    const fetchTokenList = async (chainId: number) => {
        try {
            // 1inch Token API (public, no auth needed for token list)
            const response = await fetch(
                `https://tokens.1inch.io/v1.2/${chainId}`,
                { cache: "force-cache" } // Cache the token list
            );

            if (!response.ok) {
                throw new Error("Failed to fetch token list");
            }

            const data = await response.json();

            // Convert object to array
            const tokenArray: Token[] = Object.values(data).map((token: any) => ({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoURI: token.logoURI,
                chainId: chainId,
            }));

            setTokenList(tokenArray);
        } catch (err) {
            console.error("Failed to fetch token list:", err);
            // Fallback to popular tokens
            setTokenList(POPULAR_TOKENS);
        }
    };

    /**
     * Resolve any ERC-20 token by address using on-chain data
     * This allows finding tokens not in the 1inch list
     */
    const resolveTokenFromAddress = useCallback(async (
        address: string,
        chainId: number = 1
    ): Promise<Token | null> => {
        // Validate address format
        if (!address.startsWith("0x") || address.length !== 42) {
            return null;
        }

        try {
            const { ethers } = await import("ethers");
            const rpcUrl = RPC_ENDPOINTS[chainId] || RPC_ENDPOINTS[1];
            const provider = new ethers.JsonRpcProvider(rpcUrl);

            const contract = new ethers.Contract(address, ERC20_ABI, provider);

            // Fetch token info on-chain
            const [name, symbol, decimals] = await Promise.all([
                contract.name().catch(() => "Unknown Token"),
                contract.symbol().catch(() => "???"),
                contract.decimals().catch(() => 18),
            ]);

            return {
                address: address,
                symbol: symbol,
                name: name,
                decimals: Number(decimals),
                chainId: chainId,
                // Generate a placeholder logo based on first letter
                logoURI: undefined,
            };
        } catch (err) {
            console.error("Failed to resolve token:", err);
            return null;
        }
    }, []);

    // Search tokens by name, symbol, or address
    const searchTokens = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setTokens([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const lowerQuery = query.toLowerCase();

            // Check if searching by address (full contract address)
            if (query.startsWith("0x") && query.length === 42) {
                // First check if it's in our token list
                const addressMatch = tokenList.filter(
                    t => t.address.toLowerCase() === lowerQuery
                );

                if (addressMatch.length > 0) {
                    setTokens(addressMatch);
                } else {
                    // Not in list - resolve on-chain
                    const resolved = await resolveTokenFromAddress(query);
                    if (resolved) {
                        setTokens([resolved]);
                    } else {
                        setTokens([]);
                        setError("Token not found or invalid address");
                    }
                }
            } else if (query.startsWith("0x") && query.length >= 10) {
                // Partial address search
                const addressMatch = tokenList.filter(
                    t => t.address.toLowerCase().includes(lowerQuery)
                );
                setTokens(addressMatch.slice(0, 10));
            } else {
                // Search by name or symbol
                const matches = tokenList.filter(
                    t =>
                        t.symbol.toLowerCase().includes(lowerQuery) ||
                        t.name.toLowerCase().includes(lowerQuery)
                );
                setTokens(matches.slice(0, 10)); // Limit to 10 results
            }
        } catch (err: any) {
            setError(err.message || "Search failed");
        } finally {
            setIsLoading(false);
        }
    }, [tokenList, resolveTokenFromAddress]);

    // Fetch token price from 1inch API
    const fetchTokenPrice = useCallback(async (
        tokenAddress: string,
        chainId: number = 1
    ): Promise<string> => {
        try {
            // Use 1inch Spot Price API
            const response = await fetch(
                `https://api.1inch.dev/price/v1.1/${chainId}/${tokenAddress}`,
                {
                    headers: {
                        "Authorization": "Bearer " + (process.env.NEXT_PUBLIC_1INCH_API_KEY || ""),
                    },
                }
            );

            if (!response.ok) {
                // Fallback: Use CoinGecko or return 0
                console.warn("1inch price API failed, using fallback");
                return "0";
            }

            const data = await response.json();
            return data[tokenAddress] || "0";
        } catch (err) {
            console.error("Failed to fetch price:", err);
            return "0";
        }
    }, []);

    // Fetch token balance
    const fetchTokenBalance = useCallback(async (
        tokenAddress: string,
        userAddress: string,
        provider: any
    ): Promise<string> => {
        if (!provider || !userAddress) return "0";

        try {
            const { ethers } = await import("ethers");

            // Native token
            if (tokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
                const balance = await provider.getBalance(userAddress);
                return ethers.formatEther(balance);
            }

            // ERC20 token
            const contract = new ethers.Contract(
                tokenAddress,
                ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
                provider
            );

            const [balance, decimals] = await Promise.all([
                contract.balanceOf(userAddress),
                contract.decimals(),
            ]);

            return ethers.formatUnits(balance, decimals);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
            return "0";
        }
    }, []);

    return {
        tokens,
        isLoading,
        error,
        searchTokens,
        resolveTokenFromAddress,
        fetchTokenPrice,
        fetchTokenBalance,
        popularTokens: POPULAR_TOKENS,
    };
}
