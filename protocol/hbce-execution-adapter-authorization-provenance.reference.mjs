import {
  createHash
} from "node:crypto";

import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync
} from "node:fs";


import {
  getExecutionAdapterInvocation
} from "./hbce-execution-adapter-boundary.reference.mjs";


import {
  assertExecutionAdapterTrusted
} from "./hbce-execution-adapter-trust.reference.mjs";


import {
  assertExecutionAdapterCapabilityAuthorized
} from "./hbce-execution-adapter-capability.reference.mjs";


import {
  verifyExecutionAdapterInvocationProof
} from "./hbce-execution-adapter-signature.reference.mjs";


const EXECUTION_ID_PATTERN =
  /^EXECUTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ATTEMPT_ID_PATTERN =
  /^EXECUTION-ATTEMPT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_ID_PATTERN =
  /^ADAPTER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_KEY_ID_PATTERN =
  /^ADAPTER-KEY-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const CAPABILITY_GRANT_ID_PATTERN =
  /^ADAPTER-CAPABILITY-GRANT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const RECORD_KEYS = [
  "registry_version",
  "record_type",

  "invocation_id",
  "invocation_record_sha256",

  "execution_id",
  "attempt_id",
  "authorization_id",
  "consumption_id",

  "adapter_id",
  "adapter_key_id",

  "capability_grant_id",
  "capability",

  "external_system_reference",

  "execution_payload_sha256",
  "idempotency_key_sha256",

  "adapter_signed_at",
  "adapter_signed_payload_sha256",
  "adapter_signature_algorithm",
  "adapter_signature_base64",

  "adapter_public_key_sha256",
  "adapter_trust_record_sha256",
  "capability_grant_record_sha256",

  "authorization_checked_at",
  "time_source",

  "previous_record_sha256",
  "record_sha256"
].sort();


function fail(message) {
  throw new Error(message);
}


function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
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


function assertString(
  value,
  code,
  {
    min = 1,
    max = 256
  } = {}
) {
  if (
    typeof value !==
      "string" ||
    value.length <
      min ||
    value.length >
      max
  ) {
    fail(code);
  }
}


function assertId(
  value,
  pattern,
  code
) {
  if (
    typeof value !==
      "string" ||
    !pattern.test(value)
  ) {
    fail(code);
  }
}


function assertSha256(
  value,
  code
) {
  if (
    typeof value !==
      "string" ||
    !SHA256_PATTERN.test(
      value
    )
  ) {
    fail(code);
  }
}


function assertIsoDate(
  value,
  code
) {
  if (
    typeof value !==
      "string" ||
    !Number.isFinite(
      Date.parse(value)
    )
  ) {
    fail(code);
  }
}


function assertBase64Ed25519Signature(
  value,
  code
) {
  assertString(
    value,
    code,
    {
      max:
        256
    }
  );


  let decoded;


  try {
    decoded =
      Buffer.from(
        value,
        "base64"
      );
  } catch {
    fail(code);
  }


  if (
    decoded.length !==
      64 ||
    decoded.toString(
      "base64"
    ) !==
      value
  ) {
    fail(code);
  }
}


function acquireLock(
  registryPath
) {
  const lockPath =
    `${registryPath}.lock`;

  let fd;


  try {
    fd =
      openSync(
        lockPath,
        "wx"
      );
  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_LOCKED"
    );
  }


  return {
    fd,
    lockPath
  };
}


function releaseLock(lock) {
  try {
    closeSync(
      lock.fd
    );
  } finally {
    if (
      existsSync(
        lock.lockPath
      )
    ) {
      unlinkSync(
        lock.lockPath
      );
    }
  }
}


