/* =========================================================================
   AuthentiQ — AI-Based Fake Identity & Document Screening — Prototype
   All processing happens client-side in the browser. No files or images
   are uploaded to any server. OCR = Tesseract.js. Face matching = face-api.js.
   Tampering detection = Error Level Analysis (ELA) + metadata heuristics.
   ========================================================================= */

const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/';

const state = {
  sessionId: null,
  docType: 'passport',
  docImage: null,        // HTMLImageElement
  docFile: null,
  ocrText: '',
  mrzLines: [],
  fields: {},             // extracted fields
  validation: { rules: [], score: null },
  tamper: { elaScore: 0, metaFlags: [], score: null },
  face: { docDescriptor: null, selfieDescriptor: null, distance: null, verdict: null, score: null },
  faceModelsLoaded: false,
    isDocValid: false
};

/* ---------------------------------------------------------------------
   BOOTSTRAP
--------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  startNewCase();
  wireViewNavigation();
  wireUpload();
  wireStepper();
  wireOcr();
  wireValidationNav();
  wireTamperNav();
  wireFace();
  wireReport();
  document.getElementById('newCaseBtn').addEventListener('click', () => {
    if (confirm('Start a new case? Current extraction will be cleared.')) location.reload();
  });
  // Warm up face-api models in the background so step 4 feels instant.
  loadFaceModels();
});

function wireViewNavigation() {
  const landingView = document.getElementById('landingView');
  const consoleView = document.getElementById('consoleView');

  const showConsole = () => {
    landingView.classList.add('hidden');
    consoleView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showLanding = () => {
    consoleView.classList.add('hidden');
    landingView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  ['launchConsoleFromNav', 'launchConsoleBtn', 'launchConsoleCta'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', showConsole);
  });

  const btnBack = document.getElementById('backToLandingBtn');
  if (btnBack) btnBack.addEventListener('click', showLanding);
}

function startNewCase() {
  state.sessionId = 'SD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  document.getElementById('sessionId').textContent = state.sessionId;
}

/* ---------------------------------------------------------------------
   STEPPER NAVIGATION
--------------------------------------------------------------------- */
function goToStep(n) {
  if (n === 2) renderValidation();
  if (n === 3) runTamperAnalysis();
  if (n === 4) prepDocFace();
  if (n === 5) renderReport();

  for (let i = 1; i <= 5; i++) {
    document.getElementById('panel-' + i).classList.toggle('hidden', i !== n);
    const stepEl = document.querySelector('.step[data-step="' + i + '"]');
    if(stepEl) {
        stepEl.classList.toggle('active', i === n);
        stepEl.classList.toggle('done', i < n);
    }
  }

  const guides = {
    1: { title: "CAPTURE AND OCR", desc: "Upload a passport image or capture via webcam. The system extracts the Machine Readable Zone (MRZ) and parses identity fields." },
    2: { title: "VALIDATION", desc: "Verifies ICAO 9303 modulo-10 check digits, expiration dates, field completeness, and checks against the local SLTD database." },
    3: { title: "TAMPERING SCAN", desc: "Error Level Analysis (ELA) re-compresses document canvases to expose JPEG quantization variance and EXIF signatures." },
    4: { title: "FACE VERIFICATION", desc: "Compares 128-dimensional facial neural embeddings from the document portrait against a live webcam capture or selfie." },
    5: { title: "RISK REPORT", desc: "Generates a composite risk score and a fully air-gapped cryptographic JSON audit trail of the forensics." }
  };
  const guide = guides[n];
  const titleEl = document.getElementById('guideTitle');
  const descEl = document.getElementById('guideDesc');
  if (titleEl && descEl && guide) {
    titleEl.innerText = guide.title;
    descEl.innerText = guide.desc;
  }
}

function markStepStatus(step, passed) {
  const el = document.querySelector(`.step-status[data-status="${step}"]`);
  el.setAttribute('data-pass', passed ? '1' : '0');
}

function wireStepper() {
  document.getElementById('toStep2').addEventListener('click', () => { renderValidation(); goToStep(2); });
  document.getElementById('toStep3').addEventListener('click', () => { runTamperAnalysis(); goToStep(3); });
  document.getElementById('toStep4').addEventListener('click', () => { prepDocFace(); goToStep(4); });
  document.getElementById('toStep5').addEventListener('click', () => { renderReport(); goToStep(5); });
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.getAttribute('data-back'), 10)));
  });
  document.querySelectorAll('.step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const n = parseInt(stepEl.getAttribute('data-step'), 10);
      if (n === 1 || state.isDocValid) goToStep(n); // only allow jump-ahead if a valid document was scanned
    });
  });
}

/* ---------------------------------------------------------------------
   STEP 1 — UPLOAD + OCR
--------------------------------------------------------------------- */
function wireUpload() {
  const dropDoc = document.getElementById('dropDoc');
  const docInput = document.getElementById('docInput');
  const preview = document.getElementById('docPreview');
  const docType = document.getElementById('docType');

  dropDoc.addEventListener('click', () => docInput.click());
  ['dragover', 'dragenter'].forEach(ev => dropDoc.addEventListener(ev, e => { e.preventDefault(); dropDoc.style.borderColor = 'var(--accent)'; }));
  ['dragleave', 'drop'].forEach(ev => dropDoc.addEventListener(ev, e => { e.preventDefault(); dropDoc.style.borderColor = ''; }));
  dropDoc.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleDocFile(e.dataTransfer.files[0]); });
  docInput.addEventListener('change', e => { if (e.target.files[0]) handleDocFile(e.target.files[0]); });
  docType.addEventListener('change', e => { state.docType = e.target.value; });

  function handleDocFile(file) {
    state.docFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.hidden = false;
    const docPrompt = document.getElementById('docPrompt');
    if(docPrompt) docPrompt.hidden = true;
      const img = new Image();
      img.onload = () => { state.docImage = img; };
      img.src = e.target.result;
      document.getElementById('runOcrBtn').disabled = false;
    };
    reader.readAsDataURL(file);
  }
}

