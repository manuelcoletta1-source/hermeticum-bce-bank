import {
  createHash,
  createPublicKey,
  verify as verifyEd25519
} from "node:crypto";


import {
  assertExecutionAdapterTrusted,
  verifyExecutionAdapterTrustRegistry
} from "./hbce-execution-adapter-trust.reference.mjs";


import {
  assertExecutionAdapterCapabilityAuthorized,
  verifyExecutionAdapterCapabilityRegistry
} from "./hbce-execution-adapter-capability.reference.mjs";


const DOMAIN =
  "HBCE_EXECUTION_ADAPTER_INVOCATION_V1";

const CAPABILITY =
  "INVOKE_EXTERNAL_SYSTEM";

const SIGNATURE_ALGORITHM =
  "ED25519";


const EXECUTION_ID_PATTERN =
  /^EXECUTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ATTEMPT_ID_PATTERN =
  /^EXECUTION-ATTEMPT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_ID_PATTERN =
  /^ADAPTER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const KEY_ID_PATTERN =
  /^ADAPTER-KEY-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const GRANT_ID_PATTERN =
  /^ADAPTER-CAPABILITY-GRANT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const BASE64_PATTERN =
  /^[A-Za-z0-9+/]+={0,2}$/;


const CONTEXT_KEYS =
  new Set([
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
    "idempotency_key_sha256"
  ]);


const PROOF_KEYS =
  new Set([
    "schema_version",
    "proof_type",
    "domain",

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

    "signed_at",

    "adapter_public_key_sha256",
    "adapter_trust_record_sha256",
    "capability_grant_record_sha256",

    "signature_algorithm",
    "signed_payload_sha256",
    "signature_base64"
  ]);


function fail(code) {
  throw new Error(code);
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


function sha256Buffer(value) {
  return createHash(
    "sha256"
  )
    .update(value)
    .digest("hex");
}


function assertObject(
  value,
  code
) {
  if (
    value === null ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    fail(code);
  }
}


function assertExactKeys(
  value,
  keys,
  code
) {
  assertObject(
    value,
    `${code}_INVALID`
  );


  const actual =
    Object.keys(value);


  if (
    actual.length !==
      keys.size
  ) {
    fail(
      `${code}_FIELD_SET_INVALID`
    );
  }


  for (
    const key of
    actual
  ) {
    if (!keys.has(key)) {
      fail(
        `${code}_UNKNOWN_FIELD:${key}`
      );
    }
  }
}


function assertString(
  value,
  code,
  max = 256
) {
  if (
    typeof value !==
      "string" ||
    value.length ===
      0 ||
    value.length >
      max
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
    Number.isNaN(
      Date.parse(value)
    )
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
    !SHA256_PATTERN.test(value)
  ) {
    fail(code);
  }
}


function assertPattern(
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


function assertInvocationContext(
  context
) {
  assertExactKeys(
    context,
    CONTEXT_KEYS,
    "EXECUTION_ADAPTER_INVOCATION_CONTEXT"
  );


  assertPattern(
    context.execution_id,
    EXECUTION_ID_PATTERN,
    "EXECUTION_ADAPTER_INVOCATION_EXECUTION_ID_INVALID"
  );


  assertPattern(
    context.attempt_id,
    ATTEMPT_ID_PATTERN,
    "EXECUTION_ADAPTER_INVOCATION_ATTEMPT_ID_INVALID"
  );


  assertString(
    context.authorization_id,
    "EXECUTION_ADAPTER_INVOCATION_AUTHORIZATION_ID_INVALID",
    128
  );


  assertString(
    context.consumption_id,
    "EXECUTION_ADAPTER_INVOCATION_CONSUMPTION_ID_INVALID",
    128
  );


  assertPattern(
    context.adapter_id,
    ADAPTER_ID_PATTERN,
    "EXECUTION_ADAPTER_INVOCATION_ADAPTER_ID_INVALID"
  );


  assertPattern(
    context.adapter_key_id,
    KEY_ID_PATTERN,
    "EXECUTION_ADAPTER_INVOCATION_ADAPTER_KEY_ID_INVALID"
  );


  assertPattern(
    context.capability_grant_id,
    GRANT_ID_PATTERN,
    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_GRANT_ID_INVALID"
  );


  if (
    context.capability !==
      CAPABILITY
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_INVALID"
    );
  }


  assertString(
    context.external_system_reference,
    "EXECUTION_ADAPTER_INVOCATION_TARGET_INVALID"
  );


  if (
    context.external_system_reference.includes("*") ||
    context.external_system_reference.includes("?")
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_TARGET_WILDCARD_DENIED"
    );
  }


  assertSha256(
    context.execution_payload_sha256,
    "EXECUTION_ADAPTER_INVOCATION_PAYLOAD_SHA256_INVALID"
  );


  assertSha256(
    context.idempotency_key_sha256,
    "EXECUTION_ADAPTER_INVOCATION_IDEMPOTENCY_SHA256_INVALID"
  );
}


