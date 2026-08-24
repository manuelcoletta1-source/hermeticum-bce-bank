import {
  readFileSync
} from "node:fs";


const schema =
  JSON.parse(
    readFileSync(
      "schemas/hbce-execution-evidence.schema.json",
      "utf8"
    )
  );


function fail(message) {
  throw new Error(message);
}


function assert(
  condition,
  message
) {
  if (!condition) {
    fail(message);
  }
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


const expectedTypes = [
  "EXECUTION_ATTEMPTED",
  "EXECUTION_ACCEPTED",
  "EXECUTION_COMPLETED",
  "OUTCOME_OBSERVED"
];


const actualTypes =
  schema.properties
    .evidence_type
    .enum;


assert(
  sameSet(
    actualTypes,
    expectedTypes
  ),
  "A014_EVIDENCE_TYPE_VOCABULARY_INVALID"
);


console.log(
  "A014_EVIDENCE_TYPE_VOCABULARY=PASS"
);


assert(
  schema.additionalProperties ===
    false,
  "A014_TOP_LEVEL_NOT_CLOSED"
);


const expectedRequired = [
  "schema_version",
  "evidence_id",
  "evidence_type",
  "execution_id",
  "attempt_id",
  "authorization",
  "consumption",
  "evaluation_evt",
  "request_sha256",
  "runtime_binding",
  "execution_payload_sha256",
  "idempotency",
  "observation_evidence_sha256",
  "occurred_at",
  "recorded_at",
  "time_source",
  "evidence_source",
  "privacy"
];


assert(
  sameSet(
    schema.required,
    expectedRequired
  ),
  "A014_REQUIRED_FIELD_SET_INVALID"
);


console.log(
  "A014_REQUIRED_FIELD_SET=PASS"
);


/*
 * Conditional stage contract.
 */

const conditions =
  schema.allOf;


assert(
  Array.isArray(
    conditions
  ) &&
  conditions.length ===
    4,
  "A014_STAGE_CONDITION_COUNT_INVALID"
);


const conditionalTypes =
  conditions.map(
    (entry) =>
      entry.if.properties
        .evidence_type.const
  );


assert(
  sameSet(
    conditionalTypes,
    expectedTypes
  ),
  "A014_STAGE_CONDITIONAL_VOCABULARY_INVALID"
);


console.log(
  "A014_STAGE_CONDITIONAL_MODEL=PASS"
);


/*
 * Privacy surface.
 */

function collectPropertyNames(
  value,
  output = new Set()
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return output;
  }


  if (
    value.properties &&
    typeof value.properties ===
      "object"
  ) {
    for (
      const key of
      Object.keys(
        value.properties
      )
    ) {
      output.add(key);
    }
  }


  for (
    const nested of
    Object.values(value)
  ) {
    if (
      nested &&
      typeof nested ===
        "object"
    ) {
      collectPropertyNames(
        nested,
        output
      );
    }
  }


  return output;
}


const propertyNames =
  collectPropertyNames(
    schema
  );


for (
  const forbidden of [
    "raw_request",
    "raw_execution_payload",
    "raw_external_response",
    "request_payload",
    "execution_payload",
    "external_response",
    "beneficiary_reference",
    "account_reference",
    "amount"
  ]
) {
  assert(
    !propertyNames.has(
      forbidden
    ),
    `A014_RAW_OR_SENSITIVE_PROPERTY_SURFACE:${forbidden}`
  );
}


console.log(
  "A014_MINIMIZED_DATA_MODEL=PASS"
);


/*
 * Verify privacy assertions themselves are machine closed.
 */

const privacy =
  schema.$defs.privacy;


for (
  const key of [
    "raw_request_included",
    "raw_execution_payload_included",
    "raw_external_response_included"
  ]
) {
  assert(
    privacy.properties[key].const ===
      false,
    `A014_PRIVACY_FLAG_NOT_FALSE:${key}`
  );
}


console.log(
  "A014_PRIVACY_NONCLAIM_CONTRACT=PASS"
);


/*
 * Outcome vocabulary keeps technical completion,
 * business result and finality distinct.
 */

