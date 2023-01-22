import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@aa-lib/sdk'
import { EntryPoint__factory,FixedOracle__factory, WETH__factory, SimpleAccountFactory__factory, WETHPaymaster__factory } from '@aa-lib/contracts'

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

  await dep.deterministicDeploy(EntryPoint__factory.bytecode)
  console.log('Deployed EntryPoint at', epAddr)

  // deploy oracle
  const oracleAddr = await dep.deterministicDeploy(FixedOracle__factory.bytecode)
  console.log('Deployed FixedOracle at', oracleAddr)

  // deploy weth
  const wethAddr = await dep.deterministicDeploy(WETH__factory.bytecode)
  console.log('Deployed WETH at', wethAddr)

  // deploy account factory
  const factory = await dep.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [epAddr])
  console.log('Deployed SimpleAccountFactory at', factory)

  // deploy paymaster
  const paymaster = await dep.deterministicDeploy(new WETHPaymaster__factory(), 0, [factory, epAddr, wethAddr])
  console.log('Deployed WETHPaymaster at', paymaster)
}

export default deployEP
