# SHONKET AI

Bangladesh-focused scam-awareness and message-checking toolkit.

**Tagline:** Detect. Understand. Practice. Protect.

## Features

- Bangla and English message checks using deterministic, explainable text patterns.
- Evidence snippets, matched warning signals, practical safety actions, and explicit uncertainty.
- Prize/fee, job/fee, OTP/PIN, urgency, impersonation, suspicious-link-prompt, and remote-access warning patterns.
- Claims about scholarships, jobs, grants, benefits, or prizes remain **unverified** because this version does not search the web.
- Deterministic URL structure inspection. Submitted URLs are never fetched by the backend.
- Fictional scam-awareness simulator with feedback and session score.
- Optional microphone dictation. It uses on-device recognition when supported, and offers a separately confirmed browser-managed speech service otherwise. Existing result narration includes Listen, Pause, Resume, Stop and voice selection controls.
- Responsive interface with accessible reduced-motion support.

## Important scope

Message analysis still runs on text. Optional microphone dictation uses on-device recognition when the browser supports `SpeechRecognition.processLocally` and the selected language pack. If local recognition is unavailable, users may explicitly opt in to their browser-managed speech service; that service may process microphone audio outside the device under the browser provider's terms. There is no silent cloud fallback. Screenshot reading remains unavailable.

This public checker does not call a generative-AI provider. It uses deterministic rules and does not send submitted message text to an external AI inference service. SHONKET does not receive or store microphone audio. On-device voice recognition keeps audio local; if the user explicitly chooses browser-managed voice after seeing a disclosure, their browser may send audio to its speech provider under that provider's terms. The resulting transcript appears in the message box and is submitted for checking only when the user selects Analyze. Server-side rate limiting still uses Upstash Redis.

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

The analysis endpoint fails closed with HTTP 503 if rate-limit storage is not configured. Limits are enforced server-side using atomic Redis counters.

Redeploy after changing environment variables.

## Limitations and privacy

- Risk scores are deterministic heuristics, not probabilities of fraud or calibrated security scores.
- A suspicious result is a warning for further checking, not proof of fraud. An uncertain or low-risk result is not a guarantee of safety.
- Scholarship, job, grant, benefit, and prize claims are not externally verified in this version.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- Screenshot analysis is not available in this version.
- Do not submit passwords, OTPs, PINs, account numbers, or other private information.
- The simulator uses fictional educational scenarios.
- This architecture change removes the generative-AI API call from the public checker; it is not, by itself, a certification of legal compliance or child-safety compliance. Review hosting, analytics, storage, consent, and applicable privacy obligations before public launch.
