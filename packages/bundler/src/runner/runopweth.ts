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
import fs from 'fs'
import { DeterministicDeployer, HttpRpcClient, SimpleAccountAPI } from '@aa-lib/sdk'
import { runBundler } from '../runBundler'
import { BundlerServer } from '../BundlerServer'
import { parseExpectedGas } from './utils'

const ENTRY_POINT = '0x1306b01bc3e4ad202612d3843387e94737673f53'
const FIXED_ORACLE = '0xe24a7f6728e4b3dcaca77d0d8dc0bc3da1055340'
const ERC20_WETH = '0xfb970555c468b82cd55831d09bb4c7ee85188675'
const ACCOUNT_FACTORY = '0x17d2a828e552031d2063442cca4f4a1d1d0119e1'
const WETH_PAYMASTER = '0x58b683850a21d4f99f72d492b58f5713c9c98de6'

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
    readonly entryPointAddress = ENTRY_POINT,
    readonly index = 0
  ) {
  }

  async getAddress (): Promise<string> {
    return await this.accountApi.getCounterFactualAddress()
  }

  async init (): Promise<this> {
    const net = await this.provider.getNetwork()
    const chainId = net.chainId
    // deploy the account factory, if needed
    this.bundlerProvider = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, chainId)
    this.accountApi = new SimpleAccountAPI({
      provider: this.provider,
      entryPointAddress: this.entryPointAddress,
      factoryAddress: ACCOUNT_FACTORY,
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
    try {
      console.log('读取 userOp', userOp)
      const userOpHash = await this.bundlerProvider.sendUserOpToBundler(userOp)
      const txid = await this.accountApi.getUserOpReceipt(userOpHash)
      console.log('reqId', userOpHash, 'txid=', txid)
    } catch (e: any) {
      throw parseExpectedGas(e)
    }
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
  let bundler: BundlerServer | undefined
  if (opts.selfBundler != null) {
    // 这里是启动bundler
  }

  // if (opts.mnemonic != null) {
  //   signer = Wallet.fromMnemonic(fs.readFileSync(opts.mnemonic, 'ascii').trim()).connect(provider)
  // } else {
  try {
    // hardhat则使用第一个账户
    const accounts = await provider.listAccounts()
    if (accounts.length === 0) {
      console.log('fatal: no account. use --mnemonic (needed to fund account)')
      process.exit(1)
    }
    // for hardhat/node, use account[0]
    signer = provider.getSigner()
  } catch (e) {
    throw new Error('must specify --mnemonic')
  }

  // 0x7777 secret key
  const accountOwner = new Wallet('0x'.padEnd(66, '7'))

  const index = Date.now()
  const client = await new Runner(provider, opts.bundlerUrl, accountOwner, opts.entryPoint, index).init()
  const addr = await client.getAddress()

  async function isDeployed (addr: string): Promise<boolean> {
    return await provider.getCode(addr).then(code => code !== '0x')
  }

  async function getBalance (addr: string): Promise<BigNumber> {
    return await provider.getBalance(addr)
  }

  const bal = await getBalance(addr)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal))
  // TODO: actual required val
  const requiredBalance = parseEther('0.5')
  if (bal.lt(requiredBalance.div(2))) {
    console.log('funding account to', requiredBalance)
    await signer.sendTransaction({
      to: addr,
      value: requiredBalance.sub(bal)
    })
  } else {
    console.log('not funding account. balance is enough')
  }

  const dest = addr
  console.log('account address', dest, 'deployed=', await isDeployed(dest), 'bal=', formatEther(bal))

  const data = keccak256(Buffer.from('nonce()')).slice(0, 10)
  console.log('data=', data)
  await client.runUserOp(dest, data)
  console.log('after run1')
  // client.accountApi.overheads!.perUserOp = 30000
  await client.runUserOp(dest, data)
  console.log('after run2')
  await bundler?.stop()
}

void main()
