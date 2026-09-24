# HBCE Bank — Evidence Core v1 Architecture Bridge

Date: 2026-09-24

Status: derived architecture bridge, non-canonical, non-production, non-authorizing.

Repository: hermeticum-bce-bank

Canonical upstream repository: hermeticum-bce-platform

## Purpose

This document connects the hermeticum-bce-bank repository architecture to the imported HBCE Evidence Core v1 review pack baseline.

It explains how the current repository structure supports a derived banking review surface without becoming the canonical evidence source.

The canonical evidence source remains hermeticum-bce-platform.

## Current bank repository baseline

Current bank checkpoint commit: 685c888aa06c0d744accaca06caead43c7a47b51

Bank PR1 merge commit: d4199d43c41c0fce629f504f860548f196888477

Bank PR1 feature commit: ac974e10078e095803270e4652320e4865fbe9fb

Bank PR1 checkpoint document: MAIN_POST_HBCE_BANK_EVIDENCE_CORE_V1_REVIEW_PACK_BASELINE_CHECKPOINT_2026_09_24.md

Bank PR1 checkpoint SHA-256: 7895ddf388e6240a01e5fb135555265bfa233a778a0b116909071baf0a2ed593

## Imported banking baseline

Baseline document: docs/hbce-bank-evidence-core-v1-review-pack-baseline-2026-09-24.md

Baseline validation test: tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs

Baseline document SHA-256: 28ef2ef9082f73f38426e29ce3bcf03dfd749de7f29433ff56af957933880d13

Baseline validation test SHA-256: 9b7706424cd25e850226e0637e8df4e051ac2a3cbc1803febb4648d8359d42c2

Baseline validation: 12/12 PASS

## Upstream canonical platform reference

Upstream repository: manuelcoletta1-source/hermeticum-bce-platform

Upstream canonical checkpoint commit: b61590f8db86bbcd8f60f52a613065995fa1dc77

Upstream PR137 checkpoint document SHA-256: c3f3ef3799847a68253cbfeb1748a25e65bda9edb04067f2df7f2f2de382436c

The upstream platform remains the source of truth for evidence artifacts, hashes, tests and checkpoints.

The bank repository consumes that upstream evidence as a derived banking product reference.

## Repository structure bridge

The current bank repository contains:

- ARCHITECTURE.md
- protocol/
- schemas/
- tests/
- docs/

The repository does not currently expose:

- package.json
- app/
- pages/
- src/

Therefore this bridge describes a protocol-and-evidence repository, not an application scaffold.

## Architecture role

ARCHITECTURE.md is the repository-level architectural entry point.

This bridge does not replace ARCHITECTURE.md.

This bridge links ARCHITECTURE.md to the imported Evidence Core v1 review pack baseline.

ARCHITECTURE.md should remain the top-level explanation of the bank repository architecture.

This bridge should remain the Evidence Core v1-specific banking review bridge.

## Protocol role

The protocol directory contains reference modules for HBCE authorization, execution, evidence, admission, trust, revocation, mandate and runtime behavior.

Relevant protocol files include:

- protocol/hbce-authorization-evaluator.reference.mjs
- protocol/hbce-authorization-consumption.reference.mjs
- protocol/hbce-verify-authorization.reference.mjs
- protocol/hbce-execution-evidence-registry.reference.mjs
- protocol/hbce-execution-adapter-boundary.reference.mjs
- protocol/hbce-execution-adapter-capability.reference.mjs
- protocol/hbce-execution-adapter-trust.reference.mjs
- protocol/hbce-execution-adapter-authorization-provenance.reference.mjs
- protocol/hbce-admission-signature.reference.mjs
- protocol/hbce-revocation.reference.mjs
- protocol/hbce-mandate-registry.reference.mjs
- protocol/hbce-runtime-registry.reference.mjs

In this banking repository, protocol files support derived banking review by showing how authorization, execution evidence, adapter boundary and provenance concepts can be represented.

