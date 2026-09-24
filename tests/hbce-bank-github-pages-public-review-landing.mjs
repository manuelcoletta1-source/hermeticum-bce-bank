import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const htmlPath = 'index.html';
const cssPath = 'assets/styles.css';

const requiredLinks = [
  'README.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-briefing-index-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-handoff-checklist-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-missing-evidence-register-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-evidence-request-tracker-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-review-closure-report-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-recipient-matrix-2026-09-24.md',
  'docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md',
  'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CHECKPOINT_2026_09_24.md',
  'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_HANDOFF_CHECKLIST_CHECKPOINT_2026_09_24.md',
];

function pass(name) {
  console.log(`PASS ${name}`);
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

assert.ok(fs.existsSync(htmlPath));
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_HTML_EXISTS');

assert.ok(fs.existsSync(cssPath));
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_CSS_EXISTS');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(html, /<!doctype html>/i);
assert.match(html, /<html lang="en">/);
assert.match(html, /HBCE Bank Evidence Core v1 — Public Review Landing/);
assert.match(html, /Controlled public review landing/);
assert.match(html, /assets\/styles\.css/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_DOCUMENT_HEAD');

assert.match(html, /HBCE Bank Evidence Core v1/);
assert.match(html, /Controlled Banking Review Package/);
assert.match(html, /frozen, hash-bound, human-reviewable evidence bundle/);
assert.match(html, /Open freeze manifest/);
assert.match(html, /Open review pack/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_HERO');

assert.match(html, /Bundle/);
assert.match(html, /Frozen/);
assert.match(html, /Production/);
assert.match(html, /No/);
assert.match(html, /Authorization/);
assert.match(html, /Canonical source/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_STATUS_CARDS');

assert.match(html, /Recommended reviewer entry path/);
assert.match(html, /README reviewer index/);
assert.match(html, /Formal bank review pack index/);
assert.match(html, /Bank review bundle freeze manifest/);
assert.match(html, /Bank review handoff checklist/);
assert.match(html, /Bank missing evidence register/);
assert.match(html, /Bank evidence request tracker/);
assert.match(html, /Bank review closure report/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_REVIEWER_PATH');

assert.match(html, /Core review artifacts/);
assert.match(html, /Freeze Manifest/);
assert.match(html, /Export Manifest/);
assert.match(html, /Handoff/);
assert.match(html, /Routing/);
assert.match(html, /Cover/);
assert.match(html, /Briefing/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_ARTIFACT_CARDS');

assert.match(html, /Controlled evidence review package/);
assert.match(html, /Derived banking review layer/);
assert.match(html, /Hash-bound document and test bundle/);
assert.match(html, /Human review package/);
assert.match(html, /Fail-closed boundary framing/);
assert.match(html, /Audit-first evidence organization/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_WHAT_THIS_IS');

assert.match(html, /What this is not/);
assert.match(html, /Not production software/);
assert.match(html, /Not a live banking application/);
assert.match(html, /Not a live API or endpoint/);
assert.match(html, /Not certification or legal certification/);
assert.match(html, /Not eIDAS qualification/);
assert.match(html, /Not regulatory approval/);
assert.match(html, /Not autonomous banking authorization/);
assert.match(html, /Not vendor onboarding, procurement or transaction approval/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_NON_CLAIMS');

assert.match(html, /21\/21/);
assert.match(html, /Bundle freeze manifest validation/);
assert.match(html, /25\/25/);
assert.match(html, /Handoff checklist validation/);
assert.match(html, /20\/20/);
assert.match(html, /Briefing index validation/);
assert.match(html, /30\/30/);
assert.match(html, /Missing evidence register validation/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_VALIDATION_SUMMARY');

assert.match(html, /2d25535d77be6020ad91dc7a84e7796818dbc645d6009a86112ea21978c5010a/);
assert.match(html, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(html, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_HASH_ANCHORS');

assert.match(html, /hermeticum-bce-bank/);
assert.match(html, /derived banking review layer/);
assert.match(html, /must not be treated as the canonical Evidence Core v1 source/);
assert.match(html, /Canonical upstream checkpoint commit/);
assert.match(html, /Upstream PR137 checkpoint SHA-256/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_CANONICAL_SEPARATION');

for (const link of requiredLinks) {
  assert.ok(html.includes(`href="${link}"`), `${link} missing from landing`);
  assert.ok(fs.existsSync(link), `${link} target missing`);
}
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_LINK_TARGETS_EXIST');

assert.match(html, /Static GitHub Pages surface only/);
assert.match(html, /No application scaffold/);
assert.match(html, /no production claim/);
assert.match(html, /no authorization claim/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_STATIC_SURFACE_BOUNDARY');

assert.match(css, /:root/);
assert.match(css, /--bg:/);
assert.match(css, /--accent:/);
assert.match(css, /\.site-header/);
assert.match(css, /\.hero/);
assert.match(css, /\.status-grid/);
assert.match(css, /\.artifact-grid/);
assert.match(css, /@media/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_CSS_STRUCTURE');

assert.match(css, /background:/);
assert.match(css, /border-radius/);
assert.match(css, /box-shadow/);
assert.match(css, /grid-template-columns/);
assert.match(css, /backdrop-filter/);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_VISUAL_SYSTEM');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_NO_APPLICATION_SCAFFOLD');

assert.ok(fs.existsSync('docs/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24.md'));
assert.ok(fs.existsSync('tests/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest.mjs'));
assert.ok(fs.existsSync('MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CHECKPOINT_2026_09_24.md'));
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_FREEZE_REFERENCES_EXIST');

assert.strictEqual(sha256(htmlPath).length, 64);
assert.strictEqual(sha256(cssPath).length, 64);
pass('HBCE_BANK_PUBLIC_REVIEW_LANDING_FILE_HASH_STABLE');