function contextFromProof(
  proof
) {
  return {
    execution_id:
      proof.execution_id,

    attempt_id:
      proof.attempt_id,

    authorization_id:
      proof.authorization_id,

    consumption_id:
      proof.consumption_id,

    adapter_id:
      proof.adapter_id,

    adapter_key_id:
      proof.adapter_key_id,

    capability_grant_id:
      proof.capability_grant_id,

    capability:
      proof.capability,

    external_system_reference:
      proof.external_system_reference,

    execution_payload_sha256:
      proof.execution_payload_sha256,

    idempotency_key_sha256:
      proof.idempotency_key_sha256
  };
}


function assertExpectedContext(
  proof,
  expectedContext
) {
  assertInvocationContext(
    expectedContext
  );


  for (
    const key of
    CONTEXT_KEYS
  ) {
    if (
      proof[key] !==
        expectedContext[key]
    ) {
      fail(
        `EXECUTION_ADAPTER_INVOCATION_CONTEXT_MISMATCH:${key}`
      );
    }
  }
}


function assertProofShape(
  proof
) {
  assertExactKeys(
    proof,
    PROOF_KEYS,
    "EXECUTION_ADAPTER_INVOCATION_PROOF"
  );


  if (
    proof.schema_version !==
      "1.0" ||
    proof.proof_type !==
      "EXECUTION_ADAPTER_INVOCATION_PROOF" ||
    proof.domain !==
      DOMAIN
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_PROOF_DOMAIN_VERSION_INVALID"
    );
  }


  assertInvocationContext(
    contextFromProof(
      proof
    )
  );


  assertIsoDate(
    proof.signed_at,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_AT_INVALID"
  );


  assertSha256(
    proof.adapter_public_key_sha256,
    "EXECUTION_ADAPTER_INVOCATION_PUBLIC_KEY_SHA256_INVALID"
  );


  assertSha256(
    proof.adapter_trust_record_sha256,
    "EXECUTION_ADAPTER_INVOCATION_TRUST_RECORD_SHA256_INVALID"
  );


  assertSha256(
    proof.capability_grant_record_sha256,
    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_RECORD_SHA256_INVALID"
  );


  if (
    proof.signature_algorithm !==
      SIGNATURE_ALGORITHM
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_ALGORITHM_INVALID"
    );
  }


  assertSha256(
    proof.signed_payload_sha256,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_PAYLOAD_SHA256_INVALID"
  );


  assertString(
    proof.signature_base64,
    "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_BASE64_INVALID",
    256
  );
}


function decodeSignature(
  encoded
) {
  if (
    !BASE64_PATTERN.test(
      encoded
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_BASE64_INVALID"
    );
  }


  let signature;


  try {
    signature =
      Buffer.from(
        encoded,
        "base64"
      );
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_BASE64_INVALID"
    );
  }


  if (
    signature.length !==
      64 ||
    signature.toString(
      "base64"
    ) !==
      encoded
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_BASE64_INVALID"
    );
  }


  return signature;
}


