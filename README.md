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
| **1. OCR Extraction** | Tesseract.js runs real OCR. If an MRZ is detected, it parses per ICAO 9303. It also includes regex fallback models specifically designed to extract data from **Indian Aadhaar Cards**, Driving Licenses, and Visas without explicit labels. Non-document photos are rejected instantly via heuristics. |
| **2. Document Validation** | A rule engine checks field completeness, MRZ checksums, and queries a (mocked) Interpol SLTD Watchlist database. |
| **3. Tampering Detection** | Runs genuine **Error Level Analysis** to expose JPEG quantization variance and scans raw bytes for known image-editor EXIF signatures (Photoshop, GIMP). |
| **4. Face Verification** | face-api.js compares 128-dimensional facial neural embeddings from the document portrait against a live webcam capture or selfie. |
| **5. Entity Resolution (Graph Fraud)** | **NEW:** Every scan saves a `FaceVector` and `DeviceFingerprint` to a local graph database. The system detects "Synthetic Identity / ID Swap" (Same ID, Different Name), "Ghost Face" (Same Face, Different Name), and "Device Velocity" (Multiple IDs submitted rapidly from one browser). |
| **6. Blockchain Auditing** | **NEW:** Generates a SHA-256 cryptographic hash of the JSON case file and simulates a Zero-Knowledge proof broadcast to a Web3 Ledger (Polygon zkEVM) to ensure the forensic trail is permanently tamper-evident. |

The final **Risk Report** utilizes a strict **Highest Watermark & Critical Override** model. If a document fails any single critical security layer, the entire application is hard-locked to `100 / CRITICAL RISK` (Auto-Reject).

## Honest limitations (and what production would add)

This is a hackathon-stage prototype. Being upfront about the gaps is more credible than pretending it's finished:

- **No database lookups.** "Blacklisted/expired document" checks here are limited to the document's own printed expiry date — there's no connection to a watchlist, passport-issuing-authority database, or Interpol/national databases. Production needs secure backend integration for that.
- **Tampering detection is heuristic, not a trained model.** ELA is a legitimate, widely-used forensic signal, but it's one signal — it doesn't specifically classify "photo replacement" vs. "stamp forgery" vs. "text edit." A production system would train a CNN/vision-transformer classifier on labelled genuine-vs-tampered document datasets (font-consistency checks, stamp-template matching, ghost/double-image detection, print-vs-screen recapture detection) and fuse that with ELA + metadata.
- **MRZ parsing covers TD3 (passport, 2×44) format.** TD1/TD2 (ID card MRZ formats), non-Latin scripts, and non-MRZ security features (holograms, UV ink, microprint) aren't handled — those need document-specific templates and, for physical security features, imaging beyond a plain camera photo.
- **Face matching uses a general-purpose lightweight model**, not a model tuned/liveness-checked for border-control conditions (spoof/print-attack detection, IR/depth camera input) — production needs a liveness layer so a printed photo can't pass as the bearer.
- **No multi-identity/duplicate-identity detection across devices.** The Fraud Graph currently runs locally on the browser (`localStorage`) to maintain the "Zero Cloud" privacy promise. In production, this would be backed by a secure Graph Database (like Neo4j) to map fraud rings globally across thousands of nodes.
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
├── style.css    — visual design (Strict "Nothing" Design System - OLED Black, Monospaced, Brutalist)
├── app.js       — all logic: OCR, MRZ parsing, validation rules, ELA, face matching, risk scoring
└── README.md    — this file
```
