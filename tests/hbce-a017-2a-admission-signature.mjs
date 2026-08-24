import {
  mkdtempSync,
  rmSync
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
  buildAdmissionConsumptionSignedPayload,
  encodeAdmissionConsumptionSignedPayload,
  hashAdmissionConsumptionSignedPayload,
  verifyAdmissionConsumptionSignature
} from "../protocol/hbce-admission-signature.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a017-2a-"
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
    der,

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


try {
  const registryPath =
    join(
      root,
      "trust.jsonl"
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
    "ADMISSION-SIGNER-A0172A";

  const keyId =
    "ADMISSION-KEY-A0172A";


  const trustRecord =
    registerAdmissionSignerKey({
      registryPath,

      trust: {
        schema_version:
          "1.0",

        event_id:
          "ADMISSION-TRUST-EVENT-A0172A",

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
      },

      recordedAt:
        "2026-08-24T09:00:00Z",

      recordedBy:
        "IPR-A0172A-ADMIN"
    });


  const payload =
    buildAdmissionConsumptionSignedPayload({
      consumption_id:
        "CONSUMPTION-A0172A-MAIN",

      authorization_id:
        "AUTHORIZATION-A0172A-MAIN",

      authorization_sha256:
        "1".repeat(64),

      evaluation_evt_id:
        "EVT-A0172A-MAIN",

      evaluation_evt_sha256:
        "2".repeat(64),

      presented_runtime_binding_sha256:
        "3".repeat(64),

      consumed_at:
        "2026-08-24T10:00:00Z",

      consumed_by:
        "IPR-A0172A-ACTOR",

      previous_record_sha256:
        "4".repeat(64),

      admission_signer_id:
        signerId,

      admission_key_id:
        keyId,

      admission_public_key_sha256:
        publicInfo.sha256,

      admission_trust_record_sha256:
        trustRecord.record_sha256
    });


  const encodedA =
    encodeAdmissionConsumptionSignedPayload(
      payload
    );

  const encodedB =
    encodeAdmissionConsumptionSignedPayload({
      admission_key_id:
        payload.admission_key_id,

      authorization_sha256:
        payload.authorization_sha256,

      domain:
        payload.domain,

      consumed_by:
        payload.consumed_by,

      admission_public_key_sha256:
        payload.admission_public_key_sha256,

      record_type:
        payload.record_type,

      previous_record_sha256:
        payload.previous_record_sha256,

      evaluation_evt_sha256:
        payload.evaluation_evt_sha256,

      registry_version:
        payload.registry_version,

      consumed_at:
        payload.consumed_at,

      admission_signer_id:
        payload.admission_signer_id,

      authorization_id:
        payload.authorization_id,

      consumption_id:
        payload.consumption_id,

      presented_runtime_binding_sha256:
        payload.presented_runtime_binding_sha256,

      admission_trust_record_sha256:
        payload.admission_trust_record_sha256,

      evaluation_evt_id:
        payload.evaluation_evt_id
    });


  if (
    !encodedA.equals(
      encodedB
    )
  ) {
    fail(
      "A017_2A_CANONICAL_ENCODING_NOT_DETERMINISTIC"
    );
  }


  console.log(
    "A017_2A_CANONICAL_ENCODING=PASS"
  );


  const payloadSha256 =
    hashAdmissionConsumptionSignedPayload(
      payload
    );


  const signature =
    sign(
      null,
      encodedA,
      privateKey
    );


  const record = {
    ...payload,

    admission_signed_payload_sha256:
      payloadSha256,

    admission_signature_algorithm:
      "ED25519",

    admission_signature_base64:
      signature.toString(
        "base64"
      )
  };


  const verification =
    verifyAdmissionConsumptionSignature({
      record,

      trustRegistryPath:
        registryPath
    });


  if (
    verification.valid !==
      true ||
    verification.signature_valid !==
      true ||
    verification.key_control_proven !==
      true ||
    verification.human_legal_identity_proven !==
      false ||
    verification.legal_authority_created !==
      false ||
    verification.execution_proven !==
      false
  ) {
    fail(
      "A017_2A_VALID_SIGNATURE_RECEIPT_INVALID"
    );
  }


  console.log(
    "A017_2A_VALID_SIGNATURE=PASS"
  );


  const wrongKeyRecord = {
    ...record,

    admission_signature_base64:
      sign(
        null,
        encodedA,
        wrongPrivateKey
      ).toString(
        "base64"
      )
  };


  expectError(
    "A017_2A_WRONG_PRIVATE_KEY_DENIED",

    () =>
      verifyAdmissionConsumptionSignature({
        record:
          wrongKeyRecord,

        trustRegistryPath:
          registryPath
      }),

    "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
  );


  const forgedActor = {
    ...record,

    consumed_by:
      "IPR-A0172A-FORGED"
  };


  const forgedActorPayload =
    buildAdmissionConsumptionSignedPayload(
      forgedActor
    );


  forgedActor.admission_signed_payload_sha256 =
    hashAdmissionConsumptionSignedPayload(
      forgedActorPayload
    );


  expectError(
    "A017_2A_REHASHED_ACTOR_FORGERY_DENIED",

    () =>
      verifyAdmissionConsumptionSignature({
        record:
          forgedActor,

        trustRegistryPath:
          registryPath
      }),

    "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
  );


  const rebased = {
    ...record,

    previous_record_sha256:
      null
  };


  const rebasedPayload =
    buildAdmissionConsumptionSignedPayload(
      rebased
    );


  rebased.admission_signed_payload_sha256 =
    hashAdmissionConsumptionSignedPayload(
      rebasedPayload
    );


  expectError(
    "A017_2A_CHAIN_POSITION_REBASE_DENIED",

    () =>
      verifyAdmissionConsumptionSignature({
        record:
          rebased,

        trustRegistryPath:
          registryPath
      }),

    "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
  );


  const wrongTrustHash = {
    ...payload,

    admission_trust_record_sha256:
      "5".repeat(64)
  };


  const wrongTrustSignature =
    sign(
      null,
      encodeAdmissionConsumptionSignedPayload(
        wrongTrustHash
      ),
      privateKey
    );


  const wrongTrustRecord = {
    ...wrongTrustHash,

    admission_signed_payload_sha256:
      hashAdmissionConsumptionSignedPayload(
        wrongTrustHash
      ),

    admission_signature_algorithm:
      "ED25519",

    admission_signature_base64:
      wrongTrustSignature.toString(
        "base64"
      )
  };


  expectError(
    "A017_2A_TRUST_RECORD_SUBSTITUTION_DENIED",

    () =>
      verifyAdmissionConsumptionSignature({
        record:
          wrongTrustRecord,

        trustRegistryPath:
          registryPath
      }),

    "ADMISSION_CONSUMPTION_TRUST_RECORD_MISMATCH"
  );


  revokeAdmissionSignerKey({
    registryPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADMISSION-TRUST-EVENT-A0172A-REVOKE",

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
      "IPR-A0172A-ADMIN"
  });


  const historicalVerification =
    verifyAdmissionConsumptionSignature({
      record,

      trustRegistryPath:
        registryPath
    });


  if (
    historicalVerification.valid !==
      true
  ) {
    fail(
      "A017_2A_LATER_REVOCATION_REWROTE_HISTORY"
    );
  }


  console.log(
    "A017_2A_LATER_REVOCATION_PRESERVES_HISTORY=PASS"
  );


  console.log("");
  console.log(
    "===== A017.2A FINAL MATRIX ====="
  );

  console.log(
    "DOMAIN_SEPARATION=HBCE_ADMISSION_CONSUMPTION_V1"
  );

  console.log(
    "CANONICAL_PAYLOAD=PASS"
  );

  console.log(
    "ED25519_SIGNATURE_VERIFY=PASS"
  );

  console.log(
    "CONSUMED_BY=SIGNED"
  );

  console.log(
    "PREVIOUS_RECORD_SHA256=SIGNED"
  );

  console.log(
    "TRUST_RECORD_SHA256=SIGNED"
  );

  console.log(
    "PUBLIC_KEY_SHA256=SIGNED"
  );

  console.log(
    "WRONG_PRIVATE_KEY=DENIED"
  );

  console.log(
    "REHASHED_FORGERY=DENIED"
  );

  console.log(
    "CHAIN_REBASE=DENIED"
  );

  console.log(
    "LATER_REVOCATION_DOES_NOT_REWRITE_HISTORY=TRUE"
  );

  console.log(
    "PRIVATE_KEY_STORAGE_IN_PROTOCOL=NONE"
  );

  console.log(
    "HUMAN_LEGAL_IDENTITY_PROVEN=FALSE"
  );

  console.log(
    "LEGAL_AUTHORITY_CREATED=FALSE"
  );

  console.log(
    "EXECUTION_PROVEN=FALSE"
  );

  console.log(
    "A017_2A_ADMISSION_SIGNATURE_MODULE=PASS"
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
