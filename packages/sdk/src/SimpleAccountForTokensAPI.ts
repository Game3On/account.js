import { BigNumber, BigNumberish } from 'ethers'
import {
  SimpleAccountForTokens,
  SimpleAccountForTokens__factory, SimpleAccountForTokensFactory,
  SimpleAccountForTokensFactory__factory
} from '@aa-lib/contracts'

import { arrayify, hexConcat } from 'ethers/lib/utils'
import { Signer } from '@ethersproject/abstract-signer'
import { BaseApiParams, BaseAccountAPI } from './BaseAccountAPI'

/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param factoryAddress address of contract "factory" to deploy new contracts (not needed if account already deployed)
 * @param index nonce value used when creating multiple accounts for the same owner
 */
export interface SimpleAccountForTokensApiParams extends BaseApiParams {
  owner: Signer
  token: string
  paymaster: string
  factoryAddress?: string
  index?: number

}

/**
 * An implementation of the BaseAccountAPI using the SimpleAccountForTokens contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
export class SimpleAccountForTokensAPI extends BaseAccountAPI {
  factoryAddress?: string
  owner: Signer
  token: string
  paymaster: string
  index: number

  /**
   * our account contract.
   * should support the "execFromEntryPoint" and "nonce" methods
   */
  accountContract?: SimpleAccountForTokens

  factory?: SimpleAccountForTokensFactory

  constructor (params: SimpleAccountForTokensApiParams) {
    super(params)
    this.factoryAddress = params.factoryAddress
    this.owner = params.owner
    this.token = params.token
    this.paymaster = params.paymaster
    this.index = params.index ?? 0
  }

  async _getAccountContract (): Promise<SimpleAccountForTokens> {
    if (this.accountContract == null) {
      this.accountContract = SimpleAccountForTokens__factory.connect(await this.getAccountAddress(), this.provider)
    }
    return this.accountContract
  }

  /**
   * return the value to put into the "initCode" field, if the account is not yet deployed.
   * this value holds the "factory" address, followed by this account's information
   */
  async getAccountInitCode (): Promise<string> {
    if (this.factory == null) {
      if (this.factoryAddress != null && this.factoryAddress !== '') {
        this.factory = SimpleAccountForTokensFactory__factory.connect(this.factoryAddress, this.provider)
      } else {
        throw new Error('no factory to get initCode')
      }
    }
    return hexConcat([
      this.factory.address,
      this.factory.interface.encodeFunctionData('createAccount', [await this.owner.getAddress(), this.token, this.paymaster, this.index])
    ])
  }

  async getNonce (): Promise<BigNumber> {
    if (await this.checkAccountPhantom()) {
      return BigNumber.from(0)
    }
    const accountContract = await this._getAccountContract()
    return await accountContract.nonce()
  }

  /**
   * encode a method call from entryPoint to our contract
   * @param target
   * @param value
   * @param data
   */
  async encodeExecute (target: string, value: BigNumberish, data: string): Promise<string> {
    const accountContract = await this._getAccountContract()
    return accountContract.interface.encodeFunctionData(
      'execute',
      [
        target,
        value,
        data
      ])
  }

  async signUserOpHash (userOpHash: string): Promise<string> {
    return await this.owner.signMessage(arrayify(userOpHash))
  }
}
