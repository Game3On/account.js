// runner script, to create

/**
 * a simple script runner, to test the bundler and API.
 * for a simple target method, we just call the "nonce" method of the account itself.
 */

import { BigNumber, getDefaultProvider, Signer, Wallet } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { SimpleAccountFactory__factory } from '@aa-lib/contracts'
import { formatEther, keccak256, parseEther } from 'ethers/lib/utils'
import { Command } from 'commander'
import { erc4337RuntimeVersion } from '@aa-lib/utils'
import { WETH__factory, WETHPaymaster__factory, EntryPoint__factory, UserOperationStruct } from '@aa-lib/contracts'
import { DeterministicDeployer, HttpRpcClient, SimpleAccountAPI, PaymasterAPI } from '@aa-lib/sdk'
import { BundlerServer } from '../BundlerServer'
import { parseExpectedGas } from './utils'

const ENTRY_POINT = '0xceb7363cc430d6332d341f5babbf00dd5f4ba119'
const BundlerHelper = '0xf86902cb7a3d54bea07343c4604bc525ab49fe55'
const FixedOracle = '0xe24a7f6728e4b3dcaca77d0d8dc0bc3da1055340'
const WETH = '0xfb970555c468b82cd55831d09bb4c7ee85188675'
const SimpleAccountFactory = '0xf17b17570b0e9a08a4dbcc8a751901c564a1549f'
const WETH_PAYMASTER = '0x108df042a9fd3c71a76a373e83004ac42958ca1a'

class Runner {
  bundlerProvider!: HttpRpcClient
  accountApi!: SimpleAccountAPI

  /**
   *
   * @param provider - a provider for initialization. This account is used to fund the created account contract, but it is not the account or its owner.
   * @param bundlerUrl - a URL to a running bundler. must point to the same network the provider is.
   * @param accountOwner - the wallet signer account. used only as signer (not as transaction sender)
   * @param entryPointAddress - the entrypoint address to use.
   * @param index - unique salt, to allow multiple accounts with the same owner
   */
  constructor (
    readonly provider: JsonRpcProvider,
    readonly bundlerUrl: string,
    readonly accountOwner: Signer,
    readonly index = 0
  ) {
  }

  async getAddress (): Promise<string> {
    return await this.accountApi.getCounterFactualAddress()
  }

  async init (deploymentSigner?: Signer): Promise<this> {
    const net = await this.provider.getNetwork()
    const chainId = net.chainId
    const dep = new DeterministicDeployer(this.provider)
    const accountDeployer = DeterministicDeployer.getAddress(new SimpleAccountFactory__factory(), 0, [ENTRY_POINT])
    // const accountDeployer = await new SimpleAccountFactory__factory(this.provider.getSigner()).deploy().then(d=>d.address)

    const paymasterAPI = new PaymasterAPI(WETH_PAYMASTER)
    console.log('paymasterAPI', await paymasterAPI.getPaymasterAndData({}))

    if (!await dep.isContractDeployed(accountDeployer)) {
      if (deploymentSigner == null) {
        console.log(`AccountDeployer not deployed at ${accountDeployer}. run with --deployFactory`)
        process.exit(1)
      }
      const dep1 = new DeterministicDeployer(deploymentSigner.provider as any)
      await dep1.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [ENTRY_POINT])
    }

    this.bundlerProvider = new HttpRpcClient(this.bundlerUrl, ENTRY_POINT, chainId)
    this.accountApi = new SimpleAccountAPI({
      provider: this.provider,
      entryPointAddress: ENTRY_POINT,
      factoryAddress: accountDeployer,
      paymasterAPI,
      owner: this.accountOwner,
      index: this.index,
      overheads: {
        // perUserOp: 100000
      }
    })
    return this
  }

  async runUserOp (target: string, data: string): Promise<void> {
    const userOp = await this.accountApi.createSignedUserOp({
      target,
      data
    })
    console.log(userOp)

    try {
      const userOpHash = await this.bundlerProvider.sendUserOpToBundler(userOp)
      const txid = await this.accountApi.getUserOpReceipt(userOpHash)
      console.log('reqId', userOpHash, 'txid=', txid)
    } catch (e: any) {
      throw parseExpectedGas(e)
    }
  }

  async createUserOp (target: string, data: string): Promise<UserOperationStruct> {
    const userOp = await this.accountApi.createSignedUserOp({
      target,
      data
    })
    return userOp
  }
}

