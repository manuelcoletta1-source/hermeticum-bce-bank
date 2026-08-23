import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import {
  createHash
} from "node:crypto";


const MANDATE_ID_PATTERN =
  /^MANDATE-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const ALLOWED_RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "mandate_id",
    "recorded_at",
    "previous_record_sha256",
    "mandate_sha256",
    "record_sha256",
    "mandate"
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
    .update(
      value,
      "utf8"
    )
    .digest("hex");
}


function deepClone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
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


function assertMandateEnvelope(
  mandate
) {
  if (
    mandate === null ||
    typeof mandate !== "object" ||
    Array.isArray(mandate)
  ) {
    fail(
      "MANDATE_INVALID_OBJECT"
    );
  }

  if (
    mandate.schema_version !==
    "1.0"
  ) {
    fail(
      "MANDATE_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof mandate.mandate_id !==
      "string" ||
    !MANDATE_ID_PATTERN.test(
      mandate.mandate_id
    )
  ) {
    fail(
      "MANDATE_ID_INVALID"
    );
  }

  if (
    typeof mandate.status !==
    "string"
  ) {
    fail(
      "MANDATE_STATUS_MISSING"
    );
  }

  if (
    mandate.grantor === null ||
    typeof mandate.grantor !==
      "object"
  ) {
    fail(
      "MANDATE_GRANTOR_MISSING"
    );
  }

  if (
    mandate.grantee === null ||
    typeof mandate.grantee !==
      "object"
  ) {
    fail(
      "MANDATE_GRANTEE_MISSING"
    );
  }

  if (
    typeof mandate.function !==
      "string" ||
    mandate.function.length === 0
  ) {
    fail(
      "MANDATE_FUNCTION_MISSING"
    );
  }

  if (
    !Array.isArray(
      mandate.allowed_actions
    ) ||
    mandate.allowed_actions.length ===
      0
  ) {
    fail(
      "MANDATE_ALLOWED_ACTIONS_MISSING"
    );
  }

  if (
    mandate.validity === null ||
    typeof mandate.validity !==
      "object"
  ) {
    fail(
      "MANDATE_VALIDITY_MISSING"
    );
  }

  if (
    mandate.runtime_constraints ===
      null ||
    typeof mandate.runtime_constraints !==
      "object"
  ) {
    fail(
      "MANDATE_RUNTIME_CONSTRAINTS_MISSING"
    );
  }

  if (
    mandate.revocation === null ||
    typeof mandate.revocation !==
      "object"
  ) {
    fail(
      "MANDATE_REVOCATION_STATE_MISSING"
    );
  }
}


function parseRegistry(
  registryPath
) {
  if (
    !existsSync(
      registryPath
    )
  ) {
    return [];
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

  const seenIds =
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
        `MANDATE_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      fail(
        `MANDATE_REGISTRY_CORRUPT_RECORD:${index + 1}`
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
          `MANDATE_REGISTRY_UNKNOWN_FIELD:${index + 1}:${key}`
        );
      }
    }

    if (
      record.registry_version !==
        "1.1" ||
      record.record_type !==
        "MANDATE_REGISTERED" ||
      typeof record.mandate_id !==
        "string" ||
      record.mandate === null ||
      typeof record.mandate !==
        "object" ||
      Array.isArray(
        record.mandate
      )
    ) {
      fail(
        `MANDATE_REGISTRY_CORRUPT_RECORD:${index + 1}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `MANDATE_REGISTRY_RECORDED_AT_INVALID:${index + 1}`
    );

    assertSha256(
      record.mandate_sha256,
      `MANDATE_REGISTRY_MANDATE_SHA256_INVALID:${index + 1}`
    );

    assertSha256(
      record.record_sha256,
      `MANDATE_REGISTRY_RECORD_SHA256_INVALID:${index + 1}`
    );

    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `MANDATE_REGISTRY_PREVIOUS_SHA256_INVALID:${index + 1}`
      );
    }

    if (
      record.previous_record_sha256 !==
      expectedPreviousRecordHash
    ) {
      fail(
        `MANDATE_REGISTRY_CHAIN_MISMATCH:${index + 1}`
      );
    }

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
        `MANDATE_REGISTRY_TIME_ORDER_MISMATCH:${index + 1}`
      );
    }

    assertMandateEnvelope(
      record.mandate
    );

    const calculatedMandateHash =
      sha256(
        canonicalize(
          record.mandate
        )
      );

    if (
      calculatedMandateHash !==
      record.mandate_sha256
    ) {
      fail(
        `MANDATE_REGISTRY_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      record.mandate_id !==
      record.mandate.mandate_id
    ) {
      fail(
        `MANDATE_REGISTRY_ID_MISMATCH:${index + 1}`
      );
    }

    const recordHashBasis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      mandate_id:
        record.mandate_id,

      recorded_at:
        record.recorded_at,

      previous_record_sha256:
        record.previous_record_sha256,

      mandate_sha256:
        record.mandate_sha256,

      mandate:
        record.mandate
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
        `MANDATE_REGISTRY_RECORD_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenIds.has(
        record.mandate_id
      )
    ) {
      fail(
        "MANDATE_REGISTRY_DUPLICATE_MANDATE_ID"
      );
    }

    seenIds.add(
      record.mandate_id
    );

    records.push(
      record
    );

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
    fd =
      openSync(
        lockPath,
        "wx"
      );
  } catch {
    fail(
      "REGISTRY_LOCKED"
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


export function registerMandate({
  registryPath,
  mandate,
  recordedAt
}) {
  if (
    typeof registryPath !==
      "string" ||
    registryPath.length === 0
  ) {
    fail(
      "REGISTRY_PATH_REQUIRED"
    );
  }

  assertMandateEnvelope(
    mandate
  );

  assertIsoDate(
    recordedAt,
    "RECORDED_AT_INVALID"
  );

  const immutableMandate =
    deepClone(
      mandate
    );

  const lock =
    acquireLock(
      registryPath
    );

  try {
    const records =
      parseRegistry(
        registryPath
      );

    const duplicate =
      records.some(
        (record) =>
          record.mandate_id ===
          immutableMandate.mandate_id
      );

    if (duplicate) {
      fail(
        "MANDATE_ALREADY_REGISTERED"
      );
    }

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
        "MANDATE_RECORDED_AT_ORDER_INVALID"
      );
    }

    const mandateHash =
      sha256(
        canonicalize(
          immutableMandate
        )
      );

    const previousRecordHash =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

    const recordHashBasis = {
      registry_version:
        "1.1",

      record_type:
        "MANDATE_REGISTERED",

      mandate_id:
        immutableMandate.mandate_id,

      recorded_at:
        recordedAt,

      previous_record_sha256:
        previousRecordHash,

      mandate_sha256:
        mandateHash,

      mandate:
        immutableMandate
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
        encoding:
          "utf8",

        flag:
          "a"
      }
    );

    return deepClone(
      record
    );
  } finally {
    releaseLock(
      lock
    );
  }
}


export function getMandate({
  registryPath,
  mandateId
}) {
  if (
    typeof mandateId !==
      "string" ||
    !MANDATE_ID_PATTERN.test(
      mandateId
    )
  ) {
    fail(
      "MANDATE_ID_INVALID"
    );
  }

  const records =
    parseRegistry(
      registryPath
    );

  const record =
    records.find(
      (item) =>
        item.mandate_id ===
        mandateId
    );

  if (!record) {
    return null;
  }

  return deepClone(
    record
  );
}


export function listMandates({
  registryPath
}) {
  return deepClone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifyMandateRegistry({
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
          ].record_sha256
  };
}
