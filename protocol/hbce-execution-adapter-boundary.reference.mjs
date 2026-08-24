import {
  createHash
} from "node:crypto";

import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync
} from "node:fs";


import {
  listExecutionEvidenceForExecution,
  verifyExecutionEvidenceRegistry
} from "./hbce-execution-evidence-registry.reference.mjs";


import {
  assertExecutionAdapterTrusted
} from "./hbce-execution-adapter-trust.reference.mjs";


import {
  assertExecutionAdapterCapabilityAuthorized
} from "./hbce-execution-adapter-capability.reference.mjs";


import {
  verifyExecutionAdapterInvocationProof
} from "./hbce-execution-adapter-signature.reference.mjs";


const EXECUTION_ID_PATTERN =
  /^EXECUTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ATTEMPT_ID_PATTERN =
  /^EXECUTION-ATTEMPT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_ID_PATTERN =
  /^ADAPTER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const RECORD_KEYS = [
  "registry_version",
  "record_type",
  "invocation_id",
  "execution_id",
  "attempt_id",
  "execution_attempt_evidence_id",
  "execution_attempt_evidence_sha256",
  "execution_attempt_record_sha256",
  "authorization_id",
  "consumption_id",
  "adapter_id",
  "external_system_reference",
  "execution_payload_sha256",
  "idempotency_key_sha256",
  "claimed_at",
  "time_source",
  "previous_record_sha256",
  "record_sha256"
].sort();


function fail(message) {
  throw new Error(message);
}


function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}


function assertString(
  value,
  code,
  {
    min = 1,
    max = 256
  } = {}
) {
  if (
    typeof value !==
      "string" ||
    value.length <
      min ||
    value.length >
      max
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
    typeof value !==
      "string" ||
    !pattern.test(value)
  ) {
    fail(code);
  }
}


function assertIsoDate(
  value,
  code
) {
  if (
    typeof value !==
      "string" ||
    !Number.isFinite(
      Date.parse(value)
    )
  ) {
    fail(code);
  }
}