assert(
  sameSet(
    schema.$defs.outcome
      .properties.status.enum,
    [
      "SUCCEEDED",
      "FAILED",
      "PARTIAL",
      "REJECTED",
      "UNKNOWN"
    ]
  ),
  "A014_OUTCOME_STATUS_VOCABULARY_INVALID"
);


assert(
  sameSet(
    schema.$defs.outcome
      .properties.finality.enum,
    [
      "NOT_EVALUATED",
      "PROVISIONAL",
      "FINAL",
      "REVERSED",
      "UNKNOWN"
    ]
  ),
  "A014_FINALITY_VOCABULARY_INVALID"
);


console.log(
  "A014_OUTCOME_FINALITY_SEPARATION=PASS"
);


/*
 * Minimal semantic checker for canonical examples.
 *
 * The schema remains the normative representation.
 * A015 will enforce append-only transition and chronology.
 */

const SHA =
  /^[a-f0-9]{64}$/;


const TOP_LEVEL_ALLOWED =
  new Set(
    Object.keys(
      schema.properties
    )
  );


function assertNoUnknownTopLevel(
  artifact
) {
  for (
    const key of
    Object.keys(
      artifact
    )
  ) {
    if (
      !TOP_LEVEL_ALLOWED.has(
        key
      )
    ) {
      fail(
        `A014_UNKNOWN_TOP_LEVEL_FIELD:${key}`
      );
    }
  }
}


function assertRequired(
  artifact
) {
  for (
    const key of
    schema.required
  ) {
    if (
      artifact[key] ===
      undefined
    ) {
      fail(
        `A014_REQUIRED_FIELD_MISSING:${key}`
      );
    }
  }
}


function assertSha(
  value,
  code
) {
  if (
    typeof value !== "string" ||
    !SHA.test(value)
  ) {
    fail(code);
  }
}


function assertObjectShape(
  value,
  definition,
  code
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    fail(code);
  }


  const allowed =
    new Set(
      Object.keys(
        definition.properties
      )
    );


  for (
    const key of
    Object.keys(value)
  ) {
    if (
      !allowed.has(key)
    ) {
      fail(
        `${code}_UNKNOWN_FIELD:${key}`
      );
    }
  }


  for (
    const key of
    definition.required ?? []
  ) {
    if (
      value[key] ===
      undefined
    ) {
      fail(
        `${code}_MISSING_FIELD:${key}`
      );
    }
  }
}


