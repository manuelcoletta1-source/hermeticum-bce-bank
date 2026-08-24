import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import {
  createHash,
  generateKeyPairSync,
  sign
} from "node:crypto";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  consumeAuthorization
} from "../protocol/hbce-authorization-consumption.reference.mjs";

import {
  registerAdmissionSignerKey
} from "../protocol/hbce-admission-signer-trust.reference.mjs";

import {
  appendExecutionEvidence,
  verifyExecutionEvidenceRegistry
} from "../protocol/hbce-execution-evidence-registry.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a018-"
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

  if (actual !== expected) {
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
  return createHash(
    "sha256"
  )
    .update(
      canonicalize(value),
      "utf8"
    )
    .digest("hex");
}


function registerSigner({
  registryPath,
  signerId,
  keyId,
  publicKeyDer,
  publicKeySha256,
  eventId
}) {
  registerAdmissionSignerKey({
    registryPath,

    trust: {
      schema_version:
        "1.0",

      event_id:
        eventId,

      event_type:
        "TRUSTED",

      signer_id:
        signerId,

      key_id:
        keyId,

      scope:
        "ADMISSION_CONSUMPTION_SIGNING",

      algorithm:
        "ED25519",

      public_key_spki_der_base64:
        publicKeyDer.toString(
          "base64"
        ),

      public_key_sha256:
        publicKeySha256,

      valid_from:
        "2026-08-24T09:00:00Z",

      valid_until:
        "2026-08-24T12:00:00Z"
    },

    recordedAt:
      "2026-08-24T09:00:00Z",

    recordedBy:
      "IPR-A018-TRUST-ADMIN"
  });
}


