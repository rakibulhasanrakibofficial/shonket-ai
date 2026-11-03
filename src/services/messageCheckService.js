import { buildRuleAssessment } from "../../api/ruleAssessment.js";
import { retrieveKnowledge } from "../../netlify/functions/knowledge-base.mjs";
import { extractScreenshotText } from "./screenshotOcrService.js";

const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function localAssessment(message, language, status = "not_configured") {
  const detectedLanguage = language === "bn" || language === "en"
    ? language
    : (/[ঀ-৿]/.test(message) ? "bn" : "en");
  const result = buildRuleAssessment(message, detectedLanguage);
  const retrievedSources = retrieveKnowledge(message, 3);
  const noteBn = status === "not_configured"
    ? "AI backend এখনো সংযুক্ত হয়নি। আপনার বার্তা ব্রাউজারেই নিয়মভিত্তিকভাবে যাচাই করা হয়েছে। নিচে প্রাসঙ্গিক নিরাপত্তা-গাইডলাইনও দেখুন।"
    : "AI backend সাময়িকভাবে পাওয়া যায়নি। আপনার বার্তা ব্রাউজারেই নিয়মভিত্তিকভাবে যাচাই করা হয়েছে।";
  const noteEn = status === "not_configured"
    ? "The AI backend is not connected yet. Your message was checked locally in this browser, with relevant safety guidance retrieved below."
    : "The AI backend is temporarily unavailable. Your message was checked locally in this browser.";
  const officialSearch = {
    status: "backend_not_connected",
    scope: "Bangladesh education ministry and DSHE public scholarship/notice listings",
    searchedAt: null,
    searchedPortals: [],
    sources: [],
    evidenceAssessment: {
      status: "not_checked",
      summary_bn: "লাইভ সরকারি-নোটিশ অনুসন্ধানের জন্য Netlify backend সংযুক্ত করতে হবে।",
      summary_en: "Connect the Netlify backend to search live official government notice listings."
    },
    summary_bn: "লাইভ সরকারি-নোটিশ অনুসন্ধানের জন্য Netlify backend সংযুক্ত করতে হবে।",
    summary_en: "Connect the Netlify backend to search live official government notice listings."
  };

  return {
    ...result,
    analysisMode: "local-rules+rag",
    aiAnalysis: {
      status,
      provider: null,
      model: null,
      explanation_bn: "",
      explanation_en: "",
      next_steps_bn: [],
      next_steps_en: [],
      note_bn: noteBn,
      note_en: noteEn
    },
    retrievedSources,
    officialSearch,
    apiUnavailable: status === "unavailable"
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
  if (!API_BASE_URL) {
    // GitHub Pages is static hosting. Without a configured backend, use the
    // same deterministic rule engine and the curated RAG corpus in-browser.
    // This avoids posting to a non-existent /api/analyze route on Pages.
    assessment = localAssessment(requestMessage, language, "not_configured");
  } else {
    const endpoint = API_BASE_URL + "/api/analyze";
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
      // An explicit client error should be shown. Network, not-found, and
      // server errors degrade safely to local rules + local RAG.
      if (error?.status && error.status !== 404 && error.status < 500) {
        if (error.status === 429 && error.retryAfterSeconds) {
          throw new Error(error.message + " Retry after about " + error.retryAfterSeconds + " seconds.");
        }
        throw error;
      }
      assessment = localAssessment(requestMessage, language, "unavailable");
    }
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
