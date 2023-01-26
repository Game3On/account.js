// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../oracle/IOracle.sol";

contract USDToken is ERC20, IOracle {
    constructor(uint256 initialSupply) ERC20("USDToken", "USD") {
        _mint(msg.sender, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }

    function getTokenValueOfEth(uint256 ethOutput) external pure returns (uint256 tokenInput) {
        return ethOutput / (10 ** 8);
    }
}