# Susunaku — a savings circle with no pot to steal

**Live:** https://susunaku.sithunyein.com · **Code:** https://github.com/thesithunyein/susunaku
**Demo video:** https://youtu.be/l380nz3cRFg (90-second walkthrough: the round, the ledger receipt, the pay flow, the verify script)
**Built on:** Pollar SDK (`@pollar/core` v0.11.3) · Stellar · USDC (Circle testnet)
**Verified payments:** [`396c6095…bbccbde3`](https://stellar.expert/explorer/testnet/tx/396c6095613fa1f04b695560dee4537bd2df19dc39293eef8939883cbbccbde3) · ledger 4738198 · `payment` · 1.0000000 USDC — recorded in this document's evidence section. A second and third live payment ([`116cfa09…eeba9ab`](https://stellar.expert/explorer/testnet/tx/116cfa097b6470f63114d642c9af99e526911b85842eb6570f037393aeeba9ab), [`2999d51d…721f0099`](https://stellar.expert/explorer/testnet/tx/2999d51d09d48c0dd4758e0a5f39ad0a9f10d2dc5933a3388e3838ec721f0099) — sent while testing and recording the demo) also reconcile on the ledger; the evidence section below documents the first in full.

---

## The four questions

**1 · Who has the problem?**
Members of rotating savings circles — *susu* in Ghana, *ajo/esusu* in Nigeria, *chama* in Kenya,
*stokvel* in South Africa, *iqub* in Ethiopia, *committee* in Pakistan. South Africa alone has
**800,000+ stokvels with ~11 million members** (about one in four adults) turning over an estimated
**R50 billion (~$2.9bn) a year**.

**2 · What is the problem?**
Every circle has one weak point: **one person holds the pooled cash and keeps the notebook.** When
that person disappears, whoever's turn it was loses everything and the circle dies with them. The
risk is not abstract — it is the reason people stop joining.

**3 · What did you build?**
A rotating savings circle on Stellar where **no money is ever pooled**. Each round, every member
pays the round's recipient *directly*, wallet to wallet, in USDC — through a wallet Pollar creates
from an email login. There is no treasury address in the product, and the panel that says so reads
`$0.00` because it is true.

**4 · Why is it meaningfully better?**
Every digital attempt at this so far rebuilt the notebook and added a custodian — the leading
Nigerian Ajo app advertises **"licensed escrow."** Susunaku removes the vault instead:

- **There is nothing to run away with**, so there is no counterparty risk, in any round.
- **No pooled balance means no float to hold**, so the operator never custodies anyone's money.
- **Round status is derived from the chain, not our database** — "who has paid" is verified against
  Horizon, so a member never has to trust the organiser *or* us.
- **A member's wallet is their own.** We proved a plain Stellar account — not a Pollar wallet — can
  receive a contribution, so nobody is locked in.

---

## Against the judging criteria

### 1 · A working end-to-end payment flow — ✅ verified on the ledger

Not a mock, and not the app's own success message. The flow was executed and then read back from
Stellar Horizon by a script in the repo:

```
2026-09-18T06:56:17Z   1.0000000 USDC
  from      GAVLIXEE…XUTG4P   (payer, created by Pollar at login)
  to        GC2GNEWF…VJHZAW   (recipient, a plain Stellar account)
  op type   payment
  issuer    GBBD47IF…FLA5     (Circle testnet USDC)
  tx        396c6095613fa1f04b695560dee4537bd2df19dc39293eef8939883cbbccbde3
  ledger    4738198
  balances  payer 20.0000000 → 19.0000000 · recipient 0.0000000 → 1.0000000
  fee       0.00001 XLM
```

`npm run verify:leg -- <payer> <recipient> <amount>` re-runs that check on demand and **exits
non-zero unless all four conditions hold**: both accounts exist, a matching payment exists, the
asset is USDC from the expected issuer at the expected amount, and the recipient's balance
reconciles exactly with what it received. The app also surfaces the round as `1/1 paid` and links
the receipt to Stellar Expert.

Money *in* and *out* is a first-class surface too: the wallet panel reads the corridors Pollar can
actually execute (`getRampCountries`) and quotes them live (`getRampsQuote`) — the same calls the
ramp modal uses — so a member can see how they would fund or cash out without leaving the circle.

### 2 · SDK integration quality — ✅ and where it fell short, it is documented

Capabilities exercised: **auth** (email OTP, `beginEmailLogin` → `sendEmailCode` → `verifyEmailCode`),
**wallets** (`getWallets`), **balances** (`refreshBalance`), **assets/trustlines**
(`refreshAssets`, `setTrustline`), **payments** (`runTx('payment')`), **ramps**
(`getRampCountries`, `getRampsQuote`).

Four real integration problems were found, diagnosed against the SDK's own source, and fixed —
these are the substance of the integration, and each is in the commit history:

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 1 | **A wallet cannot receive USDC without a trustline**, and login does not always leave the client knowing it has one | Pollar docs: *"Trustlines are a separate step"*; a stale `trustlineEstablished: false` would re-create an existing trustline | Submit first; repair only when a submission genuinely fails on a missing trustline |
| 2 | **A Stellar payment's fee is not sponsored by Pollar.** `runTx` refused client-side with *"Not enough XLM to cover the network fee"*, and **nothing reached the ledger** | Build options are only `{timeoutSec, memo, maxFeeStroops}`; sponsorship is a separate operator setting | Read the native balance, warn *before* the click, and correct copy that claimed the fee was covered |
| 3 | **The cached asset state conflates "loading", "failed" and "absent"** — so a transient fetch told members *"USDC is not enabled for this app"* and blocked a payment the ledger would have accepted | `refreshAssets()` sets `step: 'error'` for both a failed fetch and a missing session | Distinguish `unknown` from `absent`; never gate a payment on a client cache |
| 4 | **Google sign-in is unavailable on this app** — `APPLICATION_HAS_NO_REDIRECT_URIS` | The dashboard's Authentication page is an explicit *"coming soon"* stub, so there is no per-app redirect URI to set | Email OTP is the supported path; the limitation is stated in the app |

The result is a client that fails *informatively*: every refusal names its own cause, and the one
remaining assumption (that a payment is a plain `payment` op) was checked rather than hoped for.

### 3 · Proof of real usage — ⚠️ real, but not yet social

Proven: a real Pollar user wallet was created server-side at login, **fully sponsored**
(`starting_balance: "0.0000000"`, funding wallet `num_sponsoring` 0 → 3, so the user paid nothing to
exist), a real USDC trustline was established, and a real USDC payment settled between two
wallets — all independently verifiable on Horizon.

Not yet proven, and worth saying plainly: the recipient in that first round was a **testnet account
created by a dev script**, not a second human. The mechanic is verified end to end; the *social*
version of the proof — two people, their own logins, a full round each way — is the next step, and
the invite link already carries the whole circle (amount, cadence, members, rotation) with no
sign-up required to view it.

### 4 · Project clarity — ✅

One sentence: **susu without the cash box.** The live site says the same thing in its first
paragraph, shows `$0.00` held, and ships a receipt link for every contribution.

---

## The corridor: Africa ⇄ Latin America

The flagship challenge asks for the African leg. Here is the honest state of it.

**What exists today.** Every ramp Pollar can execute is Latin American: **Stereum** for Bolivia
(BOB, buy by bank QR, sell to a bank account — the ramp the Latin side runs on), **Bridge** and
**PagFinance** and **Abroad Finance** for Brazil (Pix), **Abroad Finance** for Colombia (BreB),
**Etherfuse** for Mexico (SPEI), and **Anclap** as a SEP-24 escape hatch to any anchor. **No African
corridor exists in the SDK.**

**What is designed.** A circle whose members are in Africa and whose recipient is in Bolivia:

```
Akosua (Ghana)      Tunde (Nigeria)        →   Yuki (Bolivia)
   │  mobile money      │  mobile money        │
   ▼                    ▼                      ▼
 partner ramp API ────────────────► USDC on Stellar ──────────────► BOB ramp
 (M-Pesa / MoMo / Airtel)            (the circle settles here)      (Stereum, bank payout)
```

- **The African leg** rides a stablecoin ramp API that already reaches mobile money and bank rails
  across African markets (candidates with public coverage: **Eversend**, 18 markets, payouts to
  M-Pesa / MTN MoMo / Airtel Money / bank; **Yativo**, 20 markets). The integration shape is the
  same one Pollar already uses for its SEP-24 adapter — a different partner, not a different design.
- **The semi-manual fallback** the brief explicitly allows: the organiser's own float covers a
  member's contribution in USDC and settles in local cash the same day. This is what susu
  collectors already do; the difference is that the ledger now records it.
- **Why the circle survives the corridor:** payer and recipient never share a currency or a bank,
  only an asset. That is the whole reason a Ghana↔Bolivia circle is possible at all — and it is
  also why the missing African leg is the single most valuable thing anyone could add here.

The app labels every leg **live** or **designed**, and reads its own live corridors from the SDK
rather than hardcoding them — an empty list is displayed as the real answer it is.

---

## What is real, and what is not

**Real:** the deployment, the domain, the design; Pollar auth; server-created sponsored wallets;
trustlines; two live ramp SDK calls; a settled USDC payment verified against Horizon by a script
that fails loudly; invitation links that carry a whole circle.

**Not real yet — stated so nobody has to discover it:** settlement runs on **testnet**, so the money
is a rehearsal, not income; one of the two members was a wallet we minted; **no African rail is
wired**; there is no KYC or fiat off-ramp for the members who most need one; a circle lives in a
browser plus its share link rather than a server; and Google login is unavailable on this app
because the provider configuration is still a stub in the dashboard.

## Verify it yourself in two minutes

```bash
git clone https://github.com/thesithunyein/susunaku && cd susunaku
npm install
npm run verify:leg -- GAVLIXEENYE2Z4VNTVMTGG5WYZKBDXKIIBNOUOPDFYXZSP3TZEXUTG4P \
                      GC2GNEWFTVDTNRUFL2UD7G4ZBGEXA3U45ESBPBLBUN324IU4HJVJHZAW 1
# exits 0 only if the payment is on the ledger and the balances reconcile
```

Or open the transaction on
[Stellar Expert](https://stellar.expert/explorer/testnet/tx/396c6095613fa1f04b695560dee4537bd2df19dc39293eef8939883cbbccbde3).

## Next, in order

1. **A second human, their own login, one full round** — the social proof behind the mechanic.
2. **Mainnet** (no approval required; a separate app, `pub_mainnet_` key, funded funding + gas
   wallets) so USDC stops being a rehearsal.
3. **The African leg** — one partner ramp wired in, which is the difference between a circle that
   works and a circle that works *for the people in the problem statement*.
