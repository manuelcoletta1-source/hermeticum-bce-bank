import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import { createHash } from "node:crypto";

const REVOCATION_ID_PATTERN =
  /^REVOCATION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const TARGET_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const TARGET_TYPES = new Set([
  "MANDATE",
  "AUTHORITY",
  "AUTHORIZATION",
  "RUNTIME"
]);

const REASON_CODES = new Set([
  "KEY_COMPROMISE",
  "POLICY_VIOLATION",
  "MANDATE_WITHDRAWN",
  "AUTHORITY_WITHDRAWN",
  "RUNTIME_COMPROMISE",
  "SECURITY_INCIDENT",
  "OPERATOR_ACTION",
  "OTHER"
]);

const ALLOWED_RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "recorded_at",
    "previous_record_sha256",
    "revocation_id",
    "target_type",
    "target_id",
    "target_sha256",
    "revoked_at",
    "revocation_sha256",
    "record_sha256",
    "revocation"
  ]);

const ALLOWED_REVOCATION_KEYS =
  new Set([
    "schema_version",
    "revocation_id",
    "target_type",
    "target_id",
    "target_sha256",
    "revoked_at",
    "revoked_by",
    "reason_code",
    "reason",
    "evidence_references"
  ]);

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

function sha256(value) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function deepClone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
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
    Number.isNaN(Date.parse(value))
  ) {
    fail(code);
  }
}

