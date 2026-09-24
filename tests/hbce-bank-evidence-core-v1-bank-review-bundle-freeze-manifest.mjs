import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const reportPath = 'docs/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24.md';

const bundleFiles = [
  ['README reviewer index', 'README.md'],
  ['Architecture reference', 'ARCHITECTURE.md'],
  ['Review pack baseline', 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md'],
  ['Architecture bridge', 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md'],
  ['Derived reviewer map', 'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md'],
  ['Review package index', 'docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md'],
  ['Exported review bundle manifest', 'docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md'],
  ['Bank outreach cover note', 'docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md'],
  ['Bank recipient matrix', 'docs/hbce-bank-evidence-core-v1-bank-recipient-matrix-2026-09-24.md'],
  ['Formal bank review pack index', 'docs/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24.md'],
  ['Bank missing evidence register', 'docs/hbce-bank-evidence-core-v1-bank-missing-evidence-register-2026-09-24.md'],
  ['Bank evidence request tracker', 'docs/hbce-bank-evidence-core-v1-bank-evidence-request-tracker-2026-09-24.md'],
  ['Bank review closure report', 'docs/hbce-bank-evidence-core-v1-bank-review-closure-report-2026-09-24.md'],
  ['Bank review briefing index', 'docs/hbce-bank-evidence-core-v1-bank-review-briefing-index-2026-09-24.md'],
  ['Bank review handoff checklist', 'docs/hbce-bank-evidence-core-v1-bank-review-handoff-checklist-2026-09-24.md'],
];

const validationFiles = [
  ['Review pack baseline test', 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs', '12/12 PASS'],
  ['Architecture bridge test', 'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs', '24/24 PASS'],
  ['Derived reviewer map test', 'tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs', '26/26 PASS'],
  ['README reviewer index test', 'tests/hbce-bank-evidence-core-v1-readme-reviewer-index.mjs', '28/28 PASS'],
  ['Review package index test', 'tests/hbce-bank-evidence-core-v1-review-package-index.mjs', '21/21 PASS'],
  ['Exported review bundle manifest test', 'tests/hbce-bank-evidence-core-v1-exported-review-bundle-manifest.mjs', '22/22 PASS'],
  ['Bank outreach cover note test', 'tests/hbce-bank-evidence-core-v1-bank-outreach-cover-note.mjs', '22/22 PASS'],
  ['Bank recipient matrix test', 'tests/hbce-bank-evidence-core-v1-bank-recipient-matrix.mjs', '26/26 PASS'],
  ['Formal bank review pack index test', 'tests/hbce-bank-evidence-core-v1-bank-review-pack-index.mjs', '25/25 PASS'],
  ['Bank missing evidence register test', 'tests/hbce-bank-evidence-core-v1-bank-missing-evidence-register.mjs', '30/30 PASS'],
  ['Bank evidence request tracker test', 'tests/hbce-bank-evidence-core-v1-bank-evidence-request-tracker.mjs', '28/28 PASS'],
  ['Bank review closure report test', 'tests/hbce-bank-evidence-core-v1-bank-review-closure-report.mjs', '24/24 PASS'],
  ['Bank review briefing index test', 'tests/hbce-bank-evidence-core-v1-bank-review-briefing-index.mjs', '20/20 PASS'],
  ['Bank review handoff checklist test', 'tests/hbce-bank-evidence-core-v1-bank-review-handoff-checklist.mjs', '25/25 PASS'],
];

const checkpointFiles = [
  ['PR1 baseline checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md'],
  ['PR2 architecture bridge checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md'],
  ['PR3 derived reviewer map checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_DERIVED_REVIEWER_MAP_CHECKPOINT_2026_09_24.md'],
  ['PR4 README reviewer index checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_README_REVIEWER_INDEX_CHECKPOINT_2026_09_24.md'],
  ['PR5 review package index checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACKAGE_INDEX_CHECKPOINT_2026_09_24.md'],
  ['PR6 exported review bundle manifest checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_EXPORTED_REVIEW_BUNDLE_MANIFEST_CHECKPOINT_2026_09_24.md'],
  ['PR7 outreach cover note checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md'],
  ['PR8 recipient matrix checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_RECIPIENT_MATRIX_CHECKPOINT_2026_09_24.md'],
  ['PR9 formal bank review pack index checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_PACK_INDEX_CHECKPOINT_2026_09_24.md'],
  ['PR10 missing evidence register checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_MISSING_EVIDENCE_REGISTER_CHECKPOINT_2026_09_24.md'],
  ['PR11 evidence request tracker checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_EVIDENCE_REQUEST_TRACKER_CHECKPOINT_2026_09_24.md'],
  ['PR12 review closure report checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_CLOSURE_REPORT_CHECKPOINT_2026_09_24.md'],
  ['PR13 review briefing index checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BRIEFING_INDEX_CHECKPOINT_2026_09_24.md'],
  ['PR14 review handoff checklist checkpoint', 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_HANDOFF_CHECKLIST_CHECKPOINT_2026_09_24.md'],
];

function pass(name) {
  console.log(`PASS ${name}`);
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

assert.ok(fs.existsSync(reportPath));
const doc = fs.readFileSync(reportPath, 'utf8');
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Review Bundle Freeze Manifest/m);
assert.match(doc, /Status: frozen bank review bundle manifest, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Bundle identifier: HBCE-BANK-EVIDENCE-CORE-V1-REVIEW-BUNDLE-2026-09-24/);
assert.match(doc, /Current bank main: 022f1db325b66bf4889a36165371233668700730/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_HEADER');

assert.match(doc, /freezes the current HBCE Bank Evidence Core v1 review package/);
assert.match(doc, /exact file paths, file hashes, validation counts, checkpoint anchors and delivery boundaries/);
assert.match(doc, /does not create a production deployment/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_PURPOSE');

assert.match(doc, /bank_review_bundle_freeze_manifest: true/);
assert.match(doc, /shareable_review_bundle: true/);
assert.match(doc, /bundle_paths_frozen: true/);
assert.match(doc, /bundle_hashes_frozen: true/);
assert.match(doc, /validation_counts_frozen: true/);
assert.match(doc, /checkpoint_anchors_frozen: true/);
assert.match(doc, /canonical_source_separation_frozen: true/);
assert.match(doc, /production: false/);
assert.match(doc, /api: false/);
assert.match(doc, /ui: false/);
assert.match(doc, /authorization: false/);
assert.match(doc, /certification: false/);
assert.match(doc, /regulatory_approval: false/);
assert.match(doc, /canonical_source: false/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_STATUS_MODEL');

for (const [role, path] of bundleFiles) {
  assert.match(doc, new RegExp(esc(role)));
  assert.match(doc, new RegExp(esc(path)));
  assert.match(doc, new RegExp(sha256(path)));
}
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_BUNDLE_FILES');

for (const [role, path, result] of validationFiles) {
  assert.match(doc, new RegExp(esc(role)));
  assert.match(doc, new RegExp(esc(path)));
  assert.match(doc, new RegExp(esc(result)));
  assert.match(doc, new RegExp(sha256(path)));
}
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_VALIDATION_FILES');

for (const [role, path] of checkpointFiles) {
  assert.match(doc, new RegExp(esc(role)));
  assert.match(doc, new RegExp(esc(path)));
  assert.match(doc, new RegExp(sha256(path)));
}
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CHECKPOINT_FILES');

assert.match(doc, /README reviewer index/);
assert.match(doc, /Formal bank review pack index/);
assert.match(doc, /Exported review bundle manifest/);
assert.match(doc, /Bank review briefing index/);
assert.match(doc, /Bank review handoff checklist/);
assert.match(doc, /Bank missing evidence register/);
assert.match(doc, /Bank evidence request tracker/);
assert.match(doc, /Bank review closure report/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_REVIEWER_ENTRY_PATH');

assert.match(doc, /Review pack baseline validation: 12\/12 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Bank review handoff checklist validation: 25\/25 PASS/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_VALIDATION_SUMMARY');

assert.match(doc, /derived banking review package/);
assert.match(doc, /controlled human review bundle/);
assert.match(doc, /non-production evidence package/);
assert.match(doc, /non-authorizing evidence package/);
assert.match(doc, /non-canonical banking layer/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_REQUIRED_BOUNDARIES');

assert.match(doc, /production-ready/);
assert.match(doc, /live API/);
assert.match(doc, /live banking application/);
assert.match(doc, /certified/);
assert.match(doc, /eIDAS-qualified/);
assert.match(doc, /regulator-approved/);
assert.match(doc, /transaction-authorizing/);
assert.match(doc, /vendor-onboarding approved/);
assert.match(doc, /procurement approved/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_PROHIBITED_CLAIMS');

assert.match(doc, /Canonical source: hermeticum-bce-platform/);
assert.match(doc, /Derived banking review layer: hermeticum-bce-bank/);
assert.match(doc, /must not become a competing canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CANONICAL_SOURCE');

assert.match(doc, /all frozen paths exist/);
assert.match(doc, /all frozen SHA-256 hashes match/);
assert.match(doc, /all validation counts match/);
assert.match(doc, /all checkpoint anchors match/);
assert.match(doc, /prohibited claims remain absent/);
assert.match(doc, /repository application scaffold remains absent/);
assert.match(doc, /any frozen artifact hash changes/);
assert.match(doc, /application scaffold is introduced/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_DECISION_GATE');

assert.match(doc, /protocol, schema, test, derived banking baseline/);
assert.match(doc, /bundle freeze manifest/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not a deployed banking application/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_REPOSITORY_CAPABILITY');

assert.match(doc, /GitHub Pages surface may remain visually minimal/);
assert.match(doc, /public landing branch/);
assert.match(doc, /index\.html/);
assert.match(doc, /assets\/styles\.css/);
assert.match(doc, /non-production, non-authorizing and non-canonical boundaries/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_GITHUB_PAGES_NOTE');

assert.match(doc, /hbce-bank\/github-pages-public-review-landing/);
assert.match(doc, /create a controlled public review landing page/);
assert.match(doc, /avoid creating an application scaffold/);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_NEXT_PHASE');

const allPaths = [
  ...bundleFiles.map(([, path]) => path),
  ...validationFiles.map(([, path]) => path),
  ...checkpointFiles.map(([, path]) => path),
];

for (const path of allPaths) {
  assert.ok(fs.existsSync(path), `${path} missing`);
}
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_ALL_PATHS_EXIST');

const source = allPaths
  .slice()
  .sort()
  .map((path) => `${path} ${sha256(path)}`)
  .join('\n') + '\n';

const digest = sha256FromString(source);
assert.match(doc, new RegExp(digest));
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_DIGEST_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_NO_APPLICATION_SCAFFOLD');

const reportHash = sha256(reportPath);
assert.strictEqual(reportHash.length, 64);
pass('HBCE_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_FILE_HASH_STABLE');

function sha256FromString(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
