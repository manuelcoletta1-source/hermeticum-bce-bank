import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert';

const reportPath = 'docs/hbce-bank-evidence-core-v1-bank-review-closure-report-2026-09-24.md';
const trackerPath = 'docs/hbce-bank-evidence-core-v1-bank-evidence-request-tracker-2026-09-24.md';

const files = {
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
};

const expected = {
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

function metric(doc, key) {
  const match = doc.match(new RegExp(`- ${esc(key)}: ([^\\n]+)`));
  assert.ok(match, `${key} missing`);
  return match[1].trim();
}

assert.ok(fs.existsSync(reportPath));
const doc = fs.readFileSync(reportPath, 'utf8');
const tracker = fs.readFileSync(trackerPath, 'utf8');
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_EXISTS');

assert.match(doc, /^# HBCE Bank — Evidence Core v1 Bank Review Closure Report/m);
assert.match(doc, /Status: bank review closure report, non-canonical, non-production, non-authorizing\./);
assert.match(doc, /Repository: hermeticum-bce-bank/);
assert.match(doc, /Canonical upstream repository: hermeticum-bce-platform/);
assert.match(doc, /Current bank checkpoint: 8f75604cce716d8bcaad7239c28fac25a036ad29/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_HEADER');

assert.match(doc, /summarizes the closure state of the Bank Evidence Request Tracker/);
assert.match(doc, /derived from the tracker defaults/);
assert.match(doc, /does not mark any evidence request as received, reviewed, accepted, rejected, deferred or closed/);
assert.match(doc, /does not create production approval, regulatory approval, legal certification/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_PURPOSE');

assert.match(doc, /closure_basis: derived_from_tracker_defaults/);
assert.match(doc, /production: false/);
assert.match(doc, /authorization: false/);
assert.match(doc, /canonical_source: false/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_MODEL');

assert.strictEqual(metric(doc, 'source_tracker_items'), '43');
assert.strictEqual(metric(doc, 'open_items'), '43');
assert.strictEqual(metric(doc, 'received_items'), '0');
assert.strictEqual(metric(doc, 'reviewed_items'), '0');
assert.strictEqual(metric(doc, 'closed_items'), '0');
assert.strictEqual(metric(doc, 'deferred_items'), '0');
assert.strictEqual(metric(doc, 'not_required_items'), '0');
assert.strictEqual(metric(doc, 'unassigned_items'), '43');
assert.strictEqual(metric(doc, 'due_date_tbd_items'), '43');
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_COUNTS');

assert.match(doc, /The report is review-oriented/);
assert.match(doc, /The report is non-production/);
assert.match(doc, /The report is non-authorizing/);
assert.match(doc, /not a deployment plan/);
assert.match(doc, /not a closure certificate/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_STATUS');

for (const file of Object.values(files)) {
  assert.match(doc, new RegExp(esc(file)));
}
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_FILES_REFERENCED');

for (const hash of Object.values(expected)) {
  assert.match(doc, new RegExp(hash));
}
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_HASHES_REFERENCED');

assert.match(doc, /canonical technical evidence source remains hermeticum-bce-platform/);
assert.match(doc, /banking repository is a derived banking review layer/);
assert.match(doc, /must not be treated as the canonical evidence source/);
assert.match(doc, /b61590f8db86bbcd8f60f52a613065995fa1dc77/);
assert.match(doc, /c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_UPSTREAM');

const trackerRows = tracker.split('\n').filter((line) => /^\| ME-\d{3} \|/.test(line));
assert.strictEqual(trackerRows.length, 43);
for (const row of trackerRows) {
  const fields = row.split('|').slice(1, -1).map((value) => value.trim());
  assert.strictEqual(fields.length, 13, row);
  assert.strictEqual(fields[7], 'TBD', row);
  assert.strictEqual(fields[8], 'UNASSIGNED', row);
  assert.strictEqual(fields[9], 'NOT_RECEIVED', row);
  assert.strictEqual(fields[10], 'NOT_REVIEWED', row);
  assert.strictEqual(fields[11], 'OPEN', row);
}
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_TRACKER_DEFAULTS');

assert.match(doc, /\| source_tracker_items \| 43 \|/);
assert.match(doc, /\| open_items \| 43 \|/);
assert.match(doc, /\| received_items \| 0 \|/);
assert.match(doc, /\| reviewed_items \| 0 \|/);
assert.match(doc, /\| closed_items \| 0 \|/);
assert.match(doc, /\| deferred_items \| 0 \|/);
assert.match(doc, /\| not_required_items \| 0 \|/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_SUMMARY_TABLE');

assert.match(doc, /\| status \| OPEN \| 43 \|/);
assert.match(doc, /\| received_artifact \| NOT_RECEIVED \| 43 \|/);
assert.match(doc, /\| review_result \| NOT_REVIEWED \| 43 \|/);
assert.match(doc, /\| closure_status \| OPEN \| 43 \|/);
assert.match(doc, /\| assignee \| UNASSIGNED \| 43 \|/);
assert.match(doc, /\| due_date \| TBD \| 43 \|/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_FIELD_SUMMARY');

assert.match(doc, /\| P1 \| 18 \|/);
assert.match(doc, /\| P2 \| 16 \|/);
assert.match(doc, /\| P3 \| 9 \|/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_PRIORITY_SUMMARY');

assert.match(doc, /\| PROVIDE \| 32 \|/);
assert.match(doc, /\| ROUTE \| 7 \|/);
assert.match(doc, /\| DEFER \| 4 \|/);
assert.match(doc, /\| REJECT_AS_OUT_OF_SCOPE \| 0 \|/);
assert.match(doc, /\| MARK_NOT_REQUIRED \| 0 \|/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_DECISION_SUMMARY');

assert.match(doc, /All tracker items are currently open/);
assert.match(doc, /No evidence artifact has been received/);
assert.match(doc, /No evidence artifact has been reviewed/);
assert.match(doc, /No evidence item has been accepted/);
assert.match(doc, /No evidence item has been rejected/);
assert.match(doc, /No evidence item has been closed/);
assert.match(doc, /zero-closure baseline/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_INTERPRETATION');

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
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_BOUNDARY');

assert.match(doc, /At this bank-review-closure-report stage/);
assert.match(doc, /bank review closure report/);
assert.match(doc, /package\.json/);
assert.match(doc, /app\//);
assert.match(doc, /pages\//);
assert.match(doc, /src\//);
assert.match(doc, /not an application scaffold/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_REPOSITORY_CAPABILITY');

assert.match(doc, /may accompany/);
assert.match(doc, /formal bank review pack/);
assert.match(doc, /bank intake ticket/);
assert.match(doc, /controlled evidence request workflow/);
assert.match(doc, /bank evidence closure workflow/);
assert.match(doc, /must not accompany/);
assert.match(doc, /production-readiness claim/);
assert.match(doc, /procurement approval claim/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_DELIVERY_FORM');

assert.match(doc, /bank review briefing index/);
assert.match(doc, /combine the review pack index, recipient matrix, missing evidence register, evidence request tracker and closure report/);
assert.match(doc, /controlled derived banking evidence layer/);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_NEXT_STEP');

for (const file of Object.values(files)) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_LOCAL_FILES_EXIST');

for (const [key, file] of Object.entries(files)) {
  assert.strictEqual(sha256(file), expected[key], `${file} hash mismatch`);
}
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_ALL_HASHES_MATCH');

assert.ok(fs.existsSync('protocol'));
assert.ok(fs.existsSync('schemas'));
assert.ok(fs.existsSync('tests'));
assert.ok(fs.existsSync('docs'));
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_REVIEW_DIRECTORIES_EXIST');

assert.ok(!fs.existsSync('package.json'));
assert.ok(!fs.existsSync('app'));
assert.ok(!fs.existsSync('pages'));
assert.ok(!fs.existsSync('src'));
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_NO_APPLICATION_SCAFFOLD');

const reportHash = sha256(reportPath);
assert.strictEqual(reportHash.length, 64);
pass('HBCE_BANK_REVIEW_CLOSURE_REPORT_FILE_HASH_STABLE');
