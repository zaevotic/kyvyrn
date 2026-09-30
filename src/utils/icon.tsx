export async function tryFaviconIco(url: string): Promise<string | null> {
  try {
    const icoUrl = new URL("/favicon.ico", url).toString();
    const res = await fetch(icoUrl, { method: "HEAD" });
    if (res.ok) return icoUrl;
  } catch {}
  return null;
}

export async function fetchManifestIcon(url: string): Promise<string | null> {
  try {
    const res = await fetch(new URL("/manifest.json", url).toString());
    const manifest = await res.json();

    if (manifest.icons?.length) {
      return manifest.icons
        .sort(
          (a: any, b: any) =>
            parseInt(b.sizes) - parseInt(a.sizes)
        )[0].src;
    }
  } catch {}
  return null;
}

export async function fetchFavicon(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");

    const icon =
      doc.querySelector('link[rel="apple-touch-icon"]') ||
      doc.querySelector('link[rel="icon"]');

    return icon?.getAttribute("href") || null;
  } catch {
    return null;
  }
}

export function generateLetterIcon(name: string): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#4f46e5";
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = "white";
    ctx.font = "bold 256px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name[0].toUpperCase(), 256, 300);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, "image/png");
  });
}
