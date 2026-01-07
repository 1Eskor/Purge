"use client";

import { motion } from "framer-motion";
import { StarField } from "./ThreeScene";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

const COINS = [
    { id: "sol", src: "https://assets.coingecko.com/coins/images/4128/standard/solana.png", name: "Solana" },
    { id: "eth", src: "https://assets.coingecko.com/coins/images/279/standard/ethereum.png", name: "Ethereum" },
    { id: "base", src: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4", name: "Base" }, // Matching ChainSelector
    { id: "usdc", src: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png", name: "USDC" },
    { id: "btc", src: "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png", name: "Bitcoin" },
    { id: "pepe", src: "https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg", name: "Pepe" },
    { id: "doge", src: "https://assets.coingecko.com/coins/images/5/standard/dogecoin.png", name: "Dogecoin" },
    { id: "shib", src: "https://assets.coingecko.com/coins/images/11939/standard/shiba.png", name: "Shiba Inu" },
    { id: "wif", src: "https://assets.coingecko.com/coins/images/33566/standard/dogwifhat.jpg", name: "DogWifHat" },
    { id: "ponke", src: "https://dd.dexscreener.com/ds-data/tokens/solana/5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC.png", name: "Ponke" },
    { id: "pudgy", src: "https://coin-logos.simplr.sh/images/pudgy-penguins/large.png", name: "Pudgy Penguins" },
    { id: "popcat", src: "https://logo.svgcdn.com/token-branded/popcat.png", name: "PopCat" },
    { id: "polygon", src: "https://cryptologos.cc/logos/polygon-matic-logo.png", name: "Polygon" }, // Replaced Pnut with Polygon
];

// Physics constants
const COIN_SIZE = 80; // w-20 = 5rem = 80px (assuming default root font size 16px)
const RADIUS = COIN_SIZE / 2;
const PADDING = COIN_SIZE; // 1 coin diameter padding
const SPEED = 0.8; // Lower speed for "floating" feel

const ChaosField = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [coinsState, setCoinsState] = useState(
        COINS.map((coin) => ({
            ...coin,
            x: 0,
            y: 0,
            vx: (Math.random() - 0.5) * SPEED * 2,
            vy: (Math.random() - 0.5) * SPEED * 2
        }))
    );
    const coinsRef = useRef(coinsState);
    const requestRef = useRef<number>();
    const initialized = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Initialize positions randomly but within bounds
        if (!initialized.current) {
            const newCoins = coinsRef.current.map(c => ({
                ...c,
                x: PADDING + Math.random() * (width - 2 * PADDING),
                y: PADDING + Math.random() * (height - 2 * PADDING)
            }));
            coinsRef.current = newCoins;
            setCoinsState(newCoins);
            initialized.current = true;
        }

        const animate = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;

            const coins = coinsRef.current;

            for (let i = 0; i < coins.length; i++) {
                const coin = coins[i];

                // Update position
                coin.x += coin.vx;
                coin.y += coin.vy;

                // Wall Collisions
                // Left
                if (coin.x < PADDING + RADIUS) {
                    coin.x = PADDING + RADIUS;
                    coin.vx *= -1;
                }
                // Right
                if (coin.x > w - PADDING - RADIUS) {
                    coin.x = w - PADDING - RADIUS;
                    coin.vx *= -1;
                }
                // Top
                if (coin.y < PADDING + RADIUS) {
                    coin.y = PADDING + RADIUS;
                    coin.vy *= -1;
                }
                // Bottom
                if (coin.y > h - PADDING - RADIUS) {
                    coin.y = h - PADDING - RADIUS;
                    coin.vy *= -1;
                }
            }

            // Object Collisions (Naive O(N^2) but N=13 so it's fine)
            for (let i = 0; i < coins.length; i++) {
                for (let j = i + 1; j < coins.length; j++) {
                    const c1 = coins[i];
                    const c2 = coins[j];

                    const dx = c2.x - c1.x;
                    const dy = c2.y - c1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = RADIUS * 2;

                    if (dist < minDist) {
                        // Collision detected!
                        // Calculate angle/normal
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // Rotate velocities
                        const vx1 = c1.vx * cos + c1.vy * sin;
                        const vy1 = c1.vy * cos - c1.vx * sin;
                        const vx2 = c2.vx * cos + c2.vy * sin;
                        const vy2 = c2.vy * cos - c2.vx * sin;

                        // Swap velocities (elastic collision of equal mass)
                        const vx1Final = vx2;
                        const vx2Final = vx1;

                        // Rotate back
                        c1.vx = vx1Final * cos - vy1 * sin;
                        c1.vy = vy1 * cos + vx1Final * sin;
                        c2.vx = vx2Final * cos - vy2 * sin;
                        c2.vy = vy2 * cos + vx2Final * sin;

                        // Separate to prevent sticking
                        const overlap = minDist - dist;
                        const separationX = (overlap / 2) * Math.cos(angle);
                        const separationY = (overlap / 2) * Math.sin(angle);

                        c1.x -= separationX;
                        c1.y -= separationY;
                        c2.x += separationX;
                        c2.y += separationY;
                    }
                }
            }

            setCoinsState([...coins]); // Trigger re-render
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
            {coinsState.map((coin) => (
                <div
                    key={`chaos-${coin.id}`}
                    className="absolute rounded-full shadow-2xl z-10"
                    style={{
                        width: COIN_SIZE,
                        height: COIN_SIZE,
                        left: coin.x,
                        top: coin.y,
                        transform: 'translate(-50%, -50%)', // Centering based on x,y
                    }}
                >
                    <img src={coin.src} alt={coin.name} className="w-full h-full object-cover rounded-full" />
                </div>
            ))}
        </div>
    );
};

