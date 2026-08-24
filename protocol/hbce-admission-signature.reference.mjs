import {
  createHash,
  createPublicKey,
  verify
} from "node:crypto";


import {
  assertAdmissionSignerTrusted
} from "./hbce-admission-signer-trust.reference.mjs";


const DOMAIN =
  "HBCE_ADMISSION_CONSUMPTION_V1";


const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const CONSUMPTION_ID_PATTERN =
  /^CONSUMPTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const AUTHORIZATION_ID_PATTERN =
  /^AUTHORIZATION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const EVT_ID_PATTERN =
  /^EVT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const SIGNER_ID_PATTERN =
  /^ADMISSION-SIGNER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const KEY_ID_PATTERN =
  /^ADMISSION-KEY-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const SIGNED_PAYLOAD_KEYS =
  new Set([
    "domain",
    "registry_version",
    "record_type",

    "consumption_id",

    "authorization_id",
    "authorization_sha256",

    "evaluation_evt_id",
    "evaluation_evt_sha256",

    "presented_runtime_binding_sha256",

    "consumed_at",
    "consumed_by",

    "previous_record_sha256",

    "admission_signer_id",
    "admission_key_id",
    "admission_public_key_sha256",
    "admission_trust_record_sha256"
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


function assertObject(
  value,
  code
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    fail(code);
  }
}


function assertString(
  value,
  code,
  maxLength = 256
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    fail(code);
  }
}


function assertIsoDate(
  value,
  code
) {
  if (
    typeof value !== "string" ||
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
    typeof value !== "string" ||
    !SHA256_PATTERN.test(value)
  ) {
    fail(code);
  }
}


function assertNullableSha256(
  value,
  code
) {
  if (value === null) {
    return;
  }

  assertSha256(
    value,
    code
  );
}


function assertExactKeys(
  value,
  allowed,
  code
) {
  assertObject(
    value,
    `${code}_INVALID`
  );

  const keys =
    Object.keys(value);

  if (
    keys.length !==
      allowed.size
  ) {
    fail(
      `${code}_FIELD_SET_INVALID`
    );
  }

  for (
    const key of
    keys
  ) {
    if (
      !allowed.has(key)
    ) {
      fail(
        `${code}_UNKNOWN_FIELD:${key}`
      );
    }
  }
}


function assertSignedPayload(
  payload
) {
  assertExactKeys(
    payload,
    SIGNED_PAYLOAD_KEYS,
    "ADMISSION_SIGNED_PAYLOAD"
  );

  if (
    payload.domain !==
      DOMAIN
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_DOMAIN_INVALID"
    );
  }

  if (
    payload.registry_version !==
      "1.2"
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_VERSION_INVALID"
    );
  }

  if (
    payload.record_type !==
      "AUTHORIZATION_CONSUMED"
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_RECORD_TYPE_INVALID"
    );
  }

  if (
    typeof payload.consumption_id !==
      "string" ||
    !CONSUMPTION_ID_PATTERN.test(
      payload.consumption_id
    )
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_CONSUMPTION_ID_INVALID"
    );
  }

  if (
    typeof payload.authorization_id !==
      "string" ||
    !AUTHORIZATION_ID_PATTERN.test(
      payload.authorization_id
    )
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_AUTHORIZATION_ID_INVALID"
    );
  }

  if (
    typeof payload.evaluation_evt_id !==
      "string" ||
    !EVT_ID_PATTERN.test(
      payload.evaluation_evt_id
    )
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_EVT_ID_INVALID"
    );
  }

  if (
    typeof payload.admission_signer_id !==
      "string" ||
    !SIGNER_ID_PATTERN.test(
      payload.admission_signer_id
    )
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_SIGNER_ID_INVALID"
    );
  }

  if (
    typeof payload.admission_key_id !==
      "string" ||
    !KEY_ID_PATTERN.test(
      payload.admission_key_id
    )
  ) {
    fail(
      "ADMISSION_SIGNED_PAYLOAD_KEY_ID_INVALID"
    );
  }

  assertSha256(
    payload.authorization_sha256,
    "ADMISSION_SIGNED_PAYLOAD_AUTHORIZATION_SHA256_INVALID"
  );

  assertSha256(
    payload.evaluation_evt_sha256,
    "ADMISSION_SIGNED_PAYLOAD_EVT_SHA256_INVALID"
  );

  assertSha256(
    payload.presented_runtime_binding_sha256,
    "ADMISSION_SIGNED_PAYLOAD_RUNTIME_SHA256_INVALID"
  );

  assertSha256(
    payload.admission_public_key_sha256,
    "ADMISSION_SIGNED_PAYLOAD_PUBLIC_KEY_SHA256_INVALID"
  );

  assertSha256(
    payload.admission_trust_record_sha256,
    "ADMISSION_SIGNED_PAYLOAD_TRUST_RECORD_SHA256_INVALID"
  );

  assertIsoDate(
    payload.consumed_at,
    "ADMISSION_SIGNED_PAYLOAD_CONSUMED_AT_INVALID"
  );

  assertString(
    payload.consumed_by,
    "ADMISSION_SIGNED_PAYLOAD_CONSUMED_BY_INVALID"
  );

  assertNullableSha256(
    payload.previous_record_sha256,
    "ADMISSION_SIGNED_PAYLOAD_PREVIOUS_RECORD_SHA256_INVALID"
  );
}


