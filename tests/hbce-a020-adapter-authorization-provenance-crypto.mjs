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
  appendExecutionAdapterAuthorizationProvenance,
  verifyExecutionAdapterAuthorizationProvenanceRegistry
} from "../protocol/hbce-execution-adapter-authorization-provenance.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a020e-b-"
    )
  );


function fail(message) {
  throw new Error(message);
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


function expectReject(
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


const ADAPTER_ID =
  "ADAPTER-A020E-B";

const KEY_ID =
  "ADAPTER-KEY-A020E-B";

const GRANT_ID =
  "ADAPTER-CAPABILITY-GRANT-A020E-B";

const TARGET =
  "BANK-SANDBOX-A020E-B";


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


function registerTrust(
  registryPath,
  eventId
) {
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
        ADAPTER_ID,

      key_id:
        KEY_ID,

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

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
        "2026-08-25T00:00:00Z"
    },

    recordedAt:
      "2026-08-24T09:00:00Z",

    recordedBy:
      "IPR-A020E-B-TRUST-ADMIN"
  });
}


function registerCapability(
  registryPath,
  eventId
) {
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
        GRANT_ID,

      adapter_id:
        ADAPTER_ID,

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        TARGET,

      valid_from:
        "2026-08-24T09:00:00Z",

      valid_until:
        "2026-08-25T00:00:00Z"
    },

    recordedAt:
      "2026-08-24T09:00:00Z",

    recordedBy:
      "IPR-A020E-B-CAPABILITY-ADMIN"
  });
}


function makeInvocationClaim() {
  const basis = {
    registry_version:
      "1.0",

    record_type:
      "EXECUTION_ADAPTER_INVOCATION_CLAIMED",

    invocation_id:
      "ADAPTER-INVOCATION-A020E-B",

    execution_id:
      "EXECUTION-A020E-B",

    attempt_id:
      "EXECUTION-ATTEMPT-A020E-B",

    execution_attempt_evidence_id:
      "EXECUTION-EVIDENCE-A020E-B",

    execution_attempt_evidence_sha256:
      "1".repeat(64),

    execution_attempt_record_sha256:
      "2".repeat(64),

    authorization_id:
      "AUTHORIZATION-A020E-B",

    consumption_id:
      "CONSUMPTION-A020E-B",

    adapter_id:
      ADAPTER_ID,

    external_system_reference:
      TARGET,

    execution_payload_sha256:
      "3".repeat(64),

    idempotency_key_sha256:
      "4".repeat(64),

    claimed_at:
      "2026-08-24T10:07:00Z",

    time_source:
      "LOCAL_SYSTEM_CLOCK",

    previous_record_sha256:
      null
  };


  return {
    ...basis,

    record_sha256:
      sha256Canonical(
        basis
      )
  };
}


function contextFromClaim(
  claim
) {
  return {
    execution_id:
      claim.execution_id,

    attempt_id:
      claim.attempt_id,

    authorization_id:
      claim.authorization_id,

    consumption_id:
      claim.consumption_id,

    adapter_id:
      claim.adapter_id,

    adapter_key_id:
      KEY_ID,

    capability_grant_id:
      GRANT_ID,

    capability:
      "INVOKE_EXTERNAL_SYSTEM",

    external_system_reference:
      claim.external_system_reference,

    execution_payload_sha256:
      claim.execution_payload_sha256,

    idempotency_key_sha256:
      claim.idempotency_key_sha256
  };
}


function createProof({
  claim,
  trustPath,
  capabilityPath
}) {
  return createExecutionAdapterInvocationProof({
    adapterTrustRegistryPath:
      trustPath,

    capabilityRegistryPath:
      capabilityPath,

    context:
      contextFromClaim(
        claim
      ),

    signedAt:
      "2026-08-24T10:06:30Z",

    signInvocationPayload:
      (payloadBytes) =>
        sign(
          null,
          payloadBytes,
          privateKey
        )
  });
}


