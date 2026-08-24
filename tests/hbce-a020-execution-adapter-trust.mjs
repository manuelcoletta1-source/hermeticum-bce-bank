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
  assertExecutionAdapterTrusted,
  listExecutionAdapterTrustEvents,
  registerExecutionAdapterKey,
  resolveExecutionAdapterTrust,
  revokeExecutionAdapterKey,
  verifyExecutionAdapterTrustRegistry
} from "../protocol/hbce-execution-adapter-trust.reference.mjs";


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
  adapterId,
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
  };
}


function revokedEvent({
  eventId,
  adapterId,
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

    adapter_id:
      adapterId,

    key_id:
      keyId,

    scope:
      "EXECUTION_ADAPTER_INVOCATION_SIGNING",

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
      "execution-adapter-trust.jsonl"
    );


  const adapterA =
    "ADAPTER-A020-A";

  const adapterB =
    "ADAPTER-A020-B";


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
    "A020A_MISSING_REGISTRY_FAIL_CLOSED",

    () =>
      verifyExecutionAdapterTrustRegistry({
        registryPath
      }),

    "EXECUTION_ADAPTER_TRUST_REGISTRY_UNAVAILABLE"
  );


  /*
   * ===================================================
   * 2. REGISTER FIRST TRUSTED KEY
   * ===================================================
   */

  const trustA =
    trustedEvent({
      eventId:
        "ADAPTER-TRUST-EVENT-A020-A",

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

      key:
        keyA,

      validFrom:
        "2026-08-24T10:05:00Z",

      validUntil:
        "2026-08-24T12:00:00Z"
    });


  const trustARecord =
    registerExecutionAdapterKey({
      registryPath,

      trust:
        trustA,

      recordedAt:
        "2026-08-24T10:00:00Z",

      recordedBy:
        "IPR-A020-ADMIN"
    });


  if (
    trustARecord.event_type !==
      "TRUSTED" ||
    trustARecord.public_key_sha256 !==
      keyA.publicSha256
  ) {
    fail(
      "A020A_FIRST_TRUST_RECORD_INVALID"
    );
  }


  console.log(
    "A020A_TRUSTED_KEY_REGISTERED=PASS"
  );


  /*
   * ===================================================
   * 3. TEMPORAL TRUST STATES
   * ===================================================
   */

  const notObserved =
    resolveExecutionAdapterTrust({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

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
      "A020A_NOT_OBSERVED_STATE_INVALID"
    );
  }


  console.log(
    "A020A_TRUST_NOT_OBSERVED_BEFORE_RECORD=PASS"
  );


  const notYetValid =
    resolveExecutionAdapterTrust({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

      asOf:
        "2026-08-24T10:02:00Z"
    });


  if (
    notYetValid.status !==
      "NOT_YET_VALID"
  ) {
    fail(
      "A020A_NOT_YET_VALID_STATE_INVALID"
    );
  }


  console.log(
    "A020A_VALID_FROM_ENFORCED=PASS"
  );


  const trustedA =
    assertExecutionAdapterTrusted({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

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
    trustedA.trusted_public_key_binding !==
      true ||
    trustedA.key_control_proven !==
      false ||
    trustedA.adapter_identity_cryptographically_authenticated !==
      false ||
    trustedA.capability_authorized !==
      false ||
    trustedA.target_authorization_proven !==
      false ||
    trustedA.adapter_code_integrity_proven !==
      false ||
    trustedA.runtime_integrity_proven !==
      false ||
    trustedA.legal_identity_proven !==
      false ||
    trustedA.legal_authority_created !==
      false
  ) {
    fail(
      "A020A_TRUSTED_STATE_INVALID"
    );
  }


  console.log(
    "A020A_AS_OF_TRUSTED_KEY=PASS"
  );


  /*
   * ===================================================
   * 4. KEY ROTATION / OVERLAP
   * ===================================================
   */

  const trustB =
    trustedEvent({
      eventId:
        "ADAPTER-TRUST-EVENT-A020-B",

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-B",

      key:
        keyB,

      validFrom:
        "2026-08-24T10:20:00Z"
    });


  registerExecutionAdapterKey({
    registryPath,

    trust:
      trustB,

    recordedAt:
      "2026-08-24T10:10:00Z",

    recordedBy:
      "IPR-A020-ADMIN"
  });


  const trustedB =
    assertExecutionAdapterTrusted({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-B",

      asOf:
        "2026-08-24T10:30:00Z"
    });


  if (
    trustedB.public_key_sha256 !==
      keyB.publicSha256
  ) {
    fail(
      "A020A_ROTATED_KEY_STATE_INVALID"
    );
  }


  console.log(
    "A020A_KEY_ROTATION_OVERLAP=PASS"
  );


  /*
   * ===================================================
   * 5. EXPIRING KEY
   * ===================================================
   */

  const trustC =
    trustedEvent({
      eventId:
        "ADAPTER-TRUST-EVENT-A020-C",

      adapterId:
        adapterB,

      keyId:
        "ADAPTER-KEY-A020-C",

      key:
        keyC,

      validFrom:
        "2026-08-24T10:15:00Z",

      validUntil:
        "2026-08-24T10:40:00Z"
    });


  registerExecutionAdapterKey({
    registryPath,

    trust:
      trustC,

    recordedAt:
      "2026-08-24T10:15:00Z",

    recordedBy:
      "IPR-A020-ADMIN"
  });


  const expiredC =
    resolveExecutionAdapterTrust({
      registryPath,

      adapterId:
        adapterB,

      keyId:
        "ADAPTER-KEY-A020-C",

      asOf:
        "2026-08-24T10:40:00Z"
    });


  if (
    expiredC.status !==
      "EXPIRED"
  ) {
    fail(
      "A020A_EXPIRY_STATE_INVALID"
    );
  }


  expectError(
    "A020A_EXPIRED_KEY_DENIED",

    () =>
      assertExecutionAdapterTrusted({
        registryPath,

        adapterId:
          adapterB,

        keyId:
          "ADAPTER-KEY-A020-C",

        asOf:
          "2026-08-24T10:40:00Z"
      }),

    "EXECUTION_ADAPTER_KEY_EXPIRED"
  );


  /*
   * ===================================================
   * 6. DUPLICATE KEY / FINGERPRINT DENIAL
   * ===================================================
   */

  expectError(
    "A020A_DUPLICATE_KEY_ID_DENIED",

    () =>
      registerExecutionAdapterKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-DUPKEY",

            adapterId:
              adapterB,

            keyId:
              "ADAPTER-KEY-A020-A",

            key:
              keyD,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_KEY_ALREADY_REGISTERED"
  );


  expectError(
    "A020A_DUPLICATE_PUBLIC_KEY_DENIED",

    () =>
      registerExecutionAdapterKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-DUPPUB",

            adapterId:
              adapterB,

            keyId:
              "ADAPTER-KEY-A020-D",

            key:
              keyA,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_PUBLIC_KEY_ALREADY_REGISTERED"
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
    "A020A_PRIVATE_KEY_MATERIAL_REJECTED",

    () =>
      registerExecutionAdapterKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-PRIVATE",

            adapterId:
              adapterB,

            keyId:
              "ADAPTER-KEY-A020-PRIVATE",

            key:
              privateKeyAsPublic,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_PUBLIC_KEY_INVALID"
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
    "A020A_NON_ED25519_KEY_DENIED",

    () =>
      registerExecutionAdapterKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-RSA",

            adapterId:
              adapterB,

            keyId:
              "ADAPTER-KEY-A020-RSA",

            key:
              rsaKey,

            validFrom:
              "2026-08-24T10:20:00Z"
          }),

        recordedAt:
          "2026-08-24T10:20:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_PUBLIC_KEY_TYPE_INVALID"
  );


  /*
   * ===================================================
   * 8. UNKNOWN REVOCATION DENIED
   * ===================================================
   */

  expectError(
    "A020A_UNKNOWN_KEY_REVOCATION_DENIED",

    () =>
      revokeExecutionAdapterKey({
        registryPath,

        revocation:
          revokedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-UNKNOWN-REVOKE",

            adapterId:
              adapterA,

            keyId:
              "ADAPTER-KEY-A020-UNKNOWN",

            publicKeySha256:
              keyD.publicSha256,

            revokedAt:
              "2026-08-24T10:30:00Z"
          }),

        recordedAt:
          "2026-08-24T10:30:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_KEY_NOT_REGISTERED"
  );


  /*
   * ===================================================
   * 9. REVOCATION EFFECTIVE + OBSERVABLE SEMANTICS
   * ===================================================
   */

  const revocationA =
    revokedEvent({
      eventId:
        "ADAPTER-TRUST-EVENT-A020-A-REVOKE",

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

      publicKeySha256:
        keyA.publicSha256,

      revokedAt:
        "2026-08-24T11:00:00Z"
    });


  const revocationARecord =
    revokeExecutionAdapterKey({
      registryPath,

      revocation:
        revocationA,

      recordedAt:
        "2026-08-24T11:10:00Z",

      recordedBy:
        "IPR-A020-ADMIN"
    });


  const beforeRevocationObserved =
    resolveExecutionAdapterTrust({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

      asOf:
        "2026-08-24T11:05:00Z"
    });


  if (
    beforeRevocationObserved.status !==
      "TRUSTED"
  ) {
    fail(
      "A020A_REVOCATION_VISIBILITY_SEMANTICS_INVALID"
    );
  }


  console.log(
    "A020A_UNOBSERVED_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
  );


  const afterRevocationObserved =
    resolveExecutionAdapterTrust({
      registryPath,

      adapterId:
        adapterA,

      keyId:
        "ADAPTER-KEY-A020-A",

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
      "A020A_REVOKED_STATE_INVALID"
    );
  }


  expectError(
    "A020A_REVOKED_KEY_DENIED",

    () =>
      assertExecutionAdapterTrusted({
        registryPath,

        adapterId:
          adapterA,

        keyId:
          "ADAPTER-KEY-A020-A",

        asOf:
          "2026-08-24T11:10:00Z"
      }),

    "EXECUTION_ADAPTER_KEY_REVOKED"
  );


  console.log(
    "A020A_EFFECTIVE_OBSERVED_REVOCATION=PASS"
  );


  expectError(
    "A020A_DUPLICATE_REVOCATION_DENIED",

    () =>
      revokeExecutionAdapterKey({
        registryPath,

        revocation:
          revokedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-A-REVOKE-2",

            adapterId:
              adapterA,

            keyId:
              "ADAPTER-KEY-A020-A",

            publicKeySha256:
              keyA.publicSha256,

            revokedAt:
              "2026-08-24T11:11:00Z"
          }),

        recordedAt:
          "2026-08-24T11:11:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_KEY_ALREADY_REVOKED"
  );


  /*
   * ===================================================
   * 10. APPEND CHRONOLOGY
   * ===================================================
   */

  expectError(
    "A020A_BACKDATED_APPEND_DENIED",

    () =>
      registerExecutionAdapterKey({
        registryPath,

        trust:
          trustedEvent({
            eventId:
              "ADAPTER-TRUST-EVENT-A020-BACKDATE",

            adapterId:
              adapterB,

            keyId:
              "ADAPTER-KEY-A020-BACKDATE",

            key:
              keyD,

            validFrom:
              "2026-08-24T11:00:00Z"
          }),

        recordedAt:
          "2026-08-24T11:00:00Z",

        recordedBy:
          "IPR-A020-ADMIN"
      }),

    "EXECUTION_ADAPTER_TRUST_RECORDED_AT_ORDER_INVALID"
  );


  /*
   * ===================================================
   * 11. FINGERPRINT EXPECTATION
   * ===================================================
   */

  expectError(
    "A020A_EXPECTED_FINGERPRINT_MISMATCH_DENIED",

    () =>
      assertExecutionAdapterTrusted({
        registryPath,

        adapterId:
          adapterA,

        keyId:
          "ADAPTER-KEY-A020-B",

        asOf:
          "2026-08-24T11:20:00Z",

        expectedPublicKeySha256:
          "0".repeat(64)
      }),

    "EXECUTION_ADAPTER_TRUST_FINGERPRINT_MISMATCH"
  );


  /*
   * ===================================================
   * 12. REGISTRY VERIFY / LIST
   * ===================================================
   */

  const verification =
    verifyExecutionAdapterTrustRegistry({
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
      "A020A_REGISTRY_VERIFY_INVALID"
    );
  }


  const listed =
    listExecutionAdapterTrustEvents({
      registryPath
    });


  if (
    listed.length !==
      4
  ) {
    fail(
      "A020A_LIST_API_INVALID"
    );
  }


  console.log(
    "A020A_CANONICAL_REGISTRY_VERIFY=PASS"
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
    "IPR-A020-TAMPER";


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
    "A020A_RECORD_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterTrustRegistry({
        registryPath:
          tamperedPath
      }),

    "EXECUTION_ADAPTER_TRUST_RECORD_HASH_MISMATCH:1"
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
    "A020A_CHAIN_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterTrustRegistry({
        registryPath:
          chainTamperedPath
      }),

    "EXECUTION_ADAPTER_TRUST_REGISTRY_CHAIN_MISMATCH:2"
  );


  console.log("");
  console.log(
    "===== A020A FINAL MATRIX ====="
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
    "INVOCATION_SIGNATURE_VERIFICATION=DEFERRED_TO_A020C"
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
    "A020A_EXECUTION_ADAPTER_TRUST_REGISTRY=PASS"
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
