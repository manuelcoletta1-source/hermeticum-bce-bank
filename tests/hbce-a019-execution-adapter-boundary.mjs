import {
  createHash,
  generateKeyPairSync,
  sign
} from "node:crypto";

import {
  existsSync,
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
  registerExecutionAdapterKey,
  revokeExecutionAdapterKey
} from "../protocol/hbce-execution-adapter-trust.reference.mjs";


import {
  grantExecutionAdapterCapability,
  revokeExecutionAdapterCapability
} from "../protocol/hbce-execution-adapter-capability.reference.mjs";


import {
  createExecutionAdapterInvocationProof
} from "../protocol/hbce-execution-adapter-signature.reference.mjs";

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


import {
  verifyExecutionAdapterAuthorizationProvenanceRegistry
} from "../protocol/hbce-execution-adapter-authorization-provenance.reference.mjs";



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


const {
  publicKey:
    adapterPublicKey,

  privateKey:
    adapterPrivateKey
} =
  generateKeyPairSync(
    "ed25519"
  );


const adapterPublicDer =
  adapterPublicKey.export({
    type:
      "spki",

    format:
      "der"
  });


const adapterPublicSha =
  createHash(
    "sha256"
  )
    .update(
      adapterPublicDer
    )
    .digest("hex");


const adapterTrustPath =
  join(
    root,
    "adapter-trust.jsonl"
  );


const adapterCapabilityPath =
  join(
    root,
    "adapter-capability.jsonl"
  );


function registerAdapterTrust({
  registryPath,
  eventId,
  validUntil =
    "2027-01-01T00:00:00Z",
  recordedAt =
    "2026-08-24T09:00:00Z"
}) {
  return registerExecutionAdapterKey({
    registryPath,

    trust: {
      schema_version:
        "1.0",

      event_id:
        eventId,

      event_type:
        "TRUSTED",

      adapter_id:
        "ADAPTER-A019-REFERENCE",

      key_id:
        "ADAPTER-KEY-A019-REFERENCE",

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

      algorithm:
        "ED25519",

      public_key_spki_der_base64:
        adapterPublicDer.toString(
          "base64"
        ),

      public_key_sha256:
        adapterPublicSha,

      valid_from:
        "2026-08-24T09:00:00Z",

      valid_until:
        validUntil
    },

    recordedAt,

    recordedBy:
      "IPR-A020D-TRUST-ADMIN"
  });
}


function grantAdapterCapability({
  registryPath,
  eventId,
  grantId =
    "ADAPTER-CAPABILITY-GRANT-A019-REFERENCE",
  validUntil =
    "2027-01-01T00:00:00Z",
  recordedAt =
    "2026-08-24T09:00:00Z"
}) {
  return grantExecutionAdapterCapability({
    registryPath,

    grant: {
      schema_version:
        "1.0",

      event_id:
        eventId,

      event_type:
        "GRANTED",

      grant_id:
        grantId,

      adapter_id:
        "ADAPTER-A019-REFERENCE",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        "BANK-SANDBOX-A019",

      valid_from:
        "2026-08-24T09:00:00Z",

      valid_until:
        validUntil
    },

    recordedAt,

    recordedBy:
      "IPR-A020D-CAPABILITY-ADMIN"
  });
}


registerAdapterTrust({
  registryPath:
    adapterTrustPath,

  eventId:
    "ADAPTER-TRUST-EVENT-A019-REFERENCE"
});


grantAdapterCapability({
  registryPath:
    adapterCapabilityPath,

  eventId:
    "ADAPTER-CAPABILITY-EVENT-A019-REFERENCE"
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

    provenanceRegistryPath:
      join(
        root,
        `adapter-authorization-provenance-${suffix}.jsonl`
      ),

    executionId:
      attempt.execution_id,
    attemptId:
      attempt.attempt_id
  };
}


