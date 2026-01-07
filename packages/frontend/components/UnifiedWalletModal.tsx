"use client";

import { X, Wallet as WalletIcon, ChevronRight } from "lucide-react";
import { useConnect } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface UnifiedWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UnifiedWalletModal({ isOpen, onClose }: UnifiedWalletModalProps) {
    const { connectors, connect: connectEvm } = useConnect();
    const { wallets: solanaWallets, select: selectSolana, connect: connectSolana } = useWallet();
    const { openConnectModal } = useConnectModal();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    // Filter EVM connectors to standout ones + WalletConnect
    // We prioritize typical Injected (Metamask) and others
    const evmConnectors = connectors.filter(c =>
        c.id === 'metaMask' ||
        c.id === 'coinbaseWalletSDK' ||
        c.id === 'injected'
    );
    // Remove duplicates by ID
    const uniqueEvmConnectors = Array.from(new Map(evmConnectors.map(c => [c.id, c])).values());

    const handleSolanaClick = async (walletName: any) => {
        try {
            selectSolana(walletName);
            // Wait a tick for selection to propagate? Usually auto-connect logic triggers or we call connect
            await connectSolana();
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEvmClick = (connector: any) => {
        connectEvm({ connector });
        onClose();
    };

    const handleRainbowClick = () => {
        if (openConnectModal) {
            openConnectModal();
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <WalletIcon className="w-5 h-5 text-purple-400" />
                                    Connect Wallet
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white/50" />
                                </button>
                            </div>

                            {/* Wallet List */}
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">

                                {/* Solana Section */}
                                <div className="text-xs font-mono text-white/40 uppercase tracking-widest px-2 mb-2 mt-2">
                                    Solana
                                </div>
                                {solanaWallets.map((wallet) => (
                                    <button
                                        key={wallet.adapter.name}
                                        onClick={() => handleSolanaClick(wallet.adapter.name)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#222] hover:bg-[#333] transition-all group border border-transparent hover:border-purple-500/30"
                                    >
                                        <img
                                            src={wallet.adapter.icon}
                                            alt={wallet.adapter.name}
                                            className="w-8 h-8 rounded-lg"
                                        />
                                        <div className="flex-1 text-left">
                                            <div className="font-bold">{wallet.adapter.name}</div>
                                            <div className="text-xs text-white/40">Solana Network</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/50" />
                                    </button>
                                ))}

                                {/* EVM Section */}
                                <div className="text-xs font-mono text-white/40 uppercase tracking-widest px-2 mb-2 mt-4">
                                    Ethereum & Base
                                </div>
                                {uniqueEvmConnectors.map((connector) => (
                                    <button
                                        key={connector.id}
                                        onClick={() => handleEvmClick(connector)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#222] hover:bg-[#333] transition-all group border border-transparent hover:border-blue-500/30"
                                    >
                                        {/* Fallback Icon for EVM */}
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                            {connector.name.slice(0, 1)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-bold">{connector.name}</div>
                                            <div className="text-xs text-white/40">EVM Network</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/50" />
                                    </button>
                                ))}

                                {/* Other / RainbowKit */}
                                <button
                                    onClick={handleRainbowClick}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#222] hover:bg-[#333] transition-all group border border-transparent hover:border-pink-500/30 mt-2"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center">
                                        <WalletIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-bold">More Options</div>
                                        <div className="text-xs text-white/40">WalletConnect, Ledger, etc.</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white/50" />
                                </button>

                            </div>

                            <div className="p-4 bg-white/5 text-center text-xs text-white/30">
                                By connecting, you agree to the Terms of Service.
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