function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value
      .map(canonicalize)
      .join(",")}]`;
  }


  if (
    value !== null &&
    typeof value ===
      "object"
  ) {
    const keys =
      Object.keys(value)
        .sort();


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
  return createHash(
    "sha256"
  )
    .update(
      canonicalize(value),
      "utf8"
    )
    .digest("hex");
}


function sha256Utf8(value) {
  return createHash(
    "sha256"
  )
    .update(
      value,
      "utf8"
    )
    .digest("hex");
}


function deepFreeze(value) {
  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return value;
  }


  for (
    const child of
    Object.values(value)
  ) {
    deepFreeze(child);
  }


  return Object.freeze(value);
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
      "EXECUTION_ADAPTER_INVOCATION_REGISTRY_LOCKED"
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


function assertRecordShape(
  record,
  lineNumber
) {
  if (
    record ===
      null ||
    typeof record !==
      "object" ||
    Array.isArray(record)
  ) {
    fail(
      `EXECUTION_ADAPTER_INVOCATION_RECORD_INVALID:${lineNumber}`
    );
  }


  const keys =
    Object.keys(record)
      .sort();


  if (
    JSON.stringify(keys) !==
    JSON.stringify(RECORD_KEYS)
  ) {
    fail(
      `EXECUTION_ADAPTER_INVOCATION_RECORD_SHAPE_INVALID:${lineNumber}`
    );
  }


  if (
    record.registry_version !==
      "1.0" ||
    record.record_type !==
      "EXECUTION_ADAPTER_INVOCATION_CLAIMED"
  ) {
    fail(
      `EXECUTION_ADAPTER_INVOCATION_RECORD_TYPE_INVALID:${lineNumber}`
    );
  }


  assertString(
    record.invocation_id,
    `EXECUTION_ADAPTER_INVOCATION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );

  assertId(
    record.execution_id,
    EXECUTION_ID_PATTERN,
    `EXECUTION_ADAPTER_EXECUTION_ID_INVALID:${lineNumber}`
  );

  assertId(
    record.attempt_id,
    ATTEMPT_ID_PATTERN,
    `EXECUTION_ADAPTER_ATTEMPT_ID_INVALID:${lineNumber}`
  );

  assertString(
    record.execution_attempt_evidence_id,
    `EXECUTION_ADAPTER_EVIDENCE_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );

  assertString(
    record.authorization_id,
    `EXECUTION_ADAPTER_AUTHORIZATION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );

  assertString(
    record.consumption_id,
    `EXECUTION_ADAPTER_CONSUMPTION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );

  assertId(
    record.adapter_id,
    ADAPTER_ID_PATTERN,
    `EXECUTION_ADAPTER_ID_INVALID:${lineNumber}`
  );

  assertString(
    record.external_system_reference,
    `EXECUTION_ADAPTER_EXTERNAL_SYSTEM_REFERENCE_INVALID:${lineNumber}`
  );


  for (
    const field of [
      "execution_attempt_evidence_sha256",
      "execution_attempt_record_sha256",
      "execution_payload_sha256",
      "idempotency_key_sha256"
    ]
  ) {
    if (
      typeof record[field] !==
        "string" ||
      !SHA256_PATTERN.test(
        record[field]
      )
    ) {
      fail(
        `EXECUTION_ADAPTER_SHA256_INVALID:${lineNumber}`
      );
    }
  }


  assertIsoDate(
    record.claimed_at,
    `EXECUTION_ADAPTER_CLAIM_TIME_INVALID:${lineNumber}`
  );


  if (
    record.time_source !==
      "LOCAL_SYSTEM_CLOCK"
  ) {
    fail(
      `EXECUTION_ADAPTER_TIME_SOURCE_INVALID:${lineNumber}`
    );
  }


  if (
    record.previous_record_sha256 !==
      null &&
    (
      typeof record.previous_record_sha256 !==
        "string" ||
      !SHA256_PATTERN.test(
        record.previous_record_sha256
      )
    )
  ) {
    fail(
      `EXECUTION_ADAPTER_PREVIOUS_RECORD_SHA256_INVALID:${lineNumber}`
    );
  }


  if (
    typeof record.record_sha256 !==
      "string" ||
    !SHA256_PATTERN.test(
      record.record_sha256
    )
  ) {
    fail(
      `EXECUTION_ADAPTER_RECORD_SHA256_INVALID:${lineNumber}`
    );
  }
}


function parseInvocationRegistry(
  registryPath,
  {
    allowMissing =
      false
  } = {}
) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_INVOCATION_REGISTRY_PATH_REQUIRED"
  );


  if (
    !existsSync(
      registryPath
    )
  ) {
    if (allowMissing) {
      return [];
    }


    fail(
      "EXECUTION_ADAPTER_INVOCATION_REGISTRY_MISSING"
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
      .trim()
      .split("\n");


  const records = [];

  let previousRecordSha256 =
    null;

  let previousClaimedAtMs =
    null;

  const attempts =
    new Set();


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
        `EXECUTION_ADAPTER_INVOCATION_JSON_INVALID:${lineNumber}`
      );
    }


    assertRecordShape(
      record,
      lineNumber
    );


    if (
      record.previous_record_sha256 !==
      previousRecordSha256
    ) {
      fail(
        `EXECUTION_ADAPTER_INVOCATION_CHAIN_INVALID:${lineNumber}`
      );
    }


    const basis = {
      ...record
    };


    delete basis
      .record_sha256;


    if (
      sha256Canonical(
        basis
      ) !==
      record.record_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_INVOCATION_RECORD_HASH_INVALID:${lineNumber}`
      );
    }


    const claimedAtMs =
      Date.parse(
        record.claimed_at
      );


    if (
      previousClaimedAtMs !==
        null &&
      claimedAtMs <
        previousClaimedAtMs
    ) {
      fail(
        `EXECUTION_ADAPTER_INVOCATION_CHRONOLOGY_INVALID:${lineNumber}`
      );
    }


    const attemptKey =
      `${record.execution_id}\n${record.attempt_id}`;


    if (
      attempts.has(
        attemptKey
      )
    ) {
      fail(
        `EXECUTION_ADAPTER_DUPLICATE_ATTEMPT_CLAIM:${lineNumber}`
      );
    }


    attempts.add(
      attemptKey
    );

    records.push(
      record
    );

    previousRecordSha256 =
      record.record_sha256;

    previousClaimedAtMs =
      claimedAtMs;
  }


  return records;
}


function claimInvocation({
  registryPath,
  attemptRecord,
  adapterId,
  externalSystemReference
}) {
  const lock =
    acquireLock(
      registryPath
    );


  try {
    const records =
      parseInvocationRegistry(
        registryPath,
        {
          allowMissing:
            true
        }
      );


    const executionId =
      attemptRecord
        .evidence
        .execution_id;

    const attemptId =
      attemptRecord
        .evidence
        .attempt_id;


    if (
      records.some(
        (record) =>
          record.execution_id ===
            executionId &&
          record.attempt_id ===
            attemptId
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_ATTEMPT_ALREADY_CLAIMED"
      );
    }


    const claimedAt =
      new Date()
        .toISOString();


    const previousRecordSha256 =
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256;


    const invocationId =
      `ADAPTER-INVOCATION-${sha256Utf8(
        `${executionId}\n${attemptId}`
      )
        .slice(
          0,
          32
        )
        .toUpperCase()}`;


    const basis = {
      registry_version:
        "1.0",

      record_type:
        "EXECUTION_ADAPTER_INVOCATION_CLAIMED",

      invocation_id:
        invocationId,

      execution_id:
        executionId,

      attempt_id:
        attemptId,

      execution_attempt_evidence_id:
        attemptRecord
          .evidence
          .evidence_id,

      execution_attempt_evidence_sha256:
        attemptRecord
          .evidence_sha256,

      execution_attempt_record_sha256:
        attemptRecord
          .record_sha256,

      authorization_id:
        attemptRecord
          .evidence
          .authorization
          .authorization_id,

      consumption_id:
        attemptRecord
          .evidence
          .consumption
          .consumption_id,

      adapter_id:
        adapterId,

      external_system_reference:
        externalSystemReference,

      execution_payload_sha256:
        attemptRecord
          .evidence
          .execution_payload_sha256,

      idempotency_key_sha256:
        attemptRecord
          .evidence
          .idempotency
          .key_sha256,

      claimed_at:
        claimedAt,

      time_source:
        "LOCAL_SYSTEM_CLOCK",

      previous_record_sha256:
        previousRecordSha256
    };


    const record = {
      ...basis,

      record_sha256:
        sha256Canonical(
          basis
        )
    };


    const fd =
      openSync(
        registryPath,
        "a"
      );


    try {
      writeSync(
        fd,
        `${JSON.stringify(record)}\n`,
        null,
        "utf8"
      );

      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }


    return clone(
      record
    );

  } finally {
    releaseLock(lock);
  }
}


