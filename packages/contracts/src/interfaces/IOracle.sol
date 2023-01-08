// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

interface IOracle {
  function getTokenValueOfEth(uint256 ethOutput)
    external
    view
    returns (uint256 tokenInput);
}
