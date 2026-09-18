# Security Policy

## The model, because it shapes everything

Susunaku is a static app with **no backend**. It never holds keys, never pools funds and never
takes custody. Keys live in the member's own non-custodial wallet (created via the Pollar SDK
behind an email code); payments are signed locally and submitted to Stellar. The server-side
attack surface of this repository is — by construction — empty.

## Supported versions

Only the latest commit on `master` and the live deployment at
[susunaku.sithunyein.com](https://susunaku.sithunyein.com) are supported.

## Reporting a vulnerability

Open a private security advisory via GitHub (**Security → Report a vulnerability** on this
repository), or email **sithunyein.mailto@gmail.com** with `[susunaku-security]` in the subject.
Please do not open a public issue for anything exploitable.

You will get an acknowledgement within 72 hours and a fix or a mitigation plan within 7 days
for anything that touches money or keys.

## What matters most here

Priority order for reports, highest first:

1. **Anything that makes the app act as a custodian** — key transmission, server-side key
   storage, seed-phrase capture, or a change in where the wallet is created.
2. **Anything that can fake a `paid` state** — a way to make the round view show a contribution
   that the ledger does not contain, or to count one payment twice. Round status is derived
   from Horizon (see `src/lib/useRoundStatus.ts`), so this class is about lying between the
   chain and the UI.
3. **Invite-link integrity** — the whole circle travels in the URL; tampering concerns are
   limited to what an attacker gains by editing it (misdirected payments to *their* address are
   the interesting case).
4. XSS in the static bundle.

## Known limitations, not vulnerabilities

- Testnet only today; mainnet would raise the stakes of everything above.
- The corridor panel links to third-party ramp providers — their KYC and custody are their own.
- The publishable Pollar key ships in the bundle by design; it is a *publishable* key.
