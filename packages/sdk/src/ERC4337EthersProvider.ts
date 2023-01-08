import { BaseProvider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { Network } from '@ethersproject/networks'
// import { hexValue, resolveProperties } from 'ethers/lib/utils'

import { ClientConfig } from './ClientConfig'
import { HttpRpcClient } from './HttpRpcClient'
import { ERC4337EthersSigner } from './ERC4337EthersSigner'
// import { UserOperationEventListener } from './UserOperationEventListener'

// SKYH: change to generalize contracts
// import { EntryPoint, UserOperationStruct } from '@account-abstraction/contracts' 
import { getUserOpHash } from '@account-abstraction/utils'
import { BaseAccountAPI } from './BaseAccountAPI'

export class ERC4337EthersProvider extends BaseProvider {
  readonly signer: ERC4337EthersSigner

  constructor (
    readonly config: ClientConfig,
    readonly originalSigner: Signer,
    readonly originalProvider: BaseProvider,
    readonly httpRpcClient: HttpRpcClient,
    readonly entryPoint: EntryPoint,
    readonly smartAccountAPI: BaseAccountAPI
  ) {
    super({
      name: 'ERC-4337 Custom Network',
      chainId: config.chainId
    })
    this.signer = new ERC4337EthersSigner(config, originalSigner, this, httpRpcClient, smartAccountAPI)
  }

  async init (): Promise<this> {
    // await this.httpRpcClient.validateChainId()
    // await this.smartAccountAPI.init()
    // await this.signer.init()
    return this
  }

  async getSenderAccountAddress (): Promise<string> {
    return await this.smartAccountAPI.getAccountAddress()
  }

  // async perform (method: string, params: any): Promise<any> {
  //   debug('perform', method, params)
  //   if (method === 'sendTransaction' || method === 'getTransactionReceipt') {
  //     // TODO: do we need 'perform' method to be available at all?
  //     // there is nobody out there to use it for ERC-4337 methods yet, we have nothing to override in fact.
  //     throw new Error('Should not get here. Investigate.')
  //   }
  //   return await this.originalProvider.perform(method, params)
  // }

  // async getTransaction (transactionHash: string | Promise<string>): Promise<TransactionResponse> {
  //   // TODO
  //   return await super.getTransaction(transactionHash)
  // }

  // async getTransactionReceipt (transactionHash: string | Promise<string>): Promise<TransactionReceipt> {
  //   const userOpHash = await transactionHash
  //   const sender = await this.getSenderAccountAddress()
  //   return await new Promise<TransactionReceipt>((resolve, reject) => {
  //     new UserOperationEventListener(
  //       resolve, reject, this.entryPoint, sender, userOpHash
  //     ).start()
  //   })
  // }

  

  // async waitForTransaction (transactionHash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt> {
  //   const sender = await this.getSenderAccountAddress()

  //   return await new Promise<TransactionReceipt>((resolve, reject) => {
  //     const listener = new UserOperationEventListener(resolve, reject, this.entryPoint, sender, transactionHash, undefined, timeout)
  //     listener.start()
  //   })
  // }

  // // fabricate a response in a format usable by ethers users...
  // async constructUserOpTransactionResponse (userOp1: UserOperationStruct): Promise<TransactionResponse> {
  //   const userOp = await resolveProperties(userOp1)
  //   const userOpHash = getUserOpHash(userOp, this.config.entryPointAddress, this.chainId)
  //   const waitPromise = new Promise<TransactionReceipt>((resolve, reject) => {
  //     new UserOperationEventListener(
  //       resolve, reject, this.entryPoint, userOp.sender, userOpHash, userOp.nonce
  //     ).start()
  //   })
  //   return {
  //     hash: userOpHash,
  //     confirmations: 0,
  //     from: userOp.sender,
  //     nonce: BigNumber.from(userOp.nonce).toNumber(),
  //     gasLimit: BigNumber.from(userOp.callGasLimit), // ??
  //     value: BigNumber.from(0),
  //     data: hexValue(userOp.callData), // should extract the actual called method from this "execFromEntryPoint()" call
  //     chainId: this.chainId,
  //     wait: async (confirmations?: number): Promise<TransactionReceipt> => {
  //       const transactionReceipt = await waitPromise
  //       if (userOp.initCode.length !== 0) {
  //         // checking if the wallet has been deployed by the transaction; it must be if we are here
  //         await this.smartAccountAPI.checkAccountPhantom()
  //       }
  //       return transactionReceipt
  //     }
  //   }
  // }

  // async detectNetwork (): Promise<Network> {
  //   return (this.originalProvider as any).detectNetwork()
  // }

  // getSigner (): ERC4337EthersSigner {
  //   return this.signer
  // }
}