function assertInvocationExecutionBinding({
  invocationRecord,
  executionRegistryPath
}) {
  const executionRecords =
    listExecutionEvidenceForExecution({
      registryPath:
        executionRegistryPath,

      executionId:
        invocationRecord.execution_id
    });


  const matchingAttempts =
    executionRecords.filter(
      (record) =>
        record.evidence
          .evidence_type ===
            "EXECUTION_ATTEMPTED" &&
        record.evidence
          .attempt_id ===
            invocationRecord.attempt_id
    );


  if (
    matchingAttempts.length !==
      1
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_EXECUTION_BINDING_INVALID"
    );
  }


  const attemptRecord =
    matchingAttempts[0];


  if (
    attemptRecord
      .evidence
      .evidence_id !==
        invocationRecord
          .execution_attempt_evidence_id ||

    attemptRecord
      .evidence_sha256 !==
        invocationRecord
          .execution_attempt_evidence_sha256 ||

    attemptRecord
      .record_sha256 !==
        invocationRecord
          .execution_attempt_record_sha256 ||

    attemptRecord
      .evidence
      .authorization
      .authorization_id !==
        invocationRecord
          .authorization_id ||

    attemptRecord
      .evidence
      .consumption
      .consumption_id !==
        invocationRecord
          .consumption_id ||

    attemptRecord
      .evidence
      .execution_payload_sha256 !==
        invocationRecord
          .execution_payload_sha256 ||

    attemptRecord
      .evidence
      .idempotency
      .key_sha256 !==
        invocationRecord
          .idempotency_key_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_EXECUTION_BINDING_INVALID"
    );
  }


  if (
    Date.parse(
      invocationRecord
        .claimed_at
    ) <
    Date.parse(
      attemptRecord
        .appended_at
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_BEFORE_EXECUTION_ADMISSION"
    );
  }


  return attemptRecord;
}


function assertAttemptStillOpen({
  executionRegistryPath,
  executionId,
  attemptId
}) {
  const records =
    listExecutionEvidenceForExecution({
      registryPath:
        executionRegistryPath,

      executionId
    });


  if (
    records.length ===
      0
  ) {
    fail(
      "EXECUTION_ADAPTER_ATTEMPT_STATE_CHANGED_AFTER_CLAIM"
    );
  }


  const tail =
    records[
      records.length - 1
    ];


  if (
    tail.evidence
      .evidence_type !==
        "EXECUTION_ATTEMPTED" ||
    tail.evidence
      .attempt_id !==
        attemptId
  ) {
    fail(
      "EXECUTION_ADAPTER_ATTEMPT_STATE_CHANGED_AFTER_CLAIM"
    );
  }


  return tail;
}


function sanitizeAdapterMetadata(
  result
) {
  if (
    result ===
      null ||
    typeof result !==
      "object" ||
    Array.isArray(result)
  ) {
    return {};
  }


  const sanitized = {};


  if (
    typeof result
      .external_operation_reference ===
      "string" &&
    result
      .external_operation_reference
      .length >=
        1 &&
    result
      .external_operation_reference
      .length <=
        256
  ) {
    sanitized
      .external_operation_reference =
      result
        .external_operation_reference;
  }


  if (
    typeof result
      .external_evidence_sha256 ===
      "string" &&
    SHA256_PATTERN.test(
      result
        .external_evidence_sha256
    )
  ) {
    sanitized
      .external_evidence_sha256 =
      result
        .external_evidence_sha256;
  }


  if (
    typeof result
      .external_observed_at ===
      "string" &&
    Number.isFinite(
      Date.parse(
        result
          .external_observed_at
      )
    )
  ) {
    sanitized
      .external_observed_at =
      result
        .external_observed_at;
  }


  return sanitized;
}


