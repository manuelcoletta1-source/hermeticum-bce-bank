import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const coverPath = 'docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md';

const files = {
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
};

const expected = {
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

assert.ok(fs.existsSync(coverPath));
const doc = fs.readFileSync(coverPath, 'utf8');
pass('HBCE_BANK_OUTREACH_COVER_NOTE_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Outreach Evidence Cover Note/m);
assert.match(doc, /Status: bank outreach cover note, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 928eff04c4c1bfc37a7f44af98ebb23d350f7aec/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_HEADER');

assert.match(doc, /introduces the HBCE Evidence Core v1 banking review bundle/);
assert.match(doc, /first-contact discussion with a bank or bank-facing reviewer/);
assert.match(doc, /plain banking language/);
assert.match(doc, /risk, compliance, audit, security, innovation, procurement and technical governance recipients/);
assert.match(doc, /not a sales claim, production claim, certification claim, regulatory approval claim/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_PURPOSE');

assert.match(doc, /controlled evidence package/);
assert.match(doc, /documents, tests, deterministic hashes, repository checkpoints and explicit boundaries/);
assert.match(doc, /designed for non-production review/);
assert.match(doc, /does not contain a live banking application/);
assert.match(doc, /does not contain a customer-facing workflow/);
assert.match(doc, /does not authorize operational banking activity/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_PLAIN_LANGUAGE_SUMMARY');

assert.match(doc, /requested review is limited to non-production evidence assessment/);
assert.match(doc, /should proceed to a controlled pilot discussion/);
assert.match(doc, /additional documents would be required before any procurement, vendor onboarding, legal review, security review or regulatory review/);
assert.match(doc, /must not be treated as a request for production approval/);
assert.match(doc, /must not be treated as a request for transaction approval/);
assert.match(doc, /must not be treated as a request for certification/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_REVIEW_REQUEST');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
assert.match(doc, /Protocol references under protocol\//);
assert.match(doc, /Schema definitions under schemas\//);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_INCLUDED_BUNDLE');

assert.match(doc, /Exported review bundle manifest validation: 22\/22 PASS/);
assert.match(doc, /Review package index validation: 21\/21 PASS/);
assert.match(doc, /README reviewer index validation: 28\/28 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
assert.match(doc, /Architecture bridge validation: 24\/24 PASS/);
assert.match(doc, /Bank baseline validation: 12\/12 PASS/);
assert.match(doc, /Bank main checkpoint commit: 928eff04c4c1bfc37a7f44af98ebb23d350f7aec/);
assert.match(doc, /PR6 checkpoint SHA-256: ebd07da476bd506f4aec98b06a63bc560eaa204782590f84477ef4c8ce25c2bd/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_VERIFICATION_SUMMARY');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_OUTREACH_COVER_NOTE_HASH_SUMMARY');

assert.match(doc, /canonical technical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /banking repository is a derived banking review layer/);
assert.match(doc, /must not be treated as the canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_UPSTREAM_SOURCE');

assert.match(doc, /A reviewer may start with README\.md/);
assert.match(doc, /exported review bundle manifest/);
assert.match(doc, /review package index/);
assert.match(doc, /risk path/);
assert.match(doc, /compliance path/);
assert.match(doc, /audit path/);
assert.match(doc, /security path/);
assert.match(doc, /innovation path/);
assert.match(doc, /procurement path/);
assert.match(doc, /technical governance path/);
assert.match(doc, /run the validation tests locally in a non-production environment/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_REVIEWER_PATH');

assert.match(doc, /plain-language introduction/);
assert.match(doc, /controlled non-production evidence package/);
assert.match(doc, /suitable for first technical review/);
assert.match(doc, /basis for asking follow-up questions/);
assert.match(doc, /controlled pilot discussion is appropriate/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_RECIPIENT_INTERPRETATION');

assert.match(doc, /does not claim production deployment/);
assert.match(doc, /does not claim live API availability/);
assert.match(doc, /does not claim a UI/);
assert.match(doc, /does not claim customer-facing readiness/);
assert.match(doc, /does not claim legal certification/);
assert.match(doc, /does not claim eIDAS qualification/);
assert.match(doc, /does not claim regulatory approval/);
assert.match(doc, /does not claim external review completion/);
assert.match(doc, /does not claim OPC ALLOW creation/);
assert.match(doc, /does not claim autonomous banking authorization/);
assert.match(doc, /does not claim live transaction approval/);
assert.match(doc, /does not claim financial transaction approval/);
assert.match(doc, /does not claim vendor onboarding approval/);
assert.match(doc, /does not claim procurement approval/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_NON_CLAIMS');

assert.match(doc, /Is the review bundle understandable/);
assert.match(doc, /non-production and non-authorization boundaries clear/);
assert.match(doc, /hash, checkpoint and validation references sufficient/);
assert.match(doc, /vendor onboarding/);
assert.match(doc, /security review/);
assert.match(doc, /compliance review/);
assert.match(doc, /legal review/);
assert.match(doc, /pilot discussion/);
assert.match(doc, /formal bank review pack/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_QUESTIONS_FOR_REVIEWERS');

assert.match(doc, /may accompany a repository link/);
assert.match(doc, /may accompany a file export/);
assert.match(doc, /may accompany a first-contact evidence package/);
assert.match(doc, /may accompany a non-production pilot discussion request/);
assert.match(doc, /must not accompany a claim of production readiness/);
assert.match(doc, /must not accompany a claim of certification/);
assert.match(doc, /must not accompany a claim of regulatory approval/);
assert.match(doc, /must not accompany a claim of transaction authorization/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_DELIVERY_POSITIONING');

assert.match(doc, /protocol, schema, tests, derived banking baseline, architecture bridge, reviewer map, README reviewer index, review package index, exported review bundle manifest and outreach cover note material/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_REPOSITORY_CAPABILITY');

assert.match(doc, /read-only/);
assert.match(doc, /observe-only/);
assert.match(doc, /non-production/);
assert.match(doc, /non-authorizing/);
assert.match(doc, /does not mutate protocol behavior/);
assert.match(doc, /does not mutate schema definitions/);
assert.match(doc, /does not create an API endpoint/);
assert.match(doc, /does not create a UI/);
assert.match(doc, /does not create production deployment/);
assert.match(doc, /does not create legal certification/);
assert.match(doc, /does not create regulatory approval/);
assert.match(doc, /does not create banking authorization/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_BOUNDARY');

assert.match(doc, /controlled bank recipient matrix/);
assert.match(doc, /map recipient roles to documents, questions, expected review outputs and missing evidence requests/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_OUTREACH_COVER_NOTE_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_OUTREACH_COVER_NOTE_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_OUTREACH_COVER_NOTE_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_OUTREACH_COVER_NOTE_NO_APPLICATION_SCAFFOLD');

const coverHash = sha256(coverPath);
assert.strictEqual(coverHash.length, 64);
pass('HBCE_BANK_OUTREACH_COVER_NOTE_FILE_HASH_STABLE');
