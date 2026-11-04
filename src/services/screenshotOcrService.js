import { createWorker } from "tesseract.js";

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 4000;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Remove an explicitly labelled test-fixture footer from OCR output.
 * Ordinary message text (including genuine warnings such as "do not pay")
 * is preserved. Only the known fixture marker and everything after it are
 * excluded from scam assessment.
 */
export function cleanScreenshotOcrText(value) {
  const text = String(value || "").replace(/\r\n?/g, "\n");
  const markers = [
    /\bOCR\s+TEST\s+FIXTURE\b/i,
    /\bNOT\s+A\s+REAL\s+MESSAGE\b(?=[\s\S]{0,120}\bDO\s+NOT\s+PAY\b)/i
  ];
  const positions = markers
    .map(pattern => pattern.exec(text)?.index)
    .filter(index => Number.isInteger(index));
  const cutoff = positions.length ? Math.min(...positions) : text.length;
  return text.slice(0, cutoff).trim();
}



/**
 * Extract visible text locally in the browser. The screenshot is not uploaded.
 * English and Bangla language data are downloaded by Tesseract.js on first use.
 */
export async function extractScreenshotText(file, {
  onProgress = () => {},
  workerFactory = createWorker
} = {}) {
  if (!file || !SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Upload a PNG, JPG, or WebP screenshot.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Screenshot must be larger than 0 bytes and 2.5 MB or smaller.");
  }

  let worker;
  try {
    worker = await workerFactory("eng+ben", 1, {
      logger: (message) => {
        if (message?.status === "recognizing text" && Number.isFinite(message.progress)) {
          onProgress(Math.max(0, Math.min(100, Math.round(message.progress * 100))));
        }
      }
    });
    const result = await worker.recognize(file);
    const extractedText = String(result?.data?.text || "").trim().slice(0, MAX_TEXT_LENGTH);
    if (!extractedText) {
      throw new Error("No readable message text was found. Try a clearer screenshot or paste the text.");
    }
    return extractedText;
  } catch (error) {
    if (error instanceof Error && /No readable message text/.test(error.message)) throw error;
    throw new Error("Screenshot reading could not start. Check your internet connection and try again, or paste the message text.");
  } finally {
    if (worker?.terminate) {
      try { await worker.terminate(); } catch { /* Keep the OCR result/error. */ }
    }
  }
}
