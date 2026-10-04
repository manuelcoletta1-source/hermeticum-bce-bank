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
  registerSubject,
  getSubject,
  listSubjects,
  verifySubjectRegistry
} from "../protocol/hbce-subject-registry.reference.mjs";

import {
  registerSubjectBinding,
  revokeSubjectBinding,
  supersedeSubjectBinding,
  resolveSubjectBinding,
  listSubjectBindingEvents,
  verifySubjectBindingRegistry
} from "../protocol/hbce-subject-binding-registry.reference.mjs";


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
      "hbce-r1-1-w1b-"
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


const subject1 = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-HUMAN-001",

  subject_class:
    "HUMAN",

  contextual_id:
    "CTX-HUMAN-001",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T10:00:00Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-001"
  ]
};


const subject2 = {
  schema_version:
    "1.0",

  subject_ref:
    "SUB-AI-001",

  subject_class:
    "AI_AGENT",

  contextual_id:
    "CTX-AI-001",

  root_ref_disclosed:
    false,

  registration_state:
    "REGISTERED",

  created_at:
    "2026-08-25T10:00:01Z",

  evidence_refs: [
    "EVIDENCE-SUBJECT-002"
  ]
};


registerSubject({
  registryPath:
    subjectPath,

  subject:
    subject1,

  recordedAt:
    "2026-08-25T10:01:00Z"
});


registerSubject({
  registryPath:
    subjectPath,

  subject:
    subject2,

  recordedAt:
    "2026-08-25T10:01:01Z"
});


const subjectVerification =
  verifySubjectRegistry({
    registryPath:
      subjectPath
  });


if (
  subjectVerification.valid !==
    true ||
  subjectVerification.record_count !==
    2 ||
  subjectVerification
    .subject_is_person_claimed !==
      false ||
  subjectVerification
    .legal_identity_proven !==
      false
) {
  fail(
    "R1_1_W1B_SUBJECT_REGISTRY_VERIFY_FAILED"
  );
}


console.log(
  "R1_1_W1B_TWO_SUBJECTS_REGISTERED=PASS"
);


if (
  listSubjects({
    registryPath:
      subjectPath
  }).length !==
    2
) {
  fail(
    "R1_1_W1B_SUBJECT_LIST_INVALID"
  );
}


expectThrow(
  "R1_1_W1B_DUPLICATE_SUBJECT_DENIED",

  () =>
    registerSubject({
      registryPath:
        subjectPath,

      subject:
        subject1,

      recordedAt:
        "2026-08-25T10:02:00Z"
    }),

  "SUBJECT_ALREADY_REGISTERED"
);


/*
 * =====================================================
 * BINDINGS
 * =====================================================
 */

const binding1 = {
  schema_version:
    "1.0",

  binding_ref:
    "BINDING-HUMAN-001",

  subject_ref:
    subject1.subject_ref,

  identity_source_ref:
    "IDENTITY-SOURCE-DEMO-001",

  binding_type:
    "DEMO_VERIFIED_BINDING",

  verified_at:
    "2026-08-25T10:05:00Z",

  valid_until:
    "2026-08-26T10:05:00Z",

  revocation_state:
    "ACTIVE",

  evidence_refs: [
    "EVIDENCE-BINDING-001"
  ]
};


const binding2 = {
  schema_version:
    "1.0",

  binding_ref:
    "BINDING-AI-001",

  subject_ref:
    subject2.subject_ref,

  identity_source_ref:
    "IDENTITY-SOURCE-DEMO-002",

  binding_type:
    "DEMO_AGENT_BINDING",

  verified_at:
    "2026-08-25T10:06:00Z",

  valid_until:
    "2026-08-27T10:06:00Z",

  revocation_state:
    "ACTIVE",

  evidence_refs: [
    "EVIDENCE-BINDING-002"
  ]
};


const binding3 = {
  schema_version:
    "1.0",

  binding_ref:
    "BINDING-AI-002",

  subject_ref:
    subject2.subject_ref,

  identity_source_ref:
    "IDENTITY-SOURCE-DEMO-003",

  binding_type:
    "DEMO_AGENT_BINDING",

  verified_at:
    "2026-08-25T10:07:00Z",

  valid_until:
    "2026-08-28T10:07:00Z",

  revocation_state:
    "ACTIVE",

  evidence_refs: [
    "EVIDENCE-BINDING-003"
  ]
};


