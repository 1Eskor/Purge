import { useState, useEffect } from 'react';
import { Faction } from '../components/FactionLeaderboard';

// In production, this would be an API endpoint (e.g. https://api.purge.com/stats)
// that aggregates events from Solana (PurgeProgram) and Base (PurgeHub).
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export function useFactionStats(initialFactions: Faction[]) {
    const [factions, setFactions] = useState<Faction[]>(initialFactions);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLiveStats = async () => {
        if (!API_ENDPOINT) return; // Fallback to local/initial state if no API

        try {
            setIsLoading(true);
            const response = await fetch(`${API_ENDPOINT}/factions`);
            const data = await response.json();

            // Update state with live data
            // setFactions(data);
        } catch (error) {
            console.error("Failed to fetch live faction stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Poll for updates every 30 seconds
    useEffect(() => {
        fetchLiveStats();
        const interval = setInterval(fetchLiveStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Helper to parse liquidity string to number (supports $X.YM, $XK, or plain numbers)
    const parseLiquidity = (liq: string): number => {
        const clean = liq.replace(/[^0-9.MK]/g, '');
        if (clean.endsWith('M')) return parseFloat(clean) * 1_000_000;
        if (clean.endsWith('K')) return parseFloat(clean) * 1_000;
        return parseFloat(clean) || 0;
    };

    // Helper to format liquidity back to string
    const formatLiquidity = (val: number): string => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
        return `$${val.toFixed(2)}`;
    };

    // Recalculate ranks and statuses based on relative liquidity
    const recalculateFactions = (currentFactions: Faction[]) => {
        if (currentFactions.length === 0) return currentFactions;

        const withValues = currentFactions.map(f => ({
            ...f,
            rawValue: parseLiquidity(f.liquidity)
        }));

        const maxVal = Math.max(...withValues.map(f => f.rawValue));
        const minVal = Math.min(...withValues.map(f => f.rawValue));
        const range = maxVal - minVal;

        // Sort by liquidity descending
        withValues.sort((a, b) => b.rawValue - a.rawValue);

        // Calculate total liquidity (proxy for PRG supply here)
        const totalLiquidity = withValues.reduce((sum, f) => sum + f.rawValue, 0);

        return withValues.map((f, index) => {
            // Calculate Tier based on linear interpolation in range
            // Tier 1 (Lowest) -> Tier 5 (Highest)
            let tier = 1;
            if (range > 0) {
                const normalized = (f.rawValue - minVal) / range; // 0.0 to 1.0
                tier = Math.floor(normalized * 5) + 1; // 1 to 6
                if (tier > 5) tier = 5; // Clamp max (maxVal hits this)
            } else {
                // If all equal (range 0), default to Apex if > 0, else Sovereign
                tier = f.rawValue > 0 ? 5 : 1;
            }

            let status = "Sovereign Entity";
            if (tier === 5) status = "Apex Hegemon";
            else if (tier === 4) status = "Global Superpower";
            else if (tier === 3) status = "Continental Hegemon";
            else if (tier === 2) status = "Regional Power";

            // Weight is simply % of Total Supply
            const weight = totalLiquidity > 0 ? (f.rawValue / totalLiquidity) * 100 : 0;

            return {
                ...f,
                status,
                weight: parseFloat(weight.toFixed(1)), // Keep 1 decimal place
                rank: (index + 1).toString().padStart(2, '0'),
                liquidity: formatLiquidity(f.rawValue) // standardize format
            };
        });
    };

    // Wrapper for setFactions that always recalculates ranks
    const updateFactions = (updater: Faction[] | ((prev: Faction[]) => Faction[])) => {
        setFactions(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return recalculateFactions(next);
        });
    };

    // Initial calculation on mount
    useEffect(() => {
        setFactions(prev => recalculateFactions(prev));
    }, []);

    return {
        factions,
        setFactions: updateFactions, // Expose wrapped setter
        isLoading
    };
}
