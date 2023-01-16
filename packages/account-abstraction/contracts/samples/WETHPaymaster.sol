// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable reason-string */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleAccount.sol";
import "../core/BasePaymaster.sol";

/**
 * paymaster that accepts WETH.
 */
contract WETHPaymaster is BasePaymaster {

    //calculated cost of the postOp
    uint256 constant public COST_OF_POST = 15000;

    address public immutable theFactory;
    IERC20 public wethToken;

    constructor(address accountFactory, IEntryPoint _entryPoint, IERC20 _wethToken) BasePaymaster(_entryPoint) {
        theFactory = accountFactory;
        wethToken = _wethToken;
    }

    /**
     * transfer paymaster ownership.
     * owner of this paymaster is allowed to withdraw funds (tokens transferred to this paymaster's balance)
     * when changing owner, the old owner's withdrawal rights are revoked.
     */
    function transferOwnership(address newOwner) public override virtual onlyOwner {
        super.transferOwnership(newOwner);
    }

    /**
      * validate the request:
      * if this is a constructor call, make sure it is a known account (that is, a contract that
      * we trust that in its constructor will set
      * verify the sender has enough tokens.
      * (since the paymaster is also the token, there is no notion of "approval")
      */
    function validatePaymasterUserOp(UserOperation calldata userOp, bytes32 /*userOpHash*/, uint256 requiredPreFund)
    external view override returns (bytes memory context, uint256 deadline) {
        uint256 tokenPrefund = requiredPreFund;

        // verificationGasLimit is dual-purposed, as gas limit for postOp. make sure it is high enough
        // make sure that verificationGasLimit is high enough to handle postOp
        require(userOp.verificationGasLimit > COST_OF_POST, "WETHPaymaster: gas too low for postOp");

        if (userOp.initCode.length != 0) {
            _validateConstructor(userOp);
            require(wethToken.balanceOf(userOp.sender) >= tokenPrefund, "WETHPaymaster: no balance (pre-create)");
        } else {
            require(wethToken.balanceOf(userOp.sender) >= tokenPrefund, "WETHPaymaster: no balance");
            require(wethToken.allowance(userOp.sender, address(this)) >= tokenPrefund, "WETHPaymaster: no allowance");
        }

        return (abi.encode(userOp.sender), 0);
    }

    // when constructing an account, validate constructor code and parameters
    // we trust our factory (and that it doesn't have any other public methods)
    function _validateConstructor(UserOperation calldata userOp) internal virtual view {
        address factory = address(bytes20(userOp.initCode[0 : 20]));
        require(factory == theFactory, "WETHPaymaster: wrong account factory");

        // TODO: check constructor parameters
    }

    /**
     * actual charge of user.
     * this method will be called just after the user's TX with mode==OpSucceeded|OpReverted (account pays in both cases)
     * BUT: if the user changed its balance in a way that will cause  postOp to revert, then it gets called again, after reverting
     * the user's TX , back to the state it was before the transaction started (before the validatePaymasterUserOp),
     * and the transaction should succeed there.
     */
    function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
        //we don't really care about the mode, we just pay the gas with the user's tokens.
        (mode);
        address sender = abi.decode(context, (address));
        wethToken.transferFrom(sender, address(this), actualGasCost + COST_OF_POST);
    }
}
