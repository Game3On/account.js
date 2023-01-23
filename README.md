# aa-lib

An extended account abstraction library.

## quick start

Run `preprocess` to compile and run tsc build for each packages, in order to be reference correctly

```bash
pnpm i && pnpm run preprocess
pnpm hardhat-node
pnpm hardhat-deploy --network localhost

pnpm bundler --unsafe
# pnpm runop --deployFactory --network http://127.0.0.1:8545/

pnpm runopweth  # test wethpaymaster
```
