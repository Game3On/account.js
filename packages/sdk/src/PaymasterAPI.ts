import { UserOperationStruct } from '@aa-lib/contracts'

/**
 * an API to external a UserOperation with paymaster info
 */
export class PaymasterAPI {
  constructor (
    readonly paymaster: string
  ) {
  }

  /**
   * @param userOp a partially-filled UserOperation (without signature and paymasterAndData
   *  note that the "preVerificationGas" is incomplete: it can't account for the
   *  paymasterAndData value, which will only be returned by this method..
   * @returns the value to put into the PaymasterAndData, undefined to leave it empty
   */
  async getPaymasterAndData (userOp: Partial<UserOperationStruct>): Promise<string | undefined> {
    return this.paymaster
  }
}
