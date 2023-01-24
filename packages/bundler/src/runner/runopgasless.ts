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
import { DeterministicDeployer, HttpRpcClient, SimpleAccountAPI, GaslessPaymasterAPI } from '@aa-lib/sdk'
import { runBundler } from '../runBundler'
import { BundlerServer } from '../BundlerServer'
import { parseExpectedGas } from './utils'


const ENTRY_POINT = '0x1306b01bc3e4ad202612d3843387e94737673f53'
const FIXED_ORACLE = '0xe24a7f6728e4b3dcaca77d0d8dc0bc3da1055340'
const WETH = '0xfb970555c468b82cd55831d09bb4c7ee85188675'
const ACCOUNT_FACTORY = '0x17d2a828e552031d2063442cca4f4a1d1d0119e1'
const GASLESS_PAYMASTER = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'

class Runner {
  bundlerProvider!: HttpRpcClient
  accountApi!: SimpleAccountAPI

  /**
   *
   * @param provider - a provider for initialization. This account is used to fund the created account contract, but it is not the account or its owner.
   * @param bundlerUrl - a URL to a running bundler. must point to the same network the provider is.
   * @param accountOwner - the wallet signer account. used only as signer (not as transaction sender)
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
    if (deploymentSigner == null) {
      console.log(`run with --deployFactory`)
      process.exit(1)
    }

    const net = await this.provider.getNetwork()
    const chainId = net.chainId
    const dep = new DeterministicDeployer(this.provider)
    const accountDeployer = await dep.getDeterministicDeployAddress(new SimpleAccountFactory__factory(), 0, [ENTRY_POINT])
    // const accountDeployer = await new SimpleAccountFactory__factory(this.provider.getSigner()).deploy().then(d=>d.address)
    if (!await dep.isContractDeployed(accountDeployer)) {
      const dep1 = new DeterministicDeployer(deploymentSigner.provider as any)
      await dep1.deterministicDeploy(new SimpleAccountFactory__factory(), 0, [ENTRY_POINT])
    }

    // signer as verifier
    const paymasterAPI = new GaslessPaymasterAPI(GASLESS_PAYMASTER, deploymentSigner)

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
      const estimateUserOpGas = await this.bundlerProvider.estimateUserOpGas(userOp)
      console.log('estimateUserOpGas', estimateUserOpGas)
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
  const deployFactory: boolean = opts.deployFactory
  let bundler: BundlerServer | undefined
  if (opts.selfBundler != null) {
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

  const accountOwner = new Wallet('0x'.padEnd(66, '7'))

  // const index = Date.now()
  const client = await new Runner(provider, opts.bundlerUrl, accountOwner).init(deployFactory ? signer : undefined)

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
  const data = keccak256(Buffer.from('nonce()')).slice(0, 10)
  console.log('data=', data)
  await client.runUserOp(dest, data)
  console.log('after run1')
  const bal1 = await getBalance(dest)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal1))
  // client.accountApi.overheads!.perUserOp = 30000
  await client.runUserOp(dest, data)
  console.log('after run2')
  await bundler?.stop()
}

void main()
