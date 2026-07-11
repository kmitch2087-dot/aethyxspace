const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);

export function isImageFile(fileName: string): boolean {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}
