import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import {
  createHash
} from "node:crypto";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  consumeAuthorization,
  getAuthorizationConsumption,
  verifyAuthorizationConsumptionRegistry
} from "../protocol/hbce-authorization-consumption.reference.mjs";


import {
  appendExecutionEvidence,
  verifyExecutionEvidenceRegistry
} from "../protocol/hbce-execution-evidence-registry.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a016-"
    )
  );


function fail(message) {
  throw new Error(message);
}


function expectError(
  label,
  fn,
  expected
) {
  let actual =
    null;

  try {
    fn();
  } catch (error) {
    actual =
      error.message;
  }

  if (
    actual !== expected
  ) {
    fail(
      `${label}:EXPECTED=${expected}:ACTUAL=${actual}`
    );
  }

  console.log(
    `${label}=PASS`
  );
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


function makeAuthorization(
  suffix,
  issuedAt
) {
  return {
    authorization_id:
      `AUTHORIZATION-A016-${suffix}`,

    status:
      "ISSUED",

    usage: {
      mode:
        "SINGLE_USE",

      max_uses:
        1
    },

    issued_at:
      issuedAt
  };
}


function makeRuntime(
  runtimeId = "A27"
) {
  return {
    runtime_id:
      runtimeId,

    runtime_type:
      "AI_AGENT",

    runtime_version:
      "1.0",

    runtime_digest_sha256:
      "c".repeat(64)
  };
}


function makeAttempt({
  evidenceId,
  executionId,
  attemptId,
  authorizationId,
  authorizationSha256,
  consumptionId,
  consumptionRecordSha256,
  evtId,
  evtSha256,
  runtimeBinding
}) {
  return {
    schema_version:
      "1.0",

    evidence_id:
      evidenceId,

    evidence_type:
      "EXECUTION_ATTEMPTED",

    execution_id:
      executionId,

    attempt_id:
      attemptId,

    authorization: {
      authorization_id:
        authorizationId,

      authorization_sha256:
        authorizationSha256
    },

    consumption: {
      consumption_id:
        consumptionId,

      consumption_record_sha256:
        consumptionRecordSha256
    },

    evaluation_evt: {
      evt_id:
        evtId,

      evt_sha256:
        evtSha256
    },

    request_sha256:
      "d".repeat(64),

    runtime_binding:
      runtimeBinding,

    execution_payload_sha256:
      "e".repeat(64),

    idempotency: {
      key_sha256:
        "f".repeat(64),

      scope:
        "EXECUTION_ATTEMPT",

      external_enforcement:
        "NOT_CONFIRMED"
    },

    observation_evidence_sha256:
      "1".repeat(64),

    occurred_at:
      "2026-08-24T10:06:00Z",

    recorded_at:
      "2026-08-24T10:06:01Z",

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
        "HBCE-A016-ADAPTER",

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
}


try {
  const consumptionRegistryPath =
    join(
      root,
      "consumption.jsonl"
    );

  const executionRegistryPath =
    join(
      root,
      "execution.jsonl"
    );

  const legacyExecutionRegistryPath =
    join(
      root,
      "execution-legacy.jsonl"
    );

  const mismatchExecutionRegistryPath =
    join(
      root,
      "execution-mismatch.jsonl"
    );


  /*
   * ===================================================
   * 1. MANUALLY MATERIALIZE A VALID HISTORICAL 1.0
   * ===================================================
   */

  const legacyBasis = {
    registry_version:
      "1.0",

    record_type:
      "AUTHORIZATION_CONSUMED",

    consumption_id:
      "CONSUMPTION-A016-HISTORICAL",

    authorization_id:
      "AUTHORIZATION-A016-HISTORICAL",

    authorization_sha256:
      "a".repeat(64),

    evaluation_evt_id:
      "EVT-A016-HISTORICAL",

    evaluation_evt_sha256:
      "b".repeat(64),

    consumed_at:
      "2026-08-24T10:00:00Z",

    consumed_by:
      "IPR-A016-HISTORICAL",

    previous_record_sha256:
      null
  };


  const legacyRecord = {
    ...legacyBasis,

    record_sha256:
      sha256Canonical(
        legacyBasis
      )
  };


  writeFileSync(
    consumptionRegistryPath,
    `${JSON.stringify(legacyRecord)}\n`,
    "utf8"
  );


  const legacyVerification =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    legacyVerification.valid !==
      true ||
    legacyVerification.record_count !==
      1
  ) {
    fail(
      "A016_V1_0_READ_FAILED"
    );
  }


  const legacyFetched =
    getAuthorizationConsumption({
      registryPath:
        consumptionRegistryPath,

      authorizationId:
        legacyRecord.authorization_id
    });


  if (
    legacyFetched.registry_version !==
      "1.0" ||
    legacyFetched
      .presented_runtime_binding_sha256 !==
      undefined
  ) {
    fail(
      "A016_V1_0_SEMANTICS_CHANGED"
    );
  }


  console.log(
    "A016_V1_0_HISTORICAL_READ=PASS"
  );


  /*
   * ===================================================
   * 2. 1.0 IS NOT SUFFICIENT FOR NEW EXECUTION
   * ===================================================
   */

  const legacyAttempt =
    makeAttempt({
      evidenceId:
        "EXECUTION-EVIDENCE-A016-LEGACY",

      executionId:
        "EXECUTION-A016-LEGACY",

      attemptId:
        "EXECUTION-ATTEMPT-A016-LEGACY",

      authorizationId:
        legacyRecord.authorization_id,

      authorizationSha256:
        legacyRecord.authorization_sha256,

      consumptionId:
        legacyRecord.consumption_id,

      consumptionRecordSha256:
        legacyRecord.record_sha256,

      evtId:
        legacyRecord.evaluation_evt_id,

      evtSha256:
        legacyRecord.evaluation_evt_sha256,

      runtimeBinding:
        makeRuntime()
    });


  expectError(
    "A016_V1_0_NEW_EXECUTION_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          legacyExecutionRegistryPath,

        consumptionRegistryPath,

        evidence:
          legacyAttempt,

        appendedAt:
          "2026-08-24T10:01:00Z"
      }),

    "EXECUTION_ADMISSION_BINDING_REQUIRED"
  );


  /*
   * ===================================================
   * 3. NEW WRITER REQUIRES ADMISSION HASH
   * ===================================================
   */

  const missingHashAuthorization =
    makeAuthorization(
      "MISSINGHASH",
      "2026-08-24T10:01:00Z"
    );


  expectError(
    "A016_V1_1_MISSING_ADMISSION_HASH_DENIED",

    () =>
      consumeAuthorization({
        registryPath:
          join(
            root,
            "missing-hash.jsonl"
          ),

        consumptionId:
          "CONSUMPTION-A016-MISSINGHASH",

        authorization:
          missingHashAuthorization,

        evaluationEvtId:
          "EVT-A016-MISSINGHASH",

        evaluationEvtSha256:
          "2".repeat(64),

        consumedAt:
          "2026-08-24T10:02:00Z",

        consumedBy:
          "IPR-A016"
      }),

    "CONSUMPTION_PRESENTED_RUNTIME_BINDING_SHA256_INVALID"
  );


  /*
   * ===================================================
   * 4. APPEND 1.1 AFTER HISTORICAL 1.0
   * ===================================================
   */

  const runtime =
    makeRuntime();

  const authorization =
    makeAuthorization(
      "NEW",
      "2026-08-24T10:01:00Z"
    );

  const runtimeSha256 =
    sha256Canonical(
      runtime
    );


  const currentConsumption =
    consumeAuthorization({
      registryPath:
        consumptionRegistryPath,

      consumptionId:
        "CONSUMPTION-A016-NEW",

      authorization,

      evaluationEvtId:
        "EVT-A016-NEW",

      evaluationEvtSha256:
        "3".repeat(64),

      presentedRuntimeBindingSha256:
        runtimeSha256,

      consumedAt:
        "2026-08-24T10:05:00Z",

      consumedBy:
        "IPR-A016"
    });


  if (
    currentConsumption.registry_version !==
      "1.1" ||
    currentConsumption
      .presented_runtime_binding_sha256 !==
      runtimeSha256 ||
    currentConsumption
      .previous_record_sha256 !==
      legacyRecord.record_sha256
  ) {
    fail(
      "A016_V1_1_RECORD_INVALID"
    );
  }


  console.log(
    "A016_V1_1_RUNTIME_ADMISSION_WRITE=PASS"
  );


  const mixedVerification =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    mixedVerification.valid !==
      true ||
    mixedVerification.record_count !==
      2 ||
    mixedVerification
      .head_record_sha256 !==
      currentConsumption.record_sha256
  ) {
    fail(
      "A016_MIXED_REGISTRY_INVALID"
    );
  }


  console.log(
    "A016_MIXED_V1_0_V1_1_CHAIN=PASS"
  );


  /*
   * ===================================================
   * 5. MATCHING EXECUTION RUNTIME IS ACCEPTED
   * ===================================================
   */

  const matchingAttempt =
    makeAttempt({
      evidenceId:
        "EXECUTION-EVIDENCE-A016-MATCH",

      executionId:
        "EXECUTION-A016-MATCH",

      attemptId:
        "EXECUTION-ATTEMPT-A016-MATCH",

      authorizationId:
        authorization.authorization_id,

      authorizationSha256:
        currentConsumption.authorization_sha256,

      consumptionId:
        currentConsumption.consumption_id,

      consumptionRecordSha256:
        currentConsumption.record_sha256,

      evtId:
        currentConsumption.evaluation_evt_id,

      evtSha256:
        currentConsumption.evaluation_evt_sha256,

      runtimeBinding:
        runtime
    });


  appendExecutionEvidence({
    registryPath:
      executionRegistryPath,

    consumptionRegistryPath,

    evidence:
      matchingAttempt,

    appendedAt:
      "2026-08-24T10:06:02Z"
  });


  const executionVerification =
    verifyExecutionEvidenceRegistry({
      registryPath:
        executionRegistryPath,

      consumptionRegistryPath
    });


  if (
    executionVerification.valid !==
      true ||
    executionVerification.record_count !==
      1
  ) {
    fail(
      "A016_MATCHING_EXECUTION_VERIFY_FAILED"
    );
  }


  console.log(
    "A016_MATCHING_ADMISSION_EXECUTION_RUNTIME=PASS"
  );


  /*
   * ===================================================
   * 6. INITIAL RUNTIME SUBSTITUTION IS DENIED
   * ===================================================
   */

  const mismatchRuntime =
    makeRuntime(
      "A28"
    );

  const mismatchAuthorization =
    makeAuthorization(
      "MISMATCH",
      "2026-08-24T10:06:00Z"
    );

  const mismatchConsumption =
    consumeAuthorization({
      registryPath:
        consumptionRegistryPath,

      consumptionId:
        "CONSUMPTION-A016-MISMATCH",

      authorization:
        mismatchAuthorization,

      evaluationEvtId:
        "EVT-A016-MISMATCH",

      evaluationEvtSha256:
        "4".repeat(64),

      presentedRuntimeBindingSha256:
        runtimeSha256,

      consumedAt:
        "2026-08-24T10:07:00Z",

      consumedBy:
        "IPR-A016"
    });


  const mismatchAttempt =
    makeAttempt({
      evidenceId:
        "EXECUTION-EVIDENCE-A016-MISMATCH",

      executionId:
        "EXECUTION-A016-MISMATCH",

      attemptId:
        "EXECUTION-ATTEMPT-A016-MISMATCH",

      authorizationId:
        mismatchAuthorization.authorization_id,

      authorizationSha256:
        mismatchConsumption.authorization_sha256,

      consumptionId:
        mismatchConsumption.consumption_id,

      consumptionRecordSha256:
        mismatchConsumption.record_sha256,

      evtId:
        mismatchConsumption.evaluation_evt_id,

      evtSha256:
        mismatchConsumption.evaluation_evt_sha256,

      runtimeBinding:
        mismatchRuntime
    });


  expectError(
    "A016_INITIAL_RUNTIME_SUBSTITUTION_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          mismatchExecutionRegistryPath,

        consumptionRegistryPath,

        evidence:
          mismatchAttempt,

        appendedAt:
          "2026-08-24T10:08:00Z"
      }),

    "EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH"
  );


  /*
   * ===================================================
   * 7. ADMISSION HASH IS PART OF 1.1 RECORD HASH
   * ===================================================
   */

  const raw =
    readFileSync(
      consumptionRegistryPath,
      "utf8"
    );

  const records =
    raw
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line)
      );


  records[1]
    .presented_runtime_binding_sha256 =
    "0".repeat(64);


  const tamperedPath =
    join(
      root,
      "consumption-tampered.jsonl"
    );


  writeFileSync(
    tamperedPath,
    `${records
      .map(
        (record) =>
          JSON.stringify(record)
      )
      .join("\n")}\n`,
    "utf8"
  );


  expectError(
    "A016_ADMISSION_HASH_TAMPER_DETECTED",

    () =>
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          tamperedPath
      }),

    "CONSUMPTION_REGISTRY_RECORD_HASH_MISMATCH:2"
  );


  console.log("");
  console.log(
    "===== A016 FINAL MATRIX ====="
  );

  console.log(
    "HISTORICAL_V1_0_READ=PASS"
  );

  console.log(
    "NEW_V1_1_WRITE=PASS"
  );

  console.log(
    "MIXED_V1_0_V1_1_CHAIN=PASS"
  );

  console.log(
    "V1_0_NEW_EXECUTION=DENY"
  );

  console.log(
    "ADMISSION_RUNTIME_HASH=IN_CONSUMPTION_CHAIN"
  );

  console.log(
    "MATCHING_EXECUTION_RUNTIME=ALLOW"
  );

  console.log(
    "INITIAL_RUNTIME_SUBSTITUTION=DENY"
  );

  console.log(
    "ADMISSION_HASH_TAMPER=DETECTED"
  );

  console.log(
    "GUARDED_CONSUMPTION_NOT_EXECUTION=TRUE"
  );

  console.log(
    "ADMISSION_ACTOR_CRYPTOGRAPHIC_AUTHENTICITY=NOT_PROVEN"
  );

  console.log(
    "A016_EXECUTION_ADMISSION_BINDING=PASS"
  );

} finally {
  rmSync(
    root,
    {
      recursive:
        true,

      force:
        true
    }
  );
}
