# SHONKET AI

Bangladesh-focused scam-awareness and message-checking toolkit.

**Tagline:** Detect. Understand. Practise. Protect.

## Features

- Bangla and English scam checks using the existing deterministic rule engine.
- Optional LLM-assisted explanations. The LLM cannot change the deterministic verdict or risk score.
- Lexical RAG over a small, curated knowledge base of official Bangladesh safety guidance. Original source links are displayed.
- Screenshot upload (PNG/JPG/WebP up to 2.5 MB). OCR runs in the browser with Tesseract.js in English and Bangla; image files are not uploaded.
- Microphone dictation, link-structure inspector, screenshot preview, and scam-awareness simulator.
- Claims about scholarships, jobs, grants, benefits, and prizes remain **unverified** unless the exact claim is independently confirmed by its issuing organisation. The curated RAG collection is not live web search.
- AI-generated explanations are advisory and do not authenticate senders, domains, notices, or offers.

## Architecture

- **Frontend:** React + Vite, deployed to GitHub Pages.
- **Backend:** Netlify Function at `POST /api/analyze`.
- **LLM:** Hugging Face Inference Providers, called only from the server-side Netlify Function.
- **RAG:** Small lexical retrieval over curated sources in `netlify/functions/knowledge-base.mjs`.
- **Screenshot OCR:** Tesseract.js in the browser. The screenshot image itself is not sent to Netlify or the LLM provider.
- **Rule engine:** `api/ruleAssessment.js`; used by the backend and by the browser as an offline fallback.

The RAG implementation is lexical retrieval, not vector embeddings or a vector database. It retrieves general safety guidance; it does not prove that a specific message is genuine or fraudulent.

## Deploy the backend to Netlify

Connect the GitHub repository `rakibulhasanrakibofficial/shonket-ai` to Netlify.

Build settings:
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The `netlify.toml` file configures the function and routes `/api/analyze` to it.

### Netlify environment variables

Configure these in **Site configuration → Environment variables**. Never put `HF_TOKEN` in the repository or a frontend variable.

| Variable | Required | Purpose |
|---|---|---|
| `HF_TOKEN` | Optional | Hugging Face token with Inference Providers permission. Without it, deterministic results and RAG sources still work, but no LLM explanation is generated. |
| `HF_MODEL` | Optional | Model and provider routing preference. Default: `Qwen/Qwen2.5-7B-Instruct:cheapest`. |
| `CORS_ALLOWED_ORIGINS` | Optional | Comma-separated permitted frontend origins. The GitHub Pages origin, Netlify's own `URL`, and local Vite origins are allowed by default. |

Hugging Face currently provides **$0.10/month** in Inference Providers credit for free accounts, subject to change. This is a small trial allowance, not unlimited usage. Additional usage requires separately purchased credits. Review the current provider/model availability, pricing, terms and data-handling conditions before enabling hosted inference.

A best-effort per-IP request limit is applied in each warm function instance when LLM is enabled. Serverless instances do not share this in-memory counter, so it is not a substitute for a distributed production rate limiter.

### Privacy and data handling

The message is sent to the Netlify Function for rule assessment and RAG retrieval. When `HF_TOKEN` is configured, a redacted copy is sent to the selected Hugging Face Inference Provider for an explanation. The redaction removes common email addresses, URLs, Bangladeshi mobile numbers, and long digit strings, but it cannot guarantee removal of every personal detail. The function does not write messages to an application database. Provider-side processing is governed by the provider's own terms and privacy rules.

The checker shows a notice before submission. Do not enter passwords, OTPs, PINs, account numbers, private documents, or other sensitive personal information.

## Deploy the frontend to GitHub Pages

1. In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, add:
   - Name: `VITE_API_BASE_URL`
   - Value: your Netlify site origin, for example `https://your-site-name.netlify.app` (no trailing slash).
3. Ensure the Netlify site's allowed CORS origin includes `https://rakibulhasanrakibofficial.github.io`. The default configuration already includes it.
4. Push to `main` or manually run the **Deploy GitHub Pages** workflow.
5. The workflow builds with the project base path `/shonket-ai/` and publishes `dist`.
6. Open `https://rakibulhasanrakibofficial.github.io/shonket-ai/`.

If `VITE_API_BASE_URL` is not configured, the UI remains usable with local deterministic rules and browser-side screenshot OCR. A new Pages build is required after changing this variable.

## Local development and tests

- `npm install`
- `npm run dev` starts the Vite frontend.
- `npm run test:fast` runs rule-engine, RAG, redaction and Netlify Function tests.
- `npm run build` creates a root-path build.
- `npm run build:github-pages` builds with the GitHub Pages subpath.
- Use `npx netlify dev` to run the frontend and Netlify Function together locally.

## API behavior

- `POST /api/analyze` accepts up to 4,000 characters. Request bodies are capped at 16 KB.
- The response includes the deterministic rule assessment, `aiAnalysis`, and `retrievedSources`.
- If `HF_TOKEN` is absent or the provider is unavailable, the endpoint still returns rule-based results and retrieved safety guidance.
- LLM explanations never override the deterministic verdict or risk score.
- Screenshot binaries are never accepted by the backend; OCR runs in the browser and only extracted text is sent to the checker.

## Curated knowledge sources

- [bKash — Fraud Awareness](https://www.bkash.com/bn/page/fraud-awareness)
- [bKash — Security Tips](https://www.bkash.com/index.php/en/page/security-tips)
- [BGD e-GOV CIRT — Error524 smishing advisory (13 April 2026)](https://www.cirt.gov.bd/advisories/global-campaign-targeting-bd)
- [Government of Bangladesh — ScamCheck: Victim of a Scam](https://scamcheck.gov.bd/victim-of-a-scam/)

## Limitations

- Risk scores are deterministic heuristics, not calibrated probabilities.
- A suspicious result is a warning for further checking, not proof of fraud. A low-risk result is not a guarantee of safety.
- The curated RAG corpus can become outdated; it does not run live web searches.
- URL inspection checks URL structure only. It does not resolve redirects, check domain reputation, or visit the submitted URL.
- Screenshot OCR can misread blurry or cropped text. Always review extracted text.
- The browser's speech-recognition provider may process audio under its own terms. SHONKET does not receive raw microphone audio.
