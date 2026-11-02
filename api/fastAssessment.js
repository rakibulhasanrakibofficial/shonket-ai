export function buildFastAssessment(text, responseLanguage, scored) {
  if (!text || !scored) return null;

  const prizeMatch = text.match(/\b(?:you have won(?: a)?|cash prize|claim your prize|lottery|winner)\b|\bprize\s+(?:jitsen|jitse|paichen|paisen)\b|\bpuraskar\s+(?:jitsen|jitse|paichen|paisen)\b|পুরস্কার জিতেছেন|নগদ পুরস্কার|লটারি|বিজয়ী|পুরস্কার দাবি/i);
  const feeMatch = text.match(/\b(?:processing fee|registration fee|release fee|advance fee|claim fee|send money|pay now|payment required)\b|\bfee\s+(?:pathan|diben|den)\b|\btaka\s+(?:pathan|diben|den)\b|\bage\s+(?:processing\s+)?fee\s+dite\s+hobe\b|প্রসেসিং ফি|রেজিস্ট্রেশন ফি|রিলিজ ফি|আগাম ফি|আগে টাকা|টাকা পাঠান|পেমেন্ট করুন/i);

  // Do not fast-label educational warnings or quoted anti-scam advice as scams.
  const warningContext = /\b(?:this is (?:a )?(?:scam|fraud)|(?:scam|fraud) warning|fraudsters? (?:use|often|typically)|scammers? (?:use|often|typically)|never pay|do not pay|don't pay|avoid paying|never send|do not send|don't send|warning against)\b|কখনো টাকা পাঠাবেন না|টাকা পাঠাবেন না|ফি দেবেন না|প্রতারণা থেকে সাবধান|এটি প্রতারণা|স্ক্যাম থেকে সাবধান/i.test(text);
  if (warningContext) return null;

  // Only bypass Gemini for this narrow, high-signal combination.
  // Scholarship and job claims still go through evidence retrieval.
  if (!prizeMatch || !feeMatch) return null;

  const isBangla = responseLanguage === "bn";
  const riskScore = Math.max(Number(scored.score) || 0, 50);
  const riskLevel = riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";

  return {
    isRelevant: true,
    verdict: "suspicious",
    responseLanguage,
    riskScore,
    riskLevel,
    summary_bn: "বার্তাটি নগদ পুরস্কারের প্রলোভন দেখিয়ে আগাম প্রসেসিং ফি চাইছে। পুরস্কার পাওয়ার আগে অপ্রত্যাশিত ফি চাওয়া একটি শক্তিশালী প্রতারণার সতর্কসংকেত।",
    summary_en: "The message promises a cash prize and asks for an upfront processing fee. An unexpected fee to release a prize is a strong scam warning sign.",
    evidence: [
      {
        quote: prizeMatch[0],
        quote_bn: /[\u0980-\u09FF]/.test(prizeMatch[0]) ? prizeMatch[0] : "নগদ পুরস্কার",
        quote_en: /[\u0980-\u09FF]/.test(prizeMatch[0]) ? "cash prize" : prizeMatch[0],
        reason_bn: "পুরস্কারের প্রলোভন দেখিয়ে বার্তাটি প্রাপককে টাকা দিতে উৎসাহিত করছে।",
        reason_en: "The prize promise is used to entice the recipient."
      },
      {
        quote: feeMatch[0],
        quote_bn: /[\u0980-\u09FF]/.test(feeMatch[0]) ? feeMatch[0] : "প্রসেসিং ফি",
        quote_en: /[\u0980-\u09FF]/.test(feeMatch[0]) ? "processing fee" : feeMatch[0],
        reason_bn: "পুরস্কার ছাড় করার আগে ফি চাওয়া আগাম-টাকা প্রতারণার পরিচিত সংকেত।",
        reason_en: "Asking for money before releasing a prize is a common advance-fee scam signal."
      }
    ],
    tactics: ["fake_prize", "upfront_fee"],
    safe_actions: isBangla
      ? ["কোনো প্রসেসিং বা রিলিজ ফি পাঠাবেন না।", "OTP, PIN বা পাসওয়ার্ড শেয়ার করবেন না।", "প্রতিষ্ঠানের অফিসিয়াল ওয়েবসাইট বা নম্বর দিয়ে আলাদাভাবে যাচাই করুন।"]
      : ["Do not pay a processing or release fee.", "Never share an OTP, PIN, or password.", "Verify the organisation through a contact channel you find independently."],
    matchedSignals: Array.isArray(scored.matched) ? scored.matched : [],
    uncertainty: isBangla
      ? "এটি বার্তার নির্দিষ্ট প্যাটার্নভিত্তিক দ্রুত নিয়মভিত্তিক মূল্যায়ন। প্রেরক, লিংক বা পুরস্কারের অস্তিত্ব আলাদাভাবে যাচাই করা হয়নি।"
      : "This is a fast rule-based assessment of the message pattern. The sender, link, and existence of the prize have not been independently verified.",
    confidence: "medium",
    engine: "Rule-based",
    model: "local-patterns",
    degradedMode: false,
    webEvidence: { searched: false, searchExecuted: false, status: "not_searched", officialSourcesFound: 0, sources: [] },
    claimVerification: { status: "not_applicable", summary_bn: "", summary_en: "" },
    disclaimer: "Rule-based warning only. It is not proof of fraud; verify important claims independently."
  };
}