function assertRecordShape(
  record,
  lineNumber
) {
  if (
    record ===
      null ||
    typeof record !==
      "object" ||
    Array.isArray(record)
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_INVALID:${lineNumber}`
    );
  }


  const keys =
    Object.keys(record)
      .sort();


  if (
    JSON.stringify(keys) !==
    JSON.stringify(RECORD_KEYS)
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_SHAPE_INVALID:${lineNumber}`
    );
  }


  if (
    record.registry_version !==
      "1.0" ||
    record.record_type !==
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE"
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_TYPE_INVALID:${lineNumber}`
    );
  }


  assertString(
    record.invocation_id,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );


  assertSha256(
    record.invocation_record_sha256,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_SHA256_INVALID:${lineNumber}`
  );


  assertId(
    record.execution_id,
    EXECUTION_ID_PATTERN,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_EXECUTION_ID_INVALID:${lineNumber}`
  );


  assertId(
    record.attempt_id,
    ATTEMPT_ID_PATTERN,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_ATTEMPT_ID_INVALID:${lineNumber}`
  );


  assertString(
    record.authorization_id,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );


  assertString(
    record.consumption_id,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CONSUMPTION_ID_INVALID:${lineNumber}`,
    {
      max:
        128
    }
  );


  assertId(
    record.adapter_id,
    ADAPTER_ID_PATTERN,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_ADAPTER_ID_INVALID:${lineNumber}`
  );


  assertId(
    record.adapter_key_id,
    ADAPTER_KEY_ID_PATTERN,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_ADAPTER_KEY_ID_INVALID:${lineNumber}`
  );


  assertId(
    record.capability_grant_id,
    CAPABILITY_GRANT_ID_PATTERN,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_GRANT_ID_INVALID:${lineNumber}`
  );


  if (
    record.capability !==
      "INVOKE_EXTERNAL_SYSTEM"
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CAPABILITY_INVALID:${lineNumber}`
    );
  }


  assertString(
    record.external_system_reference,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_TARGET_INVALID:${lineNumber}`
  );


  for (
    const field of [
      "execution_payload_sha256",
      "idempotency_key_sha256",
      "adapter_signed_payload_sha256",
      "adapter_public_key_sha256",
      "adapter_trust_record_sha256",
      "capability_grant_record_sha256"
    ]
  ) {
    assertSha256(
      record[field],
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_SHA256_INVALID:${lineNumber}`
    );
  }


  assertIsoDate(
    record.adapter_signed_at,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_SIGNED_AT_INVALID:${lineNumber}`
  );


  if (
    record.adapter_signature_algorithm !==
      "ED25519"
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_SIGNATURE_ALGORITHM_INVALID:${lineNumber}`
    );
  }


  assertBase64Ed25519Signature(
    record.adapter_signature_base64,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_SIGNATURE_INVALID:${lineNumber}`
  );


  assertIsoDate(
    record.authorization_checked_at,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CHECKED_AT_INVALID:${lineNumber}`
  );


  if (
    Date.parse(
      record.authorization_checked_at
    ) <
    Date.parse(
      record.adapter_signed_at
    )
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CHECK_BEFORE_SIGNATURE:${lineNumber}`
    );
  }


  if (
    record.time_source !==
      "LOCAL_SYSTEM_CLOCK"
  ) {
    fail(
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_TIME_SOURCE_INVALID:${lineNumber}`
    );
  }


  if (
    record.previous_record_sha256 !==
      null
  ) {
    assertSha256(
      record.previous_record_sha256,
      `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_PREVIOUS_SHA256_INVALID:${lineNumber}`
    );
  }


  assertSha256(
    record.record_sha256,
    `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_SHA256_INVALID:${lineNumber}`
  );
}


function parseRegistry(
  registryPath,
  {
    allowMissing =
      false
  } = {}
) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_PATH_REQUIRED"
  );


  if (
    !existsSync(
      registryPath
    )
  ) {
    if (allowMissing) {
      return [];
    }


    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_MISSING"
    );
  }


  const raw =
    readFileSync(
      registryPath,
      "utf8"
    );


  if (
    raw.trim() ===
      ""
  ) {
    return [];
  }


  const lines =
    raw
      .trim()
      .split("\n");


  const records = [];

  const invocations =
    new Set();

  let previousRecordSha256 =
    null;

  let previousCheckedAtMs =
    null;


  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const lineNumber =
      index + 1;

    let record;


    try {
      record =
        JSON.parse(
          lines[index]
        );
    } catch {
      fail(
        `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_JSON_INVALID:${lineNumber}`
      );
    }


    assertRecordShape(
      record,
      lineNumber
    );


    if (
      record.previous_record_sha256 !==
        previousRecordSha256
    ) {
      fail(
        `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CHAIN_INVALID:${lineNumber}`
      );
    }


    const basis = {
      ...record
    };


    delete basis
      .record_sha256;


    if (
      sha256Canonical(
        basis
      ) !==
      record.record_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_RECORD_HASH_INVALID:${lineNumber}`
      );
    }


    if (
      invocations.has(
        record.invocation_id
      )
    ) {
      fail(
        `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_DUPLICATE_INVOCATION:${lineNumber}`
      );
    }


    invocations.add(
      record.invocation_id
    );


    const checkedAtMs =
      Date.parse(
        record.authorization_checked_at
      );


    if (
      previousCheckedAtMs !==
        null &&
      checkedAtMs <
        previousCheckedAtMs
    ) {
      fail(
        `EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CHRONOLOGY_INVALID:${lineNumber}`
      );
    }


    records.push(
      record
    );


    previousRecordSha256 =
      record.record_sha256;

    previousCheckedAtMs =
      checkedAtMs;
  }


  return records;
}


