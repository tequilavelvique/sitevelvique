"use client";

import { useSite } from "@/components/providers/SiteProvider";
import { usePass } from "@/lib/chain/hooks";
import { useWalletDoors } from "@/lib/chain/wallet";
import { shortAddress } from "@/lib/media";

/** Address + pass tier, or a quiet connect. Identity is the address; there is no profile. */
export function WalletChip() {
  const { t } = useSite();
  const { tier } = usePass();
  const { address, isConnected, wrongChain, connectWallet, ensureChain, leave, pending } = useWalletDoors();

  if (!isConnected || !address) {
    return (
      <button type="button" className="eyebrow hit" onClick={connectWallet} disabled={pending} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
        {t.wallet.connect}
      </button>
    );
  }

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{shortAddress(address)}</span>
      <span>{t.tiers[String(tier) as keyof typeof t.tiers]}</span>
      {wrongChain ? (
        <button type="button" className="eyebrow hit" onClick={ensureChain} style={{ background: "none", border: 0, cursor: "pointer", padding: 0, color: "var(--bone)" }}>
          {t.wallet.wrong_chain}
        </button>
      ) : null}
      <button type="button" className="eyebrow hit" onClick={leave} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
        {t.wallet.disconnect}
      </button>
    </span>
  );
}