registerSubjectBinding({
  registryPath:
    bindingPath,

  subjectRegistryPath:
    subjectPath,

  binding:
    binding1,

  recordedAt:
    "2026-08-25T10:08:00Z",

  eventId:
    "SUBJECT-BINDING-EVENT-001"
});


registerSubjectBinding({
  registryPath:
    bindingPath,

  subjectRegistryPath:
    subjectPath,

  binding:
    binding2,

  recordedAt:
    "2026-08-25T10:08:01Z",

  eventId:
    "SUBJECT-BINDING-EVENT-002"
});


registerSubjectBinding({
  registryPath:
    bindingPath,

  subjectRegistryPath:
    subjectPath,

  binding:
    binding3,

  recordedAt:
    "2026-08-25T10:08:02Z",

  eventId:
    "SUBJECT-BINDING-EVENT-003"
});


const initialVerify =
  verifySubjectBindingRegistry({
    registryPath:
      bindingPath
  });


if (
  initialVerify.valid !==
    true ||
  initialVerify.record_count !==
    3 ||
  initialVerify
    .subject_revocation_supported !==
      false ||
  initialVerify
    .person_revocation_supported !==
      false
) {
  fail(
    "R1_1_W1B_INITIAL_BINDING_VERIFY_FAILED"
  );
}


console.log(
  "R1_1_W1B_BINDINGS_REGISTERED=PASS"
);


/*
 * Unknown Subject must fail closed.
 */

const unknownBinding = {
  ...binding1,

  binding_ref:
    "BINDING-UNKNOWN-001",

  subject_ref:
    "SUB-UNKNOWN-001",

  evidence_refs: [
    "EVIDENCE-BINDING-UNKNOWN"
  ]
};


expectThrow(
  "R1_1_W1B_UNKNOWN_SUBJECT_DENIED",

  () =>
    registerSubjectBinding({
      registryPath:
        bindingPath,

      subjectRegistryPath:
        subjectPath,

      binding:
        unknownBinding,

      recordedAt:
        "2026-08-25T10:09:00Z",

      eventId:
        "SUBJECT-BINDING-EVENT-UNKNOWN"
    }),

  "SUBJECT_BINDING_UNKNOWN_SUBJECT"
);


/*
 * Revoke binding 1.
 */

revokeSubjectBinding({
  registryPath:
    bindingPath,

  bindingRef:
    binding1.binding_ref,

  revokedAt:
    "2026-08-25T11:00:00Z",

  recordedAt:
    "2026-08-25T11:01:00Z",

  eventId:
    "SUBJECT-BINDING-EVENT-004",

  reasonCode:
    "SOURCE_BINDING_WITHDRAWN",

  evidenceRefs: [
    "EVIDENCE-BINDING-REVOCATION-001"
  ]
});


const beforeRevocation =
  resolveSubjectBinding({
    registryPath:
      bindingPath,

    bindingRef:
      binding1.binding_ref,

    asOf:
      "2026-08-25T10:59:59Z"
  });


if (
  beforeRevocation
    .revocation_state !==
      "ACTIVE" ||
  beforeRevocation
    .technically_usable !==
      true
) {
  fail(
    "R1_1_W1B_HISTORY_BEFORE_REVOCATION_INVALID"
  );
}


console.log(
  "R1_1_W1B_LATER_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
);


const afterRevocation =
  resolveSubjectBinding({
    registryPath:
      bindingPath,

    bindingRef:
      binding1.binding_ref,

    asOf:
      "2026-08-25T11:01:00Z"
  });


if (
  afterRevocation
    .revocation_state !==
      "REVOKED" ||
  afterRevocation
    .technically_usable !==
      false ||
  afterRevocation
    .subject_revoked !==
      false ||
  afterRevocation
    .person_revoked !==
      false
) {
  fail(
    "R1_1_W1B_REVOCATION_BOUNDARY_INVALID"
  );
}


console.log(
  "R1_1_W1B_BINDING_REVOCATION=PASS"
);

console.log(
  "R1_1_W1B_REVOKE_BINDING_NOT_SUBJECT=PASS"
);

console.log(
  "R1_1_W1B_REVOKE_BINDING_NOT_PERSON=PASS"
);


