import { describe, it, expect } from "vitest";
import { isImageFile } from "./isImageFile";

describe("isImageFile", () => {
  it("returns true for common image extensions", () => {
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.JPEG")).toBe(true);
    expect(isImageFile("logo.png")).toBe(true);
    expect(isImageFile("icon.svg")).toBe(true);
    expect(isImageFile("scan.webp")).toBe(true);
    expect(isImageFile("photo.avif")).toBe(true);
    expect(isImageFile("animation.gif")).toBe(true);
  });

  it("returns false for non-image extensions", () => {
    expect(isImageFile("contract.pdf")).toBe(false);
    expect(isImageFile("notes.docx")).toBe(false);
    expect(isImageFile("noextension")).toBe(false);
  });

  it("handles paths with directories, not just bare filenames", () => {
    expect(isImageFile("47560dcc/id/1234_license.png")).toBe(true);
    expect(isImageFile("47560dcc/id/1234_license.pdf")).toBe(false);
  });
});
