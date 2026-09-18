# Susunaku

**Rotating savings circles where nobody holds the money.**

Each round, every member pays that round's recipient directly, in USDC on Stellar. Nothing is
ever pooled, so there is no custodian, no float and no pot to steal. Round status is read back
from the chain, so "did she pay?" is a fact anyone can check rather than a claim in a notebook.

The name is a blend of two names for the same institution: *susu* (West Africa) and
*pasanaku* (the Andes).

Live at **https://susunaku.sithunyein.com**

---

## Why

A savings circle concentrates everything into one person — organiser, collector, treasurer,
record-keeper. That is a single point of failure as well as a single point of trust: when they
disappear, whoever's turn it was loses everything and the circle dies with them.

The digital tools that exist have mostly rebuilt the notebook (due dates, reminders, reports)
while the cash still lands in someone's hands. Susunaku changes the movement itself:

| | Traditional circle | Susunaku |
|---|---|---|
| Who holds the money | The organiser | Nobody |
| Record of payment | A notebook | The chain |
| A member abroad | Locked out | In the same circle |
| If the organiser leaves | Savings gone | Nothing to take |
| Unit of account | Local currency that drifts | USDC |

## How a round works

1. **Contribute** — every member except the round's recipient pays that recipient, wallet to wallet.
2. **Settle** — USDC on Stellar, ~5 seconds, fraction of a cent. Pollar sponsors the fee.
3. **Verify** — status is derived from Horizon, with a transaction hash per contribution.

Members sign in with Google or an email code. Pollar creates a non-custodial Stellar wallet and
pays the network fee, so no one needs a seed phrase, a browser extension or XLM for gas.

## Quickstart

Requires Node 20+.

```bash
npm install
cp .env.example .env.local     # optional: bake in your key
npm run dev                    # http://localhost:5187
```

The app needs **HTTPS or localhost**: Pollar's auth uses WebCrypto/DPoP, which browsers only
expose in a secure context.

### 1. Get a Pollar key

Create an app at <https://dashboard.pollar.xyz> → **Build → API Keys** and copy the
**publishable** key (`pub_testnet_…`). Testnet keys are issued immediately. Either paste it into
the app once (it is remembered on the device), or set it at build time:

```bash
VITE_POLLAR_PUBLISHABLE_KEY=pub_testnet_xxx
VITE_STELLAR_NETWORK=testnet
```

Add your origin (e.g. `http://localhost:5187` and your production domain) to
**Build → Domains** in the dashboard, or the SDK will refuse the requests.

Never put a `sec_…` key in this repo — secret keys belong on a backend.

### 2. Fund two testnet wallets

A circle needs at least two members, and each member needs their own Stellar address:

```bash
node scripts/make-testnet-account.mjs 2
```

That prints funded testnet addresses (Friendbot gives them XLM). For USDC on testnet use the
[Circle faucet](https://faucet.circle.com/) and send to those addresses, or fund the wallet that
Pollar creates for you once you sign in.

### 3. Create a circle

New circle → amount, cadence, members and their addresses → **Create**. Copy the invite link:
the entire circle (amount, cadence, members, rotation order) travels inside the link, so the
other members just open it. Nothing is registered on a server for a circle to exist.

## Going to mainnet

Real money needs four things, in this order:

1. **Identity verification with Pollar.** Their model verifies the person, not a corporation —
   testnet is instant, mainnet is an automated personal check.
2. A **`pub_mainnet_`** key for your app.
3. `VITE_STELLAR_NETWORK=mainnet` at build time (USDC issuer switches to Circle's mainnet
   asset automatically — see `src/lib/config.ts`).
4. Members funded with real USDC.

The UI refuses a key whose network disagrees with the build, and shows a red warning on mainnet
because contributions are irreversible.

## Deploy

The build is a static bundle, so any static host works.

**Vercel**

```bash
npm run build
npx vercel --prod
```

Then add the domain: Vercel → Project → Settings → Domains → `susunaku.sithunyein.com`. At your
DNS provider add the record Vercel shows you (usually `CNAME susunaku → cname.vercel-dns.com`),
wait for the certificate, and add `https://susunaku.sithunyein.com` to Pollar's allowed domains.

**Static hosts that read a `CNAME` file** (GitHub Pages, Cloudflare Pages) already have
`public/CNAME` set to `susunaku.sithunyein.com`.

## Architecture

```
src/
  lib/
    config.ts          network, USDC issuers, Horizon + explorer URLs, key storage
    circle.ts          circle model, cadences, round maths, velocity maths
    stellar.ts         Horizon lookups; matches a contribution to a round
    pollar.tsx         React gateway over @pollar/core (auth, wallet, balance, payments)
    useRoundStatus.ts  who has paid this round, derived from the chain
    share.ts           circles encoded into invite links (no server registry)
    store.ts           local circle store
  components/          chrome (top bar, rail, footer), artwork, auth panel
  pages/               Home (the round), CreateCircle, JoinCircle, Info
scripts/
  make-testnet-account.mjs   dev helper: mint funded testnet wallets
```

Two design decisions worth knowing:

- **Rounds are never pooled.** The recipient of a round receives N−1 direct payments. This is
  what removes the custodian, and it is also why nothing here needs a licence to hold funds.
- **We do not keep a payment ledger.** `useRoundStatus` asks Horizon what actually moved, and
  matches on sender, recipient, asset, amount and the round's time window — so a payment from
  last round cannot be counted twice.

## What is real, and what is not

Working now: non-custodial wallets behind a Google/email login; real USDC contributions signed by
each member's own wallet; round confirmation from Horizon with explorer receipts; circles shared
entirely by link.

Not solved yet, and stated plainly:

- **Default risk.** If a member never pays, the recipient is short that round. The chain makes
  the defaulter visible; it does not make them pay. Collateral or pre-funded rounds are next.
- **Cash-out** runs through Pollar's ramps (Bolivia, Brazil, Argentina, Mexico today). Mobile
  money in Africa is the corridor we want next.
- No offline/USSD entry point yet — a smartphone is required.
- Circles live in local storage plus the invite link; there is no hosted directory of circles.

Susunaku never takes custody, never pools funds and never guarantees a payout. Anything that
changed that would change the regulatory picture, so it is out of scope on purpose.

## Scripts

```bash
npm run dev         # dev server on :5187
npm run build       # typecheck + production bundle to dist/
npm run typecheck   # tsc --noEmit
npm run preview     # serve the built bundle
```
