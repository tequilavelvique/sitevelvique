"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { getPublicClient, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { accessAbi, ROLES } from "@velvique/contracts";
import { useSite } from "@/components/providers/SiteProvider";
import { commerceChain, wagmiConfig } from "@/lib/chain/config";
import { env, explorer } from "@/lib/env";
import { shortAddress } from "@/lib/media";
import { Row, Select, Status, TextField } from "./fields";

type Holder = { address: Address; tier: number };

/**
 * The members list is the chain: holders of VelviqueAccess, read from PassMinted / PassRevoked logs and
 * re-checked with passOf. Grant (upgrade) and revoke run from the connected admin wallet, which needs ADMIN_ROLE
 * (in production that is the Safe; this panel then shows the role warning and the Safe does it).
 */
export function MembersAdmin({ admin }: { admin: Address }) {
  const { t } = useSite();
  const a = t.admin;
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [target, setTarget] = useState("");
  const [tier, setTier] = useState<"1" | "2" | "3">("2");
  const [state, setState] = useState("idle");

  const load = useCallback(async () => {
    if (!env.access) return;
    const pc = getPublicClient(wagmiConfig, { chainId: commerceChain.id });
    if (!pc) return;
    const [minted, role, total] = await Promise.all([
      pc.getContractEvents({ address: env.access, abi: accessAbi, eventName: "PassMinted", fromBlock: env.deployBlock, toBlock: "latest" }),
      pc.readContract({ address: env.access, abi: accessAbi, functionName: "hasRole", args: [ROLES.ADMIN, admin] }),
      pc.readContract({ address: env.access, abi: accessAbi, functionName: "memberCount" }),
    ]);
    const unique = [...new Set(minted.map((l) => l.args.holder).filter((x): x is Address => Boolean(x)))];
    const tiers = await Promise.all(unique.map((h) => pc.readContract({ address: env.access!, abi: accessAbi, functionName: "passOf", args: [h] })));
    setHolders(unique.map((h, i) => ({ address: h, tier: Number(tiers[i]) })).filter((h) => h.tier > 0).reverse());
    setHasRole(role);
    setCount(Number(total));
  }, [admin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chain read on mount; state lands after the RPC calls
    load().catch((e: Error) => setState(e.message));
  }, [load]);

  const run = async (fn: "grant" | "revoke", who: Address, tr: number) => {
    if (!env.access) return;
    setState("saving");
    try {
      const hash = await writeContract(wagmiConfig, { address: env.access, abi: accessAbi, functionName: fn, args: [who, tr], chainId: commerceChain.id });
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: commerceChain.id });
      await load();
      setState("saved");
    } catch (e) {
      setState((e as Error).message.split("\n")[0] ?? "error");
    }
  };

  if (!env.access) return <p className="lede">{a.members_not_deployed}</p>;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="kv">
        <div>
          <span className="eyebrow">{a.members_count}</span>
          <span className="v">{count ?? "…"}</span>
        </div>
        <div>
          <span className="eyebrow">ERC-1155</span>
          <a className="v" href={`${explorer}/address/${env.access}`} target="_blank" rel="noreferrer" style={{ fontSize: 16 }}>
            {shortAddress(env.access)}
          </a>
        </div>
      </div>

      {hasRole === false ? <p className="caption-i">{a.members_role_missing}</p> : null}

      <Row>
        <TextField label="0x…" value={target} onChange={setTarget} placeholder="0x0000…" />
        <Select label={a.members_tier} value={tier} options={(["1", "2", "3"] as const).map((v) => ({ value: v, label: t.tiers[v] }))} onChange={setTier} />
      </Row>
      <Status state={state} labels={{ saving: a.saving, saved: a.saved, error: a.error }} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn btn--led" disabled={!hasRole || !isAddress(target) || state === "saving"} onClick={() => run("grant", target as Address, Number(tier))}>
          {a.members_add}
        </button>
        <button type="button" className="btn" disabled={!hasRole || !isAddress(target) || state === "saving"} onClick={() => run("revoke", target as Address, Number(tier))}>
          {a.members_remove}
        </button>
      </div>

      <div className="stack" style={{ gap: 0 }}>
        {(holders ?? []).map((h) => (
          <div key={h.address} className="hairline-top" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, padding: "12px 0", alignItems: "center" }}>
            <a href={`${explorer}/address/${h.address}`} target="_blank" rel="noreferrer" className="cond" style={{ letterSpacing: ".08em" }}>
              {h.address}
            </a>
            <span className="eyebrow">{t.tiers[String(h.tier) as keyof typeof t.tiers]}</span>
            <button type="button" className="eyebrow hit" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setTarget(h.address)}>
              {a.edit}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