async function main (): Promise<void> {
  const program = new Command()
    .version(erc4337RuntimeVersion)
    .option('--network <string>', 'network name or url', 'http://localhost:8545')
    .option('--mnemonic <file>', 'mnemonic/private-key file of signer account (to fund account)')
    .option('--bundlerUrl <url>', 'bundler URL', 'http://localhost:3000/rpc')
    .option('--entryPoint <string>', 'address of the supported EntryPoint contract', ENTRY_POINT)
    .option('--deployFactory', 'Deploy the "account deployer" on this network (default for testnet)')
    .option('--show-stack-traces', 'Show stack traces.')
    .option('--selfBundler', 'run bundler in-process (for debugging the bundler)')

  const opts = program.parse().opts()
  const provider = getDefaultProvider(opts.network) as JsonRpcProvider
  let signer: Signer
  const deployFactory: boolean = opts.deployFactory
  // let bundler: BundlerServer | undefined
  if (opts.selfBundler != null) {
    // 去掉selfBundler
  }

  try {
    const accounts = await provider.listAccounts()
    if (accounts.length === 0) {
      console.log('fatal: no account. use --mnemonic (needed to fund account)')
      process.exit(1)
    }
    // for hardhat/node, use account[0]
    signer = provider.getSigner()
    // deployFactory = true
  } catch (e) {
    throw new Error('must specify --mnemonic')
  }

  // signer transfer 10 eth to WETH
  const eth0 = await signer.getBalance()
  console.log('eth0=', formatEther(eth0))

  await signer.sendTransaction({
    to: WETH,
    value: parseEther('10')
  })

  // check WETH balance
  const weth = WETH__factory.connect(WETH, signer)
  const wethBal = await weth.balanceOf(signer.getAddress())
  console.log('weth bal=', formatEther(wethBal))

  // connect to paymaster
  const paymaster = await WETHPaymaster__factory.connect(WETH_PAYMASTER, signer)
  console.log('paymaster owner:', await paymaster.owner())

  // paymaster deposit 1 eth
  await paymaster.deposit({ value: parseEther('1') })
  // await paymaster.addStake(1000, { value: parseEther('1') }) // must owner
  const deposit = await paymaster.getDeposit()
  console.log('paymaster deposit=', formatEther(deposit))

  // 0x7777
  const accountOwner = new Wallet('0x'.padEnd(66, '7'))

  // const index = Date.now()
  const client = await new Runner(provider, opts.bundlerUrl, accountOwner).init(deployFactory ? signer : undefined)

  async function isDeployed (addr: string): Promise<boolean> {
    return await provider.getCode(addr).then(code => code !== '0x')
  }

  async function getBalance (addr: string): Promise<BigNumber> {
    // return await provider.getBalance(addr)
    return await weth.balanceOf(addr)
  }

  const addr = await client.getAddress()
  // transfer 1 weth to account
  await weth.transfer(addr, parseEther('1'))

  const bal = await getBalance(addr)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal))

  const dest = addr
  const data = keccak256(Buffer.from('nonce()')).slice(0, 10)
  // console.log('data=', data)
  // await client.runUserOp(dest, data)
  // console.log('after run1')
  const activateOp = await client.createUserOp(dest, data)
  console.log('读取 userOp', activateOp,
    formatEther(activateOp.callGasLimit as BigNumber),
    formatEther(activateOp.verificationGasLimit as BigNumber),
    formatEther(activateOp.maxFeePerGas as BigNumber),
    formatEther(activateOp.maxPriorityFeePerGas as BigNumber)
  )

  const entryPoint = await EntryPoint__factory.connect(ENTRY_POINT, signer)
  await entryPoint.handleOps([activateOp], '0xd21934eD8eAf27a67f0A70042Af50A1D6d195E81', { gasLimit: 10000000 })

  const bal1 = await getBalance(dest)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal1))
  // // client.accountApi.overheads!.perUserOp = 30000
  // await client.runUserOp(dest, data)
  // console.log('after run2')
  // await bundler?.stop()
}

void main()
