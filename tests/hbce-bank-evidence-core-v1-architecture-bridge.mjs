import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const bridgePath = 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md';
const baselineDocPath = 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md';
const baselineTestPath = 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs';
const checkpointPath = 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md';

const expectedBaselineDocSha = '28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13';
const expectedBaselineTestSha = '9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2';
const expectedCheckpointSha = '7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593';

function pass(name) {
  console.log(`PASS ${name}`);
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

assert.ok(fs.existsSync(bridgePath));
const doc = fs.readFileSync(bridgePath, 'utf8');
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Architecture Bridge/m);
assert.match(doc, /Status: derived architecture bridge, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_HEADER');

assert.match(doc, /connects the hermeticum-bce-bank repository architecture to the imported HBCE Evidence Core v1 review pack baseline/);
assert.match(doc, /without becoming the canonical evidence source/);
assert.match(doc, /canonical evidence source remains hermeticum-bce-platform/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_PURPOSE');

assert.match(doc, /Current bank checkpoint commit: 685c888aa06c0d744accaca06caead43c7a47b51/);
assert.match(doc, /Bank PR1 merge commit: d4199d43c41c0fce629f504f860548f196888477/);
assert.match(doc, /Bank PR1 feature commit: ac974e10078e095803270e4652320e4865fbe9fb/);
assert.match(doc, /Bank PR1 checkpoint SHA-256: 7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_BANK_BASELINE_REFS');

assert.match(doc, new RegExp(escapeRegExp(baselineDocPath)));
assert.match(doc, new RegExp(escapeRegExp(baselineTestPath)));
assert.match(doc, /Baseline document SHA-256: 28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13/);
assert.match(doc, /Baseline validation test SHA-256: 9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2/);
assert.match(doc, /Baseline validation: 12\/12 PASS/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_IMPORTED_BASELINE');

assert.match(doc, /Upstream repository: manuelcoletta1-source\/hermeticum-bce-platform/);
assert.match(doc, /Upstream canonical checkpoint commit: b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /Upstream PR137 checkpoint document SHA-256: c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
assert.match(doc, /upstream platform remains the source of truth/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_UPSTREAM_PLATFORM');

assert.match(doc, /ARCHITECTURE\.md/);
assert.match(doc, /protocol\//);
assert.match(doc, /schemas\//);
assert.match(doc, /tests\//);
assert.match(doc, /docs\//);
assert.match(doc, /does not currently expose:/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_REPOSITORY_STRUCTURE');

assert.match(doc, /ARCHITECTURE\.md is the repository-level architectural entry point/);
assert.match(doc, /does not replace ARCHITECTURE\.md/);
assert.match(doc, /links ARCHITECTURE\.md to the imported Evidence Core v1 review pack baseline/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_ARCHITECTURE_ROLE');

assert.match(doc, /protocol directory contains reference modules/);
assert.match(doc, /authorization, execution, evidence, admission, trust, revocation, mandate and runtime behavior/);
assert.match(doc, /protocol\/hbce-authorization-evaluator\.reference\.mjs/);
assert.match(doc, /protocol\/hbce-execution-evidence-registry\.reference\.mjs/);
assert.match(doc, /protocol\/hbce-execution-adapter-boundary\.reference\.mjs/);
assert.match(doc, /protocol\/hbce-runtime-registry\.reference\.mjs/);
assert.match(doc, /They do not create live banking authorization/);
assert.match(doc, /They do not create OPC ALLOW/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_PROTOCOL_ROLE');

assert.match(doc, /schemas directory contains structured model definitions/);
assert.match(doc, /schemas\/hbce-authority\.schema\.json/);
assert.match(doc, /schemas\/hbce-authorization\.schema\.json/);
assert.match(doc, /schemas\/hbce-execution-evidence\.schema\.json/);
assert.match(doc, /schemas\/hbce-mandate\.schema\.json/);
assert.match(doc, /They do not certify legal validity/);
assert.match(doc, /They do not qualify eIDAS status/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_SCHEMA_ROLE');

assert.match(doc, /tests directory contains protocol-level and evidence-level validation tests/);
assert.match(doc, /tests\/hbce-a010-evaluator-version-binding\.mjs/);
assert.match(doc, /tests\/hbce-a011-golden-negative\.mjs/);
assert.match(doc, /tests\/hbce-a014-execution-evidence-model\.mjs/);
assert.match(doc, /tests\/hbce-a019-execution-adapter-boundary\.mjs/);
assert.match(doc, /tests\/hbce-bank-evidence-core-v1-review-pack-baseline\.mjs/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_TEST_ROLE');

assert.match(doc, /hermeticum-bce-platform creates and checkpoints the canonical Evidence Core v1 banking review pack/);
assert.match(doc, /hermeticum-bce-bank imports the canonical checkpoint as a derived banking baseline/);
assert.match(doc, /This architecture bridge connects the imported baseline to the bank repository structure/);
assert.match(doc, /Future banking documents or surfaces may reference this bridge while preserving upstream canonical evidence/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_DERIVED_FLOW');

assert.match(doc, /may interpret this bridge as evidence that the bank repository has a structured relationship/);
assert.match(doc, /map between imported evidence, protocol references, schema references and local validation tests/);
assert.match(doc, /must not interpret this bridge as production deployment/);
assert.match(doc, /must not interpret this bridge as live API availability/);
assert.match(doc, /must not interpret this bridge as legal certification/);
assert.match(doc, /must not interpret this bridge as eIDAS qualification/);
assert.match(doc, /must not interpret this bridge as regulatory approval/);
assert.match(doc, /must not interpret this bridge as autonomous banking authorization/);
assert.match(doc, /must not interpret this bridge as financial transaction approval/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_REVIEWER_INTERPRETATION');

assert.match(doc, /This bridge is read-only/);
assert.match(doc, /This bridge is observe-only/);
assert.match(doc, /This bridge is non-production/);
assert.match(doc, /This bridge is non-authorizing/);
assert.match(doc, /does not mutate protocol behavior/);
assert.match(doc, /does not mutate schema definitions/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create a product launch/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_BOUNDARY');

assert.match(doc, /hermeticum-bce-platform remains the canonical source/);
assert.match(doc, /hermeticum-bce-bank may consume the platform checkpoint as a derived banking layer/);
assert.match(doc, /must preserve upstream commit identifiers, upstream artifact paths, upstream hashes and upstream validation counts/);
assert.match(doc, /must not become a competing canonical evidence source/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_CANONICAL_RULE');

assert.match(doc, /The next banking step should be a derived banking README or reviewer map/);
assert.match(doc, /banking, compliance, audit, security, innovation and procurement readers/);
assert.match(doc, /A later product surface may be added only after an explicit application scaffold exists/);
assert.match(doc, /protocol, schema, test and derived evidence repository/);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_NEXT_STEP');

assert.ok(fs.existsSync('ARCHITECTURE.md'));
assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync(baselineDocPath));
assert.ok(fs.existsSync(baselineTestPath));
assert.ok(fs.existsSync(checkpointPath));
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_LOCAL_FILES_EXIST');

assert.strictEqual(sha256(baselineDocPath), expectedBaselineDocSha);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_BASELINE_DOC_HASH_MATCH');

assert.strictEqual(sha256(baselineTestPath), expectedBaselineTestSha);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_BASELINE_TEST_HASH_MATCH');

assert.strictEqual(sha256(checkpointPath), expectedCheckpointSha);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_PR1_CHECKPOINT_HASH_MATCH');

const protocolFiles = [
  'protocol/hbce-authorization-evaluator.reference.mjs',
  'protocol/hbce-authorization-consumption.reference.mjs',
  'protocol/hbce-verify-authorization.reference.mjs',
  'protocol/hbce-execution-evidence-registry.reference.mjs',
  'protocol/hbce-execution-adapter-boundary.reference.mjs',
  'protocol/hbce-execution-adapter-capability.reference.mjs',
  'protocol/hbce-execution-adapter-trust.reference.mjs',
  'protocol/hbce-execution-adapter-authorization-provenance.reference.mjs',
  'protocol/hbce-admission-signature.reference.mjs',
  'protocol/hbce-revocation.reference.mjs',
  'protocol/hbce-mandate-registry.reference.mjs',
  'protocol/hbce-runtime-registry.reference.mjs',
];

for (const file of protocolFiles) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_PROTOCOL_FILES_EXIST');

const schemaFiles = [
  'schemas/hbce-authority.schema.json',
  'schemas/hbce-authorization.schema.json',
  'schemas/hbce-execution-evidence.schema.json',
  'schemas/hbce-mandate.schema.json',
];

for (const file of schemaFiles) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_SCHEMA_FILES_EXIST');

const existingTestFiles = [
  'tests/hbce-a010-evaluator-version-binding.mjs',
  'tests/hbce-a011-golden-negative.mjs',
  'tests/hbce-a014-execution-evidence-model.mjs',
  'tests/hbce-a015-execution-evidence-registry.mjs',
  'tests/hbce-a019-execution-adapter-boundary.mjs',
  'tests/hbce-a020-adapter-authorization-provenance.mjs',
  'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs',
];

for (const file of existingTestFiles) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_EXISTING_TEST_FILES_EXIST');

const bridgeHash = sha256(bridgePath);
assert.strictEqual(bridgeHash.length, 64);
pass('HBCE_BANK_ARCHITECTURE_BRIDGE_FILE_HASH_STABLE');
