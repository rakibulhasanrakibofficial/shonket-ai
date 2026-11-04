import { buildRuleAssessment } from "../../api/ruleAssessment.js";
import { retrieveKnowledge } from "../../netlify/functions/knowledge-base.mjs";
import { extractScreenshotText } from "./screenshotOcrService.js";

const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function localAssessment(message, language, status = "not_configured", contextType = "message") {
  const detectedLanguage = language === "bn" || language === "en"
    ? language
    : (/[ঀ-৿]/.test(message) ? "bn" : "en");
  const isUrlContext = contextType === "url";
  const result = isUrlContext ? {
    ...buildRuleAssessment(message, detectedLanguage),
    isRelevant: true,
    verdict: "uncertain",
    riskLevel: "unknown",
    riskScore: null,
    matchedSignals: [],
    summary_bn: "এটি URL structure review; message scam score এখানে প্রযোজ্য নয়।",
    summary_en: "This is a URL-structure review; message scam scoring does not apply here.",
    claimVerification: { status: "not_applicable", officialSearchAttempted: false }
  } : buildRuleAssessment(message, detectedLanguage);
  const retrievedSources = isUrlContext ? [] : retrieveKnowledge(message, 3);
  const noteBn = isUrlContext
    ? status === "pending"
      ? "স্থানীয় URL structure পরীক্ষা প্রস্তুত। AI ব্যাখ্যা তৈরি হচ্ছে..."
      : "AI ব্যাখ্যা পাওয়া যাচ্ছে না। URL structure পরীক্ষা স্থানীয়ভাবে করা হয়েছে; কোনো domain reputation lookup হয়নি।"
    : status === "pending"
      ? "নিয়মভিত্তিক ফলাফল প্রস্তুত। AI ব্যাখ্যা তৈরি হচ্ছে..."
      : status === "not_configured"
        ? "AI backend এখনো সংযুক্ত হয়নি। আপনার বার্তা ব্রাউজারেই নিয়মভিত্তিকভাবে যাচাই করা হয়েছে। নিচে প্রাসঙ্গিক নিরাপত্তা-গাইডলাইনও দেখুন।"
        : "AI backend সাময়িকভাবে পাওয়া যায়নি। আপনার বার্তা ব্রাউজারেই নিয়মভিত্তিকভাবে যাচাই করা হয়েছে।";
  const noteEn = isUrlContext
    ? status === "pending"
      ? "Local URL-structure checks are ready. The AI explanation is still being generated..."
      : "The AI explanation service is unavailable. URL structure was checked locally; no domain-reputation lookup was performed."
    : status === "pending"
      ? "The rule-based result is ready. The AI explanation is still being generated..."
      : status === "not_configured"
        ? "The AI backend is not connected yet. Your message was checked locally in this browser, with relevant safety guidance retrieved below."
        : "The AI backend is temporarily unavailable. Your message was checked locally in this browser.";
  const officialSearch = isUrlContext ? {
    status: "not_applicable",
    scope: "URL-only checks do not search general Bangladesh message-safety sources.",
    searchedAt: null,
    searchedPortals: [],
    sources: [],
    evidenceAssessment: { status: "not_applicable", summary_bn: "URL-only পর্যালোচনায় সাধারণ মেসেজ-নিরাপত্তা উৎস অনুসন্ধান করা হয় না।", summary_en: "URL-only reviews do not search general message-safety sources." },
    summary_bn: "URL-only পর্যালোচনায় সাধারণ মেসেজ-নিরাপত্তা উৎস অনুসন্ধান করা হয় না।",
    summary_en: "URL-only reviews do not search general message-safety sources."
  } : status === "pending" ? {
    status: "pending",
    scope: "Selected Bangladesh official and institutional sources based on message category",
    searchedAt: null,
    searchedPortals: [],
    sources: [],
    failedPortalCount: 0,
    evidenceAssessment: {
      status: "pending",
      summary_bn: "নির্বাচিত সরকারি ও প্রাতিষ্ঠানিক উৎসে অনুসন্ধান চলছে।",
      summary_en: "Searching selected official and institutional sources."
    },
    summary_bn: "নির্বাচিত সরকারি ও প্রাতিষ্ঠানিক উৎসে অনুসন্ধান চলছে।",
    summary_en: "Searching selected official and institutional sources."
  } : {
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
    analysisMode: isUrlContext ? "local-url-structure" : "local-rules+rag",
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
    claimVerification: isUrlContext ? {
      status: "not_applicable",
      officialSearchAttempted: false,
      summary_en: "Claim verification is not part of a URL-only structure review.",
      summary_bn: "URL-only structure review-তে দাবি যাচাই করা হয় না।"
    } : status === "pending" ? {
      ...result.claimVerification,
      status: "unverified",
      officialSearchAttempted: true,
      officialSearchStatus: "pending",
      officialEvidenceStatus: "pending",
      officialPortalCount: 0,
      officialSourceCount: 0,
      summary_en: "Checking selected official and institutional sources. This result is not yet verified.",
      summary_bn: "নির্বাচিত সরকারি ও প্রাতিষ্ঠানিক উৎস অনুসন্ধান চলছে। এখনো কোনো চূড়ান্ত যাচাই হয়নি।"
    } : result.claimVerification,
    webEvidence: isUrlContext ? {
      searched: false,
      searchExecuted: false,
      status: "not_applicable",
      officialSourcesFound: 0,
      sources: [],
      searchedPortals: [],
      failedPortalCount: 0
    } : status === "pending" ? {
      searched: true,
      searchExecuted: false,
      status: "pending",
      officialSourcesFound: 0,
      sources: [],
      searchedPortals: [],
      failedPortalCount: 0
    } : {
      searched: false,
      searchExecuted: false,
      status: officialSearch?.status || "unavailable",
      officialSourcesFound: 0,
      sources: [],
      searchedPortals: [],
      failedPortalCount: 0
    },
    apiUnavailable: status === "unavailable"
  };
}

