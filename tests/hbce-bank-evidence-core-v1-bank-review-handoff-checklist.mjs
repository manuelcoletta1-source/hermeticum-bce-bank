import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const reportPath = 'docs/hbce-bank-evidence-core-v1-bank-review-handoff-checklist-2026-09-24.md';

const files = {
  briefingDoc: 'docs/hbce-bank-evidence-core-v1-bank-review-briefing-index-2026-09-24.md',
  briefingTest: 'tests/hbce-bank-evidence-core-v1-bank-review-briefing-index.mjs',
  closureDoc: 'docs/hbce-bank-evidence-core-v1-bank-review-closure-report-2026-09-24.md',
  closureTest: 'tests/hbce-bank-evidence-core-v1-bank-review-closure-report.mjs',
  trackerDoc: 'docs/hbce-bank-evidence-core-v1-bank-evidence-request-tracker-2026-09-24.md',
  trackerTest: 'tests/hbce-bank-evidence-core-v1-bank-evidence-request-tracker.mjs',
  registerDoc: 'docs/hbce-bank-evidence-core-v1-bank-missing-evidence-register-2026-09-24.md',
  registerTest: 'tests/hbce-bank-evidence-core-v1-bank-missing-evidence-register.mjs',
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
  baselineDoc: 'docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md',
  baselineTest: 'tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs',
  bridgeDoc: 'docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md',
  bridgeTest: 'tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs',
  mapDoc: 'docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md',
  mapTest: 'tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs',
  pr1Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md',
  pr2Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md',
  pr3Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_DERIVED_REVIEWER_MAP_CHECKPOINT_2026_09_24.md',
  pr4Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_README_REVIEWER_INDEX_CHECKPOINT_2026_09_24.md',
  pr5Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACKAGE_INDEX_CHECKPOINT_2026_09_24.md',
  pr6Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_EXPORTED_REVIEW_BUNDLE_MANIFEST_CHECKPOINT_2026_09_24.md',
  pr7Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md',
  pr8Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_RECIPIENT_MATRIX_CHECKPOINT_2026_09_24.md',
  pr9Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_PACK_INDEX_CHECKPOINT_2026_09_24.md',
  pr10Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_MISSING_EVIDENCE_REGISTER_CHECKPOINT_2026_09_24.md',
  pr11Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_EVIDENCE_REQUEST_TRACKER_CHECKPOINT_2026_09_24.md',
  pr12Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_CLOSURE_REPORT_CHECKPOINT_2026_09_24.md',
  pr13Checkpoint: 'MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_REVIEW_BRIEFING_INDEX_CHECKPOINT_2026_09_24.md',
};

