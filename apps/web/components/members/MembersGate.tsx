"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSite } from "@/components/providers/SiteProvider";
import { useMembers } from "@/components/providers/MembersProvider";
import { Edge } from "@/components/bits/Edge";
import { Shiny } from "@/components/bits/Shiny";
import { Pull } from "@/components/bits/Pull";

/**
 * Unlocks one sealed piece of content for holders of the onchain membership.
 * Not signed in or not a member yet: one link to /miembros, where the door (socials or wallet) lives.
 */
export function MembersGate<T>({
  kind,
  id,
  title,
  body,
  children,
}: {
  kind: "article" | "event";
  id: string;
  title: string;
  body: string;
  children: (data: T) => ReactNode;
}) {
  const { t } = useSite();
  const m = t.miembros;
  const { signedIn, tier, open, me } = useMembers();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || tier < 1 || data) return;
    let alive = true;
    open<T>(kind, id)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message === "session_expired" ? m.session_expired : m.error));
    return () => {
      alive = false;
    };
  }, [signedIn, tier, kind, id, open, data, m.error, m.session_expired]);

  if (data) return <>{children(data)}</>;

  return (
    <Edge className="center">
      <span className="badge badge--members" style={{ alignSelf: "center" }}>
        {t.eventos.members_badge}
      </span>
      <h2 className="slab-title">{title}</h2>
      <p className="lede" style={{ maxWidth: "30em", margin: "0 auto" }}>
        {body}
      </p>
      {error ? (
        <p role="alert" className="caption-i" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      {signedIn && me && tier >= 1 ? (
        <span className="eyebrow">
          <Shiny text={m.loading} />
        </span>
      ) : (
        <Pull>
          <Link href="/miembros" className="btn btn--led">
            {m.door_social_t}
          </Link>
        </Pull>
      )}
    </Edge>
  );
}
