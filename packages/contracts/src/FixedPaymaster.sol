// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './core/EntryPoint.sol';
import './core/BasePaymaster.sol';

/**
 * Paymaster that accepts WETH tokens as payment.
 * The paymaster must be approved to transfer tokens from the user wallet.
 */
contract TokenPaymaster is BasePaymaster {
  //calculated cost of the postOp
  uint256 constant COST_OF_POST = 15000;

  using UserOperationLib for UserOperation;
  mapping(bytes32 => bool) public KnownWallets;
  IERC20 public Token;
  uint256 public fixedFee;

  constructor(
    EntryPoint _entryPoint,
    address _owner,
    IERC20 _Token,
    uint256 _fixedFee
  ) BasePaymaster(_entryPoint, _owner) {
    Token = _Token;
    fixedFee = _fixedFee;
  }

  // function addWallet(bytes32 walletCodeHash) public onlyOwner {
  //     KnownWallets[walletCodeHash] = true;
  // }

  // function removeWallet(bytes32 walletCodeHash) public onlyOwner {
  //     delete KnownWallets[walletCodeHash];
  // }

  function withdraw(address payable to) public onlyOwner {
    uint256 balance = Token.balanceOf(address(this));
    require(balance >= 0, 'not enough balance');
    Token.transfer(to, balance);
  }

  /**
   * @dev check allowance amount and user wallet banlance
   */
  function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32, /*requestId*/
    uint256 requiredPreFund
  ) external view override returns (bytes memory context) {
    // make sure that verificationGasLimit is high enough to handle postOp
    require(
      userOp.verificationGasLimit > 45000,
      'TokenPaymaster: gas too low for postOp'
    );

    address sender = userOp.getSender();

    // if (userOp.initCode.length != 0) {
    //     _validateConstructor(userOp);
    // } else {
    require(
      Token.allowance(sender, address(this)) >= requiredPreFund,
      'TokenPaymaster: not enough allowance'
    );
    // }

    require(
      Token.balanceOf(sender) >= requiredPreFund,
      'TokenPaymaster: not enough balance'
    );

    return abi.encode(userOp.sender);
  }

  // when constructing a wallet, validate constructor code and parameters
  function _validateConstructor(UserOperation calldata userOp)
    internal
    view
    virtual
  {
    //constructor(EntryPoint anEntryPoint, address anOwner, IERC20 token, address paymaster)
    bytes32 bytecodeHash = keccak256(
      userOp.initCode[0:userOp.initCode.length - 128]
    );

    // no check on POC
    (bytecodeHash);
    // require(
    //     KnownWallets[bytecodeHash],
    //     "TokenPaymaster: unknown wallet constructor"
    // );

    // first param (of 4) should be our entryPoint
    bytes32 entryPointParam = bytes32(
      userOp.initCode[userOp.initCode.length - 128:]
    );
    require(
      address(uint160(uint256(entryPointParam))) == address(entryPoint),
      'wrong entrypoint in constructor'
    );

    //the 3rd parameter is  token
    bytes32 tokenParam = bytes32(userOp.initCode[userOp.initCode.length - 64:]);
    require(
      address(uint160(uint256(tokenParam))) == address(Token),
      'wrong token in constructor'
    );

    //the 4th parameter is this paymaster
    bytes32 paymasterParam = bytes32(
      userOp.initCode[userOp.initCode.length - 32:]
    );
    require(
      address(uint160(uint256(paymasterParam))) == address(this),
      'wrong paymaster in constructor'
    );
  }

  //actual charge of user.
  // this method will be called just after the user's TX with mode==OpSucceeded|OpReverted.
  // BUT: if the user changed its balance in a way that will cause  postOp to revert, then it gets called again, after reverting
  // the user's TX
  function _postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost
  ) internal override {
    (mode);
    address sender = abi.decode(context, (address));
    //actualGasCost is known to be no larger than the above requiredPreFund, so the transfer should succeed.
    // check if this is a new wallet, TODO
    (actualGasCost);
    bytes32 walletHash = keccak256(context);
    if (KnownWallets[walletHash] == false) {
      KnownWallets[walletHash] = true;
    }
    Token.transferFrom(sender, address(this), fixedFee);
  }
}
