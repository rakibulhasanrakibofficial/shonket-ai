# SHONKET AI

Bangladesh-focused AI Scam Intelligence & Adaptive Awareness Platform.

**Tagline:** Detect. Understand. Practice. Protect.

## Features
- Gemini-powered Bangla/English message analysis with evidence, manipulation patterns, safe actions, uncertainty and confidence.
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

Redeploy after changing environment variables.

## Limitations and privacy
- Risk score is a deterministic heuristic based on visible message signals, not a probability of fraud or a calibrated security score.
- AI explanations can be wrong. A likely-safe result is not a guarantee.
- Link inspection checks URL structure only. It does not resolve redirects, check reputation, or visit the submitted URL.
- No login, database, or message history is used. Do not submit passwords, OTPs, account numbers, or private information.
- The simulator uses fictional educational scenarios.
