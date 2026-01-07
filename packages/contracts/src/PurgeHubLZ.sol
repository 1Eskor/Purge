// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import "./PurgeHub.sol";

/**
 * @title PurgeHubLZ
 * @notice LayerZero OApp adapter for PurgeHub
 * @dev Receives cross-chain messages via LayerZero and forwards them to PurgeHub
 */
contract PurgeHubLZ is OApp, OAppOptionsType3 {
    
    // The core PurgeHub contract
    PurgeHub public immutable purgeHub;
    
    // Mapping of remote chain IDs (LayerZero EIDs) to PurgeHub chain IDs
    // LZ EID (e.g. 40168) -> PurgeHub valid ID
    mapping(uint32 => uint32) public eidToChainId;
    
    event MessageReceived(uint32 srcEid, bytes32 sender, uint64 nonce, bytes message);
    
    constructor(
        address _endpoint, 
        address _owner,
        address _purgeHub
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        purgeHub = PurgeHub(_purgeHub);
        
        // Default mapping for Solana Devnet (EID 40168)
        eidToChainId[40168] = 40168; // Map to itself or whatever ID PurgeHub uses
    }
    
    /**
     * @dev Called when data is received from the protocol.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Decode the payload
        // Expected payload: abi.encode(recipient, usdcAmount, originalNonce)
        // Or if coming from Solana, it might be raw bytes. 
        // For now let's assume standard ABI encoding compatible with manual compose.
        
        // Decode payload
        (address recipient, uint256 usdcAmount) = abi.decode(_message, (address, uint256));
        
        uint32 srcChainId = eidToChainId[_origin.srcEid];
        // If not mapped, default to using the EID
        if (srcChainId == 0) srcChainId = _origin.srcEid;
        
        // Forward to PurgeHub
        // Use LZ nonce as the unique identifier
        purgeHub.receivePurge(
            srcChainId,
            _origin.sender,
            recipient,
            usdcAmount,
            _origin.nonce
        );
        
        emit MessageReceived(_origin.srcEid, _origin.sender, _origin.nonce, _message);
    }
    
    /**
     * @dev Set mapping from LZ EID to internal Chain ID
     */
    function setEidMapping(uint32 eid, uint32 chainId) external onlyOwner {
        eidToChainId[eid] = chainId;
    }
}