function publicKeyFromTrustState(
  trust
) {
  let publicKey;


  try {
    publicKey =
      createPublicKey({
        key:
          Buffer.from(
            trust.public_key_spki_der_base64,
            "base64"
          ),

        format:
          "der",

        type:
          "spki"
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_TRUSTED_PUBLIC_KEY_INVALID"
    );
  }


  if (
    publicKey.asymmetricKeyType !==
      "ed25519"
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_TRUSTED_PUBLIC_KEY_INVALID"
    );
  }


  return publicKey;
}


export function buildExecutionAdapterInvocationSignedPayload(
  proofLike
) {
  assertObject(
    proofLike,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_PAYLOAD_INPUT_INVALID"
  );


  const context =
    contextFromProof(
      proofLike
    );


  assertInvocationContext(
    context
  );


  assertIsoDate(
    proofLike.signed_at,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_AT_INVALID"
  );


  assertSha256(
    proofLike.adapter_public_key_sha256,
    "EXECUTION_ADAPTER_INVOCATION_PUBLIC_KEY_SHA256_INVALID"
  );


  assertSha256(
    proofLike.adapter_trust_record_sha256,
    "EXECUTION_ADAPTER_INVOCATION_TRUST_RECORD_SHA256_INVALID"
  );


  assertSha256(
    proofLike.capability_grant_record_sha256,
    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_RECORD_SHA256_INVALID"
  );


  if (
    proofLike.signature_algorithm !==
      SIGNATURE_ALGORITHM
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_ALGORITHM_INVALID"
    );
  }


  return {
    schema_version:
      "1.0",

    proof_type:
      "EXECUTION_ADAPTER_INVOCATION_PROOF",

    domain:
      DOMAIN,

    ...context,

    signed_at:
      proofLike.signed_at,

    adapter_public_key_sha256:
      proofLike.adapter_public_key_sha256,

    adapter_trust_record_sha256:
      proofLike.adapter_trust_record_sha256,

    capability_grant_record_sha256:
      proofLike.capability_grant_record_sha256,

    signature_algorithm:
      SIGNATURE_ALGORITHM
  };
}


export function encodeExecutionAdapterInvocationSignedPayload(
  payload
) {
  return Buffer.from(
    canonicalize(
      payload
    ),
    "utf8"
  );
}


export function hashExecutionAdapterInvocationSignedPayload(
  payload
) {
  return sha256Buffer(
    encodeExecutionAdapterInvocationSignedPayload(
      payload
    )
  );
}


