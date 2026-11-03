const RULES = [
  {
    id: "credential_request",
    weight: 40,
    regex: /\b(?:reply with|send|share|provide|tell me|give me)\s+(?:your\s+)?(?:otp|one[- ]time password|pin|password|verification code|passcode)\b|\b(?:otp|pin|password)\s+(?:pathan|diben|den|share koren)\b|ওটিপি\s*(?:দিন|পাঠান|শেয়ার করুন|শেয়ার করুন)|পিন\s*(?:দিন|পাঠান)|পাসওয়ার্ড\s*(?:দিন|পাঠান)/i,
    tactic: "credential_request",
    quoteBn: "গোপন কোড বা পাসওয়ার্ড চাওয়া হয়েছে",
    quoteEn: "A secret code or password is requested",
    reasonBn: "OTP, PIN বা পাসওয়ার্ড অন্য কাউকে দিলে অ্যাকাউন্ট বা লেনদেনের নিয়ন্ত্রণ হারানোর ঝুঁকি থাকে।",
    reasonEn: "Sharing an OTP, PIN, or password can allow someone else to access an account or authorize a transaction."
  },
  {
    id: "upfront_fee",
    weight: 30,
    regex: /\b(?:processing fee|registration fee|release fee|advance fee|claim fee|security deposit|pay now|payment required|send money)\b|\bfee\s+(?:pathan|diben|den|dite hobe)\b|\btaka\s+(?:pathan|diben|den)\b|প্রসেসিং ফি|রেজিস্ট্রেশন ফি|রিলিজ ফি|আগাম ফি|আগে টাকা|টাকা পাঠান|পেমেন্ট করুন/i,
    tactic: "upfront_payment",
    quoteBn: "আগাম টাকা বা ফি চাওয়া হয়েছে",
    quoteEn: "An upfront payment or fee is requested",
    reasonBn: "পুরস্কার, চাকরি বা সুবিধা পাওয়ার আগে অপ্রত্যাশিত ফি চাওয়া সতর্কতার কারণ; তবে শুধু ফি উল্লেখ করাই প্রতারণার প্রমাণ নয়।",
    reasonEn: "An unexpected fee before receiving a prize, job, or benefit deserves scrutiny, but mentioning a fee alone does not prove fraud."
  },
  {
    id: "prize_claim",
    weight: 22,
    regex: /\b(?:you have won|cash prize|claim your prize|lottery winner|congratulations.{0,40}winner|prize money)\b|\bprize\s+(?:jitsen|jitse|paichen|paisen)\b|\bpuraskar\s+(?:jitsen|jitse|paichen|paisen)\b|পুরস্কার জিতেছেন|নগদ পুরস্কার|লটারি জিতেছেন|বিজয়ী নির্বাচিত/i,
    tactic: "unverified_prize_claim",
    quoteBn: "পুরস্কার জেতার দাবি করা হয়েছে",
    quoteEn: "A prize or winnings claim is made",
    reasonBn: "পুরস্কারের দাবিটি স্বাধীনভাবে যাচাই করা হয়নি; শুধু পুরস্কারের দাবি প্রতারণার প্রমাণ নয়।",
    reasonEn: "The prize claim has not been independently verified; a prize claim alone is not proof of fraud."
  },
  {
    id: "job_offer",
    weight: 16,
    regex: /\b(?:guaranteed job|work from home|high salary|job offer|easy income|daily income|hiring now)\b|নিশ্চিত চাকরি|ঘরে বসে আয়|উচ্চ বেতন|সহজ আয়|নিয়োগ চলছে/i,
    tactic: "unverified_job_offer",
    quoteBn: "চাকরি বা আয়ের প্রস্তাব দেওয়া হয়েছে",
    quoteEn: "A job or income opportunity is offered",
    reasonBn: "চাকরি ও আয়ের প্রস্তাবের প্রতিষ্ঠান, শর্ত এবং নিয়োগ বিজ্ঞপ্তি আলাদাভাবে যাচাই করা দরকার।",
    reasonEn: "The organisation, terms, and recruitment notice behind a job or income offer need independent verification."
  },
  {
    id: "urgency",
    weight: 18,
    regex: /\b(?:urgent|immediately|expires today|limited time|act now|last chance|within \d+ hours?|account will be blocked|account suspended)\b|জরুরি|এখনই|আজই শেষ|শেষ সুযোগ|অ্যাকাউন্ট বন্ধ|অ্যাকাউন্ট স্থগিত/i,
    tactic: "urgency",
    quoteBn: "জরুরি চাপ বা ভয় দেখানো হয়েছে",
    quoteEn: "Urgency or pressure is used",
    reasonBn: "তাড়াহুড়া বা ভয় দেখিয়ে দ্রুত সিদ্ধান্ত নিতে বলা প্রতারণার পরিচিত কৌশল হতে পারে।",
    reasonEn: "Pressure to act immediately can be a manipulation tactic that prevents careful checking."
  },
  {
    id: "suspicious_link_prompt",
    weight: 15,
    regex: /\b(?:click here|verify your account|login here|update your account|open this link|download this app)\b|এখানে ক্লিক|অ্যাকাউন্ট যাচাই|লিংকে যান|অ্যাপ ডাউনলোড করুন/i,
    tactic: "suspicious_link_prompt",
    quoteBn: "লিংক খোলা বা তথ্য যাচাই করতে বলা হয়েছে",
    quoteEn: "The recipient is asked to open a link or verify details",
    reasonBn: "বার্তার লিংক না খুলে সংশ্লিষ্ট প্রতিষ্ঠানের পরিচিত অফিসিয়াল অ্যাপ বা ওয়েবসাইট আলাদাভাবে ব্যবহার করুন।",
    reasonEn: "Avoid opening the message link; use the organisation's known official app or website independently."
  },
  {
    id: "url_present",
    weight: 8,
    regex: /https?:\/\/[^\s<>()]+|\bwww\.[^\s<>()]+/i,
    tactic: "link_present",
    quoteBn: "বার্তায় একটি ওয়েব লিংক আছে",
    quoteEn: "The message contains a web link",
    reasonBn: "শুধু লিংক থাকা মানেই ক্ষতিকর নয়; লিংকের আসল ডোমেইন ও গন্তব্য যাচাই করা হয়নি।",
    reasonEn: "A link is not automatically malicious; its actual domain and destination have not been checked."
  },
  {
    id: "authority_claim",
    weight: 14,
    regex: /\b(?:bank support|customer care|government officer|police officer|security team|official account)\b|ব্যাংক কর্মকর্তা|কাস্টমার কেয়ার|সরকারি কর্মকর্তা|পুলিশ কর্মকর্তা|নিরাপত্তা দল/i,
    tactic: "possible_impersonation",
    quoteBn: "কোনো প্রতিষ্ঠান বা কর্তৃপক্ষের পরিচয় দাবি করা হয়েছে",
    quoteEn: "An organisation or authority identity is claimed",
    reasonBn: "প্রেরকের পরিচয় শুধু বার্তার ভাষা দিয়ে নিশ্চিত করা যায় না; অফিসিয়াল চ্যানেলে আলাদাভাবে যাচাই করুন।",
    reasonEn: "A sender's identity cannot be authenticated from message wording alone; verify through an official channel."
  },
  {
    id: "remote_access",
    weight: 24,
    regex: /\b(?:install anydesk|install teamviewer|remote access|screen sharing app|download apk|install this apk)\b|অ্যানিডেস্ক ইনস্টল|টিমভিউয়ার ইনস্টল|রিমোট অ্যাক্সেস|স্ক্রিন শেয়ারিং অ্যাপ|এপিকে ইনস্টল/i,
    tactic: "remote_access_request",
    quoteBn: "রিমোট অ্যাক্সেস বা অ্যাপ ইনস্টল করতে বলা হয়েছে",
    quoteEn: "Remote access or an app installation is requested",
    reasonBn: "অপরিচিত ব্যক্তির নির্দেশে রিমোট অ্যাক্সেস অ্যাপ বা APK ইনস্টল করলে ডিভাইস ও অ্যাকাউন্ট ঝুঁকিতে পড়তে পারে।",
    reasonEn: "Installing a remote-access app or APK at a stranger's request can put the device and accounts at risk."
  }
];