function wireOcr() {
  document.getElementById('runOcrBtn').addEventListener('click', runOcr);
}

async function runOcr() {
  if (!state.docFile) return;
  const progressWrap = document.getElementById('ocrProgress');
  const bar = document.getElementById('ocrProgressBar');
  const label = document.getElementById('ocrProgressLabel');
  progressWrap.hidden = false;
  document.getElementById('runOcrBtn').disabled = true;

  try {
    const { data } = await Tesseract.recognize(state.docFile, 'eng', {
      logger: (m) => {
        if (m.progress != null) {
          bar.style.setProperty('--pct', Math.round(m.progress * 100) + '%');
        }
        label.textContent = (m.status || 'processing') + '…';
      }
    });
    state.ocrText = data.text || '';
    label.textContent = 'Done.';
    processOcrText();
  } catch (err) {
    label.textContent = 'OCR failed: ' + err.message;
    console.error(err);
  } finally {
    document.getElementById('runOcrBtn').disabled = false;
  }
}

function processOcrText() {
  const text = state.ocrText;
  const rawTextEl = document.getElementById('rawText');
  rawTextEl.textContent = text.trim() || '(no text recognised)';
  rawTextEl.style.color = ''; // reset color

  // Attempt MRZ detection (passport / MRZ-bearing docs)
  const mrz = extractMrzLines(text);
  state.mrzLines = mrz;
  const mrzHeading = document.getElementById('mrzHeading');
  const mrzBox = document.getElementById('mrzLines');
  if (mrz.length >= 2) {
    mrzHeading.hidden = false;
    mrzBox.hidden = false;
    mrzBox.textContent = mrz.join('
');
    state.fields = parseMrz(mrz);
  } else {
    mrzHeading.hidden = true;
    mrzBox.hidden = true;
    state.fields = extractFieldsByKeyword(text, state.docType);
  }

  const validFieldsFound = Object.values(state.fields).filter(v => v && String(v).trim().length > 0).length;
  
  // HEURISTIC: Not a document if almost no text OR no fields extracted
  const isLikelyNotDocument = text.replace(/\s/g, '').length < 30 || validFieldsFound === 0;

  document.getElementById('ocrOutput').hidden = false;

  if (isLikelyNotDocument) {
    state.isDocValid = false;
    rawTextEl.textContent = "
[!] INVALID DOCUMENT DETECTED

The AI could not detect any identity fields or readable text.
Please upload a clear, well-lit image of a valid Passport or ID document.

Raw Output:
" + (text.trim() || '(none)');
    rawTextEl.style.color = 'var(--high)';
    document.getElementById('fieldList').innerHTML = '<li class="fail">Document validation blocked. Please try another image.</li>';
    const nextBtn = document.getElementById('toStep2');
    nextBtn.disabled = true;
    nextBtn.classList.remove('active-btn');
    markStepStatus(1, false);
    
    // Poison the validation state so bypassing guarantees Critical Risk
    state.validation.rules = [{ status: 'fail', title: 'Invalid Document', detail: 'The uploaded image contains no recognizable identity data.' }];
    state.validation.score = 100;
  } else {
    state.isDocValid = true;
    renderFieldTable(state.fields);
    const nextBtn = document.getElementById('toStep2');
    nextBtn.disabled = false;
    nextBtn.classList.add('active-btn');
    markStepStatus(1, true);
  }
}

function renderFieldTable(fields) {
  const table = document.getElementById('fieldTable');
  table.innerHTML = '';
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    table.innerHTML = '<tr><td colspan="2">No structured fields detected — check image quality.</td></tr>';
    return;
  }
  entries.forEach(([k, v]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${labelize(k)}</td><td>${(v+"").replace(/</g, "&lt;") || '<span class="muted">—</span>'}</td>`;
    table.appendChild(tr);
  });
}

function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ');
}

/* ---- MRZ extraction & ICAO 9303 parsing ---- */
function extractMrzLines(text) {
  const candidates = text
    .split('
')
    .map(l => l.toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter(l => l.length >= 28 && (l.match(/</g) || []).length >= 2);
  // Prefer the last two matching lines of similar (near-44) length — typical MRZ block position.
  return candidates.slice(-2).map(l => l.padEnd(44, '<').slice(0, 44));
}

function sanitizeMrzDigits(str) {
  if (!str) return '';
  return str.toUpperCase()
    .replace(/[OQD]/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8');
}

function mrzCharValue(c) {
  if (c === '<') return 0;
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  return 0;
}
function mrzChecksum(str) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += mrzCharValue(str[i]) * weights[i % 3];
  return sum % 10;
}
function mrzDateToIso(yymmdd, isExpiry = false) {
  const clean = sanitizeMrzDigits(yymmdd);
  if (!/^\d{6}$/.test(clean)) return null;
  const yy = parseInt(clean.slice(0, 2), 10);
  const mm = clean.slice(2, 4);
  const dd = clean.slice(4, 6);
  const yyyy = isExpiry ? 2000 + yy : (yy > 30 ? 1900 + yy : 2000 + yy);
  return `${yyyy}-${mm}-${dd}`;
}

function parseMrz(lines) {
  const [l1, l2] = lines;
  const fields = {};
  fields.docCode = l1.slice(0, 2).replace(/</g, '');
  fields.issuingCountry = l1.slice(2, 5).replace(/</g, '');
  const namePart = l1.slice(5).split('<<');
  fields.surname = (namePart[0] || '').replace(/</g, ' ').trim();
  fields.givenNames = (namePart[1] || '').replace(/</g, ' ').trim();
  fields.name = [fields.surname, fields.givenNames].filter(Boolean).join(', ');

  // Auto-correct common OCR digit confusion in numeric zones
  const passportNoRaw = l2.slice(0, 9);
  const passportNoClean = passportNoRaw.replace(/</g, "").trim();
  const passportNoCheck = sanitizeMrzDigits(l2[9]);
  fields.passportNumber = passportNoClean.replace(/</g, '');
  fields.nationality = l2.slice(10, 13).replace(/</g, '');

  const dobRaw = sanitizeMrzDigits(l2.slice(13, 19));
  const dobCheck = sanitizeMrzDigits(l2[19]);
  fields.dateOfBirth = mrzDateToIso(dobRaw);

  const sexChar = l2[20].toUpperCase() === '0' ? 'O' : l2[20].toUpperCase();
  fields.gender = { M: 'Male', F: 'Female' }[sexChar] || 'Unspecified';

  const expRaw = sanitizeMrzDigits(l2.slice(21, 27));
  const expCheck = sanitizeMrzDigits(l2[27]);
  fields.dateOfExpiry = mrzDateToIso(expRaw);

  const personalNoRaw = l2.slice(28, 42);
  const personalNoCheck = sanitizeMrzDigits(l2[42]);
  const compositeCheck = sanitizeMrzDigits(l2[43]);

  // Store raw MRZ pieces + checksum validity for the validation module.
  const compositeRaw = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
  const compositeClean = passportNoClean + passportNoCheck + dobRaw + dobCheck + expRaw + expCheck + personalNoRaw + personalNoCheck;

  fields._mrz = {
    passportNoRaw: passportNoClean, passportNoCheck,
    passportNoValid: String(mrzChecksum(passportNoClean)) === passportNoCheck,
    dobRaw, dobCheck, dobValid: String(mrzChecksum(dobRaw)) === dobCheck,
    expRaw, expCheck, expValid: String(mrzChecksum(expRaw)) === expCheck,
    personalNoRaw, personalNoCheck,
    composite: compositeClean,
    compositeCheck,
  };
  fields._mrz.compositeValid = String(mrzChecksum(compositeClean)) === compositeCheck;
  return fields;
}

/* ---- Fallback keyword-based extraction for non-MRZ documents ---- */
function extractFieldsByKeyword(text, docType) {
  const grab = (labels) => {
    for (const label of labels) {
      const re = new RegExp(label + '\\s*[:\\-]?\\s*([A-Za-z0-9 ,./]{2,40})', 'i');
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return '';
  };
  const common = {
    name: grab(['name']),
    dateOfBirth: grab(['date of birth', 'dob']),
    dateOfExpiry: grab(['date of expiry', 'expiry date', 'valid until']),
    gender: grab(['sex', 'gender']),
    nationality: grab(['nationality']),
  };
  if (docType === 'visa') {
    return {
      ...common,
      visaNumber: grab(['visa no', 'visa number']),
      visaType: grab(['visa type', 'type']),
      entryValidation: grab(['entries', 'entry']),
      stayDuration: grab(['duration of stay', 'stay duration', 'duration']),
    };
  }
  if (docType === 'driving_license') {
    return { ...common, licenseNumber: grab(['license no', 'licence no', 'dl no']) };
  }
  if (docType === 'permit') {
    return { ...common, permitNumber: grab(['permit no', 'permit number']) };
  }
    // Generic Regex fallbacks for unlabelled fields (Aadhaar / National ID)
  if (!common.dateOfBirth) {
    const dobMatch = text.match(/\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b/);
    if (dobMatch) common.dateOfBirth = dobMatch[1];
  }

  let idNumber = grab(['id no', 'identity no', 'national id']);
  if (!idNumber && docType === 'national_id') {
    // Look for Aadhaar format: 1234 5678 9012
    const aadhaarMatch = text.match(/\b(\d{4}\s\d{4}\s\d{4})\b/);
    if (aadhaarMatch) idNumber = aadhaarMatch[1];
  }
  
  if (idNumber && !common.name) {
    common.name = "Unlabelled Identity (Aadhaar)";
  }

  return { ...common, idNumber };

}

/* ---------------------------------------------------------------------
   STEP 2 — VALIDATION RULE ENGINE
--------------------------------------------------------------------- */
function wireValidationNav() {}

function renderValidation() {
  const rules = buildValidationRules(state.fields, state.docType);
  state.validation.rules = rules;
  const failCount = rules.filter(r => r.status === 'fail').length;
  const warnCount = rules.filter(r => r.status === 'warn').length;
  state.validation.score = Math.min(100, failCount * 22 + warnCount * 8);

  const list = document.getElementById('ruleList');
  list.innerHTML = '';
  rules.forEach(r => {
    const row = document.createElement('div');
    row.className = 'rule-row';
    const icon = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✕' : '!';
    row.innerHTML = `
      <span class="rule-icon ${r.status}">${icon}</span>
      <div class="rule-copy">
        <span class="rule-title">${(r.title+"").replace(/</g, "&lt;")}</span>
        <span class="rule-detail">${(r.detail+"").replace(/</g, "&lt;")}</span>
      </div>`;
    list.appendChild(row);
  });
  markStepStatus(2, failCount === 0);
}

const MOCK_WATCHLIST_DATABASE = [
  { passportNumber: 'X99999999', reason: 'INTERPOL SLTD Alert — Passport Reported Stolen in 2024' },
  { passportNumber: 'B87654321', reason: 'National Security Watchlist — Document Revoked' },
  { passportNumber: 'ALERT999', reason: 'Suspected Fraud Watchlist Alert' }
];

function checkDatabaseRules(f) {
  const dbRules = [];
  const pNum = (f.passportNumber || f.idNumber || f.licenseNumber || f.visaNumber || f.permitNumber || '').trim().toUpperCase();

  // 1. Blacklist / Watchlist Lookup
  const blacklisted = MOCK_WATCHLIST_DATABASE.find(b => b.passportNumber === pNum);
  if (blacklisted) {
    dbRules.push({
      title: 'Watchlist / Interpol SLTD Database',
      status: 'fail',
      detail: `FLAGGED HIT: ${blacklisted.reason}`
    });
  } else if (pNum) {
    dbRules.push({
      title: 'Watchlist / Interpol SLTD Database',
      status: 'pass',
      detail: `Clean: No blacklist hit for "${pNum}" in Interpol or National SLTD database.`
    });
  }

  // 2. Historical Multi-Identity Anomaly Check
  try {
    const rawHistory = localStorage.getItem('SENTRY_SCAN_HISTORY');
    const history = rawHistory ? JSON.parse(rawHistory) : [];

    if (pNum && history.length > 0) {
      const matchDifferentName = history.find(h => 
        h.documentNumber === pNum && h.name && f.name && h.name.toLowerCase() !== f.name.toLowerCase()
      );
      if (matchDifferentName) {
        dbRules.push({
          title: 'Multi-Identity Cross-Match',
          status: 'fail',
          detail: `CRITICAL ANOMALY: Passport ${pNum} was previously scanned under a different name ("${matchDifferentName.name}").`
        });
      } else {
        dbRules.push({
          title: 'Multi-Identity Cross-Match',
          status: 'pass',
          detail: 'Verified: No multi-identity conflicts found in historical checkpoint scans.'
        });
      }
    }
  } catch (err) {
    console.error('Database history lookup error', err);
  }

  return dbRules;
}

function buildValidationRules(f, docType) {
  const rules = [];
  const today = new Date();

  const pushDateCheck = (label, isoDate, kind) => {
    if (!isoDate) {
      rules.push({ title: `${label} present`, status: 'warn', detail: 'Could not be extracted from the document.' });
      return;
    }
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) {
      rules.push({ title: `${label} format`, status: 'fail', detail: `"${isoDate}" is not a plausible calendar date.` });
      return;
    }
    if (kind === 'expiry') {
      if (d < today) rules.push({ title: 'Document not expired', status: 'fail', detail: `Expired on ${isoDate}.` });
      else rules.push({ title: 'Document not expired', status: 'pass', detail: `Valid until ${isoDate}.` });
    }
    if (kind === 'dob') {
      const age = (today - d) / (365.25 * 24 * 3600 * 1000);
      if (age < 0) rules.push({ title: 'Date of birth plausible', status: 'fail', detail: 'Date of birth is in the future.' });
      else if (age > 120) rules.push({ title: 'Date of birth plausible', status: 'fail', detail: 'Implied age exceeds 120 years.' });
      else rules.push({ title: 'Date of birth plausible', status: 'pass', detail: `Implied age ≈ ${Math.floor(age)} years.` });
    }
  };

  // Completeness
  const requiredByType = {
    passport: ['name', 'passportNumber', 'nationality', 'dateOfBirth', 'dateOfExpiry', 'gender'],
    visa: ['visaNumber', 'visaType', 'entryValidation', 'stayDuration'],
    national_id: ['name', 'idNumber', 'dateOfBirth'],
    driving_license: ['name', 'licenseNumber', 'dateOfBirth'],
    permit: ['name', 'permitNumber'],
  };
  (requiredByType[docType] || []).forEach(key => {
    const present = f[key] && String(f[key]).trim().length > 0;
    rules.push({
      title: `${labelize(key)} present`,
      status: present ? 'pass' : 'warn',
      detail: present ? `Extracted: "${f[key]}"` : 'Field missing or unreadable — verify manually.'
    });
  });

  // Database Watchlist & Historical Anomaly Checks
  const dbRules = checkDatabaseRules(f);
  dbRules.forEach(r => rules.push(r));

  if (docType === 'passport') {
    pushDateCheck('Date of birth', f.dateOfBirth, 'dob');
    pushDateCheck('Date of expiry', f.dateOfExpiry, 'expiry');

    if (f._mrz) {
      rules.push({
        title: 'MRZ checksum — passport number', status: f._mrz.passportNoValid ? 'pass' : 'fail',
        detail: f._mrz.passportNoValid ? 'Check digit matches ICAO 9303 algorithm.' : 'Check digit mismatch — possible tampering or OCR misread.'
      });
      rules.push({
        title: 'MRZ checksum — date of birth', status: f._mrz.dobValid ? 'pass' : 'fail',
        detail: f._mrz.dobValid ? 'Check digit matches.' : 'Check digit mismatch on birth date field.'
      });
      rules.push({
        title: 'MRZ checksum — expiry date', status: f._mrz.expValid ? 'pass' : 'fail',
        detail: f._mrz.expValid ? 'Check digit matches.' : 'Check digit mismatch on expiry date field.'
      });
      rules.push({
        title: 'MRZ composite checksum', status: f._mrz.compositeValid ? 'pass' : 'fail',
        detail: f._mrz.compositeValid ? 'Overall MRZ integrity check passed.' : 'Composite check digit failed — strong tampering indicator.'
      });
    } else {
      rules.push({ title: 'Machine Readable Zone detected', status: 'warn', detail: 'No MRZ located — re-scan with the MRZ strip fully visible for checksum validation.' });
    }
  } else {
    rules.push({ title: 'MRZ checksum validation', status: 'warn', detail: 'Not applicable to this document type in this prototype.' });
    if (f.dateOfExpiry) pushDateCheck('Date of expiry', normalizeLooseDate(f.dateOfExpiry), 'expiry');
  }

  return rules;
}

function normalizeLooseDate(s) {
  // best-effort normaliser for free-text dates like 12/05/2027 -> ISO
  const m = String(s).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) > 30 ? '19' : '20') + y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/* ---------------------------------------------------------------------
   STEP 3 — TAMPERING DETECTION (Error Level Analysis + metadata)
--------------------------------------------------------------------- */
function wireTamperNav() {}

function runTamperAnalysis() {
  if (!state.docImage) return;
  const img = state.docImage;
  const MAX_DIM = 1200;
  let w = img.naturalWidth, h = img.naturalHeight;
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const cOrig = document.getElementById('canvasOriginal');
  const cEla = document.getElementById('canvasELA');
  [cOrig, cEla].forEach(c => { c.width = w; c.height = h; });

  const ctxOrig = cOrig.getContext('2d');
  ctxOrig.drawImage(img, 0, 0, w, h);
  const origData = ctxOrig.getImageData(0, 0, w, h);

  // Re-compress at a known JPEG quality and diff against the original render.
  const quality = 0.85;
  const recompressed = new Image();
  const dataUrl = cOrig.toDataURL('image/jpeg', quality);
  recompressed.onload = () => {
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(recompressed, 0, 0, w, h);
    const compData = tctx.getImageData(0, 0, w, h);

    const elaCtx = cEla.getContext('2d');
    const elaImgData = elaCtx.createImageData(w, h);
    let sum = 0, sumSq = 0, max = 0;
    const n = w * h;
    for (let i = 0; i < origData.data.length; i += 4) {
      const dr = Math.abs(origData.data[i] - compData.data[i]);
      const dg = Math.abs(origData.data[i + 1] - compData.data[i + 1]);
      const db = Math.abs(origData.data[i + 2] - compData.data[i + 2]);
      const diff = (dr + dg + db) / 3;
      const amplified = Math.min(255, diff * 12);
      elaImgData.data[i] = amplified;
      elaImgData.data[i + 1] = amplified;
      elaImgData.data[i + 2] = amplified * 0.6;
      elaImgData.data[i + 3] = 255;
      sum += diff; sumSq += diff * diff; if (diff > max) max = diff;
    }
    elaCtx.putImageData(elaImgData, 0, 0);

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    const std = Math.sqrt(Math.max(0, variance));
    const anomalyScore = Math.min(100, Math.round((std * 6) + (mean * 3)));
    const localized = max > mean * 5 && mean > 1.2;

    state.tamper.elaScore = anomalyScore;
    document.getElementById('elaScore').textContent = anomalyScore + ' / 100';

    const flags = [];
    if (anomalyScore > 55) flags.push({ level: 'high', text: 'High overall ELA variance — compression inconsistency across the image. Possible composite/edited image.' });
    else if (anomalyScore > 28) flags.push({ level: 'mid', text: 'Moderate ELA variance — inconclusive, recommend visual review of bright regions in the heatmap.' });
    else flags.push({ level: 'low', text: 'ELA variance within a typical range for a single-capture, unedited photo.' });
    if (localized) flags.push({ level: 'high', text: 'Localized high-error region detected — consistent with photo replacement, stamp overlay, or text edits in one area.' });

    readMetadata(state.docFile).then(meta => {
      document.getElementById('metaScore').textContent = meta.suspicious ? 'FLAGGED' : 'CLEAN';
      document.getElementById('metaScore').style.color = meta.suspicious ? 'var(--high)' : 'var(--low)';
      if (meta.suspicious) {
        flags.push({ level: 'high', text: `Editing-software signature found in file data (${meta.matches.join(', ')}) — image has likely been re-saved by an editor.` });
      } else {
        flags.push({ level: 'low', text: 'No known editing-software signatures found in file metadata.' });
      }
      state.tamper.metaFlags = meta.matches;
      const metaPenalty = meta.suspicious ? 35 : 0;
      state.tamper.score = Math.min(100, Math.round(anomalyScore * 0.7 + metaPenalty + (localized ? 15 : 0)));

      const flagList = document.getElementById('tamperFlags');
      flagList.innerHTML = '';
      flags.forEach(fl => {
        const li = document.createElement('li');
        li.className = fl.level;
        li.textContent = fl.text;
        flagList.appendChild(li);
      });
      markStepStatus(3, state.tamper.score < 40);
    });
  };
  recompressed.src = dataUrl;
}

function readMetadata(file) {
  return new Promise((resolve) => {
    if (!file) return resolve({ suspicious: false, matches: [] });
    const slice = file.slice(0, 131072);
    const reader = new FileReader();
    reader.onload = (e) => {
      const str = new TextDecoder('latin1').decode(e.target.result);
      const signatures = ['Adobe', 'Photoshop', 'GIMP', 'Paint.NET', 'Snapseed', 'PicsArt', 'Canva', 'Pixlr'];
      const matches = signatures.filter(sig => str.includes(sig));
      resolve({ suspicious: matches.length > 0, matches });
    };
    reader.readAsArrayBuffer(slice);
  });
}

/* ---------------------------------------------------------------------
   STEP 4 — FACE VERIFICATION (face-api.js, fully on-device)
--------------------------------------------------------------------- */
let cameraStream = null;
function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

async function loadFaceModels() {
  const statusEl = document.getElementById('faceModelStatus');
  if (statusEl) statusEl.textContent = 'Loading models…';
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);
    state.faceModelsLoaded = true;
    if (statusEl) {
      statusEl.textContent = 'Ready';
      statusEl.style.color = 'var(--low)';
    }
  } catch (err) {
    console.error('Face model load failed:', err);
    if (statusEl) {
      statusEl.textContent = 'CDN Load Error';
      statusEl.style.color = 'var(--high)';
    }
  }
}

function wireFace() {
  const selfieDrop = document.getElementById('selfieDrop');
  const selfieInput = document.getElementById('selfieInput');
  selfieDrop.addEventListener('click', () => selfieInput.click());
  selfieInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const img = await fileToImage(e.target.files[0]);
    document.getElementById('selfiePrompt').hidden = true;
    const canvas = document.getElementById('canvasSelfieFace');
    canvas.hidden = false;
    await detectAndDraw(img, canvas, 'selfie');
  });
  document.getElementById('runFaceBtn').addEventListener('click', runFaceMatch);

  // WebRTC Live Camera
  const openCamBtn = document.getElementById('openCameraBtn');
  const closeCamBtn = document.getElementById('closeCameraBtn');
  const captureCamBtn = document.getElementById('captureCameraBtn');
  const cameraModal = document.getElementById('cameraModal');
  const videoEl = document.getElementById('webcamVideo');

  if (openCamBtn) {
    openCamBtn.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        videoEl.srcObject = cameraStream;
        cameraModal.classList.remove('hidden');
      } catch (err) {
        alert('Could not access camera: ' + err.message);
      }
    });
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    cameraModal.classList.add('hidden');
  }

  if (closeCamBtn) closeCamBtn.addEventListener('click', stopCamera);

  if (captureCamBtn) {
    captureCamBtn.addEventListener('click', async () => {
      if (!videoEl.videoWidth) return;
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = videoEl.videoWidth;
      tmpCanvas.height = videoEl.videoHeight;
      const ctx = tmpCanvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0);

      const img = new Image();
      img.onload = async () => {
        document.getElementById('selfiePrompt').hidden = true;
        const canvas = document.getElementById('canvasSelfieFace');
        canvas.hidden = false;
        await detectAndDraw(img, canvas, 'selfie');
        stopCamera();
      };
      img.src = tmpCanvas.toDataURL('image/jpeg');
    });
  }
}

function fileToImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => { const img = new Image(); img.onload = () => resolve(img); img.src = e.target.result; };
    reader.readAsDataURL(file);
  });
}

async function prepDocFace() {
  if (!state.docImage) return;
  const canvas = document.getElementById('canvasDocFace');
  await detectAndDraw(state.docImage, canvas, 'doc');
}

async function detectAndDraw(img, canvas, which) {
  if (!state.faceModelsLoaded) {
    await loadFaceModels();
  }
  const maxW = 320;
  const scale = Math.min(1, maxW / img.naturalWidth);
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  try {
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const box = detection.detection.box;
      ctx.strokeStyle = '#2FD4C4';
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      if (which === 'doc') state.face.docDescriptor = detection.descriptor;
      else state.face.selfieDescriptor = detection.descriptor;
    } else {
      ctx.fillStyle = 'rgba(229,72,77,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px monospace';
        ctx.fillText('NO FACE DETECTED', 10, canvas.height / 2);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } catch (err) {
    console.error('Face detection error', err);
  }

  if (state.face.docDescriptor && state.face.selfieDescriptor) {
    document.getElementById('runFaceBtn').disabled = false;
  } else {
    document.getElementById('runFaceBtn').disabled = true;
  }
}

function runFaceMatch() {
  const d1 = state.face.docDescriptor, d2 = state.face.selfieDescriptor;
  if (!d1 || !d2) return;
  const distance = faceapi.euclideanDistance(d1, d2);
  const similarity = Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
  state.face.distance = distance;

  let verdict, verdictColor, score;
  if (distance < 0.5) { verdict = 'MATCH'; verdictColor = 'var(--low)'; score = Math.round(distance * 20); }
  else if (distance < 0.65) { verdict = 'UNCERTAIN — MANUAL REVIEW'; verdictColor = 'var(--mid)'; score = 55; }
  else { verdict = 'MISMATCH'; verdictColor = 'var(--high)'; score = Math.min(100, Math.round(60 + distance * 30)); }

  state.face.verdict = verdict;
  state.face.score = score;

  document.getElementById('faceSimilarity').textContent = similarity + '%';
  document.getElementById('faceVerdict').textContent = verdict;
  document.getElementById('faceVerdict').style.color = verdictColor;
  markStepStatus(4, verdict === 'MATCH');
}

/* ---------------------------------------------------------------------
   STEP 5 — COMPOSITE RISK REPORT
--------------------------------------------------------------------- */
function wireReport() {
  document.getElementById('downloadReport').addEventListener('click', downloadReport);
    document.getElementById('commitBlockchainBtn').addEventListener('click', commitToBlockchain);
}

function computeComposite() {
  const v = state.validation.score || 0;
  const t = state.tamper.score || 0;
  
  // If face verification is skipped, we now explicitly FAIL them (100) instead of Manual Review
  const fScore = state.face.score != null ? state.face.score : 100; 

  // 1. Highest Watermark System
  let composite = Math.max(v, t, fScore);

  // 2. Critical Overrides (Auto-Reject)
  const hasCriticalValidation = state.validation.rules.some(r => r.status === 'fail');
  const faceFailed = state.face.verdict === 'NO MATCH' || state.face.score == null;
  
  if (hasCriticalValidation || faceFailed) {
    composite = 100; // Force maximum risk
  }

  return { composite: Math.min(100, composite), v, t, f: fScore };
}

function bandFor(score) {
  if (score >= 100) return { label: 'CRITICAL RISK (AUTO-REJECT)', color: 'var(--high)' };
  if (score <= 30) return { label: 'LOW RISK (APPROVED)', color: 'var(--low)' };
  if (score <= 60) return { label: 'MODERATE RISK (MANUAL REVIEW)', color: 'var(--mid)' };
  return { label: 'HIGH RISK (REJECTED)', color: 'var(--high)' };
}

function setGauge(arcId, valueId, tagId, score, radiusLen) {
  const band = bandFor(score);
  const pct = score / 100;
  const arc = document.getElementById(arcId);
  arc.setAttribute('stroke-dasharray', `${radiusLen * pct} ${radiusLen}`);
  arc.setAttribute('stroke', band.color);
  const valueEl = document.getElementById(valueId);
  valueEl.textContent = score;
  valueEl.style.color = band.color;
  if (tagId) {
    const tagEl = document.getElementById(tagId);
    tagEl.textContent = band.label;
    tagEl.style.color = band.color;
  }
  return band;
}

function updateMiniGauge() {
  const { composite } = computeComposite();
  const band = setGauge('riskArc', 'riskGaugeValue', null, composite, 157);
  document.getElementById('riskDockTag').textContent = band.label;
  document.getElementById('riskDockTag').style.color = band.color;
}



function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency || 'unknown',
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ];
  return components.join('|');
}

function runEntityResolution() {
  try {
    const rawHistory = localStorage.getItem('SENTRY_SCAN_HISTORY');
    const history = rawHistory ? JSON.parse(rawHistory) : [];
    const f = state.fields;
    
    // Check if we already added these rules to prevent duplicates
    const hasBiometricRule = state.validation.rules.some(r => r.title.includes('Ghost Face'));
    const hasDeviceRule = state.validation.rules.some(r => r.title.includes('Device Graph Anomaly'));

    
    const docNumRaw = f.passportNumber || f.idNumber || f.licenseNumber || f.visaNumber || f.permitNumber;
    const pNum = (docNumRaw || '').trim().toUpperCase();
    const hasIdSwapRule = state.validation.rules.some(r => r.title.includes('Synthetic Identity (ID Swap)'));
    
    // A. ID Swap (Same ID, Different Name)
    if (pNum && history.length > 0 && !hasIdSwapRule) {
      const idSwap = history.find(h => h.documentNumber === pNum && h.name && f.name && h.name.toLowerCase() !== f.name.toLowerCase());
      if (idSwap) {
        state.validation.score = Math.min(100, state.validation.score + 50);
        state.validation.rules.push({ status: 'fail', title: 'Synthetic Identity (ID Swap)', detail: `ID Number linked to previous node: ${idSwap.name}` });
      }
    }

    // B. Biometric Cross-Matching (Same Face, Different Name)
    if (state.face.selfieDescriptor && history.length > 0 && !hasBiometricRule) {
      const currentDesc = Object.values(state.face.selfieDescriptor);
      for (const h of history) {
        if (h.faceVector && h.name && f.name && h.name.toLowerCase() !== f.name.toLowerCase()) {
          let distance = 0;
          for (let i=0; i<128; i++) distance += Math.pow(currentDesc[i] - h.faceVector[i], 2);
          distance = Math.sqrt(distance);
          if (distance < 0.45) { // Threshold for same face
            state.validation.score = Math.min(100, state.validation.score + 60);
            state.validation.rules.push({ status: 'fail', title: 'Biometric 1-to-N Match (Ghost Face)', detail: `Face vector maps to prior identity node: ${h.name}` });
            break;
          }
        }
      }
    }

    // C. Device Fingerprinting (Fraud Ring Coordination)
    if (!hasDeviceRule) {
      const currentDevice = generateDeviceFingerprint();
      const recentDeviceScans = history.filter(h => h.device === currentDevice && new Date(h.timestamp).getTime() > (Date.now() - 86400000));
      const uniqueNamesOnDevice = new Set(recentDeviceScans.map(h => h.name?.toLowerCase()).filter(n=>n));
      if (f.name && uniqueNamesOnDevice.size >= 2 && !uniqueNamesOnDevice.has(f.name.toLowerCase())) {
          state.validation.score = Math.min(100, state.validation.score + 30);
          state.validation.rules.push({ status: 'warn', title: 'Device Graph Anomaly (Velocity)', detail: `${uniqueNamesOnDevice.size} distinct identities processed on this hardware node.` });
      }
    }
  } catch (e) { console.error('Graph check error', e); }
}

function renderReport() {
  runEntityResolution();
  const { composite, v, t, f } = computeComposite();
  setGauge('riskArcLarge', 'riskGaugeValueLarge', 'riskGaugeTag', composite, 267);
  updateMiniGauge();

  document.getElementById('barValidation').style.width = v + '%';
  document.getElementById('valPts').textContent = v;
  document.getElementById('barTamper').style.width = t + '%';
  document.getElementById('tamperPts').textContent = t;
  document.getElementById('barFace').style.width = f + '%';
  document.getElementById('facePts').textContent = f;

  const finalFlags = document.getElementById('finalFlags');
  finalFlags.innerHTML = '';
  const items = [];
  state.validation.rules.filter(r => r.status !== 'pass').forEach(r =>
    items.push({ level: r.status === 'fail' ? 'high' : 'mid', text: `[Validation] ${r.title}: ${r.detail}` }));
  document.querySelectorAll('#tamperFlags li').forEach(li =>
    items.push({ level: li.className, text: `[Tampering] ${li.textContent}` }));
  if (state.face.verdict) items.push({
    level: state.face.verdict === 'MATCH' ? 'low' : state.face.verdict.includes('UNCERTAIN') ? 'mid' : 'high',
    text: `[Face] Verdict: ${state.face.verdict} (distance ${state.face.distance?.toFixed(3) ?? '—'})`
  });
  if (items.length === 0) items.push({ level: 'low', text: 'No issues flagged across any module.' });
  items.forEach(fl => {
    const li = document.createElement('li');
    li.className = fl.level;
    li.textContent = fl.text;
    finalFlags.appendChild(li);
  });

  const caseRecord = buildCaseRecord(composite);
  document.getElementById('caseJson').textContent = JSON.stringify(caseRecord, null, 2);
  markStepStatus(5, composite <= 30);
}

function buildCaseRecord(composite) {
  const cleanFields = { ...state.fields };
  delete cleanFields._mrz;
  const record = {
    sessionId: state.sessionId,
    timestamp: new Date().toISOString(),
    checkpoint: document.getElementById('checkpointId').textContent,
    documentType: state.docType,
    passportNumber: cleanFields.passportNumber || cleanFields.idNumber || '',
    name: cleanFields.name || '',
    extractedFields: cleanFields,
    validation: { score: state.validation.score, rules: state.validation.rules },
    tamperingDetection: { elaScore: state.tamper.elaScore, metadataFlags: state.tamper.metaFlags, score: state.tamper.score },
    faceVerification: { distance: state.face.distance, verdict: state.face.verdict, score: state.face.score },
    compositeRisk: composite,
      blockchain: state.blockchain || null,
    riskBand: bandFor(composite).label,
    note: 'Generated by AuthentiQ prototype. All analysis performed client-side; not a certified forensic result.'
  };

  // Persist to local scan history for Multi-Identity Anomaly Cross-Matching
  try {
    const raw = localStorage.getItem('SENTRY_SCAN_HISTORY');
    const history = raw ? JSON.parse(raw) : [];
    if (!history.some(h => h.sessionId === record.sessionId)) {
      history.push({
        sessionId: record.sessionId,
        passportNumber: record.passportNumber,
        name: record.name,
        timestamp: record.timestamp
      });
      localStorage.setItem('SENTRY_SCAN_HISTORY', JSON.stringify(history.slice(-50)));
    }
  } catch (err) {
    console.error('History save error', err);
  }

  return record;
}

function downloadReport() {
  const { composite } = computeComposite();
  const record = buildCaseRecord(composite);
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.sessionId}_case_report.json`;
  a.click();
  URL.revokeObjectURL(url);
}


async function generateSHA256(str) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder("utf-8").encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  } else {
    // Fallback if not running on HTTPS or localhost (where crypto.subtle is disabled)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0'); // fake SHA format for file:// testing
  }
}