They do not create live banking authorization.

They do not create OPC ALLOW.

They do not create production execution.

## Schema role

The schemas directory contains structured model definitions used by the protocol layer.

Relevant schema files include:

- schemas/hbce-authority.schema.json
- schemas/hbce-authorization.schema.json
- schemas/hbce-execution-evidence.schema.json
- schemas/hbce-mandate.schema.json

In this banking repository, schemas support derived banking review by defining expected data structures for authority, authorization, execution evidence and mandate material.

They do not certify legal validity.

They do not qualify eIDAS status.

They do not approve regulated banking activity.

## Test role

The tests directory contains protocol-level and evidence-level validation tests.

Relevant existing tests include:

- tests/hbce-a010-evaluator-version-binding.mjs
- tests/hbce-a011-golden-negative.mjs
- tests/hbce-a014-execution-evidence-model.mjs
- tests/hbce-a015-execution-evidence-registry.mjs
- tests/hbce-a019-execution-adapter-boundary.mjs
- tests/hbce-a020-adapter-authorization-provenance.mjs
- tests/hbce-bank-evidence-core-v1-review-pack-baseline.mjs

In this banking repository, tests provide deterministic checks for protocol behavior and derived baseline integrity.

They do not prove live deployment.

They do not prove regulatory approval.

They do not prove customer-facing production readiness.

## Derived banking review flow

The current derived banking review flow is:

1. hermeticum-bce-platform creates and checkpoints the canonical Evidence Core v1 banking review pack.
2. hermeticum-bce-bank imports the canonical checkpoint as a derived banking baseline.
3. hermeticum-bce-bank records the baseline with a local validation test.
4. This architecture bridge connects the imported baseline to the bank repository structure.
5. Future banking documents or surfaces may reference this bridge while preserving upstream canonical evidence.

## Reviewer interpretation

A reviewer may interpret this bridge as evidence that the bank repository has a structured relationship to the upstream Evidence Core v1 pack.

A reviewer may interpret this bridge as a map between imported evidence, protocol references, schema references and local validation tests.

A reviewer may interpret this bridge as preparation for a future banking review README or product-facing map.

A reviewer must not interpret this bridge as production deployment.

A reviewer must not interpret this bridge as live API availability.

A reviewer must not interpret this bridge as legal certification.

A reviewer must not interpret this bridge as eIDAS qualification.

A reviewer must not interpret this bridge as external review completion.

A reviewer must not interpret this bridge as regulatory approval.

A reviewer must not interpret this bridge as OPC ALLOW creation.

A reviewer must not interpret this bridge as autonomous banking authorization.

A reviewer must not interpret this bridge as live transaction approval.

A reviewer must not interpret this bridge as customer-facing production approval.

A reviewer must not interpret this bridge as financial transaction approval.

## Boundary

This bridge is read-only.

This bridge is observe-only.

This bridge is non-production.

This bridge is non-authorizing.

This bridge does not mutate protocol behavior.

This bridge does not mutate schema definitions.

This bridge does not execute banking activity.

This bridge does not create an API endpoint.

This bridge does not create a UI.

This bridge does not create a product launch.

## Canonical source rule

hermeticum-bce-platform remains the canonical source for Evidence Core v1 artifacts, hashes, tests and checkpoints.

hermeticum-bce-bank may consume the platform checkpoint as a derived banking layer.

hermeticum-bce-bank must preserve upstream commit identifiers, upstream artifact paths, upstream hashes and upstream validation counts.

hermeticum-bce-bank must not become a competing canonical evidence source.

## Next banking step

The next banking step should be a derived banking README or reviewer map.

That document should present the review pack to banking, compliance, audit, security, innovation and procurement readers.

A later product surface may be added only after an explicit application scaffold exists.

Until then, this repository remains a protocol, schema, test and derived evidence repository.
