import {
  createHash
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
  appendExecutionAdapterAuthorizationProvenance,
  getExecutionAdapterAuthorizationProvenance,
  listExecutionAdapterAuthorizationProvenance,
  verifyExecutionAdapterAuthorizationProvenanceRegistry
} from "../protocol/hbce-execution-adapter-authorization-provenance.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a020e-a-"
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


function makeInvocationRecord({
  suffix,
  previousRecordSha256,
  claimedAt
}) {
  const basis = {
    registry_version:
      "1.0",

    record_type:
      "EXECUTION_ADAPTER_INVOCATION_CLAIMED",

    invocation_id:
      `ADAPTER-INVOCATION-A020E-${suffix}`,

    execution_id:
      `EXECUTION-A020E-${suffix}`,

    attempt_id:
      `EXECUTION-ATTEMPT-A020E-${suffix}`,

    execution_attempt_evidence_id:
      `EXECUTION-EVIDENCE-A020E-${suffix}`,

    execution_attempt_evidence_sha256:
      "1".repeat(64),

    execution_attempt_record_sha256:
      "2".repeat(64),

    authorization_id:
      `AUTHORIZATION-A020E-${suffix}`,

    consumption_id:
      `CONSUMPTION-A020E-${suffix}`,

    adapter_id:
      `ADAPTER-A020E-${suffix}`,

    external_system_reference:
      `BANK-SANDBOX-A020E-${suffix}`,

    execution_payload_sha256:
      suffix ===
        "ONE"
        ? "3".repeat(64)
        : "4".repeat(64),

    idempotency_key_sha256:
      suffix ===
        "ONE"
        ? "5".repeat(64)
        : "6".repeat(64),

    claimed_at:
      claimedAt,

    time_source:
      "LOCAL_SYSTEM_CLOCK",

    previous_record_sha256:
      previousRecordSha256
  };


  return {
    ...basis,

    record_sha256:
      sha256Canonical(
        basis
      )
  };
}


