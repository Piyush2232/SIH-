# SIH Project — AI-Based Fake Identity & Document Screening (Prototype)

Prototype for SIH Problem Statement **26188** — Ministry of Home Affairs, Sashastra Seema Bal (SSB).

This is a **working, browser-based demo** of the four modules in the problem statement — not a slide mockup. Every screen actually runs the analysis it claims to on whatever image you feed it: real OCR, real MRZ checksum math, real error-level analysis, real face-embedding comparison. Nothing is faked or hard-coded, so it's honest to demo live to judges. It's also intentionally scoped down from a production system — see **Limitations** below for exactly where it cuts corners, so you can speak to that confidently in Q&A.

## Running it

No build step, no server-side code, no API keys.

1. Because two of the AI libraries (Tesseract.js and face-api.js) load their models over `fetch`, opening `index.html` directly as a `file://` URL will fail in most browsers (CORS). Serve the folder instead:
   ```bash
   cd afdss
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000` in Chrome or Edge.
3. You need an internet connection the first time — OCR and face-recognition model weights (a few MB) load from CDN and are cached by the browser after that.

No image ever leaves the browser. There is no backend in this prototype; everything — OCR, ELA, metadata parsing, face embeddings — runs on-device.

## What's implemented (Modules 1–4)

| Module | What actually happens |
|---|---|
| **1. OCR Extraction** | Tesseract.js runs real OCR on the uploaded image. If a Machine-Readable Zone (2×44-character block) is detected, it's parsed per the **ICAO 9303** standard: surname/given names, passport number, nationality, DOB, sex, expiry date. For visas/IDs/licences/permits without an MRZ, a keyword/regex extractor pulls labelled fields from the OCR text. |
| **2. Document Validation** | A rule engine checks field completeness, date sanity (not expired, plausible DOB), and — for passports — **real ICAO check-digit validation** (weights 7/3/1 over passport number, DOB, expiry, and the composite check digit). A single altered digit in the MRZ will fail these checks, which is exactly the class of forgery this catches. |
| **3. Tampering Detection** | Runs genuine **Error Level Analysis**: the image is re-compressed at a fixed JPEG quality in-canvas and diffed pixel-by-pixel against the original render; regions with anomalous compression error are rendered as a heatmap and scored. The file's raw bytes are also scanned for known image-editor signatures (Photoshop, GIMP, Snapseed, etc.) left behind in metadata. |
| **4. Face Verification** | face-api.js (TinyFaceDetector + a ResNet-based recognition net, ~128-d embeddings) detects the face in the document photo and in an uploaded bearer photo, and compares them by Euclidean distance — the same approach production face-matching systems use, just with a lighter model. |

A final **Risk Report** combines validation, tampering, and face scores into a single 0–100 composite score (colour-banded Low/Medium/High), a flagged-issues list, and a downloadable JSON **case record** — the "digital trail" the problem statement asks for.

## Honest limitations (and what production would add)

This is a hackathon-stage prototype. Being upfront about the gaps is more credible than pretending it's finished:

- **No database lookups.** "Blacklisted/expired document" checks here are limited to the document's own printed expiry date — there's no connection to a watchlist, passport-issuing-authority database, or Interpol/national databases. Production needs secure backend integration for that.
- **Tampering detection is heuristic, not a trained model.** ELA is a legitimate, widely-used forensic signal, but it's one signal — it doesn't specifically classify "photo replacement" vs. "stamp forgery" vs. "text edit." A production system would train a CNN/vision-transformer classifier on labelled genuine-vs-tampered document datasets (font-consistency checks, stamp-template matching, ghost/double-image detection, print-vs-screen recapture detection) and fuse that with ELA + metadata.
- **MRZ parsing covers TD3 (passport, 2×44) format.** TD1/TD2 (ID card MRZ formats), non-Latin scripts, and non-MRZ security features (holograms, UV ink, microprint) aren't handled — those need document-specific templates and, for physical security features, imaging beyond a plain camera photo.
- **Face matching uses a general-purpose lightweight model**, not a model tuned/liveness-checked for border-control conditions (spoof/print-attack detection, IR/depth camera input) — production needs a liveness layer so a printed photo can't pass as the bearer.
- **No multi-identity/duplicate-identity detection across records**, no case-management workflow, roles, or audit-grade tamper-evident storage for the digital trail (the JSON export here is a start; production could anchor case-record hashes to an immutable ledger, which also speaks to the "Blockchain & Cybersecurity" theme this problem statement is filed under).
- **English-oriented OCR/regex.** Multilingual documents need language packs and script-aware field extraction.

## Suggested demo flow

1. Upload a **passport photo with a visible MRZ strip** → run OCR → watch fields populate from the MRZ, not guesswork.
2. Step into Validation → point out the individual ICAO checksum rows.
3. Step into Tampering → the ELA heatmap panel is the most visual "wow" moment — try one untouched photo and one lightly edited (e.g. crop/paste a name in any editor) to show the contrast.
4. Step into Face Verification → upload a selfie of the same person (should say MATCH), then try a different person's photo (should say MISMATCH).
5. Generate the Risk Report and download the JSON case record.

## File structure

```
afdss/
├── index.html   — layout & markup for the 5-step console
├── style.css    — visual design (dark operator-console theme)
├── app.js       — all logic: OCR, MRZ parsing, validation rules, ELA, face matching, risk scoring
└── README.md    — this file
```