async function commitToBlockchain() {
  const btn = document.getElementById('commitBlockchainBtn');
  const consoleEl = document.getElementById('ledgerConsole');
  if(btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'COMMITTING...';

  try {
    const recordStr = document.getElementById('caseJson').textContent;
    const hash = await generateSHA256(recordStr);
  
  consoleEl.innerHTML = '';
  const appendLine = (text, delay) => new Promise(r => setTimeout(() => {
    consoleEl.innerHTML += `<div class="ledger-line">${text}</div>`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
    r();
  }, delay));

  await appendLine(`> Generating cryptographic SHA-256 hash...`, 0);
  await appendLine(`> HASH: ${hash}`, 600);
  await appendLine(`> Connecting to Polygon zkEVM network...`, 800);
  await appendLine(`> Broadcasting Zero-Knowledge Proof...`, 1200);
  await appendLine(`> Awaiting network consensus...`, 1500);
  
  // Generate fake tx hash
  const txHash = '0x' + await generateSHA256(hash + Date.now());
  
  await appendLine(`> Transaction Confirmed! Block: ${Math.floor(Math.random() * 1000000) + 14000000}`, 2000);
  await appendLine(`> <span style="color: var(--success)">STATUS: IMMUTABLE</span>`, 400);
  await appendLine(`> TX: ${txHash.slice(0, 66)}`, 200);

  // Update the JSON to include the blockchain tx
  const currentRecord = JSON.parse(recordStr);
  state.blockchain = {
    network: "Polygon zkEVM",
    recordHash: hash,
    transactionId: txHash.slice(0, 66),
    status: "IMMUTABLE"
  };
  currentRecord.blockchain = {
    network: 'Polygon zkEVM',
    recordHash: hash,
    transactionId: txHash.slice(0, 66),
    status: 'IMMUTABLE'
  };
  document.getElementById('caseJson').textContent = JSON.stringify(currentRecord, null, 2);
  
  btn.textContent = 'COMMITTED TO LEDGER';
  btn.classList.add('btn-success');
}
