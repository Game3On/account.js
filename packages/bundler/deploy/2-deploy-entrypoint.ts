import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@aa-lib/sdk'
import { EntryPoint__factory, FixedOracle__factory, WETH__factory, SimpleAccountFactory__factory, WETHPaymaster__factory } from '@aa-lib/contracts'
import { BundlerHelper__factory } from '../src/types/factories/contracts'

// deploy entrypoint - but only on debug network..
const deployEP: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)
  const bhAddr = DeterministicDeployer.getAddress(BundlerHelper__factory.bytecode)

  if (await dep.isContractDeployed(epAddr)) {
    console.log('EntryPoint already deployed at', epAddr)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying EntryPoint. use pre-deployed entrypoint')
    process.exit(1)
  }

  await dep.deterministicDeploy(EntryPoint__factory.bytecode)
  console.log('Deployed EntryPoint at', epAddr)

  await dep.deterministicDeploy(BundlerHelper__factory.bytecode)
  console.log('Deployed BundlerHelper at', bhAddr)

  // deploy oracle
  const oracleAddr = await dep.deterministicDeploy(FixedOracle__factory.bytecode)
  console.log('Deployed FixedOracle at', oracleAddr)

  // deploy weth
  const wethAddr = await dep.deterministicDeploy(WETH__factory.bytecode)
  console.log('Deployed WETH at', wethAddr)

  // deploy account factory
  const accFactory = await dep.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [epAddr])
  console.log('Deployed SimpleAccountFactory at', accFactory)

  // 1. deploy paymaster
  const paymaster = await dep.deterministicDeploy(new WETHPaymaster__factory(), 0, [accFactory, epAddr, wethAddr])
  // const factory = new WETHPaymaster__factory().connect(ethers.provider.getSigner())
  // const paymaster = await factory.deploy(epAddr, wethAddr, oracleAddr)
  console.log('Deployed WETHPaymaster at', paymaster)

  // deploy usdtoken
  // const usdtAddr = await dep.deterministicDeploy(USDToken__factory.bytecode)
  // console.log('Deployed USDT at', usdtAddr)

  // 2. deploy paymaster
  // const paymaster = await dep.deterministicDeploy(new USDPaymaster__factory(), 0, [factory, epAddr, usdtAddr, oracleAddr])
  // console.log('Deployed USDPaymaster at', paymaster)
}

export default deployEP
