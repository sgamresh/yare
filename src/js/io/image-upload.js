import { setBusinessImage, setFooterImage } from "../actions/invoice-actions.js";

const DEFAULT_ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
];

export function readImageFileAsDataUrl(
  file,
  {
    maxSizeBytes = 5 * 1024 * 1024,
    allowedTypes = DEFAULT_ALLOWED_IMAGE_TYPES
  } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided."));
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      reject(
        new Error(
          `Unsupported image type '${file.type || "unknown"}'. Allowed: ${allowedTypes.join(
            ", "
          )}.`
        )
      );
      return;
    }
    if (file.size > maxSizeBytes) {
      reject(
        new Error(
          `Image is too large (${file.size} bytes). Maximum allowed is ${maxSizeBytes} bytes.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: String(reader.result || ""),
        mimeType: file.type || "",
        fileName: file.name || ""
      });
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export async function setBusinessLogoFromFile(store, file, options) {
  const imagePayload = await readImageFileAsDataUrl(file, options);
  setBusinessImage(store, imagePayload);
  return imagePayload;
}

export async function setSignatureFromFile(store, file, options) {
  const imagePayload = await readImageFileAsDataUrl(file, options);
  setFooterImage(store, "signatureImage", imagePayload);
  return imagePayload;
}

export async function setStampFromFile(store, file, options) {
  const imagePayload = await readImageFileAsDataUrl(file, options);
  setFooterImage(store, "stampImage", imagePayload);
  return imagePayload;
}
