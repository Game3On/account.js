import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { parseEther } from 'ethers/lib/utils'

const fundsigner: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // on geth, fund the default "hardhat node" account.

  const provider = hre.ethers.provider
  const signer = provider.getSigner()
}

export default fundsigner
