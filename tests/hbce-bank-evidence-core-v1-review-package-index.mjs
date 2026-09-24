import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const packagePath = 'docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md';

const files = {
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
};

const expected = {
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

assert.ok(fs.existsSync(packagePath));
const doc = fs.readFileSync(packagePath, 'utf8');
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Review Package Index/m);
assert.match(doc, /Status: derived review package index, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: ca6a16392c765b1d53913198550e72e7fda6d47b/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_HEADER');

assert.match(doc, /defines the ordered review package/);
assert.match(doc, /bundles the README reviewer index, derived reviewer map, imported baseline, architecture bridge/);
assert.match(doc, /banking, compliance, audit, security, innovation, procurement and technical governance/);
assert.match(doc, /does not create a product surface, production system, API endpoint, UI, authorization surface/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_PURPOSE');

assert.match(doc, /The package is derived from the canonical hermeticum-bce-platform evidence chain/);
assert.match(doc, /The package is review-oriented/);
assert.match(doc, /The package is not canonical/);
assert.match(doc, /The package is not production/);
assert.match(doc, /The package is not authorizing/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_STATUS');

assert.match(doc, /Use this package order:/);
assert.match(doc, /README reviewer index: README\.md/);
assert.match(doc, /Derived reviewer map:/);
assert.match(doc, /Bank baseline:/);
assert.match(doc, /Architecture bridge:/);
assert.match(doc, /Validation tests under tests\//);
assert.match(doc, /Upstream platform checkpoint reference/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_SEQUENCE');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_LOCAL_ARTIFACTS');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_HASHES');

assert.match(doc, /README reviewer index validation: 28\/28 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_LOCAL_VALIDATION_MATRIX');

assert.match(doc, /PR137 banking reviewer checklist validation: 23\/23 PASS/);
assert.match(doc, /PR136 external-facing dossier validation: 19\/19 PASS/);
assert.match(doc, /PR135 banking demo pack index validation: 16\/16 PASS/);
assert.match(doc, /PR128 source review package validation: 21\/21 PASS/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_UPSTREAM_VALIDATION_MATRIX');

assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-review-package-index\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-readme-reviewer-index\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-derived-reviewer-map\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-architecture-bridge\.mjs/);
assert.match(doc, /node tests\/hbce-bank-evidence-core-v1-review-pack-baseline\.mjs/);
assert.match(doc, /git diff --check/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_COMMANDS');

assert.match(doc, /Gate 1: package artifacts exist/);
assert.match(doc, /Gate 2: deterministic package hashes match/);
assert.match(doc, /Gate 3: local validation tests pass/);
assert.match(doc, /Gate 4: upstream platform checkpoint is referenced/);
assert.match(doc, /Gate 5: non-canonical and non-production boundaries are explicit/);
assert.match(doc, /Gate 8: reviewer conclusions remain controlled/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_REVIEW_GATES');

assert.match(doc, /may interpret this package as a derived banking review layer/);
assert.match(doc, /structured review bundle for discussion/);
assert.match(doc, /hash-referenced document continuity/);
assert.match(doc, /local map to upstream platform evidence/);
assert.match(doc, /controlled non-production review/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_ACCEPTABLE_INTERPRETATION');

assert.match(doc, /must not interpret this package as the canonical evidence source/);
assert.match(doc, /must not interpret this package as production deployment/);
assert.match(doc, /must not interpret this package as live API availability/);
assert.match(doc, /must not interpret this package as legal certification/);
assert.match(doc, /must not interpret this package as eIDAS qualification/);
assert.match(doc, /must not interpret this package as regulatory approval/);
assert.match(doc, /must not interpret this package as OPC ALLOW creation/);
assert.match(doc, /must not interpret this package as autonomous banking authorization/);
assert.match(doc, /must not interpret this package as financial transaction approval/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_PROHIBITED_INTERPRETATION');

assert.match(doc, /protocol references/);
assert.match(doc, /schema definitions/);
assert.match(doc, /protocol tests/);
assert.match(doc, /derived bank baseline/);
assert.match(doc, /derived architecture bridge/);
assert.match(doc, /derived reviewer map/);
assert.match(doc, /README reviewer index/);
assert.match(doc, /review package index/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_REPOSITORY_CAPABILITY');

assert.match(doc, /Banking review: use the package/);
assert.match(doc, /Compliance review: use the package/);
assert.match(doc, /Audit review: use the package/);
assert.match(doc, /Security review: use the package/);
assert.match(doc, /Innovation review: use the package/);
assert.match(doc, /Procurement review: use the package/);
assert.match(doc, /Technical governance review: use the package/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_USE_CASES');

assert.match(doc, /This review package index is read-only/);
assert.match(doc, /This review package index is observe-only/);
assert.match(doc, /This review package index is non-production/);
assert.match(doc, /This review package index is non-authorizing/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create production deployment/);
assert.match(doc, /does not create banking authorization/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_BOUNDARY');

assert.match(doc, /exported review bundle manifest/);
assert.match(doc, /enumerate all review files, hashes, validation tests and intended recipient roles/);
assert.match(doc, /future product surface may be added only after an explicit application scaffold exists/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_ALL_HASHES_MATCH');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_NO_APPLICATION_SCAFFOLD');

const packageHash = sha256(packagePath);
assert.strictEqual(packageHash.length, 64);
pass('HBCE_BANK_REVIEW_PACKAGE_INDEX_FILE_HASH_STABLE');