export function createExecutionAdapterInvocationProof({
  adapterTrustRegistryPath,
  capabilityRegistryPath,

  context,
  signedAt,

  signInvocationPayload
}) {
  assertString(
    adapterTrustRegistryPath,
    "EXECUTION_ADAPTER_INVOCATION_TRUST_REGISTRY_PATH_REQUIRED"
  );


  assertString(
    capabilityRegistryPath,
    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_REGISTRY_PATH_REQUIRED"
  );


  assertInvocationContext(
    context
  );


  assertIsoDate(
    signedAt,
    "EXECUTION_ADAPTER_INVOCATION_SIGNED_AT_INVALID"
  );


  if (
    typeof signInvocationPayload !==
      "function"
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNER_CALLBACK_REQUIRED"
    );
  }


  let trustRegistryBefore;
  let capabilityRegistryBefore;


  try {
    trustRegistryBefore =
      verifyExecutionAdapterTrustRegistry({
        registryPath:
          adapterTrustRegistryPath
      });


    capabilityRegistryBefore =
      verifyExecutionAdapterCapabilityRegistry({
        registryPath:
          capabilityRegistryPath
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_AUTHORIZATION_REGISTRY_VERIFY_FAILED"
    );
  }


  let trust;


  try {
    trust =
      assertExecutionAdapterTrusted({
        registryPath:
          adapterTrustRegistryPath,

        adapterId:
          context.adapter_id,

        keyId:
          context.adapter_key_id,

        asOf:
          signedAt
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_ADAPTER_TRUST_VERIFY_FAILED"
    );
  }


  let capability;


  try {
    capability =
      assertExecutionAdapterCapabilityAuthorized({
        registryPath:
          capabilityRegistryPath,

        grantId:
          context.capability_grant_id,

        adapterId:
          context.adapter_id,

        capability:
          context.capability,

        externalSystemReference:
          context.external_system_reference,

        asOf:
          signedAt
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_VERIFY_FAILED"
    );
  }


  const proofBasis = {
    schema_version:
      "1.0",

    proof_type:
      "EXECUTION_ADAPTER_INVOCATION_PROOF",

    domain:
      DOMAIN,

    ...clone(
      context
    ),

    signed_at:
      signedAt,

    adapter_public_key_sha256:
      trust.public_key_sha256,

    adapter_trust_record_sha256:
      trust.trust_record_sha256,

    capability_grant_record_sha256:
      capability.grant_record_sha256,

    signature_algorithm:
      SIGNATURE_ALGORITHM
  };


  const payload =
    buildExecutionAdapterInvocationSignedPayload(
      proofBasis
    );


  const payloadBytes =
    encodeExecutionAdapterInvocationSignedPayload(
      payload
    );


  let suppliedSignature;


  try {
    suppliedSignature =
      signInvocationPayload(
        Buffer.from(
          payloadBytes
        )
      );
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNER_CALLBACK_FAILED"
    );
  }


  if (
    suppliedSignature !==
      null &&
    typeof suppliedSignature ===
      "object" &&
    typeof suppliedSignature.then ===
      "function"
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_ASYNC_SIGNER_DENIED"
    );
  }


  if (
    !Buffer.isBuffer(
      suppliedSignature
    ) &&
    !(
      suppliedSignature instanceof
        Uint8Array
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
    );
  }


  const signature =
    Buffer.from(
      suppliedSignature
    );


  if (
    signature.length !==
      64
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
    );
  }


  let trustRegistryAfter;
  let capabilityRegistryAfter;


  try {
    trustRegistryAfter =
      verifyExecutionAdapterTrustRegistry({
        registryPath:
          adapterTrustRegistryPath
      });


    capabilityRegistryAfter =
      verifyExecutionAdapterCapabilityRegistry({
        registryPath:
          capabilityRegistryPath
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_AUTHORIZATION_REGISTRY_VERIFY_FAILED"
    );
  }


  if (
    trustRegistryBefore.head_record_sha256 !==
      trustRegistryAfter.head_record_sha256 ||
    capabilityRegistryBefore.head_record_sha256 !==
      capabilityRegistryAfter.head_record_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_AUTHORIZATION_STATE_CHANGED_DURING_SIGNING"
    );
  }


  const publicKey =
    publicKeyFromTrustState(
      trust
    );


  let signatureValid =
    false;


  try {
    signatureValid =
      verifyEd25519(
        null,
        payloadBytes,
        publicKey,
        signature
      );
  } catch {
    signatureValid =
      false;
  }


  if (
    signatureValid !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
    );
  }


  return {
    ...payload,

    signed_payload_sha256:
      hashExecutionAdapterInvocationSignedPayload(
        payload
      ),

    signature_base64:
      signature.toString(
        "base64"
      )
  };
}


