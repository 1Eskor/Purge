"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Shield, Activity, Users } from "lucide-react";

export interface Faction {
    id: string;
    rank: string;
    name: string;
    origin: string;
    liquidity: string;
    weight: number;
    status: string;
    icon: string; // URL to image
}

interface FactionLeaderboardProps {
    factions: Faction[];
}

export const FactionLeaderboard = ({ factions }: FactionLeaderboardProps) => {
    return (
        <div className="w-full max-w-5xl mx-auto p-6 md:p-10 font-sans">

            {/* Header Section */}
            <div className="mb-12 flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl md:text-5xl font-black italic tracking-tighter text-white mb-2"
                    >
                        THE COUNCIL OF FACTIONS
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm md:text-base text-gray-400 font-mono tracking-widest uppercase"
                    >
                        Real-time Unification Hierarchy
                    </motion.p>
                </div>
            </div>

            {/* Leaderboard Table / Cards */}
            <div className="space-y-4">

                {/* Table Header - Hidden on mobile, visible on desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-mono text-gray-500 tracking-widest uppercase mb-4 px-4">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Faction Identity</div>
                    <div className="col-span-3 text-right">Liquidity Liberated</div>
                    <div className="col-span-2">Gov. Weight</div>
                    <div className="col-span-2 text-right">Strategic Status</div>
                </div>

                {/* Rows */}
                {factions.map((faction, index) => (
                    <motion.div
                        key={faction.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                        className="relative group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="relative md:grid md:grid-cols-12 gap-4 items-center bg-black/40 border border-white/10 p-4 md:py-6 md:px-6 rounded-lg backdrop-blur-sm hover:border-white/30 transition-colors">

                            {/* Rank */}
                            <div className="col-span-1 flex items-center mb-4 md:mb-0">
                                <span className="text-2xl font-black italic text-white/20 group-hover:text-white/40 transition-colors">
                                    {faction.rank}
                                </span>
                            </div>

                            {/* Identity */}
                            <div className="col-span-4 flex items-center gap-4 mb-4 md:mb-0">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-1 border border-white/10 overflow-hidden shrink-0">
                                    {faction.icon ? (
                                        <img src={faction.icon} alt={faction.name} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <span className="text-xs font-bold text-white/20">{faction.name[0]}</span>
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-glow transition-all truncate">
                                        {faction.name}
                                    </h3>
                                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wider truncate">
                                        {faction.origin}
                                    </p>
                                </div>
                            </div>

                            {/* Liquidity */}
                            <div className="col-span-3 flex md:flex-col md:items-end md:text-right justify-between mb-4 md:mb-0">
                                <span className="md:hidden text-xs text-gray-500 font-mono uppercase">Liquidity</span>
                                <span className="text-xl font-bold font-mono text-green-400 tracking-tight">
                                    {faction.liquidity}
                                </span>
                            </div>

                            {/* Gov Weight */}
                            <div className="col-span-2 mb-4 md:mb-0">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-xs font-mono text-gray-400">
                                        <span className="md:hidden">Weight</span>
                                        <span>{faction.weight.toFixed(1)}% Influence</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            key={faction.weight}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(faction.weight, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-white/80"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-2 flex justify-end">
                                <span className="px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest border border-white/20 rounded-full text-white/50 bg-transparent group-hover:border-white/40 group-hover:text-white/80 transition-all duration-300 whitespace-nowrap">
                                    {faction.status}
                                </span>
                            </div>

                        </div>
                    </motion.div>
                ))}
            </div>

        </div>
    );
};
