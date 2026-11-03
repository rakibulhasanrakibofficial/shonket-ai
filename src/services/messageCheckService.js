import { buildRuleAssessment } from "../../api/ruleAssessment.js";
import { extractScreenshotText } from "./screenshotOcrService.js";

const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function localAssessment(message, language, apiUnavailable = false) {
  const detectedLanguage = language === "bn" || language === "en"
    ? language
    : (/[ঀ-৿]/.test(message) ? "bn" : "en");
  const result = buildRuleAssessment(message, detectedLanguage);
  const noteBn = "API সংযুক্ত না থাকায় এই ফলাফল আপনার ব্রাউজারে নিয়মভিত্তিকভাবে তৈরি হয়েছে।";
  const noteEn = "The API is not connected, so this result was generated locally using deterministic rules.";

  return {
    ...result,
    analysisMode: "local-rules",
    aiAnalysis: {
      status: "not_connected",
      provider: null,
      model: null,
      explanation_bn: "",
      explanation_en: "",
      next_steps_bn: [],
      next_steps_en: [],
      note_bn: noteBn,
      note_en: noteEn
    },
    retrievedSources: [],
    apiUnavailable
  };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data.error || "Could not check this message. Please try again."));
    error.status = response.status;
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfterSeconds = retryAfter;
    throw error;
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

  let assessment;
  const endpoint = API_BASE_URL ? API_BASE_URL + "/api/analyze" : "/api/analyze";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: requestMessage,
        language: language === "en" || language === "bn" ? language : "auto"
      })
    });
    assessment = await parseResponse(response);
  } catch (error) {
    // No configured backend, a GitHub Pages 404, or a network/CORS failure
    // falls back locally. Explicit API validation/rate-limit errors are shown.
    if (error?.status && error.status !== 404 && error.status < 500) {
      if (error.status === 429 && error.retryAfterSeconds) {
        throw new Error(error.message + " Retry after about " + error.retryAfterSeconds + " seconds.");
      }
      throw error;
    }
    assessment = localAssessment(requestMessage, language, true);
  }

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
