"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface Chain {
    id: number;
    name: string;
    logo: string;
    color: string;
}

// Solana uses a special ID (900) since it doesn't have EVM chain IDs
export const SOLANA_CHAIN_ID = 900;

export const SUPPORTED_CHAINS: Chain[] = [
    {
        id: 1,
        name: "Ethereum",
        logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        color: "#627EEA",
    },
    {
        id: 8453,
        name: "Base",
        logo: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
        color: "#0052FF",
    },
    {
        id: 42161,
        name: "Arbitrum",
        logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.png",
        color: "#28A0F0",
    },
    {
        id: 10,
        name: "Optimism",
        logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.png",
        color: "#FF0420",
    },
    {
        id: 137,
        name: "Polygon",
        logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
        color: "#8247E5",
    },
    {
        id: SOLANA_CHAIN_ID,
        name: "Solana",
        logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
        color: "#14F195",
    },
];

interface ChainSelectorProps {
    selectedChainId: number;
    onSelect: (chainId: number) => void;
    disabled?: boolean;
}

export function ChainSelector({ selectedChainId, onSelect, disabled }: ChainSelectorProps) {
    const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === selectedChainId) || SUPPORTED_CHAINS[0];
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
            >
                <img src={selectedChain.logo} alt={selectedChain.name} className="w-4 h-4 object-contain" />
                <span className="text-xs font-medium text-white/80">{selectedChain.name}</span>
                <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {!disabled && (
                <div
                    className={`absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all z-50 origin-top ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                        }`}
                >
                    <div className="py-1">
                        {SUPPORTED_CHAINS.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => {
                                    onSelect(chain.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors text-left ${selectedChainId === chain.id ? "bg-white/5" : ""
                                    }`}
                            >
                                <img src={chain.logo} alt={chain.name} className="w-5 h-5 object-contain" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white">{chain.name}</span>
                                    {selectedChainId === chain.id && (
                                        <span className="text-[10px] text-purple-400">Connected</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
