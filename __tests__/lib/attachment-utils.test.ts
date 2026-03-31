import { describe, it, expect } from "vitest";
import { parseDriveFileId, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/attachment-utils";

describe("parseDriveFileId", () => {
  it("extracts ID from /file/d/{id}/view URL", () => {
    expect(
      parseDriveFileId("https://drive.google.com/file/d/ABC123_-x/view")
    ).toBe("ABC123_-x");
  });

  it("extracts ID from /document/d/{id}/edit URL", () => {
    expect(
      parseDriveFileId("https://docs.google.com/document/d/DOC456/edit")
    ).toBe("DOC456");
  });

  it("extracts ID from /spreadsheets/d/{id}/edit URL", () => {
    expect(
      parseDriveFileId("https://docs.google.com/spreadsheets/d/SHEET789/edit")
    ).toBe("SHEET789");
  });

  it("extracts ID from /presentation/d/{id}/edit URL", () => {
    expect(
      parseDriveFileId("https://docs.google.com/presentation/d/PRES000/edit")
    ).toBe("PRES000");
  });

  it("extracts ID from ?id= query param URL", () => {
    expect(
      parseDriveFileId("https://drive.google.com/open?id=QPARAM123")
    ).toBe("QPARAM123");
  });

  it("returns null for unrecognized URL", () => {
    expect(parseDriveFileId("https://example.com/not-a-drive-url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDriveFileId("")).toBeNull();
  });
});

describe("constants", () => {
  it("ALLOWED_MIME_TYPES includes pdf", () => {
    expect(ALLOWED_MIME_TYPES).toContain("application/pdf");
  });

  it("MAX_FILE_SIZE is 25MB", () => {
    expect(MAX_FILE_SIZE).toBe(25 * 1024 * 1024);
  });
});
