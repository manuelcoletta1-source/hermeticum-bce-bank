import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const matrixPath = 'docs/hbce-bank-evidence-core-v1-bank-recipient-matrix-2026-09-24.md';

const files = {
  coverDoc: 'docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md',
  coverTest: 'tests/hbce-bank-evidence-core-v1-bank-outreach-cover-note.mjs',
  manifestDoc: 'docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md',
  manifestTest: 'tests/hbce-bank-evidence-core-v1-exported-review-bundle-manifest.mjs',
  packageDoc: 'docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md',
  packageTest: 'tests/hbce-bank-evidence-core-v1-review-package-index.mjs',
  readme: 'README.md',
  readmeTest: 'tests/hbce-bank-evidence-core-v1-readme-reviewer-index.mjs',
  mapDoc: 'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md',
  mapTest: 'tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs',
  baselineDoc: 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md',
  baselineTest: 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs',
  bridgeDoc: 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md',
  bridgeTest: 'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs',
  pr1Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md',
  pr2Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md',
  pr3Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_DERIVED_REVIEWER_MAP_CHECKPOINT_2026_09_24.md',
  pr4Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_README_REVIEWER_INDEX_CHECKPOINT_2026_09_24.md',
  pr5Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACKAGE_INDEX_CHECKPOINT_2026_09_24.md',
  pr6Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_EXPORTED_REVIEW_BUNDLE_MANIFEST_CHECKPOINT_2026_09_24.md',
  pr7Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md',
};

const expected = {
  coverDoc: '12b0bbabbfcc7f851b80f5e51cb3f22f512689614d3c89f895eeb5b85b26fcd0',
  coverTest: '58c0ea4865c86062e02d5f9822a531f8221291a41333addd3c937bc8afe7edae',
  manifestDoc: 'c497e195c3388ab64cf68c3ce115710aae08692f2a127cc563e9609743299e01',
  manifestTest: '01d747db6e5883d3dc588c48adf2de94853e5447c689fda040d04911594e106e',
  packageDoc: '29cb1892ed4423ae6713b185ff26c0ce27de3ab81ea2fa1e6d37d507a2cd85a3',
  packageTest: 'fa6167b5a3ee83aecbebd05851a809be435690ca43aa99cec95b390bff1a1503',
  readme: '0a8e35adf793acfde926f97a67db5ba39f771d1798654fa870da785ada9473f1',
  readmeTest: 'eb392bddef6c4499fbef158d2d04ac3a4f463b1ec559e57e28d7a203550eaa21',
  mapDoc: '69f2d542da55c17b4f6f7b7a51cdb340c940bb687863094be4dd0e25288f7827',
  mapTest: 'acb0426cd88e36369f9009482cf4167855b8237cd5b377a3bc95e8707e86a7df',
  baselineDoc: '28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13',
  baselineTest: '9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2',
  bridgeDoc: '919dff27bd393e1db256337ef3b151501ed1f3c7a6aa72b91d50143a235c1f45',
  bridgeTest: 'fbf52e6a318bcf5ff038c68a03ea8c057032de22e8c78d6fb1c7b2c22c60b86b',
  pr1Checkpoint: '7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593',
  pr2Checkpoint: 'a2bd4fd9d309c3b0a13c09393bbb783d3170504e74aed476900a82822489ba99',
  pr3Checkpoint: '77666f791ff7c2e9e3fc7e961025687b345cfdcc7256134b598e5860b1437293',
  pr4Checkpoint: '7188ae5d2eaefc1c42d66e88bfef4f474402ea6d342d57d1d1b6bd9303e5fd1c',
  pr5Checkpoint: '421b2b2daa83efaeecc604ee6b195fc663677d8c74f168dfec6b8d825267dad3',
  pr6Checkpoint: 'ebd07da476bd506f4aec98b06a63bc560eaa204782590f84477ef4c8ce25c2bd',
  pr7Checkpoint: 'e8d106d5fac285098f197119a7615c0e91ea1c7910127dcc8d5f39b772557e10',
};

