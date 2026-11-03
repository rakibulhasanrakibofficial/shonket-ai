# SHONKET AI

Bangladesh-focused scam-awareness and message-checking toolkit.

**Tagline:** Detect. Understand. Practise. Protect.

## Features

- Bangla and English scam checks using a deterministic rule engine.
- Optional LLM-assisted explanations. The LLM cannot change the deterministic verdict or risk score.
- Lexical RAG over a curated knowledge base of Bangladesh digital-safety guidance.
- Screenshot upload (PNG/JPG/WebP up to 2.5 MB). OCR runs in the browser with Tesseract.js in English and Bangla; image files are not uploaded.
- Microphone dictation, link-structure inspector, result copy/PDF export, and scam-awareness simulator.
- Supported message categories can trigger a category-aware search of selected Bangladesh official or institutional sources: education/scholarship (SHED and DSHE listings), explicitly government recruitment (Alljobs by Teletalk), mobile financial services (bKash safety pages and CIRT/ScamCheck guidance), banking (Bangladesh Bank ICT alerts and BFIU circulars), cybersecurity (BGD e-GOV CIRT and ScamCheck), courier/delivery, telecom/SMS, online commerce, and investment/loan claims (using relevant CIRT, ScamCheck, Bangladesh Bank or BFIU sources). This is **not whole-web search**. Matching listings, official advisories, and general safety guidance are labelled separately. Static guidance is contextual and does not authenticate a specific sender or message. A related notice title is not proof that every claim detail is genuine; no match does not prove a claim is false. Some allowlisted pages may be temporarily unreachable, in which case the result is marked partial or unavailable.
- AI-generated explanations are advisory and do not authenticate senders, domains, notices, or offers.

## Architecture

