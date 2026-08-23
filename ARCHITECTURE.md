# HBCE BANK EDITION 1.0 — SYSTEM ARCHITECTURE

Repository: `manuelcoletta1-source/hermeticum-bce-bank`

Status: `IN DEVELOPMENT`

Release Gate: 19 January 2027

Commercial Entry: 20 January 2027

## 0. Purpose

HBCE Bank Edition is a banking vertical of the HBCE Platform.

It does not replace the HBCE core evidence architecture.

It extends the existing identity, event, proof, registry and verification foundations with a banking-oriented control plane.

Its central operational question is:

WHO AUTHORIZED THIS MACHINE TO ACT?

The architectural transition is:

HBCE PLATFORM
= prove what happened

HBCE BANK EDITION
= prove why it was authorized to happen

Capabilities described as designed are not to be interpreted as implemented.

## 1. Canonical separation

HBCE Bank Edition separates four planes:

IDENTITY PLANE
CONTROL PLANE
EXECUTION PLANE
EVIDENCE PLANE

Canonical invariants:

IDENTITY != AUTHORITY

AUTHORITY != AUTHORIZATION

DECISION != AUTHORIZATION

CAPABILITY != AUTHORITY

AUTHORIZATION != EXECUTION

RUNTIME IDENTITY != RUNTIME AUTHORITY

TRACE != TRUTH

EVIDENCE OF INTEGRITY != EVIDENCE OF LEGAL VALIDITY

## 2. Identity Plane

The Identity Plane answers:

WHO OR WHAT IS THIS?

Primary components include:

- IPR Registry
- subject identity references
- organization references
- human operator references
- runtime identity references
- machine identity references

IPR provides operational identity and continuity references.

IPR does not by itself create authority, mandate, authorization, legal power, banking approval or execution permission.

Canonical rule:

IPR != AUTHORITY

Current state:

IPR FOUNDATION = REUSABLE FROM HBCE PLATFORM

BANK-SPECIFIC IDENTITY CONTROL = DESIGNED / NOT IMPLEMENTED

## 3. Control Plane

The Control Plane answers:

WHO MAY DO WHAT,
FOR WHOM,
UNDER WHICH MANDATE,
WITH WHICH LIMITS,
DURING WHICH TIME WINDOW,
USING WHICH RUNTIME,
UNDER WHICH POLICY?

The control chain is:

FUNCTION
→ MANDATE
→ AUTHORITY
→ PROPOSAL
→ DECISION
→ AUTHORIZATION
→ RUNTIME BINDING
→ EXECUTION PERMISSION

Primary components:

- Mandate Registry
- Authority Engine
- Authorization Engine
- Runtime Registry
- Policy Engine
- Revocation Engine

Current state:

MANDATE REGISTRY = DESIGNED / NOT IMPLEMENTED

AUTHORITY ENGINE = DESIGNED / NOT IMPLEMENTED

AUTHORIZATION ENGINE = DESIGNED / NOT IMPLEMENTED

RUNTIME REGISTRY = DESIGNED / NOT IMPLEMENTED

POLICY ENGINE = DESIGNED / NOT IMPLEMENTED

REVOCATION ENGINE = DESIGNED / NOT IMPLEMENTED

## 4. Mandate

A Mandate defines the bounded delegation under which authority may exist.

Minimum conceptual structure:

mandate_id
grantor
grantee
function
scope
allowed_actions
limits
valid_from
valid_until
policy_reference
runtime_constraints
revocation_state
evidence_reference
audit_reference

A Mandate may constrain:

- amount
- currency
- beneficiary
- account
- transaction type
- geographic scope
- business function
- runtime
- software version
- model
- time window
- number of operations
- approval threshold
- human review requirement

Canonical rule:

MANDATE != AUTHORIZATION

A valid mandate creates the boundary within which authority may be evaluated.

It does not automatically authorize an individual action.

Current state:

MANDATE MODEL = DESIGNED / NOT IMPLEMENTED

## 5. Authority

Authority represents bounded operational power derived from identity, function and mandate.

Conceptual chain:

SUBJECT
→ FUNCTION
→ MANDATE
→ GRANTED AUTHORITY
→ SCOPE
→ LIMITS
→ TEMPORAL VALIDITY

Canonical rules:

IDENTITY != AUTHORITY

AUTHENTICATION != AUTHORITY

CAPABILITY != AUTHORITY

ROLE LABEL != AUTHORITY

Current state:

AUTHORITY MODEL = DESIGNED / NOT IMPLEMENTED

AUTHORITY ENGINE = DESIGNED / NOT IMPLEMENTED

## 6. Authorization

Authorization evaluates a specific proposed action against the applicable authority state.

Evaluator input:

