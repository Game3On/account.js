require('dotenv').config();
const { BigNumber } = require("ethers")
const Web3 = require('web3')
const {ethers} = require("hardhat");

// represent connection to blockchain
const web3 = new Web3(
  // testnet
  new Web3.providers.HttpProvider(`https://goerli.infura.io/v3/${process.env.INFURA_ID}`) 
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.SIGNER_PRIVATE_KEY)
// console.log(admin)

export const BASE_TEN = 10
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export function address(n: number) {
  return `0x${n.toString(16).padStart(40, '0')}`;
}

export function keccak256(str: String) {
  return web3.utils.keccak256(str);
}

export function uint(n: number) {
  return web3.utils.toBN(n).toString();
}

export function toHex(amount: number, privateKey: String) {
  let { address: signer } = web3.eth.accounts.wallet.add(privateKey)
  return web3.utils.numberToHex(amount)
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: number, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals))
}

export function numToBigNumber(amount: number, decimals = 18) {
  return getBigNumber(Math.floor(amount / 10 ** decimals), decimals)
}

export function getTokenAddress(chainId: String) {
  var Token = ""
  if (chainId === '1') {
    // mainnet
    Token = "0xc8eec1277b84fc8a79364d0add8c256b795c6727"

  } else if (chainId === '3') {
      // ropsten
      Token = "0x689a4FBAD3c022270caBD1dbE2C7e482474a70bc"
      // TokenBenifit = deployer

  } else if (chainId === '4') {
      // rinkeby
      Token = "0xe09D4de9f1dCC8A4d5fB19c30Fb53830F8e2a047"
      // TokenBenifit = deployer
  } else if (chainId === '1337') {
      Token = "0xB6d7Bf947d4D6321FD863ACcD2C71f022BCFd0eE"
  } else if (chainId === '56') {
      Token = ""
  }
  return Token
}

export async function sign2(addr: string, privateKey: string) {
  let { address: signer } = web3.eth.accounts.wallet.add(privateKey)
  var hashMessage = web3.utils.soliditySha3(addr)
//   // "0x4bc82ecb914143406301ebaca8a5d68d43b2074d2472a36b9cea56bdce8b013b"
  var signature = await web3.eth.sign(hashMessage, signer);    // sign the random hash or the ethHash
  signature = signature.substr(0, 130) + (signature.substr(130) == "00" ? "1b" : "1c");
  // console.log('hashMessage: '+hashMessage)
  // console.log('eth.sign: '+signature)
  return signature
}

export async function sign(addr: string, privateKey: string) {
    // var hashMessage = web3.utils.soliditySha3(addr)
    // var sig = await web3.eth.accounts.sign( addr, privateKey )
    var sig = await web3.eth.sign( addr, privateKey )
    return sig.signature
}

export async function signAddr(address: string, privateKey: string) {
  var signer = web3.eth.accounts.privateKeyToAccount(
    privateKey
  );

  let message = `0x000000000000000000000000${address.substring(2)}`;
  let { signature } = signer.sign(message);

  return signature
}

export async function deployContract(name: any, args: any) {
  const factory = await ethers.getContractFactory(name);
  return await factory.deploy(...args)
}