export function createLocalPreview({ message, language = "auto", status = "pending", contextType = "message" }) {
  const cleanMessage = String(message || "").trim().slice(0, 4000);
  if (!cleanMessage) return null;
  return localAssessment(cleanMessage, language, status, contextType);
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
  ocrExtractor = extractScreenshotText,
  onOfficialSearch = null,
  onLocalPreview = null,
  contextType = "message"
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

  if (imageFile && typeof onLocalPreview === "function") {
    onLocalPreview(localAssessment(requestMessage, language, "pending", contextType));
  }

  // Start official-source retrieval independently so the UI can show its
  // pending panel immediately and populate it as soon as the portals respond.
  if (contextType !== "url" && API_BASE_URL && typeof onOfficialSearch === "function") {
    const searchEndpoint = API_BASE_URL + "/api/official-search";
    fetch(searchEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: requestMessage,
        language: language === "bn" || language === "en" ? language : "auto",
        contextType: contextType === "url" ? "url" : "message"
      })
    })
      .then(parseResponse)
      .then(payload => onOfficialSearch(payload))
      .catch(() => onOfficialSearch({
        officialSearch: {
          status: "unavailable",
          scope: "Selected Bangladesh official and institutional sources based on message category",
          searchedAt: new Date().toISOString(),
          searchedPortals: [],
          sources: [],
          failedPortalCount: 3,
          evidenceAssessment: {
            status: "search_unavailable",
            summary_bn: "নির্বাচিত সরকারি উৎসে সংযোগ করা যায়নি।",
            summary_en: "The selected official sources could not be reached."
          },
          summary_bn: "এই মুহূর্তে সরকারি উৎসে সংযোগ করা যায়নি।",
          summary_en: "The selected official sources could not be reached right now."
        },
        webEvidence: {
          searched: true,
          searchExecuted: true,
          status: "unavailable",
          officialSourcesFound: 0,
          sources: [],
          searchedPortals: [],
          failedPortalCount: 3
        },
        claimVerification: {
          status: "unverified",
          officialSearchAttempted: true,
          officialEvidenceStatus: "search_unavailable",
          officialSearchStatus: "unavailable",
          officialPortalCount: 0,
          officialSourceCount: 0,
          summary_en: "The official-source lookup could not be completed. The claim remains unverified.",
          summary_bn: "সরকারি উৎস অনুসন্ধান সম্পন্ন করা যায়নি। দাবিটি এখনো অযাচাইকৃত।"
        }
      }));
  }

  let assessment;
  if (!API_BASE_URL) {
    // GitHub Pages is static hosting. Without a configured backend, use the
    // same deterministic rule engine and the curated RAG corpus in-browser.
    // This avoids posting to a non-existent /api/analyze route on Pages.
    assessment = localAssessment(requestMessage, language, "not_configured", contextType);
  } else {
    const endpoint = API_BASE_URL + "/api/analyze";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: requestMessage,
          language: language === "en" || language === "bn" ? language : "auto",
          contextType: contextType === "url" ? "url" : "message"
        })
      });
      assessment = await parseResponse(response);
      // Do not surface an education-portal search section for message types
      // where that narrowly scoped search was intentionally not applicable.
      if (assessment.officialSearch?.status === "not_applicable") {
        assessment = { ...assessment, officialSearch: null };
      }
    } catch (error) {
      // An explicit client error should be shown. Network, not-found, and
      // server errors degrade safely to local rules + local RAG.
      if (error?.status && error.status !== 404 && error.status < 500) {
        if (error.status === 429 && error.retryAfterSeconds) {
          throw new Error(error.message + " Retry after about " + error.retryAfterSeconds + " seconds.");
        }
        throw error;
      }
      assessment = localAssessment(requestMessage, language, "unavailable", contextType);
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
