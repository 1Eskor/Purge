// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OAppSender} from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import {OAppCore} from "@layerzerolabs/oapp-evm/contracts/oapp/OAppCore.sol";
import {MessagingFee, MessagingReceipt} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PurgeSpoke
 * @dev Spoke contract deployed on each supported chain. Handles token purging
 *      and sends cross-chain messages to the Hub on Base.
 * @notice Inherits OAppSender to send LayerZero messages to the Hub.
 */
contract PurgeSpoke is OAppSender, Pausable {
    using SafeERC20 for IERC20;
    using OptionsBuilder for bytes;

    address public router; // DEX aggregator (1inch, etc.)
    address public usdc;   // USDC on this chain
    uint32 public hubEid;  // LayerZero endpoint ID of the Hub chain (Base)

    // Gas limit for execution on Hub
    uint128 public constant HUB_GAS_LIMIT = 200_000;
    
    // Maximum allowed slippage (10% = 1000 BPS)
    uint256 public constant MAX_SLIPPAGE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    event PurgeInitiated(
        address indexed user, 
        address indexed token, 
        uint256 tokenAmount, 
        uint256 usdcReceived,
        bytes32 guid
    );
    event SwapExecuted(
        address indexed srcToken,
        uint256 srcAmount,
        uint256 usdcReceived
    );
    event RouterUpdated(address indexed newRouter);
    event HubEidUpdated(uint32 indexed newHubEid);

    constructor(
        address _lzEndpoint,
        address _delegate,
        address _router, 
        address _usdc,
        uint32 _hubEid
    ) OAppCore(_lzEndpoint, _delegate) Ownable(_delegate) {
        router = _router;
        usdc = _usdc;
        hubEid = _hubEid;
    }

    /**
     * @notice Update the DEX router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        router = _router;
        emit RouterUpdated(_router);
    }

    /**
     * @notice Update the Hub chain endpoint ID
     */
    function setHubEid(uint32 _hubEid) external onlyOwner {
        hubEid = _hubEid;
        emit HubEidUpdated(_hubEid);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get the LayerZero fee for a purge operation
     * @param _user The user who will receive $PRG
     * @param _usdcAmount The USDC amount being purged (for quote calculation)
     */
    function quotePurge(address _user, uint256 _usdcAmount) external view returns (uint256 nativeFee) {
        bytes memory message = abi.encode(_user, _usdcAmount);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(HUB_GAS_LIMIT, 0);
        
        MessagingFee memory fee = _quote(hubEid, message, options, false);
        return fee.nativeFee;
    }

    /**
     * @notice Purge a token - swap to USDC and send message to Hub
     * @param _token The victim token to purge
     * @param _amount Amount of victim token
     * @param _swapData Encoded swap data for the DEX aggregator
     * @param _minUsdcOut Minimum USDC to receive (slippage protection)
     * @param _expectedUsdcOut Expected USDC output (for max slippage validation)
     */
    function purge(
        address _token,
        uint256 _amount,
        bytes calldata _swapData,
        uint256 _minUsdcOut,
        uint256 _expectedUsdcOut
    ) external payable whenNotPaused {
        // Validate slippage is within acceptable range
        uint256 minAcceptable = _expectedUsdcOut * (BPS_DENOMINATOR - MAX_SLIPPAGE_BPS) / BPS_DENOMINATOR;
        require(_minUsdcOut >= minAcceptable, "Slippage tolerance too high");

        // 1. Transfer victim token from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // 2. Approve router to spend tokens
        IERC20(_token).forceApprove(router, _amount);

        // 3. Capture starting USDC balance
        uint256 startBalance = IERC20(usdc).balanceOf(address(this));

        // 4. Execute swap via DEX aggregator
        (bool success, ) = router.call(_swapData);
        require(success, "Swap failed");

        // 5. Calculate USDC received
        uint256 endBalance = IERC20(usdc).balanceOf(address(this));
        uint256 usdcReceived = endBalance - startBalance;
        require(usdcReceived >= _minUsdcOut, "Slippage exceeded");

        emit SwapExecuted(_token, _amount, usdcReceived);

        // 6. Send cross-chain message to Hub
        bytes32 guid = _sendPurgeMessage(msg.sender, usdcReceived);

        emit PurgeInitiated(msg.sender, _token, _amount, usdcReceived, guid);
    }

    /**
     * @dev Internal function to send the purge message to the Hub
     */
    function _sendPurgeMessage(address _user, uint256 _usdcAmount) internal returns (bytes32) {
        // Encode the payload
        bytes memory message = abi.encode(_user, _usdcAmount);
        
        // Build options with gas limit for Hub execution
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(HUB_GAS_LIMIT, 0);
        
        // Calculate the fee
        MessagingFee memory fee = _quote(hubEid, message, options, false);
        
        // Send the message
        MessagingReceipt memory receipt = _lzSend(
            hubEid,
            message,
            options,
            fee,
            payable(msg.sender) // Refund excess to user
        );

        return receipt.guid;
    }

    /**
     * @notice Allow excess native tokens to be rescued
     */
    function rescueNative(address payable _to) external onlyOwner {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Allow stuck tokens to be rescued
     */
    function rescueToken(address _token, address _to, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(_to, _amount);
    }

    /**
     * @notice Override _payNative to allow excess ETH
     * @dev Users may send more ETH than needed; excess is refunded by LZ endpoint
     */
    function _payNative(uint256 _nativeFee) internal override returns (uint256) {
        require(msg.value >= _nativeFee, "Insufficient native fee");
        return _nativeFee;
    }

    /**
     * @notice Required override for OAppSender
     */
    function oAppVersion() public pure override returns (uint64 senderVersion, uint64 receiverVersion) {
        return (1, 0); // Send-only OApp
    }

    receive() external payable {}
}