/*
 * Subject remains unchanged after binding revocation.
 */

const subjectAfterRevocation =
  getSubject({
    registryPath:
      subjectPath,

    subjectRef:
      subject1.subject_ref
  });


if (
  !subjectAfterRevocation ||
  JSON.stringify(
    subjectAfterRevocation.subject
  ) !==
    JSON.stringify(
      subject1
    )
) {
  fail(
    "R1_1_W1B_SUBJECT_CHANGED_BY_BINDING_REVOCATION"
  );
}


console.log(
  "R1_1_W1B_SUBJECT_IMMUTABLE_AFTER_BINDING_REVOCATION=PASS"
);


/*
 * Supersede binding 2 with already registered binding 3.
 */

supersedeSubjectBinding({
  registryPath:
    bindingPath,

  bindingRef:
    binding2.binding_ref,

  replacementBindingRef:
    binding3.binding_ref,

  supersededAt:
    "2026-08-25T12:00:00Z",

  recordedAt:
    "2026-08-25T12:01:00Z",

  eventId:
    "SUBJECT-BINDING-EVENT-005",

  reasonCode:
    "BINDING_REPLACED",

  evidenceRefs: [
    "EVIDENCE-BINDING-SUPERSESSION-001"
  ]
});


const superseded =
  resolveSubjectBinding({
    registryPath:
      bindingPath,

    bindingRef:
      binding2.binding_ref,

    asOf:
      "2026-08-25T12:01:00Z"
  });


if (
  superseded
    .revocation_state !==
      "SUPERSEDED" ||
  superseded
    .technically_usable !==
      false ||
  superseded
    .lifecycle_event
    .replacement_binding_ref !==
      binding3.binding_ref
) {
  fail(
    "R1_1_W1B_SUPERSESSION_INVALID"
  );
}


const replacement =
  resolveSubjectBinding({
    registryPath:
      bindingPath,

    bindingRef:
      binding3.binding_ref,

    asOf:
      "2026-08-25T12:01:00Z"
  });


if (
  replacement
    .revocation_state !==
      "ACTIVE" ||
  replacement
    .technically_usable !==
      true
) {
  fail(
    "R1_1_W1B_REPLACEMENT_NOT_ACTIVE"
  );
}


console.log(
  "R1_1_W1B_BINDING_SUPERSESSION=PASS"
);

console.log(
  "R1_1_W1B_REPLACEMENT_BINDING_ACTIVE=PASS"
);


/*
 * Terminal state must not be mutable into another terminal state.
 */

expectThrow(
  "R1_1_W1B_TERMINAL_BINDING_REPLAY_DENIED",

  () =>
    revokeSubjectBinding({
      registryPath:
        bindingPath,

      bindingRef:
        binding2.binding_ref,

      revokedAt:
        "2026-08-25T12:10:00Z",

      recordedAt:
        "2026-08-25T12:11:00Z",

      eventId:
        "SUBJECT-BINDING-EVENT-006",

      reasonCode:
        "INVALID_SECOND_TERMINAL_EVENT"
    }),

  "SUBJECT_BINDING_ALREADY_TERMINAL"
);


/*
 * Expiry does not revoke Subject/person.
 */

const expiredView =
  resolveSubjectBinding({
    registryPath:
      bindingPath,

    bindingRef:
      binding3.binding_ref,

    asOf:
      "2026-08-29T00:00:00Z"
  });


if (
  expiredView
    .revocation_state !==
      "ACTIVE" ||
  expiredView
    .within_validity !==
      false ||
  expiredView
    .technically_usable !==
      false ||
  expiredView
    .subject_revoked !==
      false ||
  expiredView
    .person_revoked !==
      false
) {
  fail(
    "R1_1_W1B_EXPIRY_BOUNDARY_INVALID"
  );
}


console.log(
  "R1_1_W1B_BINDING_EXPIRY_NOT_REVOCATION=PASS"
);

console.log(
  "R1_1_W1B_BINDING_EXPIRY_NOT_PERSON_EXPIRY=PASS"
);


/*
 * Registry chain and count.
 */

const finalVerify =
  verifySubjectBindingRegistry({
    registryPath:
      bindingPath
  });