REQUEST
+
SUBJECT
+
FUNCTION
+
MANDATE
+
AUTHORITY
+
RUNTIME
+
POLICY
+
CURRENT STATE

Expected result:

ALLOW

DENY

ESCALATE

Authorization must fail closed.

Canonical rules:

DECISION != AUTHORIZATION

AUTHORIZATION != EXECUTION

POLICY PASS != AUTHORIZATION

HUMAN VALIDATION != AUTHORIZATION

IPR ACTIVE != AUTHORIZATION

Current state:

AUTHORIZATION MODEL = DESIGNED / NOT IMPLEMENTED

AUTHORIZATION ENGINE = DESIGNED / NOT IMPLEMENTED

## 7. Execution Plane

The Execution Plane performs an operation only after authorization succeeds.

Possible runtimes include:

- JOKER-C2
- BANK-AGENT
- OPENAI-AGENT
- MICROSOFT-AGENT
- PROPRIETARY-AI
- DETERMINISTIC-SOFTWARE
- HUMAN-OPERATED-SOFTWARE
- EXTERNAL-BANK-RUNTIME

JOKER-C2 is one governed runtime.

It is not the HBCE Control Plane.

Canonical rule:

JOKER-C2 != HBCE

The execution runtime must not be able to expand its own authority.

Current state:

RUNTIME-NEUTRAL EXECUTION MODEL = DESIGNED / NOT IMPLEMENTED

## 8. Runtime Registry

The Runtime Registry identifies governed software, AI agents, deterministic services or machines.

Minimum conceptual record:

runtime_id
runtime_type
provider
model_or_software_reference
version
trust_state
allowed_scopes
authorized_mandates
status
valid_from
valid_until
revoked_at
attestation_reference
evidence_reference

Runtime identity must be bound to authorization.

Runtime substitution must fail closed.

Example:

AUTHORIZED_RUNTIME = A27

EXECUTING_RUNTIME = A28

RESULT = DENY

Current state:

RUNTIME REGISTRY = DESIGNED / NOT IMPLEMENTED

## 9. Revocation

Revocation is a first-class control-plane operation.

Revocation may apply to:

- mandate
- authority
- authorization
- runtime
- delegated authority
- policy
- credential
- operator
- bank profile

Canonical rule:

REVOKED = NOT AUTHORIZED

Current state:

REVOCATION ENGINE = DESIGNED / NOT IMPLEMENTED

## 10. Policy Engine

Policy representation and policy enforcement are separate concepts.

Bank Edition must not treat static policy metadata as executable authorization.

Conceptual evaluation:

REQUEST
+
SUBJECT
+
MANDATE
+
AUTHORITY
+
RUNTIME
+
BANK POLICY
+
CURRENT STATE
→
ALLOW / DENY / ESCALATE

Policy evaluation must fail closed.

Policy versions must be attributable.

Current state:

POLICY REPRESENTATION = PARTIAL

POLICY ENGINE = DESIGNED / NOT IMPLEMENTED

## 11. Evidence Plane

The Evidence Plane answers:

WHAT HAPPENED?

WHAT WAS RECORDED?

CAN THE RECORD BE RECONSTRUCTED?

HAS THE EVIDENCE CHAIN BEEN ALTERED?

Reusable HBCE Platform foundations:

- EVT
- OPC
- Registry
- Verify
- evidence receipts
- canonicalization
- hashing
- pointer-chain verification
- signature verification
- append-only principles

Bank Edition preserves these components.

Bank Edition extends them with authority and authorization evidence.

Evidence integrity does not itself establish authority.

Canonical rules:

TRACE != TRUTH

EVIDENCE OF INTEGRITY != EVIDENCE OF AUTHORIZATION

## 12. EVT

EVT records operational events.

Bank Edition will extend EVT only after Mandate, Authority, Authorization, Runtime and Revocation concepts are canonically defined.

Future Bank Edition EVT events may include:

MANDATE_CREATED
MANDATE_ACTIVATED
MANDATE_EXPIRED
MANDATE_REVOKED

AUTHORITY_GRANTED
AUTHORITY_RESTRICTED
AUTHORITY_REVOKED

AUTHORIZATION_REQUESTED
AUTHORIZATION_ALLOWED
AUTHORIZATION_DENIED
AUTHORIZATION_ESCALATED
AUTHORIZATION_EXPIRED
AUTHORIZATION_REVOKED

RUNTIME_REGISTERED
RUNTIME_BOUND
RUNTIME_REJECTED
RUNTIME_REVOKED

EXECUTION_STARTED
EXECUTION_COMPLETED
EXECUTION_FAILED

POLICY_EVALUATED
REVOCATION_ENFORCED

Current state:

EVT FOUNDATION = PARTIAL / REUSABLE

BANK AUTHORITY EVT EXTENSION = DESIGNED / NOT IMPLEMENTED

