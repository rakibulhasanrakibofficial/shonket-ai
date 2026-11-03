# SHONKET AI

Bangladesh-focused scam-awareness and message-checking toolkit.

**Tagline:** Detect. Understand. Practice. Protect.

## Features

- Bangla and English message checks using deterministic, explainable text patterns.
- Screenshot upload (PNG/JPG/WebP up to 2.5 MB), automatic text extraction with Gemini Vision, then a separate deterministic rule assessment of the extracted text.
- Evidence snippets, matched warning signals, practical safety actions, and explicit uncertainty.
- Prize/fee, job/fee, OTP/PIN, urgency, impersonation, suspicious-link-prompt, and remote-access warning patterns.
- Claims about scholarships, jobs, grants, benefits, or prizes remain **unverified** because this version does not search the web.
- Deterministic URL structure inspection. Submitted URLs are never fetched by the backend.
- Fictional scam-awareness simulator with feedback and session score.
- Microphone dictation with separate English/Bangla language controls, an explicit first-use privacy prompt, and clear listening/error states. Result narration includes Listen, Pause, Resume, Stop and voice selection controls.
- Responsive interface with accessible reduced-motion support.

## Important scope

Pasted-message analysis uses deterministic rules and does not send the pasted text to an AI inference service. Screenshot analysis is a separate path: the image is sent to the server, passed to the configured Gemini Vision model to extract visible message text, and that extracted text is checked with the same deterministic rules. Review the extracted text because blurry, cropped, or small text may be misread. Microphone dictation uses the browser's `SpeechRecognition` or `webkitSpeechRecognition` service in the selected language (English or Bangla); the browser may process audio outside the device. SHONKET does not receive raw microphone audio.

This public checker does not call a generative-AI provider. It uses deterministic rules and does not send submitted message text to an external AI inference service. SHONKET does not receive or store raw microphone audio. The browser's speech provider may process microphone audio outside the device after the user's explicit first-use consent. Only the resulting transcript is placed in the message box; it is submitted for checking only when the user selects Analyze. Server-side rate limiting still uses Upstash Redis.

## Stack

React, Vite, Tailwind CSS, Framer Motion, Lucide React, Vercel Serverless Functions, Upstash Redis.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the Upstash Redis REST URL and token to `.env.local`.
4. Run `npm run dev`.

## Vercel environment variables

- `UPSTASH_REDIS_REST_URL` — required for shared, server-side API rate limiting.
- `UPSTASH_REDIS_REST_TOKEN` — required secret for the Upstash Redis REST API.

The text-analysis and screenshot-analysis endpoints fail closed with HTTP 503 if rate-limit storage is not configured. Limits are enforced server-side using atomic Redis counters. Screenshot reading additionally requires `GEMINI_API_KEY`; the optional `GEMINI_MODEL` setting defaults to `gemini-3.5-flash-lite`.

Redeploy after changing environment variables.

## Limitations and privacy

- Risk scores are deterministic heuristics, not probabilities of fraud or calibrated security scores.
- A suspicious result is a warning for further checking, not proof of fraud. An uncertain or low-risk result is not a guarantee of safety.
- Scholarship, job, grant, benefit, and prize claims are not externally verified in this version.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- Screenshot OCR may misread blurry, cropped, low-resolution, or text-heavy images. Always review the extracted text before relying on its assessment.
- Do not submit passwords, OTPs, PINs, account numbers, or other private information.
- The simulator uses fictional educational scenarios.
- This architecture change removes the generative-AI API call from the public checker; it is not, by itself, a certification of legal compliance or child-safety compliance. Review hosting, analytics, storage, consent, and applicable privacy obligations before public launch.
