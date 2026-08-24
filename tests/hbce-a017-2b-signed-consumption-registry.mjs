import {
  existsSync,
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
  registerAdmissionSignerKey,
  revokeAdmissionSignerKey
} from "../protocol/hbce-admission-signer-trust.reference.mjs";


import {
  verifyAdmissionConsumptionSignature
} from "../protocol/hbce-admission-signature.reference.mjs";


import {
  consumeAuthorization,
  getAuthorizationConsumption,
  verifyAuthorizationConsumptionRegistry
} from "../protocol/hbce-authorization-consumption.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a017-2b-"
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
    actual !==
      expected
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
  return createHash(
    "sha256"
  )
    .update(
      canonicalize(value),
      "utf8"
    )
    .digest("hex");
}


function publicMaterial(
  publicKey
) {
  const der =
    publicKey.export({
      type:
        "spki",

      format:
        "der"
    });

  return {
    base64:
      der.toString(
        "base64"
      ),

    sha256:
      createHash(
        "sha256"
      )
        .update(der)
        .digest("hex")
  };
}


function authorization(
  suffix,
  issuedAt
) {
  return {
    authorization_id:
      `AUTHORIZATION-A0172B-${suffix}`,

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


function trustEvent({
  eventId,
  signerId,
  keyId,
  publicInfo
}) {
  return {
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
      publicInfo.base64,

    public_key_sha256:
      publicInfo.sha256,

    valid_from:
      "2026-08-24T09:00:00Z",

    valid_until:
      "2026-08-24T12:00:00Z"
  };
}


try {
  const trustRegistryPath =
    join(
      root,
      "trust.jsonl"
    );

  const consumptionRegistryPath =
    join(
      root,
      "consumption.jsonl"
    );


  const {
    publicKey,
    privateKey
  } =
    generateKeyPairSync(
      "ed25519"
    );


  const {
    privateKey:
      wrongPrivateKey
  } =
    generateKeyPairSync(
      "ed25519"
    );


  const publicInfo =
    publicMaterial(
      publicKey
    );


  const signerId =
    "ADMISSION-SIGNER-A0172B";

  const keyId =
    "ADMISSION-KEY-A0172B";


  const trustRecord =
    registerAdmissionSignerKey({
      registryPath:
        trustRegistryPath,

      trust:
        trustEvent({
          eventId:
            "ADMISSION-TRUST-EVENT-A0172B",

          signerId,

          keyId,

          publicInfo
        }),

      recordedAt:
        "2026-08-24T09:00:00Z",

      recordedBy:
        "IPR-A0172B-ADMIN"
    });


  /*
   * ===================================================
   * 1. HISTORICAL V1.0 + V1.1
   * ===================================================
   */

  const v10Basis = {
    registry_version:
      "1.0",

    record_type:
      "AUTHORIZATION_CONSUMED",

    consumption_id:
      "CONSUMPTION-A0172B-V10",

    authorization_id:
      "AUTHORIZATION-A0172B-V10",

    authorization_sha256:
      "1".repeat(64),

    evaluation_evt_id:
      "EVT-A0172B-V10",

    evaluation_evt_sha256:
      "2".repeat(64),

    consumed_at:
      "2026-08-24T09:10:00Z",

    consumed_by:
      "IPR-A0172B-V10",

    previous_record_sha256:
      null
  };


  const v10 = {
    ...v10Basis,

    record_sha256:
      sha256Canonical(
        v10Basis
      )
  };


  const v11Basis = {
    registry_version:
      "1.1",

    record_type:
      "AUTHORIZATION_CONSUMED",

    consumption_id:
      "CONSUMPTION-A0172B-V11",

    authorization_id:
      "AUTHORIZATION-A0172B-V11",

    authorization_sha256:
      "3".repeat(64),

    evaluation_evt_id:
      "EVT-A0172B-V11",

    evaluation_evt_sha256:
      "4".repeat(64),

    presented_runtime_binding_sha256:
      "5".repeat(64),

    consumed_at:
      "2026-08-24T09:20:00Z",

    consumed_by:
      "IPR-A0172B-V11",

    previous_record_sha256:
      v10.record_sha256
  };


  const v11 = {
    ...v11Basis,

    record_sha256:
      sha256Canonical(
        v11Basis
      )
  };


  writeFileSync(
    consumptionRegistryPath,
    `${JSON.stringify(v10)}\n${JSON.stringify(v11)}\n`,
    "utf8"
  );


  const historical =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    historical.valid !==
      true ||
    historical.record_count !==
      2 ||
    historical.signed_record_count !==
      0 ||
    historical.unsigned_historical_record_count !==
      2 ||
    historical.cryptographic_provenance_verified !==
      false
  ) {
    fail(
      "A017_2B_HISTORICAL_STATE_INVALID"
    );
  }


  console.log(
    "A017_2B_V1_0_HISTORICAL_READ=PASS"
  );

  console.log(
    "A017_2B_V1_1_HISTORICAL_READ=PASS"
  );


  /*
   * ===================================================
   * 2. V1.2 SIGNED WRITE
   * ===================================================
   */

  const signed =
    consumeAuthorization({
      registryPath:
        consumptionRegistryPath,

      consumptionId:
        "CONSUMPTION-A0172B-SIGNED",

      authorization:
        authorization(
          "SIGNED",
          "2026-08-24T09:30:00Z"
        ),

      evaluationEvtId:
        "EVT-A0172B-SIGNED",

      evaluationEvtSha256:
        "6".repeat(64),

      presentedRuntimeBindingSha256:
        "7".repeat(64),

      consumedAt:
        "2026-08-24T10:00:00Z",

      consumedBy:
        "IPR-A0172B-ACTOR",

      admissionTrustRegistryPath:
        trustRegistryPath,

      admissionSignerId:
        signerId,

      admissionKeyId:
        keyId,

      signAdmissionPayload:
        (payloadBytes) =>
          sign(
            null,
            payloadBytes,
            privateKey
          )
    });


  if (
    signed.registry_version !==
      "1.2" ||
    signed.previous_record_sha256 !==
      v11.record_sha256 ||
    signed.admission_signer_id !==
      signerId ||
    signed.admission_key_id !==
      keyId ||
    signed.admission_public_key_sha256 !==
      publicInfo.sha256 ||
    signed.admission_trust_record_sha256 !==
      trustRecord.record_sha256 ||
    signed.admission_signature_algorithm !==
      "ED25519"
  ) {
    fail(
      "A017_2B_V1_2_RECORD_INVALID"
    );
  }


  console.log(
    "A017_2B_V1_2_SIGNED_WRITE=PASS"
  );


  const signatureVerification =
    verifyAdmissionConsumptionSignature({
      record:
        signed,

      trustRegistryPath
    });


  if (
    signatureVerification.valid !==
      true ||
    signatureVerification.signature_valid !==
      true
  ) {
    fail(
      "A017_2B_SIGNATURE_VERIFY_INVALID"
    );
  }


  console.log(
    "A017_2B_SIGNATURE_PREAPPEND_VERIFY=PASS"
  );


  /*
   * ===================================================
   * 3. MIXED CHAIN
   * ===================================================
   */

  const mixed =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    mixed.record_count !==
      3 ||
    mixed.signed_record_count !==
      1 ||
    mixed.unsigned_historical_record_count !==
      2 ||
    mixed.head_record_sha256 !==
      signed.record_sha256
  ) {
    fail(
      "A017_2B_MIXED_CHAIN_INVALID"
    );
  }


  const fetched =
    getAuthorizationConsumption({
      registryPath:
        consumptionRegistryPath,

      authorizationId:
        "AUTHORIZATION-A0172B-SIGNED"
    });


  if (
    !fetched ||
    fetched.record_sha256 !==
      signed.record_sha256
  ) {
    fail(
      "A017_2B_FETCH_SIGNED_RECORD_INVALID"
    );
  }


  console.log(
    "A017_2B_MIXED_V1_0_V1_1_V1_2_CHAIN=PASS"
  );


  /*
   * ===================================================
   * 4. MISSING CALLBACK
   * ===================================================
   */

  const missingCallbackPath =
    join(
      root,
      "missing-callback.jsonl"
    );


  expectError(
    "A017_2B_MISSING_SIGNER_CALLBACK_DENIED",

    () =>
      consumeAuthorization({
        registryPath:
          missingCallbackPath,

        consumptionId:
          "CONSUMPTION-A0172B-NOCALLBACK",

        authorization:
          authorization(
            "NOCALLBACK",
            "2026-08-24T09:30:00Z"
          ),

        evaluationEvtId:
          "EVT-A0172B-NOCALLBACK",

        evaluationEvtSha256:
          "8".repeat(64),

        presentedRuntimeBindingSha256:
          "9".repeat(64),

        consumedAt:
          "2026-08-24T10:01:00Z",

        consumedBy:
          "IPR-A0172B-ACTOR",

        admissionTrustRegistryPath:
          trustRegistryPath,

        admissionSignerId:
          signerId,

        admissionKeyId:
          keyId
      }),

    "CONSUMPTION_ADMISSION_SIGNER_CALLBACK_REQUIRED"
  );


  if (
    existsSync(
      missingCallbackPath
    )
  ) {
    fail(
      "A017_2B_MISSING_CALLBACK_CREATED_RECORD"
    );
  }


  /*
   * ===================================================
   * 5. WRONG PRIVATE KEY
   * ===================================================
   */

  const wrongKeyPath =
    join(
      root,
      "wrong-key.jsonl"
    );


  expectError(
    "A017_2B_WRONG_SIGNING_KEY_DENIED",

    () =>
      consumeAuthorization({
        registryPath:
          wrongKeyPath,

        consumptionId:
          "CONSUMPTION-A0172B-WRONGKEY",

        authorization:
          authorization(
            "WRONGKEY",
            "2026-08-24T09:30:00Z"
          ),

        evaluationEvtId:
          "EVT-A0172B-WRONGKEY",

        evaluationEvtSha256:
          "a".repeat(64),

        presentedRuntimeBindingSha256:
          "b".repeat(64),

        consumedAt:
          "2026-08-24T10:02:00Z",

        consumedBy:
          "IPR-A0172B-ACTOR",

        admissionTrustRegistryPath:
          trustRegistryPath,

        admissionSignerId:
          signerId,

        admissionKeyId:
          keyId,

        signAdmissionPayload:
          (payloadBytes) =>
            sign(
              null,
              payloadBytes,
              wrongPrivateKey
            )
      }),

    "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
  );


  if (
    existsSync(
      wrongKeyPath
    )
  ) {
    fail(
      "A017_2B_WRONG_KEY_CREATED_RECORD"
    );
  }


  console.log(
    "A017_2B_WRONG_SIGNATURE_NO_CONSUMPTION=PASS"
  );


  /*
   * ===================================================
   * 6. ASYNC CALLBACK DENIED
   * ===================================================
   */

  const asyncPath =
    join(
      root,
      "async.jsonl"
    );


  expectError(
    "A017_2B_ASYNC_SIGNER_DENIED",

    () =>
      consumeAuthorization({
        registryPath:
          asyncPath,

        consumptionId:
          "CONSUMPTION-A0172B-ASYNC",

        authorization:
          authorization(
            "ASYNC",
            "2026-08-24T09:30:00Z"
          ),

        evaluationEvtId:
          "EVT-A0172B-ASYNC",

        evaluationEvtSha256:
          "c".repeat(64),

        presentedRuntimeBindingSha256:
          "d".repeat(64),

        consumedAt:
          "2026-08-24T10:03:00Z",

        consumedBy:
          "IPR-A0172B-ACTOR",

        admissionTrustRegistryPath:
          trustRegistryPath,

        admissionSignerId:
          signerId,

        admissionKeyId:
          keyId,

        signAdmissionPayload:
          () =>
            Promise.resolve(
              Buffer.alloc(64)
            )
      }),

    "CONSUMPTION_ADMISSION_ASYNC_SIGNER_UNSUPPORTED"
  );


  if (
    existsSync(
      asyncPath
    )
  ) {
    fail(
      "A017_2B_ASYNC_SIGNER_CREATED_RECORD"
    );
  }


  /*
   * ===================================================
   * 7. TRUST CHANGE DURING SIGNING
   * ===================================================
   */

  const changingTrustPath =
    join(
      root,
      "changing-trust.jsonl"
    );

  const changingConsumptionPath =
    join(
      root,
      "changing-consumption.jsonl"
    );


  const {
    publicKey:
      changingPublicKey,

    privateKey:
      changingPrivateKey
  } =
    generateKeyPairSync(
      "ed25519"
    );


  const changingPublicInfo =
    publicMaterial(
      changingPublicKey
    );

  const changingSignerId =
    "ADMISSION-SIGNER-A0172B-CHANGING";

  const changingKeyId =
    "ADMISSION-KEY-A0172B-CHANGING";


  registerAdmissionSignerKey({
    registryPath:
      changingTrustPath,

    trust:
      trustEvent({
        eventId:
          "ADMISSION-TRUST-EVENT-A0172B-CHANGING",

        signerId:
          changingSignerId,

        keyId:
          changingKeyId,

        publicInfo:
          changingPublicInfo
      }),

    recordedAt:
      "2026-08-24T09:00:00Z",

    recordedBy:
      "IPR-A0172B-ADMIN"
  });


  expectError(
    "A017_2B_TRUST_CHANGE_DURING_SIGNING_DENIED",

    () =>
      consumeAuthorization({
        registryPath:
          changingConsumptionPath,

        consumptionId:
          "CONSUMPTION-A0172B-TRUSTCHANGE",

        authorization:
          authorization(
            "TRUSTCHANGE",
            "2026-08-24T09:30:00Z"
          ),

        evaluationEvtId:
          "EVT-A0172B-TRUSTCHANGE",

        evaluationEvtSha256:
          "e".repeat(64),

        presentedRuntimeBindingSha256:
          "f".repeat(64),

        consumedAt:
          "2026-08-24T10:04:00Z",

        consumedBy:
          "IPR-A0172B-ACTOR",

        admissionTrustRegistryPath:
          changingTrustPath,

        admissionSignerId:
          changingSignerId,

        admissionKeyId:
          changingKeyId,

        signAdmissionPayload:
          (payloadBytes) => {
            revokeAdmissionSignerKey({
              registryPath:
                changingTrustPath,

              revocation: {
                schema_version:
                  "1.0",

                event_id:
                  "ADMISSION-TRUST-EVENT-A0172B-CHANGING-REVOKE",

                event_type:
                  "REVOKED",

                signer_id:
                  changingSignerId,

                key_id:
                  changingKeyId,

                scope:
                  "ADMISSION_CONSUMPTION_SIGNING",

                public_key_sha256:
                  changingPublicInfo.sha256,

                revoked_at:
                  "2026-08-24T10:04:00Z",

                reason_code:
                  "KEY_COMPROMISE"
              },

              recordedAt:
                "2026-08-24T10:04:00Z",

              recordedBy:
                "IPR-A0172B-ADMIN"
            });

            return sign(
              null,
              payloadBytes,
              changingPrivateKey
            );
          }
      }),

    "CONSUMPTION_ADMISSION_TRUST_CHANGED_DURING_SIGNING"
  );


  if (
    existsSync(
      changingConsumptionPath
    )
  ) {
    fail(
      "A017_2B_TRUST_CHANGE_CREATED_RECORD"
    );
  }


  console.log(
    "A017_2B_TRUST_CHANGE_NO_CONSUMPTION=PASS"
  );


  /*
   * ===================================================
   * 8. STRUCTURAL SIGNED-PAYLOAD TAMPER
   * ===================================================
   */

  const records =
    readFileSync(
      consumptionRegistryPath,
      "utf8"
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line)
      );


  const tampered =
    JSON.parse(
      JSON.stringify(
        records[2]
      )
    );


  tampered.consumed_by =
    "IPR-A0172B-FORGED";


  const {
    record_sha256,
    ...tamperedBasis
  } =
    tampered;

  void record_sha256;


  tampered.record_sha256 =
    sha256Canonical(
      tamperedBasis
    );


  const tamperedPath =
    join(
      root,
      "tampered.jsonl"
    );


  writeFileSync(
    tamperedPath,
    `${JSON.stringify(records[0])}\n${JSON.stringify(records[1])}\n${JSON.stringify(tampered)}\n`,
    "utf8"
  );


  expectError(
    "A017_2B_SIGNED_PAYLOAD_STRUCTURAL_TAMPER_DETECTED",

    () =>
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          tamperedPath
      }),

    "CONSUMPTION_REGISTRY_SIGNED_PAYLOAD_HASH_MISMATCH:3"
  );


  /*
   * ===================================================
   * 9. LATER REVOCATION PRESERVES HISTORICAL SIGNATURE
   * ===================================================
   */

  revokeAdmissionSignerKey({
    registryPath:
      trustRegistryPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADMISSION-TRUST-EVENT-A0172B-REVOKE",

      event_type:
        "REVOKED",

      signer_id:
        signerId,

      key_id:
        keyId,

      scope:
        "ADMISSION_CONSUMPTION_SIGNING",

      public_key_sha256:
        publicInfo.sha256,

      revoked_at:
        "2026-08-24T11:00:00Z",

      reason_code:
        "ROTATION"
    },

    recordedAt:
      "2026-08-24T11:00:00Z",

    recordedBy:
      "IPR-A0172B-ADMIN"
  });


  const historicalSignature =
    verifyAdmissionConsumptionSignature({
      record:
        signed,

      trustRegistryPath
    });


  if (
    historicalSignature.valid !==
      true
  ) {
    fail(
      "A017_2B_LATER_REVOCATION_REWROTE_HISTORY"
    );
  }


  console.log(
    "A017_2B_LATER_REVOCATION_PRESERVES_HISTORY=PASS"
  );


  console.log("");
  console.log(
    "===== A017.2B FINAL MATRIX ====="
  );

  console.log(
    "READ_V1_0=SUPPORTED"
  );

  console.log(
    "READ_V1_1=SUPPORTED"
  );

  console.log(
    "WRITE_V1_2=SIGNED_ONLY"
  );

  console.log(
    "MIXED_CHAIN_V1_0_V1_1_V1_2=PASS"
  );

  console.log(
    "SIGNING_INSIDE_CONSUMPTION_LOCK=TRUE"
  );

  console.log(
    "CHAIN_POSITION=SIGNED"
  );

  console.log(
    "TRUST_RECORD=SIGNED"
  );

  console.log(
    "PUBLIC_KEY_FINGERPRINT=SIGNED"
  );

  console.log(
    "WRONG_PRIVATE_KEY=DENIED_BEFORE_APPEND"
  );

  console.log(
    "ASYNC_SIGNER=DENIED"
  );

  console.log(
    "TRUST_CHANGE_DURING_SIGN=FAIL_CLOSED"
  );

  console.log(
    "STRUCTURAL_REGISTRY_VERIFY_IS_NOT_CRYPTOGRAPHIC_VERIFY=TRUE"
  );

  console.log(
    "CROSS_REGISTRY_TRUST_CONSUMPTION_ATOMICITY=NOT_CLAIMED"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "SIGNED_CONSUMPTION_IS_NOT_EXECUTION=TRUE"
  );

  console.log(
    "A017_2B_A012_SIGNED_CONSUMPTION_V1_2=PASS"
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
