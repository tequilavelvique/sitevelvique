import Link from "next/link";

export default function NotFound() {
  return (
    <main className="gutter stack center" style={{ minHeight: "100svh", justifyContent: "center", alignItems: "center", gap: 28 }}>
      <div className="eyebrow">6:40 AM</div>
      <h1 className="display display--md">Nadie recuerda esta parte.</h1>
      <p className="caption-i" style={{ margin: 0 }}>
        Nobody remembers this part.
      </p>
      <Link href="/" className="btn">
        La Noche
      </Link>
    </main>
  );
}