function getInvocationClaim({
  invocationRegistryPath,
  executionId,
  attemptId
}) {
  let claim;


  try {
    claim =
      getExecutionAdapterInvocation({
        registryPath:
          invocationRegistryPath,

        executionId,

        attemptId
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_VERIFY_FAILED"
    );
  }


  if (!claim) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_NOT_FOUND"
    );
  }


  return claim;
}


function assertInvocationBinding({
  provenance,
  invocationClaim
}) {
  if (
    provenance.invocation_id !==
      invocationClaim.invocation_id ||

    provenance.invocation_record_sha256 !==
      invocationClaim.record_sha256 ||

    provenance.execution_id !==
      invocationClaim.execution_id ||

    provenance.attempt_id !==
      invocationClaim.attempt_id ||

    provenance.authorization_id !==
      invocationClaim.authorization_id ||

    provenance.consumption_id !==
      invocationClaim.consumption_id ||

    provenance.adapter_id !==
      invocationClaim.adapter_id ||

    provenance.external_system_reference !==
      invocationClaim.external_system_reference ||

    provenance.execution_payload_sha256 !==
      invocationClaim.execution_payload_sha256 ||

    provenance.idempotency_key_sha256 !==
      invocationClaim.idempotency_key_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_BINDING_INVALID"
    );
  }


  if (
    Date.parse(
      provenance.authorization_checked_at
    ) <
    Date.parse(
      invocationClaim.claimed_at
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_BEFORE_INVOCATION_CLAIM"
    );
  }


  return true;
}


function normalizeInput(
  provenance
) {
  if (
    provenance ===
      null ||
    typeof provenance !==
      "object" ||
    Array.isArray(provenance)
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INPUT_INVALID"
    );
  }


  const basis = {
    registry_version:
      "1.0",

    record_type:
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE",

    invocation_id:
      provenance.invocation_id,

    invocation_record_sha256:
      provenance.invocation_record_sha256,

    execution_id:
      provenance.execution_id,

    attempt_id:
      provenance.attempt_id,

    authorization_id:
      provenance.authorization_id,

    consumption_id:
      provenance.consumption_id,

    adapter_id:
      provenance.adapter_id,

    adapter_key_id:
      provenance.adapter_key_id,

    capability_grant_id:
      provenance.capability_grant_id,

    capability:
      provenance.capability,

    external_system_reference:
      provenance.external_system_reference,

    execution_payload_sha256:
      provenance.execution_payload_sha256,

    idempotency_key_sha256:
      provenance.idempotency_key_sha256,

    adapter_signed_at:
      provenance.adapter_signed_at,

    adapter_signed_payload_sha256:
      provenance.adapter_signed_payload_sha256,

    adapter_signature_algorithm:
      provenance.adapter_signature_algorithm,

    adapter_signature_base64:
      provenance.adapter_signature_base64,

    adapter_public_key_sha256:
      provenance.adapter_public_key_sha256,

    adapter_trust_record_sha256:
      provenance.adapter_trust_record_sha256,

    capability_grant_record_sha256:
      provenance.capability_grant_record_sha256,

    authorization_checked_at:
      provenance.authorization_checked_at,

    time_source:
      provenance.time_source
  };


  const provisional = {
    ...basis,

    previous_record_sha256:
      null,

    record_sha256:
      "0".repeat(64)
  };


  assertRecordShape(
    provisional,
    0
  );


  return basis;
}


export function appendExecutionAdapterAuthorizationProvenance({
  registryPath,
  invocationRegistryPath,
  provenance
}) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_REGISTRY_PATH_REQUIRED"
  );


  assertString(
    invocationRegistryPath,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_REGISTRY_PATH_REQUIRED"
  );


  const basisInput =
    normalizeInput(
      provenance
    );


  const invocationClaim =
    getInvocationClaim({
      invocationRegistryPath,

      executionId:
        basisInput.execution_id,

      attemptId:
        basisInput.attempt_id
    });


  assertInvocationBinding({
    provenance:
      basisInput,

    invocationClaim
  });


  const lock =
    acquireLock(
      registryPath
    );


  try {
    const records =
      parseRegistry(
        registryPath,
        {
          allowMissing:
            true
        }
      );


    if (
      records.some(
        (record) =>
          record.invocation_id ===
            basisInput.invocation_id
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_DUPLICATE_INVOCATION"
      );
    }


    const previousRecordSha256 =
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256;


    const basis = {
      ...basisInput,

      previous_record_sha256:
        previousRecordSha256
    };


    const record = {
      ...basis,

      record_sha256:
        sha256Canonical(
          basis
        )
    };


    assertRecordShape(
      record,
      records.length + 1
    );


    const fd =
      openSync(
        registryPath,
        "a"
      );


    try {
      writeSync(
        fd,
        `${JSON.stringify(record)}\n`,
        null,
        "utf8"
      );

      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }


    return clone(
      record
    );

  } finally {
    releaseLock(lock);
  }
}


