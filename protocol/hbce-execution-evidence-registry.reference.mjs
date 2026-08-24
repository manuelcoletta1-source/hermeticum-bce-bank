import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import {
  createHash
} from "node:crypto";


import {
  getAuthorizationConsumption,
  verifyAuthorizationConsumptionRegistry
} from "./hbce-authorization-consumption.reference.mjs";


import {
  verifyAdmissionConsumptionSignature
} from "./hbce-admission-signature.reference.mjs";


const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const EVIDENCE_ID_PATTERN =
  /^EXECUTION-EVIDENCE-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const EXECUTION_ID_PATTERN =
  /^EXECUTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ATTEMPT_ID_PATTERN =
  /^EXECUTION-ATTEMPT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const AUTHORIZATION_ID_PATTERN =
  /^AUTHORIZATION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const CONSUMPTION_ID_PATTERN =
  /^CONSUMPTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const EVT_ID_PATTERN =
  /^EVT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const OUTCOME_CODE_PATTERN =
  /^[A-Z][A-Z0-9_]{1,63}$/;


const EVIDENCE_TYPES =
  new Set([
    "EXECUTION_ATTEMPTED",
    "EXECUTION_ACCEPTED",
    "EXECUTION_COMPLETED",
    "OUTCOME_OBSERVED"
  ]);


const ALLOWED_NEXT_EVIDENCE_TYPES =
  Object.freeze({
    EXECUTION_ATTEMPTED:
      Object.freeze([
        "EXECUTION_ACCEPTED",
        "OUTCOME_OBSERVED"
      ]),

    EXECUTION_ACCEPTED:
      Object.freeze([
        "EXECUTION_COMPLETED",
        "OUTCOME_OBSERVED"
      ]),

    EXECUTION_COMPLETED:
      Object.freeze([
        "OUTCOME_OBSERVED"
      ]),

    OUTCOME_OBSERVED:
      Object.freeze([])
  });


const RUNTIME_TYPES =
  new Set([
    "AI_AGENT",
    "AI_MODEL",
    "DETERMINISTIC_SOFTWARE",
    "MACHINE",
    "HUMAN_OPERATED_SOFTWARE",
    "EXTERNAL_SERVICE"
  ]);


const IDEMPOTENCY_SCOPES =
  new Set([
    "AUTHORIZATION",
    "EXECUTION",
    "EXECUTION_ATTEMPT"
  ]);


const IDEMPOTENCY_ENFORCEMENT =
  new Set([
    "CONFIRMED",
    "NOT_CONFIRMED",
    "NOT_APPLICABLE"
  ]);


const TIME_SOURCES =
  new Set([
    "LOCAL_SYSTEM_CLOCK",
    "EXTERNAL_SYSTEM_CLOCK",
    "TRUSTED_TIMESTAMP_SERVICE",
    "MIXED"
  ]);


const EVIDENCE_SOURCE_TYPES =
  new Set([
    "HBCE_RUNTIME",
    "EXECUTION_ADAPTER",
    "EXTERNAL_SYSTEM",
    "HUMAN_OPERATOR"
  ]);


const VERIFICATION_STATES =
  new Set([
    "VERIFIED",
    "UNVERIFIED"
  ]);


const EXTERNAL_EVIDENCE_KINDS =
  new Set([
    "ACCEPTANCE",
    "COMPLETION",
    "OUTCOME"
  ]);


const OUTCOME_STATUSES =
  new Set([
    "SUCCEEDED",
    "FAILED",
    "PARTIAL",
    "REJECTED",
    "UNKNOWN"
  ]);


const FINALITY_STATES =
  new Set([
    "NOT_EVALUATED",
    "PROVISIONAL",
    "FINAL",
    "REVERSED",
    "UNKNOWN"
  ]);


const TOP_LEVEL_KEYS =
  new Set([
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
    "previous_evidence",
    "observation_evidence_sha256",
    "occurred_at",
    "recorded_at",
    "time_source",
    "evidence_source",
    "external_evidence",
    "outcome",
    "privacy"
  ]);


const REQUIRED_TOP_LEVEL_KEYS =
  [
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


const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "evidence_id",
    "evidence_type",
    "execution_id",
    "attempt_id",
    "authorization_id",
    "authorization_sha256",
    "consumption_id",
    "consumption_record_sha256",
    "evaluation_evt_id",
    "evaluation_evt_sha256",
    "request_sha256",
    "runtime_digest_sha256",
    "execution_payload_sha256",
    "idempotency_key_sha256",
    "appended_at",
    "evidence_sha256",
    "previous_record_sha256",
    "record_sha256",
    "evidence"
  ]);


function fail(code) {
  throw new Error(code);
}