function assertRevocation(
  revocation
) {
  if (
    revocation === null ||
    typeof revocation !== "object" ||
    Array.isArray(revocation)
  ) {
    fail(
      "REVOCATION_INVALID_OBJECT"
    );
  }

  for (
    const key of
    Object.keys(revocation)
  ) {
    if (
      !ALLOWED_REVOCATION_KEYS.has(
        key
      )
    ) {
      fail(
        `REVOCATION_UNKNOWN_PROPERTY:${key}`
      );
    }
  }

  if (
    revocation.schema_version !==
    "1.0"
  ) {
    fail(
      "REVOCATION_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof revocation.revocation_id !==
      "string" ||
    !REVOCATION_ID_PATTERN.test(
      revocation.revocation_id
    )
  ) {
    fail(
      "REVOCATION_ID_INVALID"
    );
  }

  if (
    !TARGET_TYPES.has(
      revocation.target_type
    )
  ) {
    fail(
      "REVOCATION_TARGET_TYPE_INVALID"
    );
  }

  if (
    typeof revocation.target_id !==
      "string" ||
    !TARGET_ID_PATTERN.test(
      revocation.target_id
    )
  ) {
    fail(
      "REVOCATION_TARGET_ID_INVALID"
    );
  }

  if (
    typeof revocation.target_sha256 !==
      "string" ||
    !SHA256_PATTERN.test(
      revocation.target_sha256
    )
  ) {
    fail(
      "REVOCATION_TARGET_SHA256_INVALID"
    );
  }

  assertIsoDate(
    revocation.revoked_at,
    "REVOCATION_REVOKED_AT_INVALID"
  );

  assertString(
    revocation.revoked_by,
    "REVOCATION_REVOKED_BY_INVALID"
  );

  if (
    !REASON_CODES.has(
      revocation.reason_code
    )
  ) {
    fail(
      "REVOCATION_REASON_CODE_INVALID"
    );
  }

  if (
    revocation.reason !== undefined
  ) {
    assertString(
      revocation.reason,
      "REVOCATION_REASON_INVALID",
      1024
    );
  }

  if (
    revocation.evidence_references !==
      undefined
  ) {
    if (
      !Array.isArray(
        revocation.evidence_references
      )
    ) {
      fail(
        "REVOCATION_EVIDENCE_INVALID"
      );
    }

    for (
      const reference of
      revocation.evidence_references
    ) {
      assertString(
        reference,
        "REVOCATION_EVIDENCE_REFERENCE_INVALID"
      );
    }

    if (
      new Set(
        revocation.evidence_references
      ).size !==
      revocation.evidence_references.length
    ) {
      fail(
        "REVOCATION_EVIDENCE_DUPLICATE"
      );
    }
  }
}

function parseRegistry(
  registryPath,
  {
    allowMissing = false
  } = {}
) {
  if (
    !existsSync(registryPath)
  ) {
    if (allowMissing) {
      return [];
    }

    fail(
      "REVOCATION_REGISTRY_UNAVAILABLE"
    );
  }

  const raw =
    readFileSync(
      registryPath,
      "utf8"
    );

  if (
    raw.trim() === ""
  ) {
    return [];
  }

  const lines =
    raw
      .split("\n")
      .filter(Boolean);

  const records = [];
  const seenRevocationIds =
    new Set();

  const seenTargets =
    new Set();

  let expectedPreviousRecordHash =
    null;

  let previousRecordedAtMs =
    null;

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    let record;

    try {
      record =
        JSON.parse(
          lines[index]
        );
    } catch {
      fail(
        `REVOCATION_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      fail(
        `REVOCATION_REGISTRY_CORRUPT_RECORD:${index + 1}`
      );
    }

    for (
      const key of
      Object.keys(record)
    ) {
      if (
        !ALLOWED_RECORD_KEYS.has(
          key
        )
      ) {
        fail(
          `REVOCATION_REGISTRY_UNKNOWN_FIELD:${index + 1}:${key}`
        );
      }
    }

    if (
      record.registry_version !==
        "1.1" ||
      record.record_type !==
        "TARGET_REVOKED" ||
      typeof record.revocation_sha256 !==
        "string" ||
      typeof record.record_sha256 !==
        "string" ||
      record.revocation === null ||
      typeof record.revocation !==
        "object"
    ) {
      fail(
        `REVOCATION_REGISTRY_CORRUPT_RECORD:${index + 1}`
      );
    }

    if (
      record.previous_record_sha256 !==
      expectedPreviousRecordHash
    ) {
      fail(
        `REVOCATION_REGISTRY_CHAIN_MISMATCH:${index + 1}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `REVOCATION_REGISTRY_RECORDED_AT_INVALID:${index + 1}`
    );

    const recordedAtMs =
      Date.parse(
        record.recorded_at
      );

    if (
      previousRecordedAtMs !== null &&
      recordedAtMs <
        previousRecordedAtMs
    ) {
      fail(
        `REVOCATION_REGISTRY_TIME_ORDER_MISMATCH:${index + 1}`
      );
    }

    assertRevocation(
      record.revocation
    );

    const calculatedHash =
      sha256(
        canonicalize(
          record.revocation
        )
      );

    if (
      calculatedHash !==
      record.revocation_sha256
    ) {
      fail(
        `REVOCATION_REGISTRY_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      record.revocation_id !==
      record.revocation.revocation_id
    ) {
      fail(
        `REVOCATION_REGISTRY_ID_MISMATCH:${index + 1}`
      );
    }

    if (
      record.target_type !==
        record.revocation.target_type ||
      record.target_id !==
        record.revocation.target_id ||
      record.target_sha256 !==
        record.revocation.target_sha256
    ) {
      fail(
        `REVOCATION_REGISTRY_TARGET_MISMATCH:${index + 1}`
      );
    }

    if (
      record.revoked_at !==
      record.revocation.revoked_at
    ) {
      fail(
        `REVOCATION_REGISTRY_TIME_MISMATCH:${index + 1}`
      );
    }

    if (
      Date.parse(
        record.recorded_at
      ) <
      Date.parse(
        record.revoked_at
      )
    ) {
      fail(
        `REVOCATION_REGISTRY_BACKDATED_RECORD:${index + 1}`
      );
    }

    const recordHashBasis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      recorded_at:
        record.recorded_at,

      previous_record_sha256:
        record.previous_record_sha256,

      revocation_id:
        record.revocation_id,

      target_type:
        record.target_type,

      target_id:
        record.target_id,

      target_sha256:
        record.target_sha256,

      revoked_at:
        record.revoked_at,

      revocation_sha256:
        record.revocation_sha256,

      revocation:
        record.revocation
    };

    const calculatedRecordHash =
      sha256(
        canonicalize(
          recordHashBasis
        )
      );

    if (
      calculatedRecordHash !==
      record.record_sha256
    ) {
      fail(
        `REVOCATION_REGISTRY_RECORD_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenRevocationIds.has(
        record.revocation_id
      )
    ) {
      fail(
        "REVOCATION_REGISTRY_DUPLICATE_REVOCATION_ID"
      );
    }

    seenRevocationIds.add(
      record.revocation_id
    );

    const targetKey =
      `${record.target_type}:${record.target_id}`;

    if (
      seenTargets.has(
        targetKey
      )
    ) {
      fail(
        "REVOCATION_REGISTRY_DUPLICATE_TARGET"
      );
    }

    seenTargets.add(
      targetKey
    );

    records.push(record);

    expectedPreviousRecordHash =
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
    fd = openSync(
      lockPath,
      "wx"
    );
  } catch {
    fail(
      "REVOCATION_REGISTRY_LOCKED"
    );
  }

  return {
    fd,
    lockPath
  };
}

function releaseLock(lock) {
  try {
    closeSync(lock.fd);
  } finally {
    if (
      existsSync(lock.lockPath)
    ) {
      unlinkSync(
        lock.lockPath
      );
    }
  }
}

function targetKey({
  targetType,
  targetId
}) {
  if (
    !TARGET_TYPES.has(
      targetType
    )
  ) {
    fail(
      "REVOCATION_TARGET_TYPE_INVALID"
    );
  }

  if (
    typeof targetId !== "string" ||
    !TARGET_ID_PATTERN.test(
      targetId
    )
  ) {
    fail(
      "REVOCATION_TARGET_ID_INVALID"
    );
  }

  return `${targetType}:${targetId}`;
}

export function registerRevocation({
  registryPath,
  revocation,
  recordedAt
}) {
  assertString(
    registryPath,
    "REVOCATION_REGISTRY_PATH_REQUIRED"
  );

  assertRevocation(
    revocation
  );

  assertIsoDate(
    recordedAt,
    "REVOCATION_RECORDED_AT_INVALID"
  );

  if (
    Date.parse(
      recordedAt
    ) <
    Date.parse(
      revocation.revoked_at
    )
  ) {
    fail(
      "REVOCATION_RECORDED_BEFORE_EFFECTIVE_TIME"
    );
  }

  const immutableRevocation =
    deepClone(
      revocation
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
          allowMissing: true
        }
      );

    if (
      records.some(
        (record) =>
          record.revocation_id ===
          immutableRevocation.revocation_id
      )
    ) {
      fail(
        "REVOCATION_ALREADY_REGISTERED"
      );
    }

    const key =
      targetKey({
        targetType:
          immutableRevocation.target_type,
        targetId:
          immutableRevocation.target_id
      });

    if (
      records.some(
        (record) =>
          `${record.target_type}:${record.target_id}` ===
          key
      )
    ) {
      fail(
        "TARGET_ALREADY_REVOKED"
      );
    }

    const revocationHash =
      sha256(
        canonicalize(
          immutableRevocation
        )
      );

    const previousRecordHash =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

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
        "REVOCATION_RECORDED_AT_ORDER_INVALID"
      );
    }

    const recordHashBasis = {
      registry_version:
        "1.1",

      record_type:
        "TARGET_REVOKED",

      recorded_at:
        recordedAt,

      previous_record_sha256:
        previousRecordHash,

      revocation_id:
        immutableRevocation.revocation_id,

      target_type:
        immutableRevocation.target_type,

      target_id:
        immutableRevocation.target_id,

      target_sha256:
        immutableRevocation.target_sha256,

      revoked_at:
        immutableRevocation.revoked_at,

      revocation_sha256:
        revocationHash,

      revocation:
        immutableRevocation
    };

    const recordHash =
      sha256(
        canonicalize(
          recordHashBasis
        )
      );

    const record = {
      ...recordHashBasis,

      record_sha256:
        recordHash
    };

    appendFileSync(
      registryPath,
      `${JSON.stringify(record)}\n`,
      {
        encoding: "utf8",
        flag: "a"
      }
    );

    return deepClone(
      record
    );
  } finally {
    releaseLock(lock);
  }
}