function provenanceFromProof({
  claim,
  proof
}) {
  return {
    invocation_id:
      claim.invocation_id,

    invocation_record_sha256:
      claim.record_sha256,

    execution_id:
      claim.execution_id,

    attempt_id:
      claim.attempt_id,

    authorization_id:
      claim.authorization_id,

    consumption_id:
      claim.consumption_id,

    adapter_id:
      claim.adapter_id,

    adapter_key_id:
      proof.adapter_key_id,

    capability_grant_id:
      proof.capability_grant_id,

    capability:
      proof.capability,

    external_system_reference:
      claim.external_system_reference,

    execution_payload_sha256:
      claim.execution_payload_sha256,

    idempotency_key_sha256:
      claim.idempotency_key_sha256,

    adapter_signed_at:
      proof.signed_at,

    adapter_signed_payload_sha256:
      proof.signed_payload_sha256,

    adapter_signature_algorithm:
      proof.signature_algorithm,

    adapter_signature_base64:
      proof.signature_base64,

    adapter_public_key_sha256:
      proof.adapter_public_key_sha256,

    adapter_trust_record_sha256:
      proof.adapter_trust_record_sha256,

    capability_grant_record_sha256:
      proof.capability_grant_record_sha256,

    authorization_checked_at:
      "2026-08-24T10:07:30Z",

    time_source:
      "LOCAL_SYSTEM_CLOCK"
  };
}


