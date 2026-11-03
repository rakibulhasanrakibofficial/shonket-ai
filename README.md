# SHONKET AI

Bangladesh-focused scam-awareness and message-checking toolkit.

**Tagline:** Detect. Understand. Practice. Protect.

## Features

- Bangla and English message checks using deterministic, explainable text patterns.
- Screenshot upload (PNG/JPG/WebP up to 2.5 MB). OCR runs in the browser with Tesseract.js using English and Bangla language data; only extracted text is sent to the rule-check API.
- Evidence snippets, matched warning signals, practical safety actions, and explicit uncertainty.
- Prize/fee, job/fee, OTP/PIN, urgency, impersonation, suspicious-link-prompt, and remote-access warning patterns.
- Claims about scholarships, jobs, grants, benefits, or prizes remain **unverified** because this version does not search the web.
- Deterministic URL structure inspection. Submitted URLs are never fetched by the backend.
- Fictional scam-awareness simulator with feedback and session score.
- Microphone dictation with separate English/Bangla language controls and the browser's native microphone permission.
- Responsive interface with accessible reduced-motion support.

## Screenshot privacy and limitations

Screenshot OCR runs in the user's browser. The selected screenshot is passed to a browser OCR worker and is not uploaded to SHONKET's server or sent to a generative-AI API. On first use, Tesseract.js downloads its worker/runtime and English/Bangla language data from its configured public CDNs. OCR quality depends on image clarity, font size, language, and layout; always review the extracted text. Only extracted text and any text the user typed are sent to the scam-check endpoint.

Pasted-message analysis uses deterministic rules and does not send message text to an AI inference service. Microphone dictation uses the browser's `SpeechRecognition` or `webkitSpeechRecognition` service; the browser or its speech provider may process audio outside the device. SHONKET does not receive raw microphone audio.

## Stack

React, Vite, Tailwind CSS, Framer Motion, Lucide React, Tesseract.js (browser OCR), Cloudflare Workers Static Assets, and the native Cloudflare Workers Rate Limiting API.

## Deploy with Cloudflare Workers (Free plan)

This project uses a standard Cloudflare Worker with Static Assets. It does not use Pages Functions, Gemini, or Upstash.

1. In **Cloudflare Dashboard → Workers & Pages → Create application → Continue with GitHub**, connect this repository.
2. Set the Git branch to `main` and the project path to the repository root.
3. Set the build command to `npm run build`.
4. Set the deploy command to `npx wrangler deploy`.
5. Leave environment variables empty. No Gemini API key, Upstash URL, or Upstash token is required.
6. Deploy. Wrangler reads `wrangler.toml`, publishes `dist` as static assets, and routes `/api/*` requests to `src/worker.js`.

The API rate limiter is configured in `wrangler.toml` as 60 checks per 60 seconds per client IP. Cloudflare's Rate Limiting API is approximate and the counter is maintained separately in each Cloudflare location; requests can exceed the configured threshold while counters update. People sharing one public IP may share a limit. The rate limiter namespace ID must be unique within the Cloudflare account.

Cloudflare Workers Free has a daily request quota, so this is not unlimited hosting. The exact free-plan limits can change; check Cloudflare's current documentation before relying on a quota.

## Local development

- `npm install`
- `npm run dev` for the Vite frontend.
- `npm run build` to generate static assets.
- `npx wrangler dev` to run the Worker and Static Assets locally.
- `npm run deploy` to build and deploy from a machine authenticated with the Cloudflare account.

## API behavior

- `POST /api/analyze` accepts up to 4,000 characters of text.
- JSON request bodies are capped at 64 KB.
- Screenshot binaries are not accepted by the API; screenshots are OCR'd in the browser and only extracted text is submitted.
- The Worker uses the Cloudflare-provided `CF-Connecting-IP` header for the rate-limit key. Client-supplied forwarded-IP headers are not trusted.
- The Worker returns HTTP 429 when the configured native rate limit is exceeded and fails closed with HTTP 503 if the binding is unavailable.

## Limitations and privacy

- Risk scores are deterministic heuristics, not probabilities of fraud or calibrated security scores.
- A suspicious result is a warning for further checking, not proof of fraud. An uncertain or low-risk result is not a guarantee of safety.
- Scholarship, job, grant, benefit, and prize claims are not externally verified in this version.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- Screenshot OCR may misread blurry, cropped, low-resolution, or text-heavy images. Always review the extracted text.
- Do not submit passwords, OTPs, PINs, account numbers, or other private information.
- The simulator uses fictional educational scenarios.
