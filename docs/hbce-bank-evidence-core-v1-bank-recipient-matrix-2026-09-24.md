# HBCE Bank — Evidence Core v1 Bank Recipient Matrix

Date: 2026-09-24

Status: bank recipient matrix, non-canonical, non-production, non-authorizing.

Repository: hermeticum-bce-bank

Canonical upstream repository: hermeticum-bce-platform

Current bank checkpoint: e325870e3ce5016ec704ffa422a39113be5ed99a

## Purpose

This document maps bank-facing recipient roles to the HBCE Evidence Core v1 review bundle.

The matrix gives each recipient a concrete review path: recommended documents, review questions, expected review outputs, missing evidence requests and explicit boundaries.

The purpose is to make the banking review bundle navigable for banking, risk, compliance, audit, security, innovation, procurement and technical governance reviewers.

This matrix does not create production approval, regulatory approval, legal certification, eIDAS qualification, OPC ALLOW creation, vendor onboarding approval, procurement approval, autonomous banking authorization or financial transaction approval.

## Matrix status

This recipient matrix is derived from hermeticum-bce-bank.

hermeticum-bce-bank is derived from the canonical hermeticum-bce-platform evidence chain.

The matrix is review-oriented.

The matrix is non-production.

The matrix is non-authorizing.

The matrix is not a deployment plan.

The matrix is not a vendor onboarding decision.

The matrix is not a regulatory filing.

## Common review entry path

All recipients may start with:

1. README.md
2. docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
3. docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
4. docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md

All recipients may verify:

- local validation test results
- deterministic document hashes
- checkpoint continuity
- upstream canonical platform reference
- explicit non-production and non-authorization boundaries

## Recipient matrix

### Banking reviewer

Recommended documents:

- README.md
- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md

Review questions:

- Is the banking review package understandable as a non-production evidence layer?
- Is the proposed review path clear enough for first banking assessment?
- Does the bundle explain what is present and what is not present?
- Is a controlled pilot discussion appropriate after first review?

Expected review output:

- banking review comments
- decision on whether to route to risk, compliance, audit, security, procurement and technical governance
- list of banking-domain clarification requests
- recommendation on whether a pilot framing discussion is appropriate

Missing evidence requests:

- formal business case
- target banking use case
- pilot scope
- stakeholder map
- operational ownership proposal
- service model proposal

Boundary:

The banking reviewer must not treat the bundle as production approval, customer-facing readiness, autonomous banking authorization or transaction approval.

### Risk reviewer

Recommended documents:

- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md

Review questions:

- Are non-production and non-authorization boundaries clear?
- Are prohibited interpretations explicit enough?
- Is the canonical upstream relationship clear?
- What risk categories require additional documentation before any pilot?

Expected review output:

- risk assessment notes
- risk taxonomy request
- list of required controls
- list of missing risk evidence before pilot discussion

Missing evidence requests:

- risk register
- control mapping
- model risk framing
- operational risk framing
- third-party risk framing
- residual risk statement

Boundary:

The risk reviewer must not treat the bundle as an approved risk control, accepted residual risk or operational approval.

### Compliance reviewer

Recommended documents:

- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md

Review questions:

- Are certification, regulatory approval and eIDAS qualification non-claims clear?
- Does the bundle avoid claims of legal effect?
- Does the bundle separate evidence review from compliance approval?
- Which regulatory or internal compliance mappings are required next?

Expected review output:

- compliance clarification list
- regulatory mapping request
- internal policy mapping request
- list of compliance evidence gaps

Missing evidence requests:

- legal basis analysis
- compliance framework mapping
- data protection assessment
- AI governance mapping
- vendor compliance questionnaire
- regulatory perimeter note

Boundary:

The compliance reviewer must not treat the bundle as legal certification, regulatory approval, eIDAS qualification or compliance sign-off.

### Audit reviewer

Recommended documents:

- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_ARCHITECTURE_BRIDGE_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_DERIVED_REVIEWER_MAP_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_README_REVIEWER_INDEX_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACKAGE_INDEX_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_EXPORTED_REVIEW_BUNDLE_MANIFEST_CHECKPOINT_2026_09_24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md

Review questions:

- Are hashes and checkpoint continuity sufficient for first audit review?
- Are validation tests deterministic and reproducible?
- Is upstream canonical source separation clear?
- Are document boundaries traceable?

Expected review output:

- audit trail comments
- evidence continuity comments
- request for formal evidence pack format
- list of audit evidence gaps

Missing evidence requests:

- formal audit evidence pack
- change management log
- approval workflow log
- access control evidence
- independent verification note
- retention policy

Boundary:

The audit reviewer must not treat the bundle as completed external audit, certification or final assurance opinion.

### Security reviewer

Recommended documents:

- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md
- protocol/
- schemas/
- tests/

Review questions:

