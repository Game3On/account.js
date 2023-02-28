// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./IOracle.sol";

// for some not 18 decimal tokens
contract DecimalOracle is IOracle {

    uint256 public decimal;
    constructor(uint256 _decimal) {
        decimal = _decimal;
    }
    
    /**
     * return amount of tokens that are required to receive that much eth.
     */
    function getTokenValueOfEth(uint256 ethOutput) external view returns (uint256 tokenInput) {
        return ethOutput * (10 ** decimal) / (10 ** 18);
    }
}

