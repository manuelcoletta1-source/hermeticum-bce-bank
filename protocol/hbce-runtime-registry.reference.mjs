import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import { createHash } from "node:crypto";

const RUNTIME_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;

const RUNTIME_TYPES = new Set([
  "AI_AGENT",
  "AI_MODEL",
  "DETERMINISTIC_SOFTWARE",
  "MACHINE",
  "HUMAN_OPERATED_SOFTWARE",
  "EXTERNAL_SERVICE"
]);

const RUNTIME_STATUSES = new Set([
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
  "RETIRED"
]);

function fail(message) {
  throw new Error(message);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const keys = Object.keys(value).sort();

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
  errorCode,
  maxLength = 256
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    fail(errorCode);
  }
}

function assertRuntime(runtime) {
  if (
    runtime === null ||
    typeof runtime !== "object" ||
    Array.isArray(runtime)
  ) {
    fail("RUNTIME_INVALID_OBJECT");
  }

  if (
    runtime.schema_version !== "1.0"
  ) {
    fail(
      "RUNTIME_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof runtime.runtime_id !== "string" ||
    !RUNTIME_ID_PATTERN.test(
      runtime.runtime_id
    )
  ) {
    fail("RUNTIME_ID_INVALID");
  }

  if (
    !RUNTIME_TYPES.has(
      runtime.runtime_type
    )
  ) {
    fail("RUNTIME_TYPE_INVALID");
  }

  if (
    !RUNTIME_STATUSES.has(
      runtime.status
    )
  ) {
    fail("RUNTIME_STATUS_INVALID");
  }

  assertString(
    runtime.provider,
    "RUNTIME_PROVIDER_INVALID",
    128
  );

  assertString(
    runtime.runtime_version,
    "RUNTIME_VERSION_INVALID",
    128
  );

  if (
    typeof runtime.runtime_digest_sha256 !==
      "string" ||
    !SHA256_PATTERN.test(
      runtime.runtime_digest_sha256
    )
  ) {
    fail("RUNTIME_DIGEST_INVALID");
  }

  if (
    runtime.ipr_reference !== undefined
  ) {
    assertString(
      runtime.ipr_reference,
      "RUNTIME_IPR_REFERENCE_INVALID"
    );
  }

  if (
    runtime.capabilities !== undefined
  ) {
    if (
      !Array.isArray(runtime.capabilities)
    ) {
      fail(
        "RUNTIME_CAPABILITIES_INVALID"
      );
    }

    for (
      const capability of
      runtime.capabilities
    ) {
      assertString(
        capability,
        "RUNTIME_CAPABILITY_INVALID",
        128
      );
    }

    if (
      new Set(runtime.capabilities).size !==
      runtime.capabilities.length
    ) {
      fail(
        "RUNTIME_CAPABILITY_DUPLICATE"
      );
    }
  }

  if (
    runtime.metadata !== undefined
  ) {
    if (
      runtime.metadata === null ||
      typeof runtime.metadata !== "object" ||
      Array.isArray(runtime.metadata)
    ) {
      fail(
        "RUNTIME_METADATA_INVALID"
      );
    }
  }
}

function parseRegistry(registryPath) {
  if (!existsSync(registryPath)) {
    return [];
  }

  const raw =
    readFileSync(
      registryPath,
      "utf8"
    );

  if (raw.trim() === "") {
    return [];
  }

  const lines =
    raw
      .split("\n")
      .filter(Boolean);

  const records = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    let record;

    try {
      record =
        JSON.parse(lines[index]);
    } catch {
      fail(
        `RUNTIME_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    if (
      record === null ||
      typeof record !== "object" ||
      typeof record.runtime_id !==
        "string" ||
      typeof record.runtime_sha256 !==
        "string" ||
      record.runtime === null ||
      typeof record.runtime !== "object"
    ) {
      fail(
        `RUNTIME_REGISTRY_CORRUPT_RECORD:${index + 1}`
      );
    }

    assertRuntime(record.runtime);

    const calculated =
      sha256(
        canonicalize(
          record.runtime
        )
      );

    if (
      calculated !==
      record.runtime_sha256
    ) {
      fail(
        `RUNTIME_REGISTRY_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      record.runtime_id !==
      record.runtime.runtime_id
    ) {
      fail(
        `RUNTIME_REGISTRY_ID_MISMATCH:${index + 1}`
      );
    }

    records.push(record);
  }

  return records;
}

function acquireLock(registryPath) {
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
      "RUNTIME_REGISTRY_LOCKED"
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

export function registerRuntime({
  registryPath,
  runtime,
  recordedAt,
  recordedBy
}) {
  assertString(
    registryPath,
    "RUNTIME_REGISTRY_PATH_REQUIRED"
  );

  assertRuntime(runtime);

  if (
    typeof recordedAt !== "string" ||
    Number.isNaN(
      Date.parse(recordedAt)
    )
  ) {
    fail(
      "RUNTIME_RECORDED_AT_INVALID"
    );
  }

  assertString(
    recordedBy,
    "RUNTIME_RECORDED_BY_INVALID"
  );

  const immutableRuntime =
    deepClone(runtime);

  const lock =
    acquireLock(registryPath);

  try {
    const records =
      parseRegistry(
        registryPath
      );

    if (
      records.some(
        (record) =>
          record.runtime_id ===
          immutableRuntime.runtime_id
      )
    ) {
      fail(
        "RUNTIME_ALREADY_REGISTERED"
      );
    }

    const runtimeHash =
      sha256(
        canonicalize(
          immutableRuntime
        )
      );

    const record = {
      registry_version: "1.0",

      record_type:
        "RUNTIME_REGISTERED",

      runtime_id:
        immutableRuntime.runtime_id,

      recorded_at:
        recordedAt,

      recorded_by:
        recordedBy,

      runtime_sha256:
        runtimeHash,

      runtime:
        immutableRuntime
    };

    appendFileSync(
      registryPath,
      `${JSON.stringify(record)}\n`,
      {
        encoding: "utf8",
        flag: "a"
      }
    );

    return deepClone(record);
  } finally {
    releaseLock(lock);
  }
}

export function getRuntime({
  registryPath,
  runtimeId
}) {
  if (
    typeof runtimeId !== "string" ||
    !RUNTIME_ID_PATTERN.test(
      runtimeId
    )
  ) {
    fail("RUNTIME_ID_INVALID");
  }

  const records =
    parseRegistry(
      registryPath
    );

  const record =
    records.find(
      (item) =>
        item.runtime_id ===
        runtimeId
    );

  return record
    ? deepClone(record)
    : null;
}

export function listRuntimes({
  registryPath
}) {
  return deepClone(
    parseRegistry(
      registryPath
    )
  );
}

export function verifyRuntimeRegistry({
  registryPath
}) {
  const records =
    parseRegistry(
      registryPath
    );

  const seen =
    new Set();

  for (
    const record of records
  ) {
    if (
      seen.has(
        record.runtime_id
      )
    ) {
      fail(
        "RUNTIME_REGISTRY_DUPLICATE_ID"
      );
    }

    seen.add(
      record.runtime_id
    );
  }

  return {
    valid: true,
    record_count:
      records.length
  };
}

export function assertRuntimeBinding({
  registryPath,
  binding
}) {
  if (
    binding === null ||
    typeof binding !== "object" ||
    Array.isArray(binding)
  ) {
    fail(
      "RUNTIME_BINDING_INVALID"
    );
  }

  const record =
    getRuntime({
      registryPath,
      runtimeId:
        binding.runtime_id
    });

  if (!record) {
    fail(
      "RUNTIME_NOT_REGISTERED"
    );
  }

  const runtime =
    record.runtime;

  if (
    runtime.status !== "ACTIVE"
  ) {
    fail(
      "RUNTIME_NOT_ACTIVE"
    );
  }

  if (
    binding.runtime_type !==
    undefined &&
    binding.runtime_type !==
    runtime.runtime_type
  ) {
    fail(
      "RUNTIME_TYPE_MISMATCH"
    );
  }

  if (
    binding.runtime_version !==
    undefined &&
    binding.runtime_version !==
    runtime.runtime_version
  ) {
    fail(
      "RUNTIME_VERSION_MISMATCH"
    );
  }

  if (
    binding.runtime_digest_sha256 !==
    undefined &&
    binding.runtime_digest_sha256 !==
    runtime.runtime_digest_sha256
  ) {
    fail(
      "RUNTIME_DIGEST_MISMATCH"
    );
  }

  return {
    valid: true,
    runtime_id:
      runtime.runtime_id,
    runtime_sha256:
      record.runtime_sha256
  };
}
