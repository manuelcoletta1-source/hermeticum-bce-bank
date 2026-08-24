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


const CONSUMPTION_ID_PATTERN =
  /^CONSUMPTION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const AUTHORIZATION_ID_PATTERN =
  /^AUTHORIZATION-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const EVT_ID_PATTERN =
  /^EVT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const ALLOWED_RECORD_KEYS =
  new Set([
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
    "record_sha256"
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
  return createHash("sha256")
    .update(
      canonicalize(value),
      "utf8"
    )
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


function assertAuthorizationForConsumption(
  authorization
) {
  assertObject(
    authorization,
    "CONSUMPTION_AUTHORIZATION_INVALID"
  );

  if (
    typeof authorization.authorization_id !==
      "string" ||
    !AUTHORIZATION_ID_PATTERN.test(
      authorization.authorization_id
    )
  ) {
    fail(
      "CONSUMPTION_AUTHORIZATION_ID_INVALID"
    );
  }

  if (
    authorization.status !==
    "ISSUED"
  ) {
    fail(
      "CONSUMPTION_AUTHORIZATION_NOT_ISSUED"
    );
  }

  assertObject(
    authorization.usage,
    "CONSUMPTION_AUTHORIZATION_USAGE_INVALID"
  );

  if (
    authorization.usage.mode !==
      "SINGLE_USE" ||
    authorization.usage.max_uses !==
      1
  ) {
    fail(
      "CONSUMPTION_AUTHORIZATION_NOT_SINGLE_USE"
    );
  }

  if (
    authorization.usage
      .consumption_reference !==
    undefined
  ) {
    fail(
      "AUTHORIZATION_ALREADY_CONSUMED"
    );
  }

  assertIsoDate(
    authorization.issued_at,
    "CONSUMPTION_AUTHORIZATION_ISSUED_AT_INVALID"
  );
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
      "CONSUMPTION_REGISTRY_UNAVAILABLE"
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

  const seenConsumptionIds =
    new Set();

  const seenAuthorizationIds =
    new Set();

  let expectedPreviousRecordHash =
    null;

  let previousConsumedAtMs =
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
        `CONSUMPTION_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      fail(
        `CONSUMPTION_REGISTRY_CORRUPT_RECORD:${index + 1}`
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
          `CONSUMPTION_REGISTRY_UNKNOWN_FIELD:${index + 1}:${key}`
        );
      }
    }

    if (
      (
        record.registry_version !==
          "1.0" &&
        record.registry_version !==
          "1.1"
      ) ||
      record.record_type !==
        "AUTHORIZATION_CONSUMED"
    ) {
      fail(
        `CONSUMPTION_REGISTRY_RECORD_TYPE_INVALID:${index + 1}`
      );
    }

    const isV11 =
      record.registry_version ===
        "1.1";

    const expectedFieldCount =
      isV11
        ? ALLOWED_RECORD_KEYS.size
        : ALLOWED_RECORD_KEYS.size - 1;

    if (
      Object.keys(record).length !==
      expectedFieldCount
    ) {
      fail(
        `CONSUMPTION_REGISTRY_FIELD_SET_INVALID:${index + 1}`
      );
    }

    const hasAdmissionBinding =
      Object.prototype.hasOwnProperty.call(
        record,
        "presented_runtime_binding_sha256"
      );

    if (
      !isV11 &&
      hasAdmissionBinding
    ) {
      fail(
        `CONSUMPTION_REGISTRY_V1_0_ADMISSION_FIELD_FORBIDDEN:${index + 1}`
      );
    }

    if (
      isV11 &&
      !hasAdmissionBinding
    ) {
      fail(
        `CONSUMPTION_REGISTRY_V1_1_ADMISSION_FIELD_REQUIRED:${index + 1}`
      );
    }

    if (
      typeof record.consumption_id !==
        "string" ||
      !CONSUMPTION_ID_PATTERN.test(
        record.consumption_id
      )
    ) {
      fail(
        `CONSUMPTION_REGISTRY_CONSUMPTION_ID_INVALID:${index + 1}`
      );
    }

    if (
      typeof record.authorization_id !==
        "string" ||
      !AUTHORIZATION_ID_PATTERN.test(
        record.authorization_id
      )
    ) {
      fail(
        `CONSUMPTION_REGISTRY_AUTHORIZATION_ID_INVALID:${index + 1}`
      );
    }

    if (
      typeof record.evaluation_evt_id !==
        "string" ||
      !EVT_ID_PATTERN.test(
        record.evaluation_evt_id
      )
    ) {
      fail(
        `CONSUMPTION_REGISTRY_EVT_ID_INVALID:${index + 1}`
      );
    }

    assertSha256(
      record.authorization_sha256,
      `CONSUMPTION_REGISTRY_AUTHORIZATION_SHA256_INVALID:${index + 1}`
    );

    assertSha256(
      record.evaluation_evt_sha256,
      `CONSUMPTION_REGISTRY_EVT_SHA256_INVALID:${index + 1}`
    );

    if (isV11) {
      assertSha256(
        record.presented_runtime_binding_sha256,
        `CONSUMPTION_REGISTRY_PRESENTED_RUNTIME_SHA256_INVALID:${index + 1}`
      );
    }

    assertIsoDate(
      record.consumed_at,
      `CONSUMPTION_REGISTRY_CONSUMED_AT_INVALID:${index + 1}`
    );

    assertString(
      record.consumed_by,
      `CONSUMPTION_REGISTRY_CONSUMED_BY_INVALID:${index + 1}`
    );

    if (
      record.previous_record_sha256 !==
      null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `CONSUMPTION_REGISTRY_PREVIOUS_SHA256_INVALID:${index + 1}`
      );
    }

    assertSha256(
      record.record_sha256,
      `CONSUMPTION_REGISTRY_RECORD_SHA256_INVALID:${index + 1}`
    );

    if (
      record.previous_record_sha256 !==
      expectedPreviousRecordHash
    ) {
      fail(
        `CONSUMPTION_REGISTRY_CHAIN_MISMATCH:${index + 1}`
      );
    }

    const consumedAtMs =
      Date.parse(
        record.consumed_at
      );

    if (
      previousConsumedAtMs !== null &&
      consumedAtMs <
        previousConsumedAtMs
    ) {
      fail(
        `CONSUMPTION_REGISTRY_TIME_ORDER_MISMATCH:${index + 1}`
      );
    }

    const recordHashBasis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

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

      ...(isV11
        ? {
            presented_runtime_binding_sha256:
              record.presented_runtime_binding_sha256
          }
        : {}),

      consumed_at:
        record.consumed_at,

      consumed_by:
        record.consumed_by,

      previous_record_sha256:
        record.previous_record_sha256
    };

    const calculatedRecordHash =
      sha256Canonical(
        recordHashBasis
      );

    if (
      calculatedRecordHash !==
      record.record_sha256
    ) {
      fail(
        `CONSUMPTION_REGISTRY_RECORD_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenConsumptionIds.has(
        record.consumption_id
      )
    ) {
      fail(
        "CONSUMPTION_REGISTRY_DUPLICATE_CONSUMPTION_ID"
      );
    }

    if (
      seenAuthorizationIds.has(
        record.authorization_id
      )
    ) {
      fail(
        "CONSUMPTION_REGISTRY_DUPLICATE_AUTHORIZATION_ID"
      );
    }

    seenConsumptionIds.add(
      record.consumption_id
    );

    seenAuthorizationIds.add(
      record.authorization_id
    );

    records.push(
      record
    );

    expectedPreviousRecordHash =
      record.record_sha256;

    previousConsumedAtMs =
      consumedAtMs;
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
      "CONSUMPTION_REGISTRY_LOCKED"
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


export function consumeAuthorization({
  registryPath,

  consumptionId,

  authorization,

  evaluationEvtId,
  evaluationEvtSha256,

  presentedRuntimeBindingSha256,

  consumedAt,
  consumedBy
}) {
  assertString(
    registryPath,
    "CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  if (
    typeof consumptionId !==
      "string" ||
    !CONSUMPTION_ID_PATTERN.test(
      consumptionId
    )
  ) {
    fail(
      "CONSUMPTION_ID_INVALID"
    );
  }

  assertAuthorizationForConsumption(
    authorization
  );

  if (
    typeof evaluationEvtId !==
      "string" ||
    !EVT_ID_PATTERN.test(
      evaluationEvtId
    )
  ) {
    fail(
      "CONSUMPTION_EVT_ID_INVALID"
    );
  }

  assertSha256(
    evaluationEvtSha256,
    "CONSUMPTION_EVT_SHA256_INVALID"
  );

  assertSha256(
    presentedRuntimeBindingSha256,
    "CONSUMPTION_PRESENTED_RUNTIME_BINDING_SHA256_INVALID"
  );

  assertIsoDate(
    consumedAt,
    "CONSUMPTION_TIME_INVALID"
  );

  assertString(
    consumedBy,
    "CONSUMPTION_ACTOR_INVALID"
  );

  if (
    Date.parse(
      consumedAt
    ) <
    Date.parse(
      authorization.issued_at
    )
  ) {
    fail(
      "CONSUMPTION_BEFORE_AUTHORIZATION_ISSUED"
    );
  }

  const immutableAuthorization =
    clone(
      authorization
    );

  const authorizationSha256 =
    sha256Canonical(
      immutableAuthorization
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

    const existingAuthorization =
      records.find(
        (record) =>
          record.authorization_id ===
          immutableAuthorization
            .authorization_id
      );

    if (
      existingAuthorization
    ) {
      if (
        existingAuthorization
          .authorization_sha256 !==
        authorizationSha256
      ) {
        fail(
          "CONSUMPTION_AUTHORIZATION_HASH_MISMATCH"
        );
      }

      fail(
        "AUTHORIZATION_ALREADY_CONSUMED"
      );
    }

    if (
      records.some(
        (record) =>
          record.consumption_id ===
          consumptionId
      )
    ) {
      fail(
        "CONSUMPTION_ALREADY_REGISTERED"
      );
    }

    if (
      records.length > 0 &&
      Date.parse(
        consumedAt
      ) <
      Date.parse(
        records[
          records.length - 1
        ].consumed_at
      )
    ) {
      fail(
        "CONSUMPTION_TIME_ORDER_INVALID"
      );
    }

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
        "AUTHORIZATION_CONSUMED",

      consumption_id:
        consumptionId,

      authorization_id:
        immutableAuthorization
          .authorization_id,

      authorization_sha256:
        authorizationSha256,

      evaluation_evt_id:
        evaluationEvtId,

      evaluation_evt_sha256:
        evaluationEvtSha256,

      presented_runtime_binding_sha256:
        presentedRuntimeBindingSha256,

      consumed_at:
        consumedAt,

      consumed_by:
        consumedBy,

      previous_record_sha256:
        previousRecordHash
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


export function getAuthorizationConsumption({
  registryPath,
  authorizationId
}) {
  if (
    typeof authorizationId !==
      "string" ||
    !AUTHORIZATION_ID_PATTERN.test(
      authorizationId
    )
  ) {
    fail(
      "CONSUMPTION_AUTHORIZATION_ID_INVALID"
    );
  }

  const records =
    parseRegistry(
      registryPath
    );

  const record =
    records.find(
      (item) =>
        item.authorization_id ===
        authorizationId
    );

  return record
    ? clone(record)
    : null;
}


export function listAuthorizationConsumptions({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifyAuthorizationConsumptionRegistry({
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


export function assertAuthorizationNotConsumed({
  registryPath,
  authorization
}) {
  assertAuthorizationForConsumption(
    authorization
  );

  const authorizationSha256 =
    sha256Canonical(
      authorization
    );

  const record =
    getAuthorizationConsumption({
      registryPath,

      authorizationId:
        authorization.authorization_id
    });

  if (!record) {
    return {
      valid:
        true,

      consumed:
        false,

      authorization_id:
        authorization.authorization_id,

      authorization_sha256:
        authorizationSha256
    };
  }

  if (
    record.authorization_sha256 !==
    authorizationSha256
  ) {
    fail(
      "CONSUMPTION_AUTHORIZATION_HASH_MISMATCH"
    );
  }

  fail(
    "AUTHORIZATION_ALREADY_CONSUMED"
  );
}