function writeForgedRecord({
  sourcePath,
  targetPath,
  mutate
}) {
  const original =
    JSON.parse(
      readFileSync(
        sourcePath,
        "utf8"
      ).trim()
    );


  const basis = {
    ...original
  };


  delete basis
    .record_sha256;


  mutate(
    basis
  );


  const forged = {
    ...basis,

    record_sha256:
      sha256Canonical(
        basis
      )
  };


  writeFileSync(
    targetPath,
    `${JSON.stringify(forged)}\n`,
    "utf8"
  );
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


  const invocationPath =
    join(
      root,
      "invocation.jsonl"
    );


  const provenancePath =
    join(
      root,
      "provenance.jsonl"
    );


  registerTrust(
    trustPath,
    "ADAPTER-TRUST-EVENT-A020E-B"
  );


  registerCapability(
    capabilityPath,
    "ADAPTER-CAPABILITY-EVENT-A020E-B"
  );


  const claim =
    makeInvocationClaim();


  writeFileSync(
    invocationPath,
    `${JSON.stringify(claim)}\n`,
    "utf8"
  );


  const proof =
    createProof({
      claim,
      trustPath,
      capabilityPath
    });


  const provenance =
    provenanceFromProof({
      claim,
      proof
    });


  appendExecutionAdapterAuthorizationProvenance({
    registryPath:
      provenancePath,

    invocationRegistryPath:
      invocationPath,

    provenance
  });


  const structural =
    verifyExecutionAdapterAuthorizationProvenanceRegistry({
      registryPath:
        provenancePath,

      invocationRegistryPath:
        invocationPath
    });


  if (
    structural.valid !==
      true ||
    structural.adapter_signature_cryptographically_verified !==
      false ||
    structural.historical_adapter_trust_verified !==
      false ||
    structural.historical_capability_authorization_verified !==
      false
  ) {
    fail(
      "A020E_B_STRUCTURAL_MODE_INVALID"
    );
  }


  console.log(
    "A020E_B_STRUCTURAL_MODE_PRESERVED=PASS"
  );


  const verified =
    verifyExecutionAdapterAuthorizationProvenanceRegistry({
      registryPath:
        provenancePath,

      invocationRegistryPath:
        invocationPath,

      adapterTrustRegistryPath:
        trustPath,

      capabilityRegistryPath:
        capabilityPath
    });


  if (
    verified.valid !==
      true ||
    verified.record_count !==
      1 ||
    verified.adapter_signature_cryptographically_verified !==
      true ||
    verified.historical_adapter_trust_verified !==
      true ||
    verified.historical_capability_authorization_verified !==
      true ||
    verified.historical_exact_target_authorization_verified !==
      true ||
    verified.authorization_state_as_of_recorded_check_verified !==
      true ||
    verified.adapter_identity_trusted !==
      true ||
    verified.adapter_key_control_proven !==
      true ||
    verified.adapter_capability_authorized !==
      true ||
    verified.external_system_authorization_proven !==
      true ||
    verified.current_authorization_state_verified !==
      false ||
    verified.remote_target_authenticity_proven !==
      false ||
    verified.legal_identity_proven !==
      false ||
    verified.legal_authority_created !==
      false ||
    verified.external_execution_proven !==
      false ||
    verified.external_response_authenticity_verified !==
      false ||
    verified.settlement_finality_proven !==
      false ||
    verified.trusted_external_time !==
      false
  ) {
    fail(
      "A020E_B_CRYPTO_VERIFY_STATE_INVALID"
    );
  }


  console.log(
    "A020E_B_ED25519_HISTORICAL_VERIFY=PASS"
  );

  console.log(
    "A020E_B_HISTORICAL_TRUST_VERIFY=PASS"
  );

  console.log(
    "A020E_B_HISTORICAL_CAPABILITY_VERIFY=PASS"
  );

  console.log(
    "A020E_B_EXACT_TARGET_HISTORICAL_VERIFY=PASS"
  );

  console.log(
    "A020E_B_AUTHORIZATION_STATE_AT_RECORDED_CHECK=PASS"
  );


  /*
   * Later revocation must not rewrite the past.
   */

  revokeExecutionAdapterKey({
    registryPath:
      trustPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-TRUST-EVENT-A020E-B-LATER-REVOKED",

      event_type:
        "REVOKED",

      adapter_id:
        ADAPTER_ID,

      key_id:
        KEY_ID,

      scope:
        "EXECUTION_ADAPTER_INVOCATION_SIGNING",

      public_key_sha256:
        publicSha,

      revoked_at:
        "2026-08-24T11:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T11:05:00Z",

    recordedBy:
      "IPR-A020E-B-TRUST-ADMIN"
  });


  revokeExecutionAdapterCapability({
    registryPath:
      capabilityPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-CAPABILITY-EVENT-A020E-B-LATER-REVOKED",

      event_type:
        "REVOKED",

      grant_id:
        GRANT_ID,

      adapter_id:
        ADAPTER_ID,

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        TARGET,

      revoked_at:
        "2026-08-24T11:00:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T11:05:00Z",

    recordedBy:
      "IPR-A020E-B-CAPABILITY-ADMIN"
  });


  const afterLaterRevocation =
    verifyExecutionAdapterAuthorizationProvenanceRegistry({
      registryPath:
        provenancePath,

      invocationRegistryPath:
        invocationPath,

      adapterTrustRegistryPath:
        trustPath,

      capabilityRegistryPath:
        capabilityPath
    });


  if (
    afterLaterRevocation
      .adapter_signature_cryptographically_verified !==
        true ||
    afterLaterRevocation
      .authorization_state_as_of_recorded_check_verified !==
        true
  ) {
    fail(
      "A020E_B_LATER_REVOCATION_REWROTE_HISTORY"
    );
  }


  console.log(
    "A020E_B_LATER_REVOCATION_PRESERVES_HISTORY=PASS"
  );


  /*
   * Rehashed signature forgery.
   */

  const forgedSignaturePath =
    join(
      root,
      "forged-signature.jsonl"
    );


  writeForgedRecord({
    sourcePath:
      provenancePath,

    targetPath:
      forgedSignaturePath,

    mutate:
      (basis) => {
        basis.adapter_signature_base64 =
          Buffer.alloc(
            64,
            8
          ).toString(
            "base64"
          );
      }
  });


  expectReject(
    "A020E_B_REHASHED_SIGNATURE_FORGERY_DENIED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          forgedSignaturePath,

        invocationRegistryPath:
          invocationPath,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  /*
   * Rehashed trust-record substitution.
   */

  const forgedTrustPath =
    join(
      root,
      "forged-trust.jsonl"
    );


  writeForgedRecord({
    sourcePath:
      provenancePath,

    targetPath:
      forgedTrustPath,

    mutate:
      (basis) => {
        basis.adapter_trust_record_sha256 =
          "f".repeat(64);
      }
  });


  expectReject(
    "A020E_B_TRUST_RECORD_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          forgedTrustPath,

        invocationRegistryPath:
          invocationPath,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  /*
   * Rehashed capability-record substitution.
   */

  const forgedCapabilityPath =
    join(
      root,
      "forged-capability.jsonl"
    );


  writeForgedRecord({
    sourcePath:
      provenancePath,

    targetPath:
      forgedCapabilityPath,

    mutate:
      (basis) => {
        basis.capability_grant_record_sha256 =
          "e".repeat(64);
      }
  });


  expectReject(
    "A020E_B_CAPABILITY_RECORD_SUBSTITUTION_DENIED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          forgedCapabilityPath,

        invocationRegistryPath:
          invocationPath,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          capabilityPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  expectReject(
    "A020E_B_MISSING_TRUST_REGISTRY_FAIL_CLOSED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          provenancePath,

        invocationRegistryPath:
          invocationPath,

        adapterTrustRegistryPath:
          join(
            root,
            "missing-trust.jsonl"
          ),

        capabilityRegistryPath:
          capabilityPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
  );


  /*
   * Proof valid at signed_at, capability revoked before
   * authorization_checked_at.
   *
   * Historical proof must remain valid as of signed_at,
   * but recorded callback-time authorization must fail.
   */

  const earlyCapabilityPath =
    join(
      root,
      "early-capability.jsonl"
    );


  registerCapability(
    earlyCapabilityPath,
    "ADAPTER-CAPABILITY-EVENT-A020E-B-EARLY"
  );


  const earlyProof =
    createProof({
      claim,
      trustPath,

      capabilityPath:
        earlyCapabilityPath
    });


  const earlyProvenancePath =
    join(
      root,
      "early-provenance.jsonl"
    );


  appendExecutionAdapterAuthorizationProvenance({
    registryPath:
      earlyProvenancePath,

    invocationRegistryPath:
      invocationPath,

    provenance:
      provenanceFromProof({
        claim,
        proof:
          earlyProof
      })
  });


  revokeExecutionAdapterCapability({
    registryPath:
      earlyCapabilityPath,

    revocation: {
      schema_version:
        "1.0",

      event_id:
        "ADAPTER-CAPABILITY-EVENT-A020E-B-EARLY-REVOKED",

      event_type:
        "REVOKED",

      grant_id:
        GRANT_ID,

      adapter_id:
        ADAPTER_ID,

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      external_system_reference:
        TARGET,

      revoked_at:
        "2026-08-24T10:07:00Z",

      reason_code:
        "OPERATOR_ACTION"
    },

    recordedAt:
      "2026-08-24T10:07:10Z",

    recordedBy:
      "IPR-A020E-B-CAPABILITY-ADMIN"
  });


  expectReject(
    "A020E_B_REVOKED_BEFORE_RECORDED_CHECK_DENIED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          earlyProvenancePath,

        invocationRegistryPath:
          invocationPath,

        adapterTrustRegistryPath:
          trustPath,

        capabilityRegistryPath:
          earlyCapabilityPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_CHECK_VERIFY_FAILED"
  );


  console.log("");
  console.log(
    "===== A020E-B FINAL MATRIX ====="
  );

  console.log(
    "A019_INVOCATION_BINDING=ENFORCED"
  );

  console.log(
    "A020C_ED25519_SIGNATURE=HISTORICALLY_REVERIFIED"
  );

  console.log(
    "A020A_TRUST_AS_OF_SIGNED_AT=REVERIFIED"
  );

  console.log(
    "A020B_CAPABILITY_AS_OF_SIGNED_AT=REVERIFIED"
  );

  console.log(
    "A020B_EXACT_TARGET_AS_OF_SIGNED_AT=REVERIFIED"
  );

  console.log(
    "A020A_TRUST_AS_OF_RECORDED_AUTHORIZATION_CHECK=REVERIFIED"
  );

  console.log(
    "A020B_CAPABILITY_AS_OF_RECORDED_AUTHORIZATION_CHECK=REVERIFIED"
  );

  console.log(
    "LATER_REVOCATION_REWRITES_HISTORY=FALSE"
  );

  console.log(
    "REVOCATION_BEFORE_RECORDED_AUTHORIZATION_CHECK=DENIED"
  );

  console.log(
    "CURRENT_AUTHORIZATION_AT_AUDIT_TIME=NOT_CLAIMED"
  );

  console.log(
    "REMOTE_TARGET_AUTHENTICITY=NOT_PROVEN"
  );

  console.log(
    "REMOTE_INSTITUTIONAL_IDENTITY=NOT_PROVEN"
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
    "EXTERNAL_RESPONSE_AUTHENTICITY=NOT_PROVEN"
  );

  console.log(
    "SETTLEMENT_FINALITY=NOT_PROVEN"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "EXTERNAL_IMMUTABILITY=NOT_PROVEN"
  );

  console.log(
    "A020E_B_CRYPTOGRAPHIC_HISTORICAL_PROVENANCE=PASS"
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
