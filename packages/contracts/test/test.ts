import Web3 from 'web3';
import { ethers } from "hardhat";
import fs from 'fs';
import { AbiItem } from 'web3-utils';
import { expect } from "chai";
import { Signer } from "ethers";
import { deployContract, BASE_TEN, ADDRESS_ZERO, getBigNumber, numToBigNumber, signAddr, address, uint, keccak256} from "./utils/index";

describe("Contract Test", function() {
  before(async function() {
    this.signers = await ethers.getSigners();
  })

  it("deploy simple account", async function() {
    console.log('signer is: '+this.signers[0].address)
    /* deployed address
        EntryPoint address is: 0xbeFf3cB35b82854254B31C99d14a46fDe5E449b5
        SimpleAccount address is: 0x57B606CEdd5a9E1dac1842Bec1fA66Cc9b5B7a62 
        SimpleAccountFactory address is: 0xf6F0844EC865eF4d60D3ED631D1495A219497Cf3
    */ 
    // this.EntryPoint = await deployContract("EntryPoint", []);
    // console.log('EntryPoint address is: '+this.EntryPoint.address)
    // this.SimpleAccount = await deployContract("SimpleAccount", [this.EntryPoint.address]);
    // console.log('SimpleAccount address is: '+this.SimpleAccount.address)
    // this.SimpleAccountFactory = await deployContract("SimpleAccountFactory", [this.SimpleAccount.address]);
    // console.log('SimpleAccountFactory address is: '+this.SimpleAccountFactory.address)

  })
})