import {
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  registerSubject
} from "../protocol/hbce-subject-registry.reference.mjs";

import {
  registerEntitlementSource,
  revokeEntitlementSource,
  supersedeEntitlementSource,
  resolveEntitlementSource,
  verifyEntitlementSourceRegistry
} from "../protocol/hbce-entitlement-source-registry.reference.mjs";

import {
  verifyEntitlementSource
} from "../protocol/hbce-entitlement-verification.reference.mjs";


function fail(code) {
  throw new Error(code);
}


function expectThrow(
  marker,
  fn,
  expected
) {
  let thrown =
    null;

  try {
    fn();
  } catch (error) {
    thrown =
      error;
  }

  if (!thrown) {
    fail(
      `${marker}:NOT_THROWN`
    );
  }

  if (
    !String(
      thrown.message
    ).includes(expected)
  ) {
    fail(
      `${marker}:UNEXPECTED:${thrown.message}`
    );
  }

  console.log(
    `${marker}=PASS`
  );
}


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-r1-1-w2a-"
    )
  );

const subjects =
  join(
    root,
    "subjects.jsonl"
  );

const entitlements =
  join(
    root,
    "entitlements.jsonl"
  );


const human = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-HUMAN-W2A",

  subject_class:
    "HUMAN",

  contextual_id:
    "CTX-HUMAN-W2A",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T09:00:00Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-W2A-HUMAN"
  ]
};


const ai = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-AI-W2A",

  subject_class:
    "AI_AGENT",

  contextual_id:
    "CTX-AI-W2A",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T09:00:01Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-W2A-AI"
  ]
};


registerSubject({
  registryPath:
    subjects,

  subject:
    human,

  recordedAt:
    "2026-08-25T09:01:00Z"
});


registerSubject({
  registryPath:
    subjects,

  subject:
    ai,

  recordedAt:
    "2026-08-25T09:01:01Z"
});


const accountHolder = {
  entitlement_ref:
    "ENT-ACCOUNT-HOLDER-W2A",

  source_type:
    "ACCOUNT_HOLDER_ENTITLEMENT",

  source_ref:
    "SOURCE-ACCOUNT-HOLDER-W2A",

  issuer_or_origin:
    "BANK-SOURCE-DEMO",

  subject_ref:
    human.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:30:00Z",

  effective_until:
    "2026-08-26T09:30:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1",

  technical_status:
    "UNRESOLVED",

  evidence_refs: [
    "EVIDENCE-ACCOUNT-HOLDER-W2A"
  ]
};


const expired = {
  entitlement_ref:
    "ENT-EXPIRED-W2A",

  source_type:
    "AGENT_ENTITLEMENT",

  source_ref:
    "SOURCE-EXPIRED-W2A",

  issuer_or_origin:
    "DEMO-ORIGIN",

  subject_ref:
    ai.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:00:00Z",

  effective_until:
    "2026-08-25T10:15:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1",

  technical_status:
    "UNRESOLVED",

  evidence_refs: [
    "EVIDENCE-EXPIRED-W2A"
  ]
};


const unsupported = {
  entitlement_ref:
    "ENT-UNSUPPORTED-W2A",

  source_type:
    "ACCOUNT_HOLDER_ENTITLEMENT",

  source_ref:
    "SOURCE-UNSUPPORTED-W2A",

  issuer_or_origin:
    "DEMO-ORIGIN",

  subject_ref:
    human.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:00:00Z",

  effective_until:
    "2026-08-26T09:00:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "UNSUPPORTED_METHOD",

  technical_status:
    "UNRESOLVED",

  evidence_refs: [
    "EVIDENCE-UNSUPPORTED-W2A"
  ]
};


const noEvidence = {
  entitlement_ref:
    "ENT-NO-EVIDENCE-W2A",

  source_type:
    "ACCOUNT_HOLDER_ENTITLEMENT",

  source_ref:
    "SOURCE-NO-EVIDENCE-W2A",

  issuer_or_origin:
    "DEMO-ORIGIN",

  subject_ref:
    human.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:00:00Z",

  effective_until:
    "2026-08-26T09:00:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1",

  technical_status:
    "UNRESOLVED",

  evidence_refs: []
};


const oldSource = {
  entitlement_ref:
    "ENT-OLD-W2A",

  source_type:
    "ACCOUNT_HOLDER_ENTITLEMENT",

  source_ref:
    "SOURCE-OLD-W2A",

  issuer_or_origin:
    "DEMO-ORIGIN",

  subject_ref:
    human.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:00:00Z",

  effective_until:
    "2026-08-27T09:00:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1",

  technical_status:
    "UNRESOLVED",

  evidence_refs: [
    "EVIDENCE-OLD-W2A"
  ]
};


