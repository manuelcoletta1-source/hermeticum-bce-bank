import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const exportDocPath = 'docs/hbce-bank-reviewer-export-pack-manifest-2026-09-24.md';

const requiredFiles = [
  'README.md',
  'ARCHITECTURE.md',
  'index.html',
  'assets/styles.css',
  'tests/hbce-bank-github-pages-public-review-landing.mjs',
  'docs/hbce-bank-github-pages-live-smoke-evidence-2026-09-24.md',
  'tests/hbce-bank-github-pages-live-smoke-evidence.mjs',
  'MAIN_POST_HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_EVIDENCE_CHECKPOINT_2026_09_24.md',
  'MAIN_POST_HBCE_BANK_GITHUB_PAGES_PUBLIC_REVIEW_LANDING_CHECKPOINT_2026_09_24.md',
  'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CHECKPOINT_2026_09_24.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-review-handoff-checklist-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-review-handoff-checklist.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-review-briefing-index-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-review-briefing-index.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-review-closure-report-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-review-closure-report.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-evidence-request-tracker-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-evidence-request-tracker.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-missing-evidence-register-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-missing-evidence-register.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-review-pack-index.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-recipient-matrix-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-recipient-matrix.mjs',
  'docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-bank-outreach-cover-note.mjs',
  'docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-exported-review-bundle-manifest.mjs',
  'docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-review-package-index.mjs',
  'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs',
  'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs',
  'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md',
  'tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs',
  'tests/hbce-bank-evidence-core-v1-readme-reviewer-index.mjs',
];

const requiredPhrases = [
  'HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST=PASS',
  'Public GitHub Pages URL: https://manuelcoletta1-source.github.io/hermeticum-bce-bank/',
  'Primary reviewer functions:',
  'Risk',
  'Compliance',
  'Internal audit',
  'Information security',
  'Innovation',
  'Procurement',
  'Legal review support',
  'Architecture review support',
  'Recommended reading order',
  'Export pack groups',
  'Public review entry',
  'Frozen bundle and package control',
  'Reviewer briefing and handoff',
  'Evidence gaps, requests and closure',
  'Architecture and derived review context',
  'Checkpoint anchors',
  'Suggested reviewer routing',
  'Export instructions',
  'Validation summary',
  'Boundary',
  'Repository scaffold state',
];

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function pass(name) {
  console.log(`PASS ${name}`);
}

assert.ok(fs.existsSync(exportDocPath));
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_DOC_EXISTS');

const doc = fs.readFileSync(exportDocPath, 'utf8');

for (const phrase of requiredPhrases) {
  assert.ok(doc.includes(phrase), `${phrase} missing`);
}
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_REQUIRED_SECTIONS');

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(file), `${file} missing from repository`);
  assert.ok(doc.includes(file), `${file} missing from export manifest`);
}
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_REQUIRED_FILES_EXIST_AND_LISTED');

for (const file of requiredFiles) {
  const digest = sha256(file);
  assert.ok(doc.includes(digest), `${file} SHA-256 not recorded`);
}
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_HASHES_MATCH_REPOSITORY');

assert.match(doc, /1\. README\.md/);
assert.match(doc, /2\. index\.html/);
assert.match(doc, /3\. docs\/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24\.md/);
assert.match(doc, /4\. docs\/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24\.md/);
assert.match(doc, /5\. docs\/hbce-bank-github-pages-live-smoke-evidence-2026-09-24\.md/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_READING_ORDER');

assert.match(doc, /\| Risk \|/);
assert.match(doc, /\| Compliance \|/);
assert.match(doc, /\| Internal audit \|/);
assert.match(doc, /\| Information security \|/);
assert.match(doc, /\| Innovation \|/);
assert.match(doc, /\| Procurement \|/);
assert.match(doc, /\| Legal review support \|/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_REVIEWER_ROUTING');

assert.match(doc, /GitHub Pages live smoke evidence validation: 19\/19 PASS/);
assert.match(doc, /Public review landing validation: 19\/19 PASS/);
assert.match(doc, /Bundle freeze manifest validation: 21\/21 PASS/);
assert.match(doc, /Bank review handoff checklist validation: 25\/25 PASS/);
assert.match(doc, /Bank missing evidence register validation: 30\/30 PASS/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_VALIDATION_COUNTS');

assert.match(doc, /does not make hermeticum-bce-bank a canonical evidence source/);
assert.match(doc, /does not prove continuous uptime/);
assert.match(doc, /production deployment/);
assert.match(doc, /legal certification/);
assert.match(doc, /eIDAS qualification/);
assert.match(doc, /regulatory approval/);
assert.match(doc, /autonomous banking authorization/);
assert.match(doc, /financial transaction approval/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_NON_CLAIMS');

assert.match(doc, /does not create a ZIP archive/);
assert.match(doc, /does not create an application scaffold/);
assert.match(doc, /not a deployed banking application runtime/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_EXPORT_BOUNDARY');

assert.match(doc, /file names/);
assert.match(doc, /relative paths/);
assert.match(doc, /SHA-256 hashes/);
assert.match(doc, /checkpoint files/);
assert.match(doc, /validation tests/);
assert.match(doc, /explicit non-claim boundaries/);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_EXPORT_INSTRUCTIONS');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_NO_APPLICATION_SCAFFOLD');

assert.strictEqual(sha256(exportDocPath).length, 64);
pass('HBCE_BANK_REVIEWER_EXPORT_PACK_MANIFEST_HASH_STABLE');
