import { useState } from "react";
import { createPortal } from "react-dom";
import { Copy, FileDown } from "lucide-react";

const verdictText = (a, bn) => bn
  ? ({ scam:"সম্ভাব্য প্রতারণা", suspicious:"সন্দেহজনক বার্তা", likely_safe:"প্রতারণার স্পষ্ট সংকেত পাওয়া যায়নি" }[a?.verdict] || "পর্যাপ্ত তথ্য নেই")
  : ({ scam:"Likely scam", suspicious:"Suspicious message", likely_safe:"No strong scam signals found" }[a?.verdict] || "Not enough information");
const riskText = (a, bn) => bn
  ? ({ critical:"অতি উচ্চ ঝুঁকি", high:"উচ্চ ঝুঁকি", medium:"মাঝারি ঝুঁকি", low:"কম ঝুঁকি" }[a?.riskLevel] || "অজানা")
  : String(a?.riskLevel || "unknown").toUpperCase() + " RISK";

function makeCopyText(a, message, bn) {
  const lines = [
    "SHONKET AI — " + (bn ? "বিশ্লেষণ রিপোর্ট" : "ANALYSIS REPORT"),
    (bn ? "রিপোর্ট তৈরি: " : "Generated: ") + new Date().toLocaleString(),
    "", bn ? "যাচাই করা বার্তা:" : "MESSAGE CHECKED:", message || "—",
    "", (bn ? "ফলাফল: " : "RESULT: ") + verdictText(a, bn),
    (bn ? "ঝুঁকির স্কোর: " : "RISK SCORE: ") + String(a.riskScore ?? "—") + "/100 · " + riskText(a, bn),
    "", bn ? a.summary_bn : a.summary_en,
    "", bn ? "শনাক্ত সতর্কসংকেত:" : "DETECTED WARNING SIGNS:"
  ];
  (a.evidence || []).forEach((item, i) => {
    lines.push((i + 1) + ". " + (bn ? (item.quote_bn || item.reason_bn) : (item.quote_en || item.reason_en)));
  });
  lines.push("", bn ? "প্রতারণার কৌশল:" : "MANIPULATION PATTERNS:", ...(a.tactics || []).map(x => "- " + String(x).replace(/[_-]+/g, " ")));
  lines.push("", bn ? "যা করবেন:" : "RECOMMENDED ACTIONS:", ...(a.safe_actions || []).map(x => "- " + x));
  if (a.claimVerification?.status && a.claimVerification.status !== "not_applicable") {
    lines.push("", (bn ? "দাবি যাচাই: " : "CLAIM VERIFICATION: ") + a.claimVerification.status.toUpperCase());
    lines.push(bn ? a.claimVerification.summary_bn : a.claimVerification.summary_en);
  }
  if (a.aiAnalysis) {
    lines.push("", (bn ? "AI ব্যাখ্যা: " : "AI EXPLANATION: ") + String(a.aiAnalysis.status || "unknown").toUpperCase());
    lines.push(a.aiAnalysis.status === "ready" ? (bn ? a.aiAnalysis.explanation_bn : a.aiAnalysis.explanation_en) : (bn ? a.aiAnalysis.note_bn : a.aiAnalysis.note_en));
    const steps = bn ? a.aiAnalysis.next_steps_bn : a.aiAnalysis.next_steps_en;
    if (steps?.length) lines.push(...steps.map(x => "- " + x));
  }
  if (a.officialSearch) {
    lines.push("", (bn ? "লাইভ সরকারি উৎস অনুসন্ধান: " : "OFFICIAL SOURCE SEARCH: ") + String(a.officialSearch.status || "unknown").toUpperCase());
    lines.push(bn ? a.officialSearch.summary_bn : a.officialSearch.summary_en);
    (a.officialSearch.sources || []).forEach(s => lines.push("- " + s.title + " — " + s.url));
  }
  if (a.retrievedSources?.length) {
    lines.push("", bn ? "RAG নিরাপত্তা-গাইডলাইন:" : "RETRIEVED SAFETY GUIDANCE:");
    a.retrievedSources.forEach(s => lines.push("- " + s.title + ": " + s.summary + " " + s.url));
  }
  lines.push("", (bn ? "সীমাবদ্ধতা: " : "LIMITATIONS: ") + (a.uncertainty || ""));
  lines.push(bn
    ? "এটি স্বয়ংক্রিয় সহায়ক মূল্যায়ন; প্রতারণা বা নিরাপত্তার চূড়ান্ত প্রমাণ নয়। গুরুত্বপূর্ণ অনুরোধ স্বাধীনভাবে যাচাই করুন।"
    : "This is an automated advisory assessment, not proof of fraud or safety. Verify important requests independently.");
  lines.push("", "SHONKET AI · Detect. Understand. Practise. Protect.");
  return lines.join("\n");
}