if (
  finalVerify.valid !==
    true ||
  finalVerify.record_count !==
    5
) {
  fail(
    `R1_1_W1B_FINAL_BINDING_RECORD_COUNT_INVALID:${finalVerify.record_count}`
  );
}


console.log(
  "R1_1_W1B_BINDING_REGISTRY_VERIFY=PASS"
);


/*
 * Tamper Subject registry.
 */

const originalSubjectRaw =
  readFileSync(
    subjectPath,
    "utf8"
  );


writeFileSync(
  subjectPath,
  originalSubjectRaw.replace(
    '"contextual_id":"CTX-HUMAN-001"',
    '"contextual_id":"CTX-HUMAN-TAMPERED"'
  ),
  "utf8"
);


expectThrow(
  "R1_1_W1B_SUBJECT_TAMPER_DETECTED",

  () =>
    verifySubjectRegistry({
      registryPath:
        subjectPath
    }),

  "SUBJECT_REGISTRY_SUBJECT_HASH_MISMATCH"
);


writeFileSync(
  subjectPath,
  originalSubjectRaw,
  "utf8"
);


/*
 * Tamper Binding registry.
 */

const originalBindingRaw =
  readFileSync(
    bindingPath,
    "utf8"
  );


writeFileSync(
  bindingPath,
  originalBindingRaw.replace(
    '"reason_code":"SOURCE_BINDING_WITHDRAWN"',
    '"reason_code":"TAMPERED_REASON"'
  ),
  "utf8"
);


expectThrow(
  "R1_1_W1B_BINDING_TAMPER_DETECTED",

  () =>
    verifySubjectBindingRegistry({
      registryPath:
        bindingPath
    }),

  "SUBJECT_BINDING_RECORD_HASH_MISMATCH"
);


writeFileSync(
  bindingPath,
  originalBindingRaw,
  "utf8"
);


/*
 * Missing registries fail closed for verification.
 */

expectThrow(
  "R1_1_W1B_MISSING_SUBJECT_REGISTRY_FAIL_CLOSED",

  () =>
    verifySubjectRegistry({
      registryPath:
        join(
          root,
          "missing-subjects.jsonl"
        )
    }),

  "SUBJECT_REGISTRY_UNAVAILABLE"
);


expectThrow(
  "R1_1_W1B_MISSING_BINDING_REGISTRY_FAIL_CLOSED",

  () =>
    verifySubjectBindingRegistry({
      registryPath:
        join(
          root,
          "missing-bindings.jsonl"
        )
    }),

  "SUBJECT_BINDING_REGISTRY_UNAVAILABLE"
);


if (
  listSubjectBindingEvents({
    registryPath:
      bindingPath
  }).length !==
    5
) {
  fail(
    "R1_1_W1B_BINDING_EVENT_LIST_INVALID"
  );
}


console.log("");
console.log(
  "===== R1.1 WAVE 1B FINAL MATRIX ====="
);

console.log(
  "SUBJECT_APPEND_ONLY_REGISTRY=PASS"
);

console.log(
  "SUBJECT_BINDING_APPEND_ONLY_REGISTRY=PASS"
);

console.log(
  "TWO_SUBJECTS_WITH_BINDINGS=PASS"
);

console.log(
  "SUBJECT_BINDING_REVOKE=PASS"
);

console.log(
  "SUBJECT_BINDING_SUPERSEDE=PASS"
);

console.log(
  "DUAL_TIME_HISTORY=PASS"
);

console.log(
  "BINDING_EXPIRY!=SUBJECT_EXPIRY"
);

console.log(
  "BINDING_REVOCATION!=SUBJECT_REVOCATION"
);

console.log(
  "BINDING_REVOCATION!=PERSON_REVOCATION"
);

console.log(
  "SUBJECT_REVOCATION_API=ABSENT"
);

console.log(
  "IDENTITY_SOURCE_AUTHENTICITY=NOT_PROVEN"
);

console.log(
  "LEGAL_IDENTITY=NOT_PROVEN"
);

console.log(
  "CIVIL_IDENTITY=NOT_PROVEN"
);

console.log(
  "TRUSTED_EXTERNAL_TIME=NO"
);

console.log(
  "EXTERNAL_IMMUTABILITY=NOT_PROVEN"
);

console.log(
  "R1_1_W1B_SUBJECT_AND_BINDING_REGISTRIES=PASS"
);