const replacement = {
  entitlement_ref:
    "ENT-REPLACEMENT-W2A",

  source_type:
    "ACCOUNT_HOLDER_ENTITLEMENT",

  source_ref:
    "SOURCE-REPLACEMENT-W2A",

  issuer_or_origin:
    "DEMO-ORIGIN",

  subject_ref:
    human.subject_ref,

  jurisdiction:
    "EU",

  effective_from:
    "2026-08-25T09:00:00Z",

  effective_until:
    "2026-08-28T09:00:00Z",

  superseded_by:
    null,

  revocation_state:
    "ACTIVE",

  verification_method:
    "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1",

  technical_status:
    "UNRESOLVED",

  evidence_refs: [
    "EVIDENCE-REPLACEMENT-W2A"
  ]
};


const registrations = [
  [accountHolder, "2026-08-25T10:00:00Z", "ENT-EVENT-001"],
  [expired, "2026-08-25T10:00:01Z", "ENT-EVENT-002"],
  [unsupported, "2026-08-25T10:00:02Z", "ENT-EVENT-003"],
  [noEvidence, "2026-08-25T10:00:03Z", "ENT-EVENT-004"],
  [oldSource, "2026-08-25T10:00:04Z", "ENT-EVENT-005"],
  [replacement, "2026-08-25T10:00:05Z", "ENT-EVENT-006"]
];


for (
  const [
    entitlement,
    recordedAt,
    eventId
  ] of registrations
) {
  registerEntitlementSource({
    registryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlement,

    recordedAt,

    eventId
  });
}


console.log(
  "R1_1_W2A_ENTITLEMENT_REGISTRATION=PASS"
);


/*
 * Registration must not accept a client
 * self-declaring TECHNICALLY_VERIFIED.
 */

expectThrow(
  "R1_1_W2A_SELF_VERIFIED_REGISTRATION_DENIED",

  () =>
    registerEntitlementSource({
      registryPath:
        entitlements,

      subjectRegistryPath:
        subjects,

      entitlement: {
        ...accountHolder,

        entitlement_ref:
          "ENT-SELF-VERIFIED-W2A",

        technical_status:
          "TECHNICALLY_VERIFIED"
      },

      recordedAt:
        "2026-08-25T10:00:06Z",

      eventId:
        "ENT-EVENT-SELF-VERIFIED"
    }),

  "ENTITLEMENT_INITIAL_STATUS_MUST_BE_UNRESOLVED"
);


/*
 * Unknown subject.
 */

expectThrow(
  "R1_1_W2A_UNKNOWN_SUBJECT_DENIED",

  () =>
    registerEntitlementSource({
      registryPath:
        entitlements,

      subjectRegistryPath:
        subjects,

      entitlement: {
        ...accountHolder,

        entitlement_ref:
          "ENT-UNKNOWN-SUBJECT-W2A",

        subject_ref:
          "SUB-UNKNOWN-W2A"
      },

      recordedAt:
        "2026-08-25T10:00:06Z",

      eventId:
        "ENT-EVENT-UNKNOWN-SUBJECT"
    }),

  "ENTITLEMENT_UNKNOWN_SUBJECT"
);


/*
 * Before registry observation.
 */

const beforeObservation =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      accountHolder.entitlement_ref,

    evaluatedAt:
      "2026-08-25T09:59:59Z"
  });


if (
  beforeObservation.status !==
    "UNRESOLVED" ||
  beforeObservation.reason_code !==
    "ENTITLEMENT_NOT_FOUND_OR_NOT_YET_OBSERVED"
) {
  fail(
    "R1_1_W2A_OBSERVATION_TIME_INVALID"
  );
}


console.log(
  "R1_1_W2A_ENTITLEMENT_MUST_BE_OBSERVED=PASS"
);


/*
 * Positive technical verification.
 */

const positive =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      accountHolder.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:10:00Z"
  });


if (
  positive.status !==
    "TECHNICALLY_VERIFIED" ||
  positive.reason_code !==
    "ENTITLEMENT_REGISTERED_EVIDENCE_PROFILE_VERIFIED"
) {
  fail(
    "R1_1_W2A_POSITIVE_VERIFICATION_INVALID"
  );
}


console.log(
  "R1_1_W2A_TECHNICALLY_VERIFIED=PASS"
);


/*
 * No semantic escalation.
 */

for (const key of [
  "api_record_is_source_of_power",
  "external_source_authenticity_proven",
  "legal_entitlement_proven",
  "legal_interpretation_proven",
  "authority_derived",
  "authorization_created",
  "account_holder_fact_proven",
  "regulatory_compliance_proven",
  "trusted_external_time"
]) {
  if (
    positive.limitations[key] !==
      false
  ) {
    fail(
      `R1_1_W2A_SEMANTIC_OVERCLAIM:${key}`
    );
  }
}