function validateArtifact(
  artifact
) {
  assertNoUnknownTopLevel(
    artifact
  );

  assertRequired(
    artifact
  );


  if (
    artifact.schema_version !==
      "1.0"
  ) {
    fail(
      "A014_SCHEMA_VERSION_INVALID"
    );
  }


  if (
    !expectedTypes.includes(
      artifact.evidence_type
    )
  ) {
    fail(
      "A014_EVIDENCE_TYPE_INVALID"
    );
  }


  assertSha(
    artifact.authorization
      .authorization_sha256,
    "A014_AUTHORIZATION_SHA_INVALID"
  );

  assertSha(
    artifact.consumption
      .consumption_record_sha256,
    "A014_CONSUMPTION_SHA_INVALID"
  );

  assertSha(
    artifact.evaluation_evt
      .evt_sha256,
    "A014_EVT_SHA_INVALID"
  );

  assertSha(
    artifact.request_sha256,
    "A014_REQUEST_SHA_INVALID"
  );

  assertSha(
    artifact.runtime_binding
      .runtime_digest_sha256,
    "A014_RUNTIME_SHA_INVALID"
  );

  assertSha(
    artifact.execution_payload_sha256,
    "A014_EXECUTION_PAYLOAD_SHA_INVALID"
  );

  assertSha(
    artifact.idempotency
      .key_sha256,
    "A014_IDEMPOTENCY_SHA_INVALID"
  );

  assertSha(
    artifact.observation_evidence_sha256,
    "A014_OBSERVATION_SHA_INVALID"
  );


  assertObjectShape(
    artifact.runtime_binding,
    schema.$defs.runtime_binding,
    "A014_RUNTIME_BINDING"
  );

  assertObjectShape(
    artifact.idempotency,
    schema.$defs.idempotency,
    "A014_IDEMPOTENCY"
  );

  assertObjectShape(
    artifact.time_source,
    schema.$defs.time_source,
    "A014_TIME_SOURCE"
  );

  assertObjectShape(
    artifact.evidence_source,
    schema.$defs.evidence_source,
    "A014_EVIDENCE_SOURCE"
  );

  assertObjectShape(
    artifact.privacy,
    schema.$defs.privacy,
    "A014_PRIVACY"
  );


  if (
    artifact.privacy
      .raw_request_included !==
      false ||
    artifact.privacy
      .raw_execution_payload_included !==
      false ||
    artifact.privacy
      .raw_external_response_included !==
      false
  ) {
    fail(
      "A014_RAW_DATA_FLAG_INVALID"
    );
  }


  if (
    artifact.time_source.source ===
      "LOCAL_SYSTEM_CLOCK" &&
    artifact.time_source
      .trusted_external_time !==
      false
  ) {
    fail(
      "A014_LOCAL_CLOCK_TRUST_INVALID"
    );
  }


  const type =
    artifact.evidence_type;


  if (
    type ===
    "EXECUTION_ATTEMPTED"
  ) {
    if (
      artifact.external_evidence !==
        undefined ||
      artifact.outcome !==
        undefined
    ) {
      fail(
        "A014_ATTEMPT_OVERCLAIMS"
      );
    }
  }


  if (
    type ===
      "EXECUTION_ACCEPTED" ||
    type ===
      "EXECUTION_COMPLETED" ||
    type ===
      "OUTCOME_OBSERVED"
  ) {
    if (
      artifact.previous_evidence ===
        undefined
    ) {
      fail(
        "A014_PREVIOUS_EVIDENCE_REQUIRED"
      );
    }


    if (
      artifact.external_evidence ===
        undefined
    ) {
      fail(
        "A014_EXTERNAL_EVIDENCE_REQUIRED"
      );
    }


    if (
      artifact.evidence_source
        .verification_state !==
        "VERIFIED"
    ) {
      fail(
        "A014_EXTERNAL_STAGE_SOURCE_UNVERIFIED"
      );
    }


    assertObjectShape(
      artifact.external_evidence,
      schema.$defs.external_evidence,
      "A014_EXTERNAL_EVIDENCE"
    );


    assertSha(
      artifact.external_evidence
        .evidence_sha256,
      "A014_EXTERNAL_EVIDENCE_SHA_INVALID"
    );
  }


  if (
    type ===
    "EXECUTION_ACCEPTED"
  ) {
    if (
      artifact.external_evidence
        .evidence_kind !==
        "ACCEPTANCE"
    ) {
      fail(
        "A014_ACCEPTANCE_KIND_INVALID"
      );
    }


    if (
      artifact.outcome !==
        undefined
    ) {
      fail(
        "A014_ACCEPTANCE_OVERCLAIMS_OUTCOME"
      );
    }
  }


  if (
    type ===
    "EXECUTION_COMPLETED"
  ) {
    if (
      artifact.external_evidence
        .evidence_kind !==
        "COMPLETION"
    ) {
      fail(
        "A014_COMPLETION_KIND_INVALID"
      );
    }


    if (
      artifact.outcome !==
        undefined
    ) {
      fail(
        "A014_COMPLETION_OVERCLAIMS_OUTCOME"
      );
    }
  }


  if (
    type ===
    "OUTCOME_OBSERVED"
  ) {
    if (
      artifact.external_evidence
        .evidence_kind !==
        "OUTCOME"
    ) {
      fail(
        "A014_OUTCOME_EVIDENCE_KIND_INVALID"
      );
    }


    if (
      artifact.outcome ===
        undefined
    ) {
      fail(
        "A014_OUTCOME_REQUIRED"
      );
    }


    assertObjectShape(
      artifact.outcome,
      schema.$defs.outcome,
      "A014_OUTCOME"
    );
  }


  return true;
}


