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

React, Vite, Tailwind CSS, Framer Motion, Lucide React, Tesseract.js (browser OCR), Cloudflare Pages Functions, and Upstash Redis.

## Deploy on Cloudflare Pages (Free plan)

1. Push this repository to GitHub and connect it in **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Select the deployment branch (use `main` after merging this migration branch).
3. Set the build command to `npm run build`, and the build output directory to `dist`. Keep the project root at the repository root.
4. In **Settings → Variables and Secrets**, add these to the Production environment (and Preview too if needed):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN` (secret)
5. Deploy. The `functions/api/analyze.js` file provides the `/api/analyze` endpoint. The `public/_routes.json` configuration keeps ordinary static asset requests out of Functions invocation routing.

No always-on Node server is required. Pages Functions run on demand. Cloudflare Free Workers currently have a daily request quota and a 10 ms CPU-time limit per request; stay within those published limits. Upstash has its own separate limits and plan.

## Local development

- `npm install`
- `npm run dev` for the Vite frontend.
- To test the Cloudflare Pages Function locally, build the app and run `npx wrangler pages dev dist` from the repository root. Configure the two Upstash variables in your local environment first.

## API rate limits

The API requires Upstash Redis REST URL and token. Requests fail closed with HTTP 503 if rate-limit storage is not configured. Limits are enforced server-side with atomic Redis counters: 60 requests per minute and 300 per day per client IP. The Cloudflare Function uses the Cloudflare-provided `CF-Connecting-IP` header; it does not trust a user-supplied forwarded-IP header.

## Limitations and privacy

- Risk scores are deterministic heuristics, not probabilities of fraud or calibrated security scores.
- A suspicious result is a warning for further checking, not proof of fraud. An uncertain or low-risk result is not a guarantee of safety.
- Scholarship, job, grant, benefit, and prize claims are not externally verified in this version.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- Screenshot OCR may misread blurry, cropped, low-resolution, or text-heavy images. Always review the extracted text.
- Do not submit passwords, OTPs, PINs, account numbers, or other private information.
- The simulator uses fictional educational scenarios.
