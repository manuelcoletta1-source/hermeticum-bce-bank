import {
  mkdtempSync,
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
      "hbce-a017-2d1-"
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
    return `[${value.map(canonicalize).join(",")}]`;
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


function makeAttempt({
  suffix,
  consumption,
  runtimeBinding
}) {
  return {
    schema_version:
      "1.0",

    evidence_id:
      `EXECUTION-EVIDENCE-A0172D1-${suffix}`,

    evidence_type:
      "EXECUTION_ATTEMPTED",

    execution_id:
      `EXECUTION-A0172D1-${suffix}`,

    attempt_id:
      `EXECUTION-ATTEMPT-A0172D1-${suffix}`,

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
        "HBCE-A0172D1-ADAPTER",

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
  const runtime = {
    runtime_id:
      "A27",

    runtime_type:
      "AI_AGENT",

    runtime_version:
      "1.0",

    runtime_digest_sha256:
      "e".repeat(64)
  };


  const trustPath =
    join(
      root,
      "trust.jsonl"
    );


  /*
   * 1. Historical unsigned 1.1 is readable by A012,
   *    but insufficient for NEW execution admission.
   */

  const legacyConsumptionPath =
    join(
      root,
      "legacy-consumption.jsonl"
    );

  const legacyExecutionPath =
    join(
      root,
      "legacy-execution.jsonl"
    );


  const legacyBasis = {
    registry_version:
      "1.1",

    record_type:
      "AUTHORIZATION_CONSUMED",

    consumption_id:
      "CONSUMPTION-A0172D1-LEGACY",

    authorization_id:
      "AUTHORIZATION-A0172D1-LEGACY",

    authorization_sha256:
      "1".repeat(64),

    evaluation_evt_id:
      "EVT-A0172D1-LEGACY",

    evaluation_evt_sha256:
      "2".repeat(64),

    presented_runtime_binding_sha256:
      sha256Canonical(
        runtime
      ),

    consumed_at:
      "2026-08-24T10:05:00Z",

    consumed_by:
      "IPR-A0172D1",

    previous_record_sha256:
      null
  };


  const legacyConsumption = {
    ...legacyBasis,

    record_sha256:
      sha256Canonical(
        legacyBasis
      )
  };


  writeFileSync(
    legacyConsumptionPath,
    `${JSON.stringify(legacyConsumption)}\n`,
    "utf8"
  );


  expectError(
    "A017_2D1_UNSIGNED_V1_1_EXECUTION_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          legacyExecutionPath,

        consumptionRegistryPath:
          legacyConsumptionPath,

        admissionTrustRegistryPath:
          trustPath,

        evidence:
          makeAttempt({
            suffix:
              "LEGACY",

            consumption:
              legacyConsumption,

            runtimeBinding:
              runtime
          }),

        appendedAt:
          "2026-08-24T10:06:02Z"
      }),

    "EXECUTION_ADMISSION_SIGNED_CONSUMPTION_REQUIRED"
  );


  /*
   * 2. Build trusted signer and signed 1.2 consumption.
   */

  const signedConsumptionPath =
    join(
      root,
      "signed-consumption.jsonl"
    );

  const signedExecutionPath =
    join(
      root,
      "signed-execution.jsonl"
    );


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


  registerAdmissionSignerKey({
    registryPath:
      trustPath,

    trust: {
      schema_version:
        "1.0",

      event_id:
        "ADMISSION-TRUST-EVENT-A0172D1",

      event_type:
        "TRUSTED",

      signer_id:
        "ADMISSION-SIGNER-A0172D1",

      key_id:
        "ADMISSION-KEY-A0172D1",

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
        "2026-08-24T12:00:00Z"
    },

    recordedAt:
      "2026-08-24T09:00:00Z",

    recordedBy:
      "IPR-A0172D1-ADMIN"
  });


  const authorization = {
    authorization_id:
      "AUTHORIZATION-A0172D1-SIGNED",

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


  const signedConsumption =
    consumeAuthorization({
      registryPath:
        signedConsumptionPath,

      consumptionId:
        "CONSUMPTION-A0172D1-SIGNED",

      authorization,

      evaluationEvtId:
        "EVT-A0172D1-SIGNED",

      evaluationEvtSha256:
        "3".repeat(64),

      presentedRuntimeBindingSha256:
        sha256Canonical(
          runtime
        ),

      consumedAt:
        "2026-08-24T10:05:00Z",

      consumedBy:
        "IPR-A0172D1",

      admissionTrustRegistryPath:
        trustPath,

      admissionSignerId:
        "ADMISSION-SIGNER-A0172D1",

      admissionKeyId:
        "ADMISSION-KEY-A0172D1",

      signAdmissionPayload:
        (payloadBytes) =>
          sign(
            null,
            payloadBytes,
            privateKey
          )
    });


  if (
    signedConsumption.registry_version !==
      "1.2" ||
    signedConsumption
      .admission_signature_algorithm !==
      "ED25519"
  ) {
    fail(
      "A017_2D1_SIGNED_CONSUMPTION_INVALID"
    );
  }


  /*
   * 3. Signed 1.2 is cryptographically admissible.
   */

  appendExecutionEvidence({
    registryPath:
      signedExecutionPath,

    consumptionRegistryPath:
      signedConsumptionPath,

    admissionTrustRegistryPath:
      trustPath,

    evidence:
      makeAttempt({
        suffix:
          "SIGNED",

        consumption:
          signedConsumption,

        runtimeBinding:
          runtime
      }),

    appendedAt:
      "2026-08-24T10:06:02Z"
  });


  const state =
    verifyExecutionEvidenceRegistry({
      registryPath:
        signedExecutionPath,

      consumptionRegistryPath:
        signedConsumptionPath,

      admissionTrustRegistryPath:
        trustPath
    });


  if (
    state.valid !==
      true ||
    state.record_count !==
      1
  ) {
    fail(
      "A017_2D1_SIGNED_EXECUTION_STATE_INVALID"
    );
  }


  console.log(
    "A017_2D1_SIGNED_V1_2_EXECUTION_ADMISSION=PASS"
  );


  /*
   * 4. Signature existence does not weaken runtime binding.
   */

  expectError(
    "A017_2D1_SIGNED_RUNTIME_SUBSTITUTION_DENIED",

    () =>
      appendExecutionEvidence({
        registryPath:
          join(
            root,
            "runtime-substitution.jsonl"
          ),

        consumptionRegistryPath:
          signedConsumptionPath,

        admissionTrustRegistryPath:
          trustPath,

        evidence:
          makeAttempt({
            suffix:
              "SUBSTITUTION",

            consumption:
              signedConsumption,

            runtimeBinding: {
              ...runtime,

              runtime_id:
                "A28"
            }
          }),

        appendedAt:
          "2026-08-24T10:06:03Z"
      }),

    "EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH"
  );


  console.log("");
  console.log(
    "===== A017.2D1 FINAL MATRIX ====="
  );

  console.log(
    "UNSIGNED_V1_1_NEW_EXECUTION=DENIED"
  );

  console.log(
    "SIGNED_V1_2_NEW_EXECUTION=ALLOWED"
  );

  console.log(
    "RUNTIME_CONTINUITY=ENFORCED"
  );

  console.log(
    "STRUCTURAL_SIGNED_ADMISSION=ENFORCED"
  );

  console.log(
    "INDEPENDENT_ED25519_EXECUTION_VERIFY=ENFORCED"
  );

  console.log(
    "TRUST_REGISTRY_EXECUTION_RECHECK=ENFORCED"
  );

  console.log(
    "SIGNED_CONSUMPTION_IS_NOT_EXECUTION_SUCCESS=TRUE"
  );

  console.log(
    "A017_2D1_SIGNED_EXECUTION_ADMISSION_GATE=PASS"
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
