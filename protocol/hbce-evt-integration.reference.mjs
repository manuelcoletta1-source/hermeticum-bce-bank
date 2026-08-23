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


const EVT_ID_PATTERN =
  /^EVT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const DECISIONS =
  new Set([
    "ALLOW",
    "DENY"
  ]);


const AUTHORIZED_CHECKS =
  Object.freeze([
    "MANDATE_VALID",
    "AUTHORITY_VALID",
    "AUTHORIZATION_VALID",
    "REQUEST_WITHIN_SCOPE",
    "DECISION_BOUND",
    "SUBJECT_BOUND",
    "RUNTIME_VALID",
    "REVOCATION_CLEAR"
  ]);


const AUTHORIZED_CHECK_SET =
  new Set(
    AUTHORIZED_CHECKS
  );


const REASON_CODE_PATTERN =
  /^[A-Z][A-Z0-9_]{1,63}$/;


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
  code
) {
  const allowed =
    new Set(
      allowedKeys
    );

  const unknown =
    Object.keys(value)
      .filter(
        (key) =>
          !allowed.has(key)
      )
      .sort();

  if (
    unknown.length > 0
  ) {
    fail(
      `${code}:${unknown.join(",")}`
    );
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


function assertEvaluationResult(
  evaluationResult
) {
  assertObject(
    evaluationResult,
    "EVT_EVALUATION_RESULT_INVALID"
  );

  assertExactKeys(
    evaluationResult,
    [
      "decision",
      "reason_code",
      "checks"
    ],
    "EVT_RESULT_UNKNOWN_FIELD"
  );

  if (
    !DECISIONS.has(
      evaluationResult.decision
    )
  ) {
    fail(
      "EVT_DECISION_INVALID"
    );
  }

  assertString(
    evaluationResult.reason_code,
    "EVT_REASON_CODE_INVALID",
    64
  );

  if (
    !REASON_CODE_PATTERN.test(
      evaluationResult.reason_code
    )
  ) {
    fail(
      "EVT_REASON_CODE_VOCABULARY_INVALID"
    );
  }

  if (
    !Array.isArray(
      evaluationResult.checks
    )
  ) {
    fail(
      "EVT_CHECKS_INVALID"
    );
  }

  if (
    evaluationResult.checks.length >
    AUTHORIZED_CHECKS.length
  ) {
    fail(
      "EVT_CHECKS_CARDINALITY_INVALID"
    );
  }

  const seenChecks =
    new Set();

  for (
    const check of
    evaluationResult.checks
  ) {
    assertString(
      check,
      "EVT_CHECK_INVALID",
      64
    );

    if (
      !AUTHORIZED_CHECK_SET.has(
        check
      )
    ) {
      fail(
        "EVT_CHECK_VOCABULARY_INVALID"
      );
    }

    if (
      seenChecks.has(
        check
      )
    ) {
      fail(
        "EVT_CHECK_DUPLICATE"
      );
    }

    seenChecks.add(
      check
    );
  }

  if (
    evaluationResult.decision ===
    "ALLOW"
  ) {
    if (
      evaluationResult.reason_code !==
      "AUTHORIZED"
    ) {
      fail(
        "EVT_ALLOW_REASON_INVALID"
      );
    }

    if (
      evaluationResult.checks.length !==
      AUTHORIZED_CHECKS.length
    ) {
      fail(
        "EVT_ALLOW_CHECKS_INVALID"
      );
    }

    for (
      let index = 0;
      index < AUTHORIZED_CHECKS.length;
      index += 1
    ) {
      if (
        evaluationResult.checks[index] !==
        AUTHORIZED_CHECKS[index]
      ) {
        fail(
          "EVT_ALLOW_CHECKS_INVALID"
        );
      }
    }

    return;
  }

  if (
    evaluationResult.reason_code ===
    "AUTHORIZED"
  ) {
    fail(
      "EVT_DENY_REASON_INVALID"
    );
  }

  if (
    evaluationResult.checks.length !==
    0
  ) {
    fail(
      "EVT_DENY_CHECKS_INVALID"
    );
  }
}


function assertRuntimeBinding(
  runtimeBinding
) {
  assertObject(
    runtimeBinding,
    "EVT_RUNTIME_BINDING_INVALID"
  );

  assertExactKeys(
    runtimeBinding,
    [
      "runtime_id",
      "runtime_type",
      "runtime_version",
      "runtime_digest_sha256"
    ],
    "EVT_RUNTIME_BINDING_UNKNOWN_FIELD"
  );

  assertString(
    runtimeBinding.runtime_id,
    "EVT_RUNTIME_ID_INVALID"
  );

  assertString(
    runtimeBinding.runtime_type,
    "EVT_RUNTIME_TYPE_INVALID",
    128
  );

  assertString(
    runtimeBinding.runtime_version,
    "EVT_RUNTIME_VERSION_INVALID",
    128
  );

  assertSha256(
    runtimeBinding.runtime_digest_sha256,
    "EVT_RUNTIME_DIGEST_INVALID"
  );
}


function assertRegistryAnchors(
  registryAnchors
) {
  assertObject(
    registryAnchors,
    "EVT_REGISTRY_ANCHORS_INVALID"
  );

  assertExactKeys(
    registryAnchors,
    [
      "mandate_record_sha256",
      "runtime_record_sha256",
      "revocation_as_of_record_count",
      "revocation_as_of_head_record_sha256"
    ],
    "EVT_REGISTRY_ANCHORS_UNKNOWN_FIELD"
  );

  assertSha256(
    registryAnchors.mandate_record_sha256,
    "EVT_MANDATE_RECORD_SHA256_INVALID"
  );

  assertSha256(
    registryAnchors.runtime_record_sha256,
    "EVT_RUNTIME_RECORD_SHA256_INVALID"
  );

  if (
    !Number.isInteger(
      registryAnchors
        .revocation_as_of_record_count
    ) ||
    registryAnchors
      .revocation_as_of_record_count < 0
  ) {
    fail(
      "EVT_REVOCATION_REGISTRY_COUNT_INVALID"
    );
  }

  if (
    registryAnchors
      .revocation_as_of_record_count ===
    0
  ) {
    if (
      registryAnchors
        .revocation_as_of_head_record_sha256 !==
      null
    ) {
      fail(
        "EVT_REVOCATION_REGISTRY_ANCHOR_INVALID"
      );
    }

    return;
  }

  if (
    registryAnchors
      .revocation_as_of_head_record_sha256 ===
    null
  ) {
    fail(
      "EVT_REVOCATION_REGISTRY_ANCHOR_INVALID"
    );
  }

  assertSha256(
    registryAnchors
      .revocation_as_of_head_record_sha256,
    "EVT_REVOCATION_REGISTRY_HEAD_SHA256_INVALID"
  );
}


function assertEvent(
  event
) {
  assertObject(
    event,
    "EVT_INVALID_OBJECT"
  );

  assertExactKeys(
    event,
    [
      "schema_version",
      "evt_id",
      "evt_type",
      "occurred_at",
      "evaluator",
      "references",
      "artifact_hashes",
      "registry_anchors",
      "request_sha256",
      "runtime_binding",
      "result",
      "privacy",
      "execution_reference"
    ],
    "EVT_UNKNOWN_FIELD"
  );

  if (
    event.schema_version !==
      "1.1" &&
    event.schema_version !==
      "1.2"
  ) {
    fail(
      "EVT_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof event.evt_id !==
      "string" ||
    !EVT_ID_PATTERN.test(
      event.evt_id
    )
  ) {
    fail(
      "EVT_ID_INVALID"
    );
  }

  if (
    event.evt_type !==
    "AUTHORIZATION_EVALUATED"
  ) {
    fail(
      "EVT_TYPE_INVALID"
    );
  }

  assertIsoDate(
    event.occurred_at,
    "EVT_OCCURRED_AT_INVALID"
  );

  assertObject(
    event.evaluator,
    "EVT_EVALUATOR_INVALID"
  );

  assertExactKeys(
    event.evaluator,
    [
      "evaluator_id",
      "evaluator_version",
      "evaluator_sha256"
    ],
    "EVT_EVALUATOR_UNKNOWN_FIELD"
  );

  assertString(
    event.evaluator.evaluator_id,
    "EVT_EVALUATOR_ID_INVALID"
  );

  assertString(
    event.evaluator.evaluator_version,
    "EVT_EVALUATOR_VERSION_INVALID",
    128
  );

  assertSha256(
    event.evaluator.evaluator_sha256,
    "EVT_EVALUATOR_SHA256_INVALID"
  );

  assertObject(
    event.references,
    "EVT_REFERENCES_INVALID"
  );

  assertExactKeys(
    event.references,
    [
      "mandate_id",
      "authority_id",
      "decision_id",
      "authorization_id"
    ],
    "EVT_REFERENCES_UNKNOWN_FIELD"
  );

  for (
    const key of [
      "mandate_id",
      "authority_id",
      "decision_id",
      "authorization_id"
    ]
  ) {
    assertString(
      event.references[key],
      `EVT_${key.toUpperCase()}_INVALID`
    );
  }

  assertObject(
    event.artifact_hashes,
    "EVT_ARTIFACT_HASHES_INVALID"
  );

  const artifactHashKeys =
    event.schema_version ===
      "1.1"
      ? [
          "mandate_sha256",
          "authority_sha256",
          "decision_sha256",
          "authorization_sha256",
          "runtime_record_sha256",
          "policy_context_sha256"
        ]
      : [
          "mandate_sha256",
          "authority_sha256",
          "decision_sha256",
          "authorization_sha256",
          "runtime_sha256",
          "policy_context_sha256"
        ];

  assertExactKeys(
    event.artifact_hashes,
    artifactHashKeys,
    "EVT_ARTIFACT_HASHES_UNKNOWN_FIELD"
  );

  for (
    const key of
    artifactHashKeys
  ) {
    assertSha256(
      event.artifact_hashes[key],
      `EVT_${key.toUpperCase()}_INVALID`
    );
  }

  if (
    event.schema_version ===
    "1.1"
  ) {
    if (
      event.registry_anchors !==
      undefined
    ) {
      fail(
        "EVT_LEGACY_REGISTRY_ANCHORS_FORBIDDEN"
      );
    }
  } else {
    assertRegistryAnchors(
      event.registry_anchors
    );
  }

  assertSha256(
    event.request_sha256,
    "EVT_REQUEST_SHA256_INVALID"
  );

  assertRuntimeBinding(
    event.runtime_binding
  );

  assertEvaluationResult(
    event.result
  );

  assertObject(
    event.privacy,
    "EVT_PRIVACY_INVALID"
  );

  assertExactKeys(
    event.privacy,
    [
      "raw_request_included",
      "raw_policy_context_included"
    ],
    "EVT_PRIVACY_UNKNOWN_FIELD"
  );

  if (
    event.privacy.raw_request_included !==
    false
  ) {
    fail(
      "EVT_RAW_REQUEST_FORBIDDEN"
    );
  }

  if (
    event.privacy.raw_policy_context_included !==
    false
  ) {
    fail(
      "EVT_RAW_POLICY_CONTEXT_FORBIDDEN"
    );
  }

  if (
    event.execution_reference !==
    undefined
  ) {
    fail(
      "EVT_EXECUTION_REFERENCE_FORBIDDEN"
    );
  }
}


export function buildAuthorizationEvaluationEvt({
  evtId,
  occurredAt,

  evaluatorId,
  evaluatorVersion,
  evaluatorSha256,

  mandateId,
  mandateSha256,
  mandateRecordSha256,

  authority,
  decisionEvidence,
  authorization,

  policyContext,

  runtimeSha256,
  runtimeRecordSha256,

  revocationAsOfRecordCount,
  revocationAsOfHeadRecordSha256,

  evaluationResult
}) {
  if (
    typeof evtId !== "string" ||
    !EVT_ID_PATTERN.test(evtId)
  ) {
    fail("EVT_ID_INVALID");
  }

  assertIsoDate(
    occurredAt,
    "EVT_OCCURRED_AT_INVALID"
  );

  assertString(
    evaluatorId,
    "EVT_EVALUATOR_ID_INVALID"
  );

  assertString(
    evaluatorVersion,
    "EVT_EVALUATOR_VERSION_INVALID",
    128
  );

  assertSha256(
    evaluatorSha256,
    "EVT_EVALUATOR_SHA256_INVALID"
  );

  assertString(
    mandateId,
    "EVT_MANDATE_ID_INVALID"
  );

  assertSha256(
    mandateSha256,
    "EVT_MANDATE_SHA256_INVALID"
  );

  assertSha256(
    mandateRecordSha256,
    "EVT_MANDATE_RECORD_SHA256_INVALID"
  );

  assertObject(
    authority,
    "EVT_AUTHORITY_INVALID"
  );

  assertObject(
    decisionEvidence,
    "EVT_DECISION_EVIDENCE_INVALID"
  );

  assertObject(
    authorization,
    "EVT_AUTHORIZATION_INVALID"
  );

  assertObject(
    policyContext,
    "EVT_POLICY_CONTEXT_INVALID"
  );

  assertString(
    authority.authority_id,
    "EVT_AUTHORITY_ID_INVALID"
  );

  assertString(
    authorization.authorization_id,
    "EVT_AUTHORIZATION_ID_INVALID"
  );

  assertString(
    authorization.decision_reference,
    "EVT_DECISION_ID_INVALID"
  );

  assertString(
    decisionEvidence.decision_id,
    "EVT_DECISION_EVIDENCE_ID_INVALID"
  );

  if (
    authorization.decision_reference !==
    decisionEvidence.decision_id
  ) {
    fail(
      "EVT_DECISION_REFERENCE_MISMATCH"
    );
  }

  if (
    authorization.mandate_reference !==
    mandateId
  ) {
    fail(
      "EVT_MANDATE_REFERENCE_MISMATCH"
    );
  }

  if (
    authorization.authority_reference !==
    authority.authority_id
  ) {
    fail(
      "EVT_AUTHORITY_REFERENCE_MISMATCH"
    );
  }

  assertObject(
    authorization.request,
    "EVT_AUTHORIZATION_REQUEST_INVALID"
  );

  assertSha256(
    authorization.request.request_sha256,
    "EVT_REQUEST_SHA256_INVALID"
  );

  assertSha256(
    decisionEvidence.request_sha256,
    "EVT_DECISION_REQUEST_SHA256_INVALID"
  );

  if (
    decisionEvidence.request_sha256 !==
    authorization.request.request_sha256
  ) {
    fail(
      "EVT_DECISION_REQUEST_MISMATCH"
    );
  }

  if (
    decisionEvidence.mandate_reference !==
    mandateId
  ) {
    fail(
      "EVT_DECISION_MANDATE_MISMATCH"
    );
  }

  if (
    decisionEvidence.authority_reference !==
    authority.authority_id
  ) {
    fail(
      "EVT_DECISION_AUTHORITY_MISMATCH"
    );
  }

  assertRuntimeBinding(
    authorization.runtime_binding
  );

  assertSha256(
    runtimeSha256,
    "EVT_RUNTIME_SHA256_INVALID"
  );

  assertSha256(
    runtimeRecordSha256,
    "EVT_RUNTIME_RECORD_SHA256_INVALID"
  );

  const registryAnchors = {
    mandate_record_sha256:
      mandateRecordSha256,

    runtime_record_sha256:
      runtimeRecordSha256,

    revocation_as_of_record_count:
      revocationAsOfRecordCount,

    revocation_as_of_head_record_sha256:
      revocationAsOfHeadRecordSha256
  };

  assertRegistryAnchors(
    registryAnchors
  );

  assertEvaluationResult(
    evaluationResult
  );

  if (
    decisionEvidence.outcome !==
    evaluationResult.decision
  ) {
    fail(
      "EVT_DECISION_OUTCOME_MISMATCH"
    );
  }

  const event = {
    schema_version:
      "1.2",

    evt_id:
      evtId,

    evt_type:
      "AUTHORIZATION_EVALUATED",

    occurred_at:
      occurredAt,

    evaluator: {
      evaluator_id:
        evaluatorId,

      evaluator_version:
        evaluatorVersion,

      evaluator_sha256:
        evaluatorSha256
    },

    references: {
      mandate_id:
        mandateId,

      authority_id:
        authority.authority_id,

      decision_id:
        authorization.decision_reference,

      authorization_id:
        authorization.authorization_id
    },

    artifact_hashes: {
      mandate_sha256:
        mandateSha256,

      authority_sha256:
        sha256Canonical(
          authority
        ),

      decision_sha256:
        sha256Canonical(
          decisionEvidence
        ),

      authorization_sha256:
        sha256Canonical(
          authorization
        ),

      runtime_sha256:
        runtimeSha256,

      policy_context_sha256:
        sha256Canonical(
          policyContext
        )
    },

    registry_anchors:
      registryAnchors,

    request_sha256:
      authorization.request.request_sha256,

    runtime_binding: {
      runtime_id:
        authorization
          .runtime_binding
          .runtime_id,

      runtime_type:
        authorization
          .runtime_binding
          .runtime_type,

      runtime_version:
        authorization
          .runtime_binding
          .runtime_version,

      runtime_digest_sha256:
        authorization
          .runtime_binding
          .runtime_digest_sha256
    },

    result: {
      decision:
        evaluationResult.decision,

      reason_code:
        evaluationResult.reason_code,

      checks:
        Array.isArray(
          evaluationResult.checks
        )
          ? [
              ...evaluationResult.checks
            ]
          : []
    },

    privacy: {
      raw_request_included:
        false,

      raw_policy_context_included:
        false
    }
  };

  assertEvent(event);

  return clone(event);
}


function parseEvtLog(
  logPath,
  {
    allowMissing = false
  } = {}
) {
  if (
    !existsSync(logPath)
  ) {
    if (allowMissing) {
      return [];
    }

    fail(
      "EVT_LOG_UNAVAILABLE"
    );
  }

  const raw =
    readFileSync(
      logPath,
      "utf8"
    );

  if (
    raw.trim() === ""
  ) {
    return [];
  }

  const lines =
    raw
      .split("\n")
      .filter(Boolean);

  const records = [];
  const seenIds =
    new Set();

  let expectedPrevious =
    null;

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    let record;

    try {
      record =
        JSON.parse(
          lines[index]
        );
    } catch {
      fail(
        `EVT_LOG_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      fail(
        `EVT_LOG_CORRUPT_RECORD:${index + 1}`
      );
    }

    assertExactKeys(
      record,
      [
        "log_version",
        "record_type",
        "evt_id",
        "previous_evt_sha256",
        "evt_sha256",
        "event"
      ],
      `EVT_LOG_UNKNOWN_FIELD:${index + 1}`
    );

    if (
      record.log_version !==
        "1.0" ||
      record.record_type !==
        "EVT_APPENDED"
    ) {
      fail(
        `EVT_LOG_RECORD_TYPE_INVALID:${index + 1}`
      );
    }

    if (
      record.previous_evt_sha256 !==
      expectedPrevious
    ) {
      fail(
        `EVT_LOG_CHAIN_MISMATCH:${index + 1}`
      );
    }

    assertEvent(
      record.event
    );

    if (
      record.evt_id !==
      record.event.evt_id
    ) {
      fail(
        `EVT_LOG_ID_MISMATCH:${index + 1}`
      );
    }

    assertSha256(
      record.evt_sha256,
      `EVT_LOG_SHA256_INVALID:${index + 1}`
    );

    const calculated =
      sha256Canonical({
        previous_evt_sha256:
          record.previous_evt_sha256,

        event:
          record.event
      });

    if (
      calculated !==
      record.evt_sha256
    ) {
      fail(
        `EVT_LOG_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenIds.has(
        record.evt_id
      )
    ) {
      fail(
        "EVT_LOG_DUPLICATE_ID"
      );
    }

    seenIds.add(
      record.evt_id
    );

    records.push(record);

    expectedPrevious =
      record.evt_sha256;
  }

  return records;
}


function acquireLock(
  logPath
) {
  const lockPath =
    `${logPath}.lock`;

  let fd;

  try {
    fd =
      openSync(
        lockPath,
        "wx"
      );
  } catch {
    fail(
      "EVT_LOG_LOCKED"
    );
  }

  return {
    fd,
    lockPath
  };
}


function releaseLock(lock) {
  try {
    closeSync(lock.fd);
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


export function appendEvt({
  logPath,
  event
}) {
  assertString(
    logPath,
    "EVT_LOG_PATH_REQUIRED"
  );

  assertEvent(event);

  const immutableEvent =
    clone(event);

  const lock =
    acquireLock(
      logPath
    );

  try {
    const records =
      parseEvtLog(
        logPath,
        {
          allowMissing: true
        }
      );

    if (
      records.some(
        (record) =>
          record.evt_id ===
          immutableEvent.evt_id
      )
    ) {
      fail(
        "EVT_ALREADY_REGISTERED"
      );
    }

    const previous =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].evt_sha256;

    const evtHash =
      sha256Canonical({
        previous_evt_sha256:
          previous,

        event:
          immutableEvent
      });

    const record = {
      log_version:
        "1.0",

      record_type:
        "EVT_APPENDED",

      evt_id:
        immutableEvent.evt_id,

      previous_evt_sha256:
        previous,

      evt_sha256:
        evtHash,

      event:
        immutableEvent
    };

    appendFileSync(
      logPath,
      `${JSON.stringify(record)}\n`,
      {
        encoding:
          "utf8",

        flag:
          "a"
      }
    );

    return clone(record);
  } finally {
    releaseLock(lock);
  }
}


export function listEvts({
  logPath
}) {
  return clone(
    parseEvtLog(
      logPath
    )
  );
}


export function verifyEvtLog({
  logPath
}) {
  const records =
    parseEvtLog(
      logPath
    );

  return {
    valid:
      true,

    record_count:
      records.length,

    head_evt_sha256:
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].evt_sha256
  };
}


export function getAuthorizationEvtHistory({
  logPath,
  authorizationId
}) {
  assertString(
    authorizationId,
    "EVT_AUTHORIZATION_ID_INVALID"
  );

  return clone(
    parseEvtLog(
      logPath
    ).filter(
      (record) =>
        record.event
          .references
          .authorization_id ===
        authorizationId
    )
  );
}
