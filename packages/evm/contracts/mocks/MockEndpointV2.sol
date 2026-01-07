// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEndpointV2
 * @dev A minimal mock of the LayerZero EndpointV2 for local testing.
 * This allows OFT/OApp contracts to be deployed without real LZ infra.
 */
contract MockEndpointV2 {
    mapping(address => address) public delegates;

    function setDelegate(address _delegate) external {
        delegates[msg.sender] = _delegate;
    }

    function quote(
        uint32, /* _dstEid */
        bytes calldata, /* _message */
        bytes calldata, /* _options */
        bool /* _payInLzToken */
    ) external pure returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (0, 0);
    }

    function send(
        uint32, /* _dstEid */
        bytes calldata, /* _message */
        bytes calldata, /* _options */
        address payable, /* _refundAddress */
        bytes calldata /* _composeMsg */
    ) external payable returns (bytes32 guid) {
        return bytes32(0);
    }
}
