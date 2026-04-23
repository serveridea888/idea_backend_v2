import supabase from "../lib/supabase";
import { randomUUID } from "crypto";

const BUCKET = "images";

export async function uploadImage(
  fileBuffer: Buffer,
  mimeType: string,
  folder: string = "general"
): Promise<string> {
  const extension = mimeType.split("/")[1] || "png";
  const fileName = `${folder}/${randomUUID()}.${extension}`;

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
  const path = publicUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
