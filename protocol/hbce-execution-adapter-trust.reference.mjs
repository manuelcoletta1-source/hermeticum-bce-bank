import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import {
  createHash,
  createPublicKey
} from "node:crypto";


const EVENT_ID_PATTERN =
  /^ADAPTER-TRUST-EVENT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_ID_PATTERN =
  /^ADAPTER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const KEY_ID_PATTERN =
  /^ADAPTER-KEY-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const BASE64_PATTERN =
  /^[A-Za-z0-9+/]+={0,2}$/;


const SCOPE =
  "EXECUTION_ADAPTER_INVOCATION_SIGNING";


const EVENT_TYPES =
  new Set([
    "TRUSTED",
    "REVOKED"
  ]);


const REVOCATION_REASON_CODES =
  new Set([
    "KEY_COMPROMISE",
    "POLICY_VIOLATION",
    "SECURITY_INCIDENT",
    "OPERATOR_ACTION",
    "ROTATION",
    "OTHER"
  ]);


const TRUSTED_EVENT_KEYS =
  new Set([
    "schema_version",
    "event_id",
    "event_type",
    "adapter_id",
    "key_id",
    "scope",
    "algorithm",
    "public_key_spki_der_base64",
    "public_key_sha256",
    "valid_from",
    "valid_until"
  ]);


const REVOKED_EVENT_KEYS =
  new Set([
    "schema_version",
    "event_id",
    "event_type",
    "adapter_id",
    "key_id",
    "scope",
    "public_key_sha256",
    "revoked_at",
    "reason_code"
  ]);


const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "event_id",
    "event_type",
    "adapter_id",
    "key_id",
    "public_key_sha256",
    "recorded_at",
    "recorded_by",
    "previous_record_sha256",
    "event_sha256",
    "record_sha256",
    "event"
  ]);


function fail(code) {
  throw new Error(code);
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


function sha256Buffer(value) {
  return createHash(
    "sha256"
  )
    .update(value)
    .digest("hex");
}


function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
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


function assertEventIdentity(
  event
) {
  if (
    typeof event.event_id !==
      "string" ||
    !EVENT_ID_PATTERN.test(
      event.event_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUST_EVENT_ID_INVALID"
    );
  }

  if (
    typeof event.adapter_id !==
      "string" ||
    !ADAPTER_ID_PATTERN.test(
      event.adapter_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_ID_INVALID"
    );
  }

  if (
    typeof event.key_id !==
      "string" ||
    !KEY_ID_PATTERN.test(
      event.key_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_KEY_ID_INVALID"
    );
  }

  if (
    event.scope !==
      SCOPE
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUST_SCOPE_INVALID"
    );
  }

  assertSha256(
    event.public_key_sha256,
    "EXECUTION_ADAPTER_PUBLIC_KEY_SHA256_INVALID"
  );
}


function decodeAndValidateEd25519PublicKey(
  encoded,
  expectedFingerprint
) {
  assertString(
    encoded,
    "EXECUTION_ADAPTER_PUBLIC_KEY_INVALID",
    512
  );

  if (
    !BASE64_PATTERN.test(
      encoded
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_BASE64_INVALID"
    );
  }

  let der;

  try {
    der =
      Buffer.from(
        encoded,
        "base64"
      );
  } catch {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_BASE64_INVALID"
    );
  }

  if (
    der.length === 0 ||
    der.toString(
      "base64"
    ) !==
      encoded
  ) {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_BASE64_INVALID"
    );
  }

  let key;

  try {
    key =
      createPublicKey({
        key:
          der,

        format:
          "der",

        type:
          "spki"
      });
  } catch {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_INVALID"
    );
  }

  if (
    key.asymmetricKeyType !==
      "ed25519"
  ) {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_TYPE_INVALID"
    );
  }

  const canonicalDer =
    key.export({
      type:
        "spki",

      format:
        "der"
    });

  if (
    Buffer.compare(
      canonicalDer,
      der
    ) !==
      0
  ) {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_ENCODING_NON_CANONICAL"
    );
  }

  const fingerprint =
    sha256Buffer(
      canonicalDer
    );

  if (
    fingerprint !==
      expectedFingerprint
  ) {
    fail(
      "EXECUTION_ADAPTER_PUBLIC_KEY_FINGERPRINT_MISMATCH"
    );
  }

  return {
    der:
      canonicalDer,

    fingerprint
  };
}