- Does the repository expose any application scaffold?
- Does the repository expose package.json, app, pages or src?
- Are API, UI, production and authorization non-claims clear?
- Which security documents are required before any pilot?

Expected review output:

- security review comments
- security evidence request list
- threat model request
- secure development review request
- repository exposure assessment

Missing evidence requests:

- threat model
- secure SDLC evidence
- dependency inventory
- secrets handling statement
- vulnerability management process
- deployment architecture
- access control model

Boundary:

The security reviewer must not treat the bundle as security approval, production hardening evidence or authorization to deploy.

### Innovation reviewer

Recommended documents:

- README.md
- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md

Review questions:

- Is the review bundle understandable for an innovation intake discussion?
- Does the bundle explain the value of a controlled evidence layer?
- Is there enough material to scope a non-production pilot conversation?
- What business hypotheses should be tested next?

Expected review output:

- innovation intake notes
- pilot hypothesis list
- stakeholder routing suggestion
- recommendation on whether to proceed to structured discovery

Missing evidence requests:

- pilot hypothesis
- value proposition
- user journey outline
- measurable pilot outcomes
- timeline proposal
- internal sponsor identification

Boundary:

The innovation reviewer must not treat the bundle as product-market validation, commercial approval or production readiness.

### Procurement reviewer

Recommended documents:

- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_BANK_OUTREACH_COVER_NOTE_CHECKPOINT_2026_09_24.md

Review questions:

- Does the bundle identify which vendor documents are still missing?
- Does the bundle avoid procurement approval claims?
- Is the repository suitable only as first-contact evidence?
- What documents are required for supplier onboarding?

Expected review output:

- procurement intake checklist
- vendor document request
- supplier onboarding gap list
- procurement process routing suggestion

Missing evidence requests:

- company profile
- commercial proposal
- DPA or data protection terms
- security questionnaire
- insurance evidence
- financial standing information
- support and SLA proposal
- procurement compliance forms

Boundary:

The procurement reviewer must not treat the bundle as vendor onboarding approval, procurement approval or contractual readiness.

### Technical governance reviewer

Recommended documents:

- README.md
- ARCHITECTURE.md
- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md
- docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md
- protocol/
- schemas/
- tests/

Review questions:

- Is the derived banking repository clearly separated from the canonical platform repository?
- Are protocol, schema, tests and derived evidence organized coherently?
- Does the repository correctly avoid application scaffold claims?
- What governance artifacts are required before technical pilot design?

Expected review output:

- technical governance notes
- architecture clarification requests
- repository structure assessment
- technical pilot readiness gaps

Missing evidence requests:

- target architecture
- integration model
- deployment model
- governance workflow
- ownership model
- acceptance criteria
- technical pilot plan

Boundary:

The technical governance reviewer must not treat the bundle as deployment approval, architecture approval, live API proof or production readiness.

## Document mapping summary

- README.md: reviewer entry point
- docs/hbce-bank-evidence-core-v1-bank-outreach-cover-note-2026-09-24.md: plain-language first-contact note
- docs/hbce-bank-evidence-core-v1-exported-review-bundle-manifest-2026-09-24.md: exported bundle manifest
- docs/hbce-bank-evidence-core-v1-review-package-index-2026-09-24.md: ordered package index
- docs/hbce-bank-evidence-core-v1-derived-reviewer-map-2026-09-24.md: role-oriented reviewer map
- docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md: derived banking baseline
- docs/hbce-bank-evidence-core-v1-architecture-bridge-2026-09-24.md: architecture bridge
- protocol/: protocol references
- schemas/: schema definitions
- tests/: validation tests
- tests/hbce-bank-evidence-core-v1-bank-recipient-matrix.mjs: bank recipient matrix validation test
- tests/hbce-bank-evidence-core-v1-bank-outreach-cover-note.mjs: bank outreach cover note validation test
- tests/hbce-bank-evidence-core-v1-exported-review-bundle-manifest.mjs: exported review bundle manifest validation test
- tests/hbce-bank-evidence-core-v1-review-package-index.mjs: review package index validation test
- tests/hbce-bank-evidence-core-v1-readme-reviewer-index.mjs: README reviewer index validation test
- tests/hbce-bank-evidence-core-v1-derived-reviewer-map.mjs: derived reviewer map validation test
- tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs: bank baseline validation test
- tests/hbce-bank-evidence-core-v1-architecture-bridge.mjs: architecture bridge validation test
- checkpoint files: deterministic continuity evidence

## Validation summary

- Bank recipient matrix validation: this file's companion test
- Bank outreach cover note validation: 22/22 PASS
- Exported review bundle manifest validation: 22/22 PASS
- Review package index validation: 21/21 PASS
- README reviewer index validation: 28/28 PASS
- Derived reviewer map validation: 26/26 PASS
- Architecture bridge validation: 24/24 PASS
- Bank baseline validation: 12/12 PASS

