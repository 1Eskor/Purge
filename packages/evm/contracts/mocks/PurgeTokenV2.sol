// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {PurgeToken} from "../PurgeToken.sol";

contract PurgeTokenV2 is PurgeToken {
    constructor(address _lzEndpoint) PurgeToken(_lzEndpoint) {}
    
    function version() public pure returns (string memory) {
        return "v2";
    }
}