## 13. UNEBDO

UNEBDO is treated as an external HBCE operational component.

External repository existence does not prove Bank Edition integration.

Canonical rule:

EXTERNAL COMPONENT EXISTS != PLATFORM INTEGRATION EXISTS

Current state:

UNEBDO BANK INTEGRATION = DESIGNED / NOT IMPLEMENTED

## 14. OPC

OPC remains an evidence and integrity layer.

Future Bank Edition OPC receipts may reference:

mandate_id
authority_id
authorization_id
runtime_id
policy_version
revocation_state
execution_reference

OPC does not itself create authority or authorization.

Canonical rule:

OPC PROOF != AUTHORIZATION

Current state:

OPC FOUNDATION = PARTIAL / REUSABLE

BANK AUTHORITY RECEIPT EXTENSION = DESIGNED / NOT IMPLEMENTED

## 15. Verify

Existing HBCE verification primarily verifies integrity, provenance and evidence continuity.

Existing verification asks:

DID THIS RECORD CHAIN VERIFY?

Bank Edition must additionally answer:

WAS THIS MACHINE AUTHORIZED TO PERFORM THIS ACTION?

Future Bank Edition verification must evaluate:

- identity reference
- mandate validity
- authority validity
- authorization validity
- runtime binding
- policy version
- revocation state
- temporal validity
- execution reference
- EVT integrity
- OPC integrity
- evidence-chain integrity

Current state:

VERIFY FOUNDATION = PARTIAL / REUSABLE

AUTHORIZATION VERIFY = DESIGNED / NOT IMPLEMENTED

## 16. Privacy Architecture

Bank Edition preserves the HBCE principle:

PROOF != RAW DATA

Public or immutable proof layers must minimize sensitive information.

They must not contain raw:

- identity documents
- document numbers
- credentials
- private keys
- bank customer records
- account payloads
- KYC documents
- AML case files
- biometric material
- confidential prompts
- confidential AI outputs
- transaction payloads unless explicitly approved for a controlled storage layer

Immutable integrity records should prefer:

- references
- hashes
- identifiers
- minimized metadata
- policy versions
- state transitions

Sensitive evidence belongs in controlled private storage.

Canonical rule:

MINIMIZED PROOF != RAW CUSTOMER DATA

## 17. Persistence

Git-based artifacts may be used for:

- public R&D registries
- specifications
- schemas
- evidence examples
- append-only research demonstrations

Git is not the authoritative transactional banking database.

Bank Edition will require separate application persistence for:

- transactions
- tenancy
- atomic authorization
- revocation consistency
- concurrency
- backup
- recovery
- access control
- audit retention

Current state:

BANK APPLICATION DATABASE = DESIGNED / NOT IMPLEMENTED

## 18. Recovery

Evidence-chain reconstruction and operational-state recovery are different.

Canonical rule:

REBUILD HASH != RECOVER OPERATIONAL STATE

Bank Edition recovery must eventually address:

- database restore
- point-in-time recovery
- revocation-safe recovery
- authorization-state reconstruction
- rollback protection
- evidence consistency after recovery

Current state:

BANK RECOVERY = DESIGNED / NOT IMPLEMENTED

## 19. Security Requirements

Mandatory threat classes include:

identity substitution
runtime substitution
authority escalation
authorization bypass
delegation escalation
mandate tampering
revocation bypass
replay
timestamp manipulation
rollback
event deletion
model substitution
insider misuse
evidence manipulation
policy substitution
cross-tenant authorization

Existing evidence verification may cover portions of:

- hash alteration
- event rewriting
- pointer-chain alteration
- invalid signatures

Authorization security remains under development.

No security capability may be marked IMPLEMENTED without executable evidence.

## 20. Bank Profile

Bank Profile represents bank-specific governance configuration.

Potential profile fields include:

bank_id
jurisdiction
tenant_id
policy_set
risk_limits
approval_rules
runtime_allowlist
currency_rules
transaction_rules
human_review_thresholds
revocation_policy
audit_policy
retention_policy

Current state:

BANK PROFILE = DESIGNED / NOT IMPLEMENTED

## 21. Banking API Target

Target API domains may include:

/ipr
/subjects
/runtimes
/mandates
/authority
/authorizations
/revocations
/policies
/events
/opcs
/verify
/audit
/matrix
/bank/profiles

This document does not claim that these endpoints currently exist.

Current state:

BANKING API SURFACE = DESIGNED / NOT IMPLEMENTED

## 22. Responsibility Graph

Bank Edition must eventually reconstruct:

WHO
→ ACTED UNDER WHICH FUNCTION
→ UNDER WHICH MANDATE
→ WITH WHICH AUTHORITY
→ WHO DECIDED
→ WHO AUTHORIZED
→ WHICH RUNTIME EXECUTED
→ WHAT HAPPENED
→ WHICH EVIDENCE PROVES THE CHAIN

