"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { StarField } from "@/components/ThreeScene";
import { SwapCard } from "@/components/SwapCard";
import { Token } from "@/hooks/useTokenSearch";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { UnifiedWalletModal } from "@/components/UnifiedWalletModal";
import { usePurgeProtocol } from "@/hooks/usePurgeProtocol";
import { FactionLeaderboard, Faction } from "@/components/FactionLeaderboard";
import { useFactionStats } from "@/hooks/useFactionStats";
import { ManifestoVisual } from "@/components/ManifestoVisual";

type View = "MANIFESTO" | "FACTIONS" | "PORTAL";

const INITIAL_FACTIONS: Faction[] = [
  {
    id: "pepe",
    rank: "01",
    name: "Pepe",
    origin: "EX-PEPE HEGEMONY",
    liquidity: "$50.0M",
    weight: 24.2,
    status: "Apex Hegemon",
    icon: "https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg"
  },
  {
    id: "doge",
    rank: "02",
    name: "Dogecoin",
    origin: "EX-DOGE HEGEMONY",
    liquidity: "$35.0M",
    weight: 21.8,
    status: "Global Superpower",
    icon: "https://assets.coingecko.com/coins/images/5/standard/dogecoin.png"
  },
  {
    id: "shib",
    rank: "03",
    name: "Shiba Inu",
    origin: "EX-SHIB HEGEMONY",
    liquidity: "$25.0M",
    weight: 9.1,
    status: "Continental Hegemon",
    icon: "https://assets.coingecko.com/coins/images/11939/standard/shiba.png"
  },
  {
    id: "wif",
    rank: "04",
    name: "DogWifHat",
    origin: "EX-WIF HEGEMONY",
    liquidity: "$15.0M",
    weight: 7.5,
    status: "Regional Power",
    icon: "https://assets.coingecko.com/coins/images/33566/standard/dogwifhat.jpg"
  },
  {
    id: "ponke",
    rank: "05",
    name: "Ponke",
    origin: "EX-PONKE HEGEMONY",
    liquidity: "$5.0M",
    weight: 4.3,
    status: "Sovereign Entity",
    icon: "https://dd.dexscreener.com/ds-data/tokens/solana/5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC.png"
  }
];

// Helper to determine status based on liquidity (in millions)
const getStrategicStatus = (liquidityM: number): string => {
  if (liquidityM >= 40) return "Apex Hegemon";
  if (liquidityM >= 20) return "Global Superpower";
  if (liquidityM >= 10) return "Continental Hegemon";
  if (liquidityM >= 5) return "Regional Power";
  return "Sovereign Entity";
};

