// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./IOracle.sol";

contract FixedOracle is IOracle {

    /**
     * return amount of tokens that are required to receive that much eth.
     */
    function getTokenValueOfEth(uint256 ethOutput) external pure returns (uint256 tokenInput) {
        return ethOutput * 100;
    }
}