export function verifyExecutionAdapterInvocationProof({
  proof,

  adapterTrustRegistryPath,
  capabilityRegistryPath,

  expectedContext
}) {
  assertProofShape(
    proof
  );


  assertString(
    adapterTrustRegistryPath,
    "EXECUTION_ADAPTER_INVOCATION_TRUST_REGISTRY_PATH_REQUIRED"
  );


  assertString(
    capabilityRegistryPath,
    "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_REGISTRY_PATH_REQUIRED"
  );


  assertExpectedContext(
    proof,
    expectedContext
  );


  const payload =
    buildExecutionAdapterInvocationSignedPayload(
      proof
    );


  const payloadSha256 =
    hashExecutionAdapterInvocationSignedPayload(
      payload
    );


  if (
    payloadSha256 !==
      proof.signed_payload_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNED_PAYLOAD_HASH_MISMATCH"
    );
  }


  let trust;


  try {
    trust =
      assertExecutionAdapterTrusted({
        registryPath:
          adapterTrustRegistryPath,

        adapterId:
          proof.adapter_id,

        keyId:
          proof.adapter_key_id,

        asOf:
          proof.signed_at,

        expectedPublicKeySha256:
          proof.adapter_public_key_sha256
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_ADAPTER_TRUST_VERIFY_FAILED"
    );
  }


  if (
    trust.public_key_sha256 !==
      proof.adapter_public_key_sha256 ||
    trust.trust_record_sha256 !==
      proof.adapter_trust_record_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_TRUST_BINDING_MISMATCH"
    );
  }


  let capability;


  try {
    capability =
      assertExecutionAdapterCapabilityAuthorized({
        registryPath:
          capabilityRegistryPath,

        grantId:
          proof.capability_grant_id,

        adapterId:
          proof.adapter_id,

        capability:
          proof.capability,

        externalSystemReference:
          proof.external_system_reference,

        asOf:
          proof.signed_at
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_VERIFY_FAILED"
    );
  }


  if (
    capability.grant_record_sha256 !==
      proof.capability_grant_record_sha256 ||
    capability.capability_authorized !==
      true ||
    capability.exact_target_authorized !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_CAPABILITY_BINDING_MISMATCH"
    );
  }


  const signature =
    decodeSignature(
      proof.signature_base64
    );


  const publicKey =
    publicKeyFromTrustState(
      trust
    );


  let signatureValid =
    false;


  try {
    signatureValid =
      verifyEd25519(
        null,
        encodeExecutionAdapterInvocationSignedPayload(
          payload
        ),
        publicKey,
        signature
      );
  } catch {
    signatureValid =
      false;
  }


  if (
    signatureValid !==
      true
  ) {
    fail(
      "EXECUTION_ADAPTER_INVOCATION_SIGNATURE_INVALID"
    );
  }


  return {
    valid:
      true,

    domain:
      DOMAIN,

    signature_algorithm:
      SIGNATURE_ALGORITHM,

    signature_valid:
      true,

    signed_payload_sha256:
      payloadSha256,

    adapter_id:
      proof.adapter_id,

    adapter_key_id:
      proof.adapter_key_id,

    adapter_public_key_sha256:
      proof.adapter_public_key_sha256,

    adapter_trust_record_sha256:
      proof.adapter_trust_record_sha256,

    capability_grant_id:
      proof.capability_grant_id,

    capability_grant_record_sha256:
      proof.capability_grant_record_sha256,

    capability:
      proof.capability,

    external_system_reference:
      proof.external_system_reference,

    trusted_public_key_binding:
      true,

    trusted_as_of_signed_at:
      true,

    key_control_proven:
      true,

    capability_authorized_as_of_signed_at:
      true,

    exact_target_authorized_as_of_signed_at:
      true,

    expected_context_bound:
      true,

    signed_at:
      proof.signed_at,

    signed_at_caller_controlled:
      true,

    current_invocation_time_authorization_proven:
      false,

    adapter_code_integrity_proven:
      false,

    runtime_integrity_proven:
      false,

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

    external_acceptance_proven:
      false,

    settlement_finality_proven:
      false,

    trusted_external_time:
      false
  };
}
