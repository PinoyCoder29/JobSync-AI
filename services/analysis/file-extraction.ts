import { AppError } from "@/lib/errors";

// Vercel-style hosts reject request bodies above ~4.5 MB, so stay under that.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"] as const;
type Ext = (typeof ALLOWED_EXTENSIONS)[number];

function extensionOf(name: string): Ext | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext ?? "") ? (ext as Ext) : null;
}

/** Checks the real file signature, not just the name, so a renamed .exe can't get through. */
function matchesSignature(ext: Ext, bytes: Uint8Array): boolean {
  if (ext === "pdf") return new TextDecoder("latin1").decode(bytes.slice(0, 1024)).includes("%PDF-");
  if (ext === "docx") return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  return !bytes.slice(0, 4096).includes(0); // txt: no NUL bytes
}

export type ExtractedFile = { text: string; ext: Ext; fileName: string };

/** Everything happens in memory. The uploaded file is never written to disk or stored. */
export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  if (!file || file.size === 0) throw new AppError("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new AppError(`The file is too large. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`);

  const ext = extensionOf(file.name);
  if (!ext) {
    const legacy = file.name.toLowerCase().endsWith(".doc");
    throw new AppError(legacy ? "Old .doc files aren't supported. Save it as .docx or PDF and try again." : "Unsupported file type. Upload a PDF, DOCX or TXT file.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(ext, bytes)) throw new AppError(`This doesn't look like a real ${ext.toUpperCase()} file. Please export it again.`);

  try {
    if (ext === "txt") return { text: new TextDecoder("utf-8").decode(bytes), ext, fileName: file.name };

    if (ext === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > 12) throw new AppError("This PDF has too many pages to be a resume (12 max).");
      const { text } = await extractText(pdf, { mergePages: true });
      return { text: Array.isArray(text) ? text.join("\n") : text, ext, fileName: file.name };
    }

    const mammoth = await import("mammoth");
    const extract = (mammoth.extractRawText ?? (mammoth as unknown as { default: typeof mammoth }).default.extractRawText);
    const result = await extract({ buffer: Buffer.from(bytes) });
    return { text: result.value, ext, fileName: file.name };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Text extraction failed:", error);
    throw new AppError("We couldn't read that file. It may be damaged or password-protected. Try another export, or paste the text.");
  }
}