This graph supports audit reconstruction.

It does not automatically determine legal liability.

Current state:

RESPONSIBILITY GRAPH = DESIGNED / NOT IMPLEMENTED

## 23. Relationship with HBCE Platform

HBCE Bank Edition is a vertical of HBCE Platform.

Canonical model:

HBCE CORE STANDARD
+
BANK-SPECIFIC AUTHORITY MODEL
+
BANK-SPECIFIC POLICY
+
BANK-SPECIFIC WORKFLOWS
=
HBCE BANK EDITION

Canonical rules:

BANK EDITION != NEW HBCE CORE

JOKER-C2 != CONTROL PLANE

CORE STANDARD + LOCAL AUTHORITY MODEL = BANK EDITION

Reusable foundations may be synchronized from the canonical Platform only through explicit versioned integration.

No silent duplication of core definitions is allowed.

## 24. Golden Banking Flow

Initial bounded scenario:

MANDATE

max_amount = 10000 EUR

validity = 24 hours

beneficiary = WHITELIST_ONLY

runtime = A27

Required behavior:

VALID REQUEST
→ ALLOW

AMOUNT ABOVE LIMIT
→ DENY

RUNTIME SUBSTITUTION
→ DENY

EXPIRED MANDATE
→ DENY

REVOKED MANDATE
→ DENY

REPLAYED SINGLE-USE AUTHORIZATION
→ DENY

Current state:

GOLDEN BANKING FLOW = DESIGNED / NOT IMPLEMENTED

## 25. Implementation Status

ARCHITECTURE = DEFINED

MANDATE SCHEMA = NOT IMPLEMENTED

MANDATE REGISTRY = NOT IMPLEMENTED

AUTHORITY MODEL = NOT IMPLEMENTED

AUTHORITY ENGINE = NOT IMPLEMENTED

AUTHORIZATION MODEL = NOT IMPLEMENTED

AUTHORIZATION ENGINE = NOT IMPLEMENTED

RUNTIME REGISTRY = NOT IMPLEMENTED

REVOCATION ENGINE = NOT IMPLEMENTED

POLICY ENGINE = NOT IMPLEMENTED

BANK EVT EXTENSION = NOT IMPLEMENTED

UNEBDO INTEGRATION = NOT IMPLEMENTED

BANK OPC EXTENSION = NOT IMPLEMENTED

AUTHORIZATION VERIFY = NOT IMPLEMENTED

BANK APPLICATION DATABASE = NOT IMPLEMENTED

BANK API = NOT IMPLEMENTED

BANK DASHBOARD = NOT IMPLEMENTED

BANK RECOVERY = NOT IMPLEMENTED

AUTOMATED BANK SECURITY TESTS = NOT IMPLEMENTED

CI RELEASE GATE = NOT IMPLEMENTED

No architectural description changes these states by itself.

## 26. P0 Implementation Order

A001 ARCHITECTURE BASELINE

A002 MANDATE SCHEMA

A003 MANDATE REGISTRY

A004 AUTHORITY MODEL

A005 AUTHORIZATION MODEL

A006 RUNTIME REGISTRY

A007 REVOCATION

A008 FAIL-CLOSED AUTHORIZATION EVALUATOR

A009 EVT INTEGRATION

A010 VERIFY AUTHORIZATION

A011 GOLDEN NEGATIVE TESTS

EVT must not be modified before the control-plane concepts it records are defined.

## 27. Regulatory and Legal Non-Claims

HBCE Bank Edition is currently an R&D system.

This repository does not claim:

- banking license
- regulated financial institution status
- legal authorization to execute banking operations
- production readiness
- regulatory approval
- GDPR compliance certification
- DORA compliance certification
- NIS2 compliance certification
- AI Act compliance certification
- eIDAS qualification
- regulated KYC provider status
- regulated AML provider status
- cybersecurity certification
- external audit certification
- legal evidentiary status by itself
- public authority approval
- bank deployment
- customer deployment

Any real banking deployment requires independent:

- legal review
- cybersecurity review
- privacy review
- banking compliance review
- operational-risk review
- vendor-risk review
- model-risk review where applicable
- institutional authorization

## 28. Architectural Invariant

The Bank Edition exists to make the following chain explicitly reconstructible:

IDENTITY
→ FUNCTION
→ MANDATE
→ AUTHORITY
→ DECISION
→ AUTHORIZATION
→ RUNTIME
→ EXECUTION
→ OUTCOME
→ EVIDENCE
→ AUDIT

The central invariant remains:

WHO AUTHORIZED THIS MACHINE TO ACT?

Until that question can be answered through executable, verifiable repository evidence:

HBCE BANK EDITION = IN DEVELOPMENT
