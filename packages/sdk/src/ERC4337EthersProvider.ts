import {
  BaseProvider,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'

import { ClientConfig } from './ClientConfig'
import { HttpRpcClient } from './HttpRpcClient'
import { ERC4337EthersSigner } from './ERC4337EthersSigner'

// SKYH: change to generalize contracts
import { EntryPoint, UserOperationStruct } from '@account-abstraction/contracts'
import { BaseAccountAPI } from './BaseAccountAPI'
import { hexValue, resolveProperties } from 'ethers/lib/utils'
import { getUserOpHash } from '@account-abstraction/utils'
import { UserOperationEventListener } from './UserOperationEventListener'

export class ERC4337EthersProvider extends BaseProvider {
  readonly signer: ERC4337EthersSigner

  constructor(
    readonly config: ClientConfig,
    readonly originalSigner: Signer,
    readonly originalProvider: BaseProvider,
    readonly httpRpcClient: HttpRpcClient,
    readonly entryPoint: EntryPoint,
    readonly smartAccountAPI: BaseAccountAPI,
  ) {
    super({
      name: 'ERC-4337 Custom Network',
      chainId: config.chainId,
    })
    this.signer = new ERC4337EthersSigner(
      config,
      originalSigner,
      this,
      httpRpcClient,
      smartAccountAPI,
    )
  }

  async init(): Promise<this> {
    return this
  }

  async getSenderAccountAddress(): Promise<string> {
    return await this.smartAccountAPI.getAccountAddress()
  }

  // fabricate a response in a format usable by ethers users...
  async constructUserOpTransactionResponse(
    userOp1: UserOperationStruct,
  ): Promise<TransactionResponse> {
    const userOp = await resolveProperties(userOp1)
    const userOpHash = getUserOpHash(
      userOp,
      this.config.entryPointAddress,
      this.config.chainId,
    )
    const waitPromise = new Promise<TransactionReceipt>((resolve, reject) => {
      new UserOperationEventListener(
        resolve,
        reject,
        this.entryPoint,
        userOp.sender,
        userOpHash,
        userOp.nonce,
      ).start()
    })
    return {
      hash: userOpHash,
      confirmations: 0,
      from: userOp.sender,
      nonce: BigNumber.from(userOp.nonce).toNumber(),
      gasLimit: BigNumber.from(userOp.callGasLimit), // ??
      value: BigNumber.from(0),
      data: hexValue(userOp.callData), // should extract the actual called method from this "execFromEntryPoint()" call
      chainId: this.config.chainId,
      // TODO: Confirmations value is unuse now
      wait: async (confirmations?: number): Promise<TransactionReceipt> => {
        const transactionReceipt = await waitPromise
        if (userOp.initCode.length !== 0) {
          // checking if the wallet has been deployed by the transaction; it must be if we are here
          await this.smartAccountAPI.checkAccountPhantom()
        }
        return transactionReceipt
      },
    }
  }
}
