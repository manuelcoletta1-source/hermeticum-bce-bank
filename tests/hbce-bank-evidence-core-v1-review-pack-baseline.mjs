import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const docPath = 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md';

function pass(name) {
  console.log(`PASS ${name}`);
}

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

assert.ok(fs.existsSync(docPath));
const doc = fs.readFileSync(docPath, 'utf8');
pass('HBCE_BANK_BASELINE_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Review Pack Baseline/m);
assert.match(doc, /Status: derived banking baseline, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
pass('HBCE_BANK_BASELINE_HEADER');

assert.match(doc, /imports the HBCE Evidence Core v1 banking review pack baseline/);
assert.match(doc, /canonical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /does not regenerate, replace or supersede the canonical HBCE evidence chain/);
pass('HBCE_BANK_BASELINE_PURPOSE');

assert.match(doc, /Upstream canonical checkpoint commit: b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /PR137 checkpoint document SHA-256: c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
assert.match(doc, /PR137 merge commit: e21bfeea6f62e30e17596ed1f3ec975cf3a72753/);
assert.match(doc, /PR137 feature commit: 8cd672fb219065d71425f334957433aa76241c64/);
assert.match(doc, /PR136 checkpoint commit: df0f8b42fd7e1ee9d64ff7ea955aa00c1e8f870b/);
pass('HBCE_BANK_BASELINE_UPSTREAM_COMMITS');

const requiredPaths = [
  'artifacts/product/hbce-evidence-core-v1-banking-reviewer-checklist-2026-09-24.md',
  'tests/product/validate-hbce-evidence-core-v1-banking-reviewer-checklist.test.js',
  'artifacts/product/hbce-evidence-core-v1-external-facing-dossier-2026-09-24.md',
  'tests/product/validate-hbce-evidence-core-v1-external-facing-dossier.test.js',
  'artifacts/product/hbce-evidence-core-v1-banking-demo-pack-index-2026-09-24.md',
  'artifacts/product/hbce-evidence-core-v1-api-adapter-contract-2026-09-24.md',
  'artifacts/product/hbce-evidence-core-v1-banking-demo-manifest-2026-09-24.md',
  'artifacts/product/hbce-evidence-core-v1-demo-payload-export-2026-09-24.json',
];

for (const path of requiredPaths) {
  assert.match(doc, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
pass('HBCE_BANK_BASELINE_IMPORTED_PATHS');

const requiredHashes = [
  'bba8416aeefbc9e45d19cb0296d5acf4f017aa756bb559889416a4e5bfaacb06',
  '355cf1cacb1f881fb872d12f6b91710b191b6b4ba4cef38fa2ff8c30dddf3cc3',
  '4988decb5d81c4fea8760e032747d505207b91c5c68c9489112e998af5f8de9d',
  '6228b06521f09b6c88b6399f590c4251b09cd7cdc2496820cae8ff4de79739b9',
  '261131010e24687c1fe9f5be486cee9145ac8c8a931c67077b5c7fc4daab93c3',
  '6172a61017d0de5665f17eb440abaa89a526af0fe6ccc8968a801ab982a66f6f',
  '79233f7f37c0afca1dff0fc604f425d094d54e968a7bb864b88c3805ac87a963',
  'e9ea6782c0903b46451ea7ae34b50e99e49a30db47828e4952ec233646cc52d2',
  'd8d839c54e676f46f5e3f8b43d9a1e0b9503f9e6e1f387036962e093249c040c',
  '1db3c724a450053adee9de011792bf4505946a35fc6d79ae2aa25704054d09da',
  'fb688399b1fbabe7060a9c74f3a88aeb03c60d0069ae6c4ed40a330697ba710f',
  'a6c90405c01f96079dc3f1883b81b22340fac7df60c5bd0a6c6b897d43f27cfd',
  'a62615e28a2a0514a4c88025d6dcb8d90d45824960337e88e9aef8797b0ffee5',
  'b9dfe9c84524f78aff856f26dfcd6cf6c6276b0259d6c5df61fb9fcbfb7dd515',
];

for (const hash of requiredHashes) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_BASELINE_IMPORTED_HASHES');

assert.match(doc, /PR137 banking reviewer checklist validation: 23\/23 PASS/);
assert.match(doc, /PR136 external-facing dossier validation: 19\/19 PASS/);
assert.match(doc, /PR135 banking demo pack index validation: 16\/16 PASS/);
assert.match(doc, /PR134 API adapter contract validation: 15\/15 PASS/);
assert.match(doc, /PR133 banking demo manifest validation: 13\/13 PASS/);
assert.match(doc, /PR132 JSON artifact validation: 13\/13 PASS/);
assert.match(doc, /PR131 demo payload export validation: 18\/18 PASS/);
assert.match(doc, /PR130 readable product surface validation: 19\/19 PASS/);
assert.match(doc, /PR128 source review package validation: 21\/21 PASS/);
pass('HBCE_BANK_BASELINE_VALIDATION_COUNTS');

assert.match(doc, /may use the upstream pack as a derived banking review surface/);
assert.match(doc, /may present the pack to banking, compliance, audit, security, innovation and procurement readers/);
assert.match(doc, /must preserve upstream commit identifiers, upstream artifact paths, upstream hashes and upstream validation counts/);
assert.match(doc, /must not create a competing canonical evidence chain/);
pass('HBCE_BANK_BASELINE_DERIVED_INTERPRETATION');

assert.match(doc, /does not prove production deployment/);
assert.match(doc, /does not prove live API availability/);
assert.match(doc, /does not prove legal certification/);
assert.match(doc, /does not prove eIDAS qualification/);
assert.match(doc, /does not prove external review completion/);
assert.match(doc, /does not prove regulatory approval/);
assert.match(doc, /does not prove OPC ALLOW creation/);
assert.match(doc, /does not prove autonomous banking authorization/);
assert.match(doc, /does not prove live transaction approval/);
assert.match(doc, /does not prove customer-facing production approval/);
assert.match(doc, /does not prove financial transaction approval/);
pass('HBCE_BANK_BASELINE_BOUNDARY');

assert.match(doc, /does not expose a package\.json application scaffold/);
assert.match(doc, /does not expose an app directory/);
assert.match(doc, /does not expose a pages directory/);
assert.match(doc, /does not expose a src directory/);
assert.match(doc, /not a UI, API route, live endpoint or production surface/);
pass('HBCE_BANK_BASELINE_REPOSITORY_CAPABILITY');

assert.match(doc, /next banking step should be a derived banking review README or architecture bridge/);
assert.match(doc, /later banking step may add a product surface only after this repository has an explicit application scaffold/);
pass('HBCE_BANK_BASELINE_NEXT_STEP');

const docHash = sha256(docPath);
assert.strictEqual(docHash.length, 64);
pass('HBCE_BANK_BASELINE_FILE_HASH_STABLE');
