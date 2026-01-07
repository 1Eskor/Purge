// ABIs for Purge Protocol contracts

export const PURGE_HUB_ABI = [
    // Read functions
    "function purgeToken() view returns (address)",
    "function treasury() view returns (address)",
    "function lpWallet() view returns (address)",
    "function TAX_BP_LP() view returns (uint256)",
    "function TAX_BP_REFLECT() view returns (uint256)",
    "function TAX_BP_TREASURY() view returns (uint256)",
    "function TAX_BP_BURN() view returns (uint256)",
    "function allowedSpokeEids(uint32) view returns (bool)",
    // Events
    "event PurgeProcessed(address indexed user, uint32 indexed srcEid, uint256 totalAmount, uint256 userAmount)",
    "event TaxDistributed(uint256 lp, uint256 reflect, uint256 treasury, uint256 burn)",
] as const;

export const PURGE_SPOKE_ABI = [
    // Read functions
    "function router() view returns (address)",
    "function usdc() view returns (address)",
    "function hubEid() view returns (uint32)",
    "function quotePurge(address user, uint256 usdcAmount) view returns (uint256 nativeFee)",
    // Write functions
    "function purge(address token, uint256 amount, bytes swapData, uint256 minUsdcOut) payable",
    // Events
    "event PurgeInitiated(address indexed user, address indexed token, uint256 tokenAmount, uint256 usdcReceived, bytes32 guid)",
] as const;

export const PURGE_TOKEN_ABI = [
    // ERC20 Standard
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    // OFT
    "function owner() view returns (address)",
    // Events
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
] as const;
