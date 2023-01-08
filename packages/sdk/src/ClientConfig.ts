import { PaymasterAPI } from './PaymasterAPI'

export interface ClientConfig {
  entryPointAddress: string
  bundlerUrl: string
  chainId: number
  /**
   * if set, use this pre-deployed wallet.
   * (if not set, use getSigner().getAddress() to query the "counterfactual" address of wallet.
   *  you may need to fund this address so the wallet can pay for its own creation)
   */
  walletAddres?: string
  paymasterAPI?: PaymasterAPI
}
