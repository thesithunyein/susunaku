# Contributing to Susunaku

Thanks for wanting to help. This is young software with real ambitions — a savings circle
where nobody holds the money — and a small, opinionated codebase. Here is how to work in it.

## Setup

```bash
git clone https://github.com/thesithunyein/susunaku && cd susunaku
npm install
cp .env.example .env.local    # optional; the key can also be pasted in the UI
npm run dev                   # http://localhost:5187
```

You will want two testnet wallets to test a round:

```bash
npm run member:new -- TestUser        # funded wallet with a USDC trustline
npm run fund:gas -- G...ADDRESS 5     # XLM for network fees
```

## The rules of the road

1. **The app never takes custody.** No PR may introduce server-side key storage, pooled
   balances, or an operator-held float. This is the architecture's whole point and it is not
   up for trade. If your idea seems to need it, the idea needs reworking — open an issue and
   make the case.
2. **Round status comes from the chain.** `useRoundStatus` derives "who has paid" from Horizon.
   Do not add a database table that mirrors it; do not cache a paid state across rounds.
3. **Claims get checked.** Anything the README or UI says about fees, ramps or the SDK must
   match what the code does. The `What is real, and what is not` section exists so a reader
   never has to guess — keep it true.
4. **Match the design language.** Flat, type-driven, no drop shadows, no new colours. Ink
   `#080909` on `#f0eefa`, Epilogue Black for headings, DM Sans for everything else.
5. **Testnet first.** Features that move money get built and demonstrated on testnet. Mainnet
   is a deployment decision, not a code path.

## Before you open the PR

```bash
npm run typecheck   # tsc --noEmit, must be clean
npm run build       # must succeed
```

Then describe in the PR: what changed, why, and what you tested on the ledger. A screenshot is
worth a thousand words; an explorer link to a test transaction is worth ten thousand.

## Good first issues

- Corridor legs: researching and documenting additional African mobile-money rails in
  `src/lib/corridor.ts` (labelled `designed` — honest labelling is the format).
- Accessibility passes on the round view.
- Translations of the member-facing strings.
