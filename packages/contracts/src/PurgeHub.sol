// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PRGToken.sol";

/**
 * @title PurgeHub
 * @notice The central hub on Base that receives cross-chain purge messages and mints PRG tokens
 * @dev In production, this would integrate with LayerZero's OApp for cross-chain messaging
 */
contract PurgeHub is Ownable, ReentrancyGuard {
    // ============ State Variables ============
    
    /// @notice The PRG token contract
    PRGToken public prgToken;
    
    /// @notice Authorized relayers (in production, this would be LayerZero endpoint)
    mapping(address => bool) public authorizedRelayers;
    
    /// @notice Nonce tracking per source chain to prevent replay attacks
    mapping(uint32 => mapping(uint64 => bool)) public processedNonces;
    
    /// @notice Total USDC value purged (in 6 decimals)
    uint256 public totalPurgedValue;
    
    /// @notice PRG tokens minted per USDC (with 12 decimal precision for math)
    /// @dev 0.9 PRG per USDC = 900000000000 (0.9 * 1e12)
    uint256 public constant PRG_PER_USDC = 900000000000; // 0.9 with 12 decimals
    
    /// @notice Treasury address for the 10% fee
    address public treasury;
    
    /// @notice Mapping of supported source chain IDs (LayerZero endpoint IDs)
    mapping(uint32 => bool) public supportedChains;
    
    /// @notice Mapping of trusted peer addresses per chain
    mapping(uint32 => bytes32) public trustedPeers;
    
    // ============ Events ============
    
    event PurgeReceived(
        uint32 indexed srcChainId,
        bytes32 indexed srcAddress,
        address indexed recipient,
        uint256 usdcAmount,
        uint256 prgMinted,
        uint64 nonce
    );
    
    event RelayerUpdated(address indexed relayer, bool authorized);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ChainSupported(uint32 indexed chainId, bool supported);
    event PeerTrusted(uint32 indexed chainId, bytes32 peerAddress);
    
    // ============ Constructor ============
    
    constructor(address _prgToken, address _treasury) Ownable(msg.sender) {
        prgToken = PRGToken(_prgToken);
        treasury = _treasury;
        
        // Support Solana Devnet by default (LayerZero Solana EID)
        supportedChains[40168] = true; // Solana Devnet EID
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set a relayer's authorization status
     */
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerUpdated(relayer, authorized);
    }
    
    /**
     * @notice Update the treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @notice Set whether a chain is supported
     */
    function setSupportedChain(uint32 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupported(chainId, supported);
    }
    
    /**
     * @notice Set the trusted peer address for a chain
     */
    function setTrustedPeer(uint32 chainId, bytes32 peerAddress) external onlyOwner {
        trustedPeers[chainId] = peerAddress;
        emit PeerTrusted(chainId, peerAddress);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Process a purge from a remote chain
     * @dev In production, this would be called by LayerZero's endpoint
     * @param srcChainId The source chain's LayerZero endpoint ID
     * @param srcAddress The source program/contract address (32 bytes for Solana)
     * @param recipient The user's address on Base (derived from Solana address or provided)
     * @param usdcAmount The amount of USDC purged (6 decimals)
     * @param nonce The unique nonce for this purge
     */
    function receivePurge(
        uint32 srcChainId,
        bytes32 srcAddress,
        address recipient,
        uint256 usdcAmount,
        uint64 nonce
    ) external nonReentrant {
        // Verify caller is authorized (LayerZero endpoint or trusted relayer)
        require(authorizedRelayers[msg.sender], "PurgeHub: Unauthorized relayer");
        
        // Verify source chain is supported
        require(supportedChains[srcChainId], "PurgeHub: Unsupported source chain");
        
        // Verify source address is trusted peer
        require(trustedPeers[srcChainId] == srcAddress, "PurgeHub: Untrusted peer");
        
        // Prevent replay attacks
        require(!processedNonces[srcChainId][nonce], "PurgeHub: Nonce already processed");
        processedNonces[srcChainId][nonce] = true;
        
        // Calculate PRG to mint (0.9 PRG per USDC)
        // usdcAmount is 6 decimals, PRG is 18 decimals
        // PRG = usdcAmount * 0.9 * 10^12 (to convert 6 decimals to 18)
        uint256 prgAmount = (usdcAmount * PRG_PER_USDC) / 1e6;
        
        // Mint PRG to recipient
        prgToken.mint(recipient, prgAmount);
        
        // Update stats
        totalPurgedValue += usdcAmount;
        
        emit PurgeReceived(srcChainId, srcAddress, recipient, usdcAmount, prgAmount, nonce);
    }
    
    /**
     * @notice Simulate a purge for testing (owner only)
     * @dev This bypasses the relayer check for testing on testnets
     */
    function simulatePurge(
        address recipient,
        uint256 usdcAmount
    ) external onlyOwner {
        // Calculate PRG to mint
        uint256 prgAmount = (usdcAmount * PRG_PER_USDC) / 1e6;
        
        // Mint PRG to recipient
        prgToken.mint(recipient, prgAmount);
        
        // Update stats
        totalPurgedValue += usdcAmount;
        
        emit PurgeReceived(0, bytes32(0), recipient, usdcAmount, prgAmount, 0);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Calculate how much PRG would be minted for a given USDC amount
     */
    function calculatePrgAmount(uint256 usdcAmount) external pure returns (uint256) {
        return (usdcAmount * PRG_PER_USDC) / 1e6;
    }
    
    /**
     * @notice Check if a nonce has been processed
     */
    function isNonceProcessed(uint32 chainId, uint64 nonce) external view returns (bool) {
        return processedNonces[chainId][nonce];
    }
}
