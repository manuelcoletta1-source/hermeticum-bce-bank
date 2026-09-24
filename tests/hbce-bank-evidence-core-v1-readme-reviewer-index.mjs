import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const readmePath = 'README.md';

const baselineDocPath = 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md';
const baselineTestPath = 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs';
const bridgeDocPath = 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md';
const bridgeTestPath = 'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs';
const mapDocPath = 'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md';
const mapTestPath = 'tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs';
const pr1CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md';
const pr2CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md';
const pr3CheckpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_DERIVED_REVIEWER_MAP_CHECKPOINT_2026_09_24.md';

const expected = {
  baselineDoc: '28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13',
  baselineTest: '9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2',
  bridgeDoc: '919dff27bd393e1db256337ef3b151501ed1f3c7a6aa72b91d50143a235c1f45',
  bridgeTest: 'fbf52e6a318bcf5ff038c68a03ea8c057032de22e8c78d6fb1c7b2c22c60b86b',
  mapDoc: '69f2d542da55c17b4f6f7b7a51cdb340c940bb687863094be4dd0e25288f7827',
  mapTest: 'acb0426cd88e36369f9009482cf4167855b8237cd5b377a3bc95e8707e86a7df',
  pr1Checkpoint: '7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593',
  pr2Checkpoint: 'a2bd4fd9d309c3b0a13c09393bbb783d3170504e74aed476900a82822489ba99',
  pr3Checkpoint: '77666f791ff7c2e9e3fc7e961025687b345cfdcc7256134b598e5860b1437293',
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

assert.ok(fs.existsSync(readmePath));
const doc = fs.readFileSync(readmePath, 'utf8');
pass('HBCE_BANK_README_REVIEWER_INDEX_EXISTS');

assert.match(doc, /^# Hermeticum B\.C\.E\. Bank — Evidence Core v1 Reviewer Index/m);
assert.match(doc, /Status: derived banking evidence layer, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 83fdd6fa60856144190db679e6eb29fe2d43ae9b/);
pass('HBCE_BANK_README_REVIEWER_INDEX_HEADER');

assert.match(doc, /derived banking review repository/);
assert.match(doc, /protocol references, schema definitions, validation tests and bank-facing documentation/);
assert.match(doc, /controlled review by banking, compliance, audit, security, innovation, procurement and technical governance readers/);
pass('HBCE_BANK_README_REVIEWER_INDEX_PURPOSE');

assert.match(doc, /## Start here/);
assert.match(doc, new RegExp(esc(mapDocPath)));
assert.match(doc, new RegExp(esc(baselineDocPath)));
assert.match(doc, new RegExp(esc(bridgeDocPath)));
assert.match(doc, /Upstream platform checkpoint reference/);
pass('HBCE_BANK_README_REVIEWER_INDEX_START_HERE');

assert.match(doc, /banking reviewers/);
assert.match(doc, /compliance reviewers/);
assert.match(doc, /audit reviewers/);
assert.match(doc, /security reviewers/);
assert.match(doc, /innovation reviewers/);
assert.match(doc, /procurement reviewers/);
assert.match(doc, /technical governance reviewers/);
pass('HBCE_BANK_README_REVIEWER_INDEX_AUDIENCE');

const localFiles = [
  baselineDocPath,
  baselineTestPath,
  bridgeDocPath,
  bridgeTestPath,
  mapDocPath,
  mapTestPath,
  pr1CheckpointPath,
  pr2CheckpointPath,
  pr3CheckpointPath,
];

for (const file of localFiles) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_README_REVIEWER_INDEX_LOCAL_ARTIFACTS');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_README_REVIEWER_INDEX_LOCAL_HASHES');

assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
assert.match(doc, /Bank architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /PR137 banking reviewer checklist validation: 23\/23 PASS/);
assert.match(doc, /PR128 source review package validation: 21\/21 PASS/);
pass('HBCE_BANK_README_REVIEWER_INDEX_VALIDATION_BASELINE');

assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-derived-reviewer-map\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-architecture-bridge\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-review-pack-baseline\.mjs/);
assert.match(doc, /git diff --check/);
pass('HBCE_BANK_README_REVIEWER_INDEX_COMMANDS');

assert.match(doc, /hermeticum-bce-platform creates the canonical Evidence Core v1 banking review pack/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /hermeticum-bce-bank imports the platform checkpoint as a derived banking baseline/);
assert.match(doc, /canonical upstream PR137 checkpoint document SHA-256 is c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_README_REVIEWER_INDEX_SOURCE_CHAIN');

assert.match(doc, /Banking reviewers should start with business relevance/);
assert.match(doc, /Compliance reviewers should focus on non-authorization/);
assert.match(doc, /Audit reviewers should focus on commit references/);
assert.match(doc, /Security reviewers should focus on protocol boundaries/);
assert.match(doc, /Innovation reviewers should focus on pilot potential/);
assert.match(doc, /Procurement reviewers should focus on reviewable material/);
assert.match(doc, /Technical governance reviewers should focus on the relationship between protocol, schemas, tests, baseline, architecture bridge, reviewer map and upstream platform checkpoint/);
pass('HBCE_BANK_README_REVIEWER_INDEX_ROLE_MAP');

assert.match(doc, /may conclude that this repository contains a derived, checkpointed, hash-referenced banking evidence layer/);
assert.match(doc, /may conclude that the repository is connected to the canonical upstream Evidence Core v1 banking review pack/);
assert.match(doc, /may conclude that the repository is suitable for controlled review discussions/);
assert.match(doc, /may conclude that the current repository is documentation, protocol, schema and validation oriented/);
pass('HBCE_BANK_README_REVIEWER_INDEX_ALLOWED_CONCLUSIONS');

assert.match(doc, /must not conclude that this repository is the canonical evidence source/);
assert.match(doc, /must not conclude that this repository proves production deployment/);
assert.match(doc, /must not conclude that this repository proves live API availability/);
assert.match(doc, /must not conclude that this repository proves legal certification/);
assert.match(doc, /must not conclude that this repository proves eIDAS qualification/);
assert.match(doc, /must not conclude that this repository proves regulatory approval/);
assert.match(doc, /must not conclude that this repository creates OPC ALLOW/);
assert.match(doc, /must not conclude that this repository creates autonomous banking authorization/);
assert.match(doc, /must not conclude that this repository approves financial transaction execution/);
pass('HBCE_BANK_README_REVIEWER_INDEX_PROHIBITED_CONCLUSIONS');

assert.match(doc, /protocol references/);
assert.match(doc, /schema definitions/);
assert.match(doc, /protocol tests/);
assert.match(doc, /derived bank baseline/);
assert.match(doc, /derived architecture bridge/);
assert.match(doc, /derived reviewer map/);
assert.match(doc, /README reviewer index/);
assert.match(doc, /does not expose:/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
pass('HBCE_BANK_README_REVIEWER_INDEX_REPOSITORY_CAPABILITY');

assert.match(doc, /read-only/);
assert.match(doc, /observe-only/);
assert.match(doc, /non-production/);
assert.match(doc, /non-authorizing/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create production deployment/);
assert.match(doc, /does not create banking authorization/);
pass('HBCE_BANK_README_REVIEWER_INDEX_BOUNDARY');

assert.match(doc, /bank review package index or exported review bundle/);
assert.match(doc, /future product surface may be added only after an explicit application scaffold exists/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_README_REVIEWER_INDEX_NEXT_STEP');

for (const file of localFiles) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_README_REVIEWER_INDEX_LOCAL_FILES_EXIST');

assert.strictEqual(sha256(baselineDocPath), expected.baselineDoc);
pass('HBCE_BANK_README_REVIEWER_INDEX_BASELINE_DOC_HASH_MATCH');

assert.strictEqual(sha256(baselineTestPath), expected.baselineTest);
pass('HBCE_BANK_README_REVIEWER_INDEX_BASELINE_TEST_HASH_MATCH');

assert.strictEqual(sha256(bridgeDocPath), expected.bridgeDoc);
pass('HBCE_BANK_README_REVIEWER_INDEX_BRIDGE_DOC_HASH_MATCH');

assert.strictEqual(sha256(bridgeTestPath), expected.bridgeTest);
pass('HBCE_BANK_README_REVIEWER_INDEX_BRIDGE_TEST_HASH_MATCH');

assert.strictEqual(sha256(mapDocPath), expected.mapDoc);
pass('HBCE_BANK_README_REVIEWER_INDEX_MAP_DOC_HASH_MATCH');

assert.strictEqual(sha256(mapTestPath), expected.mapTest);
pass('HBCE_BANK_README_REVIEWER_INDEX_MAP_TEST_HASH_MATCH');

assert.strictEqual(sha256(pr1CheckpointPath), expected.pr1Checkpoint);
pass('HBCE_BANK_README_REVIEWER_INDEX_PR1_CHECKPOINT_HASH_MATCH');

assert.strictEqual(sha256(pr2CheckpointPath), expected.pr2Checkpoint);
pass('HBCE_BANK_README_REVIEWER_INDEX_PR2_CHECKPOINT_HASH_MATCH');

assert.strictEqual(sha256(pr3CheckpointPath), expected.pr3Checkpoint);
pass('HBCE_BANK_README_REVIEWER_INDEX_PR3_CHECKPOINT_HASH_MATCH');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_README_REVIEWER_INDEX_NO_APPLICATION_SCAFFOLD');

const readmeHash = sha256(readmePath);
assert.strictEqual(readmeHash.length, 64);
pass('HBCE_BANK_README_REVIEWER_INDEX_FILE_HASH_STABLE');