export function getRevocation({
  registryPath,
  targetType,
  targetId
}) {
  const key =
    targetKey({
      targetType,
      targetId
    });

  const records =
    parseRegistry(
      registryPath
    );

  const record =
    records.find(
      (item) =>
        `${item.target_type}:${item.target_id}` ===
        key
    );

  return record
    ? deepClone(record)
    : null;
}

export function listRevocations({
  registryPath
}) {
  return deepClone(
    parseRegistry(
      registryPath
    )
  );
}

export function verifyRevocationRegistry({
  registryPath
}) {
  const records =
    parseRegistry(
      registryPath
    );

  return {
    valid: true,

    record_count:
      records.length,

    head_record_sha256:
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256
  };
}

export function assertNotRevoked({
  registryPath,
  targetType,
  targetId,
  targetSha256
}) {
  if (
    typeof targetSha256 !== "string" ||
    !SHA256_PATTERN.test(
      targetSha256
    )
  ) {
    fail(
      "REVOCATION_TARGET_SHA256_INVALID"
    );
  }

  const record =
    getRevocation({
      registryPath,
      targetType,
      targetId
    });

  if (!record) {
    return {
      valid: true,
      revoked: false,
      target_type:
        targetType,
      target_id:
        targetId
    };
  }

  if (
    record.target_sha256 !==
    targetSha256
  ) {
    fail(
      "REVOCATION_TARGET_HASH_MISMATCH"
    );
  }

  fail(
    "TARGET_REVOKED"
  );
}


