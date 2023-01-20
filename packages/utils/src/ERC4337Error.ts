import { defaultAbiCoder, hexConcat, keccak256 } from 'ethers/lib/utils'
import { ethers } from 'ethers'
import Debug from 'debug'

const debug = Debug('aa.utils')

const ErrorSig = keccak256(Buffer.from('Error(string)')).slice(0, 10) // 0x08c379a0
const FailedOpSig = keccak256(Buffer.from('FailedOp(uint256,address,string)')).slice(0, 10) // 0x00fa072b

interface DecodedError {
  message: string
  opIndex?: number
  paymaster?: string
}

/**
 * decode bytes thrown by revert as Error(message) or FailedOp(opIndex,paymaster,message)
 */
export function decodeErrorReason (error: string): DecodedError | undefined {
  debug('decoding', error)
  if (error.startsWith(ErrorSig)) {
    const [message] = defaultAbiCoder.decode(['string'], '0x' + error.substring(10))
    return { message }
  } else if (error.startsWith(FailedOpSig)) {
    let [opIndex, paymaster, message] = defaultAbiCoder.decode(['uint256', 'address', 'string'], '0x' + error.substring(10))
    message = `FailedOp: ${message as string}`
    if (paymaster.toString() !== ethers.constants.AddressZero) {
      message = `${message as string} (paymaster ${paymaster as string})`
    } else {
      paymaster = undefined
    }
    return {
      message,
      opIndex,
      paymaster
    }
  }
}

/**
 * update thrown Error object with our custom FailedOp message, and re-throw it.
 * updated both "message" and inner encoded "data"
 * tested on geth, hardhat-node
 * usage: entryPoint.handleOps().catch(decodeError)
 */
export function rethrowError (e: any): any {
  let error = e
  let parent = e
  if (error?.error != null) {
    error = error.error
  }
  while (error?.data != null) {
    parent = error
    error = error.data
  }
  const decoded = typeof error === 'string' && error.length > 2 ? decodeErrorReason(error) : undefined
  if (decoded != null) {
    e.message = decoded.message

    if (decoded.opIndex != null) {
      // helper for chai: convert our FailedOp error into "Error(msg)"
      const errorWithMsg = hexConcat([ErrorSig, defaultAbiCoder.encode(['string'], [decoded.message])])
      // modify in-place the error object:
      parent.data = errorWithMsg
    }
  }
  throw e
}