const WARNING_CONTEXT = /\b(?:this is (?:a )?(?:scam|fraud)|scam warning|fraud warning|never pay|do not pay|don't pay|never share|do not share|don't share|never disclose|do not disclose|don't disclose|will never ask|never ask|avoid clicking|do not click|don't click)\b|কখনো টাকা পাঠাবেন না|টাকা পাঠাবেন না|ফি দেবেন না|ওটিপি শেয়ার করবেন না|ওটিপি শেয়ার করবেন না|পিন শেয়ার করবেন না|পিন শেয়ার করবেন না|প্রতারণা থেকে সাবধান|স্ক্যাম থেকে সাবধান/i;

const CLAIM_CONTEXT = /\b(?:scholarship|stipend|grant|allowance|financial assistance|government scheme|recruitment|job circular|vacancy|employment|internship|hiring|fellowship|subsidy|benefit|prize|lottery|winner|guaranteed job|job offer|cash prize)\b|বৃত্তি|উপবৃত্তি|অনুদান|সরকারি সহায়তা|সরকারি সহায়তা|নিয়োগ বিজ্ঞপ্তি|নিয়োগ বিজ্ঞপ্তি|চাকরির বিজ্ঞপ্তি|ভাতা|ফেলোশিপ|পুরস্কার|লটারি/i;