function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value
      .map(canonicalize)
      .join(",")}]`;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const keys =
      Object.keys(value).sort();

    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalize(value[key])}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}


function sha256Canonical(value) {
  return createHash("sha256")
    .update(
      canonicalize(value),
      "utf8"
    )
    .digest("hex");
}


function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}


function assertObject(
  value,
  code
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    fail(code);
  }
}


function assertExactKeys(
  value,
  allowedKeys,
  requiredKeys,
  prefix
) {
  assertObject(
    value,
    `${prefix}_INVALID`
  );

  for (
    const key of
    Object.keys(value)
  ) {
    if (
      !allowedKeys.has(key)
    ) {
      fail(
        `${prefix}_UNKNOWN_FIELD:${key}`
      );
    }
  }

  for (
    const key of
    requiredKeys
  ) {
    if (
      value[key] ===
      undefined
    ) {
      fail(
        `${prefix}_MISSING_FIELD:${key}`
      );
    }
  }
}


function assertString(
  value,
  code,
  maxLength = 256
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    fail(code);
  }
}


function assertSha256(
  value,
  code
) {
  if (
    typeof value !== "string" ||
    !SHA256_PATTERN.test(value)
  ) {
    fail(code);
  }
}


function assertIsoDate(
  value,
  code
) {
  if (
    typeof value !== "string" ||
    Number.isNaN(
      Date.parse(value)
    )
  ) {
    fail(code);
  }
}


function assertId(
  value,
  pattern,
  code
) {
  if (
    typeof value !== "string" ||
    !pattern.test(value)
  ) {
    fail(code);
  }
}


function assertAuthorizationReference(
  value
) {
  const keys =
    new Set([
      "authorization_id",
      "authorization_sha256"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_AUTHORIZATION"
  );

  assertId(
    value.authorization_id,
    AUTHORIZATION_ID_PATTERN,
    "EXECUTION_EVIDENCE_AUTHORIZATION_ID_INVALID"
  );

  assertSha256(
    value.authorization_sha256,
    "EXECUTION_EVIDENCE_AUTHORIZATION_SHA256_INVALID"
  );
}


function assertConsumptionReference(
  value
) {
  const keys =
    new Set([
      "consumption_id",
      "consumption_record_sha256"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_CONSUMPTION"
  );

  assertId(
    value.consumption_id,
    CONSUMPTION_ID_PATTERN,
    "EXECUTION_EVIDENCE_CONSUMPTION_ID_INVALID"
  );

  assertSha256(
    value.consumption_record_sha256,
    "EXECUTION_EVIDENCE_CONSUMPTION_SHA256_INVALID"
  );
}


function assertEvtReference(
  value
) {
  const keys =
    new Set([
      "evt_id",
      "evt_sha256"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_EVT"
  );

  assertId(
    value.evt_id,
    EVT_ID_PATTERN,
    "EXECUTION_EVIDENCE_EVT_ID_INVALID"
  );

  assertSha256(
    value.evt_sha256,
    "EXECUTION_EVIDENCE_EVT_SHA256_INVALID"
  );
}


function assertPreviousEvidence(
  value
) {
  const keys =
    new Set([
      "evidence_id",
      "evidence_sha256"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_PREVIOUS"
  );

  assertId(
    value.evidence_id,
    EVIDENCE_ID_PATTERN,
    "EXECUTION_EVIDENCE_PREVIOUS_ID_INVALID"
  );

  assertSha256(
    value.evidence_sha256,
    "EXECUTION_EVIDENCE_PREVIOUS_SHA256_INVALID"
  );
}


function assertRuntimeBinding(
  value
) {
  const keys =
    new Set([
      "runtime_id",
      "runtime_type",
      "runtime_version",
      "runtime_digest_sha256"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_RUNTIME"
  );

  assertString(
    value.runtime_id,
    "EXECUTION_EVIDENCE_RUNTIME_ID_INVALID"
  );

  if (
    !RUNTIME_TYPES.has(
      value.runtime_type
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_RUNTIME_TYPE_INVALID"
    );
  }

  assertString(
    value.runtime_version,
    "EXECUTION_EVIDENCE_RUNTIME_VERSION_INVALID",
    128
  );

  assertSha256(
    value.runtime_digest_sha256,
    "EXECUTION_EVIDENCE_RUNTIME_DIGEST_INVALID"
  );
}


function assertIdempotency(
  value
) {
  const keys =
    new Set([
      "key_sha256",
      "scope",
      "external_enforcement"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_IDEMPOTENCY"
  );

  assertSha256(
    value.key_sha256,
    "EXECUTION_EVIDENCE_IDEMPOTENCY_KEY_INVALID"
  );

  if (
    !IDEMPOTENCY_SCOPES.has(
      value.scope
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_IDEMPOTENCY_SCOPE_INVALID"
    );
  }

  if (
    !IDEMPOTENCY_ENFORCEMENT.has(
      value.external_enforcement
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_IDEMPOTENCY_ENFORCEMENT_INVALID"
    );
  }
}


function assertTimeSource(
  value
) {
  const keys =
    new Set([
      "source",
      "trusted_external_time"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_TIME_SOURCE"
  );

  if (
    !TIME_SOURCES.has(
      value.source
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_TIME_SOURCE_INVALID"
    );
  }

  if (
    typeof value.trusted_external_time !==
      "boolean"
  ) {
    fail(
      "EXECUTION_EVIDENCE_TRUSTED_TIME_INVALID"
    );
  }

  if (
    value.source ===
      "LOCAL_SYSTEM_CLOCK" &&
    value.trusted_external_time !==
      false
  ) {
    fail(
      "EXECUTION_EVIDENCE_LOCAL_TIME_TRUST_INVALID"
    );
  }

  if (
    value.source ===
      "TRUSTED_TIMESTAMP_SERVICE" &&
    value.trusted_external_time !==
      true
  ) {
    fail(
      "EXECUTION_EVIDENCE_TRUSTED_TIMESTAMP_INVALID"
    );
  }
}


function assertEvidenceSource(
  value
) {
  const keys =
    new Set([
      "source_type",
      "source_reference",
      "verification_state"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_SOURCE"
  );

  if (
    !EVIDENCE_SOURCE_TYPES.has(
      value.source_type
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_SOURCE_TYPE_INVALID"
    );
  }

  assertString(
    value.source_reference,
    "EXECUTION_EVIDENCE_SOURCE_REFERENCE_INVALID"
  );

  if (
    !VERIFICATION_STATES.has(
      value.verification_state
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_SOURCE_VERIFICATION_INVALID"
    );
  }
}


function assertExternalEvidence(
  value
) {
  const allowed =
    new Set([
      "evidence_kind",
      "external_system_reference",
      "external_operation_reference",
      "evidence_sha256",
      "external_observed_at"
    ]);

  const required = [
    "evidence_kind",
    "external_system_reference",
    "external_operation_reference",
    "evidence_sha256"
  ];

  assertExactKeys(
    value,
    allowed,
    required,
    "EXECUTION_EVIDENCE_EXTERNAL"
  );

  if (
    !EXTERNAL_EVIDENCE_KINDS.has(
      value.evidence_kind
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_EXTERNAL_KIND_INVALID"
    );
  }

  assertString(
    value.external_system_reference,
    "EXECUTION_EVIDENCE_EXTERNAL_SYSTEM_INVALID"
  );

  assertString(
    value.external_operation_reference,
    "EXECUTION_EVIDENCE_EXTERNAL_OPERATION_INVALID"
  );

  assertSha256(
    value.evidence_sha256,
    "EXECUTION_EVIDENCE_EXTERNAL_SHA256_INVALID"
  );

  if (
    value.external_observed_at !==
    undefined
  ) {
    assertIsoDate(
      value.external_observed_at,
      "EXECUTION_EVIDENCE_EXTERNAL_TIME_INVALID"
    );
  }
}


function assertOutcome(
  value
) {
  const allowed =
    new Set([
      "status",
      "outcome_code",
      "finality",
      "business_reference"
    ]);

  const required = [
    "status",
    "outcome_code",
    "finality"
  ];

  assertExactKeys(
    value,
    allowed,
    required,
    "EXECUTION_EVIDENCE_OUTCOME"
  );

  if (
    !OUTCOME_STATUSES.has(
      value.status
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_OUTCOME_STATUS_INVALID"
    );
  }

  if (
    typeof value.outcome_code !==
      "string" ||
    !OUTCOME_CODE_PATTERN.test(
      value.outcome_code
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_OUTCOME_CODE_INVALID"
    );
  }

  if (
    !FINALITY_STATES.has(
      value.finality
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_FINALITY_INVALID"
    );
  }

  if (
    value.business_reference !==
    undefined
  ) {
    assertString(
      value.business_reference,
      "EXECUTION_EVIDENCE_BUSINESS_REFERENCE_INVALID"
    );
  }
}


function assertPrivacy(
  value
) {
  const keys =
    new Set([
      "raw_request_included",
      "raw_execution_payload_included",
      "raw_external_response_included"
    ]);

  assertExactKeys(
    value,
    keys,
    [...keys],
    "EXECUTION_EVIDENCE_PRIVACY"
  );

  if (
    value.raw_request_included !==
      false ||
    value.raw_execution_payload_included !==
      false ||
    value.raw_external_response_included !==
      false
  ) {
    fail(
      "EXECUTION_EVIDENCE_RAW_DATA_FORBIDDEN"
    );
  }
}


function assertExecutionEvidence(
  evidence
) {
  assertExactKeys(
    evidence,
    TOP_LEVEL_KEYS,
    REQUIRED_TOP_LEVEL_KEYS,
    "EXECUTION_EVIDENCE"
  );

  if (
    evidence.schema_version !==
      "1.0"
  ) {
    fail(
      "EXECUTION_EVIDENCE_SCHEMA_VERSION_INVALID"
    );
  }

  assertId(
    evidence.evidence_id,
    EVIDENCE_ID_PATTERN,
    "EXECUTION_EVIDENCE_ID_INVALID"
  );

  if (
    !EVIDENCE_TYPES.has(
      evidence.evidence_type
    )
  ) {
    fail(
      "EXECUTION_EVIDENCE_TYPE_INVALID"
    );
  }

  assertId(
    evidence.execution_id,
    EXECUTION_ID_PATTERN,
    "EXECUTION_EVIDENCE_EXECUTION_ID_INVALID"
  );

  assertId(
    evidence.attempt_id,
    ATTEMPT_ID_PATTERN,
    "EXECUTION_EVIDENCE_ATTEMPT_ID_INVALID"
  );

  assertAuthorizationReference(
    evidence.authorization
  );

  assertConsumptionReference(
    evidence.consumption
  );

  assertEvtReference(
    evidence.evaluation_evt
  );

  assertSha256(
    evidence.request_sha256,
    "EXECUTION_EVIDENCE_REQUEST_SHA256_INVALID"
  );

  assertRuntimeBinding(
    evidence.runtime_binding
  );

  assertSha256(
    evidence.execution_payload_sha256,
    "EXECUTION_EVIDENCE_PAYLOAD_SHA256_INVALID"
  );

  assertIdempotency(
    evidence.idempotency
  );

  assertSha256(
    evidence.observation_evidence_sha256,
    "EXECUTION_EVIDENCE_OBSERVATION_SHA256_INVALID"
  );

  assertIsoDate(
    evidence.occurred_at,
    "EXECUTION_EVIDENCE_OCCURRED_AT_INVALID"
  );

  assertIsoDate(
    evidence.recorded_at,
    "EXECUTION_EVIDENCE_RECORDED_AT_INVALID"
  );

  assertTimeSource(
    evidence.time_source
  );

  assertEvidenceSource(
    evidence.evidence_source
  );

  assertPrivacy(
    evidence.privacy
  );


  if (
    evidence.evidence_type ===
      "EXECUTION_ATTEMPTED"
  ) {
    if (
      evidence.previous_evidence !==
        undefined
    ) {
      fail(
        "EXECUTION_ATTEMPT_PREVIOUS_EVIDENCE_FORBIDDEN"
      );
    }

    if (
      evidence.external_evidence !==
        undefined
    ) {
      fail(
        "EXECUTION_ATTEMPT_EXTERNAL_EVIDENCE_FORBIDDEN"
      );
    }

    if (
      evidence.outcome !==
        undefined
    ) {
      fail(
        "EXECUTION_ATTEMPT_OUTCOME_FORBIDDEN"
      );
    }

    return;
  }


  if (
    evidence.previous_evidence ===
      undefined
  ) {
    fail(
      "EXECUTION_PREVIOUS_EVIDENCE_REQUIRED"
    );
  }

  assertPreviousEvidence(
    evidence.previous_evidence
  );


  if (
    evidence.external_evidence ===
      undefined
  ) {
    fail(
      "EXECUTION_EXTERNAL_EVIDENCE_REQUIRED"
    );
  }

  assertExternalEvidence(
    evidence.external_evidence
  );


  if (
    evidence.evidence_source
      .verification_state !==
      "VERIFIED"
  ) {
    fail(
      "EXECUTION_EXTERNAL_STAGE_SOURCE_UNVERIFIED"
    );
  }


  if (
    evidence.evidence_type ===
      "EXECUTION_ACCEPTED"
  ) {
    if (
      evidence.external_evidence
        .evidence_kind !==
        "ACCEPTANCE"
    ) {
      fail(
        "EXECUTION_ACCEPTANCE_EVIDENCE_KIND_INVALID"
      );
    }

    if (
      evidence.outcome !==
        undefined
    ) {
      fail(
        "EXECUTION_ACCEPTANCE_OUTCOME_FORBIDDEN"
      );
    }

    return;
  }


  if (
    evidence.evidence_type ===
      "EXECUTION_COMPLETED"
  ) {
    if (
      evidence.external_evidence
        .evidence_kind !==
        "COMPLETION"
    ) {
      fail(
        "EXECUTION_COMPLETION_EVIDENCE_KIND_INVALID"
      );
    }

    if (
      evidence.outcome !==
        undefined
    ) {
      fail(
        "EXECUTION_COMPLETION_OUTCOME_FORBIDDEN"
      );
    }

    return;
  }


  if (
    evidence.external_evidence
      .evidence_kind !==
      "OUTCOME"
  ) {
    fail(
      "EXECUTION_OUTCOME_EVIDENCE_KIND_INVALID"
    );
  }

  if (
    evidence.outcome ===
      undefined
  ) {
    fail(
      "EXECUTION_OUTCOME_REQUIRED"
    );
  }

  assertOutcome(
    evidence.outcome
  );
}


function sameCanonical(
  left,
  right
) {
  return (
    canonicalize(left) ===
    canonicalize(right)
  );
}


function assertIdempotencyProgress(
  previous,
  current
) {
  if (
    previous.key_sha256 !==
      current.key_sha256 ||
    previous.scope !==
      current.scope
  ) {
    fail(
      "EXECUTION_IDEMPOTENCY_BINDING_MISMATCH"
    );
  }

  const previousState =
    previous.external_enforcement;

  const currentState =
    current.external_enforcement;


  if (
    previousState ===
      "CONFIRMED" &&
    currentState !==
      "CONFIRMED"
  ) {
    fail(
      "EXECUTION_IDEMPOTENCY_ENFORCEMENT_REGRESSION"
    );
  }


  if (
    previousState ===
      "NOT_APPLICABLE" &&
    currentState !==
      "NOT_APPLICABLE"
  ) {
    fail(
      "EXECUTION_IDEMPOTENCY_ENFORCEMENT_REGRESSION"
    );
  }
}


function assertExecutionTransition(
  records,
  evidence,
  evidenceSha256
) {
  const sameExecution =
    records.filter(
      (record) =>
        record.execution_id ===
        evidence.execution_id
    );


  const consumptionBoundElsewhere =
    records.find(
      (record) =>
        record.consumption_id ===
          evidence.consumption
            .consumption_id &&
        record.execution_id !==
          evidence.execution_id
    );


  if (
    consumptionBoundElsewhere
  ) {
    fail(
      "EXECUTION_CONSUMPTION_ALREADY_BOUND"
    );
  }


  const attemptBoundElsewhere =
    records.find(
      (record) =>
        record.attempt_id ===
          evidence.attempt_id &&
        record.execution_id !==
          evidence.execution_id
    );


  if (
    attemptBoundElsewhere
  ) {
    fail(
      "EXECUTION_ATTEMPT_ALREADY_BOUND"
    );
  }


  if (
    sameExecution.length ===
      0
  ) {
    if (
      evidence.evidence_type !==
        "EXECUTION_ATTEMPTED"
    ) {
      fail(
        "EXECUTION_SEQUENCE_MUST_START_ATTEMPTED"
      );
    }

    if (
      evidence.previous_evidence !==
        undefined
    ) {
      fail(
        "EXECUTION_INITIAL_PREVIOUS_EVIDENCE_FORBIDDEN"
      );
    }

    return;
  }


  const previousRecord =
    sameExecution[
      sameExecution.length - 1
    ];

  const previousEvidence =
    previousRecord.evidence;


  if (
    evidence.attempt_id !==
      previousEvidence.attempt_id
  ) {
    fail(
      "EXECUTION_ATTEMPT_BINDING_MISMATCH"
    );
  }


  if (
    evidence.previous_evidence ===
      undefined ||
    evidence.previous_evidence
      .evidence_id !==
      previousEvidence.evidence_id ||
    evidence.previous_evidence
      .evidence_sha256 !==
      previousRecord.evidence_sha256
  ) {
    fail(
      "EXECUTION_PREVIOUS_EVIDENCE_MISMATCH"
    );
  }


  const allowedNext =
    ALLOWED_NEXT_EVIDENCE_TYPES[
      previousEvidence.evidence_type
    ];


  if (
    allowedNext.length ===
      0
  ) {
    fail(
      "EXECUTION_SEQUENCE_ALREADY_TERMINAL"
    );
  }


  if (
    !allowedNext.includes(
      evidence.evidence_type
    )
  ) {
    fail(
      "EXECUTION_TRANSITION_INVALID"
    );
  }


  /*
   * Negative terminal outcomes may occur before technical
   * acceptance or completion.
   *
   * A successful business outcome, however, may not be
   * inferred without an observed COMPLETED stage.
   */

  if (
    evidence.evidence_type ===
      "OUTCOME_OBSERVED" &&
    evidence.outcome.status ===
      "SUCCEEDED" &&
    previousEvidence.evidence_type !==
      "EXECUTION_COMPLETED"
  ) {
    fail(
      "EXECUTION_SUCCESS_REQUIRES_COMPLETION"
    );
  }


  for (
    const [
      currentValue,
      previousValue,
      code
    ] of [
      [
        evidence.authorization,
        previousEvidence.authorization,
        "EXECUTION_AUTHORIZATION_BINDING_MISMATCH"
      ],
      [
        evidence.consumption,
        previousEvidence.consumption,
        "EXECUTION_CONSUMPTION_BINDING_MISMATCH"
      ],
      [
        evidence.evaluation_evt,
        previousEvidence.evaluation_evt,
        "EXECUTION_EVT_BINDING_MISMATCH"
      ],
      [
        evidence.runtime_binding,
        previousEvidence.runtime_binding,
        "EXECUTION_RUNTIME_BINDING_MISMATCH"
      ]
    ]
  ) {
    if (
      !sameCanonical(
        currentValue,
        previousValue
      )
    ) {
      fail(code);
    }
  }


  if (
    evidence.request_sha256 !==
      previousEvidence.request_sha256
  ) {
    fail(
      "EXECUTION_REQUEST_BINDING_MISMATCH"
    );
  }


  if (
    evidence.execution_payload_sha256 !==
      previousEvidence
        .execution_payload_sha256
  ) {
    fail(
      "EXECUTION_PAYLOAD_BINDING_MISMATCH"
    );
  }


  assertIdempotencyProgress(
    previousEvidence.idempotency,
    evidence.idempotency
  );


  /*
   * No claim is made that occurred_at values from
   * heterogeneous clocks establish causality.
   *
   * Exact transition order is instead bound by:
   * - append order,
   * - previous_evidence,
   * - global record hash chain.
   */

  void evidenceSha256;
}


function assertAdmissionProvenanceCryptographic(
  consumption,
  admissionTrustRegistryPath
) {
  assertString(
    admissionTrustRegistryPath,
    "EXECUTION_ADMISSION_TRUST_REGISTRY_PATH_REQUIRED"
  );


  let verification;


  try {
    verification =
      verifyAdmissionConsumptionSignature({
        record:
          consumption,

        trustRegistryPath:
          admissionTrustRegistryPath
      });
  } catch {
    /*
     * Do not leak lower-layer parser, trust-registry or
     * cryptographic diagnostics through the execution
     * admission decision surface.
     */
    fail(
      "EXECUTION_ADMISSION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
    );
  }


  if (
    verification.valid !==
      true ||
    verification.signature_valid !==
      true ||
    verification.key_control_proven !==
      true ||
    verification.trusted_as_of_consumed_at !==
      true ||
    verification.signer_id !==
      consumption.admission_signer_id ||
    verification.key_id !==
      consumption.admission_key_id ||
    verification.public_key_sha256 !==
      consumption.admission_public_key_sha256 ||
    verification.trust_record_sha256 !==
      consumption.admission_trust_record_sha256 ||
    verification.signed_payload_sha256 !==
      consumption.admission_signed_payload_sha256
  ) {
    fail(
      "EXECUTION_ADMISSION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
    );
  }


  return verification;
}


function assertConsumptionBinding(
  evidence,
  consumptionRegistryPath,
  admissionTrustRegistryPath
) {
  assertString(
    consumptionRegistryPath,
    "EXECUTION_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );


  const verification =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    verification.valid !==
      true
  ) {
    fail(
      "EXECUTION_CONSUMPTION_REGISTRY_INVALID"
    );
  }


  const consumption =
    getAuthorizationConsumption({
      registryPath:
        consumptionRegistryPath,

      authorizationId:
        evidence.authorization
          .authorization_id
    });


  if (!consumption) {
    fail(
      "EXECUTION_CONSUMPTION_NOT_FOUND"
    );
  }


  if (
    consumption.consumption_id !==
      evidence.consumption
        .consumption_id
  ) {
    fail(
      "EXECUTION_CONSUMPTION_ID_MISMATCH"
    );
  }


  if (
    consumption.record_sha256 !==
      evidence.consumption
        .consumption_record_sha256
  ) {
    fail(
      "EXECUTION_CONSUMPTION_RECORD_SHA256_MISMATCH"
    );
  }


  if (
    consumption.authorization_id !==
      evidence.authorization
        .authorization_id ||
    consumption.authorization_sha256 !==
      evidence.authorization
        .authorization_sha256
  ) {
    fail(
      "EXECUTION_CONSUMPTION_AUTHORIZATION_BINDING_MISMATCH"
    );
  }


  if (
    consumption.evaluation_evt_id !==
      evidence.evaluation_evt
        .evt_id ||
    consumption.evaluation_evt_sha256 !==
      evidence.evaluation_evt
        .evt_sha256
  ) {
    fail(
      "EXECUTION_CONSUMPTION_EVT_BINDING_MISMATCH"
    );
  }


  /*
   * Admission-runtime continuity is established at the
   * first execution evidence only.
   *
   * Later evidence stages inherit runtime continuity from
   * assertExecutionTransition(), which compares each stage
   * against the previously recorded execution evidence.
   *
   * This preserves distinct failure semantics:
   *
   * admission substitution
   *   -> EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH
   *
   * post-admission stage substitution
   *   -> EXECUTION_RUNTIME_BINDING_MISMATCH
   */

  if (
    evidence.evidence_type ===
      "EXECUTION_ATTEMPTED"
  ) {
    if (
      consumption.registry_version !==
        "1.2" ||
      typeof consumption
        .presented_runtime_binding_sha256 !==
        "string" ||
      typeof consumption
        .admission_signer_id !==
        "string" ||
      typeof consumption
        .admission_key_id !==
        "string" ||
      typeof consumption
        .admission_public_key_sha256 !==
        "string" ||
      typeof consumption
        .admission_trust_record_sha256 !==
        "string" ||
      typeof consumption
        .admission_signed_payload_sha256 !==
        "string" ||
      consumption
        .admission_signature_algorithm !==
        "ED25519" ||
      typeof consumption
        .admission_signature_base64 !==
        "string"
    ) {
      fail(
        "EXECUTION_ADMISSION_SIGNED_CONSUMPTION_REQUIRED"
      );
    }


    /*
     * A018 independently verifies admission provenance at
     * the execution boundary.
     *
     * The execution consumer does not trust the fact that
     * A012/A013 previously verified the signature.
     *
     * It reconstructs and verifies the signed admission
     * consumption again against the bound historical trust
     * state as-of consumed_at.
     *
     * This does not prove current signer trust at execution
     * time and does not establish trusted external time.
     */


    assertAdmissionProvenanceCryptographic(
      consumption,
      admissionTrustRegistryPath
    );


    const executionRuntimeBindingSha256 =
      sha256Canonical(
        evidence.runtime_binding
      );


    if (
      executionRuntimeBindingSha256 !==
        consumption
          .presented_runtime_binding_sha256
    ) {
      fail(
        "EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH"
      );
    }
  }


  return consumption;
}


function acquireLock(
  registryPath
) {
  const lockPath =
    `${registryPath}.lock`;

  let fd;

  try {
    fd =
      openSync(
        lockPath,
        "wx"
      );
  } catch {
    fail(
      "EXECUTION_REGISTRY_LOCKED"
    );
  }


  return {
    fd,
    lockPath
  };
}


function releaseLock(lock) {
  try {
    closeSync(
      lock.fd
    );
  } finally {
    if (
      existsSync(
        lock.lockPath
      )
    ) {
      unlinkSync(
        lock.lockPath
      );
    }
  }
}


function parseRegistry(
  registryPath,
  {
    allowMissing = false
  } = {}
) {
  if (
    !existsSync(
      registryPath
    )
  ) {
    if (allowMissing) {
      return [];
    }

    fail(
      "EXECUTION_REGISTRY_UNAVAILABLE"
    );
  }


  const raw =
    readFileSync(
      registryPath,
      "utf8"
    );


  if (
    raw.trim() ===
      ""
  ) {
    return [];
  }


  const lines =
    raw
      .split("\n")
      .filter(Boolean);


  const records = [];

  const seenEvidenceIds =
    new Set();

  let expectedPreviousRecordSha256 =
    null;

  let previousAppendedAtMs =
    null;


  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const lineNumber =
      index + 1;

    let record;

    try {
      record =
        JSON.parse(
          lines[index]
        );
    } catch {
      fail(
        `EXECUTION_REGISTRY_CORRUPT_JSON_LINE:${lineNumber}`
      );
    }


    assertObject(
      record,
      `EXECUTION_REGISTRY_CORRUPT_RECORD:${lineNumber}`
    );


    for (
      const key of
      Object.keys(record)
    ) {
      if (
        !RECORD_KEYS.has(key)
      ) {
        fail(
          `EXECUTION_REGISTRY_UNKNOWN_FIELD:${lineNumber}:${key}`
        );
      }
    }


    if (
      Object.keys(record).length !==
        RECORD_KEYS.size
    ) {
      fail(
        `EXECUTION_REGISTRY_FIELD_SET_INVALID:${lineNumber}`
      );
    }


    if (
      record.registry_version !==
        "1.0" ||
      record.record_type !==
        "EXECUTION_EVIDENCE_RECORDED"
    ) {
      fail(
        `EXECUTION_REGISTRY_RECORD_TYPE_INVALID:${lineNumber}`
      );
    }


    assertExecutionEvidence(
      record.evidence
    );


    assertId(
      record.evidence_id,
      EVIDENCE_ID_PATTERN,
      `EXECUTION_REGISTRY_EVIDENCE_ID_INVALID:${lineNumber}`
    );

    assertId(
      record.execution_id,
      EXECUTION_ID_PATTERN,
      `EXECUTION_REGISTRY_EXECUTION_ID_INVALID:${lineNumber}`
    );

    assertId(
      record.attempt_id,
      ATTEMPT_ID_PATTERN,
      `EXECUTION_REGISTRY_ATTEMPT_ID_INVALID:${lineNumber}`
    );

    assertId(
      record.authorization_id,
      AUTHORIZATION_ID_PATTERN,
      `EXECUTION_REGISTRY_AUTHORIZATION_ID_INVALID:${lineNumber}`
    );

    assertId(
      record.consumption_id,
      CONSUMPTION_ID_PATTERN,
      `EXECUTION_REGISTRY_CONSUMPTION_ID_INVALID:${lineNumber}`
    );

    assertId(
      record.evaluation_evt_id,
      EVT_ID_PATTERN,
      `EXECUTION_REGISTRY_EVT_ID_INVALID:${lineNumber}`
    );


    for (
      const [
        value,
        code
      ] of [
        [
          record.authorization_sha256,
          `EXECUTION_REGISTRY_AUTHORIZATION_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.consumption_record_sha256,
          `EXECUTION_REGISTRY_CONSUMPTION_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.evaluation_evt_sha256,
          `EXECUTION_REGISTRY_EVT_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.request_sha256,
          `EXECUTION_REGISTRY_REQUEST_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.runtime_digest_sha256,
          `EXECUTION_REGISTRY_RUNTIME_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.execution_payload_sha256,
          `EXECUTION_REGISTRY_PAYLOAD_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.idempotency_key_sha256,
          `EXECUTION_REGISTRY_IDEMPOTENCY_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.evidence_sha256,
          `EXECUTION_REGISTRY_EVIDENCE_SHA256_INVALID:${lineNumber}`
        ],
        [
          record.record_sha256,
          `EXECUTION_REGISTRY_RECORD_SHA256_INVALID:${lineNumber}`
        ]
      ]
    ) {
      assertSha256(
        value,
        code
      );
    }


    assertIsoDate(
      record.appended_at,
      `EXECUTION_REGISTRY_APPENDED_AT_INVALID:${lineNumber}`
    );


    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `EXECUTION_REGISTRY_PREVIOUS_SHA256_INVALID:${lineNumber}`
      );
    }


    if (
      record.previous_record_sha256 !==
        expectedPreviousRecordSha256
    ) {
      fail(
        `EXECUTION_REGISTRY_CHAIN_MISMATCH:${lineNumber}`
      );
    }


    const appendedAtMs =
      Date.parse(
        record.appended_at
      );


    if (
      previousAppendedAtMs !==
        null &&
      appendedAtMs <
        previousAppendedAtMs
    ) {
      fail(
        `EXECUTION_REGISTRY_TIME_ORDER_MISMATCH:${lineNumber}`
      );
    }


    const evidenceSha256 =
      sha256Canonical(
        record.evidence
      );


    if (
      evidenceSha256 !==
        record.evidence_sha256
    ) {
      fail(
        `EXECUTION_REGISTRY_EVIDENCE_HASH_MISMATCH:${lineNumber}`
      );
    }


    const evidence =
      record.evidence;


    const envelopeBindings = [
      [
        record.evidence_id,
        evidence.evidence_id,
        "EVIDENCE_ID"
      ],
      [
        record.evidence_type,
        evidence.evidence_type,
        "EVIDENCE_TYPE"
      ],
      [
        record.execution_id,
        evidence.execution_id,
        "EXECUTION_ID"
      ],
      [
        record.attempt_id,
        evidence.attempt_id,
        "ATTEMPT_ID"
      ],
      [
        record.authorization_id,
        evidence.authorization
          .authorization_id,
        "AUTHORIZATION_ID"
      ],
      [
        record.authorization_sha256,
        evidence.authorization
          .authorization_sha256,
        "AUTHORIZATION_SHA256"
      ],
      [
        record.consumption_id,
        evidence.consumption
          .consumption_id,
        "CONSUMPTION_ID"
      ],
      [
        record.consumption_record_sha256,
        evidence.consumption
          .consumption_record_sha256,
        "CONSUMPTION_SHA256"
      ],
      [
        record.evaluation_evt_id,
        evidence.evaluation_evt
          .evt_id,
        "EVT_ID"
      ],
      [
        record.evaluation_evt_sha256,
        evidence.evaluation_evt
          .evt_sha256,
        "EVT_SHA256"
      ],
      [
        record.request_sha256,
        evidence.request_sha256,
        "REQUEST_SHA256"
      ],
      [
        record.runtime_digest_sha256,
        evidence.runtime_binding
          .runtime_digest_sha256,
        "RUNTIME_SHA256"
      ],
      [
        record.execution_payload_sha256,
        evidence.execution_payload_sha256,
        "PAYLOAD_SHA256"
      ],
      [
        record.idempotency_key_sha256,
        evidence.idempotency
          .key_sha256,
        "IDEMPOTENCY_SHA256"
      ]
    ];


    for (
      const [
        envelopeValue,
        evidenceValue,
        name
      ] of envelopeBindings
    ) {
      if (
        envelopeValue !==
          evidenceValue
      ) {
        fail(
          `EXECUTION_REGISTRY_ENVELOPE_${name}_MISMATCH:${lineNumber}`
        );
      }
    }


    if (
      seenEvidenceIds.has(
        record.evidence_id
      )
    ) {
      fail(
        "EXECUTION_REGISTRY_DUPLICATE_EVIDENCE_ID"
      );
    }


    assertExecutionTransition(
      records,
      evidence,
      evidenceSha256
    );


    const recordHashBasis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      evidence_id:
        record.evidence_id,

      evidence_type:
        record.evidence_type,

      execution_id:
        record.execution_id,

      attempt_id:
        record.attempt_id,

      authorization_id:
        record.authorization_id,

      authorization_sha256:
        record.authorization_sha256,

      consumption_id:
        record.consumption_id,

      consumption_record_sha256:
        record.consumption_record_sha256,

      evaluation_evt_id:
        record.evaluation_evt_id,

      evaluation_evt_sha256:
        record.evaluation_evt_sha256,

      request_sha256:
        record.request_sha256,

      runtime_digest_sha256:
        record.runtime_digest_sha256,

      execution_payload_sha256:
        record.execution_payload_sha256,

      idempotency_key_sha256:
        record.idempotency_key_sha256,

      appended_at:
        record.appended_at,

      evidence_sha256:
        record.evidence_sha256,

      previous_record_sha256:
        record.previous_record_sha256,

      evidence:
        record.evidence
    };


    const calculatedRecordSha256 =
      sha256Canonical(
        recordHashBasis
      );


    if (
      calculatedRecordSha256 !==
        record.record_sha256
    ) {
      fail(
        `EXECUTION_REGISTRY_RECORD_HASH_MISMATCH:${lineNumber}`
      );
    }


    seenEvidenceIds.add(
      record.evidence_id
    );

    records.push(
      record
    );

    expectedPreviousRecordSha256 =
      record.record_sha256;

    previousAppendedAtMs =
      appendedAtMs;
  }


  return records;
}