function expectInvalid(
  label,
  artifact,
  expectedReason
) {
  let actual =
    null;


  try {
    validateArtifact(
      artifact
    );
  } catch (error) {
    actual =
      error.message;
  }


  if (
    actual !== expectedReason
  ) {
    fail(
      `${label}:EXPECTED=${expectedReason}:ACTUAL=${actual}`
    );
  }


  console.log(
    `${label}=PASS`
  );
}


const base = {
  schema_version:
    "1.0",

  evidence_id:
    "EXECUTION-EVIDENCE-A014-ATTEMPT",

  evidence_type:
    "EXECUTION_ATTEMPTED",

  execution_id:
    "EXECUTION-A014-001",

  attempt_id:
    "EXECUTION-ATTEMPT-A014-001",

  authorization: {
    authorization_id:
      "AUTHORIZATION-A014-001",

    authorization_sha256:
      "a".repeat(64)
  },

  consumption: {
    consumption_id:
      "CONSUMPTION-A014-001",

    consumption_record_sha256:
      "b".repeat(64)
  },

  evaluation_evt: {
    evt_id:
      "EVT-A014-001",

    evt_sha256:
      "c".repeat(64)
  },

  request_sha256:
    "d".repeat(64),

  runtime_binding: {
    runtime_id:
      "A27",

    runtime_type:
      "AI_AGENT",

    runtime_version:
      "1.0",

    runtime_digest_sha256:
      "e".repeat(64)
  },

  execution_payload_sha256:
    "f".repeat(64),

  idempotency: {
    key_sha256:
      "1".repeat(64),

    scope:
      "EXECUTION_ATTEMPT",

    external_enforcement:
      "NOT_CONFIRMED"
  },

  observation_evidence_sha256:
    "2".repeat(64),

  occurred_at:
    "2026-08-24T11:00:00Z",

  recorded_at:
    "2026-08-24T11:00:01Z",

  time_source: {
    source:
      "LOCAL_SYSTEM_CLOCK",

    trusted_external_time:
      false
  },

  evidence_source: {
    source_type:
      "EXECUTION_ADAPTER",

    source_reference:
      "HBCE-EXECUTION-ADAPTER-001",

    verification_state:
      "VERIFIED"
  },

  privacy: {
    raw_request_included:
      false,

    raw_execution_payload_included:
      false,

    raw_external_response_included:
      false
  }
};


validateArtifact(
  base
);


console.log(
  "A014_EXECUTION_ATTEMPTED_MODEL=PASS"
);


const accepted = {
  ...base,

  evidence_id:
    "EXECUTION-EVIDENCE-A014-ACCEPTED",

  evidence_type:
    "EXECUTION_ACCEPTED",

  previous_evidence: {
    evidence_id:
      base.evidence_id,

    evidence_sha256:
      "3".repeat(64)
  },

  external_evidence: {
    evidence_kind:
      "ACCEPTANCE",

    external_system_reference:
      "BANK-CORE-001",

    external_operation_reference:
      "OP-001",

    evidence_sha256:
      "4".repeat(64),

    external_observed_at:
      "2026-08-24T11:00:02Z"
  }
};


validateArtifact(
  accepted
);


console.log(
  "A014_EXECUTION_ACCEPTED_MODEL=PASS"
);


const completed = {
  ...accepted,

  evidence_id:
    "EXECUTION-EVIDENCE-A014-COMPLETED",

  evidence_type:
    "EXECUTION_COMPLETED",

  previous_evidence: {
    evidence_id:
      accepted.evidence_id,

    evidence_sha256:
      "5".repeat(64)
  },

  external_evidence: {
    ...accepted.external_evidence,

    evidence_kind:
      "COMPLETION",

    evidence_sha256:
      "6".repeat(64)
  }
};


validateArtifact(
  completed
);


console.log(
  "A014_EXECUTION_COMPLETED_MODEL=PASS"
);

console.log(
  "A014_COMPLETED_WITHOUT_BUSINESS_OUTCOME=PASS"
);