function assertTrustedEvent(
  event
) {
  assertExactKeys(
    event,
    TRUSTED_EVENT_KEYS,
    "EXECUTION_ADAPTER_TRUSTED_EVENT"
  );

  if (
    event.schema_version !==
      "1.0" ||
    event.event_type !==
      "TRUSTED"
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUSTED_EVENT_VERSION_TYPE_INVALID"
    );
  }

  assertEventIdentity(
    event
  );

  if (
    event.algorithm !==
      "ED25519"
  ) {
    fail(
      "EXECUTION_ADAPTER_ALGORITHM_INVALID"
    );
  }

  decodeAndValidateEd25519PublicKey(
    event.public_key_spki_der_base64,
    event.public_key_sha256
  );

  assertIsoDate(
    event.valid_from,
    "EXECUTION_ADAPTER_VALID_FROM_INVALID"
  );

  if (
    event.valid_until !==
      null
  ) {
    assertIsoDate(
      event.valid_until,
      "EXECUTION_ADAPTER_VALID_UNTIL_INVALID"
    );

    if (
      Date.parse(
        event.valid_until
      ) <=
      Date.parse(
        event.valid_from
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_VALIDITY_WINDOW_INVALID"
      );
    }
  }
}


function assertRevokedEvent(
  event
) {
  assertExactKeys(
    event,
    REVOKED_EVENT_KEYS,
    "EXECUTION_ADAPTER_REVOKED_EVENT"
  );

  if (
    event.schema_version !==
      "1.0" ||
    event.event_type !==
      "REVOKED"
  ) {
    fail(
      "EXECUTION_ADAPTER_REVOKED_EVENT_VERSION_TYPE_INVALID"
    );
  }

  assertEventIdentity(
    event
  );

  assertIsoDate(
    event.revoked_at,
    "EXECUTION_ADAPTER_REVOKED_AT_INVALID"
  );

  if (
    !REVOCATION_REASON_CODES.has(
      event.reason_code
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_REVOCATION_REASON_INVALID"
    );
  }
}


function assertTrustEvent(
  event
) {
  assertObject(
    event,
    "EXECUTION_ADAPTER_TRUST_EVENT_INVALID"
  );

  if (
    !EVENT_TYPES.has(
      event.event_type
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUST_EVENT_TYPE_INVALID"
    );
  }

  if (
    event.event_type ===
      "TRUSTED"
  ) {
    assertTrustedEvent(
      event
    );

    return;
  }

  assertRevokedEvent(
    event
  );
}


function trustedRecordForKey(
  records,
  keyId
) {
  return records.find(
    (record) =>
      record.event_type ===
        "TRUSTED" &&
      record.key_id ===
        keyId
  ) || null;
}


function revokedRecordForKey(
  records,
  keyId
) {
  return records.find(
    (record) =>
      record.event_type ===
        "REVOKED" &&
      record.key_id ===
        keyId
  ) || null;
}


function assertEventAgainstHistory(
  records,
  event
) {
  if (
    records.some(
      (record) =>
        record.event_id ===
          event.event_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUST_EVENT_ALREADY_REGISTERED"
    );
  }

  if (
    event.event_type ===
      "TRUSTED"
  ) {
    const existingKey =
      trustedRecordForKey(
        records,
        event.key_id
      );

    if (existingKey) {
      fail(
        "EXECUTION_ADAPTER_KEY_ALREADY_REGISTERED"
      );
    }

    if (
      records.some(
        (record) =>
          record.event_type ===
            "TRUSTED" &&
          record.public_key_sha256 ===
            event.public_key_sha256
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_PUBLIC_KEY_ALREADY_REGISTERED"
      );
    }

    return;
  }

  const trusted =
    trustedRecordForKey(
      records,
      event.key_id
    );

  if (!trusted) {
    fail(
      "EXECUTION_ADAPTER_KEY_NOT_REGISTERED"
    );
  }

  if (
    trusted.adapter_id !==
      event.adapter_id
  ) {
    fail(
      "EXECUTION_ADAPTER_KEY_SIGNER_MISMATCH"
    );
  }

  if (
    trusted.public_key_sha256 !==
      event.public_key_sha256
  ) {
    fail(
      "EXECUTION_ADAPTER_REVOCATION_FINGERPRINT_MISMATCH"
    );
  }

  if (
    revokedRecordForKey(
      records,
      event.key_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_KEY_ALREADY_REVOKED"
    );
  }
}


