"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";
import { useTokenSearch, Token } from "@/hooks/useTokenSearch";
import { useJupiterPricing, POPULAR_SOLANA_TOKENS, SolanaToken } from "@/hooks/useJupiterPricing";
import { SOLANA_CHAIN_ID } from "./ChainSelector";

interface TokenSelectorProps {
    selectedToken: Token | null;
    onSelect: (token: Token) => void;
    userAddress?: string;
    provider?: any;
    chainId?: number;
}

export function TokenSelector({
    selectedToken,
    onSelect,
    userAddress,
    provider,
    chainId = 1,
}: TokenSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [solanaTokens, setSolanaTokens] = useState<SolanaToken[]>(POPULAR_SOLANA_TOKENS);
    const [isLoadingSolana, setIsLoadingSolana] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isSolana = chainId === SOLANA_CHAIN_ID;

    const {
        tokens,
        isLoading,
        error,
        searchTokens,
        popularTokens,
    } = useTokenSearch();

    const { searchSolanaTokens } = useJupiterPricing();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search when query changes
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (isSolana) {
                setIsLoadingSolana(true);
                const results = await searchSolanaTokens(searchQuery);
                setSolanaTokens(results);
                setIsLoadingSolana(false);
            } else {
                searchTokens(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchTokens, searchSolanaTokens, isSolana]);

    // Reset tokens when chain changes
    useEffect(() => {
        setSearchQuery("");
        if (isSolana) {
            setSolanaTokens(POPULAR_SOLANA_TOKENS);
        }
    }, [chainId, isSolana]);

    // Get display tokens based on chain
    const displayTokens = isSolana
        ? (searchQuery.length >= 2 ? solanaTokens : POPULAR_SOLANA_TOKENS)
        : (searchQuery.length >= 2 ? tokens : popularTokens);

    const currentIsLoading = isSolana ? isLoadingSolana : isLoading;

    const handleSelect = (token: Token | SolanaToken) => {
        // Convert SolanaToken to Token format for consistency
        const normalizedToken: Token = {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI,
            chainId: isSolana ? SOLANA_CHAIN_ID : (token as Token).chainId || 1,
        };
        onSelect(normalizedToken);
        setIsOpen(false);
        setSearchQuery("");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Token Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] px-4 py-3 rounded-xl transition-colors shrink-0"
            >
                {selectedToken ? (
                    <>
                        {selectedToken.logoURI && (
                            <img
                                src={selectedToken.logoURI}
                                alt={selectedToken.symbol}
                                className="w-6 h-6 rounded-full"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                        <span className="font-semibold text-white">{selectedToken.symbol}</span>
                    </>
                ) : (
                    <span className="text-white font-medium">Select token</span>
                )}
                <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown - contained within parent */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    {/* Search Input */}
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder={isSolana ? "Search name or paste mint address" : "Search name or paste address"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/40"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-4 h-4 text-white/40 hover:text-white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Token List */}
                    <div className="max-h-72 overflow-y-auto">
                        {currentIsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                            </div>
                        ) : displayTokens.length === 0 ? (
                            <div className="py-6 text-center text-white/50 text-sm">
                                {searchQuery ? "No tokens found" : "Start typing to search"}
                            </div>
                        ) : (
                            <div className="py-2">
                                {!searchQuery && (
                                    <div className="px-4 py-2 text-xs text-white/40 font-medium">
                                        {isSolana ? "Popular Solana Tokens" : "Popular Tokens"}
                                    </div>
                                )}
                                {displayTokens.map((token) => {
                                    return (
                                        <button
                                            key={token.address}
                                            onClick={() => handleSelect(token)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {token.logoURI ? (
                                                    <img
                                                        src={token.logoURI}
                                                        alt={token.symbol}
                                                        className="w-9 h-9 rounded-full bg-white/10"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23333'/%3E%3C/svg%3E";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                                                        {token.symbol.slice(0, 2)}
                                                    </div>
                                                )}
                                                <div className="text-left">
                                                    <div className="font-medium text-white">{token.name}</div>
                                                    <div className="text-xs text-white/50">{token.symbol}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-white/50">
                                                    -
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