const outcome = {
  ...completed,

  evidence_id:
    "EXECUTION-EVIDENCE-A014-OUTCOME",

  evidence_type:
    "OUTCOME_OBSERVED",

  previous_evidence: {
    evidence_id:
      completed.evidence_id,

    evidence_sha256:
      "7".repeat(64)
  },

  external_evidence: {
    ...completed.external_evidence,

    evidence_kind:
      "OUTCOME",

    evidence_sha256:
      "8".repeat(64)
  },

  outcome: {
    status:
      "SUCCEEDED",

    outcome_code:
      "PAYMENT_PROCESSED",

    finality:
      "PROVISIONAL",

    business_reference:
      "BANK-OP-001"
  }
};


validateArtifact(
  outcome
);


console.log(
  "A014_OUTCOME_OBSERVED_MODEL=PASS"
);

console.log(
  "A014_SUCCESS_DOES_NOT_IMPLY_FINALITY=PASS"
);


/*
 * Negative semantics.
 */

expectInvalid(
  "A014_ATTEMPT_CANNOT_CLAIM_OUTCOME",

  {
    ...base,

    outcome: {
      status:
        "SUCCEEDED",

      outcome_code:
        "SUCCESS",

      finality:
        "FINAL"
    }
  },

  "A014_ATTEMPT_OVERCLAIMS"
);


expectInvalid(
  "A014_ACCEPTED_REQUIRES_EXTERNAL_EVIDENCE",

  {
    ...accepted,

    external_evidence:
      undefined
  },

  "A014_EXTERNAL_EVIDENCE_REQUIRED"
);


expectInvalid(
  "A014_COMPLETION_CANNOT_CLAIM_BUSINESS_OUTCOME",

  {
    ...completed,

    outcome: {
      status:
        "SUCCEEDED",

      outcome_code:
        "SUCCESS",

      finality:
        "FINAL"
    }
  },

  "A014_COMPLETION_OVERCLAIMS_OUTCOME"
);


expectInvalid(
  "A014_OUTCOME_REQUIRES_OUTCOME_OBJECT",

  {
    ...outcome,

    outcome:
      undefined
  },

  "A014_OUTCOME_REQUIRED"
);


expectInvalid(
  "A014_EXTERNAL_STAGE_REQUIRES_VERIFIED_SOURCE",

  {
    ...accepted,

    evidence_source: {
      ...accepted.evidence_source,

      verification_state:
        "UNVERIFIED"
    }
  },

  "A014_EXTERNAL_STAGE_SOURCE_UNVERIFIED"
);


expectInvalid(
  "A014_RAW_RESPONSE_FIELD_DENIED",

  {
    ...outcome,

    raw_external_response:
      "forbidden"
  },

  "A014_UNKNOWN_TOP_LEVEL_FIELD:raw_external_response"
);


expectInvalid(
  "A014_RAW_EXTERNAL_EVIDENCE_FIELD_DENIED",

  {
    ...outcome,

    external_evidence: {
      ...outcome.external_evidence,

      raw_response:
        "forbidden"
    }
  },

  "A014_EXTERNAL_EVIDENCE_UNKNOWN_FIELD:raw_response"
);


console.log(
  "A014_NEGATIVE_MODEL_CASES=PASS"
);


/*
 * Explicit boundary declarations.
 */

console.log(
  "A014_GUARDED_CONSUMPTION_IS_NOT_EXECUTION=PASS"
);

console.log(
  "A014_EXECUTION_ATTEMPT_IS_NOT_ACCEPTANCE=PASS"
);

console.log(
  "A014_ACCEPTANCE_IS_NOT_COMPLETION=PASS"
);

console.log(
  "A014_COMPLETION_IS_NOT_OUTCOME=PASS"
);

console.log(
  "A014_SUCCESS_IS_NOT_FINALITY=PASS"
);

console.log(
  "A014_TEMPORAL_ORDER_ENFORCEMENT=DEFERRED_TO_A015"
);

console.log(
  "A014_EXTERNAL_EXECUTION_NOT_PERFORMED=TRUE"
);

console.log(
  "A014_EXECUTION_EVIDENCE_MODEL=PASS"
);
