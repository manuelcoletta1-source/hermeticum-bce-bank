import {
  mkdtempSync
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
  registerSubjectBinding,
  revokeSubjectBinding
} from "../protocol/hbce-subject-binding-registry.reference.mjs";

import {
  verifySubjectClaims
} from "../protocol/hbce-subject-verification.reference.mjs";


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
    ).includes(
      expected
    )
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
      "hbce-r1-1-w1c-"
    )
  );

const subjectPath =
  join(
    root,
    "subjects.jsonl"
  );

const bindingPath =
  join(
    root,
    "bindings.jsonl"
  );


const human = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-HUMAN-W1C",

  subject_class:
    "HUMAN",

  contextual_id:
    "CTX-HUMAN-W1C",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T10:00:00Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-W1C-HUMAN"
  ]
};


const ai = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-AI-W1C",

  subject_class:
    "AI_AGENT",

  contextual_id:
    "CTX-AI-W1C",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T10:00:01Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-W1C-AI"
  ]
};


registerSubject({
  registryPath:
    subjectPath,

  subject:
    human,

  recordedAt:
    "2026-08-25T10:01:00Z"
});


registerSubject({
  registryPath:
    subjectPath,

  subject:
    ai,

  recordedAt:
    "2026-08-25T10:01:01Z"
});


const humanBinding = {
  schema_version:
    "1.0",

  binding_ref:
    "BINDING-HUMAN-W1C",

  subject_ref:
    human.subject_ref,

  identity_source_ref:
    "IDENTITY-SOURCE-W1C-HUMAN",

  binding_type:
    "DEMO_VERIFIED_BINDING",

  verified_at:
    "2026-08-25T10:05:00Z",

  valid_until:
    "2026-08-26T10:05:00Z",

  revocation_state:
    "ACTIVE",

  evidence_refs: [
    "EVIDENCE-BINDING-W1C-HUMAN"
  ]
};


const aiBinding = {
  schema_version:
    "1.0",

  binding_ref:
    "BINDING-AI-W1C",

  subject_ref:
    ai.subject_ref,

  identity_source_ref:
    "IDENTITY-SOURCE-W1C-AI",

  binding_type:
    "DEMO_AGENT_BINDING",

  verified_at:
    "2026-08-25T10:06:00Z",

  valid_until:
    "2026-08-25T11:00:00Z",

  revocation_state:
    "ACTIVE",

  evidence_refs: [
    "EVIDENCE-BINDING-W1C-AI"
  ]
};


registerSubjectBinding({
  registryPath:
    bindingPath,

  subjectRegistryPath:
    subjectPath,

  binding:
    humanBinding,

  recordedAt:
    "2026-08-25T10:07:00Z",

  eventId:
    "SUBJECT-BINDING-EVENT-W1C-001"
});


registerSubjectBinding({
  registryPath:
    bindingPath,

  subjectRegistryPath:
    subjectPath,

  binding:
    aiBinding,

  recordedAt:
    "2026-08-25T10:07:01Z",

  eventId:
    "SUBJECT-BINDING-EVENT-W1C-002"
});


/*
 * Source example shape:
 * IDENTITY_CONTINUITY + ACCOUNT_HOLDER.
 */

const mixed =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY",
        "ACCOUNT_HOLDER"
      ],

      purpose:
        "PAYMENT_INITIATION",

      context_ref:
        "IOS-BANK-A-PAYMENTS"
    },

    evaluatedAt:
      "2026-08-25T10:30:00Z"
  });


if (
  mixed.status !==
    "PARTIALLY_VERIFIED"
) {
  fail(
    `R1_1_W1C_MIXED_STATUS_INVALID:${mixed.status}`
  );
}


const continuity =
  mixed.claim_results.find(
    (entry) =>
      entry.claim ===
        "IDENTITY_CONTINUITY"
  );

const accountHolder =
  mixed.claim_results.find(
    (entry) =>
      entry.claim ===
        "ACCOUNT_HOLDER"
  );


if (
  continuity?.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W1C_CONTINUITY_NOT_TECHNICALLY_VERIFIED"
  );
}


if (
  accountHolder?.status !==
    "UNRESOLVED" ||
  accountHolder?.reason_code !==
    "ENTITLEMENT_SOURCE_REQUIRED"
) {
  fail(
    "R1_1_W1C_ACCOUNT_HOLDER_BOUNDARY_INVALID"
  );
}


console.log(
  "R1_1_W1C_DELIMITED_IDENTITY_CONTINUITY=PASS"
);

console.log(
  "R1_1_W1C_ACCOUNT_HOLDER_DEFERRED_TO_ENTITLEMENT=PASS"
);

console.log(
  "R1_1_W1C_MULTI_CLAIM_PARTIAL_STATUS=PASS"
);


/*
 * Single supported claim.
 */

const positive =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "PAYMENT_INITIATION",

      context_ref:
        "IOS-BANK-A-PAYMENTS"
    },

    evaluatedAt:
      "2026-08-25T10:30:00Z"
  });


if (
  positive.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W1C_POSITIVE_STATUS_INVALID"
  );
}


