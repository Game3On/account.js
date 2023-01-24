import { keccak256 } from 'ethers/lib/utils'
import { Signer } from 'ethers'
import { PaymasterAPI } from './PaymasterAPI'
import { UserOperationStruct } from '@aa-lib/contracts'

/**
 * an API to external a UserOperation with paymaster info
 */
export class GaslessPaymasterAPI extends PaymasterAPI {
  constructor (
    readonly paymaster: string,
    readonly signer: Signer
  ) {
    super(paymaster)
  }

  async getPaymasterData (userOp: UserOperationStruct): Promise<string | undefined> {
    const data = await this.verifyOp(userOp)
    return this.paymaster + data
  }

  async verifyOp (userOp: UserOperationStruct): Promise<string> {
    return keccak256
  }
}
