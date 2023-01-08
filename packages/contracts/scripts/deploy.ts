import { ethers } from 'hardhat'

const UNSTAKE_DELAY_SEC = 100
const PAYMASTER_STAKE = ethers.utils.parseEther('1')

async function main() {
  const EntryPoint = await ethers.getContractFactory('EntryPoint')
  const entrypoint = await EntryPoint.deploy(PAYMASTER_STAKE, UNSTAKE_DELAY_SEC)

  await entrypoint.deployed()
  console.log(`entrypoint deploy in ${entrypoint.address}`)

  const WalletLogic = await ethers.getContractFactory('SmartWallet')
  const walletLogic = await WalletLogic.deploy()

  await walletLogic.deployed()
  console.log(`walletLogic deploy in ${walletLogic.address}`)

  const Create2Factory = await ethers.getContractFactory('Create2Factory')
  const factory = await Create2Factory.deploy()

  await factory.deployed()
  console.log(`factory deploy in ${factory.address}`)

  const WETH = await ethers.getContractFactory('WETH')
  const weth = await WETH.deploy()

  await weth.deployed()
  console.log(`weth deploy in ${weth.address}`)

  // get account from ethers
  const [deployer] = await ethers.getSigners()
  console.log(`deployer address: ${deployer.address}`)

  const WETHPaymaster = await ethers.getContractFactory('WETHTokenPaymaster')
  const wethPaymaster = await WETHPaymaster.deploy(
    entrypoint.address,
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    weth.address,
  )

  await wethPaymaster.deployed()
  console.log(`wethPaymaster deploy in ${wethPaymaster.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