if (
  !/^[a-f0-9]{64}$/.test(
    positive.request_sha256
  )
) {
  fail(
    "R1_1_W1C_REQUEST_HASH_INVALID"
  );
}


console.log(
  "R1_1_W1C_POSITIVE_STATUS_TECHNICALLY_VERIFIED=PASS"
);

console.log(
  "R1_1_W1C_REQUEST_HASH_BOUND=PASS"
);


/*
 * Response minimization and non-overclaim.
 */

for (const field of [
  "ontological_truth_proven",
  "physical_person_identity_proven",
  "civil_identity_proven",
  "legal_identity_proven",
  "identity_source_authenticity_proven",
  "account_holder_status_proven",
  "regulatory_compliance_proven",
  "trusted_external_time"
]) {
  if (
    positive.limitations[field] !==
      false
  ) {
    fail(
      `R1_1_W1C_SEMANTIC_OVERCLAIM:${field}`
    );
  }
}


const serialized =
  JSON.stringify(positive);


if (
  serialized.includes(
    "IDENTITY-SOURCE-W1C-HUMAN"
  )
) {
  fail(
    "R1_1_W1C_IDENTITY_SOURCE_DISCLOSED"
  );
}


console.log(
  "R1_1_W1C_NO_ONTOLOGICAL_TRUTH_CLAIM=PASS"
);

console.log(
  "R1_1_W1C_NO_LEGAL_IDENTITY_CLAIM=PASS"
);

console.log(
  "R1_1_W1C_IDENTITY_SOURCE_MINIMIZED=PASS"
);


/*
 * Subject itself exists physically in registry,
 * but must not be treated as historically observed
 * before recorded_at.
 */

const beforeSubjectObservation =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "TEST",

      context_ref:
        "IOS-TEST"
    },

    evaluatedAt:
      "2026-08-25T10:00:30Z"
  });


if (
  beforeSubjectObservation.status !==
    "UNRESOLVED" ||
  beforeSubjectObservation
    .claim_results[0]
    .reason_code !==
      "SUBJECT_NOT_YET_OBSERVED"
) {
  fail(
    "R1_1_W1C_SUBJECT_OBSERVATION_TIME_INVALID"
  );
}


console.log(
  "R1_1_W1C_SUBJECT_MUST_BE_OBSERVED_AS_OF_EVALUATION=PASS"
);


/*
 * Revoke later with separate effective and
 * recorded times.
 */

revokeSubjectBinding({
  registryPath:
    bindingPath,

  bindingRef:
    humanBinding.binding_ref,

  revokedAt:
    "2026-08-25T11:00:00Z",

  recordedAt:
    "2026-08-25T11:01:00Z",

  eventId:
    "SUBJECT-BINDING-EVENT-W1C-003",

  reasonCode:
    "SOURCE_BINDING_WITHDRAWN",

  evidenceRefs: [
    "EVIDENCE-BINDING-W1C-REVOCATION"
  ]
});


const historicalBeforeEffective =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "PAYMENT_INITIATION",

      context_ref:
        "IOS-BANK-A-PAYMENTS"
    },

    evaluatedAt:
      "2026-08-25T10:59:59Z"
  });


if (
  historicalBeforeEffective.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W1C_REVOCATION_REWROTE_PRE_EFFECTIVE_HISTORY"
  );
}


console.log(
  "R1_1_W1C_LATER_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
);


/*
 * Revocation is effective, but not yet observed.
 */

const effectiveNotObserved =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "PAYMENT_INITIATION",

      context_ref:
        "IOS-BANK-A-PAYMENTS"
    },

    evaluatedAt:
      "2026-08-25T11:00:30Z"
  });


if (
  effectiveNotObserved.status !==
    "TECHNICALLY_VERIFIED"
) {
  fail(
    "R1_1_W1C_UNOBSERVED_REVOCATION_REWROTE_HISTORY"
  );
}


console.log(
  "R1_1_W1C_EFFECTIVE_BUT_UNOBSERVED_REVOCATION_PRESERVES_HISTORY=PASS"
);


const revoked =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        human.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "PAYMENT_INITIATION",

      context_ref:
        "IOS-BANK-A-PAYMENTS"
    },

    evaluatedAt:
      "2026-08-25T11:01:00Z"
  });


if (
  revoked.status !==
    "REVOKED"
) {
  fail(
    `R1_1_W1C_REVOKED_STATUS_INVALID:${revoked.status}`
  );
}


console.log(
  "R1_1_W1C_REVOKED_BINDING_DENIES_POSITIVE_VERIFICATION=PASS"
);


/*
 * Expiry is separate from revocation.
 */

const expired =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        ai.subject_ref,

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "AGENT_OPERATION",

      context_ref:
        "IOS-BANK-A-AGENTS"
    },

    evaluatedAt:
      "2026-08-25T11:00:01Z"
  });


if (
  expired.status !==
    "EXPIRED"
) {
  fail(
    `R1_1_W1C_EXPIRED_STATUS_INVALID:${expired.status}`
  );
}


console.log(
  "R1_1_W1C_EXPIRED_BINDING_NOT_VERIFIED=PASS"
);


