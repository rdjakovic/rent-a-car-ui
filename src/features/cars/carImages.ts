/** Limits shared with the backend's CarImageService: at most 5 photos, 5 MB each, JPEG/PNG/WebP. */
export const MAX_CAR_IMAGES = 5
export const MAX_CAR_IMAGE_BYTES = 5 * 1024 * 1024
export const CAR_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp"
export const CAR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** The browser sometimes leaves the type empty; fall back to the extension. */
function looksLikeImage(file: File): boolean {
  if (file.type) return (CAR_IMAGE_TYPES as readonly string[]).includes(file.type)
  return /\.(jpe?g|png|webp)$/i.test(file.name)
}

/** Returns why the files can't be added, or null when they can. `already` is the current selection's size. */
export function validateCarImageFiles(files: File[], already = 0): string | null {
  if (already + files.length > MAX_CAR_IMAGES) {
    return `You can add up to ${MAX_CAR_IMAGES} images per car`
  }
  for (const file of files) {
    if (!looksLikeImage(file)) {
      return `${file.name}: choose a JPEG, PNG or WebP image`
    }
    if (file.size === 0) {
      return `${file.name}: the file is empty`
    }
    if (file.size > MAX_CAR_IMAGE_BYTES) {
      return `${file.name}: ${formatFileSize(file.size)} is over the ${formatFileSize(MAX_CAR_IMAGE_BYTES)} limit`
    }
  }
  return null
}
