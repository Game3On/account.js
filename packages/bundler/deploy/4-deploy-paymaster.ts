import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@aa-lib/sdk'
import { WETHPaymaster__factory } from '@aa-lib/contracts'

const deployPaymanster: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = await dep.getDeterministicDeployAddress(WETHPaymaster__factory.bytecode)
  if (await dep.isContractDeployed(epAddr)) {
    console.log('WETHPaymaster already deployed at', epAddr)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying WETHPaymaster. use pre-deployed wethPaymaster')
    process.exit(1)
  }

  const wethPaymasterFactory = new WETHPaymaster__factory(ethers.provider.getSigner())
  await dep.deterministicDeploy(wethPaymasterFactory)
  console.log('Deployed WETHPaymaster at', epAddr)
}

export default deployPaymanster