export function buildAdmissionConsumptionSignedPayload({
  consumption_id,
  authorization_id,
  authorization_sha256,
  evaluation_evt_id,
  evaluation_evt_sha256,
  presented_runtime_binding_sha256,
  consumed_at,
  consumed_by,
  previous_record_sha256,
  admission_signer_id,
  admission_key_id,
  admission_public_key_sha256,
  admission_trust_record_sha256
}) {
  const payload = {
    domain:
      DOMAIN,

    registry_version:
      "1.2",

    record_type:
      "AUTHORIZATION_CONSUMED",

    consumption_id,

    authorization_id,
    authorization_sha256,

    evaluation_evt_id,
    evaluation_evt_sha256,

    presented_runtime_binding_sha256,

    consumed_at,
    consumed_by,

    previous_record_sha256,

    admission_signer_id,
    admission_key_id,
    admission_public_key_sha256,
    admission_trust_record_sha256
  };

  assertSignedPayload(
    payload
  );

  return clone(
    payload
  );
}


export function encodeAdmissionConsumptionSignedPayload(
  payload
) {
  assertSignedPayload(
    payload
  );

  return Buffer.from(
    canonicalize(payload),
    "utf8"
  );
}


export function hashAdmissionConsumptionSignedPayload(
  payload
) {
  return createHash(
    "sha256"
  )
    .update(
      encodeAdmissionConsumptionSignedPayload(
        payload
      )
    )
    .digest("hex");
}


export function verifyAdmissionConsumptionSignature({
  record,
  trustRegistryPath
}) {
  assertObject(
    record,
    "ADMISSION_CONSUMPTION_RECORD_INVALID"
  );

  assertString(
    trustRegistryPath,
    "ADMISSION_CONSUMPTION_TRUST_REGISTRY_PATH_REQUIRED"
  );

  if (
    record.registry_version !==
      "1.2" ||
    record.record_type !==
      "AUTHORIZATION_CONSUMED"
  ) {
    fail(
      "ADMISSION_CONSUMPTION_SIGNED_VERSION_REQUIRED"
    );
  }

  if (
    record.admission_signature_algorithm !==
      "ED25519"
  ) {
    fail(
      "ADMISSION_CONSUMPTION_SIGNATURE_ALGORITHM_INVALID"
    );
  }

  assertString(
    record.admission_signature_base64,
    "ADMISSION_CONSUMPTION_SIGNATURE_INVALID",
    128
  );

  assertSha256(
    record.admission_signed_payload_sha256,
    "ADMISSION_CONSUMPTION_SIGNED_PAYLOAD_SHA256_INVALID"
  );

  const payload =
    buildAdmissionConsumptionSignedPayload({
      consumption_id:
        record.consumption_id,

      authorization_id:
        record.authorization_id,

      authorization_sha256:
        record.authorization_sha256,

      evaluation_evt_id:
        record.evaluation_evt_id,

      evaluation_evt_sha256:
        record.evaluation_evt_sha256,

      presented_runtime_binding_sha256:
        record.presented_runtime_binding_sha256,

      consumed_at:
        record.consumed_at,

      consumed_by:
        record.consumed_by,

      previous_record_sha256:
        record.previous_record_sha256,

      admission_signer_id:
        record.admission_signer_id,

      admission_key_id:
        record.admission_key_id,

      admission_public_key_sha256:
        record.admission_public_key_sha256,

      admission_trust_record_sha256:
        record.admission_trust_record_sha256
    });

  const payloadSha256 =
    hashAdmissionConsumptionSignedPayload(
      payload
    );

  if (
    payloadSha256 !==
      record.admission_signed_payload_sha256
  ) {
    fail(
      "ADMISSION_CONSUMPTION_SIGNED_PAYLOAD_HASH_MISMATCH"
    );
  }

  const trust =
    assertAdmissionSignerTrusted({
      registryPath:
        trustRegistryPath,

      signerId:
        record.admission_signer_id,

      keyId:
        record.admission_key_id,

      asOf:
        record.consumed_at,

      expectedPublicKeySha256:
        record.admission_public_key_sha256
    });

  if (
    trust.trust_record_sha256 !==
      record.admission_trust_record_sha256
  ) {
    fail(
      "ADMISSION_CONSUMPTION_TRUST_RECORD_MISMATCH"
    );
  }

  let signature;

  try {
    signature =
      Buffer.from(
        record.admission_signature_base64,
        "base64"
      );
  } catch {
    fail(
      "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
    );
  }

  if (
    signature.length !==
      64 ||
    signature.toString(
      "base64"
    ) !==
      record.admission_signature_base64
  ) {
    fail(
      "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
    );
  }

  let publicKey;

  try {
    publicKey =
      createPublicKey({
        key:
          Buffer.from(
            trust.public_key_spki_der_base64,
            "base64"
          ),

        type:
          "spki",

        format:
          "der"
      });
  } catch {
    fail(
      "ADMISSION_CONSUMPTION_PUBLIC_KEY_INVALID"
    );
  }

  if (
    publicKey.asymmetricKeyType !==
      "ed25519"
  ) {
    fail(
      "ADMISSION_CONSUMPTION_PUBLIC_KEY_TYPE_INVALID"
    );
  }

  const signatureValid =
    verify(
      null,
      encodeAdmissionConsumptionSignedPayload(
        payload
      ),
      publicKey,
      signature
    );

  if (!signatureValid) {
    fail(
      "ADMISSION_CONSUMPTION_SIGNATURE_INVALID"
    );
  }

  return {
    valid:
      true,

    signature_valid:
      true,

    algorithm:
      "ED25519",

    domain:
      DOMAIN,

    signed_payload_sha256:
      payloadSha256,

    signer_id:
      record.admission_signer_id,

    key_id:
      record.admission_key_id,

    public_key_sha256:
      record.admission_public_key_sha256,

    trust_record_sha256:
      record.admission_trust_record_sha256,

    trusted_as_of_consumed_at:
      true,

    key_control_proven:
      true,

    human_legal_identity_proven:
      false,

    legal_authority_created:
      false,

    execution_proven:
      false,

    trusted_external_time:
      false
  };
}