- **Frontend:** React + Vite, deployed to GitHub Pages.
- **API:** Cloudflare Worker at \`POST /api/analyze\`; health check at \`GET /health\`.
- **LLM:** Cloudflare Workers AI through the native \`env.AI\` binding. Runtime API tokens are not required for inference.
- **Rule engine:** \`api/ruleAssessment.js\`.
- **RAG:** Lexical retrieval over curated sources in \`netlify/functions/knowledge-base.mjs\`.
- **Live official-source search:** `netlify/functions/live-official-search.mjs` routes supported message categories to a capped allowlist of official/institutional pages, including `shed.gov.bd`, `dshe.gov.bd`, `alljobs.teletalk.com.bd`, `bkash.com`, `bb.org.bd`, `bfiu.org.bd`, `cirt.gov.bd`, and `scamcheck.gov.bd`. It fetches only configured HTTPS pages, not user-supplied URLs.
- **Shared analysis handler:** \`netlify/functions/analyze.mjs\` is reused by the Cloudflare Worker and remains compatible with the legacy Netlify function adapter.
- **Screenshot OCR:** Tesseract.js in the browser. The screenshot itself is not sent to the API or LLM provider.

The curated RAG implementation is lexical retrieval, not vector embeddings or a vector database. The official-source search is a separate, category-aware retrieval step over selected allowlisted pages, not unrestricted web search. Search results distinguish matching official notices from contextual safety guidance. Neither a related listing nor absence of a result proves that a specific sender or claim is genuine or fraudulent.

## Cloudflare Worker deployment

The repository already contains the Worker entry point and configuration:

- Worker entry: \`src/worker.js\`
- Wrangler config: \`wrangler.toml\`
- Workers AI binding: \`AI\`
- Per-IP request protection: \`ANALYZE_RATE_LIMITER\`
- Static asset directory: \`dist\`

### 1. Add a GitHub Actions secret

In GitHub, open **Settings → Secrets and variables → Actions → Secrets → New repository secret**.

Create:

| Secret | Value |
|---|---|
| \`CLOUDFLARE_API_TOKEN\` | A Cloudflare API token created from the **Edit Cloudflare Workers** template, scoped to the Cloudflare account that owns this Worker. |

This token is used only by GitHub Actions to deploy the Worker. It is not used by the application at runtime and must never be committed to the repository or shared in chat. The Cloudflare account ID is already configured in the deployment workflow.

### 2. Deploy the Worker

After adding the secret, open **Actions → Deploy Cloudflare Worker API → Run workflow**. The workflow runs the fast test suite, builds the static assets, and deploys with Wrangler.

The account must have its \`workers.dev\` subdomain enabled. Cloudflare assigns the actual Worker URL after deployment; it follows this pattern:

\`https://shonket-ai.<your-workers-subdomain>.workers.dev\`

Open \`/health\` on that URL. The response should report:

- \`ok: true\`
- \`aiBindingConfigured: true\`
- \`rateLimitConfigured: true\`

### 3. Connect GitHub Pages to the Worker

After the first successful Worker deployment, copy the exact Worker origin (no trailing slash).

In GitHub, open **Settings → Secrets and variables → Actions → Variables → New repository variable**.

Create:

| Variable | Value |
|---|---|
| \`SHONKET_API_BASE_URL\` | The exact Worker origin, for example \`https://shonket-ai.<your-workers-subdomain>.workers.dev\` |

Then run **Actions → Deploy GitHub Pages → Run workflow**. The frontend build will use this Worker origin for \`/api/analyze\`.

Until this variable is configured, the frontend can still use its local deterministic rule engine and browser-side screenshot OCR; hosted LLM and live portal search will not be available through the frontend.

### 4. Cloudflare free-plan limits

Cloudflare Workers Free currently includes 100,000 Worker requests per day. Workers AI has a separate free allocation of 10,000 Neurons per day, resetting at 00:00 UTC. These are independent limits: the API can remain reachable after the AI allocation is exhausted, but LLM inference will fail until the allocation resets. This is a finite free tier, not unlimited usage.

The built-in Cloudflare rate-limiting binding is approximate and can allow some bursts beyond its configured threshold; it is an abuse-control layer, not a strict global quota ledger. The current configuration is 12 requests per minute per client IP key.

Official details:
- [Workers Free plan pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers account limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers AI pricing and daily free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI errors and quota exhaustion](https://developers.cloudflare.com/workers-ai/platform/errors/)

## Local development and tests

- \`npm install\`
- \`npm run dev\` starts the Vite frontend.
- \`npm run test:fast\` runs rule-engine, RAG, redaction, Netlify compatibility, and Cloudflare Worker tests.
- \`npm run test:e2e\` runs desktop/mobile Playwright checks.
- \`npm run build\` creates a root-path build.
- \`npm run build:github-pages\` builds with the GitHub Pages subpath.
- \`npm run deploy\` builds and deploys the Cloudflare Worker with Wrangler (requires Cloudflare authentication).

## API behavior

- \`POST /api/analyze\` accepts up to 4,000 characters. Request bodies are capped at 16 KB.
- The response includes deterministic rule assessment, \`aiAnalysis\`, \`retrievedSources\`, and official-search status.
- If Workers AI is unavailable or its free allocation is exhausted, the endpoint still returns the rule-based result and retrieved safety guidance.
- LLM explanations never override the deterministic verdict or risk score.
- Screenshot binaries are not accepted by the API; OCR runs in the browser and only extracted text is sent to the checker.

## Privacy and data handling

The message is sent to the Cloudflare Worker for rule assessment and RAG retrieval. When Workers AI is configured, the handler redacts common email addresses, URLs, Bangladeshi mobile numbers, and long digit strings before sending a copy to the AI model. Redaction cannot guarantee removal of every personal detail. The handler does not write submitted messages to an application database.

Do not enter passwords, OTPs, PINs, account numbers, private documents, or other sensitive personal information.

## Curated knowledge sources

- [bKash — Fraud Awareness](https://www.bkash.com/bn/page/fraud-awareness)
- [bKash — Security Tips](https://www.bkash.com/index.php/en/page/security-tips)
- [BGD e-GOV CIRT — Error524 smishing advisory (13 April 2026)](https://www.cirt.gov.bd/advisories/global-campaign-targeting-bd)
- [Government of Bangladesh — ScamCheck: Victim of a Scam](https://scamcheck.gov.bd/victim-of-a-scam/)

## Limitations

- Risk scores are deterministic heuristics, not calibrated probabilities.
- A suspicious result is a warning for further checking, not proof of fraud. A low-risk result is not a guarantee of safety.
- The curated RAG corpus can become outdated; it is not a live web search.
- Official-source search is limited to the configured source allowlist and a small number of relevant categories per message. It does not crawl the full web. Government notice attachments/PDFs are not parsed, and some pages may be unavailable or block automated retrieval. A `guidance_only` or `partial_guidance` result is safety context, not confirmation of the specific message.
- URL inspection checks URL structure only. It does not resolve redirects, check domain reputation, or visit the submitted URL.
- Screenshot OCR can misread blurry or cropped text. Always review extracted text.
- The browser's speech-recognition provider may process audio under its own terms. SHONKET does not receive raw microphone audio.
