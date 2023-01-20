import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { DeterministicDeployer } from '@aa-lib/sdk'
import { WETHPaymaster__factory } from '@aa-lib/contracts'

const deployPaymanster: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const dep = new DeterministicDeployer(ethers.provider)
  const epAddr = await dep.getDeterministicDeployAddress(WETHPaymaster__factory.bytecode)
  if (await dep.isContractDeployed(epAddr)) {
    console.log('EntryPoint already deployed at', epAddr)
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  if (net.chainId !== 1337 && net.chainId !== 31337) {
    console.log('NOT deploying EntryPoint. use pre-deployed entrypoint')
    process.exit(1)
  }

  await dep.deterministicDeploy(WETHPaymaster__factory.bytecode, 0, [ethers.provider.getSigner()])
  console.log('Deployed EntryPoint at', epAddr)
}

export default deployPaymanster
