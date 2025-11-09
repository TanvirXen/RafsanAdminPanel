// /lib/upload-image.ts
import apiList from "@/apiList";

// If your apiFetch auto-sets JSON headers, DON'T use it here.
// Use plain fetch so the browser sets multipart boundaries.
export async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(apiList.upload.image, {
    method: "POST",
    body: fd,
    // If your API needs auth cookies or token, add them here:
    // credentials: "include",
    // headers: { Authorization: `Bearer ${token}` }  // if you use header tokens
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Image upload failed");
  }
  return res.json() as Promise<{
    ok: true;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}