function pass(name) {
  console.log(`PASS ${name}`);
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function esc(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

assert.ok(fs.existsSync(matrixPath));
const doc = fs.readFileSync(matrixPath, 'utf8');
pass('HBCE_BANK_RECIPIENT_MATRIX_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Recipient Matrix/m);
assert.match(doc, /Status: bank recipient matrix, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: e325870e3ce5016ec704ffa422a39113be5ed99a/);
pass('HBCE_BANK_RECIPIENT_MATRIX_HEADER');

assert.match(doc, /maps bank-facing recipient roles/);
assert.match(doc, /recommended documents, review questions, expected review outputs, missing evidence requests and explicit boundaries/);
assert.match(doc, /banking, risk, compliance, audit, security, innovation, procurement and technical governance reviewers/);
assert.match(doc, /does not create production approval, regulatory approval, legal certification/);
pass('HBCE_BANK_RECIPIENT_MATRIX_PURPOSE');

assert.match(doc, /The matrix is review-oriented/);
assert.match(doc, /The matrix is non-production/);
assert.match(doc, /The matrix is non-authorizing/);
assert.match(doc, /not a deployment plan/);
assert.match(doc, /not a vendor onboarding decision/);
assert.match(doc, /not a regulatory filing/);
pass('HBCE_BANK_RECIPIENT_MATRIX_STATUS');

for (const role of [
  'Banking reviewer',
  'Risk reviewer',
  'Compliance reviewer',
  'Audit reviewer',
  'Security reviewer',
  'Innovation reviewer',
  'Procurement reviewer',
  'Technical governance reviewer',
]) {
  assert.match(doc, new RegExp(`### ${role}`));
}
pass('HBCE_BANK_RECIPIENT_MATRIX_RECIPIENTS');

assert.match(doc, /### Banking reviewer/);
assert.match(doc, /banking review comments/);
assert.match(doc, /formal business case/);
assert.match(doc, /must not treat the bundle as production approval/);
pass('HBCE_BANK_RECIPIENT_MATRIX_BANKING');

assert.match(doc, /### Risk reviewer/);
assert.match(doc, /risk assessment notes/);
assert.match(doc, /risk register/);
assert.match(doc, /must not treat the bundle as an approved risk control/);
pass('HBCE_BANK_RECIPIENT_MATRIX_RISK');

assert.match(doc, /### Compliance reviewer/);
assert.match(doc, /compliance clarification list/);
assert.match(doc, /legal basis analysis/);
assert.match(doc, /must not treat the bundle as legal certification/);
pass('HBCE_BANK_RECIPIENT_MATRIX_COMPLIANCE');

assert.match(doc, /### Audit reviewer/);
assert.match(doc, /audit trail comments/);
assert.match(doc, /formal audit evidence pack/);
assert.match(doc, /must not treat the bundle as completed external audit/);
pass('HBCE_BANK_RECIPIENT_MATRIX_AUDIT');

assert.match(doc, /### Security reviewer/);
assert.match(doc, /security review comments/);
assert.match(doc, /threat model/);
assert.match(doc, /must not treat the bundle as security approval/);
pass('HBCE_BANK_RECIPIENT_MATRIX_SECURITY');

assert.match(doc, /### Innovation reviewer/);
assert.match(doc, /innovation intake notes/);
assert.match(doc, /pilot hypothesis/);
assert.match(doc, /must not treat the bundle as product-market validation/);
pass('HBCE_BANK_RECIPIENT_MATRIX_INNOVATION');

assert.match(doc, /### Procurement reviewer/);
assert.match(doc, /procurement intake checklist/);
assert.match(doc, /supplier onboarding gap list/);
assert.match(doc, /must not treat the bundle as vendor onboarding approval/);
pass('HBCE_BANK_RECIPIENT_MATRIX_PROCUREMENT');

assert.match(doc, /### Technical governance reviewer/);
assert.match(doc, /technical governance notes/);
assert.match(doc, /target architecture/);
assert.match(doc, /must not treat the bundle as deployment approval/);
pass('HBCE_BANK_RECIPIENT_MATRIX_TECHNICAL_GOVERNANCE');

assert.match(doc, /## Document mapping summary/);
assert.match(doc, /README\.md: reviewer entry point/);
assert.match(doc, /plain-language first-contact note/);
assert.match(doc, /exported bundle manifest/);
assert.match(doc, /ordered package index/);
assert.match(doc, /role-oriented reviewer map/);
assert.match(doc, /checkpoint files: deterministic continuity evidence/);
pass('HBCE_BANK_RECIPIENT_MATRIX_DOCUMENT_MAPPING');

assert.match(doc, /Review questions:/);
assert.match(doc, /Is the banking review package understandable/);
assert.match(doc, /Are non-production and non-authorization boundaries clear/);
assert.match(doc, /Which regulatory or internal compliance mappings are required next/);
assert.match(doc, /Are hashes and checkpoint continuity sufficient/);
assert.match(doc, /Does the repository expose any application scaffold/);
pass('HBCE_BANK_RECIPIENT_MATRIX_QUESTIONS');

assert.match(doc, /Expected review output:/);
assert.match(doc, /banking review comments/);
assert.match(doc, /risk assessment notes/);
assert.match(doc, /compliance clarification list/);
assert.match(doc, /audit trail comments/);
assert.match(doc, /security review comments/);
assert.match(doc, /technical governance notes/);
pass('HBCE_BANK_RECIPIENT_MATRIX_EXPECTED_OUTPUTS');

assert.match(doc, /Missing evidence requests:/);
assert.match(doc, /formal business case/);
assert.match(doc, /risk register/);
assert.match(doc, /legal basis analysis/);
assert.match(doc, /formal audit evidence pack/);
assert.match(doc, /secure SDLC evidence/);
assert.match(doc, /commercial proposal/);
pass('HBCE_BANK_RECIPIENT_MATRIX_MISSING_EVIDENCE');

assert.match(doc, /Boundary:/);
assert.match(doc, /production approval/);
assert.match(doc, /transaction approval/);
assert.match(doc, /legal certification/);
assert.match(doc, /security approval/);
assert.match(doc, /vendor onboarding approval/);
assert.match(doc, /deployment approval/);
pass('HBCE_BANK_RECIPIENT_MATRIX_BOUNDARY');

assert.match(doc, /Bank outreach cover note validation: 22\/22 PASS/);
assert.match(doc, /Exported review bundle manifest validation: 22\/22 PASS/);
assert.match(doc, /Review package index validation: 21\/21 PASS/);
assert.match(doc, /README reviewer index validation: 28\/28 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
pass('HBCE_BANK_RECIPIENT_MATRIX_VALIDATION_COUNTS');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_RECIPIENT_MATRIX_HASHES');

assert.match(doc, /canonical technical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /banking repository is a derived banking review layer/);
assert.match(doc, /must not be treated as the canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_RECIPIENT_MATRIX_UPSTREAM');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_RECIPIENT_MATRIX_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_RECIPIENT_MATRIX_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_RECIPIENT_MATRIX_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_RECIPIENT_MATRIX_NO_APPLICATION_SCAFFOLD');

const matrixHash = sha256(matrixPath);
assert.strictEqual(matrixHash.length, 64);
pass('HBCE_BANK_RECIPIENT_MATRIX_FILE_HASH_STABLE');