## Hash summary

- Bank outreach cover note SHA-256: 12b0bbabbfcc7f851b80f5e51cb3f22f512689614d3c89f895eeb5b85b26fcd0
- Bank outreach cover note validation test SHA-256: 58c0ea4865c86062e02d5f9822a531f8221291a41333addd3c937bc8afe7edae
- Exported review bundle manifest SHA-256: c497e195c3388ab64cf68c3ce115710aae08692f2a127cc563e9609743299e01
- Exported review bundle manifest validation test SHA-256: 01d747db6e5883d3dc588c48adf2de94853e5447c689fda040d04911594e106e
- Review package index SHA-256: 29cb1892ed4423ae6713b185ff26c0ce27de3ab81ea2fa1e6d37d507a2cd85a3
- Review package index validation test SHA-256: fa6167b5a3ee83aecbebd05851a809be435690ca43aa99cec95b390bff1a1503
- README reviewer index SHA-256: 0a8e35adf793acfde926f97a67db5ba39f771d1798654fa870da785ada9473f1
- README reviewer index validation test SHA-256: eb392bddef6c4499fbef158d2d04ac3a4f463b1ec559e57e28d7a203550eaa21
- Bank baseline SHA-256: 28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13
- Bank baseline validation test SHA-256: 9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2
- Architecture bridge SHA-256: 919dff27bd393e1db256337ef3b151501ed1f3c7a6aa72b91d50143a235c1f45
- Architecture bridge validation test SHA-256: fbf52e6a318bcf5ff038c68a03ea8c057032de22e8c78d6fb1c7b2c22c60b86b
- Derived reviewer map SHA-256: 69f2d542da55c17b4f6f7b7a51cdb340c940bb687863094be4dd0e25288f7827
- Derived reviewer map validation test SHA-256: acb0426cd88e36369f9009482cf4167855b8237cd5b377a3bc95e8707e86a7df
- PR1 checkpoint SHA-256: 7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593
- PR2 checkpoint SHA-256: a2bd4fd9d309c3b0a13c09393bbb783d3170504e74aed476900a82822489ba99
- PR3 checkpoint SHA-256: 77666f791ff7c2e9e3fc7e961025687b345cfdcc7256134b598e5860b1437293
- PR4 checkpoint SHA-256: 7188ae5d2eaefc1c42d66e88bfef4f474402ea6d342d57d1d1b6bd9303e5fd1c
- PR5 checkpoint SHA-256: 421b2b2daa83efaeecc604ee6b195fc663677d8c74f168dfec6b8d825267dad3
- PR6 checkpoint SHA-256: ebd07da476bd506f4aec98b06a63bc560eaa204782590f84477ef4c8ce25c2bd
- PR7 checkpoint SHA-256: e8d106d5fac285098f197119a7615c0e91ea1c7910127dcc8d5f39b772557e10

## Upstream canonical source

The canonical technical evidence source remains hermeticum-bce-platform.

The banking repository is a derived banking review layer.

The banking repository must not be treated as the canonical evidence source.

Upstream canonical platform reference:

- Upstream canonical repository: hermeticum-bce-platform
- Upstream canonical checkpoint commit: b61590f8db86bbcd8f60f52a613065995fa1dc77
- Upstream PR137 checkpoint document SHA-256: c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c

## Boundary

This recipient matrix is read-only.

This recipient matrix is observe-only.

This recipient matrix is non-production.

This recipient matrix is non-authorizing.

This recipient matrix does not mutate protocol behavior.

This recipient matrix does not mutate schema definitions.

This recipient matrix does not create an API endpoint.

This recipient matrix does not create a UI.

This recipient matrix does not create production deployment.

This recipient matrix does not create legal certification.

This recipient matrix does not create regulatory approval.

This recipient matrix does not create banking authorization.

This recipient matrix does not create vendor onboarding approval.

This recipient matrix does not create procurement approval.

This recipient matrix does not create financial transaction approval.

## Repository capability

At this bank-recipient-matrix stage, hermeticum-bce-bank contains:

- protocol references
- schema definitions
- protocol tests
- derived bank baseline
- derived architecture bridge
- derived reviewer map
- README reviewer index
- review package index
- exported review bundle manifest
- bank outreach cover note
- bank recipient matrix

At this bank-recipient-matrix stage, hermeticum-bce-bank does not expose:

- package.json
- app/
- pages/
- src/

Therefore this repository remains a protocol, schema, test and derived evidence repository.

It is not an application scaffold.

## Next step

The next step may be a formal bank review pack index.

That pack may reorganize the recipient matrix into a deliverable structure for bank intake, with sections, annexes, owners and review status.

Until a product scaffold exists, hermeticum-bce-bank remains a controlled derived banking evidence layer.
