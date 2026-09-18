import { useCallback, useEffect, useState } from "react";
import { USDC_ISSUER_ACTIVE } from "./config";
import {
  contributorsOf,
  currentRound,
  recipientOf,
  roundWindow,
  type Circle,
  type Member,
} from "./circle";
import { verifyContribution, type ChainPayment } from "./stellar";

export type MemberState = "receiving" | "paid" | "due" | "no-wallet" | "checking" | "unreachable";

export interface MemberRoundStatus {
  member: Member;
  state: MemberState;
  payment: ChainPayment | null;
  detail?: string;
}

export interface RoundStatus {
  round: number;
  recipient: Member | undefined;
  statuses: MemberRoundStatus[];
  loading: boolean;
  checkedAt: number | null;
  refresh: () => void;
}

/**
 * Who has paid this round is not something we keep track of — we ask Stellar.
 * Each contributor's outgoing payments are matched against the recipient,
 * the USDC asset and the round's time window.
 */
export function useRoundStatus(circle: Circle | null, roundOverride?: number): RoundStatus {
  const round = circle ? roundOverride ?? currentRound(circle) : 0;
  const [statuses, setStatuses] = useState<MemberRoundStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!circle) {
      setStatuses([]);
      return;
    }
    const recipient = recipientOf(circle, round);
    const contributors = contributorsOf(circle, round);
    const window = roundWindow(circle, round);
    const before = Math.max(window.start, Math.min(window.end, Date.now()));

    setLoading(true);
    setStatuses(
      contributors.map((member) => ({ member, state: "checking", payment: null }))
    );

    const results = await Promise.all(
      contributors.map(async (member): Promise<MemberRoundStatus> => {
        if (!member.address) {
          return { member, state: "no-wallet", payment: null };
        }
        if (!recipient?.address) {
          return { member, state: "unreachable", payment: null, detail: "Recipient has no wallet" };
        }
        const lookup = await verifyContribution({
          from: member.address,
          to: recipient.address,
          minAmount: circle.amountUsdc,
          assetIssuer: USDC_ISSUER_ACTIVE,
          after: window.start,
          before,
          network: circle.network,
        });
        if (lookup.status === "found") {
          return { member, state: "paid", payment: lookup.payment };
        }
        if (lookup.status === "unknown-account") {
          return { member, state: "no-wallet", payment: null, detail: "Wallet not funded yet" };
        }
        if (lookup.status === "error") {
          return { member, state: "unreachable", payment: null, detail: lookup.message };
        }
        return { member, state: "due", payment: null };
      })
    );

    const withRecipient: MemberRoundStatus[] = [];
    if (recipient) {
      withRecipient.push({ member: recipient, state: "receiving", payment: null });
    }
    setStatuses([...withRecipient, ...results]);
    setCheckedAt(Date.now());
    setLoading(false);
  }, [circle, round]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return {
    round,
    recipient: circle ? recipientOf(circle, round) : undefined,
    statuses,
    loading,
    checkedAt,
    refresh: () => void refresh(),
  };
}
