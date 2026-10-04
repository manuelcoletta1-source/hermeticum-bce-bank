import {
  readFileSync
} from "node:fs";


function fail(code) {
  throw new Error(code);
}


function readJson(path) {
  return JSON.parse(
    readFileSync(
      path,
      "utf8"
    )
  );
}


function sameSet(
  actual,
  expected
) {
  return (
    JSON.stringify(
      [...actual].sort()
    ) ===
    JSON.stringify(
      [...expected].sort()
    )
  );
}


const subject =
  readJson(
    "schemas/hbce-subject.schema.json"
  );


const binding =
  readJson(
    "schemas/hbce-subject-binding.schema.json"
  );


/*
 * =====================================================
 * SUBJECT
 * =====================================================
 */

const expectedSubjectRequired = [
  "schema_version",
  "subject_ref",
  "subject_class",
  "contextual_id",
  "root_ref_disclosed",
  "registration_state",
  "created_at",
  "evidence_refs"
];


if (
  subject.$schema !==
    "https://json-schema.org/draft/2020-12/schema" ||
  subject.additionalProperties !==
    false ||
  !sameSet(
    subject.required ?? [],
    expectedSubjectRequired
  )
) {
  fail(
    "R1_1_W1A_SUBJECT_SCHEMA_STRUCTURE_INVALID"
  );
}


const expectedSubjectClasses = [
  "HUMAN",
  "ORGANIZATION",
  "AI_AGENT",
  "SERVICE",
  "DEVICE",
  "ROBOT",
  "INFRASTRUCTURE"
];


if (
  !sameSet(
    subject.properties
      ?.subject_class
      ?.enum ?? [],
    expectedSubjectClasses
  )
) {
  fail(
    "R1_1_W1A_SUBJECT_CLASS_ENUM_INVALID"
  );
}


if (
  subject.properties
    ?.root_ref_disclosed
    ?.type !==
      "boolean"
) {
  fail(
    "R1_1_W1A_ROOT_REF_DISCLOSURE_BOUNDARY_INVALID"
  );
}


/*
 * Subject itself must not inherit lifecycle semantics
 * belonging to credential/binding/mandate/authority.
 */

for (const forbidden of [
  "valid_until",
  "revocation_state",
  "revoked_at",
  "binding_ref",
  "authority_ref",
  "authorization_ref"
]) {
  if (
    Object.hasOwn(
      subject.properties ?? {},
      forbidden
    )
  ) {
    fail(
      `R1_1_W1A_SUBJECT_SEMANTIC_COLLAPSE:${forbidden}`
    );
  }
}


console.log(
  "R1_1_W1A_SUBJECT_CANONICAL_FIELDS=PASS"
);

console.log(
  "R1_1_W1A_SUBJECT_CLASSES=PASS"
);

console.log(
  "R1_1_W1A_SUBJECT_NOT_PERSON_BOUNDARY=PASS"
);

console.log(
  "R1_1_W1A_PERSON_DOES_NOT_EXPIRE_BOUNDARY=PASS"
);


/*
 * =====================================================
 * SUBJECT BINDING
 * =====================================================
 */

const expectedBindingRequired = [
  "schema_version",
  "binding_ref",
  "subject_ref",
  "identity_source_ref",
  "binding_type",
  "verified_at",
  "valid_until",
  "revocation_state",
  "evidence_refs"
];


if (
  binding.$schema !==
    "https://json-schema.org/draft/2020-12/schema" ||
  binding.additionalProperties !==
    false ||
  !sameSet(
    binding.required ?? [],
    expectedBindingRequired
  )
) {
  fail(
    "R1_1_W1A_SUBJECT_BINDING_SCHEMA_STRUCTURE_INVALID"
  );
}


const expectedBindingStates = [
  "ACTIVE",
  "REVOKED",
  "SUPERSEDED"
];


if (
  !sameSet(
    binding.properties
      ?.revocation_state
      ?.enum ?? [],
    expectedBindingStates
  )
) {
  fail(
    "R1_1_W1A_BINDING_STATE_PROFILE_INVALID"
  );
}


if (
  binding.properties
    ?.valid_until
    ?.format !==
      "date-time" ||
  binding.properties
    ?.verified_at
    ?.format !==
      "date-time"
) {
  fail(
    "R1_1_W1A_BINDING_TEMPORAL_CONTRACT_INVALID"
  );
}


if (
  binding.properties
    ?.subject_ref
    ?.pattern !==
      "^SUB-[A-Z0-9][A-Z0-9._:-]{2,127}$"
) {
  fail(
    "R1_1_W1A_BINDING_SUBJECT_REFERENCE_INVALID"
  );
}


console.log(
  "R1_1_W1A_SUBJECT_BINDING_CANONICAL_FIELDS=PASS"
);

console.log(
  "R1_1_W1A_BINDING_REVOCABLE=PASS"
);

console.log(
  "R1_1_W1A_BINDING_SUPERSEDED_STATE=PASS"
);

console.log(
  "R1_1_W1A_BINDING_EXPIRY_SEPARATE_FROM_PERSON=PASS"
);


/*
 * =====================================================
 * SOURCE / IMPLEMENTATION-PROFILE BOUNDARY
 * =====================================================
 *
 * R1.1 explicitly enumerates the Subject and
 * SubjectBinding fields.
 *
 * R1.1 does not enumerate a closed vocabulary for:
 *   registration_state
 *   binding_type
 *
 * They therefore remain bounded strings here.
 *
 * This implementation profile narrows revocation_state
 * to ACTIVE | REVOKED | SUPERSEDED.
 *
 * Expiry is derived from valid_until rather than encoded
 * as revocation of the Subject/person.
 */


if (
  Array.isArray(
    subject.properties
      ?.registration_state
      ?.enum
  )
) {
  fail(
    "R1_1_W1A_UNSUPPORTED_REGISTRATION_STATE_ENUM_INVENTED"
  );
}


if (
  Array.isArray(
    binding.properties
      ?.binding_type
      ?.enum
  )
) {
  fail(
    "R1_1_W1A_UNSUPPORTED_BINDING_TYPE_ENUM_INVENTED"
  );
}


console.log(
  "R1_1_W1A_UNSPECIFIED_SOURCE_ENUMS_NOT_INVENTED=PASS"
);


console.log("");
console.log(
  "===== R1.1 WAVE 1A FINAL MATRIX ====="
);

console.log(
  "SUBJECT_SCHEMA=MACHINE_READABLE"
);

console.log(
  "SUBJECT_BINDING_SCHEMA=MACHINE_READABLE"
);

console.log(
  "SUBJECT_CLASSES=SOURCE_ALIGNED"
);

console.log(
  "SUBJECT!=PERSON"
);

console.log(
  "SUBJECT!=CREDENTIAL"
);

console.log(
  "BINDING_REVOCATION!=PERSON_REVOCATION"
);

console.log(
  "BINDING_EXPIRY!=PERSON_EXPIRY"
);

console.log(
  "ROOT_REFERENCE_DISCLOSURE=EXPLICIT_BOOLEAN"
);

console.log(
  "REGISTRATION_STATE_VOCABULARY=NOT_INVENTED"
);

console.log(
  "BINDING_TYPE_VOCABULARY=NOT_INVENTED"
);

console.log(
  "VERIFIED_SUBJECT_FULL_SCHEMA=DEFERRED_SOURCE_UNDERSPECIFIED"
);

console.log(
  "R1_1_W1A_IDENTITY_SCHEMAS=PASS"
);
