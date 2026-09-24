import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const liveDocPath = 'docs/hbce-bank-github-pages-live-smoke-evidence-2026-09-24.md';
const landingHtmlPath = 'index.html';
const landingCssPath = 'assets/styles.css';
const landingTestPath = 'tests/hbce-bank-github-pages-public-review-landing.mjs';
const pr16CheckpointPath = 'MAIN_POST_HBCE_BANK_GITHUB_PAGES_PUBLIC_REVIEW_LANDING_CHECKPOINT_2026_09_24.md';
const pr15CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BUNDLE_FREEZE_MANIFEST_CHECKPOINT_2026_09_24.md';
const freezeDocPath = 'docs/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest-2026-09-24.md';
const freezeTestPath = 'tests/hbce-bank-evidence-core-v1-bank-review-bundle-freeze-manifest.mjs';

const expected = {
  url: 'https://manuelcoletta1-source.github.io/hermeticum-bce-bank/',
  htmlHttp: 'HTML HTTP status: 200',
  cssHttp: 'CSS HTTP status: 200',
  landingHtmlSha: '57e5ed3ed01a10fda49cc0f0bc36228575dced95772be27d85fc07844ab524c3',
  landingCssSha: 'a36bd57ec0f1baa92dbc51353342fc4d2e960d497ebb27ad5d32126a59fa171f',
  landingTestSha: '68985c85f6d13e62014c269fa69cb7f2acff168409866ee6b8bd584a96d06c9f',
  pr16CheckpointSha: 'bfb9bb99b4e115c4af58e3b24a82e8390b8f099d20c7e8b65893ce8e7a539ecf',
  pr15CheckpointSha: '5c5a13956724eda13bb1ab842411e0f313278ae12bd103ed5d6f825517dd399c',
};

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function pass(name) {
  console.log(`PASS ${name}`);
}

assert.ok(fs.existsSync(liveDocPath));
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_DOC_EXISTS');

assert.ok(fs.existsSync(landingHtmlPath));
assert.ok(fs.existsSync(landingCssPath));
assert.ok(fs.existsSync(landingTestPath));
assert.ok(fs.existsSync(pr16CheckpointPath));
assert.ok(fs.existsSync(pr15CheckpointPath));
assert.ok(fs.existsSync(freezeDocPath));
assert.ok(fs.existsSync(freezeTestPath));
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_REFERENCED_ARTIFACTS_EXIST');

const liveDoc = fs.readFileSync(liveDocPath, 'utf8');
const landingHtml = fs.readFileSync(landingHtmlPath, 'utf8');
const landingCss = fs.readFileSync(landingCssPath, 'utf8');

assert.match(liveDoc, /HBCE_BANK_GITHUB_PAGES_PUBLIC_REVIEW_LANDING_LIVE=PASS/);
assert.match(liveDoc, /Live smoke result: PASS/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_PASS_RECORDED');

assert.ok(liveDoc.includes(expected.url));
assert.ok(liveDoc.includes(expected.htmlHttp));
assert.ok(liveDoc.includes(expected.cssHttp));
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_HTTP_RECORDED');

assert.match(liveDoc, /HBCE Bank Evidence Core v1/);
assert.match(liveDoc, /Controlled Banking Review Package/);
assert.match(liveDoc, /Open freeze manifest/);
assert.match(liveDoc, /Open review pack/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_CONTENT_ANCHORS_RECORDED');

assert.match(liveDoc, /Not production software/);
assert.match(liveDoc, /Not a live banking application/);
assert.match(liveDoc, /Not regulatory approval/);
assert.match(liveDoc, /Static GitHub Pages surface only/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_BOUNDARY_ANCHORS_RECORDED');

assert.match(liveDoc, /\.hero/);
assert.match(liveDoc, /\.status-grid/);
assert.match(liveDoc, /\.artifact-grid/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_CSS_ANCHORS_RECORDED');

assert.ok(liveDoc.includes(`index.html SHA-256: ${expected.landingHtmlSha}`));
assert.ok(liveDoc.includes(`assets/styles.css SHA-256: ${expected.landingCssSha}`));
assert.ok(liveDoc.includes(`tests/hbce-bank-github-pages-public-review-landing.mjs SHA-256: ${expected.landingTestSha}`));
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_LOCAL_HASHES_RECORDED');

assert.strictEqual(sha256(landingHtmlPath), expected.landingHtmlSha);
assert.strictEqual(sha256(landingCssPath), expected.landingCssSha);
assert.strictEqual(sha256(landingTestPath), expected.landingTestSha);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_LOCAL_HASHES_MATCH');

assert.ok(liveDoc.includes(`PR16 public review landing checkpoint SHA-256: ${expected.pr16CheckpointSha}`));
assert.ok(liveDoc.includes(`PR15 bundle freeze checkpoint SHA-256: ${expected.pr15CheckpointSha}`));
assert.strictEqual(sha256(pr16CheckpointPath), expected.pr16CheckpointSha);
assert.strictEqual(sha256(pr15CheckpointPath), expected.pr15CheckpointSha);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_CHECKPOINT_HASHES_MATCH');

assert.match(liveDoc, /point-in-time live smoke evidence/);
assert.match(liveDoc, /not a continuous uptime monitor/);
assert.match(liveDoc, /not a deployed banking application runtime/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_SCOPE_RECORDED');

assert.match(liveDoc, /does not make hermeticum-bce-bank a canonical evidence source/);
assert.match(liveDoc, /does not prove production deployment/);
assert.match(liveDoc, /does not create an application scaffold/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_NON_CLAIMS_RECORDED');

assert.match(liveDoc, /legal certification/);
assert.match(liveDoc, /eIDAS qualification/);
assert.match(liveDoc, /regulatory approval/);
assert.match(liveDoc, /autonomous banking authorization/);
assert.match(liveDoc, /vendor onboarding approval/);
assert.match(liveDoc, /procurement approval/);
assert.match(liveDoc, /financial transaction approval/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_PROHIBITED_CLAIMS_RECORDED');

assert.match(landingHtml, /HBCE Bank Evidence Core v1/);
assert.match(landingHtml, /Controlled Banking Review Package/);
assert.match(landingHtml, /Static GitHub Pages surface only/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_LOCAL_HTML_ANCHORS');

assert.match(landingCss, /\.hero/);
assert.match(landingCss, /\.status-grid/);
assert.match(landingCss, /\.artifact-grid/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_LOCAL_CSS_ANCHORS');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_NO_APPLICATION_SCAFFOLD');

assert.match(liveDoc, /Bundle freeze manifest/);
assert.match(liveDoc, /Bundle freeze manifest SHA-256/);
assert.match(liveDoc, /Bundle freeze manifest validation test/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_BUNDLE_ANCHORS_RECORDED');

assert.strictEqual(sha256(liveDocPath).length, 64);
assert.strictEqual(sha256(freezeDocPath).length, 64);
assert.strictEqual(sha256(freezeTestPath).length, 64);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_EVIDENCE_HASH_STABLE');

assert.match(liveDoc, /static GitHub Pages documentation surface/);
assert.match(liveDoc, /not a deployed banking application runtime/);
pass('HBCE_BANK_GITHUB_PAGES_LIVE_SMOKE_FINAL_BOUNDARY_STABLE');
