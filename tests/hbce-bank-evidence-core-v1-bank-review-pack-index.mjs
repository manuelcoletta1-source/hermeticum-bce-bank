import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const packPath = 'docs/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24.md';

const files = {
  matrixDoc: 'docs/hbce-bank-evidence-core-v1-bank-recipient-matrix-2026-09-24.md',
  matrixTest: 'tests/hbce-bank-evidence-core-v1-bank-recipient-matrix.mjs',
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
  pr8Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_RECIPIENT_MATRIX_CHECKPOINT_2026_09_24.md',
};

const expected = {
  matrixDoc: 'acf5755ad7fc2b72f4e69d9c194287839b92674c4fa77b80da67afff31943792',
  matrixTest: '958284901870a87052702dd70ca51c7d0fe3ad5d048355cad951460b155fcc22',
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
  pr8Checkpoint: '3afec5958dd7b51fde470e97a09bb52fb231c030478851c19bddba0e1914e216',
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

assert.ok(fs.existsSync(packPath));
const doc = fs.readFileSync(packPath, 'utf8');
pass('HBCE_BANK_REVIEW_PACK_INDEX_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Formal Bank Review Pack Index/m);
assert.match(doc, /Status: formal bank review pack index, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: baf739b03d2727367af257d17949a16cfc993870/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_HEADER');

assert.match(doc, /organizes the HBCE Evidence Core v1 banking review material into a formal bank intake structure/);
assert.match(doc, /sections, annexes, owners, review status, required inputs, expected outputs and missing evidence registers/);
assert.match(doc, /structured non-production bank intake review/);
assert.match(doc, /does not create production approval, regulatory approval, legal certification/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_PURPOSE');

assert.match(doc, /The pack index is review-oriented/);
assert.match(doc, /The pack index is non-production/);
assert.match(doc, /The pack index is non-authorizing/);
assert.match(doc, /not a deployment plan/);
assert.match(doc, /not a regulatory filing/);
assert.match(doc, /not a procurement approval/);
assert.match(doc, /not a vendor onboarding decision/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_STATUS');

for (const section of [
  'Executive intake',
  'Technical evidence',
  'Recipient routing',
  'Validation annex',
  'Hash annex',
  'Checkpoint annex',
  'Missing evidence register',
  'Review status register',
  'Owner and action register',
  'Boundary and non-claims register',
]) {
  assert.match(doc, new RegExp(esc(section)));
}
pass('HBCE_BANK_REVIEW_PACK_INDEX_SECTIONS');

assert.match(doc, /Section 1 — Executive intake/);
assert.match(doc, /Owner: bank sponsor or innovation intake owner/);
assert.match(doc, /OPEN_FOR_FIRST_REVIEW/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_EXECUTIVE_INTAKE');

assert.match(doc, /Section 2 — Technical evidence/);
assert.match(doc, /Owner: technical governance reviewer/);
assert.match(doc, /OPEN_FOR_TECHNICAL_REVIEW/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_TECHNICAL_EVIDENCE');

assert.match(doc, /Section 3 — Recipient routing/);
assert.match(doc, /banking reviewer/);
assert.match(doc, /technical governance reviewer/);
assert.match(doc, /ROUTING_READY/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_RECIPIENT_ROUTING');

assert.match(doc, /Section 4 — Validation annex/);
assert.match(doc, /tests\/hbce-bank-evidence-core-v1-bank-review-pack-index\.mjs/);
assert.match(doc, /Bank recipient matrix validation: 26\/26 PASS/);
assert.match(doc, /Bank outreach cover note validation: 22\/22 PASS/);
assert.match(doc, /Exported review bundle manifest validation: 22\/22 PASS/);
assert.match(doc, /Review package index validation: 21\/21 PASS/);
assert.match(doc, /README reviewer index validation: 28\/28 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
assert.match(doc, /VALIDATION_READY/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_VALIDATION_ANNEX');

assert.match(doc, /Section 5 — Hash annex/);
assert.match(doc, /HASH_REGISTER_READY/);
for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_REVIEW_PACK_INDEX_HASH_ANNEX');

assert.match(doc, /Section 6 — Checkpoint annex/);
assert.match(doc, /CHECKPOINT_REGISTER_READY/);
assert.match(doc, /MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_RECIPIENT_MATRIX_CHECKPOINT_2026_09_24\.md/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_CHECKPOINT_ANNEX');

assert.match(doc, /Section 7 — Missing evidence register/);
assert.match(doc, /formal business case/);
assert.match(doc, /risk register/);
assert.match(doc, /legal basis analysis/);
assert.match(doc, /formal audit evidence pack/);
assert.match(doc, /threat model/);
assert.match(doc, /commercial proposal/);
assert.match(doc, /target architecture/);
assert.match(doc, /MISSING_EVIDENCE_REGISTER_OPEN/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_MISSING_EVIDENCE');

assert.match(doc, /Section 8 — Review status register/);
assert.match(doc, /section id/);
assert.match(doc, /review decision/);
assert.match(doc, /REVIEW_STATUS_REGISTER_READY/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_REVIEW_STATUS');

assert.match(doc, /Section 9 — Owner and action register/);
assert.match(doc, /assign owners/);
assert.match(doc, /confirm recipient roles/);
assert.match(doc, /OWNER_ACTION_REGISTER_OPEN/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_OWNER_ACTION');

assert.match(doc, /Section 10 — Boundary and non-claims register/);
assert.match(doc, /read-only/);
assert.match(doc, /observe-only/);
assert.match(doc, /non-production/);
assert.match(doc, /non-authorizing/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create production deployment/);
assert.match(doc, /does not create legal certification/);
assert.match(doc, /does not create regulatory approval/);
assert.match(doc, /does not create eIDAS qualification/);
assert.match(doc, /does not create OPC ALLOW/);
assert.match(doc, /does not create banking authorization/);
assert.match(doc, /does not create vendor onboarding approval/);
assert.match(doc, /does not create procurement approval/);
assert.match(doc, /does not create financial transaction approval/);
assert.match(doc, /BOUNDARY_REGISTER_READY/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_BOUNDARY_REGISTER');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_REVIEW_PACK_INDEX_FILES_REFERENCED');

assert.match(doc, /canonical technical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /banking repository is a derived banking review layer/);
assert.match(doc, /must not be treated as the canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_UPSTREAM');

assert.match(doc, /At this formal-bank-review-pack-index stage/);
assert.match(doc, /formal bank review pack index/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_REPOSITORY_CAPABILITY');

assert.match(doc, /may accompany/);
assert.match(doc, /repository link/);
assert.match(doc, /exported folder/);
assert.match(doc, /zipped review bundle/);
assert.match(doc, /internal bank intake ticket/);
assert.match(doc, /non-production pilot discussion request/);
assert.match(doc, /must not accompany/);
assert.match(doc, /production-readiness claim/);
assert.match(doc, /certification claim/);
assert.match(doc, /regulatory approval claim/);
assert.match(doc, /transaction authorization claim/);
assert.match(doc, /vendor onboarding approval claim/);
assert.match(doc, /procurement approval claim/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_DELIVERY_FORM');

assert.match(doc, /bank missing evidence register/);
assert.match(doc, /numbered items with owner, priority, status, requested reviewer and required decision/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_REVIEW_PACK_INDEX_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_REVIEW_PACK_INDEX_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_REVIEW_PACK_INDEX_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_REVIEW_PACK_INDEX_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEW_PACK_INDEX_NO_APPLICATION_SCAFFOLD');

const packHash = sha256(packPath);
assert.strictEqual(packHash.length, 64);
pass('HBCE_BANK_REVIEW_PACK_INDEX_FILE_HASH_STABLE');
