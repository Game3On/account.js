import { defaultAbiCoder, keccak256, hexlify, resolveProperties } from 'ethers/lib/utils'
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

  async getPaymasterAndData (userOp: UserOperationStruct): Promise<string | undefined> {
    const data = await this.verifyOp(userOp)
    return this.paymaster + data
  }

  async verifyOp (userOp1: UserOperationStruct): Promise<string> {
    const userOp = await resolveProperties(userOp1)
    const enc = defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        userOp.sender,
        userOp.nonce,
        keccak256(hexlify(userOp.initCode)),
        keccak256(hexlify(userOp.initCode)),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas
      ])
    return keccak256(enc)
  }
}