function makeProvenance({
  claim,
  signedAt,
  checkedAt
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
      `ADAPTER-KEY-A020E-${claim.execution_id.endsWith("ONE") ? "ONE" : "TWO"}`,

    capability_grant_id:
      `ADAPTER-CAPABILITY-GRANT-A020E-${claim.execution_id.endsWith("ONE") ? "ONE" : "TWO"}`,

    capability:
      "INVOKE_EXTERNAL_SYSTEM",

    external_system_reference:
      claim.external_system_reference,

    execution_payload_sha256:
      claim.execution_payload_sha256,

    idempotency_key_sha256:
      claim.idempotency_key_sha256,

    adapter_signed_at:
      signedAt,

    adapter_signed_payload_sha256:
      "7".repeat(64),

    adapter_signature_algorithm:
      "ED25519",

    adapter_signature_base64:
      Buffer.alloc(
        64,
        7
      ).toString(
        "base64"
      ),

    adapter_public_key_sha256:
      "8".repeat(64),

    adapter_trust_record_sha256:
      "9".repeat(64),

    capability_grant_record_sha256:
      "a".repeat(64),

    authorization_checked_at:
      checkedAt,

    time_source:
      "LOCAL_SYSTEM_CLOCK"
  };
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


try {
  const invocationRegistryPath =
    join(
      root,
      "invocations.jsonl"
    );


  const provenanceRegistryPath =
    join(
      root,
      "provenance.jsonl"
    );


  const claimOne =
    makeInvocationRecord({
      suffix:
        "ONE",

      previousRecordSha256:
        null,

      claimedAt:
        "2026-08-24T10:07:00Z"
    });


  const claimTwo =
    makeInvocationRecord({
      suffix:
        "TWO",

      previousRecordSha256:
        claimOne.record_sha256,

      claimedAt:
        "2026-08-24T10:08:00Z"
    });


  writeFileSync(
    invocationRegistryPath,
    `${JSON.stringify(claimOne)}\n${JSON.stringify(claimTwo)}\n`,
    "utf8"
  );


  const provenanceOne =
    makeProvenance({
      claim:
        claimOne,

      signedAt:
        "2026-08-24T10:06:30Z",

      checkedAt:
        "2026-08-24T10:07:30Z"
    });


  const recordOne =
    appendExecutionAdapterAuthorizationProvenance({
      registryPath:
        provenanceRegistryPath,

      invocationRegistryPath,

      provenance:
        provenanceOne
    });


  if (
    recordOne.invocation_id !==
      claimOne.invocation_id ||
    recordOne.invocation_record_sha256 !==
      claimOne.record_sha256 ||
    recordOne.previous_record_sha256 !==
      null
  ) {
    fail(
      "A020E_A_FIRST_RECORD_INVALID"
    );
  }


  console.log(
    "A020E_A_FIRST_PROVENANCE_APPENDED=PASS"
  );


  const provenanceTwo =
    makeProvenance({
      claim:
        claimTwo,

      signedAt:
        "2026-08-24T10:07:30Z",

      checkedAt:
        "2026-08-24T10:08:30Z"
    });


  const recordTwo =
    appendExecutionAdapterAuthorizationProvenance({
      registryPath:
        provenanceRegistryPath,

      invocationRegistryPath,

      provenance:
        provenanceTwo
    });


  if (
    recordTwo.previous_record_sha256 !==
      recordOne.record_sha256
  ) {
    fail(
      "A020E_A_CHAIN_LINK_INVALID"
    );
  }


  console.log(
    "A020E_A_APPEND_ONLY_CHAIN=PASS"
  );


  const verification =
    verifyExecutionAdapterAuthorizationProvenanceRegistry({
      registryPath:
        provenanceRegistryPath,

      invocationRegistryPath
    });


  if (
    verification.valid !==
      true ||
    verification.record_count !==
      2 ||
    verification.invocation_claim_binding_verified !==
      true ||
    verification.durable_authorization_provenance_recorded !==
      true ||
    verification.adapter_signature_cryptographically_verified !==
      false ||
    verification.historical_adapter_trust_verified !==
      false ||
    verification.historical_capability_authorization_verified !==
      false ||
    verification.adapter_identity_trusted !==
      false ||
    verification.adapter_capability_authorized !==
      false ||
    verification.external_system_authorization_proven !==
      false
  ) {
    fail(
      "A020E_A_VERIFICATION_SEMANTICS_INVALID"
    );
  }


  console.log(
    "A020E_A_REGISTRY_VERIFY=PASS"
  );


  console.log(
    "A020E_A_CRYPTOGRAPHIC_OVERCLAIM=DENIED"
  );


  const found =
    getExecutionAdapterAuthorizationProvenance({
      registryPath:
        provenanceRegistryPath,

      invocationId:
        claimOne.invocation_id
    });


  if (
    !found ||
    found.record_sha256 !==
      recordOne.record_sha256
  ) {
    fail(
      "A020E_A_GET_API_INVALID"
    );
  }


  console.log(
    "A020E_A_GET_API=PASS"
  );


  const listed =
    listExecutionAdapterAuthorizationProvenance({
      registryPath:
        provenanceRegistryPath
    });


  if (
    listed.length !==
      2
  ) {
    fail(
      "A020E_A_LIST_API_INVALID"
    );
  }


  console.log(
    "A020E_A_LIST_API=PASS"
  );


  expectReject(
    "A020E_A_DUPLICATE_INVOCATION_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          provenanceRegistryPath,

        invocationRegistryPath,

        provenance:
          provenanceOne
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_DUPLICATE_INVOCATION"
  );


  const wrongHash =
    {
      ...provenanceOne,

      invocation_record_sha256:
        "f".repeat(64)
    };


  const wrongHashRegistry =
    join(
      root,
      "wrong-hash.jsonl"
    );


  expectReject(
    "A020E_A_WRONG_INVOCATION_HASH_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          wrongHashRegistry,

        invocationRegistryPath,

        provenance:
          wrongHash
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
  );


  const targetSubstitution =
    {
      ...provenanceOne,

      external_system_reference:
        "BANK-SANDBOX-A020E-SUBSTITUTED"
    };


  expectReject(
    "A020E_A_TARGET_SUBSTITUTION_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          join(
            root,
            "target-substitution.jsonl"
          ),

        invocationRegistryPath,

        provenance:
          targetSubstitution
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
  );


  const payloadSubstitution =
    {
      ...provenanceOne,

      execution_payload_sha256:
        "e".repeat(64)
    };


  expectReject(
    "A020E_A_PAYLOAD_SUBSTITUTION_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          join(
            root,
            "payload-substitution.jsonl"
          ),

        invocationRegistryPath,

        provenance:
          payloadSubstitution
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
  );


  const idempotencySubstitution =
    {
      ...provenanceOne,

      idempotency_key_sha256:
        "d".repeat(64)
    };


  expectReject(
    "A020E_A_IDEMPOTENCY_SUBSTITUTION_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          join(
            root,
            "idempotency-substitution.jsonl"
          ),

        invocationRegistryPath,

        provenance:
          idempotencySubstitution
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
  );


  const earlyCheck =
    makeProvenance({
      claim:
        claimOne,

      signedAt:
        "2026-08-24T10:05:00Z",

      checkedAt:
        "2026-08-24T10:06:59Z"
    });


  expectReject(
    "A020E_A_AUTHORIZATION_BEFORE_CLAIM_DENIED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          join(
            root,
            "early-check.jsonl"
          ),

        invocationRegistryPath,

        provenance:
          earlyCheck
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_BEFORE_INVOCATION_CLAIM"
  );


  expectReject(
    "A020E_A_MISSING_INVOCATION_REGISTRY_FAIL_CLOSED",

    () =>
      appendExecutionAdapterAuthorizationProvenance({
        registryPath:
          join(
            root,
            "missing-invocation-provenance.jsonl"
          ),

        invocationRegistryPath:
          join(
            root,
            "missing-invocation.jsonl"
          ),

        provenance:
          provenanceOne
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_VERIFY_FAILED"
  );


  const rawCanonical =
    readFileSync(
      provenanceRegistryPath,
      "utf8"
    )
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line)
      );


  const hashTamperPath =
    join(
      root,
      "hash-tamper.jsonl"
    );


  const hashTampered = [
    {
      ...rawCanonical[0],

      record_sha256:
        "0".repeat(64)
    },

    rawCanonical[1]
  ];


  writeFileSync(
    hashTamperPath,
    `${hashTampered
      .map(
        (record) =>
          JSON.stringify(record)
      )
      .join("\n")}\n`,
    "utf8"
  );


  expectReject(
    "A020E_A_RECORD_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          hashTamperPath,

        invocationRegistryPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_HASH_INVALID:1"
  );


  const chainTamperPath =
    join(
      root,
      "chain-tamper.jsonl"
    );


  const firstBasis = {
    ...rawCanonical[0],

    adapter_key_id:
      "ADAPTER-KEY-A020E-FORGED"
  };


  delete firstBasis
    .record_sha256;


  const forgedFirst = {
    ...firstBasis,

    record_sha256:
      sha256Canonical(
        firstBasis
      )
  };


  writeFileSync(
    chainTamperPath,
    `${JSON.stringify(forgedFirst)}\n${JSON.stringify(rawCanonical[1])}\n`,
    "utf8"
  );


  expectReject(
    "A020E_A_CHAIN_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          chainTamperPath,

        invocationRegistryPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CHAIN_INVALID:2"
  );


  const rehashedForgeryPath =
    join(
      root,
      "rehashed-forgery.jsonl"
    );


  const forgedBasis = {
    ...rawCanonical[0],

    adapter_id:
      "ADAPTER-A020E-FORGED",

    previous_record_sha256:
      null
  };


  delete forgedBasis
    .record_sha256;


  const forgedRecord = {
    ...forgedBasis,

    record_sha256:
      sha256Canonical(
        forgedBasis
      )
  };


  writeFileSync(
    rehashedForgeryPath,
    `${JSON.stringify(forgedRecord)}\n`,
    "utf8"
  );


  expectReject(
    "A020E_A_REHASHED_PROVENANCE_FORGERY_DENIED",

    () =>
      verifyExecutionAdapterAuthorizationProvenanceRegistry({
        registryPath:
          rehashedForgeryPath,

        invocationRegistryPath
      }),

    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
  );


  console.log("");
  console.log(
    "===== A020E-A FINAL MATRIX ====="
  );

  console.log(
    "A019_INVOCATION_CLAIM_BINDING=ENFORCED"
  );

  console.log(
    "INVOCATION_RECORD_SHA256_BINDING=ENFORCED"
  );

  console.log(
    "EXECUTION_ATTEMPT_BINDING=ENFORCED"
  );

  console.log(
    "AUTHORIZATION_CONSUMPTION_BINDING=ENFORCED"
  );

  console.log(
    "ADAPTER_BINDING=ENFORCED"
  );

  console.log(
    "EXACT_TARGET_BINDING=ENFORCED"
  );

  console.log(
    "PAYLOAD_SHA256_BINDING=ENFORCED"
  );

  console.log(
    "IDEMPOTENCY_SHA256_BINDING=ENFORCED"
  );

  console.log(
    "AUTHORIZATION_CHECK_AFTER_INVOCATION_CLAIM=ENFORCED"
  );

  console.log(
    "DUPLICATE_PROVENANCE_PER_INVOCATION=DENIED"
  );

  console.log(
    "APPEND_ONLY_HASH_CHAIN=PASS"
  );

  console.log(
    "RECORD_TAMPER=DETECTED"
  );

  console.log(
    "CHAIN_TAMPER=DETECTED"
  );

  console.log(
    "REHASHED_PROVENANCE_FORGERY=DENIED_BY_A019_BINDING"
  );

  console.log(
    "ADAPTER_SIGNATURE_CRYPTOGRAPHIC_VERIFY=NOT_YET_IMPLEMENTED_BY_A020E_A"
  );

  console.log(
    "HISTORICAL_ADAPTER_TRUST_VERIFY=NOT_YET_IMPLEMENTED_BY_A020E_A"
  );

  console.log(
    "HISTORICAL_CAPABILITY_VERIFY=NOT_YET_IMPLEMENTED_BY_A020E_A"
  );

  console.log(
    "LEGAL_IDENTITY_PROVEN=FALSE"
  );

  console.log(
    "LEGAL_AUTHORITY_CREATED=FALSE"
  );

  console.log(
    "REMOTE_TARGET_AUTHENTICITY=FALSE"
  );

  console.log(
    "EXTERNAL_EXECUTION_PROVEN=FALSE"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "EXTERNAL_IMMUTABILITY=NOT_PROVEN"
  );

  console.log(
    "A020E_A_AUTHORIZATION_PROVENANCE_REGISTRY=PASS"
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