function makeAttempt({
  suffix,
  consumption,
  runtimeBinding
}) {
  return {
    schema_version:
      "1.0",

    evidence_id:
      `EXECUTION-EVIDENCE-A018-${suffix}`,

    evidence_type:
      "EXECUTION_ATTEMPTED",

    execution_id:
      `EXECUTION-A018-${suffix}`,

    attempt_id:
      `EXECUTION-ATTEMPT-A018-${suffix}`,

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
      "b".repeat(64),

    idempotency: {
      key_sha256:
        "c".repeat(64),

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
        "HBCE-A018-ADAPTER",

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
  const consumptionPath =
    join(
      root,
      "consumption.jsonl"
    );

  const executionPath =
    join(
      root,
      "execution.jsonl"
    );

  const trustPath =
    join(
      root,
      "trust.jsonl"
    );

  const wrongTrustPath =
    join(
      root,
      "wrong-trust.jsonl"
    );


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


  registerSigner({
    registryPath:
      trustPath,

    signerId:
      "ADMISSION-SIGNER-A018",

    keyId:
      "ADMISSION-KEY-A018",

    publicKeyDer:
      publicDer,

    publicKeySha256:
      publicSha,

    eventId:
      "ADMISSION-TRUST-EVENT-A018"
  });


  /*
   * Wrong but structurally valid trust registry.
   */

  const {
    publicKey:
      wrongPublicKey
  } =
    generateKeyPairSync(
      "ed25519"
    );


  const wrongPublicDer =
    wrongPublicKey.export({
      type:
        "spki",

      format:
        "der"
    });


  const wrongPublicSha =
    createHash(
      "sha256"
    )
      .update(
        wrongPublicDer
      )
      .digest("hex");


  registerSigner({
    registryPath:
      wrongTrustPath,

    signerId:
      "ADMISSION-SIGNER-A018-WRONG",

    keyId:
      "ADMISSION-KEY-A018-WRONG",

    publicKeyDer:
      wrongPublicDer,

    publicKeySha256:
      wrongPublicSha,

    eventId:
      "ADMISSION-TRUST-EVENT-A018-WRONG"
  });


  const authorization = {
    authorization_id:
      "AUTHORIZATION-A018",

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
        consumptionPath,

      consumptionId:
        "CONSUMPTION-A018",

      authorization,

      evaluationEvtId:
        "EVT-A018",

      evaluationEvtSha256:
        "1".repeat(64),

      presentedRuntimeBindingSha256:
        sha256Canonical(
          runtimeBinding
        ),

      consumedAt:
        "2026-08-24T10:05:00Z",

      consumedBy:
        "IPR-A018",

      admissionTrustRegistryPath:
        trustPath,

      admissionSignerId:
        "ADMISSION-SIGNER-A018",

      admissionKeyId:
        "ADMISSION-KEY-A018",

      signAdmissionPayload:
        (payloadBytes) =>
          sign(
            null,
            payloadBytes,
            privateKey
          )
    });


  /*
   * ===================================================
   * 1. MISSING EXECUTION TRUST REFERENCE FAILS CLOSED
   * ===================================================
   */

  expectError(
    "A018_MISSING_TRUST_REGISTRY_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          join(
            root,
            "missing-trust-execution.jsonl"
          ),

        consumptionRegistryPath:
          consumptionPath,

        evidence:
          makeAttempt({
            suffix:
              "MISSING-TRUST",

            consumption,

            runtimeBinding
          }),

        appendedAt:
          "2026-08-24T10:06:02Z"
      }),

    "EXECUTION_ADMISSION_TRUST_REGISTRY_PATH_REQUIRED"
  );


  /*
   * ===================================================
   * 2. CORRECT TRUST + VALID SIGNATURE ALLOWS ATTEMPT
   * ===================================================
   */

  appendExecutionEvidence({
    registryPath:
      executionPath,

    consumptionRegistryPath:
      consumptionPath,

    admissionTrustRegistryPath:
      trustPath,

    evidence:
      makeAttempt({
        suffix:
          "VALID",

        consumption,

        runtimeBinding
      }),

    appendedAt:
      "2026-08-24T10:06:02Z"
  });


  console.log(
    "A018_VALID_SIGNATURE_EXECUTION_ADMISSION=PASS"
  );


  /*
   * ===================================================
   * 3. HISTORICAL VERIFY RE-RUNS CRYPTOGRAPHIC CHECK
   * ===================================================
   */

  const verified =
    verifyExecutionEvidenceRegistry({
      registryPath:
        executionPath,

      consumptionRegistryPath:
        consumptionPath,

      admissionTrustRegistryPath:
        trustPath
    });


  if (
    verified.valid !==
      true ||
    verified.record_count !==
      1
  ) {
    fail(
      "A018_EXECUTION_REGISTRY_VERIFY_INVALID"
    );
  }


  console.log(
    "A018_HISTORICAL_EXECUTION_PROVENANCE_VERIFY=PASS"
  );


  /*
   * ===================================================
   * 4. WRONG TRUST REGISTRY FAILS CLOSED
   * ===================================================
   */

  expectError(
    "A018_WRONG_TRUST_REGISTRY_DENIED",

    () =>
      verifyExecutionEvidenceRegistry({
        registryPath:
          executionPath,

        consumptionRegistryPath:
          consumptionPath,

        admissionTrustRegistryPath:
          wrongTrustPath
      }),

    "EXECUTION_ADMISSION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  /*
   * ===================================================
   * 5. FORGED SIGNATURE WITH REHASHED A012 ENVELOPE
   *
   * A012 structural verification remains valid because
   * the attacker recomputes the record hash.
   *
   * The signed payload itself is unchanged.
   * Only the Ed25519 signature is replaced.
   *
   * This is the critical A018 property:
   * structural integrity alone must not admit execution.
   * ===================================================
   */

  const forgedConsumptionPath =
    join(
      root,
      "forged-consumption.jsonl"
    );


  const persistedConsumption =
    JSON.parse(
      readFileSync(
        consumptionPath,
        "utf8"
      ).trim()
    );


  const forgedBasis = {
    ...persistedConsumption,

    admission_signature_base64:
      Buffer.alloc(
        64,
        0
      ).toString(
        "base64"
      )
  };


  delete forgedBasis
    .record_sha256;


  const forgedConsumption = {
    ...forgedBasis,

    record_sha256:
      sha256Canonical(
        forgedBasis
      )
  };


  writeFileSync(
    forgedConsumptionPath,
    `${JSON.stringify(forgedConsumption)}\n`,
    "utf8"
  );


  expectError(
    "A018_REHASHED_INVALID_SIGNATURE_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          join(
            root,
            "forged-execution.jsonl"
          ),

        consumptionRegistryPath:
          forgedConsumptionPath,

        admissionTrustRegistryPath:
          trustPath,

        evidence:
          makeAttempt({
            suffix:
              "FORGED",

            consumption:
              forgedConsumption,

            runtimeBinding
          }),

        appendedAt:
          "2026-08-24T10:06:03Z"
      }),

    "EXECUTION_ADMISSION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  /*
   * ===================================================
   * 6. RUNTIME CONTINUITY STILL ENFORCED
   * ===================================================
   */

  expectError(
    "A018_RUNTIME_SUBSTITUTION_STILL_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          join(
            root,
            "runtime-substitution.jsonl"
          ),

        consumptionRegistryPath:
          consumptionPath,

        admissionTrustRegistryPath:
          trustPath,

        evidence:
          makeAttempt({
            suffix:
              "RUNTIME-SUBSTITUTION",

            consumption,

            runtimeBinding: {
              ...runtimeBinding,

              runtime_id:
                "A28"
            }
          }),

        appendedAt:
          "2026-08-24T10:06:04Z"
      }),

    "EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH"
  );


  console.log("");
  console.log(
    "===== A018 FINAL MATRIX ====="
  );

  console.log(
    "EXECUTION_BOUNDARY_ED25519_VERIFY=ENFORCED"
  );

  console.log(
    "EXECUTION_BOUNDARY_TRUST_REGISTRY_REFERENCE=REQUIRED"
  );

  console.log(
    "HISTORICAL_EXECUTION_VERIFY_RECHECKS_SIGNATURE=TRUE"
  );

  console.log(
    "WRONG_TRUST_REGISTRY=DENIED"
  );

  console.log(
    "REHASHED_INVALID_SIGNATURE=DENIED"
  );

  console.log(
    "STRUCTURAL_INTEGRITY_ALONE=INSUFFICIENT"
  );

  console.log(
    "RUNTIME_CONTINUITY=ENFORCED"
  );

  console.log(
    "TRUST_AS_OF_CONSUMED_AT=REVERIFIED"
  );

  console.log(
    "CURRENT_SIGNER_TRUST_AT_EXECUTION_TIME=NOT_CLAIMED"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "SIGNATURE_PROVES_KEY_CONTROL=TRUE"
  );

  console.log(
    "SIGNATURE_PROVES_HUMAN_IDENTITY=FALSE"
  );

  console.log(
    "SIGNATURE_CREATES_LEGAL_AUTHORITY=FALSE"
  );

  console.log(
    "EXECUTION_ATTEMPT_PROVES_EXTERNAL_EXECUTION=FALSE"
  );

  console.log(
    "EXECUTION_ATTEMPT_PROVES_SUCCESS=FALSE"
  );

  console.log(
    "A018_EXECUTION_PROVENANCE_CRYPTOGRAPHIC_VERIFY=PASS"
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
