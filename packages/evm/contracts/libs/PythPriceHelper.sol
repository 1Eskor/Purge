// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title PythPriceHelper
 * @dev Helper contract to fetch token prices from Pyth Network oracles.
 *      Uses the pull model where price updates are passed in by the caller.
 */
library PythPriceHelper {
    // Pyth contract addresses by chain
    // See: https://docs.pyth.network/price-feeds/contract-addresses
    
    // Maximum price age (seconds) - reject stale prices
    uint256 constant MAX_PRICE_AGE = 60;
    
    // Price precision for calculations
    uint256 constant PRICE_PRECISION = 1e18;

    /**
     * @dev Get the USD value of an amount of tokens
     * @param _pyth Address of Pyth contract on this chain
     * @param _priceUpdateData Price update data from Pyth API (passed by frontend)
     * @param _priceFeedId Pyth price feed ID for the token
     * @param _amount Amount of tokens (in token's native decimals)
     * @param _tokenDecimals Decimals of the token
     * @return usdValue USD value normalized to 18 decimals
     */
    function getUsdValue(
        address _pyth,
        bytes[] calldata _priceUpdateData,
        bytes32 _priceFeedId,
        uint256 _amount,
        uint8 _tokenDecimals
    ) internal returns (uint256 usdValue) {
        IPyth pyth = IPyth(_pyth);
        
        // Update price feeds (caller pays the fee via msg.value)
        uint256 updateFee = pyth.getUpdateFee(_priceUpdateData);
        pyth.updatePriceFeeds{value: updateFee}(_priceUpdateData);
        
        // Get the price with validation
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(
            _priceFeedId,
            MAX_PRICE_AGE
        );
        
        // Convert price to USD value
        // Pyth prices have a specific exponent (e.g., -8 for 8 decimal places)
        // We need to normalize to 18 decimals
        
        int64 priceValue = price.price;
        int32 expo = price.expo;
        
        // Handle negative exponent (most common case)
        // price.price is the price with expo decimal places
        // Example: price=12345678, expo=-8 means price = 0.12345678 USD
        
        if (priceValue <= 0) {
            revert("Invalid price");
        }
        
        // Calculate: (amount * price) / (10^tokenDecimals) * (10^(18 + expo))
        // Simplified: (amount * price * 10^18) / (10^tokenDecimals * 10^(-expo))
        
        uint256 positivePrice = uint256(uint64(priceValue));
        
        if (expo < 0) {
            // Most common case: expo is negative (e.g., -8)
            uint256 divisor = 10 ** uint256(int256(-expo));
            usdValue = (_amount * positivePrice * PRICE_PRECISION) / (10 ** _tokenDecimals * divisor);
        } else {
            // Rare case: expo is positive or zero
            uint256 multiplier = 10 ** uint256(int256(expo));
            usdValue = (_amount * positivePrice * multiplier * PRICE_PRECISION) / (10 ** _tokenDecimals);
        }
        
        return usdValue;
    }

    /**
     * @dev Get raw price from Pyth (view function for quoting)
     * @param _pyth Address of Pyth contract
     * @param _priceFeedId Pyth price feed ID
     * @param _maxAge Maximum age of price in seconds
     * @return price Current price
     * @return expo Price exponent
     * @return timestamp Last update timestamp
     */
    function getPrice(
        address _pyth,
        bytes32 _priceFeedId,
        uint256 _maxAge
    ) internal view returns (int64 price, int32 expo, uint256 timestamp) {
        IPyth pyth = IPyth(_pyth);
        PythStructs.Price memory priceData = pyth.getPriceNoOlderThan(_priceFeedId, _maxAge);
        return (priceData.price, priceData.expo, priceData.publishTime);
    }
}

/**
 * @title PythPriceFeedIds
 * @dev Common Pyth price feed IDs for popular tokens
 * @notice Get more IDs from: https://pyth.network/developers/price-feed-ids
 */
library PythPriceFeedIds {
    // Major tokens
    bytes32 constant ETH_USD = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant BTC_USD = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    bytes32 constant USDC_USD = 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a;
    bytes32 constant USDT_USD = 0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b;
    
    // DeFi tokens
    bytes32 constant LINK_USD = 0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221;
    bytes32 constant UNI_USD = 0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501;
    bytes32 constant AAVE_USD = 0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445;
    
    // Meme tokens (if available)
    bytes32 constant SHIB_USD = 0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a;
    bytes32 constant DOGE_USD = 0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c;
}
