import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const registerPath = 'docs/hbce-bank-evidence-core-v1-bank-missing-evidence-register-2026-09-24.md';

const files = {
  packDoc: 'docs/hbce-bank-evidence-core-v1-bank-review-pack-index-2026-09-24.md',
  packTest: 'tests/hbce-bank-evidence-core-v1-bank-review-pack-index.mjs',
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
  pr9Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_PACK_INDEX_CHECKPOINT_2026_09_24.md',
};

const expected = {
  packDoc: '8074bdfb4d4c92590dfcc7abeecacc2991348030afe8efe52c3869644bb61357',
  packTest: '1a71020992c8308dd84c681a23a067a97d55f64002c6326ee26c08af08bddd7f',
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
  pr9Checkpoint: '4260aaea4e1a48d38a7ed457bbacab6c9089cf47373314a4c011f97833d8bde0',
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

assert.ok(fs.existsSync(registerPath));
const doc = fs.readFileSync(registerPath, 'utf8');
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Missing Evidence Register/m);
assert.match(doc, /Status: bank missing evidence register, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 76b70fe8e9fbac1f97b64ef36d9f62c1ea17a271/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_HEADER');

assert.match(doc, /converts the missing evidence categories identified in the formal bank review pack index into numbered evidence requests/);
assert.match(doc, /identifier, owner, requested reviewer, priority, status, required decision and explicit boundary/);
assert.match(doc, /does not create production approval, regulatory approval, legal certification/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_PURPOSE');

assert.match(doc, /The register is review-oriented/);
assert.match(doc, /The register is non-production/);
assert.match(doc, /The register is non-authorizing/);
assert.match(doc, /not a deployment plan/);
assert.match(doc, /not a regulatory filing/);
assert.match(doc, /not a procurement approval/);
assert.match(doc, /not a vendor onboarding decision/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_STATUS');

for (const field of [
  'evidence_id',
  'evidence_request',
  'owner',
  'requested_by',
  'priority',
  'status',
  'required_decision',
  'boundary',
]) {
  assert.match(doc, new RegExp(esc(field)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_MODEL_FIELDS');

for (const value of ['P1', 'P2', 'P3', 'OPEN', 'REQUESTED', 'RECEIVED', 'REVIEWED', 'DEFERRED', 'NOT_REQUIRED', 'PROVIDE', 'ROUTE', 'DEFER', 'REJECT_AS_OUT_OF_SCOPE', 'MARK_NOT_REQUIRED']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_ENUMS');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_FILES_REFERENCED');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_HASHES_REFERENCED');

const rows = doc.split('\n').filter((line) => /^\| ME-\d{3} \|/.test(line));
assert.strictEqual(rows.length, 43);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_ITEM_COUNT');

const ids = rows.map((line) => line.match(/^\| (ME-\d{3}) \|/)[1]);
const expectedIds = Array.from({ length: 43 }, (_, i) => `ME-${String(i + 1).padStart(3, '0')}`);
assert.deepStrictEqual(ids, expectedIds);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_ID_SEQUENCE');

for (const row of rows) {
  assert.ok(row.includes('| OPEN |'), row);
  assert.ok(row.includes('non-production evidence request'), row);
  assert.ok(/\| P[123] \|/.test(row), row);
  assert.ok(/\| (PROVIDE|ROUTE|DEFER) \|/.test(row), row);
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_ROW_FIELDS');

for (const value of [
  'bank sponsor or innovation intake owner',
  'risk owner',
  'compliance or legal owner',
  'audit owner',
  'security owner',
  'procurement or commercial owner',
  'technical governance owner',
]) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_OWNER_GROUPS');

for (const value of [
  'banking reviewer',
  'risk reviewer',
  'compliance reviewer',
  'audit reviewer',
  'security reviewer',
  'procurement reviewer',
  'technical governance reviewer',
]) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_REVIEWER_GROUPS');

for (const value of ['formal business case', 'target banking use case', 'pilot scope', 'stakeholder map', 'operational ownership proposal', 'service model proposal']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_BANKING_ITEMS');

for (const value of ['risk register', 'control mapping', 'model risk framing', 'operational risk framing', 'third-party risk framing', 'residual risk statement']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_RISK_ITEMS');

for (const value of ['legal basis analysis', 'compliance framework mapping', 'data protection assessment', 'AI governance mapping', 'vendor compliance questionnaire', 'regulatory perimeter note']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_COMPLIANCE_ITEMS');

for (const value of ['formal audit evidence pack', 'change management log', 'approval workflow log', 'access control evidence', 'independent verification note', 'retention policy']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_AUDIT_ITEMS');

for (const value of ['threat model', 'secure SDLC evidence', 'dependency inventory', 'secrets handling statement', 'vulnerability management process', 'deployment architecture', 'access control model']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_SECURITY_ITEMS');

for (const value of ['commercial proposal', 'DPA or data protection terms', 'security questionnaire', 'insurance evidence', 'financial standing information', 'support and SLA proposal', 'procurement compliance forms']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_PROCUREMENT_ITEMS');

for (const value of ['target architecture', 'integration model', 'governance workflow', 'acceptance criteria', 'technical pilot plan']) {
  assert.match(doc, new RegExp(esc(value)));
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_TECHNICAL_GOVERNANCE_ITEMS');

assert.match(doc, /canonical technical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /banking repository is a derived banking review layer/);
assert.match(doc, /must not be treated as the canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_UPSTREAM');

assert.match(doc, /read-only/);
assert.match(doc, /observe-only/);
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
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_BOUNDARY');

assert.match(doc, /At this bank-missing-evidence-register stage/);
assert.match(doc, /bank missing evidence register/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_REPOSITORY_CAPABILITY');

assert.match(doc, /may accompany/);
assert.match(doc, /formal bank review pack/);
assert.match(doc, /bank intake ticket/);
assert.match(doc, /non-production pilot discussion request/);
assert.match(doc, /controlled evidence request workflow/);
assert.match(doc, /must not accompany/);
assert.match(doc, /production-readiness claim/);
assert.match(doc, /certification claim/);
assert.match(doc, /regulatory approval claim/);
assert.match(doc, /transaction authorization claim/);
assert.match(doc, /vendor onboarding approval claim/);
assert.match(doc, /procurement approval claim/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_DELIVERY_FORM');

assert.match(doc, /bank evidence request tracker/);
assert.match(doc, /due date, assignee, received artifact, review result and closure status/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_NO_APPLICATION_SCAFFOLD');

const registerHash = sha256(registerPath);
assert.strictEqual(registerHash.length, 64);
pass('HBCE_BANK_MISSING_EVIDENCE_REGISTER_FILE_HASH_STABLE');
