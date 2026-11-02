export function buildFastAssessment(text, responseLanguage, scored) {
  if (!text || !scored) return null;

  const prizeMatch = text.match(/\b(?:you have won(?: a)?(?: cash)? prize|cash prize|claim your prize|lottery|winner)\b|\bprize\s+(?:jitsen|jitse|paichen|paisen)\b|\bpuraskar\s+(?:jitsen|jitse|paichen|paisen)\b|পুরস্কার জিতেছেন|নগদ পুরস্কার|লটারি|বিজয়ী|পুরস্কার দাবি/i);
  const feeMatch = text.match(/\b(?:processing fee|registration fee|release fee|advance fee|claim fee|send money|pay now|payment required)\b|\bfee\s+(?:pathan|diben|den)\b|\btaka\s+(?:pathan|diben|den)\b|\bage\s+(?:processing\s+)?fee\s+dite\s+hobe\b|প্রসেসিং ফি|রেজিস্ট্রেশন ফি|রিলিজ ফি|আগাম ফি|আগে টাকা|টাকা পাঠান|পেমেন্ট করুন/i);

  const otpRequestMatch = text.match(/\b(?:reply with|send|share|provide|enter|submit|confirm)\s+(?:your\s+)?(?:otp|one[- ]time password|pin|password|verification code)\b|\botp\s+(?:pathan|diben|den|share koren)\b|\bpin\s+(?:pathan|diben|den)\b|ওটিপি\s*(?:দিন|পাঠান|শেয়ার করুন|দিয়ে দিন)|পিন\s*(?:দিন|পাঠান)|পাসওয়ার্ড\s*(?:দিন|পাঠান)/i);
  const urgentAccountContext = /\b(?:account (?:will be|is) blocked|account suspended|blocked today|verify immediately|keep it active|security alert|unauthori[sz]ed access|urgent)\b|অ্যাকাউন্ট বন্ধ|অ্যাকাউন্ট স্থগিত|আজই বন্ধ|জরুরি যাচাই/i.test(text);

  const suspiciousLinkMatch = text.match(/\b(?:click here|verify your account|login here|update your account)\b.{0,120}https?:\/\/[^\s]+|https?:\/\/[^\s]+.{0,120}\b(?:click here|verify your account|login here|account suspended|account blocked)\b/i);
  const urgentLinkContext = /\b(?:suspended|blocked|expires today|immediately|urgent|act now|within \d+ hours?)\b|অ্যাকাউন্ট বন্ধ|জরুরি|এখনই|আজই/i.test(text);

  const isBangla = responseLanguage === "bn";
  const makeFastResult = ({ verdict = "suspicious", score, clearSignals = false, confidence = "medium", claimStatus = "not_applicable", claimSummaryBn = "", claimSummaryEn = "", summaryBn, summaryEn, quote, quoteBn, quoteEn, reasonBn, reasonEn, tactics, actionsBn, actionsEn, uncertaintyBn, uncertaintyEn }) => {
    const riskScore = clearSignals ? 0 : Math.max(Number(scored.score) || 0, score);
    return {
      isRelevant: true,
      verdict,
      responseLanguage,
      riskScore,
      riskLevel: riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low",
      summary_bn: summaryBn,
      summary_en: summaryEn,
      evidence: [{
        quote,
        quote_bn: quoteBn,
        quote_en: quoteEn,
        reason_bn: reasonBn,
        reason_en: reasonEn
      }],
      tactics,
      safe_actions: isBangla ? actionsBn : actionsEn,
      matchedSignals: clearSignals ? [] : (Array.isArray(scored.matched) ? scored.matched : []),
      uncertainty: isBangla ? uncertaintyBn : uncertaintyEn,
      confidence,
      engine: "Rule-based",
      model: "local-patterns",
      degradedMode: false,
      webEvidence: { searched: false, searchExecuted: false, status: "not_searched", officialSourcesFound: 0, sources: [] },
      claimVerification: { status: claimStatus, summary_bn: claimSummaryBn, summary_en: claimSummaryEn },
      disclaimer: "Rule-based warning only. It is not proof of fraud; verify important claims independently."
    };
  };

  // Do not fast-label educational warnings or quoted anti-scam advice as scams.
  const warningContext = /\b(?:this is (?:a )?(?:scam|fraud)|(?:scam|fraud) warning|fraudsters? (?:use|often|typically)|scammers? (?:use|often|typically)|never pay|do not pay|don't pay|avoid paying|never send|do not send|don't send|never share|do not share|don't share|never disclose|do not disclose|don't disclose|will never ask|never ask|warning against)\b|কখনো টাকা পাঠাবেন না|টাকা পাঠাবেন না|ফি দেবেন না|ওটিপি শেয়ার করবেন না|পিন শেয়ার করবেন না|প্রতারণা থেকে সাবধান|এটি প্রতারণা|স্ক্যাম থেকে সাবধান/i.test(text);
  if (warningContext && !urgentAccountContext && !(suspiciousLinkMatch && urgentLinkContext)) {
    return makeFastResult({
      verdict: "likely_safe",
      score: 0,
      clearSignals: true,
      summaryBn: "বার্তাটি পুরস্কার বা আগাম ফি-সংক্রান্ত প্রতারণা সম্পর্কে সতর্ক করছে; এটি নিজে টাকা বা গোপন তথ্য চাইছে না।",
      summaryEn: "This message is warning about prize or advance-fee scams; it is not itself asking for money or confidential information.",
      quote: text.slice(0, 160),
      quoteBn: "প্রতারণা সম্পর্কে সতর্কবার্তা",
      quoteEn: text.slice(0, 160),
      reasonBn: "এখানে আগাম টাকা না দিতে এবং প্রতারণা থেকে সতর্ক থাকতে বলা হয়েছে।",
      reasonEn: "The text advises the reader not to pay unexpected fees and to watch for fraud.",
      tactics: [],
      actionsBn: ["কোনো অপ্রত্যাশিত ফি দেবেন না।", "OTP, PIN বা পাসওয়ার্ড কাউকে দেবেন না।", "গুরুত্বপূর্ণ তথ্য অফিসিয়াল উৎসে যাচাই করুন।"],
      actionsEn: ["Do not pay unexpected fees.", "Never share an OTP, PIN, or password.", "Verify important claims through official sources."],
      uncertaintyBn: "এটি লেখার ভাষাভিত্তিক মূল্যায়ন; প্রেরক বা উৎসের পরিচয় যাচাই করা হয়নি।",
      uncertaintyEn: "This is an assessment of the wording only; the sender and source have not been authenticated."
    });
  }
  if (warningContext) return null;

  if (otpRequestMatch && !warningContext && urgentAccountContext) {
    return makeFastResult({
      score: 65,
      summaryBn: "বার্তাটি অ্যাকাউন্ট বন্ধ বা নিরাপত্তার চাপ দেখিয়ে OTP/PIN চাইছে। OTP বা PIN কাউকে দেওয়া উচিত নয়; এটি উচ্চ ঝুঁকির সংকেত।",
      summaryEn: "The message uses an account-security threat to request an OTP or PIN. Never disclose these codes to a sender; this is a high-risk credential-harvesting signal.",
      quote: otpRequestMatch[0],
      quoteBn: /[\\u0980-\\u09FF]/.test(otpRequestMatch[0]) ? otpRequestMatch[0] : "OTP বা PIN চাওয়া হয়েছে",
      quoteEn: /[\\u0980-\\u09FF]/.test(otpRequestMatch[0]) ? "request for an OTP or PIN" : otpRequestMatch[0],
      reasonBn: "OTP/PIN দিয়ে অ্যাকাউন্টে প্রবেশ বা লেনদেন অনুমোদন করা যেতে পারে।",
      reasonEn: "An OTP or PIN can authorise account access or a transaction.",
      tactics: ["credential_request", "urgency"],
      actionsBn: ["কোনো OTP, PIN বা পাসওয়ার্ড দেবেন না।", "বার্তার লিংকে ক্লিক করবেন না।", "ব্যাংক বা সেবার অফিসিয়াল অ্যাপ/নম্বর দিয়ে আলাদাভাবে যোগাযোগ করুন।"],
      actionsEn: ["Do not share any OTP, PIN, or password.", "Do not open links in the message.", "Contact the bank or service through its official app or a number you find independently."],
      uncertaintyBn: "প্রেরকের পরিচয় যাচাই করা হয়নি; মূল্যায়নটি বার্তার OTP চাওয়া ও জরুরি চাপের ভিত্তিতে।",
      uncertaintyEn: "The sender has not been authenticated; this assessment is based on the OTP request and urgency language."
    });
  }

  if (prizeMatch && !feeMatch && !otpRequestMatch && !suspiciousLinkMatch && !urgentLinkContext && !urgentAccountContext) {
    return makeFastResult({
      verdict: "uncertain",
      score: 22,
      confidence: "low",
      claimStatus: "unverified",
      claimSummaryBn: "বার্তার পুরস্কার-সংক্রান্ত দাবির পক্ষে কোনো বাহ্যিক সরকারি প্রমাণ এই দ্রুত পরীক্ষায় যাচাই করা হয়নি।",
      claimSummaryEn: "No external official evidence was checked for this prize claim during this fast assessment.",
      summaryBn: "বার্তাটি পুরস্কার জেতার দাবি করছে, কিন্তু শুধু এই দাবির ভিত্তিতে এটিকে প্রতারণা বা বৈধ—কোনোটিই নিশ্চিত বলা যায় না।",
      summaryEn: "The message claims that you won a prize, but this claim alone is not enough to confirm that the offer is genuine or fraudulent.",
      quote: prizeMatch[0],
      quoteBn: /[\\u0980-\\u09FF]/.test(prizeMatch[0]) ? prizeMatch[0] : "পুরস্কার জেতার দাবি",
      quoteEn: /[\\u0980-\\u09FF]/.test(prizeMatch[0]) ? "prize claim" : prizeMatch[0],
      reasonBn: "পুরস্কার জেতার দাবি নিজে প্রতারণার প্রমাণ নয়; প্রেরক ও অফারটি আলাদাভাবে যাচাই করা দরকার।",
      reasonEn: "A prize claim by itself is not proof of fraud; verify the sender and offer independently.",
      tactics: ["unverified_prize_claim"],
      actionsBn: ["কোনো ফি বা অগ্রিম টাকা দেবেন না।", "OTP, PIN বা পাসওয়ার্ড শেয়ার করবেন না।", "প্রতিষ্ঠানের অফিসিয়াল ওয়েবসাইট নিজে খুঁজে নোটিশ যাচাই করুন।"],
      actionsEn: ["Do not pay an unexpected fee.", "Never share an OTP, PIN, or password.", "Find the organisation's official website independently and check for a matching notice."],
      uncertaintyBn: "এই দ্রুত নিয়মভিত্তিক ফল sender, URL বা পুরস্কারের অস্তিত্ব যাচাই করে না।",
      uncertaintyEn: "This fast rule-based result does not authenticate the sender, URL, or existence of the prize."
    });
  }

  if (suspiciousLinkMatch && urgentLinkContext && !warningContext) {
    return makeFastResult({
      score: 55,
      summaryBn: "বার্তাটি অ্যাকাউন্ট বন্ধ বা জরুরি সমস্যার ভয় দেখিয়ে একটি লিংকে ক্লিক করে তথ্য যাচাই করতে বলছে। এটি ফিশিংয়ের পরিচিত কৌশল।",
      summaryEn: "The message pressures the recipient with an account warning and directs them to a link. This is a common phishing pattern.",
      quote: suspiciousLinkMatch[0].slice(0, 180),
      quoteBn: "জরুরি অ্যাকাউন্ট সতর্কতা ও লিংক",
      quoteEn: suspiciousLinkMatch[0].slice(0, 180),
      reasonBn: "চাপ সৃষ্টি করে লিংকে পাঠানো ব্যবহারকারীর login তথ্য চুরির ঝুঁকি তৈরি করতে পারে।",
      reasonEn: "Urgent link prompts can lead users to credential-stealing pages.",
      tactics: ["urgency", "suspicious_link"],
      actionsBn: ["বার্তার লিংকে ক্লিক করবেন না।", "কোনো পাসওয়ার্ড বা OTP দেবেন না।", "অফিসিয়াল অ্যাপ বা নিজে টাইপ করা ওয়েবসাইট দিয়ে অ্যাকাউন্ট যাচাই করুন।"],
      actionsEn: ["Do not click the message link.", "Do not enter a password or OTP.", "Check your account through the official app or by typing the known website address yourself."],
      uncertaintyBn: "লিংকের প্রকৃত মালিকানা বা পেজের কনটেন্ট খোলা হয়নি; এটি বার্তার প্যাটার্নভিত্তিক সতর্কতা।",
      uncertaintyEn: "The link destination has not been opened or authenticated; this is a warning based on the message pattern."
    });
  }

  // Only bypass Gemini for this narrow, high-signal combination.
  // Scholarship and job claims still go through evidence retrieval.
  if (!prizeMatch || !feeMatch) return null;

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