import { Anchor, Shield, Activity, Layers, Users, CheckCircle2 } from "lucide-react";

// ... imports remain the same ...

interface ManifestoVisualProps {
    totalLiquidity: string;
    floorPrice: string;
    distributedDividends: string;
    activeFactionsCount: number;
}

export const ManifestoVisual = ({
    totalLiquidity,
    floorPrice,
    distributedDividends,
    activeFactionsCount
}: ManifestoVisualProps) => {
    return (
        <div className="w-full relative bg-black flex flex-col overflow-x-hidden">

            {/* SECTION 1: The Split (h-screen) */}
            <div className="relative w-full h-[100vh] flex z-10">
                {/* Left Side: The Unification (Black Background) */}
                <div className="w-1/2 h-full relative overflow-hidden bg-black flex items-center justify-center">
                    {/* Manifesto Text - Left */}
                    <div className="absolute top-4 left-0 w-full text-center z-30 px-12 pointer-events-none">
                        <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                            Liquidity pooled. Power compounded.
                        </h2>
                        <p className="text-white/70 font-mono text-lg max-w-xl mx-auto leading-relaxed">
                            Independent assets become a single, liquid network.<br />Stronger together than alone.
                        </p>
                    </div>

                    {/* Background Stars */}
                    <div className="absolute inset-0 opacity-50">
                        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                            <StarField />
                            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                        </Canvas>
                    </div>

                    {/* Unification Graph */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        {/* Central PRG Node */}
                        <div className="relative z-20 w-32 h-32 rounded-full border-4 border-white bg-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.5)]">
                            <span className="text-4xl font-black text-white tracking-widest">PRG</span>
                        </div>

                        {/* Organized Branches */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {COINS.map((coin, index) => {
                                const angle = (index / COINS.length) * 2 * Math.PI;
                                const radius = 180;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;

                                return (
                                    <div key={`branch-${coin.id}`} className="absolute flex items-center justify-center" style={{ transform: `translate(${x}px, ${y}px)` }}>
                                        {/* Node */}
                                        <div className="w-20 h-20 rounded-full bg-black border border-white/20 p-1 overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                            <img src={coin.src} alt={coin.name} className="w-full h-full object-cover rounded-full transition-all duration-300" />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Connecting Lines */}
                            {COINS.map((coin, index) => {
                                const angle = (index / COINS.length) * 2 * Math.PI;
                                const radius = 180;
                                return (
                                    <div
                                        key={`line-${coin.id}`}
                                        className="absolute top-1/2 left-1/2 h-[1px] bg-gradient-to-r from-white to-transparent opacity-30 origin-left"
                                        style={{
                                            width: `${radius}px`,
                                            transform: `rotate(${angle}rad)`,
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side: The Chaos (White Background) */}
                <div className="w-1/2 h-full relative overflow-hidden bg-white text-black">
                    {/* Manifesto Text - Right */}
                    <div className="absolute top-4 left-0 w-full text-center z-30 px-12 pointer-events-none">
                        <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-widest">
                            Isolated liquidity. Competing narratives.
                        </h2>
                        <p className="text-black/70 font-mono text-lg max-w-xl mx-auto leading-relaxed">
                            Thousands of assets, each fighting alone for attention, volume, and survival.
                        </p>
                    </div>
                    <ChaosField />
                </div>

                {/* The Black Hole (Center) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] z-50 pointer-events-none flex items-center justify-center">
                    <img
                        src="/blackhole-clean.png"
                        alt="Black Hole"
                        className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                    />
                </div>
            </div>

            {/* SECTION 2: The Silo Problem */}
            <div className="w-full min-h-screen bg-black z-20 flex flex-col items-center justify-center py-32 px-8 relative">
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">

                    {/* Text Column */}
                    <div className="space-y-16">
                        {/* Part 1: Problem */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase border-l-2 border-gray-500 pl-3">
                                The Silo Problem
                            </h3>

                            <h2 className="text-5xl md:text-6xl font-light text-white leading-tight">
                                Today, crypto is a sea of <span className="italic font-serif text-gray-400">isolated islands</span>.
                            </h2>

                            <p className="text-2xl text-gray-500 font-light leading-relaxed">
                                Most are beautiful. Some are crowded. Most are slowly sinking.
                            </p>

                            <p className="text-3xl md:text-4xl text-white leading-snug">
                                When you buy a token, you aren't just investing in an idea; you are <span className="font-bold">locking your value into a silo</span>.
                            </p>
                        </div>

                        {/* Part 2: Solution */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase border-l-2 border-white pl-3">
                                The Solution
                            </h3>

                            <p className="text-lg text-gray-300 leading-relaxed font-mono">
                                The Purge is the United Nations of Value. A mathematical black hole designed to absorb scattered liquidity and ignite it into a single superpower.
                            </p>

                            <p className="text-lg text-gray-300 leading-relaxed font-mono">
                                We aren't here to destroy your culture. We are here to give it a fleet.
                            </p>
                        </div>
                    </div>

                    {/* Graphic/Card Column */}
                    <div className="flex justify-center lg:justify-end h-full items-center">
                        <div className="border border-white/20 bg-white/5 p-12 rounded-3xl backdrop-blur-sm max-w-md w-full">
                            <div className="flex flex-col items-center text-center space-y-8">
                                <Anchor className="w-24 h-24 text-white opacity-80" strokeWidth={1.5} />

                                <div className="space-y-2">
                                    <h4 className="text-sm font-mono text-gray-500 tracking-[0.3em] uppercase">
                                        Unification Principle
                                    </h4>
                                    <p className="text-3xl font-serif italic text-white">
                                        "Unity is a Force Multiplier."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 3: The Mechanics */}
            <div className="w-full min-h-screen bg-black z-20 flex flex-col items-center justify-center py-32 px-8 relative border-t border-white/5">
                <div className="max-w-7xl w-full">
                    {/* Header */}
                    <h3 className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase border-l-2 border-gray-500 pl-3 mb-16">
                        The Mechanics
                    </h3>

                    {/* Grid of Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
                        {/* Card 1: Iron Floor */}
                        <div className="bg-[#050505] border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all group">
                            <Shield className="w-12 h-12 text-white/50 mb-8 stroke-[1px] group-hover:text-white transition-colors" />
                            <h3 className="text-xl font-bold text-white mb-4 tracking-wide uppercase">The Iron Floor</h3>
                            <p className="text-gray-500 font-mono text-sm leading-relaxed">
                                A percentage of every merger is locked in Protocol Owned Liquidity. The floor price mathematically rises with every citizen.
                            </p>
                        </div>

                        {/* Card 2: Bonding Dynamics */}
                        <div className="bg-[#050505] border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all group">
                            <Activity className="w-12 h-12 text-white/50 mb-8 stroke-[1px] group-hover:text-white transition-colors" />
                            <h3 className="text-xl font-bold text-white mb-4 tracking-wide uppercase">Bonding Dynamics</h3>
                            <p className="text-gray-500 font-mono text-sm leading-relaxed">
                                Minting is relative to current reserve-to-supply ratio. Early adopters are rewarded; latecomers are secured.
                            </p>
                        </div>

                        {/* Card 3: Omnichain Fabric */}
                        <div className="bg-[#050505] border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all group">
                            <Layers className="w-12 h-12 text-white/50 mb-8 stroke-[1px] group-hover:text-white transition-colors" />
                            <h3 className="text-xl font-bold text-white mb-4 tracking-wide uppercase">Omnichain Fabric</h3>
                            <p className="text-gray-500 font-mono text-sm leading-relaxed">
                                One global supply across Base, Solana, and beyond. Zero fragmentation. Zero slippage between empires.
                            </p>
                        </div>

                        {/* Card 4: Community Driven (New) */}
                        <div className="bg-[#050505] border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all group">
                            <Users className="w-12 h-12 text-white/50 mb-8 stroke-[1px] group-hover:text-white transition-colors" />
                            <h3 className="text-xl font-bold text-white mb-4 tracking-wide uppercase">Community Driven</h3>
                            <p className="text-gray-500 font-mono text-sm leading-relaxed">
                                DAO voting on key decisions about the PRG token.
                            </p>
                        </div>
                    </div>

                    {/* Key Metrics Graphic */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-16 border-t border-white/10">
                        <div className="text-center md:text-left">
                            <div className="text-[10px] md:text-xs font-mono text-gray-500 tracking-[0.2em] mb-4 uppercase">Total Value Liberated</div>
                            <div className="text-3xl md:text-5xl font-light text-white">{totalLiquidity}</div>
                        </div>
                        <div className="text-center md:text-left">
                            <div className="text-[10px] md:text-xs font-mono text-gray-500 tracking-[0.2em] mb-4 uppercase">The Floor Price</div>
                            <div className="text-3xl md:text-5xl font-light text-white">{floorPrice}</div>
                        </div>
                        <div className="text-center md:text-left">
                            <div className="text-[10px] md:text-xs font-mono text-gray-500 tracking-[0.2em] mb-4 uppercase">Distributed Dividends</div>
                            <div className="text-3xl md:text-5xl font-light text-white">{distributedDividends}</div>
                        </div>
                        <div className="text-center md:text-left">
                            <div className="text-[10px] md:text-xs font-mono text-gray-500 tracking-[0.2em] mb-4 uppercase">Active Factions</div>
                            <div className="text-3xl md:text-5xl font-light text-white">{activeFactionsCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 4: The Purge Portal */}
            <div className="w-full min-h-screen bg-[#030303] z-20 flex flex-col items-center justify-center py-32 px-8 relative border-t border-white/5">
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

                    {/* Text Side */}
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-6xl md:text-8xl font-black text-white leading-none uppercase tracking-tighter">
                                The<br />
                                Purge<br />
                                Portal.
                            </h2>
                            <p className="text-xl text-gray-500 font-light leading-relaxed max-w-lg">
                                The interface of inevitable unification. Select your old world, bridge the value, and claim your stake in the global empire.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                "Instant Liquidation Engine",
                                "Dynamic Bonding Curve Minting",
                                "Cross-Chain Value Capture",
                                "Automatic Reflection Distribution"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <CheckCircle2 className="w-6 h-6 text-white/30 group-hover:text-white transition-colors" />
                                    <span className="text-sm font-mono text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Graphic Side - Mock Terminal */}
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-white/5 blur-3xl -z-10 rounded-full opacity-20" />

                        <div className="bg-[#080808] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden">
                            {/* Terminal Header */}
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">Purge Portal V1.0</span>
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                </div>
                            </div>

                            {/* Asset Selection Mock */}
                            <div className="mb-8">
                                <label className="text-[10px] font-mono text-gray-500 uppercase mb-2 block tracking-wider">Asset to Liquidate</label>
                                <div className="bg-[#111] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-900/50 flex items-center justify-center">
                                            <img src="https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg" className="w-4 h-4 rounded-full opacity-70" alt="Pepe" />
                                        </div>
                                        <span className="font-bold text-white tracking-wide">PEPE</span>
                                    </div>
                                    <div className="text-white/20 text-xs">▼</div>
                                </div>
                            </div>

                            {/* Amount Display */}
                            <div className="text-center py-8">
                                <div className="text-5xl font-light text-white tracking-tight mb-2">1,000,000</div>
                                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Est. Market Value: $8,421.00</div>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-white/5 mb-8" />

                            {/* Stats */}
                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-mono">Unity Bonus</span>
                                    <span className="text-green-400 font-mono">+2.5%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-mono">Unification Tax</span>
                                    <span className="text-gray-300 font-mono">6.0%</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Receive $PRG</span>
                                    <span className="text-2xl font-bold text-white tracking-wide">1,245.92</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button className="w-full bg-white/10 hover:bg-white hover:text-black border border-white/10 text-white font-black py-4 rounded-xl uppercase tracking-[0.2em] text-sm transition-all duration-300">
                                Execute Unification
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 5: Reflections */}
            <div className="w-full min-h-[50vh] bg-black z-20 flex flex-col items-center justify-center py-32 px-8 relative border-t border-white/5">
                <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-3 gap-12">

                    {/* Quote 1 */}
                    <div className="text-left space-y-6 p-8 border-l border-white/10">
                        <p className="text-lg text-gray-400 font-light leading-relaxed">
                            "Crypto doesn’t need more tokens. It needs clarity. Purge takes thousands of scattered ideas and turns them into one simple, powerful standard, a place where <span className="text-white">value finally works together</span> instead of competing with itself."
                        </p>
                    </div>

                    {/* Quote 2 */}
                    <div className="text-left space-y-6 p-8 border-l border-white/10">
                        <p className="text-lg text-gray-400 font-light leading-relaxed">
                            "The market has been hallucinating individuality; Purge is the moment it realizes <span className="text-white">coherence is more powerful than novelty</span>, and unity more numinous than chaos."
                        </p>
                    </div>

                    {/* Quote 3 */}
                    <div className="text-left space-y-6 p-8 border-l border-white/10">
                        <p className="text-lg text-gray-400 font-light leading-relaxed">
                            "Every time you buy an isolated memecoin, you are playing a <span className="text-red-500 font-mono text-xs tracking-wider uppercase align-middle mx-1 border border-red-500/30 px-1.5 py-0.5 rounded bg-red-900/10">Suboptimal Move</span>. You are fragmenting your strength. The Purge is the Liquidity Sink. It is a mathematical black hole. It does not negotiate with suboptimal coins. <span className="text-white font-bold">It absorbs them.</span>"
                        </p>
                    </div>

                </div>
            </div>

        </div>
    );
};
