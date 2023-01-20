import { defaultAbiCoder, hexConcat, hexlify, keccak256 } from 'ethers/lib/utils'
import { UserOperationStruct } from '@aa-lib/contracts'
import { abi as entryPointAbi } from '@aa-lib/contracts/artifacts/IEntryPoint.json'
import { ethers } from 'ethers'
import Debug from 'debug'

const debug = Debug('aa.utils')

// UserOperation is the first parameter of validateUseOp
const validateUserOpMethod = 'simulateValidation'
const UserOpType = entryPointAbi.find(entry => entry.name === validateUserOpMethod)?.inputs[0]
if (UserOpType == null) {
  throw new Error(`unable to find method ${validateUserOpMethod} in EP ${entryPointAbi.filter(x => x.type === 'function').map(x => x.name).join(',')}`)
}

export const AddressZero = ethers.constants.AddressZero

// reverse "Deferrable" or "PromiseOrValue" fields
export type NotPromise<T> = {
  [P in keyof T]: Exclude<T[P], Promise<any>>
}

function encode (typevalues: Array<{ type: string, val: any }>, forSignature: boolean): string {
  const types = typevalues.map(typevalue => typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type)
  const values = typevalues.map((typevalue) => typevalue.type === 'bytes' && forSignature ? keccak256(typevalue.val) : typevalue.val)
  return defaultAbiCoder.encode(types, values)
}

/**
 * pack the userOperation
 * @param op
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function packUserOp (op: NotPromise<UserOperationStruct>, forSignature = true): string {
  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        {
          type: 'address',
          name: 'sender'
        },
        {
          type: 'uint256',
          name: 'nonce'
        },
        {
          type: 'bytes',
          name: 'initCode'
        },
        {
          type: 'bytes',
          name: 'callData'
        },
        {
          type: 'uint256',
          name: 'callGasLimit'
        },
        {
          type: 'uint256',
          name: 'verificationGasLimit'
        },
        {
          type: 'uint256',
          name: 'preVerificationGas'
        },
        {
          type: 'uint256',
          name: 'maxFeePerGas'
        },
        {
          type: 'uint256',
          name: 'maxPriorityFeePerGas'
        },
        {
          type: 'bytes',
          name: 'paymasterAndData'
        },
        {
          type: 'bytes',
          name: 'signature'
        }
      ],
      name: 'userOp',
      type: 'tuple'
    }
    // console.log('hard-coded userOpType', userOpType)
    // console.log('from ABI userOpType', UserOpType)
    let encoded = defaultAbiCoder.encode([userOpType as any], [{
      ...op,
      signature: '0x'
    }])
    // remove leading word (total length) and trailing word (zero-length signature)
    encoded = '0x' + encoded.slice(66, encoded.length - 64)
    return encoded
  }

  const typevalues = (UserOpType as any).components.map((c: { name: keyof typeof op, type: string }) => ({
    type: c.type,
    val: op[c.name]
  }))
  return encode(typevalues, forSignature)
}

/**
 * calculate the userOpHash of a given userOperation.
 * The userOpHash is a hash of all UserOperation fields, except the "signature" field.
 * The entryPoint uses this value in the emitted UserOperationEvent.
 * A wallet may use this value as the hash to sign (the SampleWallet uses this method)
 * @param op
 * @param entryPoint
 * @param chainId
 */
export function getUserOpHash (op: NotPromise<UserOperationStruct>, entryPoint: string, chainId: number): string {
  const userOpHash = keccak256(packUserOp(op, true))
  const enc = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId])
  return keccak256(enc)
}

/**
 * hexlify all members of object, recursively
 * @param obj
 */
export function deepHexlify (obj: any): any {
  if (typeof obj === 'function') {
    return undefined
  }
  if (obj == null || typeof obj === 'string' || typeof obj === 'boolean') {
    return obj
  } else if (obj._isBigNumber != null || typeof obj !== 'object') {
    return hexlify(obj).replace(/^0x0/, '0x')
  }
  if (Array.isArray(obj)) {
    return obj.map(member => deepHexlify(member))
  }
  return Object.keys(obj)
    .reduce((set, key) => ({
      ...set,
      [key]: deepHexlify(obj[key])
    }), {})
}