console.log(
  "R1_1_W2A_API_RECORD_NOT_SOURCE_OF_POWER=PASS"
);

console.log(
  "R1_1_W2A_NO_LEGAL_ENTITLEMENT_CLAIM=PASS"
);

console.log(
  "R1_1_W2A_NO_AUTHORITY_DERIVATION_CLAIM=PASS"
);


/*
 * Unsupported profile.
 */

const unsupportedResult =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      unsupported.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:10:00Z"
  });


if (
  unsupportedResult.status !==
    "UNRESOLVED" ||
  unsupportedResult.reason_code !==
    "ENTITLEMENT_VERIFICATION_METHOD_UNSUPPORTED"
) {
  fail(
    "R1_1_W2A_UNSUPPORTED_METHOD_INVALID"
  );
}


console.log(
  "R1_1_W2A_UNSUPPORTED_METHOD_UNRESOLVED=PASS"
);


/*
 * Missing evidence.
 */

const insufficient =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      noEvidence.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:10:00Z"
  });


if (
  insufficient.status !==
    "INSUFFICIENT_EVIDENCE"
) {
  fail(
    "R1_1_W2A_MISSING_EVIDENCE_INVALID"
  );
}


console.log(
  "R1_1_W2A_MISSING_EVIDENCE_INSUFFICIENT=PASS"
);


/*
 * Expiry.
 */

const expiredResult =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      expired.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:15:01Z"
  });


if (
  expiredResult.status !==
    "EXPIRED"
) {
  fail(
    "R1_1_W2A_EXPIRY_INVALID"
  );
}


console.log(
  "R1_1_W2A_EXPIRED_ENTITLEMENT=PASS"
);


/*
 * Supersession.
 */

supersedeEntitlementSource({
  registryPath:
    entitlements,

  entitlementRef:
    oldSource.entitlement_ref,

  replacementEntitlementRef:
    replacement.entitlement_ref,

  supersededAt:
    "2026-08-25T10:30:00Z",

  recordedAt:
    "2026-08-25T10:31:00Z",

  eventId:
    "ENT-EVENT-007",

  reasonCode:
    "SOURCE_REPLACED",

  evidenceRefs: [
    "EVIDENCE-SUPERSESSION-W2A"
  ]
});


const superseded =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      oldSource.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:31:00Z"
  });


if (
  superseded.status !==
    "SUPERSEDED"
) {
  fail(
    "R1_1_W2A_SUPERSESSION_INVALID"
  );
}


const replacementResult =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      replacement.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:31:00Z"
  });


if (
  replacementResult.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W2A_REPLACEMENT_NOT_VERIFIED"
  );
}


console.log(
  "R1_1_W2A_SUPERSESSION=PASS"
);

console.log(
  "R1_1_W2A_REPLACEMENT_SOURCE_ACTIVE=PASS"
);


/*
 * Revocation with dual-time semantics.
 */

revokeEntitlementSource({
  registryPath:
    entitlements,

  entitlementRef:
    accountHolder.entitlement_ref,

  revokedAt:
    "2026-08-25T11:00:00Z",

  recordedAt:
    "2026-08-25T11:01:00Z",

  eventId:
    "ENT-EVENT-008",

  reasonCode:
    "SOURCE_WITHDRAWN",

  evidenceRefs: [
    "EVIDENCE-REVOCATION-W2A"
  ]
});


const beforeRevocation =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      accountHolder.entitlement_ref,

    evaluatedAt:
      "2026-08-25T10:59:59Z"
  });


if (
  beforeRevocation.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W2A_REVOCATION_REWROTE_HISTORY"
  );
}


const effectiveNotObserved =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      accountHolder.entitlement_ref,

    evaluatedAt:
      "2026-08-25T11:00:30Z"
  });


if (
  effectiveNotObserved.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W2A_UNOBSERVED_REVOCATION_REWROTE_HISTORY"
  );
}


const revoked =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      accountHolder.entitlement_ref,

    evaluatedAt:
      "2026-08-25T11:01:00Z"
  });


if (
  revoked.status !==
    "REVOKED"
) {
  fail(
    "R1_1_W2A_REVOCATION_INVALID"
  );
}


console.log(
  "R1_1_W2A_LATER_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
);

console.log(
  "R1_1_W2A_EFFECTIVE_BUT_UNOBSERVED_REVOCATION_PRESERVES_HISTORY=PASS"
);

console.log(
  "R1_1_W2A_REVOKED_ENTITLEMENT_DENIED=PASS"
);


/*
 * Terminal replay.
 */