export function appendExecutionEvidence({
  registryPath,
  consumptionRegistryPath,
  admissionTrustRegistryPath,
  evidence,
  appendedAt
}) {
  assertString(
    registryPath,
    "EXECUTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    consumptionRegistryPath,
    "EXECUTION_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  assertIsoDate(
    appendedAt,
    "EXECUTION_REGISTRY_APPEND_TIME_INVALID"
  );


  const immutableEvidence =
    clone(
      evidence
    );


  assertExecutionEvidence(
    immutableEvidence
  );


  const consumption =
    assertConsumptionBinding(
      immutableEvidence,
      consumptionRegistryPath,
      admissionTrustRegistryPath
    );


  if (
    Date.parse(
      appendedAt
    ) <
    Date.parse(
      consumption.consumed_at
    )
  ) {
    fail(
      "EXECUTION_REGISTRY_APPEND_BEFORE_CONSUMPTION"
    );
  }


  const evidenceSha256 =
    sha256Canonical(
      immutableEvidence
    );


  const lock =
    acquireLock(
      registryPath
    );


  try {
    const records =
      parseRegistry(
        registryPath,
        {
          allowMissing:
            true
        }
      );


    if (
      records.some(
        (record) =>
          record.evidence_id ===
          immutableEvidence
            .evidence_id
      )
    ) {
      fail(
        "EXECUTION_EVIDENCE_ALREADY_REGISTERED"
      );
    }


    if (
      records.length > 0 &&
      Date.parse(
        appendedAt
      ) <
      Date.parse(
        records[
          records.length - 1
        ].appended_at
      )
    ) {
      fail(
        "EXECUTION_REGISTRY_TIME_ORDER_INVALID"
      );
    }


    assertExecutionTransition(
      records,
      immutableEvidence,
      evidenceSha256
    );


    const previousRecordSha256 =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256;


    const recordHashBasis = {
      registry_version:
        "1.0",

      record_type:
        "EXECUTION_EVIDENCE_RECORDED",

      evidence_id:
        immutableEvidence
          .evidence_id,

      evidence_type:
        immutableEvidence
          .evidence_type,

      execution_id:
        immutableEvidence
          .execution_id,

      attempt_id:
        immutableEvidence
          .attempt_id,

      authorization_id:
        immutableEvidence
          .authorization
          .authorization_id,

      authorization_sha256:
        immutableEvidence
          .authorization
          .authorization_sha256,

      consumption_id:
        immutableEvidence
          .consumption
          .consumption_id,

      consumption_record_sha256:
        immutableEvidence
          .consumption
          .consumption_record_sha256,

      evaluation_evt_id:
        immutableEvidence
          .evaluation_evt
          .evt_id,

      evaluation_evt_sha256:
        immutableEvidence
          .evaluation_evt
          .evt_sha256,

      request_sha256:
        immutableEvidence
          .request_sha256,

      runtime_digest_sha256:
        immutableEvidence
          .runtime_binding
          .runtime_digest_sha256,

      execution_payload_sha256:
        immutableEvidence
          .execution_payload_sha256,

      idempotency_key_sha256:
        immutableEvidence
          .idempotency
          .key_sha256,

      appended_at:
        appendedAt,

      evidence_sha256:
        evidenceSha256,

      previous_record_sha256:
        previousRecordSha256,

      evidence:
        immutableEvidence
    };


    const record = {
      ...recordHashBasis,

      record_sha256:
        sha256Canonical(
          recordHashBasis
        )
    };


    appendFileSync(
      registryPath,
      `${JSON.stringify(record)}\n`,
      {
        encoding:
          "utf8",

        flag:
          "a"
      }
    );


    return clone(
      record
    );

  } finally {
    releaseLock(
      lock
    );
  }
}


