import { parseEther, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeterministicDeployer } from '@aa-lib/sdk'
import { EntryPoint__factory, SimpleAccountFactory__factory, SimpleAccountForTokensFactory__factory, WETH__factory, USDToken__factory, ERC20__factory,
  WETHPaymaster__factory, USDPaymaster__factory, VerifyingPaymaster__factory, FixedPaymaster__factory } from '@aa-lib/contracts'

// deploy entrypoint - but only on debug network..
const deployEP: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = await dep.getDeterministicDeployAddress(EntryPoint__factory.bytecode)
  if (await dep.isContractDeployed(epAddr)) {
    console.log('EntryPoint already deployed at', epAddr)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying EntryPoint. use pre-deployed entrypoint')
    process.exit(1)
  }

  // deploy entrypoints
  await dep.deterministicDeploy(EntryPoint__factory.bytecode)
  console.log('Deployed EntryPoint at', epAddr)

  // deploy account factory
  const accFactory = await dep.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [epAddr])
  console.log('Deployed SimpleAccountFactory at', accFactory)

  // deploy account for token factory
  const acctokFactory = await dep.deterministicDeploy(new SimpleAccountForTokensFactory__factory(), 0, [epAddr])
  console.log('Deployed SimpleAccountForTokensFactory at', acctokFactory)

  // deploy weth
  const wethAddr = await dep.deterministicDeploy(WETH__factory.bytecode)
  console.log('Deployed WETH at', wethAddr)

  // 1. deploy weth paymaster
  const wethPaymaster = await new WETHPaymaster__factory(ethers.provider.getSigner()).deploy(acctokFactory, epAddr, wethAddr)
  console.log('Deployed WETHPaymaster at', wethPaymaster.address)

  // deploy usd and oracle
  // const usdAddr = await dep.deterministicDeploy(new USDToken__factory(), 0, [BigNumber.from('100000000000000000000000000')])
  const usdAddr = await new USDToken__factory(ethers.provider.getSigner()).deploy(parseUnits('1000000000', 8))
  console.log('Deployed USDToken at', usdAddr.address)

  // 2. deploy usd paymaster
  const usdPaymaster = await new USDPaymaster__factory(ethers.provider.getSigner()).deploy(acctokFactory, epAddr, usdAddr.address, usdAddr.address)
  console.log('Deployed USDPaymaster at', usdPaymaster.address)

  // 3. gasless (verified) paymaster
  const verifiedPaymaster = await new VerifyingPaymaster__factory(ethers.provider.getSigner()).deploy(epAddr, ethers.provider.getSigner().getAddress())
  console.log('Deployed VerifiedPaymaster at', verifiedPaymaster.address)

  // deploy erc20
  const erc20Addr = await dep.deterministicDeploy(new ERC20__factory(), 0, ['TestToken', 'TT'])
  console.log('Deployed custom ERC20 at', erc20Addr)

  // 4. fixed create and tx fee paymaster
  const fixedPaymaster = await new FixedPaymaster__factory(ethers.provider.getSigner()).deploy(acctokFactory, epAddr, erc20Addr, parseEther('1'), parseEther('10'))
  console.log('Deployed FixedPaymaster at', fixedPaymaster.address)
}

export default deployEP