expectThrow(
  "R1_1_W2A_TERMINAL_REPLAY_DENIED",

  () =>
    revokeEntitlementSource({
      registryPath:
        entitlements,

      entitlementRef:
        accountHolder.entitlement_ref,

      revokedAt:
        "2026-08-25T11:02:00Z",

      recordedAt:
        "2026-08-25T11:03:00Z",

      eventId:
        "ENT-EVENT-009",

      reasonCode:
        "SECOND_REVOCATION"
    }),

  "ENTITLEMENT_ALREADY_TERMINAL"
);


/*
 * Historical registry resolution.
 */

const historical =
  resolveEntitlementSource({
    registryPath:
      entitlements,

    entitlementRef:
      accountHolder.entitlement_ref,

    asOf:
      "2026-08-25T10:45:00Z"
  });


if (
  historical.revocation_state !==
    "ACTIVE" ||
  historical.within_effective_window !==
    true
) {
  fail(
    "R1_1_W2A_HISTORICAL_RESOLUTION_INVALID"
  );
}


console.log(
  "R1_1_W2A_HISTORICAL_RESOLUTION=PASS"
);


/*
 * Registry verification.
 */

const registryVerification =
  verifyEntitlementSourceRegistry({
    registryPath:
      entitlements
  });


if (
  registryVerification.valid !==
    true ||
  registryVerification.record_count !==
    8 ||
  registryVerification
    .registration_is_verification !==
      false ||
  registryVerification
    .api_record_is_source_of_power !==
      false
) {
  fail(
    "R1_1_W2A_REGISTRY_VERIFY_INVALID"
  );
}


console.log(
  "R1_1_W2A_REGISTRY_VERIFY=PASS"
);


/*
 * Unknown entitlement.
 */

const unknown =
  verifyEntitlementSource({
    entitlementRegistryPath:
      entitlements,

    subjectRegistryPath:
      subjects,

    entitlementRef:
      "ENT-UNKNOWN-W2A",

    evaluatedAt:
      "2026-08-25T10:30:00Z"
  });


if (
  unknown.status !==
    "UNRESOLVED"
) {
  fail(
    "R1_1_W2A_UNKNOWN_ENTITLEMENT_INVALID"
  );
}


console.log(
  "R1_1_W2A_UNKNOWN_ENTITLEMENT_UNRESOLVED=PASS"
);


/*
 * Tamper.
 */

const original =
  readFileSync(
    entitlements,
    "utf8"
  );


writeFileSync(
  entitlements,

  original.replace(
    '"issuer_or_origin":"BANK-SOURCE-DEMO"',
    '"issuer_or_origin":"TAMPERED-ORIGIN"'
  ),

  "utf8"
);


expectThrow(
  "R1_1_W2A_TAMPER_DETECTED",

  () =>
    verifyEntitlementSourceRegistry({
      registryPath:
        entitlements
    }),

  "ENTITLEMENT_HASH_MISMATCH"
);


writeFileSync(
  entitlements,
  original,
  "utf8"
);


/*
 * Missing registry fails closed.
 */

expectThrow(
  "R1_1_W2A_MISSING_REGISTRY_FAIL_CLOSED",

  () =>
    verifyEntitlementSourceRegistry({
      registryPath:
        join(
          root,
          "missing-entitlements.jsonl"
        )
    }),

  "ENTITLEMENT_REGISTRY_UNAVAILABLE"
);


console.log("");
console.log(
  "===== R1.1 WAVE 2A FINAL MATRIX ====="
);

console.log(
  "ENTITLEMENT_SOURCE_SCHEMA=IMPLEMENTED"
);

console.log(
  "ENTITLEMENT_SOURCE_REGISTRY=IMPLEMENTED"
);

console.log(
  "ENTITLEMENT_SOURCE_VERIFY=IMPLEMENTED"
);

console.log(
  "REGISTER!=VERIFY"
);

console.log(
  "API_RECORD!=SOURCE_OF_POWER"
);

console.log(
  "TECHNICALLY_VERIFIED!=LEGAL_ENTITLEMENT"
);

console.log(
  "ENTITLEMENT_SOURCE!=AUTHORITY"
);

console.log(
  "REVOCATION_DUAL_TIME=IMPLEMENTED"
);

console.log(
  "SUPERSESSION=IMPLEMENTED"
);

console.log(
  "EXTERNAL_SOURCE_AUTHENTICITY=NOT_PROVEN"
);

console.log(
  "LEGAL_INTERPRETATION=NOT_PROVEN"
);

console.log(
  "AUTHORITY_DERIVED=FALSE"
);

console.log(
  "ACCOUNT_HOLDER_FACT_PROVEN=FALSE"
);

console.log(
  "TRUSTED_EXTERNAL_TIME=NO"
);

console.log(
  "R1_1_W2A_ENTITLEMENT_SOURCE=PASS"
);
