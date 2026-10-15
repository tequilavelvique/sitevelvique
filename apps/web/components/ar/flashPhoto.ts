/**
 * Turns a model-viewer frame into an evidence photo: direct-flash falloff, grain,
 * the two-beat caption meme in black boxes, and a timestamp. Composed in memory only.
 */
export async function composeFlashPhoto(frame: Blob, opts: { lines: readonly string[]; stamp: string }): Promise<Blob> {
  const bmp = await createImageBitmap(frame);
  const w = bmp.width;
  const h = bmp.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0);

  // On-camera flash: hot center, hard falloff to black.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(0.45, "rgba(255,255,255,0.04)");
  g.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Grain.
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
  }
  ctx.putImageData(img, 0, 0);

  // Caption meme.
  const cond = getComputedStyle(document.body).getPropertyValue("--font-cond").trim() || "sans-serif";
  const size = Math.round(w * 0.042);
  ctx.font = `500 ${size}px ${cond}, "Barlow Condensed", sans-serif`;
  ctx.textBaseline = "top";
  let y = Math.round(w * 0.04);
  const x = Math.round(w * 0.04);
  for (const line of opts.lines) {
    const pad = Math.round(size * 0.45);
    const tw = ctx.measureText(line).width;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, tw + pad * 2, size + pad * 1.3);
    ctx.fillStyle = "#F4F9FC";
    ctx.fillText(line, x + pad, y + pad * 0.65);
    y += size + pad * 1.3 + 4;
  }

  // Timestamp, bottom right, like a disposable camera date stamp but in brand type.
  ctx.font = `500 ${Math.round(size * 0.6)}px ${cond}, sans-serif`;
  ctx.fillStyle = "rgba(242,236,223,0.85)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`VELVIQUE · ${opts.stamp}`, w - x, h - x);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9));
}
