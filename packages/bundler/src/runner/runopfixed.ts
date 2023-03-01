// runner script, to create

/**
 * a simple script runner, to test the bundler and API.
 * for a simple target method, we just call the "nonce" method of the account itself.
 */

import { BigNumber, getDefaultProvider, Signer, Wallet } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { formatEther, keccak256, parseEther } from 'ethers/lib/utils'
import { Command } from 'commander'
import { erc4337RuntimeVersion } from '@accountjs/utils'
import { EntryPoint__factory } from '@account-abstraction/contracts'
import { Token__factory, FixedPaymaster__factory } from '../../src/types'
import { HttpRpcClient, SimpleAccountForTokensAPI, TokenPaymasterAPI } from '@accountjs/sdk'
import { runBundler } from '../runBundler'
import { BundlerServer } from '../BundlerServer'
import { parseExpectedGas, Sleep } from './utils'

const ENTRY_POINT = '0x0576a174d229e3cfa37253523e645a78a0c91b57'
const ACCTOK_FACTORY = '0xf25dc911d2c89559aeef1a49e36582f9cb305397'
const ERC20 = '0x0f7a41bc01b661847d07077168c439abff37db8d'
const FIXED_PAYMASTER = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'
const beneficiary = '0xd21934eD8eAf27a67f0A70042Af50A1D6d195E81'
class Runner {
  bundlerProvider!: HttpRpcClient
  accountApi!: SimpleAccountForTokensAPI

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

  async init (deploymentSigner?: Signer): Promise<this> {
    const net = await this.provider.getNetwork()
    const chainId = net.chainId

    const paymasterAPI = new TokenPaymasterAPI(FIXED_PAYMASTER)
    console.log('paymasterAPI', await paymasterAPI.getPaymasterAndData({}))

    this.bundlerProvider = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, chainId)
    this.accountApi = new SimpleAccountForTokensAPI({
      provider: this.provider,
      entryPointAddress: this.entryPointAddress,
      factoryAddress: ACCTOK_FACTORY,
      paymasterAPI,
      owner: this.accountOwner,
      token: ERC20,
      paymaster: FIXED_PAYMASTER,
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

  async estUserOp (target: string, data: string): Promise<void> {
    const userOp = await this.accountApi.createSignedUserOp({
      target,
      data
    })
    console.log(userOp)
    try {
      const estimateUserOpGas = await this.bundlerProvider.estimateUserOpGas(userOp)
      console.log('estimateUserOpGas', estimateUserOpGas)
    } catch (e: any) {
      throw parseExpectedGas(e)
    }
  }

  async hdlUserOp (target: string, data: string, signer: Signer): Promise<void> {
    const userOp = await this.accountApi.createSignedUserOp({
      target,
      data
    })
    console.log(userOp)
    try {
      const entrypoint = new EntryPoint__factory(signer).attach(this.entryPointAddress)
      await entrypoint.handleOps([userOp], beneficiary, { gasLimit: 1e6 })
    } catch (e: any) {
      // failed to handleOp. use FailedOp to detect by
      if (e.errorName !== 'FailedOp') {
        console.warn('Failed handleOps, but non-FailedOp error', e)
        return
      }
      console.log(e)
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
  const deployFactory: boolean = opts.deployFactory
  let bundler: BundlerServer | undefined
  if (opts.selfBundler != null) {
    console.log('starting bundler in-process')

    // todo: if node is geth, we need to fund our bundler's account:
    const signer = provider.getSigner()

    const signerBalance = await provider.getBalance(signer.getAddress())
    const account = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    const bal = await provider.getBalance(account)
    if (bal.lt(parseEther('1')) && signerBalance.gte(parseEther('10000'))) {
      console.log('funding hardhat account', account)
      await signer.sendTransaction({
        to: account,
        value: parseEther('1').sub(bal)
      })
    }

    const argv = ['node', 'exec', '--config', './localconfig/bundler.config.json', '--unsafe']
    if (opts.entryPoint != null) {
      argv.push('--entryPoint', opts.entryPoint)
    }
    bundler = await runBundler(argv)
    await bundler.asyncStart()
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

  // check USDT balance
  const token = Token__factory.connect(ERC20, signer)

  await token.mint(parseEther('1000000'))

  const tokBal = await token.balanceOf(signer.getAddress())
  console.log('token bal=', formatEther(tokBal))

  const paymaster = FixedPaymaster__factory.connect(FIXED_PAYMASTER, signer)
  console.log('paymaster owner:', await paymaster.owner())

  // paymaster deposit 1 eth
  await paymaster.deposit({ value: parseEther('1') })
  const deposit = await paymaster.getDeposit()
  console.log('paymaster deposit=', formatEther(deposit))

  const accountOwner = new Wallet('0x'.padEnd(66, '7'))

  const index = Date.now()
  const client = await new Runner(provider, opts.bundlerUrl, accountOwner, opts.entryPoint, index).init(deployFactory ? signer : undefined)
  const addr = await client.getAddress()
  // transfer 1 weth to addr
  await token.transfer(addr, parseEther('100'))

  async function isDeployed (addr: string): Promise<boolean> {
    return await provider.getCode(addr).then(code => code !== '0x')
  }

  async function getBalance (addr: string): Promise<BigNumber> {
    // return await provider.getBalance(addr)
    return await token.balanceOf(addr)
  }

  const bal = await getBalance(addr)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal))

  const dest = addr
  const data = keccak256(Buffer.from('nonce()')).slice(0, 10)
  console.log('data=', data)
  await client.runUserOp(dest, data)
  console.log('after run1')
  await Sleep(5000)

  const bal1 = await getBalance(dest)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal1))
  // client.accountApi.overheads!.perUserOp = 30000
  // await client.runUserOp(dest, data)
  // console.log('after run2')
  await bundler?.stop()
}

void main()
