// runner script, to create

/**
 * a simple script runner, to test the bundler and API.
 * for a simple target method, we just call the "nonce" method of the account itself.
 */

import { BigNumber, getDefaultProvider, Signer, Wallet } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { SimpleAccountFactory__factory } from '@account-abstraction/contracts'
import { formatEther, keccak256, parseEther } from 'ethers/lib/utils'
import { Command } from 'commander'
import { erc4337RuntimeVersion } from '@accountjs/utils'
import { ERC4337EthersProvider, ClientConfig, wrapProvider } from '@accountjs/sdk'
import { runBundler } from '../runBundler'
import { BundlerServer } from '../BundlerServer'
import { parseExpectedGas } from './utils'

const ENTRY_POINT = '0x0576a174d229e3cfa37253523e645a78a0c91b57'

class Runner {
  aaProvider!: ERC4337EthersProvider

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
    return await this.aaProvider.getSenderAccountAddress()
  }

  async init (deploymentSigner?: Signer): Promise<this> {
    const config: ClientConfig = {
      bundlerUrl: this.bundlerUrl,
      entryPointAddress: this.entryPointAddress
    }
    this.aaProvider = await wrapProvider(this.provider, config, this.accountOwner)
    return this
  }

  async transferETH (target: string, ether: string): Promise<void> {
    await this.aaProvider.getSigner().sendTransaction({
      to: target,
      data: '0x',
      value: parseEther(ether),
      gasLimit: 100000
    })
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

  const index = Date.now()
  const client = await new Runner(provider, opts.bundlerUrl, accountOwner, opts.entryPoint, index).init(deployFactory ? signer : undefined)

  const addr = await client.getAddress()

  async function isDeployed (addr: string): Promise<boolean> {
    return await provider.getCode(addr).then(code => code !== '0x')
  }

  async function getBalance (addr: string): Promise<BigNumber> {
    return await provider.getBalance(addr)
  }

  const bal = await getBalance(addr)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal))
  const ownerAddr = await accountOwner.getAddress()
  let ownerBal = await getBalance(ownerAddr)
  console.log('owner', ownerAddr, 'bal=', formatEther(ownerBal))

  const requiredBalance = parseEther('0.5')
  console.log('funding account to', requiredBalance)
  await signer.sendTransaction({
    to: addr,
    value: requiredBalance.sub(bal)
  })

  const dest = addr
  await client.transferETH(ownerAddr, '0.1')
  console.log('after run1')
  const bal1 = await getBalance(dest)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal1))
  ownerBal = await getBalance(ownerAddr)
  console.log('owner', ownerAddr, 'bal=', formatEther(ownerBal))
  // client.accountApi.overheads!.perUserOp = 30000
  await client.transferETH(ownerAddr, '0.1')
  console.log('after run2')
  const bal2 = await getBalance(dest)
  console.log('account address', addr, 'deployed=', await isDeployed(addr), 'bal=', formatEther(bal2))
  ownerBal = await getBalance(ownerAddr)
  console.log('owner', ownerAddr, 'bal=', formatEther(ownerBal))
  await bundler?.stop()
}

void main()