export function assertNotRevokedAt({
  registryPath,
  targetType,
  targetId,
  targetSha256,
  at
}) {
  if (
    typeof targetSha256 !== "string" ||
    !SHA256_PATTERN.test(
      targetSha256
    )
  ) {
    fail(
      "REVOCATION_TARGET_SHA256_INVALID"
    );
  }

  assertIsoDate(
    at,
    "REVOCATION_AS_OF_INVALID"
  );

  const record =
    getRevocation({
      registryPath,
      targetType,
      targetId
    });

  if (!record) {
    return {
      valid: true,

      revoked: false,

      target_type:
        targetType,

      target_id:
        targetId,

      as_of:
        at,

      revocation_record_present:
        false,

      revocation_effective_at_as_of:
        false
    };
  }

  if (
    record.target_sha256 !==
    targetSha256
  ) {
    fail(
      "REVOCATION_TARGET_HASH_MISMATCH"
    );
  }

  const asOfMs =
    Date.parse(
      at
    );

  const revokedAtMs =
    Date.parse(
      record.revoked_at
    );

  const recordedAtMs =
    Date.parse(
      record.recorded_at
    );

  const effectiveAtAsOf =
    revokedAtMs <= asOfMs &&
    recordedAtMs <= asOfMs;

  if (
    effectiveAtAsOf
  ) {
    fail(
      "TARGET_REVOKED"
    );
  }

  return {
    valid: true,

    revoked: false,

    target_type:
      targetType,

    target_id:
      targetId,

    as_of:
      at,

    revocation_record_present:
      true,

    revocation_effective_at_as_of:
      false
  };
}