export function getExecutionAdapterAuthorizationProvenance({
  registryPath,
  invocationId
}) {
  assertString(
    invocationId,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_ID_REQUIRED",
    {
      max:
        128
    }
  );


  const record =
    parseRegistry(
      registryPath
    ).find(
      (item) =>
        item.invocation_id ===
          invocationId
    );


  return record
    ? clone(record)
    : null;
}


export function listExecutionAdapterAuthorizationProvenance({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}



function buildProofFromAuthorizationProvenance(
  record
) {
  return {
    schema_version:
      "1.0",

    proof_type:
      "EXECUTION_ADAPTER_INVOCATION_PROOF",

    domain:
      "HBCE_EXECUTION_ADAPTER_INVOCATION_V1",

    execution_id:
      record.execution_id,

    attempt_id:
      record.attempt_id,

    authorization_id:
      record.authorization_id,

    consumption_id:
      record.consumption_id,

    adapter_id:
      record.adapter_id,

    adapter_key_id:
      record.adapter_key_id,

    capability_grant_id:
      record.capability_grant_id,

    capability:
      record.capability,

    external_system_reference:
      record.external_system_reference,

    execution_payload_sha256:
      record.execution_payload_sha256,

    idempotency_key_sha256:
      record.idempotency_key_sha256,

    signed_at:
      record.adapter_signed_at,

    adapter_public_key_sha256:
      record.adapter_public_key_sha256,

    adapter_trust_record_sha256:
      record.adapter_trust_record_sha256,

    capability_grant_record_sha256:
      record.capability_grant_record_sha256,

    signature_algorithm:
      record.adapter_signature_algorithm,

    signed_payload_sha256:
      record.adapter_signed_payload_sha256,

    signature_base64:
      record.adapter_signature_base64
  };
}


function buildExpectedContextFromAuthorizationProvenance(
  record
) {
  return {
    execution_id:
      record.execution_id,

    attempt_id:
      record.attempt_id,

    authorization_id:
      record.authorization_id,

    consumption_id:
      record.consumption_id,

    adapter_id:
      record.adapter_id,

    adapter_key_id:
      record.adapter_key_id,

    capability_grant_id:
      record.capability_grant_id,

    capability:
      record.capability,

    external_system_reference:
      record.external_system_reference,

    execution_payload_sha256:
      record.execution_payload_sha256,

    idempotency_key_sha256:
      record.idempotency_key_sha256
  };
}


function verifyHistoricalCryptographicAuthorization({
  record,
  adapterTrustRegistryPath,
  capabilityRegistryPath
}) {
  const proof =
    buildProofFromAuthorizationProvenance(
      record
    );


  const expectedContext =
    buildExpectedContextFromAuthorizationProvenance(
      record
    );


  let proofVerification;


  try {
    proofVerification =
      verifyExecutionAdapterInvocationProof({
        proof,

        adapterTrustRegistryPath,

        capabilityRegistryPath,

        expectedContext
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
    );
  }


  if (
    proofVerification.valid !==
      true ||
    proofVerification.signature_valid !==
      true ||
    proofVerification.trusted_public_key_binding !==
      true ||
    proofVerification.key_control_proven !==
      true ||
    proofVerification.capability_authorized_as_of_signed_at !==
      true ||
    proofVerification.exact_target_authorized_as_of_signed_at !==
      true ||
    proofVerification.expected_context_bound !==
      true ||
    proofVerification.signed_payload_sha256 !==
      record.adapter_signed_payload_sha256 ||
    proofVerification.adapter_public_key_sha256 !==
      record.adapter_public_key_sha256 ||
    proofVerification.adapter_trust_record_sha256 !==
      record.adapter_trust_record_sha256 ||
    proofVerification.capability_grant_record_sha256 !==
      record.capability_grant_record_sha256 ||
    proofVerification.signed_at !==
      record.adapter_signed_at
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTOGRAPHIC_VERIFY_FAILED"
    );
  }


  let trustAtAuthorizationCheck;


  try {
    trustAtAuthorizationCheck =
      assertExecutionAdapterTrusted({
        registryPath:
          adapterTrustRegistryPath,

        adapterId:
          record.adapter_id,

        keyId:
          record.adapter_key_id,

        asOf:
          record.authorization_checked_at,

        expectedPublicKeySha256:
          record.adapter_public_key_sha256
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_CHECK_VERIFY_FAILED"
    );
  }


  if (
    trustAtAuthorizationCheck.public_key_sha256 !==
      record.adapter_public_key_sha256 ||
    trustAtAuthorizationCheck.trust_record_sha256 !==
      record.adapter_trust_record_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_CHECK_BINDING_MISMATCH"
    );
  }


  let capabilityAtAuthorizationCheck;


  try {
    capabilityAtAuthorizationCheck =
      assertExecutionAdapterCapabilityAuthorized({
        registryPath:
          capabilityRegistryPath,

        grantId:
          record.capability_grant_id,

        adapterId:
          record.adapter_id,

        capability:
          record.capability,

        externalSystemReference:
          record.external_system_reference,

        asOf:
          record.authorization_checked_at
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_CHECK_VERIFY_FAILED"
    );
  }


  if (
    capabilityAtAuthorizationCheck.grant_record_sha256 !==
      record.capability_grant_record_sha256 ||
    capabilityAtAuthorizationCheck.capability_authorized !==
      true ||
    capabilityAtAuthorizationCheck.exact_target_authorized !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_AUTHORIZATION_CHECK_BINDING_MISMATCH"
    );
  }


  return {
    proof_verification:
      proofVerification,

    trust_at_authorization_check:
      trustAtAuthorizationCheck,

    capability_at_authorization_check:
      capabilityAtAuthorizationCheck
  };
}


export function verifyExecutionAdapterAuthorizationProvenanceRegistry({
  registryPath,
  invocationRegistryPath,

  adapterTrustRegistryPath,
  capabilityRegistryPath
}) {
  assertString(
    invocationRegistryPath,
    "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_INVOCATION_REGISTRY_PATH_REQUIRED"
  );


  const cryptoRequested =
    adapterTrustRegistryPath !==
      undefined ||
    capabilityRegistryPath !==
      undefined;


  if (
    cryptoRequested &&
    (
      typeof adapterTrustRegistryPath !==
        "string" ||
      adapterTrustRegistryPath.length ===
        0 ||
      typeof capabilityRegistryPath !==
        "string" ||
      capabilityRegistryPath.length ===
        0
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_AUTHORIZATION_PROVENANCE_CRYPTO_REGISTRY_PATHS_REQUIRED"
    );
  }


  const records =
    parseRegistry(
      registryPath
    );


  let cryptographicallyVerified =
    false;

  let authorizationCheckVerified =
    false;


  for (
    const record of
    records
  ) {
    const invocationClaim =
      getInvocationClaim({
        invocationRegistryPath,

        executionId:
          record.execution_id,

        attemptId:
          record.attempt_id
      });


    assertInvocationBinding({
      provenance:
        record,

      invocationClaim
    });


    if (cryptoRequested) {
      verifyHistoricalCryptographicAuthorization({
        record,

        adapterTrustRegistryPath,

        capabilityRegistryPath
      });


      cryptographicallyVerified =
        true;

      authorizationCheckVerified =
        true;
    }
  }


  return {
    valid:
      true,

    registry_version:
      "1.0",

    record_count:
      records.length,

    head_record_sha256:
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256,

    durable_authorization_provenance_recorded:
      records.length >
        0,

    invocation_claim_binding_verified:
      true,

    adapter_signature_cryptographically_verified:
      cryptographicallyVerified,

    historical_adapter_trust_verified:
      cryptographicallyVerified,

    historical_capability_authorization_verified:
      cryptographicallyVerified,

    historical_exact_target_authorization_verified:
      cryptographicallyVerified,

    authorization_state_as_of_recorded_check_verified:
      authorizationCheckVerified,

    current_authorization_state_verified:
      false,

    adapter_identity_trusted:
      cryptographicallyVerified,

    adapter_key_control_proven:
      cryptographicallyVerified,

    adapter_capability_authorized:
      cryptographicallyVerified,

    external_system_authorization_proven:
      cryptographicallyVerified,

    remote_target_authenticity_proven:
      false,

    remote_institutional_identity_proven:
      false,

    legal_identity_proven:
      false,

    legal_authority_created:
      false,

    external_execution_proven:
      false,

    external_response_authenticity_verified:
      false,

    external_acceptance_proven:
      false,

    settlement_finality_proven:
      false,

    trusted_external_time:
      false,

    external_immutability_proven:
      false
  };
}