function assertAdapterInvocationProof(
  proof
) {
  if (
    proof === null ||
    typeof proof !==
      "object" ||
    Array.isArray(proof)
  ) {
    fail(
      "EXECUTION_ADAPTER_SIGNED_AUTHORIZATION_PROOF_REQUIRED"
    );
  }
}


function buildExpectedAdapterInvocationContext({
  attemptRecord,
  adapterId,
  externalSystemReference,
  proof
}) {
  assertAdapterInvocationProof(
    proof
  );


  return {
    execution_id:
      attemptRecord.evidence.execution_id,

    attempt_id:
      attemptRecord.evidence.attempt_id,

    authorization_id:
      attemptRecord
        .evidence
        .authorization
        .authorization_id,

    consumption_id:
      attemptRecord
        .evidence
        .consumption
        .consumption_id,

    adapter_id:
      adapterId,

    adapter_key_id:
      proof.adapter_key_id,

    capability_grant_id:
      proof.capability_grant_id,

    capability:
      proof.capability,

    external_system_reference:
      externalSystemReference,

    execution_payload_sha256:
      attemptRecord
        .evidence
        .execution_payload_sha256,

    idempotency_key_sha256:
      attemptRecord
        .evidence
        .idempotency
        .key_sha256
  };
}


function assertAdapterProofTemporalOrder({
  proof,
  attemptRecord
}) {
  assertIsoDate(
    proof.signed_at,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_AT_INVALID"
  );


  assertIsoDate(
    attemptRecord.appended_at,
    "EXECUTION_ADAPTER_ATTEMPT_APPENDED_AT_INVALID"
  );


  if (
    Date.parse(
      proof.signed_at
    ) <
    Date.parse(
      attemptRecord.appended_at
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROOF_BEFORE_EXECUTION_ADMISSION"
    );
  }
}


function verifyHistoricalAdapterAuthorization({
  proof,
  expectedContext,
  adapterTrustRegistryPath,
  capabilityRegistryPath
}) {
  let verification;


  try {
    verification =
      verifyExecutionAdapterInvocationProof({
        proof,

        adapterTrustRegistryPath,

        capabilityRegistryPath,

        expectedContext
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_SIGNED_AUTHORIZATION_VERIFY_FAILED"
    );
  }


  if (
    verification.valid !==
      true ||
    verification.signature_valid !==
      true ||
    verification.trusted_public_key_binding !==
      true ||
    verification.key_control_proven !==
      true ||
    verification
      .capability_authorized_as_of_signed_at !==
        true ||
    verification
      .exact_target_authorized_as_of_signed_at !==
        true ||
    verification.expected_context_bound !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_SIGNED_AUTHORIZATION_VERIFY_FAILED"
    );
  }


  return verification;
}


function assertCurrentAdapterAuthorization({
  proof,
  adapterId,
  externalSystemReference,
  adapterTrustRegistryPath,
  capabilityRegistryPath,
  checkedAt
}) {
  assertIsoDate(
    checkedAt,
    "EXECUTION_ADAPTER_CURRENT_AUTHORIZATION_TIME_INVALID"
  );


  if (
    Date.parse(
      proof.signed_at
    ) >
    Date.parse(
      checkedAt
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROOF_FROM_FUTURE"
    );
  }


  let trust;
  let capability;


  try {
    trust =
      assertExecutionAdapterTrusted({
        registryPath:
          adapterTrustRegistryPath,

        adapterId,

        keyId:
          proof.adapter_key_id,

        asOf:
          checkedAt,

        expectedPublicKeySha256:
          proof.adapter_public_key_sha256
      });


    capability =
      assertExecutionAdapterCapabilityAuthorized({
        registryPath:
          capabilityRegistryPath,

        grantId:
          proof.capability_grant_id,

        adapterId,

        capability:
          proof.capability,

        externalSystemReference,

        asOf:
          checkedAt
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_CURRENT_AUTHORIZATION_VERIFY_FAILED"
    );
  }


  if (
    trust.trusted !==
      true ||
    trust.public_key_sha256 !==
      proof.adapter_public_key_sha256 ||
    trust.trust_record_sha256 !==
      proof.adapter_trust_record_sha256 ||
    capability.authorized !==
      true ||
    capability.capability_authorized !==
      true ||
    capability.exact_target_authorized !==
      true ||
    capability.grant_record_sha256 !==
      proof.capability_grant_record_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_CURRENT_AUTHORIZATION_VERIFY_FAILED"
    );
  }


  return {
    checked_at:
      checkedAt,

    adapter_identity_trusted:
      true,

    adapter_key_control_proven:
      true,

    adapter_capability_authorized:
      true,

    external_system_authorization_proven:
      true,

    legal_identity_proven:
      false,

    legal_authority_created:
      false,

    remote_target_authenticity_proven:
      false,

    trusted_external_time:
      false
  };
}


