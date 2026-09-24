import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const manifestPath = 'docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md';

const files = {
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
};

const expected = {
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

assert.ok(fs.existsSync(manifestPath));
const doc = fs.readFileSync(manifestPath, 'utf8');
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Exported Review Bundle Manifest/m);
assert.match(doc, /Status: exported review bundle manifest, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 0b9e207c412e43448fb57a39733a05906cbc1b65/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_HEADER');

assert.match(doc, /defines the exported review bundle manifest/);
assert.match(doc, /enumerates the files, hashes, validation tests, intended recipient roles, expected use and boundaries/);
assert.match(doc, /banking, risk, compliance, audit, security, innovation, procurement and technical governance stakeholders/);
assert.match(doc, /does not create a product surface, production system, API endpoint, UI, authorization surface/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_PURPOSE');

assert.match(doc, /The bundle is derived from hermeticum-bce-bank/);
assert.match(doc, /The bundle is exportable as documentation/);
assert.match(doc, /The bundle is not canonical/);
assert.match(doc, /The bundle is not production/);
assert.match(doc, /The bundle is not authorizing/);
assert.match(doc, /The bundle is not a deployment package/);
assert.match(doc, /The bundle is not a software release/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_STATUS');

assert.match(doc, /banking reviewers/);
assert.match(doc, /risk reviewers/);
assert.match(doc, /compliance reviewers/);
assert.match(doc, /audit reviewers/);
assert.match(doc, /security reviewers/);
assert.match(doc, /innovation reviewers/);
assert.match(doc, /procurement reviewers/);
assert.match(doc, /technical governance reviewers/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_RECIPIENTS');

assert.match(doc, /production operators/);
assert.match(doc, /autonomous banking systems/);
assert.match(doc, /customer-facing banking workflows/);
assert.match(doc, /payment execution systems/);
assert.match(doc, /transaction approval systems/);
assert.match(doc, /regulatory filing as a certified system/);
assert.match(doc, /legal certification as an eIDAS-qualified component/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_NOT_INTENDED_FOR');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
assert.match(doc, /Protocol references under protocol\//);
assert.match(doc, /Schema definitions under schemas\//);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_CONTENTS');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_HASHES');

assert.match(doc, /Review package index validation: 21\/21 PASS/);
assert.match(doc, /README reviewer index validation: 28\/28 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_VALIDATION');

assert.match(doc, /Upstream canonical repository: hermeticum-bce-platform/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
assert.match(doc, /must not replace the upstream platform evidence chain/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_UPSTREAM_REFERENCE');

assert.match(doc, /Banking reviewers may use the bundle/);
assert.match(doc, /Risk reviewers may use the bundle/);
assert.match(doc, /Compliance reviewers may use the bundle/);
assert.match(doc, /Audit reviewers may use the bundle/);
assert.match(doc, /Security reviewers may use the bundle/);
assert.match(doc, /Innovation reviewers may use the bundle/);
assert.match(doc, /Procurement reviewers may use the bundle/);
assert.match(doc, /Technical governance reviewers may use the bundle/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_RECIPIENT_USE');

assert.match(doc, /may be delivered as a review index/);
assert.match(doc, /may be delivered as a repository link/);
assert.match(doc, /may be delivered as a file list with hashes/);
assert.match(doc, /may be delivered as a controlled non-production evidence package/);
assert.match(doc, /must not be delivered as production software/);
assert.match(doc, /must not be delivered as a certified regulatory artifact/);
assert.match(doc, /must not be delivered as an authorization component/);
assert.match(doc, /must not be delivered as a live banking approval system/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_DELIVERY_CONSTRAINTS');

assert.match(doc, /may interpret the bundle as a derived banking review package/);
assert.match(doc, /controlled review aid/);
assert.match(doc, /hash-referenced document continuity/);
assert.match(doc, /local banking map to upstream platform evidence/);
assert.match(doc, /non-production review discussions/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_ACCEPTABLE_INTERPRETATION');

assert.match(doc, /must not interpret the bundle as the canonical evidence source/);
assert.match(doc, /must not interpret the bundle as production deployment/);
assert.match(doc, /must not interpret the bundle as live API availability/);
assert.match(doc, /must not interpret the bundle as legal certification/);
assert.match(doc, /must not interpret the bundle as eIDAS qualification/);
assert.match(doc, /must not interpret the bundle as regulatory approval/);
assert.match(doc, /must not interpret the bundle as OPC ALLOW creation/);
assert.match(doc, /must not interpret the bundle as autonomous banking authorization/);
assert.match(doc, /must not interpret the bundle as financial transaction approval/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_PROHIBITED_INTERPRETATION');

assert.match(doc, /protocol references/);
assert.match(doc, /schema definitions/);
assert.match(doc, /protocol tests/);
assert.match(doc, /derived bank baseline/);
assert.match(doc, /derived architecture bridge/);
assert.match(doc, /derived reviewer map/);
assert.match(doc, /README reviewer index/);
assert.match(doc, /review package index/);
assert.match(doc, /exported review bundle manifest/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_REPOSITORY_CAPABILITY');

assert.match(doc, /read-only/);
assert.match(doc, /observe-only/);
assert.match(doc, /non-production/);
assert.match(doc, /non-authorizing/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create production deployment/);
assert.match(doc, /does not create legal certification/);
assert.match(doc, /does not create regulatory approval/);
assert.match(doc, /does not create banking authorization/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_BOUNDARY');

assert.match(doc, /bank outreach evidence cover note/);
assert.match(doc, /plain banking language for first-contact delivery/);
assert.match(doc, /future product surface may be added only after an explicit application scaffold exists/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_NO_APPLICATION_SCAFFOLD');

const manifestHash = sha256(manifestPath);
assert.strictEqual(manifestHash.length, 64);
pass('HBCE_BANK_EXPORTED_REVIEW_BUNDLE_MANIFEST_FILE_HASH_STABLE');
