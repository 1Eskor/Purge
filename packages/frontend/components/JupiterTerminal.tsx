"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        Jupiter: any;
    }
}

export function JupiterTerminal() {
    useEffect(() => {
        // Load script
        const script = document.createElement("script");
        script.src = "https://terminal.jup.ag/main-v2.js";
        script.async = true;

        script.onload = () => {
            if (window.Jupiter) {
                window.Jupiter.init({
                    displayMode: "integrated",
                    integratedTargetId: "integrated-terminal",
                    endpoint: "https://api.mainnet-beta.solana.com",
                    formProps: {
                        fixedOutputMint: true,
                        initialOutputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                    }
                });
            }
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, []);

    return (
        <div className="w-full max-w-md h-[400px] bg-black/50 rounded-2xl overflow-hidden border border-white/10" id="integrated-terminal">
            {/* Jupiter will render here */}
        </div>
    );
}
