export type UserOperation = {
  sender: string
  nonce: number
  initCode: string
  callData: string
  callGasLimit: number
  verificationGasLimit: number
  preVerificationGas: number
  maxFeePerGas: number
  maxPriorityFeePerGas: number
  paymasterAndData: string
  signature: string
}
