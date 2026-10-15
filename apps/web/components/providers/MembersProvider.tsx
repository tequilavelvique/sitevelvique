"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { disconnect, signMessage } from "wagmi/actions";
import {
  CDPHooksProvider,
  useCurrentUser,
  useGetAccessToken,
  useIsInitialized,
  useIsSignedIn,
  useLinkOAuth,
  useLinkSiwe,
  useSignInWithOAuth,
  useSignInWithSiwe,
  useSignOut,
  useVerifySiweSignature,
} from "@coinbase/cdp-hooks";
import type { Address } from "viem";
import { CDP_CONNECTOR_ID, cdpConfig, commerceChain, wagmiConfig } from "@/lib/chain/config";

/**
 * Membership session.
 *  - Identity: a Coinbase (CDP) end user. Door 1: Google / Apple / X -> Coinbase smart wallet.
 *    Door 2: your wallet via WalletConnect -> SIWE into CDP -> link socials.
 *  - Membership: VelviqueAccess ERC-1155 held by the member wallet. Starting a session claims it
 *    (server verifies identity + socials with CDP, relayer mints; nothing to sign or pay).
 *  - Our app stores nothing: the CDP access token is fetched from the SDK per request and verified server-side.
 */
export type Social = "google" | "apple" | "x";

export type Me = {
  address: Address | null;
  tier: number;
  boundWallet: Address | null;
  socials: { type: string; username: string | null }[];
  wallets: Address[];
  needsSocial: boolean;
  inviteOnly: boolean;
  configured: boolean;
};

type ClaimResult = "ok" | "needs_social" | "bad_code" | "used_code" | "identity_used" | "not_configured" | "error";

type State = {
  available: boolean;
  ready: boolean;
  signedIn: boolean;
  me: Me | null;
  memberWallet: Address | null;
  busy: "idle" | "signing" | "checking" | "claiming";
  error: string | null;
  lastTx: `0x${string}` | null;
  socialSignIn: (p: Social) => Promise<void>;
  walletSignIn: () => Promise<void>;
  linkSocial: (p: Social) => Promise<void>;
  claim: (code?: string) => Promise<ClaimResult>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  open: <T>(kind: "article" | "event", id: string) => Promise<T>;
  tier: number;
};

const Ctx = createContext<State | null>(null);

export function MembersProvider({ children }: { children: ReactNode }) {
  if (!cdpConfig) return <DisabledMembers>{children}</DisabledMembers>;
  return (
    <CDPHooksProvider config={cdpConfig}>
      <CdpMembers>{children}</CdpMembers>
    </CDPHooksProvider>
  );
}

