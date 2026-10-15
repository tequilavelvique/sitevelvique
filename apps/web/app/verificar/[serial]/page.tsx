import type { Metadata } from "next";
import { verifySerial } from "@/lib/chain/server";
import { VerifyResult } from "@/components/verify/VerifyResult";

export const metadata: Metadata = { title: "Verificar", robots: { index: false } };
export const revalidate = 30;

/** `/verificar/[serial]`: the bottle QR lands here. Public authenticity check + digital twin claim. */
export default async function Page({ params }: { params: Promise<{ serial: string }> }) {
  const { serial: raw } = await params;
  const serial = decodeURIComponent(raw).trim().slice(0, 64);
  const res = await verifySerial(serial).catch(() => null);

  return (
    <VerifyResult
      serial={serial}
      deployed={res !== null}
      registered={Boolean(res?.registered)}
      orderId={res?.registered ? res.bottle.orderId.toString() : null}
      owner={res?.registered && res.bottle.owner !== "0x0000000000000000000000000000000000000000" ? res.bottle.owner : null}
      claimedAt={res?.registered ? Number(res.bottle.claimedAt) : 0}
    />
  );
}
