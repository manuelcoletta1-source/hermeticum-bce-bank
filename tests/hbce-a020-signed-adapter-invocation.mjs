import {
  createHash,
  generateKeyPairSync,
  sign
} from "node:crypto";

import {
  mkdtempSync,
  rmSync
} from "node:fs";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  registerExecutionAdapterKey,
  revokeExecutionAdapterKey
} from "../protocol/hbce-execution-adapter-trust.reference.mjs";


import {
  grantExecutionAdapterCapability,
  revokeExecutionAdapterCapability
} from "../protocol/hbce-execution-adapter-capability.reference.mjs";


import {
  buildExecutionAdapterInvocationSignedPayload,
  createExecutionAdapterInvocationProof,
  encodeExecutionAdapterInvocationSignedPayload,
  hashExecutionAdapterInvocationSignedPayload,
  verifyExecutionAdapterInvocationProof
} from "../protocol/hbce-execution-adapter-signature.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a020c-"
    )
  );


function fail(message) {
  throw new Error(message);
}


function fingerprint(
  der
) {
  return createHash(
    "sha256"
  )
    .update(der)
    .digest("hex");
}


function generateEd25519() {
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


  return {
    publicKey,
    privateKey,
    publicDer,

    publicBase64:
      publicDer.toString(
        "base64"
      ),

    publicSha256:
      fingerprint(
        publicDer
      )
  };
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


function context({
  target =
    "BANK-SANDBOX-A",

  adapterId =
    "ADAPTER-A020-SIGNER",

  keyId =
    "ADAPTER-KEY-A020-SIGNER",

  grantId =
    "ADAPTER-CAPABILITY-GRANT-A020-SIGNER",

  capability =
    "INVOKE_EXTERNAL_SYSTEM",

  payloadSha =
    "a".repeat(64),

  idempotencySha =
    "b".repeat(64)
} = {}) {
  return {
    execution_id:
      "EXECUTION-A020-SIGNED",

    attempt_id:
      "EXECUTION-ATTEMPT-A020-SIGNED",

    authorization_id:
      "AUTHORIZATION-A020-SIGNED",

    consumption_id:
      "CONSUMPTION-A020-SIGNED",

    adapter_id:
      adapterId,

    adapter_key_id:
      keyId,

    capability_grant_id:
      grantId,

    capability,

    external_system_reference:
      target,

    execution_payload_sha256:
      payloadSha,

    idempotency_key_sha256:
      idempotencySha
  };
}


function registerTrust({
  registryPath,
  key,
  adapterId =
    "ADAPTER-A020-SIGNER",
  keyId =
    "ADAPTER-KEY-A020-SIGNER",
  eventId =
    "ADAPTER-TRUST-EVENT-A020-SIGNER",
  validFrom =
    "2026-08-24T16:00:00Z",
  validUntil =
    "2026-08-24T22:00:00Z",
  recordedAt =
    "2026-08-24T16:00:00Z"
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
        adapterId,

      key_id:
        keyId,

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

      algorithm:
        "ED25519",

      public_key_spki_der_base64:
        key.publicBase64,

      public_key_sha256:
        key.publicSha256,

      valid_from:
        validFrom,

      valid_until:
        validUntil
    },

    recordedAt,

    recordedBy:
      "IPR-A020-TRUST-ADMIN"
  });
}


function registerCapability({
  registryPath,
  grantId =
    "ADAPTER-CAPABILITY-GRANT-A020-SIGNER",
  adapterId =
    "ADAPTER-A020-SIGNER",
  target =
    "BANK-SANDBOX-A",
  eventId =
    "ADAPTER-CAPABILITY-EVENT-A020-SIGNER",
  validFrom =
    "2026-08-24T16:00:00Z",
  validUntil =
    "2026-08-24T22:00:00Z",
  recordedAt =
    "2026-08-24T16:00:00Z"
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
        adapterId,

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        target,

      valid_from:
        validFrom,

      valid_until:
        validUntil
    },

    recordedAt,

    recordedBy:
      "IPR-A020-CAPABILITY-ADMIN"
  });
}


