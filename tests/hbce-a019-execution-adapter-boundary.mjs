import {
  createHash,
  generateKeyPairSync,
  sign
} from "node:crypto";

import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  registerAdmissionSignerKey
} from "../protocol/hbce-admission-signer-trust.reference.mjs";

import {
  consumeAuthorization
} from "../protocol/hbce-authorization-consumption.reference.mjs";

import {
  appendExecutionEvidence,
  listExecutionEvidenceForExecution
} from "../protocol/hbce-execution-evidence-registry.reference.mjs";

import {
  getExecutionAdapterInvocation,
  invokeExecutionAdapterBoundary,
  listExecutionAdapterInvocations,
  verifyExecutionAdapterInvocationRegistry
} from "../protocol/hbce-execution-adapter-boundary.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a019-"
    )
  );


function fail(message) {
  throw new Error(message);
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
    return `{${Object
      .keys(value)
      .sort()
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


async function expectReject(
  label,
  fn,
  expected
) {
  let actual =
    null;


  try {
    await fn();
  } catch (error) {
    actual =
      error.message;
  }


  if (actual !== expected) {
    fail(
      `${label}:EXPECTED=${expected}:ACTUAL=${actual}`
    );
  }


  console.log(
    `${label}=PASS`
  );
}


const {
  publicKey,
  privateKey
} =
  generateKeyPairSync(
    "ed25519"
  );


const publicDer =
  publicKey.export({
    type:
      "spki",

    format:
      "der"
  });


const publicSha =
  createHash(
    "sha256"
  )
    .update(
      publicDer
    )
    .digest("hex");


const trustPath =
  join(
    root,
    "trust.jsonl"
  );


registerAdmissionSignerKey({
  registryPath:
    trustPath,

  trust: {
    schema_version:
      "1.0",

    event_id:
      "ADMISSION-TRUST-EVENT-A019",

    event_type:
      "TRUSTED",

    signer_id:
      "ADMISSION-SIGNER-A019",

    key_id:
      "ADMISSION-KEY-A019",

    scope:
      "ADMISSION_CONSUMPTION_SIGNING",

    algorithm:
      "ED25519",

    public_key_spki_der_base64:
      publicDer.toString(
        "base64"
      ),

    public_key_sha256:
      publicSha,

    valid_from:
      "2026-08-24T09:00:00Z",

    valid_until:
      "2026-08-24T23:00:00Z"
  },

  recordedAt:
    "2026-08-24T09:00:00Z",

  recordedBy:
    "IPR-A019-TRUST-ADMIN"
});


const runtimeBinding = {
  runtime_id:
    "A27",

  runtime_type:
    "AI_AGENT",

  runtime_version:
    "1.0",

  runtime_digest_sha256:
    "e".repeat(64)
};


function makeAttempt({
  suffix,
  consumption,
  payload,
  idempotencyKey
}) {
  return {
    schema_version:
      "1.0",

    evidence_id:
      `EXECUTION-EVIDENCE-A019-${suffix}`,

    evidence_type:
      "EXECUTION_ATTEMPTED",

    execution_id:
      `EXECUTION-A019-${suffix}`,

    attempt_id:
      `EXECUTION-ATTEMPT-A019-${suffix}`,

    authorization: {
      authorization_id:
        consumption.authorization_id,

      authorization_sha256:
        consumption.authorization_sha256
    },

    consumption: {
      consumption_id:
        consumption.consumption_id,

      consumption_record_sha256:
        consumption.record_sha256
    },

    evaluation_evt: {
      evt_id:
        consumption.evaluation_evt_id,

      evt_sha256:
        consumption.evaluation_evt_sha256
    },

    request_sha256:
      "a".repeat(64),

    runtime_binding:
      runtimeBinding,

    execution_payload_sha256:
      sha256Utf8(
        payload
      ),

    idempotency: {
      key_sha256:
        sha256Utf8(
          idempotencyKey
        ),

      scope:
        "EXECUTION_ATTEMPT",

      external_enforcement:
        "NOT_CONFIRMED"
    },

    observation_evidence_sha256:
      "d".repeat(64),

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
        "HBCE-A019-REFERENCE",

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


function createAdmittedAttempt({
  suffix,
  payload,
  idempotencyKey
}) {
  const consumptionRegistryPath =
    join(
      root,
      `consumption-${suffix}.jsonl`
    );

  const executionRegistryPath =
    join(
      root,
      `execution-${suffix}.jsonl`
    );

  const invocationRegistryPath =
    join(
      root,
      `invocation-${suffix}.jsonl`
    );


  const authorization = {
    authorization_id:
      `AUTHORIZATION-A019-${suffix}`,

    status:
      "ISSUED",

    usage: {
      mode:
        "SINGLE_USE",

      max_uses:
        1
    },

    issued_at:
      "2026-08-24T10:00:00Z"
  };


  const consumption =
    consumeAuthorization({
      registryPath:
        consumptionRegistryPath,

      consumptionId:
        `CONSUMPTION-A019-${suffix}`,

      authorization,

      evaluationEvtId:
        `EVT-A019-${suffix}`,

      evaluationEvtSha256:
        "1".repeat(64),

      presentedRuntimeBindingSha256:
        sha256Canonical(
          runtimeBinding
        ),

      consumedAt:
        "2026-08-24T10:05:00Z",

      consumedBy:
        "IPR-A019",

      admissionTrustRegistryPath:
        trustPath,

      admissionSignerId:
        "ADMISSION-SIGNER-A019",

      admissionKeyId:
        "ADMISSION-KEY-A019",

      signAdmissionPayload:
        (payloadBytes) =>
          sign(
            null,
            payloadBytes,
            privateKey
          )
    });


  const attempt =
    makeAttempt({
      suffix,
      consumption,
      payload,
      idempotencyKey
    });


  appendExecutionEvidence({
    registryPath:
      executionRegistryPath,

    consumptionRegistryPath,

    admissionTrustRegistryPath:
      trustPath,

    evidence:
      attempt,

    appendedAt:
      "2026-08-24T10:06:02Z"
  });


  return {
    suffix,
    payload,
    idempotencyKey,
    consumptionRegistryPath,
    executionRegistryPath,
    invocationRegistryPath,
    executionId:
      attempt.execution_id,
    attemptId:
      attempt.attempt_id
  };
}


function boundaryArgs(
  fixture,
  invokeAdapter
) {
  return {
    executionRegistryPath:
      fixture.executionRegistryPath,

    consumptionRegistryPath:
      fixture.consumptionRegistryPath,

    admissionTrustRegistryPath:
      trustPath,

    invocationRegistryPath:
      fixture.invocationRegistryPath,

    executionId:
      fixture.executionId,

    attemptId:
      fixture.attemptId,

    adapterId:
      "ADAPTER-A019-REFERENCE",

    externalSystemReference:
      "BANK-SANDBOX-A019",

    rawExecutionPayload:
      fixture.payload,

    rawIdempotencyKey:
      fixture.idempotencyKey,

    invokeAdapter
  };
}


try {
  /*
   * ===================================================
   * 1. VALID INVOCATION
   * ===================================================
   */

  const valid =
    createAdmittedAttempt({
      suffix:
        "VALID",

      payload:
        "{\"amount\":\"100.00\",\"currency\":\"EUR\"}",

      idempotencyKey:
        "IDEMPOTENCY-A019-VALID"
    });


  let validCalls =
    0;


  const validResult =
    await invokeExecutionAdapterBoundary(
      boundaryArgs(
        valid,

        async (envelope) => {
          validCalls += 1;


          if (
            !Object.isFrozen(
              envelope
            ) ||
            !Object.isFrozen(
              envelope.authorization
            ) ||
            !Object.isFrozen(
              envelope.runtime_binding
            )
          ) {
            fail(
              "A019_ENVELOPE_NOT_FROZEN"
            );
          }


          if (
            envelope.raw_execution_payload !==
              valid.payload ||
            envelope.raw_idempotency_key !==
              valid.idempotencyKey
          ) {
            fail(
              "A019_RAW_BOUNDARY_VALUE_MISMATCH"
            );
          }


          if (
            envelope
              .invocation_execution_binding_verified !==
                true ||
            envelope
              .cryptographic_execution_admission_reverified !==
                true
          ) {
            fail(
              "A019_INVOCATION_PROVENANCE_NOT_REVERIFIED"
            );
          }


          return {
            external_operation_reference:
              "SANDBOX-OP-A019-001",

            external_evidence_sha256:
              "9".repeat(64),

            external_observed_at:
              "2026-08-24T10:07:00Z",

            raw_response:
              "DO-NOT-RETURN-OR-PERSIST"
          };
        }
      )
    );


  if (
    validCalls !==
      1 ||
    validResult.invoked !==
      true ||
    validResult.adapter_returned !==
      true ||
    validResult.external_state !==
      "UNVERIFIED" ||
    validResult.external_acceptance_proven !==
      false ||
    validResult.execution_completion_proven !==
      false ||
    validResult.settlement_finality_proven !==
      false
  ) {
    fail(
      "A019_VALID_INVOCATION_RESULT_INVALID"
    );
  }


  if (
    JSON.stringify(
      validResult
    ).includes(
      "DO-NOT-RETURN-OR-PERSIST"
    )
  ) {
    fail(
      "A019_RAW_ADAPTER_RESPONSE_LEAKED"
    );
  }


  console.log(
    "A019_VALID_ADAPTER_INVOCATION=PASS"
  );

  console.log(
    "A019_CALLBACK_RETURN_NOT_ACCEPTANCE=PASS"
  );


  const executionAfter =
    listExecutionEvidenceForExecution({
      registryPath:
        valid.executionRegistryPath,

      executionId:
        valid.executionId
    });


  if (
    executionAfter.length !==
      1 ||
    executionAfter[0]
      .evidence
      .evidence_type !==
        "EXECUTION_ATTEMPTED"
  ) {
    fail(
      "A019_CALLBACK_MUTATED_EXECUTION_STATE"
    );
  }


  console.log(
    "A019_CALLBACK_DOES_NOT_MUTATE_EXECUTION_EVIDENCE=PASS"
  );


  const rawInvocationRegistry =
    readFileSync(
      valid.invocationRegistryPath,
      "utf8"
    );


  if (
    rawInvocationRegistry.includes(
      valid.payload
    ) ||
    rawInvocationRegistry.includes(
      valid.idempotencyKey
    ) ||
    rawInvocationRegistry.includes(
      "DO-NOT-RETURN-OR-PERSIST"
    )
  ) {
    fail(
      "A019_RAW_DATA_PERSISTED_IN_INVOCATION_REGISTRY"
    );
  }


  console.log(
    "A019_RAW_DATA_NOT_PERSISTED=PASS"
  );


  const invocationVerification =
    verifyExecutionAdapterInvocationRegistry({
      registryPath:
        valid.invocationRegistryPath,

      executionRegistryPath:
        valid.executionRegistryPath,

      consumptionRegistryPath:
        valid.consumptionRegistryPath,

      admissionTrustRegistryPath:
        trustPath
    });


  if (
    invocationVerification.valid !==
      true ||
    invocationVerification.record_count !==
      1 ||
    invocationVerification
      .cryptographic_execution_admission_reverified !==
        true ||
    invocationVerification
      .invocation_execution_binding_verified !==
        true ||
    invocationVerification.external_execution_proven !==
      false
  ) {
    fail(
      "A019_INVOCATION_REGISTRY_VERIFY_INVALID"
    );
  }


  console.log(
    "A019_INVOCATION_REGISTRY_VERIFY=PASS"
  );

  console.log(
    "A019_INVOCATION_EXECUTION_BINDING_VERIFY=PASS"
  );

  console.log(
    "A019_INVOCATION_A018_CRYPTO_REVERIFY=PASS"
  );


  const persistedClaim =
    getExecutionAdapterInvocation({
      registryPath:
        valid.invocationRegistryPath,

      executionId:
        valid.executionId,

      attemptId:
        valid.attemptId
    });


  if (!persistedClaim) {
    fail(
      "A019_INVOCATION_CLAIM_NOT_FOUND"
    );
  }


  console.log(
    "A019_DURABLE_INVOCATION_CLAIM=PASS"
  );


  /*
   * ===================================================
   * 1B. STRUCTURALLY REHASHED INVOCATION FORGERY
   *
   * The local invocation chain can be recomputed, but
   * execution provenance cannot be silently rewritten.
   * ===================================================
   */

  const forgedInvocationPath =
    join(
      root,
      "invocation-forged.jsonl"
    );


  const persistedInvocation =
    JSON.parse(
      readFileSync(
        valid.invocationRegistryPath,
        "utf8"
      ).trim()
    );


  const forgedInvocationBasis = {
    ...persistedInvocation,

    execution_payload_sha256:
      "f".repeat(64)
  };


  delete forgedInvocationBasis
    .record_sha256;


  const forgedInvocation = {
    ...forgedInvocationBasis,

    record_sha256:
      sha256Canonical(
        forgedInvocationBasis
      )
  };


  writeFileSync(
    forgedInvocationPath,
    `${JSON.stringify(forgedInvocation)}\n`,
    "utf8"
  );


  await expectReject(
    "A019_REHASHED_INVOCATION_FORGERY_DENIED",

    async () =>
      verifyExecutionAdapterInvocationRegistry({
        registryPath:
          forgedInvocationPath,

        executionRegistryPath:
          valid.executionRegistryPath,

        consumptionRegistryPath:
          valid.consumptionRegistryPath,

        admissionTrustRegistryPath:
          trustPath
      }),

    "EXECUTION_ADAPTER_INVOCATION_EXECUTION_BINDING_INVALID"
  );


  console.log(
    "A019_STRUCTURAL_REHASH_NOT_EXECUTION_PROVENANCE=PASS"
  );


  /*
   * Historical invocation verification must also fail
   * closed when A018 trust cannot be re-established.
   */

  await expectReject(
    "A019_INVOCATION_WRONG_TRUST_DENIED",

    async () =>
      verifyExecutionAdapterInvocationRegistry({
        registryPath:
          valid.invocationRegistryPath,

        executionRegistryPath:
          valid.executionRegistryPath,

        consumptionRegistryPath:
          valid.consumptionRegistryPath,

        admissionTrustRegistryPath:
          join(
            root,
            "missing-invocation-trust.jsonl"
          )
      }),

    "EXECUTION_ADAPTER_INVOCATION_PROVENANCE_VERIFY_FAILED"
  );


  console.log(
    "A019_INVOCATION_TRUST_FAILURE_FAIL_CLOSED=PASS"
  );


  /*
   * ===================================================
   * 2. SEQUENTIAL REPLAY DENIED
   * ===================================================
   */

  await expectReject(
    "A019_SEQUENTIAL_REPLAY_DENIED",

    () =>
      invokeExecutionAdapterBoundary(
        boundaryArgs(
          valid,

          async () => {
            validCalls += 1;
            return {};
          }
        )
      ),

    "EXECUTION_ADAPTER_ATTEMPT_ALREADY_CLAIMED"
  );


  if (
    validCalls !==
      1
  ) {
    fail(
      "A019_REPLAY_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_SEQUENTIAL_REPLAY_CALLBACK_COUNT=PASS"
  );


  /*
   * ===================================================
   * 3. PAYLOAD SUBSTITUTION DENIED BEFORE CLAIM/CALL
   * ===================================================
   */

  const payloadFixture =
    createAdmittedAttempt({
      suffix:
        "PAYLOAD",

      payload:
        "{\"beneficiary\":\"A\"}",

      idempotencyKey:
        "IDEMPOTENCY-A019-PAYLOAD"
    });


  let payloadCalls =
    0;


  await expectReject(
    "A019_PAYLOAD_SUBSTITUTION_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          payloadFixture,

          async () => {
            payloadCalls += 1;
            return {};
          }
        ),

        rawExecutionPayload:
          "{\"beneficiary\":\"B\"}"
      }),

    "EXECUTION_ADAPTER_PAYLOAD_HASH_MISMATCH"
  );


  if (
    payloadCalls !==
      0
  ) {
    fail(
      "A019_PAYLOAD_MISMATCH_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_PAYLOAD_MISMATCH_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 4. IDEMPOTENCY SUBSTITUTION DENIED BEFORE CALL
   * ===================================================
   */

  const idemFixture =
    createAdmittedAttempt({
      suffix:
        "IDEMPOTENCY",

      payload:
        "{\"amount\":\"1.00\"}",

      idempotencyKey:
        "IDEMPOTENCY-A019-ORIGINAL"
    });


  let idemCalls =
    0;


  await expectReject(
    "A019_IDEMPOTENCY_SUBSTITUTION_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          idemFixture,

          async () => {
            idemCalls += 1;
            return {};
          }
        ),

        rawIdempotencyKey:
          "IDEMPOTENCY-A019-SUBSTITUTED"
      }),

    "EXECUTION_ADAPTER_IDEMPOTENCY_HASH_MISMATCH"
  );


  if (
    idemCalls !==
      0
  ) {
    fail(
      "A019_IDEMPOTENCY_MISMATCH_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_IDEMPOTENCY_MISMATCH_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 5. WRONG TRUST FAILS BEFORE ADAPTER
   * ===================================================
   */

  const trustFixture =
    createAdmittedAttempt({
      suffix:
        "TRUST",

      payload:
        "{\"trust\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A019-TRUST"
    });


  let trustCalls =
    0;


  await expectReject(
    "A019_WRONG_TRUST_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          trustFixture,

          async () => {
            trustCalls += 1;
            return {};
          }
        ),

        admissionTrustRegistryPath:
          join(
            root,
            "missing-trust.jsonl"
          )
      }),

    "EXECUTION_ADAPTER_EXECUTION_ADMISSION_VERIFY_FAILED"
  );


  if (
    trustCalls !==
      0
  ) {
    fail(
      "A019_TRUST_FAILURE_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_TRUST_FAILURE_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 6. WRONG ATTEMPT ID
   * ===================================================
   */

  const missingFixture =
    createAdmittedAttempt({
      suffix:
        "MISSING",

      payload:
        "{\"missing\":false}",

      idempotencyKey:
        "IDEMPOTENCY-A019-MISSING"
    });


  let missingCalls =
    0;


  await expectReject(
    "A019_WRONG_ATTEMPT_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          missingFixture,

          async () => {
            missingCalls += 1;
            return {};
          }
        ),

        attemptId:
          "EXECUTION-ATTEMPT-A019-NOTFOUND"
      }),

    "EXECUTION_ADAPTER_ATTEMPT_NOT_FOUND"
  );


  if (
    missingCalls !==
      0
  ) {
    fail(
      "A019_WRONG_ATTEMPT_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_WRONG_ATTEMPT_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 7. CALLBACK FAILURE = UNKNOWN EXTERNAL STATE
   * ===================================================
   */

  const throwFixture =
    createAdmittedAttempt({
      suffix:
        "THROW",

      payload:
        "{\"operation\":\"throw-test\"}",

      idempotencyKey:
        "IDEMPOTENCY-A019-THROW"
    });


  let throwCalls =
    0;


  const throwResult =
    await invokeExecutionAdapterBoundary(
      boundaryArgs(
        throwFixture,

        async () => {
          throwCalls += 1;

          throw new Error(
            "REMOTE_CONNECTION_LOST"
          );
        }
      )
    );


  if (
    throwCalls !==
      1 ||
    throwResult.invoked !==
      true ||
    throwResult.adapter_returned !==
      false ||
    throwResult.external_state !==
      "UNKNOWN" ||
    throwResult.error_code !==
      "EXECUTION_ADAPTER_CALLBACK_FAILED"
  ) {
    fail(
      "A019_CALLBACK_FAILURE_SEMANTICS_INVALID"
    );
  }


  console.log(
    "A019_CALLBACK_FAILURE_EXTERNAL_STATE_UNKNOWN=PASS"
  );


  await expectReject(
    "A019_UNKNOWN_OUTCOME_REPLAY_DENIED",

    () =>
      invokeExecutionAdapterBoundary(
        boundaryArgs(
          throwFixture,

          async () => {
            throwCalls += 1;
            return {};
          }
        )
      ),

    "EXECUTION_ADAPTER_ATTEMPT_ALREADY_CLAIMED"
  );


  if (
    throwCalls !==
      1
  ) {
    fail(
      "A019_UNKNOWN_OUTCOME_REPLAY_REACHED_ADAPTER"
    );
  }


  console.log(
    "A019_UNKNOWN_OUTCOME_ATTEMPT_REMAINS_SPENT=PASS"
  );


  /*
   * ===================================================
   * 8. CONCURRENT DOUBLE INVOCATION
   * ===================================================
   */

  const raceFixture =
    createAdmittedAttempt({
      suffix:
        "RACE",

      payload:
        "{\"operation\":\"race\"}",

      idempotencyKey:
        "IDEMPOTENCY-A019-RACE"
    });


  let raceCalls =
    0;


  const raceCallback =
    async () => {
      raceCalls += 1;

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            30
          )
      );

      return {};
    };


  const raceResults =
    await Promise.allSettled([
      invokeExecutionAdapterBoundary(
        boundaryArgs(
          raceFixture,
          raceCallback
        )
      ),

      invokeExecutionAdapterBoundary(
        boundaryArgs(
          raceFixture,
          raceCallback
        )
      )
    ]);


  const fulfilled =
    raceResults.filter(
      (item) =>
        item.status ===
          "fulfilled"
    );

  const rejected =
    raceResults.filter(
      (item) =>
        item.status ===
          "rejected"
    );


  if (
    fulfilled.length !==
      1 ||
    rejected.length !==
      1 ||
    raceCalls !==
      1
  ) {
    fail(
      "A019_CONCURRENT_DOUBLE_INVOCATION_NOT_CLOSED"
    );
  }


  if (
    rejected[0]
      .reason
      .message !==
        "EXECUTION_ADAPTER_ATTEMPT_ALREADY_CLAIMED" &&
    rejected[0]
      .reason
      .message !==
        "EXECUTION_ADAPTER_INVOCATION_REGISTRY_LOCKED"
  ) {
    fail(
      `A019_CONCURRENT_UNEXPECTED_DENIAL:${rejected[0].reason.message}`
    );
  }


  const raceClaims =
    listExecutionAdapterInvocations({
      registryPath:
        raceFixture.invocationRegistryPath
    });


  if (
    raceClaims.length !==
      1
  ) {
    fail(
      "A019_CONCURRENT_CLAIM_COUNT_INVALID"
    );
  }


  console.log(
    "A019_CONCURRENT_DOUBLE_INVOCATION_DENIED=PASS"
  );

  console.log(
    "A019_CONCURRENT_SINGLE_CALLBACK=PASS"
  );

  console.log(
    "A019_CONCURRENT_SINGLE_CLAIM=PASS"
  );


  /*
   * ===================================================
   * FINAL MATRIX
   * ===================================================
   */

  console.log("");
  console.log(
    "===== A019A FINAL MATRIX ====="
  );

  console.log(
    "A018_VERIFIED_ATTEMPT_REQUIRED=TRUE"
  );

  console.log(
    "INVOCATION_EXECUTION_BINDING_REVERIFIED=TRUE"
  );

  console.log(
    "INVOCATION_A018_CRYPTO_PROVENANCE_REVERIFIED=TRUE"
  );

  console.log(
    "STRUCTURAL_INVOCATION_REHASH_FORGERY=DENIED"
  );

  console.log(
    "PAYLOAD_SHA256_REBOUND_AT_ADAPTER_BOUNDARY=TRUE"
  );

  console.log(
    "IDEMPOTENCY_SHA256_REBOUND_AT_ADAPTER_BOUNDARY=TRUE"
  );

  console.log(
    "RAW_PAYLOAD_PERSISTED=FALSE"
  );

  console.log(
    "RAW_IDEMPOTENCY_KEY_PERSISTED=FALSE"
  );

  console.log(
    "RAW_ADAPTER_RESPONSE_PERSISTED=FALSE"
  );

  console.log(
    "LOCAL_ADAPTER_INVOCATION_AT_MOST_ONCE=ENFORCED"
  );

  console.log(
    "CLAIM_BEFORE_CALLBACK=ENFORCED"
  );

  console.log(
    "CALLBACK_FAILURE_EXTERNAL_STATE=UNKNOWN"
  );

  console.log(
    "FAILED_CALLBACK_ATTEMPT_RETRY=DENIED"
  );

  console.log(
    "ADAPTER_CALLBACK_RETURN=NOT_EXTERNAL_ACCEPTANCE"
  );

  console.log(
    "ADAPTER_CALLBACK_RETURN=NOT_EXECUTION_COMPLETION"
  );

  console.log(
    "ADAPTER_CALLBACK_RETURN=NOT_SETTLEMENT_FINALITY"
  );

  console.log(
    "ADAPTER_IDENTITY_TRUST=NOT_IMPLEMENTED"
  );

  console.log(
    "ADAPTER_CAPABILITY_AUTHORIZATION=NOT_IMPLEMENTED"
  );

  console.log(
    "EXTERNAL_RESPONSE_AUTHENTICITY=NOT_IMPLEMENTED"
  );

  console.log(
    "EXTERNAL_SYSTEM_AUTHORIZATION_BINDING=NOT_PROVEN_BY_A019A"
  );

  console.log(
    "REQUEST_SHA256_RAW_REBIND=NOT_IMPLEMENTED_BY_A019A"
  );

  console.log(
    "CROSS_REGISTRY_ATOMICITY=NOT_CLAIMED"
  );

  console.log(
    "EXTERNAL_EXECUTION_ATOMICITY=NOT_CLAIMED"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "A019A_EXECUTION_ADAPTER_BOUNDARY=PASS"
  );

  console.log(
    "A019B_ADAPTER_INVOCATION_PROVENANCE=PASS"
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