export default function Home() {
  const [isPurging, setIsPurging] = useState(false);
  const [entered, setEntered] = useState(false);
  const [currentView, setCurrentView] = useState<View>("PORTAL");
  const [manualChainId, setManualChainId] = useState<number | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Use the new hook for managing factions (supports API + optimistic updates)
  const { factions, setFactions } = useFactionStats(INITIAL_FACTIONS);

  const {
    isConnected,
    address,
    chainId,
    disconnect,
    stats,
    fetchStats,
    executePurge,
  } = usePurgeProtocol();

  // Reset manual chain ID when wallet connects/disconnects
  useState(() => {
    if (isConnected) {
      setManualChainId(null);
    }
  });

  const activeChainId = manualChainId || chainId || 1;

  const handlePurge = async (token: Token, amount: string, usdValue: number, prgAmount: string) => {
    setIsPurging(true);

    try {
      console.log("Executing purge:", { token: token.address, amount });

      // Call the actual Solana/EVM purge function
      const result = await executePurge(token.address, amount);

      if (result.success) {
        alert(`🔥 Successfully purged ${amount} ${token.symbol}!\n\nTransaction: ${result.txHash}\nUSD Value: $${usdValue.toFixed(2)}\nYou receive: ${prgAmount} $PRG`);

        // Update Factions Leaderboard
        setFactions(prevFactions => {
          const newFactions = [...prevFactions];
          // Find existing faction by name or symbol (approximate match)
          const existingFactionIndex = newFactions.findIndex(
            f => f.name.toLowerCase().includes(token.name.toLowerCase()) ||
              token.name.toLowerCase().includes(f.name.toLowerCase()) ||
              f.id === token.symbol.toLowerCase()
          );

          if (existingFactionIndex >= 0) {
            // Update existing faction
            const faction = newFactions[existingFactionIndex];
            const currentLiquidity = parseFloat(faction.liquidity.replace(/[^0-9.]/g, '')) || 0;
            // Handle parsing logic if needed or rely on hook re-calc
            // Just update string value, hook will re-parse and sort
            // But we need to parse correctly here to add.
            // Let's assume standardized format or just re-parse roughly
            let val = 0;
            if (faction.liquidity.includes('M')) val = parseFloat(faction.liquidity) * 1_000_000;
            else if (faction.liquidity.includes('K')) val = parseFloat(faction.liquidity) * 1_000;
            else val = parseFloat(faction.liquidity.replace('$', ''));

            val += usdValue;

            // Format back simply, hook will standardize
            faction.liquidity = `$${val.toString()}`;
            faction.weight += 0.1;

            if (!faction.icon && token.logoURI) {
              faction.icon = token.logoURI;
            }
          } else {
            // Add new faction
            newFactions.push({
              id: token.symbol.toLowerCase(),
              rank: "??",
              name: token.name,
              origin: `EX-${token.symbol.toUpperCase()} HEGEMONY`,
              liquidity: `$${usdValue}`,
              weight: 0.1,
              status: "Thinking...", // Hook will calculate
              icon: token.logoURI || "",
            });
          }
          return newFactions;
        });

        // Refresh stats
        await fetchStats();
      } else {
        alert(`❌ Purge failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Purge failed:", error);
      alert(`Purge failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsPurging(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-white selection:text-black">

      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Static Black Hole Image */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <img
            src="/blackhole-clean.png"
            alt="Black Hole"
            className="w-[90%] max-w-[1000px] object-contain opacity-90"
          />
        </div>

        {/* Star Field Overlay */}
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <StarField />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pointer-events-none">

        {!entered ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 pointer-events-auto p-6">
            <h1 className="text-6xl md:text-9xl font-[family-name:var(--font-michroma)] text-white tracking-widest animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">PURGE</h1>
            <p className="text-white/60 text-center max-w-md">
              Sacrifice your failed investments. Receive $PRG.
            </p>
            <button
              onClick={() => setEntered(true)}
              className="px-8 py-3 border border-white hover:bg-white hover:text-black transition-all font-mono tracking-[0.2em]"
            >
              ENTER PROTOCOL
            </button>
          </motion.div>
        ) : (
          <div className="w-full h-full flex flex-col pointer-events-auto">
            {/* Header */}
            <header className="w-full p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 z-50">
              <div className="flex items-center gap-4 text-left">
                <img src="/purge_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
                <h1 className="font-[family-name:var(--font-michroma)] text-5xl text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">PURGE</h1>
              </div>

              {/* Navigation */}
              <nav className="flex items-center gap-2 md:gap-8 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/5">
                {[
                  { id: "MANIFESTO", label: "HOME" },
                  { id: "FACTIONS", label: "FACTIONS" },
                  { id: "PORTAL", label: "ENTER PORTAL" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as View)}
                    className={`text-[10px] md:text-xs font-bold tracking-widest transition-all ${currentView === item.id
                      ? "text-white scale-105"
                      : "text-white/40 hover:text-white hover:scale-105"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {!isConnected ? (
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-6 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all flex items-center gap-2 backdrop-blur-md text-xs md:text-sm"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-xs text-white/50 hidden md:block">
                    Chain: {chainId}
                  </div>
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 bg-purple-900/50 border border-purple-500/50 rounded-full text-xs font-mono text-purple-200 hover:bg-purple-800/50 transition-all"
                  >
                    {formatAddress(address)}
                  </button>
                </div>
              )}
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-y-auto overflow-x-hidden scrollbar-hide">
              <AnimatePresence mode="wait">
                {currentView === "PORTAL" && (
                  <motion.div
                    key="portal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex justify-center p-4 min-h-[500px]"
                  >
                    <SwapCard
                      onPurge={handlePurge}
                      isConnected={isConnected}
                      isPurging={isPurging}
                      userAddress={address}
                      activeChainId={activeChainId}
                      onChainSelect={setManualChainId}
                      onConnect={() => setIsWalletModalOpen(true)}
                    />
                  </motion.div>
                )}

                {currentView === "FACTIONS" && (
                  <motion.div
                    key="factions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full overflow-y-auto"
                  >
                    <div className="pt-10 pb-20">
                      <div className="text-center mb-10 px-4">
                        <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4 text-white">
                          PRESERVE YOUR PRIDE.
                          <br />
                          <span className="text-gray-500">EXPAND YOUR POWER.</span>
                        </h2>
                        <p className="max-w-2xl mx-auto text-gray-400 text-sm md:text-base leading-relaxed">
                          Every coin that merges becomes a Faction. You keep your colors. You keep your tribe.
                          But now, you fight for dominance within the global empire.
                        </p>
                      </div>
                      <FactionLeaderboard factions={factions} />
                    </div>
                  </motion.div>
                )}

                {currentView === "MANIFESTO" && (
                  <motion.div
                    key="manifesto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 w-full h-full overflow-y-auto scrollbar-hide"
                  >
                    <ManifestoVisual
                      totalLiquidity={`$${parseFloat(stats.lpBalance).toLocaleString()}`}
                      floorPrice={`$${(parseFloat(stats.lpBalance) / (parseFloat(stats.totalSupply) || 1)).toFixed(2)}`}
                      distributedDividends={`$${(parseFloat(stats.lpBalance) * 0.05).toLocaleString()}`} // Placeholder logic: 5% of LP
                      activeFactionsCount={factions.length}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Stats - Only show in Portal or make it fixed? Keeping it for now but conditional on view if needed. */}
            {currentView === "PORTAL" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 pointer-events-none"
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-mono text-white/40 tracking-widest uppercase flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Total Supply
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tighter text-glow">
                    {parseFloat(stats.totalSupply).toLocaleString()} $PRG
                  </span>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-mono text-white/40 tracking-widest uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> LP Floor (USDC)
                  </span>
                  <span className="text-2xl font-black font-mono tracking-tighter text-glow">
                    ${parseFloat(stats.lpBalance).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        )}

      </div>

      <UnifiedWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </main>
  );
}