function publicClaim(
  claim
) {
  return {
    invocation_id:
      claim.invocation_id,

    invocation_record_sha256:
      claim.record_sha256,

    claimed_at:
      claim.claimed_at,

    time_source:
      claim.time_source
  };
}


export async function invokeExecutionAdapterBoundary({
  executionRegistryPath,
  consumptionRegistryPath,
  admissionTrustRegistryPath,
  invocationRegistryPath,
  provenanceRegistryPath,

  adapterTrustRegistryPath,
  capabilityRegistryPath,

  executionId,
  attemptId,

  adapterId,
  externalSystemReference,

  rawExecutionPayload,
  rawIdempotencyKey,

  adapterInvocationProof,

  invokeAdapter
}) {

  assertString(
    provenanceRegistryPath,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    executionRegistryPath,
    "EXECUTION_ADAPTER_EXECUTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    consumptionRegistryPath,
    "EXECUTION_ADAPTER_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    admissionTrustRegistryPath,
    "EXECUTION_ADAPTER_TRUST_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    invocationRegistryPath,
    "EXECUTION_ADAPTER_INVOCATION_REGISTRY_PATH_REQUIRED"
  );


  assertString(
    adapterTrustRegistryPath,
    "EXECUTION_ADAPTER_ADAPTER_TRUST_REGISTRY_PATH_REQUIRED"
  );


  assertString(
    capabilityRegistryPath,
    "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_PATH_REQUIRED"
  );


  assertId(
    executionId,
    EXECUTION_ID_PATTERN,
    "EXECUTION_ADAPTER_EXECUTION_ID_INVALID"
  );

  assertId(
    attemptId,
    ATTEMPT_ID_PATTERN,
    "EXECUTION_ADAPTER_ATTEMPT_ID_INVALID"
  );

  assertId(
    adapterId,
    ADAPTER_ID_PATTERN,
    "EXECUTION_ADAPTER_ID_INVALID"
  );

  assertString(
    externalSystemReference,
    "EXECUTION_ADAPTER_EXTERNAL_SYSTEM_REFERENCE_INVALID"
  );


  assertString(
    rawExecutionPayload,
    "EXECUTION_ADAPTER_RAW_EXECUTION_PAYLOAD_REQUIRED",
    {
      min:
        0,

      max:
        10 * 1024 * 1024
    }
  );

  assertString(
    rawIdempotencyKey,
    "EXECUTION_ADAPTER_RAW_IDEMPOTENCY_KEY_REQUIRED",
    {
      max:
        4096
    }
  );


  if (
    typeof invokeAdapter !==
      "function"
  ) {
    fail(
      "EXECUTION_ADAPTER_CALLBACK_REQUIRED"
    );
  }


  let registryVerification;


  try {
    registryVerification =
      verifyExecutionEvidenceRegistry({
        registryPath:
          executionRegistryPath,

        consumptionRegistryPath,

        admissionTrustRegistryPath
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_EXECUTION_ADMISSION_VERIFY_FAILED"
    );
  }


  if (
    registryVerification.valid !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_EXECUTION_ADMISSION_VERIFY_FAILED"
    );
  }


  const executionRecords =
    listExecutionEvidenceForExecution({
      registryPath:
        executionRegistryPath,

      executionId
    });


  const matchingAttempts =
    executionRecords.filter(
      (record) =>
        record.evidence
          .evidence_type ===
            "EXECUTION_ATTEMPTED" &&
        record.evidence
          .attempt_id ===
            attemptId
    );


  if (
    matchingAttempts.length ===
      0
  ) {
    fail(
      "EXECUTION_ADAPTER_ATTEMPT_NOT_FOUND"
    );
  }


  if (
    matchingAttempts.length !==
      1
  ) {
    fail(
      "EXECUTION_ADAPTER_ATTEMPT_AMBIGUOUS"
    );
  }


  const attemptRecord =
    matchingAttempts[0];


  const tail =
    executionRecords[
      executionRecords.length - 1
    ];


  if (
    !tail ||
    tail.evidence
      .evidence_id !==
        attemptRecord
          .evidence
          .evidence_id ||
    tail.evidence
      .evidence_type !==
        "EXECUTION_ATTEMPTED"
  ) {
    fail(
      "EXECUTION_ADAPTER_ATTEMPT_NOT_OPEN"
    );
  }


  const payloadSha256 =
    sha256Utf8(
      rawExecutionPayload
    );


  if (
    payloadSha256 !==
      attemptRecord
        .evidence
        .execution_payload_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_PAYLOAD_HASH_MISMATCH"
    );
  }


  const idempotencyKeySha256 =
    sha256Utf8(
      rawIdempotencyKey
    );


  if (
    idempotencyKeySha256 !==
      attemptRecord
        .evidence
        .idempotency
        .key_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_IDEMPOTENCY_HASH_MISMATCH"
    );
  }


  assertAdapterInvocationProof(
    adapterInvocationProof
  );


  const immutableAdapterInvocationProof =
    deepFreeze(
      clone(
        adapterInvocationProof
      )
    );


  assertAdapterProofTemporalOrder({
    proof:
      immutableAdapterInvocationProof,

    attemptRecord
  });


  const expectedAdapterInvocationContext =
    buildExpectedAdapterInvocationContext({
      attemptRecord,
      adapterId,
      externalSystemReference,

      proof:
        immutableAdapterInvocationProof
    });


  const historicalAdapterAuthorization =
    verifyHistoricalAdapterAuthorization({
      proof:
        immutableAdapterInvocationProof,

      expectedContext:
        expectedAdapterInvocationContext,

      adapterTrustRegistryPath,
      capabilityRegistryPath
    });


  const authorizationAdmissionCheckedAt =
    new Date()
      .toISOString();


  assertCurrentAdapterAuthorization({
    proof:
      immutableAdapterInvocationProof,

    adapterId,
    externalSystemReference,
    adapterTrustRegistryPath,
    capabilityRegistryPath,

    checkedAt:
      authorizationAdmissionCheckedAt
  });


  /*
   * The durable claim is intentionally written BEFORE
   * adapter invocation.
   *
   * This provides local at-most-once callback admission.
   *
   * If the process dies after the claim and before or
   * during the external call, the attempt remains spent.
   * The external side-effect state is then UNKNOWN.
   *
   * This is fail-closed availability, not distributed
   * transaction atomicity.
   */

  const claim =
    claimInvocation({
      registryPath:
        invocationRegistryPath,

      attemptRecord,

      adapterId,

      externalSystemReference
    });


  /*
   * The claim is now durable and therefore spent.
   *
   * Before any external callback can run, independently
   * re-verify:
   *
   *   A015 execution evidence
   *   A018 signed admission provenance
   *   exact invocation -> execution-attempt binding
   *
   * Failure here burns the local invocation claim and
   * prevents the callback. This is deliberate fail-closed
   * behavior, not distributed transaction atomicity.
   */

  let invocationVerification;


  try {
    invocationVerification =
      verifyExecutionAdapterInvocationRegistry({
        registryPath:
          invocationRegistryPath,

        executionRegistryPath,

        consumptionRegistryPath,

        admissionTrustRegistryPath
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROVENANCE_VERIFY_FAILED"
    );
  }


  if (
    invocationVerification.valid !==
      true ||
    invocationVerification
      .cryptographic_execution_admission_reverified !==
        true ||
    invocationVerification
      .invocation_execution_binding_verified !==
        true
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROVENANCE_VERIFY_FAILED"
    );
  }


  /*
   * Detect an execution-registry state transition that
   * occurred after the original open-attempt check and
   * before callback invocation.
   *
   * This reduces the TOCTOU window. It does not make the
   * execution registry, invocation registry and external
   * system one atomic transaction.
   */

  assertAttemptStillOpen({
    executionRegistryPath,
    executionId,
    attemptId
  });


  const callbackAuthorizationCheckedAt =
    new Date()
      .toISOString();


  const currentAdapterAuthorization =
    assertCurrentAdapterAuthorization({
      proof:
        immutableAdapterInvocationProof,

      adapterId,
      externalSystemReference,
      adapterTrustRegistryPath,
      capabilityRegistryPath,

      checkedAt:
        callbackAuthorizationCheckedAt
    });


  let adapterAuthorizationProvenance;

  let adapterAuthorizationProvenanceVerification;

  let persistedAdapterAuthorizationProvenance;


  try {
    const provenanceModule =
      await import(
        "./hbce-execution-adapter-authorization-provenance.reference.mjs"
      );


    adapterAuthorizationProvenance =
      provenanceModule
        .appendExecutionAdapterAuthorizationProvenance({
          registryPath:
            provenanceRegistryPath,

          invocationRegistryPath,

          provenance: {
            invocation_id:
              claim.invocation_id,

            invocation_record_sha256:
              claim.record_sha256,

            execution_id:
              attemptRecord
                .evidence
                .execution_id,

            attempt_id:
              attemptRecord
                .evidence
                .attempt_id,

            authorization_id:
              attemptRecord
                .evidence
                .authorization
                .authorization_id,

            consumption_id:
              attemptRecord
                .evidence
                .consumption
                .consumption_id,

            adapter_id:
              adapterId,

            adapter_key_id:
              immutableAdapterInvocationProof
                .adapter_key_id,

            capability_grant_id:
              immutableAdapterInvocationProof
                .capability_grant_id,

            capability:
              immutableAdapterInvocationProof
                .capability,

            external_system_reference:
              externalSystemReference,

            execution_payload_sha256:
              payloadSha256,

            idempotency_key_sha256:
              idempotencyKeySha256,

            adapter_signed_at:
              immutableAdapterInvocationProof
                .signed_at,

            adapter_signed_payload_sha256:
              immutableAdapterInvocationProof
                .signed_payload_sha256,

            adapter_signature_algorithm:
              immutableAdapterInvocationProof
                .signature_algorithm,

            adapter_signature_base64:
              immutableAdapterInvocationProof
                .signature_base64,

            adapter_public_key_sha256:
              immutableAdapterInvocationProof
                .adapter_public_key_sha256,

            adapter_trust_record_sha256:
              immutableAdapterInvocationProof
                .adapter_trust_record_sha256,

            capability_grant_record_sha256:
              immutableAdapterInvocationProof
                .capability_grant_record_sha256,

            authorization_checked_at:
              currentAdapterAuthorization
                .checked_at,

            time_source:
              "LOCAL_SYSTEM_CLOCK"
          }
        });


    persistedAdapterAuthorizationProvenance =
      provenanceModule
        .getExecutionAdapterAuthorizationProvenance({
          registryPath:
            provenanceRegistryPath,

          invocationId:
            claim.invocation_id
        });


    adapterAuthorizationProvenanceVerification =
      provenanceModule
        .verifyExecutionAdapterAuthorizationProvenanceRegistry({
          registryPath:
            provenanceRegistryPath,

          invocationRegistryPath,

          adapterTrustRegistryPath,

          capabilityRegistryPath
        });

  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_EMISSION_VERIFY_FAILED"
    );
  }


  if (
    !adapterAuthorizationProvenance ||
    !persistedAdapterAuthorizationProvenance ||

    typeof adapterAuthorizationProvenance
      .record_sha256 !==
        "string" ||

    persistedAdapterAuthorizationProvenance
      .record_sha256 !==
        adapterAuthorizationProvenance
          .record_sha256 ||

    persistedAdapterAuthorizationProvenance
      .invocation_id !==
        claim.invocation_id ||

    persistedAdapterAuthorizationProvenance
      .invocation_record_sha256 !==
        claim.record_sha256 ||

    adapterAuthorizationProvenanceVerification
      .valid !==
        true ||

    adapterAuthorizationProvenanceVerification
      .durable_authorization_provenance_recorded !==
        true ||

    adapterAuthorizationProvenanceVerification
      .invocation_claim_binding_verified !==
        true ||

    adapterAuthorizationProvenanceVerification
      .adapter_signature_cryptographically_verified !==
        true ||

    adapterAuthorizationProvenanceVerification
      .historical_adapter_trust_verified !==
        true ||

    adapterAuthorizationProvenanceVerification
      .historical_capability_authorization_verified !==
        true ||

    adapterAuthorizationProvenanceVerification
      .historical_exact_target_authorization_verified !==
        true ||

    adapterAuthorizationProvenanceVerification
      .authorization_state_as_of_recorded_check_verified !==
        true
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_EMISSION_VERIFY_FAILED"
    );
  }


  const envelope =
    deepFreeze({
      boundary_version:
        "A020.1",

      invocation_id:
        claim.invocation_id,

      invocation_record_sha256:
        claim.record_sha256,

      invocation_execution_binding_verified:
        true,

      cryptographic_execution_admission_reverified:
        true,

      adapter_signed_authorization_verified:
        true,

      adapter_identity_trusted:
        true,

      adapter_key_control_proven:
        true,

      adapter_capability_authorized:
        true,

      external_system_authorization_proven:
        true,

      adapter_key_id:
        immutableAdapterInvocationProof
          .adapter_key_id,

      capability_grant_id:
        immutableAdapterInvocationProof
          .capability_grant_id,

      adapter_signed_payload_sha256:
        historicalAdapterAuthorization
          .signed_payload_sha256,

      adapter_authorization_checked_at:
        currentAdapterAuthorization
          .checked_at,

      adapter_authorization_time_source:
        "LOCAL_SYSTEM_CLOCK",

      adapter_authorization_provenance_verified:
        true,

      adapter_authorization_provenance_record_sha256:
        adapterAuthorizationProvenance
          .record_sha256,

      legal_identity_proven:
        false,

      legal_authority_created:
        false,

      remote_target_authenticity_proven:
        false,

      execution_id:
        executionId,

      attempt_id:
        attemptId,

      adapter_id:
        adapterId,

      external_system_reference:
        externalSystemReference,

      authorization:
        clone(
          attemptRecord
            .evidence
            .authorization
        ),

      consumption:
        clone(
          attemptRecord
            .evidence
            .consumption
        ),

      evaluation_evt:
        clone(
          attemptRecord
            .evidence
            .evaluation_evt
        ),

      runtime_binding:
        clone(
          attemptRecord
            .evidence
            .runtime_binding
        ),

      execution_payload_sha256:
        payloadSha256,

      idempotency_key_sha256:
        idempotencyKeySha256,

      raw_execution_payload:
        rawExecutionPayload,

      raw_idempotency_key:
        rawIdempotencyKey
    });


  let adapterResult;


  try {
    adapterResult =
      await invokeAdapter(
        envelope
      );
  } catch {
    return {
      boundary_version:
        "A020.1",

      invoked:
        true,

      adapter_returned:
        false,

      external_state:
        "UNKNOWN",

      error_code:
        "EXECUTION_ADAPTER_CALLBACK_FAILED",

      claim:
        publicClaim(
          claim
        ),

      adapter_metadata:
        {},

      adapter_identity_trusted:

        true,


      adapter_key_control_proven:

        true,

      adapter_capability_authorized:

        true,


      external_system_authorization_proven:

        true,


      adapter_signed_authorization_verified:

        true,


      current_callback_authorization_rechecked:

        true,

      adapter_authorization_provenance_verified:

        true,

      adapter_authorization_provenance_record_sha256:
        adapterAuthorizationProvenance
          .record_sha256,



      legal_identity_proven:

        false,


      legal_authority_created:

        false,


      remote_target_authenticity_verified:

        false,

      external_response_authenticity_verified:
        false,

      external_acceptance_proven:
        false,

      execution_completion_proven:
        false,

      settlement_finality_proven:
        false,

      trusted_external_time:
        false
    };
  }


  return {
    boundary_version:
      "A020.1",

    invoked:
      true,

    adapter_returned:
      true,

    external_state:
      "UNVERIFIED",

    error_code:
      null,

    claim:
      publicClaim(
        claim
      ),

    adapter_metadata:
      sanitizeAdapterMetadata(
        adapterResult
      ),

    adapter_identity_trusted:

      true,


    adapter_key_control_proven:

      true,

    adapter_capability_authorized:

      true,


    external_system_authorization_proven:

      true,


    adapter_signed_authorization_verified:

      true,


    current_callback_authorization_rechecked:

      true,

      adapter_authorization_provenance_verified:

        true,

      adapter_authorization_provenance_record_sha256:
        adapterAuthorizationProvenance
          .record_sha256,



    legal_identity_proven:

      false,


    legal_authority_created:

      false,


    remote_target_authenticity_verified:

      false,

    external_response_authenticity_verified:
      false,

    external_acceptance_proven:
      false,

    execution_completion_proven:
      false,

    settlement_finality_proven:
      false,

    trusted_external_time:
      false
  };
}