try {
  const trustPath =
    join(
      root,
      "trust.jsonl"
    );


  const capabilityPath =
    join(
      root,
      "capability.jsonl"
    );


  const key =
    generateEd25519();


  const wrongKey =
    generateEd25519();


  registerTrust({
    registryPath:
      trustPath,

    key
  });


  registerCapability({
    registryPath:
      capabilityPath
  });


  const exactContext =
    context();


  /*
   * ===================================================
   * 1. CREATE VALID SIGNED PROOF
   * ===================================================
   */

  let signerCalls =
    0;


  const proof =
    createExecutionAdapterInvocationProof({
      adapterTrustRegistryPath:
        trustPath,

      capabilityRegistryPath:
        capabilityPath,

      context:
        exactContext,

      signedAt:
        "2026-08-24T17:00:00Z",

      signInvocationPayload:
        (payloadBytes) => {
          signerCalls += 1;

          return sign(
            null,
            payloadBytes,
            key.privateKey
          );
        }
    });


  if (
    signerCalls !==
      1 ||
    proof.domain !==
      "HBCE_EXECUTION_ADAPTER_INVOCATION_V1" ||
    proof.signature_algorithm !==
      "ED25519" ||
    typeof proof.signature_base64 !==
      "string" ||
    proof.signature_base64.length ===
      0
  ) {
    fail(
      "A020C_PROOF_CREATION_INVALID"
    );
  }


  console.log(
    "A020C_SIGNED_PROOF_CREATED=PASS"
  );


  /*
   * ===================================================
   * 2. CANONICAL ENCODING / HASH
   * ===================================================
   */

  const signedPayload =
    buildExecutionAdapterInvocationSignedPayload(
      proof
    );


  const encoded =
    encodeExecutionAdapterInvocationSignedPayload(
      signedPayload
    );


  const signedHash =
    hashExecutionAdapterInvocationSignedPayload(
      signedPayload
    );


  if (
    !Buffer.isBuffer(
      encoded
    ) ||
    signedHash !==
      proof.signed_payload_sha256
  ) {
    fail(
      "A020C_CANONICAL_PAYLOAD_INVALID"
    );
  }


  console.log(
    "A020C_CANONICAL_SIGNED_PAYLOAD=PASS"
  );


  /*
   * ===================================================
   * 3. VALID VERIFY
   * ===================================================
   */

  const verification =
    verifyExecutionAdapterInvocationProof({
      proof,

      adapterTrustRegistryPath:
        trustPath,

      capabilityRegistryPath:
        capabilityPath,

      expectedContext:
        exactContext
    });


  if (
    verification.valid !==
      true ||
    verification.signature_valid !==
      true ||
    verification.trusted_public_key_binding !==
      true ||
    verification.key_control_proven !==
      true ||
    verification.capability_authorized_as_of_signed_at !==
      true ||
    verification.exact_target_authorized_as_of_signed_at !==
      true ||
    verification.expected_context_bound !==
      true
  ) {
    fail(
      "A020C_VALID_VERIFY_STATE_INVALID"
    );
  }


  console.log(
    "A020C_VALID_SIGNATURE_VERIFY=PASS"
  );

  console.log(
    "A020C_KEY_CONTROL_PROVEN=PASS"
  );

  console.log(
    "A020C_CAPABILITY_TARGET_BOUND_TO_SIGNATURE=PASS"
  );


  /*
   * ===================================================
   * 4. WRONG PRIVATE KEY
   * ===================================================
   */

  expectError(
    "A020C_WRONG_PRIVATE_KEY_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        context:
          exactContext,

        signedAt:
          "2026-08-24T17:05:00Z",

        signInvocationPayload:
          (payloadBytes) =>
            sign(
              null,
              payloadBytes,
              wrongKey.privateKey
            )
      }),

    "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
  );


  /*
   * ===================================================
   * 5. ASYNC SIGNER DENIED
   * ===================================================
   */

  expectError(
    "A020C_ASYNC_SIGNER_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        context:
          exactContext,

        signedAt:
          "2026-08-24T17:05:00Z",

        signInvocationPayload:
          async (payloadBytes) =>
            sign(
              null,
              payloadBytes,
              key.privateKey
            )
      }),

    "EXECUTION_ADAPTER_INVOCATION_ASYNC_SIGNER_DENIED"
  );


  /*
   * ===================================================
   * 6. TARGET SUBSTITUTION DENIED BEFORE SIGN
   * ===================================================
   */

  let targetSignerCalls =
    0;


  expectError(
    "A020C_TARGET_SUBSTITUTION_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        context:
          context({
            target:
              "BANK-SANDBOX-B"
          }),

        signedAt:
          "2026-08-24T17:10:00Z",

        signInvocationPayload:
          (payloadBytes) => {
            targetSignerCalls += 1;

            return sign(
              null,
              payloadBytes,
              key.privateKey
            );
          }
      }),

    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_VERIFY_FAILED"
  );


  if (
    targetSignerCalls !==
      0
  ) {
    fail(
      "A020C_TARGET_SUBSTITUTION_REACHED_SIGNER"
    );
  }


  console.log(
    "A020C_TARGET_SUBSTITUTION_SIGNER_ZERO=PASS"
  );


  /*
   * ===================================================
   * 7. CAPABILITY SUBSTITUTION DENIED
   * ===================================================
   */

  expectError(
    "A020C_CAPABILITY_SUBSTITUTION_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        context:
          context({
            capability:
              "ADMINISTER_EXTERNAL_SYSTEM"
          }),

        signedAt:
          "2026-08-24T17:10:00Z",

        signInvocationPayload:
          (payloadBytes) =>
            sign(
              null,
              payloadBytes,
              key.privateKey
            )
      }),

    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_INVALID"
  );


  /*
   * ===================================================
   * 8. EXPECTED CONTEXT SUBSTITUTION DENIED
   * ===================================================
   */

  expectError(
    "A020C_EXPECTED_PAYLOAD_CONTEXT_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterInvocationProof({
        proof,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        expectedContext:
          context({
            payloadSha:
              "c".repeat(64)
          })
      }),

    "EXECUTION_ADAPTER_INVOCATION_CONTEXT_MISMATCH:execution_payload_sha256"
  );


  expectError(
    "A020C_EXPECTED_IDEMPOTENCY_CONTEXT_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterInvocationProof({
        proof,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        expectedContext:
          context({
            idempotencySha:
              "d".repeat(64)
          })
      }),

    "EXECUTION_ADAPTER_INVOCATION_CONTEXT_MISMATCH:idempotency_key_sha256"
  );


  /*
   * ===================================================
   * 9. REHASHED PAYLOAD FORGERY
   *
   * Modify signed field and recompute payload hash while
   * retaining original Ed25519 signature.
   * ===================================================
   */

  const forgedPayloadProof = {
    ...proof,

    execution_payload_sha256:
      "e".repeat(64)
  };


  const forgedPayload =
    buildExecutionAdapterInvocationSignedPayload(
      forgedPayloadProof
    );


  forgedPayloadProof.signed_payload_sha256 =
    hashExecutionAdapterInvocationSignedPayload(
      forgedPayload
    );


  expectError(
    "A020C_REHASHED_PAYLOAD_FORGERY_DENIED",

    () =>
      verifyExecutionAdapterInvocationProof({
        proof:
          forgedPayloadProof,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        expectedContext: {
          ...exactContext,

          execution_payload_sha256:
            "e".repeat(64)
        }
      }),

    "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
  );


  /*
   * ===================================================
   * 10. TRUST RECORD SUBSTITUTION + VALID RE-SIGN
   *
   * Even possession of the trusted private key must not
   * permit silently substituting the trust anchor hash.
   * ===================================================
   */

  const forgedTrustProof = {
    ...proof,

    adapter_trust_record_sha256:
      "f".repeat(64)
  };


  const forgedTrustPayload =
    buildExecutionAdapterInvocationSignedPayload(
      forgedTrustProof
    );


  forgedTrustProof.signed_payload_sha256 =
    hashExecutionAdapterInvocationSignedPayload(
      forgedTrustPayload
    );


  forgedTrustProof.signature_base64 =
    sign(
      null,
      encodeExecutionAdapterInvocationSignedPayload(
        forgedTrustPayload
      ),
      key.privateKey
    ).toString(
      "base64"
    );


  expectError(
    "A020C_TRUST_RECORD_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterInvocationProof({
        proof:
          forgedTrustProof,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        expectedContext:
          exactContext
      }),

    "EXECUTION_ADAPTER_INVOCATION_TRUST_BINDING_MISMATCH"
  );


  /*
   * ===================================================
   * 11. CAPABILITY RECORD SUBSTITUTION + VALID RE-SIGN
   * ===================================================
   */

  const forgedGrantProof = {
    ...proof,

    capability_grant_record_sha256:
      "0".repeat(64)
  };


  const forgedGrantPayload =
    buildExecutionAdapterInvocationSignedPayload(
      forgedGrantProof
    );


  forgedGrantProof.signed_payload_sha256 =
    hashExecutionAdapterInvocationSignedPayload(
      forgedGrantPayload
    );


  forgedGrantProof.signature_base64 =
    sign(
      null,
      encodeExecutionAdapterInvocationSignedPayload(
        forgedGrantPayload
      ),
      key.privateKey
    ).toString(
      "base64"
    );


  expectError(
    "A020C_CAPABILITY_RECORD_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterInvocationProof({
        proof:
          forgedGrantProof,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        expectedContext:
          exactContext
      }),

    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_BINDING_MISMATCH"
  );


  /*
   * ===================================================
   * 12. LATER REVOCATIONS PRESERVE HISTORICAL PROOF
   * ===================================================
   */

  revokeExecutionAdapterKey({
    registryPath:
      trustPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-TRUST-EVENT-A020-SIGNER-REVOKED",

      event_type:
        "REVOKED",

      adapter_id:
        "ADAPTER-A020-SIGNER",

      key_id:
        "ADAPTER-KEY-A020-SIGNER",

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

      public_key_sha256:
        key.publicSha256,

      revoked_at:
        "2026-08-24T18:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T18:05:00Z",

    recordedBy:
      "IPR-A020-TRUST-ADMIN"
  });


  revokeExecutionAdapterCapability({
    registryPath:
      capabilityPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-CAPABILITY-EVENT-A020-SIGNER-REVOKED",

      event_type:
        "REVOKED",

      grant_id:
        "ADAPTER-CAPABILITY-GRANT-A020-SIGNER",

      adapter_id:
        "ADAPTER-A020-SIGNER",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        "BANK-SANDBOX-A",

      revoked_at:
        "2026-08-24T18:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T18:05:00Z",

    recordedBy:
      "IPR-A020-CAPABILITY-ADMIN"
  });


  const historicalVerification =
    verifyExecutionAdapterInvocationProof({
      proof,

      adapterTrustRegistryPath:
        trustPath,

      capabilityRegistryPath:
        capabilityPath,

      expectedContext:
        exactContext
    });


  if (
    historicalVerification.valid !==
      true ||
    historicalVerification.trusted_as_of_signed_at !==
      true ||
    historicalVerification.capability_authorized_as_of_signed_at !==
      true
  ) {
    fail(
      "A020C_LATER_REVOCATION_REWROTE_HISTORY"
    );
  }


  console.log(
    "A020C_LATER_REVOCATION_PRESERVES_HISTORICAL_PROOF=PASS"
  );


  /*
   * ===================================================
   * 13. NEW PROOF AFTER REVOCATION DENIED
   * ===================================================
   */

  expectError(
    "A020C_REVOKED_KEY_NEW_PROOF_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath,

        context:
          exactContext,

        signedAt:
          "2026-08-24T18:06:00Z",

        signInvocationPayload:
          (payloadBytes) =>
            sign(
              null,
              payloadBytes,
              key.privateKey
            )
      }),

    "EXECUTION_ADAPTER_INVOCATION_ADAPTER_TRUST_VERIFY_FAILED"
  );


  /*
   * ===================================================
   * 14. REGISTRY MUTATION DURING SIGNING
   * ===================================================
   */

  const mutableTrustPath =
    join(
      root,
      "mutable-trust.jsonl"
    );


  const mutableCapabilityPath =
    join(
      root,
      "mutable-capability.jsonl"
    );


  const mutableKey =
    generateEd25519();


  registerTrust({
    registryPath:
      mutableTrustPath,

    key:
      mutableKey,

    adapterId:
      "ADAPTER-A020-MUTABLE",

    keyId:
      "ADAPTER-KEY-A020-MUTABLE",

    eventId:
      "ADAPTER-TRUST-EVENT-A020-MUTABLE"
  });


  registerCapability({
    registryPath:
      mutableCapabilityPath,

    grantId:
      "ADAPTER-CAPABILITY-GRANT-A020-MUTABLE",

    adapterId:
      "ADAPTER-A020-MUTABLE",

    target:
      "BANK-SANDBOX-MUTABLE",

    eventId:
      "ADAPTER-CAPABILITY-EVENT-A020-MUTABLE"
  });


  const mutableContext =
    context({
      adapterId:
        "ADAPTER-A020-MUTABLE",

      keyId:
        "ADAPTER-KEY-A020-MUTABLE",

      grantId:
        "ADAPTER-CAPABILITY-GRANT-A020-MUTABLE",

      target:
        "BANK-SANDBOX-MUTABLE"
    });


  expectError(
    "A020C_AUTHORIZATION_STATE_CHANGE_DURING_SIGNING_DENIED",

    () =>
      createExecutionAdapterInvocationProof({
        adapterTrustRegistryPath:
          mutableTrustPath,

        capabilityRegistryPath:
          mutableCapabilityPath,

        context:
          mutableContext,

        signedAt:
          "2026-08-24T17:00:00Z",

        signInvocationPayload:
          (payloadBytes) => {
            grantExecutionAdapterCapability({
              registryPath:
                mutableCapabilityPath,

              grant: {
                schema_version:
                  "1.0",

                event_id:
                  "ADAPTER-CAPABILITY-EVENT-A020-MUTATION",

                event_type:
                  "GRANTED",

                grant_id:
                  "ADAPTER-CAPABILITY-GRANT-A020-MUTATION",

                adapter_id:
                  "ADAPTER-A020-MUTABLE",

                capability:
                  "INVOKE_EXTERNAL_SYSTEM",

                external_system_reference:
                  "BANK-SANDBOX-MUTATION",

                valid_from:
                  "2026-08-24T17:01:00Z",

                valid_until:
                  "2026-08-24T20:00:00Z"
              },

              recordedAt:
                "2026-08-24T17:01:00Z",

              recordedBy:
                "IPR-A020-CAPABILITY-ADMIN"
            });


            return sign(
              null,
              payloadBytes,
              mutableKey.privateKey
            );
          }
      }),

    "EXECUTION_ADAPTER_INVOCATION_AUTHORIZATION_STATE_CHANGED_DURING_SIGNING"
  );


  console.log("");
  console.log(
    "===== A020C FINAL MATRIX ====="
  );


  console.log(
    "DOMAIN_SEPARATION=HBCE_EXECUTION_ADAPTER_INVOCATION_V1"
  );

  console.log(
    "CANONICAL_SIGNED_CONTEXT=PASS"
  );

  console.log(
    "ED25519_SIGNATURE_VERIFY=PASS"
  );

  console.log(
    "TRUST_RECORD_SHA256=SIGNED"
  );

  console.log(
    "PUBLIC_KEY_SHA256=SIGNED"
  );

  console.log(
    "CAPABILITY_GRANT_RECORD_SHA256=SIGNED"
  );

  console.log(
    "EXECUTION_ID=SIGNED"
  );

  console.log(
    "ATTEMPT_ID=SIGNED"
  );

  console.log(
    "AUTHORIZATION_ID=SIGNED"
  );

  console.log(
    "CONSUMPTION_ID=SIGNED"
  );

  console.log(
    "ADAPTER_ID=SIGNED"
  );

  console.log(
    "ADAPTER_KEY_ID=SIGNED"
  );

  console.log(
    "CAPABILITY_GRANT_ID=SIGNED"
  );

  console.log(
    "EXACT_TARGET=SIGNED"
  );

  console.log(
    "EXECUTION_PAYLOAD_SHA256=SIGNED"
  );

  console.log(
    "IDEMPOTENCY_KEY_SHA256=SIGNED"
  );

  console.log(
    "KEY_CONTROL_PROVEN=TRUE"
  );

  console.log(
    "CAPABILITY_AUTHORIZED_AS_OF_SIGNED_AT=TRUE"
  );

  console.log(
    "EXACT_TARGET_AUTHORIZED_AS_OF_SIGNED_AT=TRUE"
  );

  console.log(
    "LATER_REVOCATION_DOES_NOT_REWRITE_HISTORY=TRUE"
  );

  console.log(
    "SIGNED_AT_CALLER_CONTROLLED_IN_A020C=TRUE"
  );

  console.log(
    "CURRENT_INVOCATION_TIME_AUTHORIZATION=DEFERRED_TO_A020D"
  );

  console.log(
    "REMOTE_TARGET_AUTHENTICITY=FALSE"
  );

  console.log(
    "ADAPTER_CODE_INTEGRITY=FALSE"
  );

  console.log(
    "LEGAL_IDENTITY_PROVEN=FALSE"
  );

  console.log(
    "LEGAL_AUTHORITY_CREATED=FALSE"
  );

  console.log(
    "EXTERNAL_EXECUTION_PROVEN=FALSE"
  );

  console.log(
    "SETTLEMENT_FINALITY_PROVEN=FALSE"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "A020C_SIGNED_ADAPTER_INVOCATION_PROOF=PASS"
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