/*
 * Unsupported claim.
 */

const unknownClaim =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        ai.subject_ref,

      claims_requested: [
        "UNDEFINED_CLAIM"
      ],

      purpose:
        "TEST",

      context_ref:
        "IOS-TEST"
    },

    evaluatedAt:
      "2026-08-25T10:30:00Z"
  });


if (
  unknownClaim.status !==
    "UNRESOLVED" ||
  unknownClaim
    .claim_results[0]
    .reason_code !==
      "CLAIM_PROFILE_UNSUPPORTED"
) {
  fail(
    "R1_1_W1C_UNKNOWN_CLAIM_INVALID"
  );
}


console.log(
  "R1_1_W1C_UNKNOWN_CLAIM_FAILS_CLOSED_TO_UNRESOLVED=PASS"
);


/*
 * Unknown Subject.
 */

const unknownSubject =
  verifySubjectClaims({
    subjectRegistryPath:
      subjectPath,

    bindingRegistryPath:
      bindingPath,

    request: {
      subject_ref:
        "SUB-UNKNOWN-W1C",

      claims_requested: [
        "IDENTITY_CONTINUITY"
      ],

      purpose:
        "TEST",

      context_ref:
        "IOS-TEST"
    },

    evaluatedAt:
      "2026-08-25T10:30:00Z"
  });


if (
  unknownSubject.status !==
    "UNRESOLVED" ||
  unknownSubject
    .claim_results[0]
    .reason_code !==
      "SUBJECT_NOT_FOUND"
) {
  fail(
    "R1_1_W1C_UNKNOWN_SUBJECT_INVALID"
  );
}


console.log(
  "R1_1_W1C_UNKNOWN_SUBJECT_UNRESOLVED=PASS"
);


/*
 * Request fail-closed semantics.
 */

expectThrow(
  "R1_1_W1C_DUPLICATE_CLAIM_DENIED",

  () =>
    verifySubjectClaims({
      subjectRegistryPath:
        subjectPath,

      bindingRegistryPath:
        bindingPath,

      request: {
        subject_ref:
          ai.subject_ref,

        claims_requested: [
          "IDENTITY_CONTINUITY",
          "IDENTITY_CONTINUITY"
        ],

        purpose:
          "TEST",

        context_ref:
          "IOS-TEST"
      },

      evaluatedAt:
        "2026-08-25T10:30:00Z"
    }),

  "SUBJECT_VERIFICATION_DUPLICATE_CLAIM"
);


expectThrow(
  "R1_1_W1C_UNKNOWN_REQUEST_FIELD_DENIED",

  () =>
    verifySubjectClaims({
      subjectRegistryPath:
        subjectPath,

      bindingRegistryPath:
        bindingPath,

      request: {
        subject_ref:
          ai.subject_ref,

        claims_requested: [
          "IDENTITY_CONTINUITY"
        ],

        purpose:
          "TEST",

        context_ref:
          "IOS-TEST",

        legal_truth:
          true
      },

      evaluatedAt:
        "2026-08-25T10:30:00Z"
    }),

  "SUBJECT_VERIFICATION_REQUEST_FIELD_SET_INVALID"
);


console.log(
  "R1_1_W1C_REQUEST_FAIL_CLOSED=PASS"
);


console.log("");
console.log(
  "===== R1.1 WAVE 1C-R1 FINAL MATRIX ====="
);

console.log(
  "SUBJECT_VERIFY_REQUEST_SHAPE=IMPLEMENTED"
);

console.log(
  "DELIMITED_CLAIM_VERIFICATION=IMPLEMENTED"
);

console.log(
  "IDENTITY_CONTINUITY=TECHNICALLY_VERIFIABLE"
);

console.log(
  "ACCOUNT_HOLDER=UNRESOLVED_UNTIL_ENTITLEMENT_SOURCE"
);

console.log(
  "UNKNOWN_CLAIM=UNRESOLVED"
);

console.log(
  "SUBJECT_NOT_YET_OBSERVED=UNRESOLVED"
);

console.log(
  "POSITIVE_STATUS=TECHNICALLY_VERIFIED"
);

console.log(
  "MIXED_STATUS=PARTIALLY_VERIFIED"
);

console.log(
  "REVOKED_BINDING=REVOKED"
);

console.log(
  "EXPIRED_BINDING=EXPIRED"
);

console.log(
  "EFFECTIVE_BUT_UNOBSERVED_REVOCATION_REWRITES_HISTORY=FALSE"
);

console.log(
  "ONTOLOGICAL_TRUTH_PROVEN=FALSE"
);

console.log(
  "LEGAL_IDENTITY_PROVEN=FALSE"
);

console.log(
  "IDENTITY_SOURCE_AUTHENTICITY_PROVEN=FALSE"
);

console.log(
  "REGULATORY_COMPLIANCE_PROVEN=FALSE"
);

console.log(
  "TRUSTED_EXTERNAL_TIME=NO"
);

console.log(
  "R1_1_W1C_R1_SUBJECT_VERIFICATION=PASS"
);
