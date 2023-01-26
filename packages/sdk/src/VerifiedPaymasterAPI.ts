import { defaultAbiCoder, keccak256, hexlify, resolveProperties, arrayify } from 'ethers/lib/utils'
import { Signer } from 'ethers'
import { BasePaymasterAPI } from './BasePaymasterAPI'
import { UserOperationStruct } from '@aa-lib/contracts'

/**
 * an API to external a UserOperation with paymaster info
 */
export class VerifiedPaymasterAPI extends BasePaymasterAPI {
  constructor (
    readonly paymaster: string,
    readonly signer: Signer
  ) {
    super(paymaster)
  }

  async getPaymasterAndData (userOp: UserOperationStruct): Promise<string | undefined> {
    const hash = await this.verifyOp(userOp)
    console.log('hash', hash)

    const sig = await this.signer.signMessage(arrayify(hash))
    console.log('sig', sig, 'signer', await this.signer.getAddress())
    return this.paymaster + sig.substring(2)
  }

  async verifyOp (userOp1: UserOperationStruct): Promise<string> {
    const userOp = await resolveProperties(userOp1)
    const enc = defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        userOp.sender,
        userOp.nonce,
        keccak256(hexlify(userOp.initCode)),
        keccak256(hexlify(userOp.callData)),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas
      ])
    return keccak256(enc)
  }
}