function hasBangla(text) {
  return /[\u0980-\u09FF]/.test(text);
}

const DIRECT_CREDENTIAL_REQUEST = /\b(?:reply with|send|share|provide|tell me|give me|enter|submit)\s+(?:your\s+)?(?:otp|one[- ]time password|pin|password|verification code|passcode)\b|\b(?:otp|pin|password)\s+(?:pathan|diben|den|share koren)\b|ওটিপি\s*(?:দিন|পাঠান|শেয়ার করুন|শেয়ার করুন)|পিন\s*(?:দিন|পাঠান)|পাসওয়ার্ড\s*(?:দিন|পাঠান)/i;
const DIRECT_PAYMENT_REQUEST = /\b(?:send|transfer|deposit)\s+(?:(?:the|a)\s+)?(?:(?:processing|registration|release|advance|claim|security|application)\s+)?(?:fee|money|payment|funds)\b|\bpay\s+(?:(?:the|a)\s+)?(?:(?:processing|registration|release|advance|claim|security|application)\s+)?(?:fee|money|payment)\s+(?:now|today|first|to claim|to release)\b|টাকা\s*(?:পাঠান|দিতে হবে)|ফি\s*(?:পাঠান|দিতে হবে)/i;

function stripNegatedInstructions(text) {
  return String(text || "")
    .replace(/\b(?:never|do not|don't)\s+(?:share|disclose|give|send|provide|pay|click|open)\b[^.!?\n]{0,110}/gi, " ")
    .replace(/\b(?:we|your bank|the bank|the service)?\s*will never ask\b[^.!?\n]{0,90}/gi, " ")
    .replace(/(?:কখনো|কোনোভাবেই)?\s*(?:টাকা পাঠাবেন না|টাকা দেবেন না|ফি দেবেন না|ওটিপি (?:শেয়ার করবেন না|শেয়ার করবেন না|দেবেন না)|পিন (?:শেয়ার করবেন না|শেয়ার করবেন না|দেবেন না))[^।!?\n]{0,110}/gi, " ");
}

function isCredentialWarning(text, actionableText) {
  const containsWarning = /\b(?:never share|do not share|don't share|never disclose|do not disclose|don't disclose|will never ask)\b.{0,90}\b(?:otp|pin|password|verification code)\b|\b(?:otp|pin|password)\b.{0,70}\b(?:never share|do not share|don't share|never disclose|do not disclose)\b|ওটিপি.{0,45}(?:শেয়ার করবেন না|শেয়ার করবেন না|দেবেন না)|পিন.{0,35}(?:শেয়ার করবেন না|শেয়ার করবেন না|দেবেন না)/i.test(text);
  return containsWarning && !DIRECT_CREDENTIAL_REQUEST.test(actionableText);
}

export function buildRuleAssessment(inputText, responseLanguage = "bn") {
  const text = String(inputText || "").trim().slice(0, 4000);
  const isBangla = responseLanguage === "bn";
  const banglaInput = hasBangla(text);
  const actionableText = stripNegatedInstructions(text);
  const hasConflictingRequest = DIRECT_CREDENTIAL_REQUEST.test(actionableText) || DIRECT_PAYMENT_REQUEST.test(actionableText);
  const warningContext = WARNING_CONTEXT.test(text) && !hasConflictingRequest;
  const credentialWarning = isCredentialWarning(text, actionableText);

  const matches = RULES.flatMap(rule => {
    if (rule.id === "credential_request" && credentialWarning) return [];
    if (warningContext && rule.id !== "url_present") return [];
    const match = text.match(rule.regex);
    return match ? [{ ...rule, quote: match[0].slice(0, 180) }] : [];
  });

  const ids = new Set(matches.map(item => item.id));
  const prizeAndFee = ids.has("prize_claim") && ids.has("upfront_fee");
  const jobAndFee = ids.has("job_offer") && ids.has("upfront_fee");
  const credentialAndPressure = ids.has("credential_request") && (ids.has("urgency") || ids.has("authority_claim"));
  const phishingPattern = ids.has("suspicious_link_prompt") && ids.has("urgency") && (ids.has("url_present") || ids.has("credential_request"));
  const remoteAccessPattern = ids.has("remote_access") && (ids.has("urgency") || ids.has("authority_claim"));
  const strongPattern = prizeAndFee || jobAndFee || credentialAndPressure || phishingPattern || remoteAccessPattern || ids.has("credential_request");

  const total = warningContext ? 0 : matches.reduce((sum, item) => sum + item.weight, 0);
  const riskScore = warningContext ? 0 : Math.min(95, Math.max(total, strongPattern ? 55 : 0));
  const verdict = warningContext
    ? "likely_safe"
    : strongPattern || total >= 50
      ? "suspicious"
      : "uncertain";
  const riskLevel = riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";
  const claimNeedsVerification = CLAIM_CONTEXT.test(text);
  const selectedMatches = matches.slice(0, 3);

  const evidence = selectedMatches.map(item => ({
    quote: item.quote,
    quote_bn: banglaInput ? item.quote : item.quoteBn,
    quote_en: banglaInput ? item.quoteEn : item.quote,
    reason_bn: item.reasonBn,
    reason_en: item.reasonEn
  }));

  let summary_bn;
  let summary_en;
  if (warningContext) {
    summary_bn = "বার্তাটি প্রতারণা এড়ানোর বিষয়ে সতর্ক করছে। তবুও প্রেরকের পরিচয় বা কোনো লিংক যাচাই করা হয়নি।";
    summary_en = "This message appears to warn people about avoiding scams. The sender and any links have not been authenticated.";
  } else if (prizeAndFee) {
    summary_bn = "বার্তাটি পুরস্কারের দাবি করে আগাম টাকা বা ফি চাইছে। এটি একটি শক্তিশালী প্রতারণার সতর্কসংকেত; তবে প্রেরকের পরিচয় স্বাধীনভাবে যাচাই করা হয়নি।";
    summary_en = "The message combines a prize claim with an upfront fee request. This is a strong scam warning sign, although the sender has not been independently authenticated.";
  } else if (jobAndFee) {
    summary_bn = "বার্তাটি চাকরি বা আয়ের সুযোগের সঙ্গে আগাম টাকা চাইছে। টাকা পাঠানোর আগে নিয়োগদাতা ও বিজ্ঞপ্তি স্বাধীনভাবে যাচাই করা জরুরি।";
    summary_en = "The message combines a job or income offer with an upfront payment request. Verify the employer and vacancy independently before paying anything.";
  } else if (credentialAndPressure || ids.has("credential_request")) {
    summary_bn = "বার্তায় OTP, PIN বা পাসওয়ার্ড চাওয়া হয়েছে। এ ধরনের গোপন তথ্য অন্য কাউকে দেবেন না।";
    summary_en = "The message asks for an OTP, PIN, or password. Do not share these confidential details with another person.";
  } else if (phishingPattern || remoteAccessPattern) {
    summary_bn = "বার্তায় চাপ সৃষ্টি করে লিংক খুলতে বা ডিভাইসে অ্যাক্সেস দিতে বলা হয়েছে। এটি ফিশিং বা অ্যাকাউন্ট-ঝুঁকির সতর্কসংকেত হতে পারে।";
    summary_en = "The message uses pressure to get the recipient to open a link or grant device access. This may be a phishing or account-security warning sign.";
  } else if (matches.length > 0) {
    summary_bn = "বার্তায় কিছু সতর্কতার সংকেত পাওয়া গেছে, তবে শুধু এই সংকেতগুলো দিয়ে প্রতারণা নিশ্চিত করা যায় না।";
    summary_en = "Some warning signals were found, but these signals alone are not enough to confirm fraud.";
  } else {
    summary_bn = "দেওয়া লেখায় পরিচিত প্রতারণার স্পষ্ট সংকেত পাওয়া যায়নি। তবে এটিকে নিরাপদ প্রমাণ করা যাচ্ছে না।";
    summary_en = "No clear known scam pattern was detected in the supplied text. This does not establish that the message is safe.";
  }

  const safeActionsBn = verdict === "suspicious"
    ? ["কোনো টাকা, OTP, PIN বা পাসওয়ার্ড দেবেন না।", "বার্তার লিংক বা অচেনা অ্যাপ খুলবেন না।", "প্রতিষ্ঠানের অফিসিয়াল ওয়েবসাইট বা অ্যাপ নিজে খুঁজে তথ্য যাচাই করুন।"]
    : ["অপ্রত্যাশিত টাকা বা গোপন তথ্যের অনুরোধে সাড়া দেবেন না।", "প্রেরক ও লিংক স্বাধীনভাবে যাচাই করুন।", "সন্দেহ থাকলে সংশ্লিষ্ট প্রতিষ্ঠানের পরিচিত অফিসিয়াল চ্যানেলে যোগাযোগ করুন।"];
  const safeActionsEn = verdict === "suspicious"
    ? ["Do not send money or share an OTP, PIN, or password.", "Do not open the message link or install an unfamiliar app.", "Find the organisation's official website or app independently and verify the request."]
    : ["Do not act on unexpected requests for money or confidential information.", "Verify the sender and links independently.", "When unsure, contact the organisation through a known official channel."];

  const claimSummaryBn = claimNeedsVerification
    ? "এই ফলাফলে কোনো সরকারি বা শিক্ষাপ্রতিষ্ঠানের বাহ্যিক উৎস খোঁজা হয়নি। তাই দাবিটি অযাচাইকৃত; যাচাই না হওয়া প্রতারণার প্রমাণ নয়।"
    : "";
  const claimSummaryEn = claimNeedsVerification
    ? "No external government or educational source was searched for this assessment. The claim remains unverified; lack of verification alone does not prove fraud."
    : "";

  return {
    isRelevant: true,
    responseLanguage: isBangla ? "bn" : "en",
    verdict,
    riskScore,
    riskLevel,
    summary_bn,
    summary_en,
    evidence,
    tactics: selectedMatches.map(item => item.tactic),
    safe_actions: isBangla ? safeActionsBn : safeActionsEn,
    matchedSignals: selectedMatches.map(item => item.tactic),
    uncertainty: isBangla
      ? "এটি শুধু দেওয়া লেখার নিয়মভিত্তিক পরীক্ষা। প্রেরকের পরিচয়, লিংকের গন্তব্য, অর্থ লেনদেন বা বাহ্যিক দাবির সত্যতা যাচাই করা হয়নি।"
      : "This is a rule-based check of the supplied text only. The sender, link destination, payments, and external factual claims have not been verified.",
    confidence: warningContext || matches.length === 0 ? "low" : matches.length >= 2 ? "medium" : "low",
    engine: "Rule-based",
    model: "deterministic-rules",
    degradedMode: false,
    webEvidence: { searched: false, searchExecuted: false, status: "not_available", officialSourcesFound: 0, sources: [] },
    claimVerification: {
      status: claimNeedsVerification ? "unverified" : "not_applicable",
      summary_bn: claimSummaryBn,
      summary_en: claimSummaryEn
    },
    disclaimer: "Automated rule-based assessment only. It is not proof of fraud or safety; verify important requests independently."
  };
}