export function getExecutionAdapterInvocation({
  registryPath,
  executionId,
  attemptId
}) {
  assertId(
    executionId,
    EXECUTION_ID_PATTERN,
    "EXECUTION_ADAPTER_EXECUTION_ID_INVALID"
  );

  assertId(
    attemptId,
    ATTEMPT_ID_PATTERN,
    "EXECUTION_ADAPTER_ATTEMPT_ID_INVALID"
  );


  const record =
    parseInvocationRegistry(
      registryPath
    ).find(
      (item) =>
        item.execution_id ===
          executionId &&
        item.attempt_id ===
          attemptId
    );


  return record
    ? clone(record)
    : null;
}


export function listExecutionAdapterInvocations({
  registryPath
}) {
  return clone(
    parseInvocationRegistry(
      registryPath
    )
  );
}


export function verifyExecutionAdapterInvocationRegistry({
  registryPath,
  executionRegistryPath,
  consumptionRegistryPath,
  admissionTrustRegistryPath
}) {
  assertString(
    executionRegistryPath,
    "EXECUTION_ADAPTER_EXECUTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    consumptionRegistryPath,
    "EXECUTION_ADAPTER_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    admissionTrustRegistryPath,
    "EXECUTION_ADAPTER_TRUST_REGISTRY_PATH_REQUIRED"
  );


  let executionVerification;


  try {
    executionVerification =
      verifyExecutionEvidenceRegistry({
        registryPath:
          executionRegistryPath,

        consumptionRegistryPath,

        admissionTrustRegistryPath
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROVENANCE_VERIFY_FAILED"
    );
  }


  if (
    executionVerification.valid !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROVENANCE_VERIFY_FAILED"
    );
  }


  const records =
    parseInvocationRegistry(
      registryPath
    );


  for (
    const record of
    records
  ) {
    assertInvocationExecutionBinding({
      invocationRecord:
        record,

      executionRegistryPath
    });
  }


  return {
    valid:
      true,

    registry_version:
      "1.0",

    record_count:
      records.length,

    head_record_sha256:
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256,

    execution_registry_head_sha256:
      executionVerification
        .head_record_sha256,

    cryptographic_execution_admission_reverified:
      true,

    invocation_execution_binding_verified:
      true,

    adapter_identity_trusted:
      false,

    adapter_capability_authorized:
      false,

    external_system_authorization_proven:
      false,

    external_execution_proven:
      false,

    external_acceptance_proven:
      false,

    settlement_finality_proven:
      false,

    trusted_external_time:
      false
  };
}