export function getExecutionEvidence({
  registryPath,
  evidenceId
}) {
  assertId(
    evidenceId,
    EVIDENCE_ID_PATTERN,
    "EXECUTION_EVIDENCE_ID_INVALID"
  );


  const record =
    parseRegistry(
      registryPath
    ).find(
      (item) =>
        item.evidence_id ===
        evidenceId
    );


  return record
    ? clone(record)
    : null;
}


export function listExecutionEvidence({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function listExecutionEvidenceForExecution({
  registryPath,
  executionId
}) {
  assertId(
    executionId,
    EXECUTION_ID_PATTERN,
    "EXECUTION_EVIDENCE_EXECUTION_ID_INVALID"
  );


  return clone(
    parseRegistry(
      registryPath
    ).filter(
      (record) =>
        record.execution_id ===
        executionId
    )
  );
}


export function verifyExecutionEvidenceRegistry({
  registryPath,
  consumptionRegistryPath,
  admissionTrustRegistryPath
}) {
  assertString(
    consumptionRegistryPath,
    "EXECUTION_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    admissionTrustRegistryPath,
    "EXECUTION_ADMISSION_TRUST_REGISTRY_PATH_REQUIRED"
  );


  const records =
    parseRegistry(
      registryPath
    );


  for (
    const record of
    records
  ) {
    assertConsumptionBinding(
      record.evidence,
      consumptionRegistryPath,
      admissionTrustRegistryPath
    );
  }


  return {
    valid:
      true,

    registry_version:
      "1.0",

    record_count:
      records.length,

    execution_count:
      new Set(
        records.map(
          (record) =>
            record.execution_id
        )
      ).size,

    head_record_sha256:
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256
  };
}
