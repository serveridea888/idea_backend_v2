import supabase from "../lib/supabase";
import { randomUUID } from "crypto";

const BUCKET = "images";
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sanitizeFolder(folder: string) {
  const normalized = folder
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.{2,}/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalized || normalized.length > 60) {
    return "general";
  }

  return normalized;
}

export async function uploadImage(
  fileBuffer: Buffer,
  mimeType: string,
  folder: string = "general"
): Promise<string> {
  const extension = MIME_TO_EXTENSION[mimeType];

  if (!extension) {
    throw new Error("Unsupported file type");
  }

  const safeFolder = sanitizeFolder(folder);
  const fileName = `${safeFolder}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  return data.publicUrl;
}

export async function deleteImage(publicUrl: string): Promise<void> {
  let path = "";

  try {
    const parsed = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) return;

    path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return;
  }

  if (!path || path.includes("..")) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
