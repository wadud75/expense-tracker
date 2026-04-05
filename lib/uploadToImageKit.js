export async function uploadToImageKit(
  file,
  { folder = "/shops", fileName = `shop-logo-${Date.now()}` } = {},
) {
  // 1. Get auth params
  const baseUrl =
    typeof window === "undefined" ? process.env.NEXTAUTH_URL || "" : "";
  const authRes = await fetch(`${baseUrl}/api/imagekit-auth`);
  if (!authRes.ok) {
    const errorText = await authRes.text().catch(() => "");
    throw new Error(
      errorText || "Failed to fetch ImageKit authentication parameters",
    );
  }
  const { signature, token, expire, publicKey } = await authRes.json();
  if (!publicKey) {
    throw new Error("ImageKit public key is missing from auth response");
  }

  // 2. Build form data
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("folder", folder);
  formData.append("publicKey", publicKey);
  formData.append("signature", signature);
  formData.append("token", token);
  formData.append("expire", expire);

  // 3. Upload to ImageKit
  const uploadRes = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text().catch(() => "");
    throw new Error(errorText || "ImageKit upload failed");
  }

  return uploadRes.json();
}