export default function AnalysisExportActions({ analysis, message = "", language = "en" }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const bn = language === "bn";
  if (!analysis || analysis.isRelevant === false) return null;

  async function copyResult() {
    const text = makeCopyText(analysis, String(message || "").trim(), bn);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand("copy");
        field.remove();
        if (!ok) throw new Error("Copy failed");
      }
      setCopied(true);
      setError(false);
    } catch {
      setCopied(false);
      setError(true);
    }
  }

  const report = (
    <main id="shonket-print-report" className="shonket-print-only" aria-hidden="true">
      <header className="shonket-print-header">
        <p className="shonket-print-brand">SHONKET AI</p>
        <h1>{bn ? "ডিজিটাল নিরাপত্তা বিশ্লেষণ রিপোর্ট" : "Digital Safety Analysis Report"}</h1>
        <p>{bn ? "রিপোর্ট তৈরি: " : "Generated: "}{new Date().toLocaleString()}</p>
      </header>
      <section className="shonket-print-section">
        <h2>{bn ? "যাচাই করা বার্তা" : "Message Checked"}</h2>
        <p className="shonket-print-message">{message.trim() || "—"}</p>
      </section>
      <section className="shonket-print-section">
        <h2>{bn ? "বিশ্লেষণের ফলাফল" : "Analysis Result"}</h2>
        <p className="shonket-print-verdict">{verdictText(analysis, bn)}</p>
        <p><strong>{bn ? "ঝুঁকির স্কোর" : "Risk score"}:</strong> {analysis.riskScore ?? "—"}/100 · {riskText(analysis, bn)}</p>
        <p>{bn ? analysis.summary_bn : analysis.summary_en}</p>
      </section>
      <section className="shonket-print-section">
        <h2>{bn ? "শনাক্ত সতর্কসংকেত" : "Detected Warning Signs"}</h2>
        {analysis.evidence?.length ? <ul>{analysis.evidence.map((item, i) => <li key={i}>{bn ? (item.quote_bn || item.reason_bn) : (item.quote_en || item.reason_en)} — {bn ? item.reason_bn : item.reason_en}</li>)}</ul> : <p>—</p>}
      </section>
      <section className="shonket-print-section">
        <h2>{bn ? "প্রতারণার কৌশল" : "Manipulation Patterns"}</h2>
        <p>{(analysis.tactics || []).map(x => String(x).replace(/[_-]+/g, " ")).join(" · ") || "—"}</p>
      </section>
      <section className="shonket-print-section">
        <h2>{bn ? "যা করবেন" : "Recommended Actions"}</h2>
        <ul>{(analysis.safe_actions || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
      </section>
      {analysis.claimVerification?.status && analysis.claimVerification.status !== "not_applicable" && <section className="shonket-print-section">
        <h2>{bn ? "দাবি যাচাই" : "Claim Verification"} · {String(analysis.claimVerification.status).toUpperCase()}</h2>
        <p>{bn ? analysis.claimVerification.summary_bn : analysis.claimVerification.summary_en}</p>
      </section>}
      {analysis.aiAnalysis && <section className="shonket-print-section">
        <h2>{bn ? "AI ব্যাখ্যা" : "AI Explanation"} · {String(analysis.aiAnalysis.status || "unknown").toUpperCase()}</h2>
        <p>{analysis.aiAnalysis.status === "ready" ? (bn ? analysis.aiAnalysis.explanation_bn : analysis.aiAnalysis.explanation_en) : (bn ? analysis.aiAnalysis.note_bn : analysis.aiAnalysis.note_en)}</p>
        {(bn ? analysis.aiAnalysis.next_steps_bn : analysis.aiAnalysis.next_steps_en)?.length > 0 && <ul>{(bn ? analysis.aiAnalysis.next_steps_bn : analysis.aiAnalysis.next_steps_en).map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </section>}
      {analysis.officialSearch && <section className="shonket-print-section">
        <h2>{bn ? "লাইভ সরকারি উৎস অনুসন্ধান" : "Live Official-Source Search"} · {String(analysis.officialSearch.status || "unknown").toUpperCase()}</h2>
        <p>{bn ? analysis.officialSearch.summary_bn : analysis.officialSearch.summary_en}</p>
        {(analysis.officialSearch.sources || []).map(s => <p key={s.id}><a href={s.url}>{s.title}</a> — {s.agency}{s.publishedDate ? " · " + s.publishedDate : ""}</p>)}
      </section>}
      {analysis.retrievedSources?.length > 0 && <section className="shonket-print-section">
        <h2>{bn ? "RAG নিরাপত্তা-গাইডলাইন" : "Retrieved Safety Guidance"}</h2>
        {analysis.retrievedSources.map(s => <p key={s.id}><strong>{s.title}</strong> — {s.summary}<br /><a href={s.url}>{s.url}</a></p>)}
      </section>}
      <footer className="shonket-print-footer">
        <h2>{bn ? "সীমাবদ্ধতা ও অনিশ্চয়তা" : "Limitations & Uncertainty"}</h2>
        <p>{analysis.uncertainty}</p>
        <p>{bn ? "এটি স্বয়ংক্রিয় সহায়ক মূল্যায়ন; প্রতারণা বা নিরাপত্তার চূড়ান্ত প্রমাণ নয়।" : "This is an automated advisory assessment, not proof of fraud or safety."}</p>
        <p>SHONKET AI · Detect. Understand. Practise. Protect.</p>
      </footer>
    </main>
  );

  return <>
    <div className="flex flex-wrap items-center gap-2" aria-label={bn ? "রিপোর্ট এক্সপোর্ট" : "Report export"}>
      <button type="button" onClick={copyResult} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/10" aria-label={copied ? (bn ? "ফলাফল কপি হয়েছে" : "Result copied") : (bn ? "ফলাফল কপি করুন" : "Copy result")}>
        <Copy size={14} />{copied ? (bn ? "কপি হয়েছে" : "Copied") : (bn ? "ফলাফল কপি" : "Copy result")}
      </button>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-300/10" aria-label={bn ? "PDF তৈরি করুন" : "Generate PDF"}>
        <FileDown size={14} />{bn ? "PDF তৈরি" : "Generate PDF"}
      </button>
      {error && <span role="alert" className="text-xs text-amber-200">{bn ? "ক্লিপবোর্ডে কপি করা যায়নি। ব্রাউজারের অনুমতি পরীক্ষা করুন।" : "Clipboard copy failed. Check browser permission."}</span>}
    </div>
    {createPortal(report, document.body)}
  </>;
}
