// Contract addresses for different networks
export const CONTRACTS = {
    // Local Hardhat Network
    localhost: {
        chainId: 31337,
        rpcUrl: "http://127.0.0.1:8545",
        purgeToken: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
        purgeHub: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
        purgeSpoke: "0x9A676e781A523b5d0C0e43731313A708CB607508",
        usdc: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
        router: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
        lzEndpoint: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    },
    // Base Sepolia Testnet (to be filled after testnet deployment)
    baseSepolia: {
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        purgeToken: "0xE4De7083042079040D9B180dCC8227b944209b42",
        purgeHub: "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC",
        lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LZ Base Sepolia
    },
    // Ethereum Sepolia Testnet
    ethereumSepolia: {
        chainId: 11155111,
        rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
        purgeSpoke: "",
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle USDC Sepolia
        router: "", // 1inch router
        lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LZ Sepolia
    },
    // Base Mainnet
    base: {
        chainId: 8453,
        rpcUrl: "https://mainnet.base.org",
        purgeToken: "",
        purgeHub: "",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // LZ Base Mainnet
    },
} as const;

// LayerZero Endpoint IDs
export const LZ_EIDS = {
    ethereum: 30101,
    base: 30184,
    arbitrum: 30110,
    optimism: 30111,
    polygon: 30109,
    bnb: 30102,
    solana: 30168,
    avalanche: 30106,
} as const;

// Current active network
export const ACTIVE_NETWORK = "baseSepolia";

export function getContracts() {
    return CONTRACTS[ACTIVE_NETWORK];
}