function CdpMembers({ children }: { children: ReactNode }) {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { getAccessToken } = useGetAccessToken();
  const { signInWithOAuth } = useSignInWithOAuth();
  const { linkOAuth } = useLinkOAuth();
  const { signInWithSiwe } = useSignInWithSiwe();
  const { linkSiwe } = useLinkSiwe();
  const { verifySiweSignature } = useVerifySiweSignature();
  const { signOut: cdpSignOut } = useSignOut();
  const { address: connected, connector } = useAccount();

  const [loadedMe, setMe] = useState<Me | null>(null);
  // Signed out (or CDP still booting) means nobody, whatever was loaded last.
  const me = isInitialized && isSignedIn ? loadedMe : null;
  const meAddress = me?.address ?? null;
  // Wallet door: the wallet the person chose. Kept explicitly because the CDP connector may become wagmi's
  // active connection after SIWE; membership still goes to the wallet they brought.
  const [memberWallet, setMemberWallet] = useState<Address | null>(null);
  const [busy, setBusy] = useState<State["busy"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<`0x${string}` | null>(null);
  const autoClaimed = useRef(false);

  const authed = useCallback(
    async (url: string, body: unknown) => {
      const token = await getAccessToken();
      if (!token) throw new Error("no_token");
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
    },
    [getAccessToken],
  );

  const refresh = useCallback(async () => {
    setBusy("checking");
    setError(null);
    try {
      const r = await authed("/api/members/me", { address: memberWallet ?? undefined });
      if (!r.ok) throw new Error(String(r.data.error ?? "me_failed"));
      setMe(r.data as unknown as Me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("idle");
    }
  }, [authed, memberWallet]);

  // After any sign-in (including the OAuth redirect coming back), load who this is.
  // Syncing with an external system (the CDP session); signed out needs no effect, `me` derives to null above.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on auth change; only the loading flag is synchronous
    if (isInitialized && isSignedIn) void refresh();
  }, [isInitialized, isSignedIn, currentUser?.userId, refresh]);

  const socialSignIn = useCallback(
    async (p: Social) => {
      setError(null);
      await signInWithOAuth(p); // redirects to the provider and back
    },
    [signInWithOAuth],
  );

  const linkSocial = useCallback(
    async (p: Social) => {
      setError(null);
      await linkOAuth(p); // redirects; on return currentUser carries the new method
    },
    [linkOAuth],
  );

  /** Wallet door: SIWE with the connected (AppKit) wallet. Signs in, or links the wallet if already signed in. */
  const walletSignIn = useCallback(async () => {
    if (!connected || connector?.id === CDP_CONNECTOR_ID) return;
    setBusy("signing");
    setError(null);
    try {
      const params = {
        address: connected,
        chainId: commerceChain.id,
        domain: window.location.host,
        uri: window.location.origin,
        statement: "Velvique · miembros. Esta firma no mueve fondos.",
      };
      const flow = isSignedIn ? await linkSiwe(params) : await signInWithSiwe(params);
      const signature = await signMessage(wagmiConfig, { account: connected, message: flow.message });
      await verifySiweSignature({ flowId: flow.flowId, signature });
      setMemberWallet(connected);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("idle");
    }
  }, [connected, connector?.id, isSignedIn, linkSiwe, signInWithSiwe, verifySiweSignature]);

  const claim = useCallback(
    async (code?: string): Promise<ClaimResult> => {
      setBusy("claiming");
      setError(null);
      try {
        const r = await authed("/api/members/mint", { address: meAddress ?? memberWallet ?? undefined, code });
        if (r.ok) {
          if (typeof r.data.txHash === "string") setLastTx(r.data.txHash as `0x${string}`);
          await refresh();
          return "ok";
        }
        const err = String(r.data.error ?? "error");
        setError(err);
        return (["needs_social", "bad_code", "used_code", "identity_used", "not_configured"].includes(err) ? err : "error") as ClaimResult;
      } catch (e) {
        setError((e as Error).message);
        return "error";
      } finally {
        setBusy("idle");
      }
    },
    [authed, meAddress, memberWallet, refresh],
  );

  // Starting a session = getting the membership: claim automatically once eligible (open drops only).
  useEffect(() => {
    if (!me || autoClaimed.current) return;
    if (me.configured && me.address && me.tier === 0 && !me.needsSocial && !me.inviteOnly && !me.boundWallet) {
      autoClaimed.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mint request once eligible; only the loading flag is synchronous
      void claim();
    }
  }, [me, claim]);

  const open = useCallback(
    async <T,>(kind: "article" | "event", id: string): Promise<T> => {
      const r = await authed("/api/members/open", { kind, id, address: meAddress ?? undefined });
      if (r.status === 401) throw new Error("session_expired");
      if (!r.ok) throw new Error(String(r.data.error ?? "open_failed"));
      return r.data as T;
    },
    [authed, meAddress],
  );

  const signOut = useCallback(async () => {
    await cdpSignOut().catch(() => undefined);
    await disconnect(wagmiConfig).catch(() => undefined);
    setMe(null);
    setMemberWallet(null);
    autoClaimed.current = false;
  }, [cdpSignOut]);

  const value = useMemo<State>(
    () => ({
      available: true,
      ready: isInitialized,
      signedIn: isSignedIn,
      me,
      memberWallet,
      busy,
      error,
      lastTx,
      socialSignIn,
      walletSignIn,
      linkSocial,
      claim,
      refresh,
      signOut,
      open,
      tier: me?.tier ?? 0,
    }),
    [isInitialized, isSignedIn, me, memberWallet, busy, error, lastTx, socialSignIn, walletSignIn, linkSocial, claim, refresh, signOut, open],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const noop = async () => undefined;

/** NEXT_PUBLIC_CDP_PROJECT_ID not set: the members door renders, explains, and does nothing. */
function DisabledMembers({ children }: { children: ReactNode }) {
  const value = useMemo<State>(
    () => ({
      available: false,
      ready: true,
      signedIn: false,
      me: null,
      memberWallet: null,
      busy: "idle",
      error: "not_configured",
      lastTx: null,
      socialSignIn: noop,
      walletSignIn: noop,
      linkSocial: noop,
      claim: async () => "not_configured",
      refresh: noop,
      signOut: noop,
      open: async () => {
        throw new Error("not_configured");
      },
      tier: 0,
    }),
    [],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMembers(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMembers outside MembersProvider");
  return v;
}
