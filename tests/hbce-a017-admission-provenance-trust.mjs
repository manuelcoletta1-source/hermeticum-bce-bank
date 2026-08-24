import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import {
  createHash,
  generateKeyPairSync
} from "node:crypto";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  assertAdmissionSignerTrusted,
  listAdmissionSignerTrustEvents,
  registerAdmissionSignerKey,
  resolveAdmissionSignerTrust,
  revokeAdmissionSignerKey,
  verifyAdmissionSignerTrustRegistry
} from "../protocol/hbce-admission-signer-trust.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a017-1-"
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

  const privateDer =
    privateKey.export({
      type:
        "pkcs8",

      format:
        "der"
    });

  return {
    publicDer,
    privateDer,

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


function trustedEvent({
  eventId,
  signerId,
  keyId,
  key,
  validFrom,
  validUntil = null
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
      key.publicBase64,

    public_key_sha256:
      key.publicSha256,

    valid_from:
      validFrom,

    valid_until:
      validUntil
  };
}


function revokedEvent({
  eventId,
  signerId,
  keyId,
  publicKeySha256,
  revokedAt,
  reasonCode =
    "KEY_COMPROMISE"
}) {
  return {
    schema_version:
      "1.0",

    event_id:
      eventId,

    event_type:
      "REVOKED",

    signer_id:
      signerId,

    key_id:
      keyId,

    scope:
      "ADMISSION_CONSUMPTION_SIGNING",

    public_key_sha256:
      publicKeySha256,

    revoked_at:
      revokedAt,

    reason_code:
      reasonCode
  };
}


try {
  const registryPath =
    join(
      root,
      "admission-signer-trust.jsonl"
    );


  const signerA =
    "ADMISSION-SIGNER-A017-A";

  const signerB =
    "ADMISSION-SIGNER-A017-B";


  const keyA =
    generateEd25519();

  const keyB =
    generateEd25519();

  const keyC =
    generateEd25519();

  const keyD =
    generateEd25519();


  /*
   * ===================================================
   * 1. MISSING REGISTRY FAILS CLOSED
   * ===================================================
   */

  expectError(
    "A017_1_MISSING_REGISTRY_FAIL_CLOSED",

    () =>
      verifyAdmissionSignerTrustRegistry({
        registryPath
      }),

    "ADMISSION_SIGNER_TRUST_REGISTRY_UNAVAILABLE"
  );


  /*
   * ===================================================
   * 2. REGISTER FIRST TRUSTED KEY
   * ===================================================
   */

  const trustA =
    trustedEvent({
      eventId:
        "ADMISSION-TRUST-EVENT-A017-A",

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      key:
        keyA,

      validFrom:
        "2026-08-24T10:05:00Z",

      validUntil:
        "2026-08-24T12:00:00Z"
    });


  const trustARecord =
    registerAdmissionSignerKey({
      registryPath,

      trust:
        trustA,

      recordedAt:
        "2026-08-24T10:00:00Z",

      recordedBy:
        "IPR-A017-ADMIN"
    });


  if (
    trustARecord.event_type !==
      "TRUSTED" ||
    trustARecord.public_key_sha256 !==
      keyA.publicSha256
  ) {
    fail(
      "A017_1_FIRST_TRUST_RECORD_INVALID"
    );
  }


  console.log(
    "A017_1_TRUSTED_KEY_REGISTERED=PASS"
  );


  /*
   * ===================================================
   * 3. TEMPORAL TRUST STATES
   * ===================================================
   */

  const notObserved =
    resolveAdmissionSignerTrust({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      asOf:
        "2026-08-24T09:59:00Z"
    });


  if (
    notObserved.status !==
      "NOT_OBSERVED" ||
    notObserved.trusted !==
      false
  ) {
    fail(
      "A017_1_NOT_OBSERVED_STATE_INVALID"
    );
  }


  console.log(
    "A017_1_TRUST_NOT_OBSERVED_BEFORE_RECORD=PASS"
  );


  const notYetValid =
    resolveAdmissionSignerTrust({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      asOf:
        "2026-08-24T10:02:00Z"
    });


  if (
    notYetValid.status !==
      "NOT_YET_VALID"
  ) {
    fail(
      "A017_1_NOT_YET_VALID_STATE_INVALID"
    );
  }


  console.log(
    "A017_1_VALID_FROM_ENFORCED=PASS"
  );


  const trustedA =
    assertAdmissionSignerTrusted({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      asOf:
        "2026-08-24T10:30:00Z",

      expectedPublicKeySha256:
        keyA.publicSha256
    });


  if (
    trustedA.trusted !==
      true ||
    trustedA.status !==
      "TRUSTED" ||
    trustedA.algorithm !==
      "ED25519" ||
    trustedA.legal_identity_proven !==
      false ||
    trustedA.legal_authority_created !==
      false
  ) {
    fail(
      "A017_1_TRUSTED_STATE_INVALID"
    );
  }


  console.log(
    "A017_1_AS_OF_TRUSTED_KEY=PASS"
  );


  /*
   * ===================================================
   * 4. KEY ROTATION / OVERLAP
   * ===================================================
   */

  const trustB =
    trustedEvent({
      eventId:
        "ADMISSION-TRUST-EVENT-A017-B",

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-B",

      key:
        keyB,

      validFrom:
        "2026-08-24T10:20:00Z"
    });


  registerAdmissionSignerKey({
    registryPath,

    trust:
      trustB,

    recordedAt:
      "2026-08-24T10:10:00Z",

    recordedBy:
      "IPR-A017-ADMIN"
  });


  const trustedB =
    assertAdmissionSignerTrusted({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-B",

      asOf:
        "2026-08-24T10:30:00Z"
    });


  if (
    trustedB.public_key_sha256 !==
      keyB.publicSha256
  ) {
    fail(
      "A017_1_ROTATED_KEY_STATE_INVALID"
    );
  }


  console.log(
    "A017_1_KEY_ROTATION_OVERLAP=PASS"
  );


  /*
   * ===================================================
   * 5. EXPIRING KEY
   * ===================================================
   */

  const trustC =
    trustedEvent({
      eventId:
        "ADMISSION-TRUST-EVENT-A017-C",

      signerId:
        signerB,

      keyId:
        "ADMISSION-KEY-A017-C",

      key:
        keyC,

      validFrom:
        "2026-08-24T10:15:00Z",

      validUntil:
        "2026-08-24T10:40:00Z"
    });


  registerAdmissionSignerKey({
    registryPath,

    trust:
      trustC,

    recordedAt:
      "2026-08-24T10:15:00Z",

    recordedBy:
      "IPR-A017-ADMIN"
  });


  const expiredC =
    resolveAdmissionSignerTrust({
      registryPath,

      signerId:
        signerB,

      keyId:
        "ADMISSION-KEY-A017-C",

      asOf:
        "2026-08-24T10:40:00Z"
    });


  if (
    expiredC.status !==
      "EXPIRED"
  ) {
    fail(
      "A017_1_EXPIRY_STATE_INVALID"
    );
  }


  expectError(
    "A017_1_EXPIRED_KEY_DENIED",

    () =>
      assertAdmissionSignerTrusted({
        registryPath,

        signerId:
          signerB,

        keyId:
          "ADMISSION-KEY-A017-C",

        asOf:
          "2026-08-24T10:40:00Z"
      }),

    "ADMISSION_SIGNER_KEY_EXPIRED"
  );


  /*
   * ===================================================
   * 6. DUPLICATE KEY / FINGERPRINT DENIAL
   * ===================================================
   */

  expectError(
    "A017_1_DUPLICATE_KEY_ID_DENIED",

    () =>
      registerAdmissionSignerKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-DUPKEY",

            signerId:
              signerB,

            keyId:
              "ADMISSION-KEY-A017-A",

            key:
              keyD,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_KEY_ALREADY_REGISTERED"
  );


  expectError(
    "A017_1_DUPLICATE_PUBLIC_KEY_DENIED",

    () =>
      registerAdmissionSignerKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-DUPPUB",

            signerId:
              signerB,

            keyId:
              "ADMISSION-KEY-A017-D",

            key:
              keyA,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_PUBLIC_KEY_ALREADY_REGISTERED"
  );


  /*
   * ===================================================
   * 7. PRIVATE / WRONG KEY TYPE DENIAL
   * ===================================================
   */

  const privateKeyAsPublic = {
    publicBase64:
      keyD.privateDer.toString(
        "base64"
      ),

    publicSha256:
      fingerprint(
        keyD.privateDer
      )
  };


  expectError(
    "A017_1_PRIVATE_KEY_MATERIAL_REJECTED",

    () =>
      registerAdmissionSignerKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-PRIVATE",

            signerId:
              signerB,

            keyId:
              "ADMISSION-KEY-A017-PRIVATE",

            key:
              privateKeyAsPublic,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_PUBLIC_KEY_INVALID"
  );


  const rsa =
    generateKeyPairSync(
      "rsa",
      {
        modulusLength:
          2048
      }
    );


  const rsaDer =
    rsa.publicKey.export({
      type:
        "spki",

      format:
        "der"
    });


  const rsaKey = {
    publicBase64:
      rsaDer.toString(
        "base64"
      ),

    publicSha256:
      fingerprint(
        rsaDer
      )
  };


  expectError(
    "A017_1_NON_ED25519_KEY_DENIED",

    () =>
      registerAdmissionSignerKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-RSA",

            signerId:
              signerB,

            keyId:
              "ADMISSION-KEY-A017-RSA",

            key:
              rsaKey,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_PUBLIC_KEY_TYPE_INVALID"
  );


  /*
   * ===================================================
   * 8. UNKNOWN REVOCATION DENIED
   * ===================================================
   */

  expectError(
    "A017_1_UNKNOWN_KEY_REVOCATION_DENIED",

    () =>
      revokeAdmissionSignerKey({
        registryPath,

        revocation:
          revokedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-UNKNOWN-REVOKE",

            signerId:
              signerA,

            keyId:
              "ADMISSION-KEY-A017-UNKNOWN",

            publicKeySha256:
              keyD.publicSha256,

            revokedAt:
              "2026-08-24T10:30:00Z"
          }),

        recordedAt:
          "2026-08-24T10:30:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_KEY_NOT_REGISTERED"
  );


  /*
   * ===================================================
   * 9. REVOCATION EFFECTIVE + OBSERVABLE SEMANTICS
   * ===================================================
   */

  const revocationA =
    revokedEvent({
      eventId:
        "ADMISSION-TRUST-EVENT-A017-A-REVOKE",

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      publicKeySha256:
        keyA.publicSha256,

      revokedAt:
        "2026-08-24T11:00:00Z"
    });


  const revocationARecord =
    revokeAdmissionSignerKey({
      registryPath,

      revocation:
        revocationA,

      recordedAt:
        "2026-08-24T11:10:00Z",

      recordedBy:
        "IPR-A017-ADMIN"
    });


  const beforeRevocationObserved =
    resolveAdmissionSignerTrust({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      asOf:
        "2026-08-24T11:05:00Z"
    });


  if (
    beforeRevocationObserved.status !==
      "TRUSTED"
  ) {
    fail(
      "A017_1_REVOCATION_VISIBILITY_SEMANTICS_INVALID"
    );
  }


  console.log(
    "A017_1_UNOBSERVED_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
  );


  const afterRevocationObserved =
    resolveAdmissionSignerTrust({
      registryPath,

      signerId:
        signerA,

      keyId:
        "ADMISSION-KEY-A017-A",

      asOf:
        "2026-08-24T11:10:00Z"
    });


  if (
    afterRevocationObserved.status !==
      "REVOKED" ||
    afterRevocationObserved
      .revocation_record_sha256 !==
      revocationARecord.record_sha256
  ) {
    fail(
      "A017_1_REVOKED_STATE_INVALID"
    );
  }


  expectError(
    "A017_1_REVOKED_KEY_DENIED",

    () =>
      assertAdmissionSignerTrusted({
        registryPath,

        signerId:
          signerA,

        keyId:
          "ADMISSION-KEY-A017-A",

        asOf:
          "2026-08-24T11:10:00Z"
      }),

    "ADMISSION_SIGNER_KEY_REVOKED"
  );


  console.log(
    "A017_1_EFFECTIVE_OBSERVED_REVOCATION=PASS"
  );


  expectError(
    "A017_1_DUPLICATE_REVOCATION_DENIED",

    () =>
      revokeAdmissionSignerKey({
        registryPath,

        revocation:
          revokedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-A-REVOKE-2",

            signerId:
              signerA,

            keyId:
              "ADMISSION-KEY-A017-A",

            publicKeySha256:
              keyA.publicSha256,

            revokedAt:
              "2026-08-24T11:11:00Z"
          }),

        recordedAt:
          "2026-08-24T11:11:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_KEY_ALREADY_REVOKED"
  );


  /*
   * ===================================================
   * 10. APPEND CHRONOLOGY
   * ===================================================
   */

  expectError(
    "A017_1_BACKDATED_APPEND_DENIED",

    () =>
      registerAdmissionSignerKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADMISSION-TRUST-EVENT-A017-BACKDATE",

            signerId:
              signerB,

            keyId:
              "ADMISSION-KEY-A017-BACKDATE",

            key:
              keyD,

            validFrom:
              "2026-08-24T11:00:00Z"
          }),

        recordedAt:
          "2026-08-24T11:00:00Z",

        recordedBy:
          "IPR-A017-ADMIN"
      }),

    "ADMISSION_SIGNER_TRUST_RECORDED_AT_ORDER_INVALID"
  );


  /*
   * ===================================================
   * 11. FINGERPRINT EXPECTATION
   * ===================================================
   */

  expectError(
    "A017_1_EXPECTED_FINGERPRINT_MISMATCH_DENIED",

    () =>
      assertAdmissionSignerTrusted({
        registryPath,

        signerId:
          signerA,

        keyId:
          "ADMISSION-KEY-A017-B",

        asOf:
          "2026-08-24T11:20:00Z",

        expectedPublicKeySha256:
          "0".repeat(64)
      }),

    "ADMISSION_SIGNER_TRUST_FINGERPRINT_MISMATCH"
  );


  /*
   * ===================================================
   * 12. REGISTRY VERIFY / LIST
   * ===================================================
   */

  const verification =
    verifyAdmissionSignerTrustRegistry({
      registryPath
    });


  if (
    verification.valid !==
      true ||
    verification.record_count !==
      4 ||
    verification.head_record_sha256 !==
      revocationARecord.record_sha256 ||
    verification.trusted_external_time !==
      false ||
    verification.external_immutability_proven !==
      false ||
    verification
      .registry_administrator_authenticity_proven !==
      false
  ) {
    fail(
      "A017_1_REGISTRY_VERIFY_INVALID"
    );
  }


  const listed =
    listAdmissionSignerTrustEvents({
      registryPath
    });


  if (
    listed.length !==
      4
  ) {
    fail(
      "A017_1_LIST_API_INVALID"
    );
  }


  console.log(
    "A017_1_CANONICAL_REGISTRY_VERIFY=PASS"
  );


  /*
   * ===================================================
   * 13. RECORD TAMPER DETECTION
   * ===================================================
   */

  const raw =
    readFileSync(
      registryPath,
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


  const tamperedRecords =
    JSON.parse(
      JSON.stringify(records)
    );


  tamperedRecords[0]
    .recorded_by =
    "IPR-A017-TAMPER";


  const tamperedPath =
    join(
      root,
      "tampered.jsonl"
    );


  writeFileSync(
    tamperedPath,
    `${tamperedRecords
      .map(
        (record) =>
          JSON.stringify(record)
      )
      .join("\n")}\n`,
    "utf8"
  );


  expectError(
    "A017_1_RECORD_TAMPER_DETECTED",

    () =>
      verifyAdmissionSignerTrustRegistry({
        registryPath:
          tamperedPath
      }),

    "ADMISSION_SIGNER_TRUST_RECORD_HASH_MISMATCH:1"
  );


  /*
   * ===================================================
   * 14. HASH CHAIN TAMPER DETECTION
   * ===================================================
   */

  const chainTampered =
    JSON.parse(
      JSON.stringify(records)
    );


  chainTampered[1]
    .previous_record_sha256 =
    "0".repeat(64);


  const chainTamperedPath =
    join(
      root,
      "chain-tampered.jsonl"
    );


  writeFileSync(
    chainTamperedPath,
    `${chainTampered
      .map(
        (record) =>
          JSON.stringify(record)
      )
      .join("\n")}\n`,
    "utf8"
  );


  expectError(
    "A017_1_CHAIN_TAMPER_DETECTED",

    () =>
      verifyAdmissionSignerTrustRegistry({
        registryPath:
          chainTamperedPath
      }),

    "ADMISSION_SIGNER_TRUST_REGISTRY_CHAIN_MISMATCH:2"
  );


  console.log("");
  console.log(
    "===== A017.1 FINAL MATRIX ====="
  );

  console.log(
    "ED25519_PUBLIC_KEY_ONLY=ENFORCED"
  );

  console.log(
    "PRIVATE_KEY_STORAGE=DENIED"
  );

  console.log(
    "SIGNER_KEY_FINGERPRINT=SHA256_SPKI_DER"
  );

  console.log(
    "TRUST_VALID_FROM=ENFORCED"
  );

  console.log(
    "TRUST_VALID_UNTIL=ENFORCED"
  );

  console.log(
    "KEY_ROTATION=SUPPORTED"
  );

  console.log(
    "OVERLAPPING_TRUSTED_KEYS=SUPPORTED"
  );

  console.log(
    "DUPLICATE_KEY_ID=DENIED"
  );

  console.log(
    "DUPLICATE_PUBLIC_KEY=DENIED"
  );

  console.log(
    "REVOCATION_EFFECTIVE_AND_OBSERVED=ENFORCED"
  );

  console.log(
    "BACKDATED_APPEND=DENIED"
  );

  console.log(
    "APPEND_ONLY_RECORD_CHAIN=PASS"
  );

  console.log(
    "RECORD_TAMPER=DETECTED"
  );

  console.log(
    "CHAIN_TAMPER=DETECTED"
  );

  console.log(
    "SIGNATURE_VERIFICATION=NOT_IMPLEMENTED_YET"
  );

  console.log(
    "TRUST_REGISTRY_ADMIN_AUTHENTICITY=NOT_PROVEN"
  );

  console.log(
    "EXTERNAL_IMMUTABILITY=NOT_PROVEN"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "LEGAL_IDENTITY=NOT_INFERRED"
  );

  console.log(
    "LEGAL_AUTHORITY=NOT_CREATED"
  );

  console.log(
    "A017_1_ADMISSION_SIGNER_TRUST_REGISTRY=PASS"
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