function adapterProofForFixture(
  fixture,
  {
    trustRegistryPath =
      adapterTrustPath,

    capabilityRegistryPath =
      adapterCapabilityPath,

    signingKey =
      adapterPrivateKey,

    signedAt =
      "2026-08-24T10:06:30Z",

    adapterId =
      "ADAPTER-A019-REFERENCE",

    adapterKeyId =
      "ADAPTER-KEY-A019-REFERENCE",

    capabilityGrantId =
      "ADAPTER-CAPABILITY-GRANT-A019-REFERENCE",

    externalSystemReference =
      "BANK-SANDBOX-A019"
  } = {}
) {
  const executionRecords =
    listExecutionEvidenceForExecution({
      registryPath:
        fixture.executionRegistryPath,

      executionId:
        fixture.executionId
    });


  const attempts =
    executionRecords.filter(
      (record) =>
        record.evidence
          .evidence_type ===
            "EXECUTION_ATTEMPTED" &&
        record.evidence
          .attempt_id ===
            fixture.attemptId
    );


  if (
    attempts.length !==
      1
  ) {
    fail(
      `A020D_PROOF_ATTEMPT_COUNT_INVALID:${attempts.length}`
    );
  }


  const attempt =
    attempts[0]
      .evidence;


  return createExecutionAdapterInvocationProof({
    adapterTrustRegistryPath:
      trustRegistryPath,

    capabilityRegistryPath,

    context: {
      execution_id:
        attempt.execution_id,

      attempt_id:
        attempt.attempt_id,

      authorization_id:
        attempt.authorization
          .authorization_id,

      consumption_id:
        attempt.consumption
          .consumption_id,

      adapter_id:
        adapterId,

      adapter_key_id:
        adapterKeyId,

      capability_grant_id:
        capabilityGrantId,

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        externalSystemReference,

      execution_payload_sha256:
        attempt.execution_payload_sha256,

      idempotency_key_sha256:
        attempt.idempotency
          .key_sha256
    },

    signedAt,

    signInvocationPayload:
      (payloadBytes) =>
        sign(
          null,
          payloadBytes,
          signingKey
        )
  });
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

    provenanceRegistryPath:
      fixture.provenanceRegistryPath,

    adapterTrustRegistryPath:
      adapterTrustPath,

    capabilityRegistryPath:
      adapterCapabilityPath,

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

    adapterInvocationProof:
      adapterProofForFixture(
        fixture
      ),

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
                true ||
            envelope
              .adapter_signed_authorization_verified !==
                true ||
            envelope
              .adapter_identity_trusted !==
                true ||
            envelope
              .adapter_key_control_proven !==
                true ||
            envelope
              .adapter_capability_authorized !==
                true ||
            envelope
              .external_system_authorization_proven !==
                true ||
            envelope
              .adapter_authorization_time_source !==
                "LOCAL_SYSTEM_CLOCK" ||
            envelope
              .legal_identity_proven !==
                false ||
            envelope
              .legal_authority_created !==
                false ||
            envelope
              .remote_target_authenticity_proven !==
                false
          ) {
            fail(
              "A019_INVOCATION_PROVENANCE_NOT_REVERIFIED"
            );
          }


          console.log(
            "A020D_CALLBACK_AUTHORIZATION_ENVELOPE=PASS"
          );


          if (
            envelope
              .adapter_authorization_provenance_verified !==
                true ||
            typeof envelope
              .adapter_authorization_provenance_record_sha256 !==
                "string" ||
            envelope
              .adapter_authorization_provenance_record_sha256
              .length !==
                64
          ) {
            fail(
              "A020E_C_CALLBACK_PROVENANCE_ENVELOPE_INVALID"
            );
          }


          const liveProvenanceVerification =
            verifyExecutionAdapterAuthorizationProvenanceRegistry({
              registryPath:
                valid.provenanceRegistryPath,

              invocationRegistryPath:
                valid.invocationRegistryPath,

              adapterTrustRegistryPath:
                adapterTrustPath,

              capabilityRegistryPath:
                adapterCapabilityPath
            });


          if (
            liveProvenanceVerification
              .valid !==
                true ||
            liveProvenanceVerification
              .record_count !==
                1 ||
            liveProvenanceVerification
              .adapter_signature_cryptographically_verified !==
                true ||
            liveProvenanceVerification
              .historical_adapter_trust_verified !==
                true ||
            liveProvenanceVerification
              .historical_capability_authorization_verified !==
                true ||
            liveProvenanceVerification
              .historical_exact_target_authorization_verified !==
                true ||
            liveProvenanceVerification
              .authorization_state_as_of_recorded_check_verified !==
                true
          ) {
            fail(
              "A020E_C_CALLBACK_PROVENANCE_NOT_VERIFIED"
            );
          }


          console.log(
            "A020E_C_LIVE_PROVENANCE_BEFORE_CALLBACK=PASS"
          );


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
    validResult.adapter_identity_trusted !==
      true ||
    validResult.adapter_key_control_proven !==
      true ||
    validResult.adapter_capability_authorized !==
      true ||
    validResult.external_system_authorization_proven !==
      true ||
    validResult.adapter_signed_authorization_verified !==
      true ||
    validResult.current_callback_authorization_rechecked !==
      true ||
    validResult.legal_identity_proven !==
      false ||
    validResult.legal_authority_created !==
      false ||
    validResult.remote_target_authenticity_verified !==
      false ||
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
      "EXECUTION_ADAPTER_CALLBACK_FAILED" ||
    throwResult.adapter_identity_trusted !==
      true ||
    throwResult.adapter_key_control_proven !==
      true ||
    throwResult.adapter_capability_authorized !==
      true ||
    throwResult.external_system_authorization_proven !==
      true ||
    throwResult.adapter_signed_authorization_verified !==
      true ||
    throwResult.current_callback_authorization_rechecked !==
      true
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
   * 9. MISSING SIGNED PROOF
   * ===================================================
   */

  const missingProofFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-MISSING-PROOF",

      payload:
        "{\"missing_proof\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-MISSING-PROOF"
    });


  let missingProofCalls =
    0;


  await expectReject(
    "A020D_MISSING_SIGNED_PROOF_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          missingProofFixture,

          async () => {
            missingProofCalls += 1;
            return {};
          }
        ),

        adapterInvocationProof:
          null
      }),

    "EXECUTION_ADAPTER_SIGNED_AUTHORIZATION_PROOF_REQUIRED"
  );


  if (
    missingProofCalls !==
      0 ||
    existsSync(
      missingProofFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_MISSING_PROOF_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_MISSING_SIGNED_PROOF_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 10. PROOF CREATED BEFORE EXECUTION ADMISSION
   * ===================================================
   */

  const earlyProofFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-EARLY-PROOF",

      payload:
        "{\"early_proof\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-EARLY-PROOF"
    });


  const earlyProof =
    adapterProofForFixture(
      earlyProofFixture,
      {
        signedAt:
          "2026-08-24T10:06:01Z"
      }
    );


  let earlyProofCalls =
    0;


  await expectReject(
    "A020D_PROOF_BEFORE_EXECUTION_ADMISSION_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          earlyProofFixture,

          async () => {
            earlyProofCalls += 1;
            return {};
          }
        ),

        adapterInvocationProof:
          earlyProof
      }),

    "EXECUTION_ADAPTER_INVOCATION_PROOF_BEFORE_EXECUTION_ADMISSION"
  );


  if (
    earlyProofCalls !==
      0 ||
    existsSync(
      earlyProofFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_EARLY_PROOF_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_PROOF_BEFORE_EXECUTION_ADMISSION_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 11. TARGET SUBSTITUTION
   * ===================================================
   */

  const targetFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-TARGET",

      payload:
        "{\"target\":\"A\"}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-TARGET"
    });


  let targetCalls =
    0;


  await expectReject(
    "A020D_TARGET_SUBSTITUTION_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          targetFixture,

          async () => {
            targetCalls += 1;
            return {};
          }
        ),

        externalSystemReference:
          "BANK-SANDBOX-SUBSTITUTED"
      }),

    "EXECUTION_ADAPTER_SIGNED_AUTHORIZATION_VERIFY_FAILED"
  );


  if (
    targetCalls !==
      0 ||
    existsSync(
      targetFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_TARGET_SUBSTITUTION_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_TARGET_SUBSTITUTION_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 12. FUTURE SIGNED_AT
   * ===================================================
   */

  const futureTrustPath =
    join(
      root,
      "adapter-trust-future.jsonl"
    );


  const futureCapabilityPath =
    join(
      root,
      "adapter-capability-future.jsonl"
    );


  registerAdapterTrust({
    registryPath:
      futureTrustPath,

    eventId:
      "ADAPTER-TRUST-EVENT-A020D-FUTURE",

    validUntil:
      "2100-01-01T00:00:00Z"
  });


  grantAdapterCapability({
    registryPath:
      futureCapabilityPath,

    eventId:
      "ADAPTER-CAPABILITY-EVENT-A020D-FUTURE",

    validUntil:
      "2100-01-01T00:00:00Z"
  });


  const futureFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-FUTURE",

      payload:
        "{\"future\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-FUTURE"
    });


  const futureProof =
    adapterProofForFixture(
      futureFixture,
      {
        trustRegistryPath:
          futureTrustPath,

        capabilityRegistryPath:
          futureCapabilityPath,

        signedAt:
          "2099-01-01T00:00:00Z"
      }
    );


  let futureCalls =
    0;


  await expectReject(
    "A020D_FUTURE_SIGNED_AT_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          futureFixture,

          async () => {
            futureCalls += 1;
            return {};
          }
        ),

        adapterTrustRegistryPath:
          futureTrustPath,

        capabilityRegistryPath:
          futureCapabilityPath,

        adapterInvocationProof:
          futureProof
      }),

    "EXECUTION_ADAPTER_INVOCATION_PROOF_FROM_FUTURE"
  );


  if (
    futureCalls !==
      0 ||
    existsSync(
      futureFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_FUTURE_PROOF_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_FUTURE_SIGNED_AT_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 13. HISTORICALLY VALID KEY, CURRENTLY REVOKED
   * ===================================================
   */

  const revokedTrustPath =
    join(
      root,
      "adapter-trust-current-revoked.jsonl"
    );


  registerAdapterTrust({
    registryPath:
      revokedTrustPath,

    eventId:
      "ADAPTER-TRUST-EVENT-A020D-CURRENT-KEY"
  });


  const revokedKeyFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-REVOKED-KEY",

      payload:
        "{\"revoked_key\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-REVOKED-KEY"
    });


  const revokedKeyProof =
    adapterProofForFixture(
      revokedKeyFixture,
      {
        trustRegistryPath:
          revokedTrustPath
      }
    );


  revokeExecutionAdapterKey({
    registryPath:
      revokedTrustPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-TRUST-EVENT-A020D-CURRENT-KEY-REVOKED",

      event_type:
        "REVOKED",

      adapter_id:
        "ADAPTER-A019-REFERENCE",

      key_id:
        "ADAPTER-KEY-A019-REFERENCE",

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

      public_key_sha256:
        adapterPublicSha,

      revoked_at:
        "2026-08-24T11:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T11:05:00Z",

    recordedBy:
      "IPR-A020D-TRUST-ADMIN"
  });


  let revokedKeyCalls =
    0;


  await expectReject(
    "A020D_CURRENT_REVOKED_KEY_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          revokedKeyFixture,

          async () => {
            revokedKeyCalls += 1;
            return {};
          }
        ),

        adapterTrustRegistryPath:
          revokedTrustPath,

        adapterInvocationProof:
          revokedKeyProof
      }),

    "EXECUTION_ADAPTER_CURRENT_AUTHORIZATION_VERIFY_FAILED"
  );


  if (
    revokedKeyCalls !==
      0 ||
    existsSync(
      revokedKeyFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_REVOKED_KEY_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_CURRENT_REVOKED_KEY_CALLBACK_ZERO=PASS"
  );


  /*
   * ===================================================
   * 14. HISTORICALLY VALID CAPABILITY,
   *     CURRENTLY REVOKED
   * ===================================================
   */

  const revokedCapabilityPath =
    join(
      root,
      "adapter-capability-current-revoked.jsonl"
    );


  grantAdapterCapability({
    registryPath:
      revokedCapabilityPath,

    eventId:
      "ADAPTER-CAPABILITY-EVENT-A020D-CURRENT-CAP"
  });


  const revokedCapabilityFixture =
    createAdmittedAttempt({
      suffix:
        "A020D-REVOKED-CAPABILITY",

      payload:
        "{\"revoked_capability\":true}",

      idempotencyKey:
        "IDEMPOTENCY-A020D-REVOKED-CAPABILITY"
    });


  const revokedCapabilityProof =
    adapterProofForFixture(
      revokedCapabilityFixture,
      {
        capabilityRegistryPath:
          revokedCapabilityPath
      }
    );


  revokeExecutionAdapterCapability({
    registryPath:
      revokedCapabilityPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-CAPABILITY-EVENT-A020D-CURRENT-CAP-REVOKED",

      event_type:
        "REVOKED",

      grant_id:
        "ADAPTER-CAPABILITY-GRANT-A019-REFERENCE",

      adapter_id:
        "ADAPTER-A019-REFERENCE",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        "BANK-SANDBOX-A019",

      revoked_at:
        "2026-08-24T11:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T11:05:00Z",

    recordedBy:
      "IPR-A020D-CAPABILITY-ADMIN"
  });


  let revokedCapabilityCalls =
    0;


  await expectReject(
    "A020D_CURRENT_REVOKED_CAPABILITY_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          revokedCapabilityFixture,

          async () => {
            revokedCapabilityCalls += 1;
            return {};
          }
        ),

        capabilityRegistryPath:
          revokedCapabilityPath,

        adapterInvocationProof:
          revokedCapabilityProof
      }),

    "EXECUTION_ADAPTER_CURRENT_AUTHORIZATION_VERIFY_FAILED"
  );


  if (
    revokedCapabilityCalls !==
      0 ||
    existsSync(
      revokedCapabilityFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020D_REVOKED_CAPABILITY_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020D_CURRENT_REVOKED_CAPABILITY_CALLBACK_ZERO=PASS"
  );


  console.log(
    "A020D_R1B_ATTACK_SUITE=PASS"
  );


  /*
   * A020E-C: missing provenance path.
   * Must fail before A019 durable claim.
   */

  const missingProvenanceFixture =
    createAdmittedAttempt({
      suffix:
        "A020E-C-MISSING-PROVENANCE",

      payload:
        "{\"a020e\":\"missing-provenance\"}",

      idempotencyKey:
        "IDEMPOTENCY-A020E-C-MISSING-PROVENANCE"
    });


  let missingProvenanceCalls =
    0;


  await expectReject(
    "A020E_C_MISSING_PROVENANCE_PATH_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          missingProvenanceFixture,

          async () => {
            missingProvenanceCalls += 1;
            return {};
          }
        ),

        provenanceRegistryPath:
          undefined
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_PATH_REQUIRED"
  );


  if (
    missingProvenanceCalls !==
      0 ||
    existsSync(
      missingProvenanceFixture
        .invocationRegistryPath
    )
  ) {
    fail(
      "A020E_C_MISSING_PROVENANCE_REACHED_CLAIM_OR_CALLBACK"
    );
  }


  console.log(
    "A020E_C_MISSING_PROVENANCE_CALLBACK_ZERO=PASS"
  );


  console.log(
    "A020E_C_MISSING_PROVENANCE_CLAIM_NONE=PASS"
  );


  /*
   * A020E-C: provenance persistence failure after A019
   * claim. Callback must remain blocked, claim spent.
   */

  const provenanceFailureFixture =
    createAdmittedAttempt({
      suffix:
        "A020E-C-PROVENANCE-FAILURE",

      payload:
        "{\"a020e\":\"persistence-failure\"}",

      idempotencyKey:
        "IDEMPOTENCY-A020E-C-PROVENANCE-FAILURE"
    });


  let provenanceFailureCalls =
    0;


  await expectReject(
    "A020E_C_POSTCLAIM_PROVENANCE_FAILURE_DENIED",

    () =>
      invokeExecutionAdapterBoundary({
        ...boundaryArgs(
          provenanceFailureFixture,

          async () => {
            provenanceFailureCalls += 1;
            return {};
          }
        ),

        provenanceRegistryPath:
          root
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_EMISSION_VERIFY_FAILED"
  );


  if (
    provenanceFailureCalls !==
      0
  ) {
    fail(
      "A020E_C_POSTCLAIM_PROVENANCE_FAILURE_REACHED_CALLBACK"
    );
  }


  console.log(
    "A020E_C_POSTCLAIM_PROVENANCE_FAILURE_CALLBACK_ZERO=PASS"
  );


  const spentInvocationRecords =
    listExecutionAdapterInvocations({
      registryPath:
        provenanceFailureFixture
          .invocationRegistryPath
    });


  if (
    spentInvocationRecords.length !==
      1
  ) {
    fail(
      `A020E_C_POSTCLAIM_SPENT_COUNT_INVALID:${spentInvocationRecords.length}`
    );
  }


  console.log(
    "A020E_C_POSTCLAIM_FAILURE_CLAIM_REMAINS_SPENT=PASS"
  );


  console.log(
    "A020E_C_LIVE_PROVENANCE_EMISSION_ATTACKS=PASS"
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
    "ADAPTER_IDENTITY_TRUST=TECHNICAL_KEY_CONTROL_ENFORCED"
  );

  console.log(
    "ADAPTER_CAPABILITY_AUTHORIZATION=ENFORCED"
  );

  console.log(
    "EXTERNAL_RESPONSE_AUTHENTICITY=NOT_IMPLEMENTED"
  );

  console.log(
    "EXTERNAL_SYSTEM_AUTHORIZATION_BINDING=ENFORCED_BY_A020D_LOCAL_POLICY"
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

  console.log(
    "A020D_CURRENT_CALLBACK_AUTHORIZATION=ENFORCED"
  );

  console.log(
    "A020D_SIGNED_ADAPTER_AUTHORIZATION=PASS"
  );

  console.log(
    "A020D_LIVE_GATE_ATTACKS=PASS"
  );

  console.log(
    "A020E_C_DURABLE_PROVENANCE_BEFORE_CALLBACK=ENFORCED"
  );

  console.log(
    "A020E_C_LIVE_PROVENANCE_EMISSION=PASS"
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
