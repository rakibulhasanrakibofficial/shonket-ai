import { extractScreenshotText } from "./screenshotOcrService.js";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const retryAfter = Number(data.retryAfterSeconds);
    const errorMessage = String(data.error || "Could not check this message. Please try again.");
    throw new Error(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? `${errorMessage} Retry after about ${retryAfter} seconds.`
        : errorMessage
    );
  }
  return data;
}

export async function analyzeMessage({
  message,
  imageFile = null,
  language = "bn",
  ocrExtractor = extractScreenshotText
}) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage && !imageFile) throw new Error("Add a message or screenshot to check.");

  let requestMessage = cleanMessage;
  let extractedText = "";

  if (imageFile) {
    extractedText = await ocrExtractor(imageFile);
    requestMessage = [cleanMessage, extractedText].filter(Boolean).join("\n").slice(0, 4000);
    if (!requestMessage) throw new Error("No readable message text was found in the screenshot.");
  }

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: requestMessage,
      language: language === "en" || language === "bn" ? language : "auto"
    })
  });
  const assessment = await parseResponse(response);
  if (!imageFile) return assessment;

  const responseLanguage = language === "bn" || language === "en"
    ? language
    : (/[ঀ-৿]/.test(requestMessage) ? "bn" : "en");
  const ocrNote = responseLanguage === "bn"
    ? "স্ক্রিনশটের লেখা আপনার ব্রাউজারেই পড়া হয়েছে; ঝাপসা বা কাটা অংশ ভুল হতে পারে।"
    : "Screenshot text was read in your browser; blurry or cropped content may be misread.";

  return {
    ...assessment,
    extractedText,
    combinedText: requestMessage,
    screenshotRead: true,
    ocrEngine: "Tesseract.js (English + Bangla, browser-side)",
    uncertainty: [assessment.uncertainty, ocrNote].filter(Boolean).join(" ")
  };
}
