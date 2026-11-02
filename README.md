# SHONKET AI

Bangladesh-focused AI Scam Intelligence & Adaptive Awareness Platform.

**Tagline:** Detect. Understand. Practice. Protect.

## Features
- Gemini-powered Bangla/English message analysis with evidence, manipulation patterns, safe actions, uncertainty and confidence.
- Selective Google Search grounding for scholarship, stipend, grant, government-benefit and recruitment claims, with source links and conservative domain labels.
- Screenshot analysis for PNG, JPEG and WebP (up to 3 MB).
- Deterministic URL structure inspection. Submitted URLs are never fetched by the backend.
- Fictional scam-awareness simulator with feedback and session score.
- Responsive interface with accessible reduced-motion support.

## Stack
React, Vite, Tailwind CSS, Framer Motion, Lucide React, Vercel Serverless Functions, Gemini API.

## Local setup
1. Run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `GEMINI_API_KEY` in `.env.local`.
4. Run `npm run dev`.

## Vercel environment variables
- `GEMINI_API_KEY` — required; keep it server-side and never commit it.
- `GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`.
- `UPSTASH_REDIS_REST_URL` — required for shared, server-side API rate limiting.
- `UPSTASH_REDIS_REST_TOKEN` — required secret for the Upstash Redis REST API.

The analysis endpoint fails closed with HTTP 503 if rate-limit storage is not configured. Current limits: 5 analyses per IP per minute and 30 per IP per day. Limits are enforced server-side using atomic Redis counters. Configure both Upstash values in Vercel Environment Variables and redeploy.

Redeploy after changing environment variables.

## Evidence verification
Google Search grounding is enabled only when pasted text contains a supported factual-claim category and checkable details. Search evidence is supplemental: missing results do not prove fraud, and a government/education domain label does not authenticate a specific offer. Review each linked notice and compare the exact amount, institution, deadline, eligibility, and application channel.

Google Search grounding usage has separate quota and pricing. Check the current Gemini API pricing and limits before making this feature available to many users. The implementation uses the existing GEMINI_API_KEY and does not require a separate search-provider key.

## Limitations and privacy
- Risk score is a deterministic heuristic based on visible message signals, not a probability of fraud or a calibrated security score.
- AI explanations can be wrong. A likely-safe result is not a guarantee.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- No login, database, or message history is used. Do not submit passwords, OTPs, account numbers, or private information.
- The simulator uses fictional educational scenarios.
