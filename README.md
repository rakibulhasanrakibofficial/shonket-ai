# SHONKET AI

### Detect. Understand. Practise. Protect.

**A Bangladesh-focused AI-assisted scam-awareness tool that helps people examine suspicious messages, understand warning signs, and verify claims against selected official sources.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20Shonket%20AI-0f766e?style=for-the-badge)](https://rakibulhasanrakibofficial.github.io/shonket-ai/)
[![GitHub](https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/rakibulhasanrakibofficial/shonket-ai)

> Built for **Ostad Presents YUNet AIgnite Buildathon 2026**.

---

## The problem

Scam messages often arrive through SMS, WhatsApp, Facebook, email, and fake job or scholarship announcements. They use urgency, prize claims, advance fees, suspicious links, and requests for OTPs or personal information.

People are often left with two poor choices: trust the message, or search the internet themselves and struggle to decide which sources are reliable.

## Our solution

**Shonket AI** turns a suspicious message into an understandable risk assessment. It combines explainable rule-based checks, optional AI-generated explanations, curated Bangladesh-focused safety guidance, and a limited search of selected official or institutional sources.

It is designed to help users ask three practical questions:

1. **What looks suspicious?** See the warning signs and a transparent heuristic risk score.
2. **What can I verify?** Review relevant official notices or contextual safety guidance, with the evidence type clearly labelled.
3. **What should I do next?** Get practical safety steps instead of a verdict with no explanation.

## Key features

| Feature | What it does |
|---|---|
| **Scam Message Checker** | Examines message text for patterns such as OTP requests, advance fees, prize claims, urgency, and suspicious links. |
| **Bangla + English** | Supports Bangla and English analysis, with Banglish patterns covered by representative tests. |
| **Official-Source Search** | Searches selected Bangladesh government or institutional sources for supported categories such as scholarships, recruitment, banking, mobile financial services, and cybersecurity. |
| **Claim Verification** | Separates a matching notice from general safety guidance. A related advisory is never presented as proof that a specific message is genuine. |
| **AI Explanation** | Provides an optional, easier-to-understand explanation. AI does not control the deterministic verdict or risk score. |
| **Link Inspector** | Examines URL structure and can query hostname-based threat intelligence. It does not open the submitted webpage. |
| **Screenshot OCR** | Extracts English and Bangla text from supported screenshots in the browser using Tesseract.js. |
| **Voice Input** | Lets users dictate a message where browser speech recognition is supported. |
| **Scam Awareness Simulator** | Offers practice scenarios to help users recognise common manipulation tactics. |
| **Shareable Results** | Copy or export an analysis result as a print-ready PDF. |

## How it works

1. The user pastes a message, dictates it, or uploads a screenshot.
2. If a screenshot is provided, OCR extracts text locally in the browser. The image itself is not uploaded.
3. The deterministic rule engine checks the extracted or entered text and produces the verdict, heuristic score, and matched warning signals.
4. Curated safety guidance is retrieved where relevant.
5. For supported categories, the backend searches a capped allowlist of selected official or institutional sources.
6. The interface presents the result, evidence type, uncertainty, and recommended safety actions. Optional AI text explains the result but cannot override the rule assessment.

### Important distinction

Official-source search is **not unrestricted whole-web search**. It only checks configured sources for supported categories. Results distinguish matching listings or notices from general safety guidance. A search result does not authenticate the sender, and no result does not prove a claim is false.

## Tech stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend/API:** Cloudflare Workers
- **AI inference:** Cloudflare Workers AI — Gemma 4 26B A4B Instruct
- **Scam assessment:** Deterministic JavaScript rule engine
- **Knowledge retrieval:** Lexical RAG over a curated safety knowledge base
- **Official-source retrieval:** Category-aware search over an HTTPS allowlist
- **Screenshot OCR:** Tesseract.js (English + Bangla, browser-side)
- **Threat intelligence:** URLhaus Community API (optional server-side integration)
- **Testing:** Node.js test runner and Playwright

## Architecture

```mermaid
flowchart TD
    A[User message / voice / screenshot] --> B{Input type}
    B -->|Screenshot| C[Browser OCR: Tesseract.js]
    B -->|Text or voice transcript| D[Message text]
    C --> D
    D --> E[Cloudflare Worker API]
    E --> F[Deterministic rule engine]
    E --> G[Curated safety knowledge retrieval]
    E --> H[Selected official-source search]
    E --> I[Optional Workers AI explanation]
    F --> J[Result assembly]
    G --> J
    H --> J
    I --> J
    J --> K[Risk signals, evidence, uncertainty and safety steps]
```

## Live deployment

| Component | URL |
|---|---|
| **Web application** | https://rakibulhasanrakibofficial.github.io/shonket-ai/ |
| **Cloudflare Worker API** | https://shonket-ai.rakibhasan212029.workers.dev |
| **API health check** | https://shonket-ai.rakibhasan212029.workers.dev/health |
| **Source code** | https://github.com/rakibulhasanrakibofficial/shonket-ai |

## Run locally

### Requirements

- Node.js 20 or later
- npm

### Setup

```bash
git clone https://github.com/rakibulhasanrakibofficial/shonket-ai.git
cd shonket-ai
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

### Run tests

```bash
# Fast unit and integration tests
npm run test:fast

# Desktop and mobile browser tests
npx playwright test

# Production build
npm run build

# Live Worker smoke test
node scripts/live-worker-smoke.mjs
```

The live smoke test requires the deployed Worker to be reachable. Playwright may require browser installation in a fresh environment; see the [Playwright documentation](https://playwright.dev/docs/intro).

## Security and privacy

- Screenshot OCR runs in the browser. Screenshot files are not sent to the API.
- The API does not write submitted messages to an application database.
- Common email addresses, URLs, Bangladeshi mobile numbers, and long digit strings are redacted from the copy sent to the AI model. Redaction is not guaranteed to catch every personal detail.
- URLhaus lookups use the hostname; URL paths, query strings, fragments, usernames, passwords, and tokens are not sent.
- Rate limiting is configured at the Worker layer.
- Never enter passwords, OTPs, PINs, bank details, account numbers, or private documents.

## Responsible use and limitations

Shonket AI is a **scam-awareness assistant, not a fraud-detection authority**.

- Risk scores are heuristic points, not calibrated probabilities.
- A suspicious result is a reason to investigate, not proof of fraud. A low-risk result is not a guarantee of safety.
- AI explanations can be wrong and must not be treated as authentication.
- Official-source search covers a limited allowlist; pages may be unavailable, incomplete, or changed.
- The tool does not authenticate senders, resolve every redirect, visit submitted webpages, or perform a full malware scan.
- URLhaus records indicate reported malware-hosting activity; a database miss does not mean a domain is safe.
- OCR may misread blurry, cropped, or stylised text. Review extracted text before relying on an assessment.
- Browser speech recognition may be processed by the browser's speech provider under its own terms.

**If a message claims to be from a bank, mobile financial service, university, employer, or government agency, verify it independently using that organisation's official app, website, or published contact channel.**

## Validation

The recorded local QA run for the merged feature work reported:

- **160 fast tests passed**
- **49 Playwright E2E tests passed**
- **1 expected desktop-only skip** (the mobile viewport overflow check runs in the mobile project)
- Live Worker smoke checks reported successful health, AI binding, rate-limit configuration, rule assessment, official-source guidance, domain search, and URLhaus provider checks.

These are point-in-time results, not a claim that every possible input has been tested. Automated tests cover representative English, Bangla, and Banglish scam patterns, benign notices, API validation, rate limiting, OCR constraints, URL inspection, responsive UI flows, and asynchronous search behaviour.

## Project goal

Shonket AI aims to make digital-safety checks more understandable and accessible for people in Bangladesh by combining explainable signals, relevant local guidance, and clear next steps.

**Detect. Understand. Practise. Protect.**

---

*Made for safer digital awareness in Bangladesh.*