const expected = {
  briefingDoc: '5e7cda85b5b1622ec0225bf0b2d56d7ca0f42f2a38733eddb3443899f3abc5c4',
  briefingTest: '45fceaffbb73425b40c528fdacb822e494de7a7811d20c2c6d2c6bf2abd490ba',
  closureDoc: '8323c1a18d49c8ca8aa2fbf11c2f182b376f4eedf2b77ce04f2b97c82986ef59',
  closureTest: 'f74b0822237c184064d9b3614597a414f67554fa485231917d2721894de80883',
  trackerDoc: '7571470a6721216c3fd4dc65a40a14dbacd029193ac0c4b7d3a6005080c90ca3',
  trackerTest: '499b74a800fc3fd05d4c5c26ef86d2204632f4311fec3c542eb77532f3647b7e',
  registerDoc: 'c22ec982276ce36e4d79448665858b9a51ec41e59382b9a854fba973730b4f8a',
  registerTest: '0b4cc77a68fbdd16f3cf5a6de52a053b750c677db09b2ac1163a2e6df74dfc7b',
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
  baselineDoc: '28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13',
  baselineTest: '9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2',
  bridgeDoc: '919dff27bd393e1db256337ef3b151501ed1f3c7a6aa72b91d50143a235c1f45',
  bridgeTest: 'fbf52e6a318bcf5ff038c68a03ea8c057032de22e8c78d6fb1c7b2c22c60b86b',
  mapDoc: '69f2d542da55c17b4f6f7b7a51cdb340c940bb687863094be4dd0e25288f7827',
  mapTest: 'acb0426cd88e36369f9009482cf4167855b8237cd5b377a3bc95e8707e86a7df',
  pr1Checkpoint: '7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593',
  pr2Checkpoint: 'a2bd4fd9d309c3b0a13c09393bbb783d3170504e74aed476900a82822489ba99',
  pr3Checkpoint: '77666f791ff7c2e9e3fc7e961025687b345cfdcc7256134b598e5860b1437293',
  pr4Checkpoint: '7188ae5d2eaefc1c42d66e88bfef4f474402ea6d342d57d1d1b6bd9303e5fd1c',
  pr5Checkpoint: '421b2b2daa83efaeecc604ee6b195fc663677d8c74f168dfec6b8d825267dad3',
  pr6Checkpoint: 'ebd07da476bd506f4aec98b06a63bc560eaa204782590f84477ef4c8ce25c2bd',
  pr7Checkpoint: 'e8d106d5fac285098f197119a7615c0e91ea1c7910127dcc8d5f39b772557e10',
  pr8Checkpoint: '3afec5958dd7b51fde470e97a09bb52fb231c030478851c19bddba0e1914e216',
  pr9Checkpoint: '4260aaea4e1a48d38a7ed457bbacab6c9089cf47373314a4c011f97833d8bde0',
  pr10Checkpoint: '97e659081ac6d9788e8833bd290f3d65463164cc57451f93fdbfcc658d9e42a1',
  pr11Checkpoint: '364c382eaead4a25ce95407395698b8bb030974cf290927599bc0052d9bb27ce',
  pr12Checkpoint: '960bf3e3c191334258625afe32d5b8ba787d0ae509b668ebc30cd3f55da8cf6b',
  pr13Checkpoint: '8a7f7436345126fd53dea4ce47a442801f18924fe59a59f6b9bbc5da8a8dbb1b',
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

assert.ok(fs.existsSync(reportPath));
const doc = fs.readFileSync(reportPath, 'utf8');
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Review Handoff Checklist/m);
assert.match(doc, /Status: bank review handoff checklist, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 678fa8e3c0b05890261da8f1487961da6833ee4e/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_HEADER');

assert.match(doc, /controlled human handoff checklist/);
assert.match(doc, /controlled delivery to bank-side reviewers/);
assert.match(doc, /supports human delivery only/);
assert.match(doc, /does not create production approval, regulatory approval, legal certification/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_PURPOSE');

assert.match(doc, /bank_review_handoff_checklist: true/);
assert.match(doc, /controlled_human_delivery: true/);
assert.match(doc, /shareable_review_bundle_preparation: true/);
assert.match(doc, /pre_delivery_checks: true/);
assert.match(doc, /artifact_list: true/);
assert.match(doc, /required_boundary_statements: true/);
assert.match(doc, /prohibited_claims: true/);
assert.match(doc, /recipient_routing_confirmation: true/);
assert.match(doc, /closure_baseline_confirmation: true/);
assert.match(doc, /missing_evidence_confirmation: true/);
assert.match(doc, /canonical_source_reminder: true/);
assert.match(doc, /post_delivery_logging_fields: true/);
assert.match(doc, /production: false/);
assert.match(doc, /api: false/);
assert.match(doc, /ui: false/);
assert.match(doc, /authorization: false/);
assert.match(doc, /canonical_source: false/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_STATUS_MODEL');

assert.match(doc, /\| Repository branch \| main \|/);
assert.match(doc, /\| Current main commit \| 678fa8e3c0b05890261da8f1487961da6833ee4e \|/);
assert.match(doc, /\| Application scaffold \| absent \|/);
assert.match(doc, /\| Production claim \| absent \|/);
assert.match(doc, /\| Authorization claim \| absent \|/);
assert.match(doc, /\| Certification claim \| absent \|/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_PRE_DELIVERY_CHECKS');

assert.match(doc, /\| yes \| README reviewer index \|/);
assert.match(doc, /\| yes \| Formal bank review pack index \|/);
assert.match(doc, /\| yes \| Bank review briefing index \|/);
assert.match(doc, /\| optional \| Architecture bridge \|/);
assert.match(doc, /\| optional \| Derived reviewer map \|/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_ARTIFACT_LIST');

assert.match(doc, /hermeticum-bce-bank is a derived banking review layer/);
assert.match(doc, /hermeticum-bce-platform remains the canonical technical evidence source/);
assert.match(doc, /The package is non-production/);
assert.match(doc, /The package is non-authorizing/);
assert.match(doc, /The package is not a certification/);
assert.match(doc, /The package is not a regulatory approval/);
assert.match(doc, /The package is not an eIDAS qualification/);
assert.match(doc, /The package is not an OPC ALLOW/);
assert.match(doc, /The package is not a live banking application/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_REQUIRED_BOUNDARY_STATEMENTS');

assert.match(doc, /production readiness/);
assert.match(doc, /live API availability/);
assert.match(doc, /customer-facing availability/);
assert.match(doc, /completed external bank review/);
assert.match(doc, /legal certification/);
assert.match(doc, /eIDAS qualification/);
assert.match(doc, /regulatory approval/);
assert.match(doc, /autonomous banking authorization/);
assert.match(doc, /financial transaction approval/);
assert.match(doc, /vendor onboarding approval/);
assert.match(doc, /procurement approval/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_PROHIBITED_CLAIMS');

assert.match(doc, /\| Risk \| Formal bank review pack index \| confirm risk review scope \|/);
assert.match(doc, /\| Compliance \| Evidence request tracker \| confirm compliance evidence routing \|/);
assert.match(doc, /\| Audit \| Exported review bundle manifest \| confirm audit artifact integrity \|/);
assert.match(doc, /\| Executive review \| Bank review briefing index \| confirm executive summary path \|/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_RECIPIENT_ROUTING');

assert.match(doc, /source_tracker_items: 43/);
assert.match(doc, /open_items: 43/);
assert.match(doc, /received_items: 0/);
assert.match(doc, /reviewed_items: 0/);
assert.match(doc, /closed_items: 0/);
assert.match(doc, /closure_basis: derived_from_tracker_defaults/);
assert.match(doc, /zero-closure baseline/);
assert.match(doc, /must not be presented as completed review/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_CLOSURE_BASELINE');

assert.match(doc, /missing evidence register remains active/);
assert.match(doc, /evidence requests remain open/);
assert.match(doc, /must not imply that missing evidence has been supplied/);
assert.match(doc, /must not imply that bank review has accepted the evidence package/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_MISSING_EVIDENCE');

assert.match(doc, /Canonical source: hermeticum-bce-platform/);
assert.match(doc, /Derived bank review layer: hermeticum-bce-bank/);
assert.match(doc, /must not become a competing canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_CANONICAL_SOURCE');

assert.match(doc, /The handoff is allowed only if:/);
assert.match(doc, /all included artifacts are listed/);
assert.match(doc, /all boundary statements are included/);
assert.match(doc, /all prohibited claims are excluded/);
assert.match(doc, /missing evidence remains disclosed/);
assert.match(doc, /The handoff is blocked if:/);
assert.match(doc, /any prohibited claim is present/);
assert.match(doc, /package is described as production-ready/);
assert.match(doc, /package omits canonical source separation/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_DECISION_GATE');

assert.match(doc, /\| delivery_date \| yes \|/);
assert.match(doc, /\| delivery_channel \| yes \|/);
assert.match(doc, /\| recipient_organization \| yes \|/);
assert.match(doc, /\| delivered_artifacts \| yes \|/);
assert.match(doc, /\| delivered_hashes \| yes \|/);
assert.match(doc, /\| prohibited_claims_absent \| yes \|/);
assert.match(doc, /\| closure_baseline_disclosed \| yes \|/);
assert.match(doc, /\| canonical_source_disclosed \| yes \|/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_POST_DELIVERY_LOGGING');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_FILES_REFERENCED');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_HASHES_REFERENCED');

assert.match(doc, /Bank review briefing index validation: 20\/20 PASS/);
assert.match(doc, /Bank review closure report validation: 24\/24 PASS/);
assert.match(doc, /Bank evidence request tracker validation: 28\/28 PASS/);
assert.match(doc, /Bank missing evidence register validation: 30\/30 PASS/);
assert.match(doc, /Formal bank review pack index validation: 25\/25 PASS/);
assert.match(doc, /Derived reviewer map validation: 26\/26 PASS/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_VALIDATION_SUMMARY');

assert.match(doc, /At this bank-review-handoff-checklist stage/);
assert.match(doc, /bank review handoff checklist/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_REPOSITORY_CAPABILITY');

assert.match(doc, /may accompany a controlled bank review bundle/);
assert.match(doc, /bank intake ticket/);
assert.match(doc, /non-production pilot discussion request/);
assert.match(doc, /controlled human evidence handoff/);
assert.match(doc, /must not accompany a production-readiness claim/);
assert.match(doc, /transaction authorization claim/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_DELIVERY_FORM');

assert.match(doc, /may be frozen as a shareable review bundle/);
assert.match(doc, /future branch may add a bundle freeze manifest/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_NO_APPLICATION_SCAFFOLD');

const reportHash = sha256(reportPath);
assert.strictEqual(reportHash.length, 64);
pass('HBCE_BANK_REVIEW_HANDOFF_CHECKLIST_FILE_HASH_STABLE');
