# accountjs

Unified Account Abstraction SDK & Tools
![Logo](./LOGO.png)

## Introduction

Compared to EOA Wallet like Metamask, EIP4337 Contract Wallet has large advantages, such as:

1. No need to keep private key
2. Custom ways to pay for gas
3. Friendly to all users, make mass adoption possible

So we decide to embrace the promising account standard EIP4337 and build unified account abstraction SDK & tools for developers.

## Challenges we ran into

1. Efforts for explorations in new area
2. Difficulty for developing infrastructure

## What accountjs plan to achieve

The values we hold are listed as below: 

1. Create values by providing new tools for abstract account developers and users
2. Open source what we build for mass adoption and improvement by community

We are building sdk which has following functions:

1. EIP4337 Paymaster support which help user transact gaslessly
2. EIP4337 account recovery support to better manage security
3. Implementing unified account standard for account authority management

## What we have built

1. Develop sdk which is:
1.1 easy to use API for dev.
1.2 customize acc contracts
1.3 wrap modules like eoa, paymaster, recovery
2. Wrap sdk into React which provide use base widgets and can be used to connect to wallets
3. Build developer tools like scaffold which help users start app out of the box and friendly to mobile

## Try paymasters

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

## What's next for accountjs

1. Write Tutorials for account abstraction developers
2. Create develper DAO to build togETHer.
