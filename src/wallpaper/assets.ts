import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { uid } from '../lib/id';

/** photoId → objectURL のキャッシュ (同じ写真を複数のサムネで使い回す) */
const urlCache = new Map<string, string>();

export function useAssetUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(id ? urlCache.get(id) : undefined);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(undefined);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    db.assets.get(id).then((a) => {
      if (!alive || !a) return;
      const u = URL.createObjectURL(a.blob);
      urlCache.set(id, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

/**
 * 端末の写真を圧縮して IndexedDB に保存 (外部送信なし)。
 * 長辺 1800px / JPEG 0.85 に縮小。
 */
export async function saveImageAsset(file: File, maxSide = 1800): Promise<string> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85),
  );
  const id = uid('img_');
  await db.assets.put({ id, blob, createdAt: Date.now() });
  return id;
}

async function loadBitmap(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch {
      /* fallback below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
