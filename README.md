# aa-lib

An extended account abstraction library.

## quick start

Run `preprocess` to compile and run tsc build for each packages, in order to be reference correctly

SDK updated

```bash
pnpm i && pnpm run preprocess
pnpm hardhat-node
pnpm hardhat-deploy --network localhost

pnpm bundler --unsafe
pnpm runop --deployFactory          # run op without paymaster
pnpm runopweth  --deployFactory     # run op with wethpaymaster
pnpm runopusdt  --deployFactory     # run op with usdpaymaster
pnpm runopfixed  --deployFactory    # run op with fixedspaymaster
pnpm runopgasless  --deployFactory    # run op with verifyingpaymaster
```
