import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readOrder, readSku } from "@/lib/chain/server";
import { OrderView } from "@/components/order/OrderView";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };
export const revalidate = 15;

/**
 * `/pedido/[id]`: the order page is a filtered event read. Struct from `getOrder`,
 * timeline from `OrderStatus` logs bounded by the order's creation block.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) notFound();
  const res = await readOrder(BigInt(id));
  if (!res) notFound();
  const sku = await readSku(res.order.skuId);

  return (
    <OrderView
      order={{
        ...res.order,
        id: res.order.id.toString(),
        skuId: res.order.skuId.toString(),
        createdBlock: res.order.createdBlock.toString(),
        createdAt: Number(res.order.createdAt),
        amount: res.order.amount.toString(),
      }}
      skuMetaURI={sku?.metadataURI ?? null}
      history={res.history.map((h) => ({ ...h, blockNumber: h.blockNumber.toString() }))}
    />
  );
}
