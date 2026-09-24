import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const mapPath = 'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md';
const baselineDocPath = 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md';
const baselineTestPath = 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs';
const bridgeDocPath = 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md';
const bridgeTestPath = 'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs';
const pr1CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md';
const pr2CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md';

const expected = {
  baselineDoc: '28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13',
  baselineTest: '9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2',
  bridgeDoc: '919dff27bd393e1db256337ef3b151501ed1f3c7a6aa72b91d50143a235c1f45',
  bridgeTest: 'fbf52e6a318bcf5ff038c68a03ea8c057032de22e8c78d6fb1c7b2c22c60b86b',
  pr1Checkpoint: '7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593',
  pr2Checkpoint: 'a2bd4fd9d309c3b0a13c09393bbb783d3170504e74aed476900a82822489ba99',
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

assert.ok(fs.existsSync(mapPath));
const doc = fs.readFileSync(mapPath, 'utf8');
pass('HBCE_BANK_REVIEWER_MAP_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Derived Reviewer Map/m);
assert.match(doc, /Status: derived reviewer map, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
pass('HBCE_BANK_REVIEWER_MAP_HEADER');

assert.match(doc, /gives banking, compliance, audit, security, innovation and procurement reviewers a readable map/);
assert.match(doc, /translates the local derived baseline and architecture bridge into a reviewer path/);
assert.match(doc, /does not replace the canonical upstream evidence pack/);
assert.match(doc, /does not create a banking product, API endpoint, UI, production system or authorization surface/);
pass('HBCE_BANK_REVIEWER_MAP_PURPOSE');

assert.match(doc, /banking reviewers/);
assert.match(doc, /compliance reviewers/);
assert.match(doc, /audit reviewers/);
assert.match(doc, /security reviewers/);
assert.match(doc, /innovation reviewers/);
assert.match(doc, /procurement reviewers/);
assert.match(doc, /technical governance reviewers/);
pass('HBCE_BANK_REVIEWER_MAP_AUDIENCE');

assert.match(doc, /hermeticum-bce-platform creates the canonical Evidence Core v1 banking review pack/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /685c888aa06c0d744accaca06caead43c7a47b51/);
assert.match(doc, /73ccb1b8b89c4034172daf6cc5e7087ee653b7ae/);
pass('HBCE_BANK_REVIEWER_MAP_SOURCE_CHAIN');

const localFiles = [
  baselineDocPath,
  baselineTestPath,
  bridgeDocPath,
  bridgeTestPath,
  pr1CheckpointPath,
  pr2CheckpointPath,
];

for (const file of localFiles) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_REVIEWER_MAP_LOCAL_ARTIFACTS');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_REVIEWER_MAP_LOCAL_HASHES');

assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
assert.match(doc, /Bank architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /PR137 banking reviewer checklist validation: 23\/23 PASS/);
assert.match(doc, /PR136 external-facing dossier validation: 19\/19 PASS/);
assert.match(doc, /PR128 source review package validation: 21\/21 PASS/);
pass('HBCE_BANK_REVIEWER_MAP_VALIDATION_BASELINE');

assert.match(doc, /Read this derived reviewer map/);
assert.match(doc, /Read the bank baseline document/);
assert.match(doc, /Read the bank architecture bridge/);
assert.match(doc, /Check the PR1 and PR2 checkpoint documents/);
assert.match(doc, /Verify local hashes/);
assert.match(doc, /Avoid treating this repository as the canonical evidence source/);
pass('HBCE_BANK_REVIEWER_MAP_REVIEWER_PATH');

assert.match(doc, /Banking reviewers should focus on business relevance/);
assert.match(doc, /Compliance reviewers should focus on boundaries/);
assert.match(doc, /Audit reviewers should focus on commit references/);
assert.match(doc, /Security reviewers should focus on protocol boundaries/);
assert.match(doc, /Innovation reviewers should focus on product potential/);
assert.match(doc, /Procurement reviewers should focus on what can be reviewed/);
assert.match(doc, /Technical governance reviewers should focus on the relationship between protocol, schemas, tests, baseline, architecture bridge and upstream platform evidence/);
pass('HBCE_BANK_REVIEWER_MAP_ROLE_MAP');

assert.match(doc, /Derived reviewer map/);
assert.match(doc, /Bank baseline document/);
assert.match(doc, /Bank architecture bridge/);
assert.match(doc, /Upstream platform checkpoint reference/);
assert.match(doc, /Upstream banking reviewer checklist/);
assert.match(doc, /Upstream external-facing banking review dossier/);
assert.match(doc, /Upstream demo JSON artifact/);
pass('HBCE_BANK_REVIEWER_MAP_ARTIFACT_ORDER');

assert.match(doc, /may conclude that hermeticum-bce-bank has a derived, checkpointed, hash-referenced banking review layer/);
assert.match(doc, /may conclude that the bank repository is connected to the canonical upstream Evidence Core v1 banking review pack/);
assert.match(doc, /may conclude that the material is suitable for controlled discussion/);
assert.match(doc, /may conclude that the local bank material is currently documentation and validation oriented/);
pass('HBCE_BANK_REVIEWER_MAP_ALLOWED_CONCLUSIONS');

assert.match(doc, /must not conclude that hermeticum-bce-bank is the canonical evidence source/);
assert.match(doc, /must not conclude that hermeticum-bce-bank proves production deployment/);
assert.match(doc, /must not conclude that hermeticum-bce-bank proves live API availability/);
assert.match(doc, /must not conclude that hermeticum-bce-bank proves legal certification/);
assert.match(doc, /must not conclude that hermeticum-bce-bank proves eIDAS qualification/);
assert.match(doc, /must not conclude that hermeticum-bce-bank proves regulatory approval/);
assert.match(doc, /must not conclude that hermeticum-bce-bank creates OPC ALLOW/);
assert.match(doc, /must not conclude that hermeticum-bce-bank creates autonomous banking authorization/);
assert.match(doc, /must not conclude that hermeticum-bce-bank approves financial transaction execution/);
pass('HBCE_BANK_REVIEWER_MAP_PROHIBITED_CONCLUSIONS');

assert.match(doc, /A banking reviewer may ask which banking use case should be reviewed first/);
assert.match(doc, /A compliance reviewer may ask which regulatory mapping should be prepared later/);
assert.match(doc, /An audit reviewer may ask for an evidence package export/);
assert.match(doc, /A security reviewer may ask for threat model boundaries/);
assert.match(doc, /A procurement reviewer may ask what vendor, service, data handling and support documents would be required/);
pass('HBCE_BANK_REVIEWER_MAP_NEXT_QUESTIONS');

assert.match(doc, /Outcome A: reviewable as derived banking evidence/);
assert.match(doc, /Outcome B: reviewable with clarification/);
assert.match(doc, /Outcome C: not reviewable in current form/);
assert.match(doc, /must not record a production approval outcome/);
assert.match(doc, /must not record a regulatory approval outcome/);
assert.match(doc, /must not record a legal certification outcome/);
pass('HBCE_BANK_REVIEWER_MAP_OUTCOMES');

assert.match(doc, /This reviewer map is read-only/);
assert.match(doc, /This reviewer map is observe-only/);
assert.match(doc, /This reviewer map is non-production/);
assert.match(doc, /This reviewer map is non-authorizing/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create banking authorization/);
pass('HBCE_BANK_REVIEWER_MAP_BOUNDARY');

assert.match(doc, /protocol references/);
assert.match(doc, /schema definitions/);
assert.match(doc, /protocol tests/);
assert.match(doc, /derived bank baseline/);
assert.match(doc, /derived architecture bridge/);
assert.match(doc, /derived reviewer map/);
assert.match(doc, /does not expose:/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
pass('HBCE_BANK_REVIEWER_MAP_REPOSITORY_CAPABILITY');

assert.match(doc, /bank-facing README update or a reviewer index/);
assert.match(doc, /A future product surface may be added only after an explicit application scaffold exists/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_REVIEWER_MAP_NEXT_STEP');

for (const file of localFiles) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_REVIEWER_MAP_LOCAL_FILES_EXIST');

assert.strictEqual(sha256(baselineDocPath), expected.baselineDoc);
pass('HBCE_BANK_REVIEWER_MAP_BASELINE_DOC_HASH_MATCH');

assert.strictEqual(sha256(baselineTestPath), expected.baselineTest);
pass('HBCE_BANK_REVIEWER_MAP_BASELINE_TEST_HASH_MATCH');

assert.strictEqual(sha256(bridgeDocPath), expected.bridgeDoc);
pass('HBCE_BANK_REVIEWER_MAP_BRIDGE_DOC_HASH_MATCH');

assert.strictEqual(sha256(bridgeTestPath), expected.bridgeTest);
pass('HBCE_BANK_REVIEWER_MAP_BRIDGE_TEST_HASH_MATCH');

assert.strictEqual(sha256(pr1CheckpointPath), expected.pr1Checkpoint);
pass('HBCE_BANK_REVIEWER_MAP_PR1_CHECKPOINT_HASH_MATCH');

assert.strictEqual(sha256(pr2CheckpointPath), expected.pr2Checkpoint);
pass('HBCE_BANK_REVIEWER_MAP_PR2_CHECKPOINT_HASH_MATCH');

const mapHash = sha256(mapPath);
assert.strictEqual(mapHash.length, 64);
pass('HBCE_BANK_REVIEWER_MAP_FILE_HASH_STABLE');