function parseRegistry(
  registryPath,
  {
    allowMissing = false
  } = {}
) {
  if (
    !existsSync(
      registryPath
    )
  ) {
    if (allowMissing) {
      return [];
    }

    fail(
      "EXECUTION_ADAPTER_TRUST_REGISTRY_UNAVAILABLE"
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
      .split("\n")
      .filter(Boolean);

  const records = [];

  let expectedPreviousRecordSha256 =
    null;

  let previousRecordedAtMs =
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
        `EXECUTION_ADAPTER_TRUST_REGISTRY_CORRUPT_JSON_LINE:${lineNumber}`
      );
    }

    assertExactKeys(
      record,
      RECORD_KEYS,
      `EXECUTION_ADAPTER_TRUST_REGISTRY_RECORD:${lineNumber}`
    );

    if (
      record.registry_version !==
        "1.0" ||
      record.record_type !==
        "EXECUTION_ADAPTER_TRUST_EVENT_RECORDED"
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_REGISTRY_RECORD_TYPE_INVALID:${lineNumber}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `EXECUTION_ADAPTER_TRUST_REGISTRY_RECORDED_AT_INVALID:${lineNumber}`
    );

    assertString(
      record.recorded_by,
      `EXECUTION_ADAPTER_TRUST_REGISTRY_RECORDED_BY_INVALID:${lineNumber}`
    );

    assertSha256(
      record.event_sha256,
      `EXECUTION_ADAPTER_TRUST_REGISTRY_EVENT_SHA256_INVALID:${lineNumber}`
    );

    assertSha256(
      record.record_sha256,
      `EXECUTION_ADAPTER_TRUST_REGISTRY_RECORD_SHA256_INVALID:${lineNumber}`
    );

    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `EXECUTION_ADAPTER_TRUST_REGISTRY_PREVIOUS_SHA256_INVALID:${lineNumber}`
      );
    }

    if (
      record.previous_record_sha256 !==
        expectedPreviousRecordSha256
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_REGISTRY_CHAIN_MISMATCH:${lineNumber}`
      );
    }

    const recordedAtMs =
      Date.parse(
        record.recorded_at
      );

    if (
      previousRecordedAtMs !==
        null &&
      recordedAtMs <
        previousRecordedAtMs
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_REGISTRY_TIME_ORDER_MISMATCH:${lineNumber}`
      );
    }

    assertTrustEvent(
      record.event
    );

    if (
      record.event_id !==
        record.event.event_id ||
      record.event_type !==
        record.event.event_type ||
      record.adapter_id !==
        record.event.adapter_id ||
      record.key_id !==
        record.event.key_id ||
      record.public_key_sha256 !==
        record.event.public_key_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_REGISTRY_ENVELOPE_MISMATCH:${lineNumber}`
      );
    }

    const calculatedEventSha256 =
      sha256Canonical(
        record.event
      );

    if (
      calculatedEventSha256 !==
        record.event_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_EVENT_HASH_MISMATCH:${lineNumber}`
      );
    }

    const recordHashBasis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      event_id:
        record.event_id,

      event_type:
        record.event_type,

      adapter_id:
        record.adapter_id,

      key_id:
        record.key_id,

      public_key_sha256:
        record.public_key_sha256,

      recorded_at:
        record.recorded_at,

      recorded_by:
        record.recorded_by,

      previous_record_sha256:
        record.previous_record_sha256,

      event_sha256:
        record.event_sha256,

      event:
        record.event
    };

    const calculatedRecordSha256 =
      sha256Canonical(
        recordHashBasis
      );

    if (
      calculatedRecordSha256 !==
        record.record_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_TRUST_RECORD_HASH_MISMATCH:${lineNumber}`
      );
    }

    assertEventAgainstHistory(
      records,
      record.event
    );

    records.push(
      record
    );

    expectedPreviousRecordSha256 =
      record.record_sha256;

    previousRecordedAtMs =
      recordedAtMs;
  }

  return records;
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
      "EXECUTION_ADAPTER_TRUST_REGISTRY_LOCKED"
    );
  }

  return {
    fd,
    lockPath
  };
}


function releaseLock(
  lock
) {
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


function appendTrustEvent({
  registryPath,
  event,
  recordedAt,
  recordedBy
}) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_TRUST_REGISTRY_PATH_REQUIRED"
  );

  assertTrustEvent(
    event
  );

  assertIsoDate(
    recordedAt,
    "EXECUTION_ADAPTER_TRUST_RECORDED_AT_INVALID"
  );

  assertString(
    recordedBy,
    "EXECUTION_ADAPTER_TRUST_RECORDED_BY_INVALID"
  );

  if (
    event.event_type ===
      "REVOKED" &&
    Date.parse(
      recordedAt
    ) <
    Date.parse(
      event.revoked_at
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_REVOCATION_RECORDED_BEFORE_EFFECTIVE_TIME"
    );
  }

  const immutableEvent =
    clone(
      event
    );

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
      records.length > 0 &&
      Date.parse(
        recordedAt
      ) <
      Date.parse(
        records[
          records.length - 1
        ].recorded_at
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_TRUST_RECORDED_AT_ORDER_INVALID"
      );
    }

    assertEventAgainstHistory(
      records,
      immutableEvent
    );

    const previousRecordSha256 =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

    const eventSha256 =
      sha256Canonical(
        immutableEvent
      );

    const recordHashBasis = {
      registry_version:
        "1.0",

      record_type:
        "EXECUTION_ADAPTER_TRUST_EVENT_RECORDED",

      event_id:
        immutableEvent.event_id,

      event_type:
        immutableEvent.event_type,

      adapter_id:
        immutableEvent.adapter_id,

      key_id:
        immutableEvent.key_id,

      public_key_sha256:
        immutableEvent.public_key_sha256,

      recorded_at:
        recordedAt,

      recorded_by:
        recordedBy,

      previous_record_sha256:
        previousRecordSha256,

      event_sha256:
        eventSha256,

      event:
        immutableEvent
    };

    const record = {
      ...recordHashBasis,

      record_sha256:
        sha256Canonical(
          recordHashBasis
        )
    };

    appendFileSync(
      registryPath,
      `${JSON.stringify(record)}\n`,
      {
        encoding:
          "utf8",

        flag:
          "a"
      }
    );

    return clone(
      record
    );
  } finally {
    releaseLock(
      lock
    );
  }
}


export function registerExecutionAdapterKey({
  registryPath,
  trust,
  recordedAt,
  recordedBy
}) {
  if (
    trust === null ||
    typeof trust !==
      "object" ||
    Array.isArray(
      trust
    ) ||
    trust.event_type !==
      "TRUSTED"
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUSTED_EVENT_REQUIRED"
    );
  }

  return appendTrustEvent({
    registryPath,
    event:
      trust,
    recordedAt,
    recordedBy
  });
}


export function revokeExecutionAdapterKey({
  registryPath,
  revocation,
  recordedAt,
  recordedBy
}) {
  if (
    revocation === null ||
    typeof revocation !==
      "object" ||
    Array.isArray(
      revocation
    ) ||
    revocation.event_type !==
      "REVOKED"
  ) {
    fail(
      "EXECUTION_ADAPTER_REVOKED_EVENT_REQUIRED"
    );
  }

  return appendTrustEvent({
    registryPath,
    event:
      revocation,
    recordedAt,
    recordedBy
  });
}


export function listExecutionAdapterTrustEvents({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifyExecutionAdapterTrustRegistry({
  registryPath
}) {
  const records =
    parseRegistry(
      registryPath
    );

  return {
    valid:
      true,

    record_count:
      records.length,

    head_record_sha256:
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256,

    append_only_chain_verified:
      true,

    trusted_external_time:
      false,

    external_immutability_proven:
      false,

    registry_administrator_authenticity_proven:
      false
  };
}


export function resolveExecutionAdapterTrust({
  registryPath,
  adapterId,
  keyId,
  asOf
}) {
  if (
    typeof adapterId !==
      "string" ||
    !ADAPTER_ID_PATTERN.test(
      adapterId
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_ID_INVALID"
    );
  }

  if (
    typeof keyId !==
      "string" ||
    !KEY_ID_PATTERN.test(
      keyId
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_KEY_ID_INVALID"
    );
  }

  assertIsoDate(
    asOf,
    "EXECUTION_ADAPTER_TRUST_AS_OF_INVALID"
  );

  const records =
    parseRegistry(
      registryPath
    );

  const trusted =
    trustedRecordForKey(
      records,
      keyId
    );

  if (!trusted) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "NOT_REGISTERED",

      trusted:
        false
    };
  }

  if (
    trusted.adapter_id !==
      adapterId
  ) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "SIGNER_MISMATCH",

      trusted:
        false
    };
  }

  if (
    Date.parse(
      trusted.recorded_at
    ) >
    Date.parse(
      asOf
    )
  ) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "NOT_OBSERVED",

      trusted:
        false
    };
  }

  if (
    Date.parse(
      asOf
    ) <
    Date.parse(
      trusted.event.valid_from
    )
  ) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "NOT_YET_VALID",

      trusted:
        false
    };
  }

  const revocation =
    revokedRecordForKey(
      records,
      keyId
    );

  const revocationEffectiveAndObserved =
    revocation !==
      null &&
    Date.parse(
      revocation.event.revoked_at
    ) <=
      Date.parse(asOf) &&
    Date.parse(
      revocation.recorded_at
    ) <=
      Date.parse(asOf);

  if (
    revocationEffectiveAndObserved
  ) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "REVOKED",

      trusted:
        false,

      public_key_sha256:
        trusted.public_key_sha256,

      trust_record_sha256:
        trusted.record_sha256,

      revocation_record_sha256:
        revocation.record_sha256,

      revoked_at:
        revocation.event.revoked_at,

      revocation_recorded_at:
        revocation.recorded_at
    };
  }

  if (
    trusted.event.valid_until !==
      null &&
    Date.parse(
      asOf
    ) >=
    Date.parse(
      trusted.event.valid_until
    )
  ) {
    return {
      adapter_id:
        adapterId,

      key_id:
        keyId,

      as_of:
        asOf,

      status:
        "EXPIRED",

      trusted:
        false,

      public_key_sha256:
        trusted.public_key_sha256,

      trust_record_sha256:
        trusted.record_sha256
    };
  }

  return {
    adapter_id:
      adapterId,

    key_id:
      keyId,

    as_of:
      asOf,

    status:
      "TRUSTED",

    trusted:
      true,

    scope:
      SCOPE,

    algorithm:
      trusted.event.algorithm,

    public_key_spki_der_base64:
      trusted.event
        .public_key_spki_der_base64,

    public_key_sha256:
      trusted.public_key_sha256,

    valid_from:
      trusted.event.valid_from,

    valid_until:
      trusted.event.valid_until,

    trust_recorded_at:
      trusted.recorded_at,

    trust_record_sha256:
      trusted.record_sha256,

    trusted_external_time:
      false,

    trusted_public_key_binding:
      true,

    key_control_proven:
      false,

    adapter_identity_cryptographically_authenticated:
      false,

    capability_authorized:
      false,

    target_authorization_proven:
      false,

    adapter_code_integrity_proven:
      false,

    runtime_integrity_proven:
      false,

    legal_identity_proven:
      false,

    legal_authority_created:
      false
  };
}


export function assertExecutionAdapterTrusted({
  registryPath,
  adapterId,
  keyId,
  asOf,
  expectedPublicKeySha256
}) {
  if (
    expectedPublicKeySha256 !==
      undefined
  ) {
    assertSha256(
      expectedPublicKeySha256,
      "EXECUTION_ADAPTER_EXPECTED_PUBLIC_KEY_SHA256_INVALID"
    );
  }

  const state =
    resolveExecutionAdapterTrust({
      registryPath,
      adapterId,
      keyId,
      asOf
    });

  if (
    state.status !==
      "TRUSTED"
  ) {
    const reasonCodes = {
      NOT_REGISTERED:
        "EXECUTION_ADAPTER_KEY_NOT_REGISTERED",

      SIGNER_MISMATCH:
        "EXECUTION_ADAPTER_KEY_SIGNER_MISMATCH",

      NOT_OBSERVED:
        "EXECUTION_ADAPTER_KEY_NOT_OBSERVED",

      NOT_YET_VALID:
        "EXECUTION_ADAPTER_KEY_NOT_YET_VALID",

      EXPIRED:
        "EXECUTION_ADAPTER_KEY_EXPIRED",

      REVOKED:
        "EXECUTION_ADAPTER_KEY_REVOKED"
    };

    fail(
      reasonCodes[
        state.status
      ] ||
      "EXECUTION_ADAPTER_NOT_TRUSTED"
    );
  }

  if (
    expectedPublicKeySha256 !==
      undefined &&
    state.public_key_sha256 !==
      expectedPublicKeySha256
  ) {
    fail(
      "EXECUTION_ADAPTER_TRUST_FINGERPRINT_MISMATCH"
    );
  }

  return clone(
    state
  );
}
