"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowDown, Loader2, AlertTriangle } from "lucide-react";
import { TokenSelector } from "./TokenSelector";
import { Token } from "@/hooks/useTokenSearch";
import { usePriceOracle, SwapQuote } from "@/hooks/usePriceOracle";
import { ChainSelector, SUPPORTED_CHAINS, SOLANA_CHAIN_ID } from "./ChainSelector";
import { useJupiterPricing, SOLANA_USDC, SolanaToken } from "@/hooks/useJupiterPricing";

interface SwapCardProps {
    onPurge: (token: Token, amount: string, usdValue: number, prgAmount: string, quote?: SwapQuote) => void;
    isConnected: boolean;
    isPurging: boolean;
    userAddress?: string;
    activeChainId: number;
    onChainSelect: (chainId: number) => void;
    onConnect?: (chainId?: number) => void;
}

export function SwapCard({
    onPurge,
    isConnected,
    isPurging,
    userAddress,
    activeChainId,
    onChainSelect,
    onConnect,
}: SwapCardProps) {
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [inputAmount, setInputAmount] = useState("");
    const [quote, setQuote] = useState<SwapQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { getSwapQuote, formatUsd, isApiConfigured } = usePriceOracle();
    const { getJupiterQuote, toSmallestUnit, formatUsd: formatUsdJupiter } = useJupiterPricing();

    // Check if Solana is selected
    const isSolana = activeChainId === SOLANA_CHAIN_ID;

    // Calculate values from quote
    const usdValue = quote?.usdValue || 0;
    const taxAmount = usdValue * 0.06; // 6% tax
    const prgAmount = usdValue - taxAmount; // 1 PRG = 1 USD
    const priceImpact = prgAmount > 0 ? ((taxAmount / usdValue) * -100).toFixed(2) : "0.00";
    const tokenPrice = quote?.rate || 0;

    /**
     * Convert human-readable amount to wei
     */
    const toWei = useCallback((amount: string, decimals: number): string => {
        if (!amount || isNaN(parseFloat(amount))) return "0";
        const num = parseFloat(amount);
        return (BigInt(Math.floor(num * Math.pow(10, decimals)))).toString();
    }, []);

    // Fetch quote when token or amount changes (debounced)
    useEffect(() => {
        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!selectedToken || !inputAmount || parseFloat(inputAmount) === 0) {
            setQuote(null);
            return;
        }

        // Handle Solana separately using Jupiter
        if (isSolana) {
            debounceRef.current = setTimeout(async () => {
                setIsLoadingQuote(true);
                try {
                    const solanaToken = selectedToken as unknown as SolanaToken;
                    const amountSmallest = toSmallestUnit(inputAmount, solanaToken.decimals || 9);

                    // Check if it's a stablecoin
                    const isStablecoin = solanaToken.symbol.toUpperCase() === "USDC" ||
                        solanaToken.symbol.toUpperCase() === "USDT";

                    if (isStablecoin) {
                        const amountNum = parseFloat(inputAmount);
                        setQuote({
                            fromToken: solanaToken.address,
                            toToken: SOLANA_USDC,
                            fromAmount: amountSmallest,
                            toAmount: amountSmallest,
                            estimatedGas: "5000", // SOL lamports
                            protocols: [],
                            rate: 1.0,
                            usdValue: amountNum,
                        });
                    } else {
                        const jupiterQuote = await getJupiterQuote({
                            inputMint: solanaToken.address,
                            outputMint: SOLANA_USDC,
                            amount: amountSmallest,
                            inputDecimals: solanaToken.decimals || 9,
                        });

                        if (jupiterQuote) {
                            setQuote({
                                fromToken: jupiterQuote.inputMint,
                                toToken: jupiterQuote.outputMint,
                                fromAmount: jupiterQuote.inAmount,
                                toAmount: jupiterQuote.outAmount,
                                estimatedGas: "5000",
                                protocols: jupiterQuote.routePlan,
                                rate: jupiterQuote.rate,
                                usdValue: jupiterQuote.usdValue,
                            });
                        } else {
                            setQuote(null);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch Jupiter quote:", err);
                    setQuote(null);
                } finally {
                    setIsLoadingQuote(false);
                }
            }, 500);

            return () => {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                }
            };
        }

        // Validate activeChainId
        if (!activeChainId || activeChainId === 0) {
            console.warn("Cannot fetch quote: invalid activeChainId", activeChainId);
            setQuote(null);
            return;
        }

        // Get USDC address for current chain
        const USDC_ADDRESSES: Record<number, string> = {
            1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",      // Ethereum
            8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",   // Base
            42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
            10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",    // Optimism
            137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",   // Polygon
        };

        const usdcAddress = USDC_ADDRESSES[activeChainId];
        if (!usdcAddress) {
            console.warn("USDC not configured for chain", activeChainId);
            setQuote(null);
            return;
        }

        // Check if selected token IS USDC or another stablecoin
        const isStablecoin = selectedToken?.address.toLowerCase() === usdcAddress.toLowerCase() ||
            selectedToken?.symbol.toUpperCase() === "USDC" ||
            selectedToken?.symbol.toUpperCase() === "USDT" ||
            selectedToken?.symbol.toUpperCase() === "DAI";

        // Debounce the quote fetch
        debounceRef.current = setTimeout(async () => {
            setIsLoadingQuote(true);
            try {
                // For stablecoins, create a mock 1:1 quote instead of calling API
                if (isStablecoin && selectedToken) {
                    const amountNum = parseFloat(inputAmount);
                    const mockQuote: SwapQuote = {
                        fromToken: selectedToken.address,
                        toToken: usdcAddress,
                        fromAmount: toWei(inputAmount, selectedToken.decimals),
                        toAmount: toWei(inputAmount, 6), // USDC has 6 decimals
                        estimatedGas: "100000",
                        protocols: [],
                        rate: 1.0, // 1:1 for stablecoins
                        usdValue: amountNum,
                    };
                    setQuote(mockQuote);
                } else if (selectedToken) {
                    // For other tokens, fetch real quote from 1inch
                    const amountWei = toWei(inputAmount, selectedToken.decimals);
                    const result = await getSwapQuote({
                        chainId: activeChainId,
                        fromToken: selectedToken.address,
                        toToken: usdcAddress,
                        amount: amountWei,
                        srcDecimals: selectedToken.decimals, // Pass decimals for accurate calculation
                    });
                    setQuote(result);
                }
            } catch (err) {
                console.error("Failed to fetch quote:", err);
                setQuote(null);
            } finally {
                setIsLoadingQuote(false);
            }
        }, 500); // 500ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [selectedToken, inputAmount, activeChainId, getSwapQuote, toWei]);

    const handlePurge = () => {
        if (!selectedToken || !inputAmount || prgAmount <= 0) return;
        onPurge(selectedToken, inputAmount, usdValue, prgAmount.toFixed(2), quote || undefined);
    };

    const formatTokenAmount = (amount: number): string => {
        if (amount === 0) return "0";
        if (amount < 0.01) return amount.toFixed(8);
        if (amount < 1) return amount.toFixed(6);
        if (amount < 1000) return amount.toFixed(4);
        if (amount < 1000000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return `${(amount / 1000000).toFixed(2)}M`;
    };

    return (
        <div className="w-full max-w-[480px] mx-auto">
            {/* API Key Warning - only for EVM chains */}
            {!isSolana && !isApiConfigured() && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="text-xs text-yellow-500">
                        Demo mode: Set NEXT_PUBLIC_1INCH_API_KEY for live prices
                    </span>
                </div>
            )}

            {/* Main Swap Container - 1inch style */}
            <div className="bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div></div>
                    <ChainSelector
                        selectedChainId={activeChainId}
                        onSelect={onChainSelect}
                    />
                </div>

                {/* Source Token Section - "Pay on Ethereum" style */}
                <div className="mb-2">
                    <div className="text-sm text-white/50 mb-3 uppercase tracking-wider font-semibold">You Purge</div>

                    <div className="flex items-center justify-between gap-4">
                        {/* Amount Input - Large font like 1inch */}
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={inputAmount}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, "");
                                return setInputAmount(value);
                            }}
                            className="flex-1 bg-transparent text-4xl font-light text-white outline-none placeholder:text-white/30 min-w-0"
                        />

                        {/* Token Selector */}
                        <TokenSelector
                            selectedToken={selectedToken}
                            onSelect={(token) => {
                                setSelectedToken(token);
                                setQuote(null);
                            }}
                            userAddress={userAddress}
                            chainId={activeChainId}
                        />
                    </div>

                    {/* USD Value - Right aligned like 1inch */}
                    <div className="flex justify-between items-center mt-2">
                        <div>
                            {selectedToken && (
                                <div className="text-[10px] uppercase tracking-widest font-mono text-white/40 flex items-center gap-1">
                                    <span>FACTION:</span>
                                    <span className="text-white/80 font-bold border-b border-white/20 pb-0.5">
                                        {selectedToken.name}
                                    </span>
                                </div>
                            )}
                        </div>
                        {isLoadingQuote ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                        ) : usdValue > 0 ? (
                            <span className="text-sm text-white/50">{formatUsd(usdValue)}</span>
                        ) : (
                            <span className="text-sm text-white/30">$0</span>
                        )}
                    </div>
                </div>

                {/* Arrow Divider - Centered like 1inch */}
                <div className="flex justify-center my-4">
                    <div className="bg-[#2a2a2a] border border-white/10 rounded-xl p-2.5 hover:bg-[#333] transition-colors cursor-pointer">
                        <ArrowDown className="w-5 h-5 text-white/80" />
                    </div>
                </div>

                {/* Destination Token Section - "Receive on Ethereum" style */}
                <div className="mb-6">
                    <div className="text-sm text-white/50 mb-3">You Receive</div>

                    <div className="flex items-center justify-between gap-4">
                        {/* Output Amount - Large green font */}
                        <div className="flex-1 text-4xl font-light min-w-0">
                            {prgAmount > 0 ? (
                                <span className="text-green-400">
                                    {formatTokenAmount(prgAmount)}
                                </span>
                            ) : (
                                <span className="text-white/30">0</span>
                            )}
                        </div>

                        {/* PRG Token Display */}
                        <div className="flex items-center gap-2 bg-[#222] px-4 py-3 rounded-xl border border-white/10">
                            <img src="/purge_icon.png" alt="PRG" className="w-6 h-6 object-contain" />
                            <span className="font-semibold text-white">PRG</span>
                        </div>
                    </div>

                    {/* USD Value & Price Impact - Like 1inch */}
                    <div className="flex justify-end items-center gap-2 mt-2">
                        {prgAmount > 0 && (
                            <>
                                <span className="text-sm text-white/50">{formatUsd(prgAmount)}</span>
                                <span className="text-sm text-red-400">({priceImpact}%)</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Tax Breakdown - Collapsed style */}
                {usdValue > 0 && (
                    <div className="bg-[#222] rounded-xl p-4 mb-4 text-sm">
                        <div className="text-white/60 mb-2">Tax (6%)</div>
                        <div className="space-y-1 text-white/40">
                            <div className="flex justify-between">
                                <span>• LP Floor (3.0%)</span>
                                <span>{formatUsd(usdValue * 0.03)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>• Holder Reflection (1.5%)</span>
                                <span>{formatUsd(usdValue * 0.015)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>• Treasury (1.0%)</span>
                                <span>{formatUsd(usdValue * 0.01)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>• Burn (0.5%)</span>
                                <span>{formatUsd(usdValue * 0.005)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exchange Rate - Bottom of card like 1inch */}
                {selectedToken && tokenPrice > 0 && (
                    <div className="text-center text-sm text-white/50 mb-4">
                        1 {selectedToken.symbol} = {formatUsd(tokenPrice * 0.94)} PRG
                    </div>
                )}

                {/* Action Button - Full width rounded like 1inch */}
                <button
                    onClick={isConnected ? handlePurge : () => onConnect?.(activeChainId)}
                    disabled={isPurging || (isConnected && (!selectedToken || !inputAmount || prgAmount <= 0))}
                    className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all ${isPurging
                        ? "bg-[#333] text-white/50 cursor-wait"
                        : !isConnected
                            ? "bg-[#2a2a2a] text-white hover:bg-[#333]"
                            : !selectedToken || !inputAmount || prgAmount <= 0
                                ? "bg-[#2a2a2a] text-white/40 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/20"
                        }`}
                >
                    {isPurging ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Purging...
                        </span>
                    ) : !isConnected ? (
                        "Connect wallet"
                    ) : !selectedToken ? (
                        "Select token"
                    ) : !inputAmount || prgAmount <= 0 ? (
                        "Enter amount"
                    ) : (
                        `Purge ${selectedToken.symbol} for PRG`
                    )}
                </button>
            </div>
        </div>
    );
}
