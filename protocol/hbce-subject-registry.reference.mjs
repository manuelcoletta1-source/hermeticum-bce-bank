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
  createHash
} from "node:crypto";


const SUBJECT_REF_PATTERN =
  /^SUB-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const SUBJECT_CLASSES =
  new Set([
    "HUMAN",
    "ORGANIZATION",
    "AI_AGENT",
    "SERVICE",
    "DEVICE",
    "ROBOT",
    "INFRASTRUCTURE"
  ]);


const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "subject_ref",
    "recorded_at",
    "previous_record_sha256",
    "subject_sha256",
    "record_sha256",
    "subject"
  ]);


const SUBJECT_KEYS =
  new Set([
    "schema_version",
    "subject_ref",
    "subject_class",
    "contextual_id",
    "root_ref_disclosed",
    "registration_state",
    "created_at",
    "evidence_refs"
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
    !/^[a-f0-9]{64}$/.test(value)
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


function assertUniqueStringArray(
  value,
  code
) {
  if (
    !Array.isArray(value)
  ) {
    fail(
      `${code}_INVALID`
    );
  }

  for (
    const item of
    value
  ) {
    assertString(
      item,
      `${code}_ITEM_INVALID`
    );
  }

  if (
    new Set(value).size !==
      value.length
  ) {
    fail(
      `${code}_DUPLICATE`
    );
  }
}


function assertSubject(
  subject
) {
  assertExactKeys(
    subject,
    SUBJECT_KEYS,
    "SUBJECT"
  );

  if (
    subject.schema_version !==
      "1.0"
  ) {
    fail(
      "SUBJECT_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof subject.subject_ref !==
      "string" ||
    !SUBJECT_REF_PATTERN.test(
      subject.subject_ref
    )
  ) {
    fail(
      "SUBJECT_REF_INVALID"
    );
  }

  if (
    !SUBJECT_CLASSES.has(
      subject.subject_class
    )
  ) {
    fail(
      "SUBJECT_CLASS_INVALID"
    );
  }

  assertString(
    subject.contextual_id,
    "SUBJECT_CONTEXTUAL_ID_INVALID"
  );

  if (
    typeof subject.root_ref_disclosed !==
      "boolean"
  ) {
    fail(
      "SUBJECT_ROOT_REF_DISCLOSED_INVALID"
    );
  }

  assertString(
    subject.registration_state,
    "SUBJECT_REGISTRATION_STATE_INVALID",
    64
  );

  assertIsoDate(
    subject.created_at,
    "SUBJECT_CREATED_AT_INVALID"
  );

  assertUniqueStringArray(
    subject.evidence_refs,
    "SUBJECT_EVIDENCE_REFS"
  );
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
      "SUBJECT_REGISTRY_LOCKED"
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


function appendDurable(
  path,
  line
) {
  const fd =
    openSync(
      path,
      "a"
    );

  try {
    writeSync(
      fd,
      line,
      null,
      "utf8"
    );

    fsyncSync(fd);
  } finally {
    closeSync(fd);
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
      "SUBJECT_REGISTRY_UNAVAILABLE"
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

  const seenSubjectRefs =
    new Set();

  let expectedPrevious =
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
        `SUBJECT_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    assertExactKeys(
      record,
      RECORD_KEYS,
      `SUBJECT_REGISTRY_RECORD_${index + 1}`
    );

    if (
      record.registry_version !==
        "1.0" ||
      record.record_type !==
        "SUBJECT_REGISTERED"
    ) {
      fail(
        `SUBJECT_REGISTRY_RECORD_TYPE_INVALID:${index + 1}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `SUBJECT_REGISTRY_RECORDED_AT_INVALID:${index + 1}`
    );

    assertSha256(
      record.subject_sha256,
      `SUBJECT_REGISTRY_SUBJECT_SHA256_INVALID:${index + 1}`
    );

    assertSha256(
      record.record_sha256,
      `SUBJECT_REGISTRY_RECORD_SHA256_INVALID:${index + 1}`
    );

    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `SUBJECT_REGISTRY_PREVIOUS_SHA256_INVALID:${index + 1}`
      );
    }

    if (
      record.previous_record_sha256 !==
        expectedPrevious
    ) {
      fail(
        `SUBJECT_REGISTRY_CHAIN_MISMATCH:${index + 1}`
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
        `SUBJECT_REGISTRY_TIME_ORDER_MISMATCH:${index + 1}`
      );
    }

    assertSubject(
      record.subject
    );

    if (
      record.subject_ref !==
        record.subject
          .subject_ref
    ) {
      fail(
        `SUBJECT_REGISTRY_REF_MISMATCH:${index + 1}`
      );
    }

    const subjectSha =
      sha256Canonical(
        record.subject
      );

    if (
      subjectSha !==
        record.subject_sha256
    ) {
      fail(
        `SUBJECT_REGISTRY_SUBJECT_HASH_MISMATCH:${index + 1}`
      );
    }

    const basis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      subject_ref:
        record.subject_ref,

      recorded_at:
        record.recorded_at,

      previous_record_sha256:
        record.previous_record_sha256,

      subject_sha256:
        record.subject_sha256,

      subject:
        record.subject
    };

    const recordSha =
      sha256Canonical(
        basis
      );

    if (
      recordSha !==
        record.record_sha256
    ) {
      fail(
        `SUBJECT_REGISTRY_RECORD_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenSubjectRefs.has(
        record.subject_ref
      )
    ) {
      fail(
        "SUBJECT_REGISTRY_DUPLICATE_SUBJECT_REF"
      );
    }

    seenSubjectRefs.add(
      record.subject_ref
    );

    records.push(
      record
    );

    expectedPrevious =
      record.record_sha256;

    previousRecordedAtMs =
      recordedAtMs;
  }

  return records;
}


export function registerSubject({
  registryPath,
  subject,
  recordedAt
}) {
  assertString(
    registryPath,
    "SUBJECT_REGISTRY_PATH_REQUIRED"
  );

  assertSubject(
    subject
  );

  assertIsoDate(
    recordedAt,
    "SUBJECT_RECORDED_AT_INVALID"
  );

  if (
    Date.parse(recordedAt) <
    Date.parse(
      subject.created_at
    )
  ) {
    fail(
      "SUBJECT_RECORDED_BEFORE_CREATED_AT"
    );
  }

  const immutableSubject =
    clone(subject);

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
          record.subject_ref ===
            immutableSubject
              .subject_ref
      )
    ) {
      fail(
        "SUBJECT_ALREADY_REGISTERED"
      );
    }

    if (
      records.length >
        0 &&
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
        "SUBJECT_RECORDED_AT_ORDER_INVALID"
      );
    }

    const subjectSha =
      sha256Canonical(
        immutableSubject
      );

    const previous =
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

    const basis = {
      registry_version:
        "1.0",

      record_type:
        "SUBJECT_REGISTERED",

      subject_ref:
        immutableSubject
          .subject_ref,

      recorded_at:
        recordedAt,

      previous_record_sha256:
        previous,

      subject_sha256:
        subjectSha,

      subject:
        immutableSubject
    };

    const record = {
      ...basis,

      record_sha256:
        sha256Canonical(
          basis
        )
    };

    appendDurable(
      registryPath,
      `${JSON.stringify(record)}\n`
    );

    return clone(
      record
    );
  } finally {
    releaseLock(lock);
  }
}


export function getSubject({
  registryPath,
  subjectRef
}) {
  if (
    typeof subjectRef !==
      "string" ||
    !SUBJECT_REF_PATTERN.test(
      subjectRef
    )
  ) {
    fail(
      "SUBJECT_REF_INVALID"
    );
  }

  const records =
    parseRegistry(
      registryPath
    );

  const record =
    records.find(
      (item) =>
        item.subject_ref ===
          subjectRef
    );

  return record
    ? clone(record)
    : null;
}


export function listSubjects({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifySubjectRegistry({
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
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256,

    subject_is_person_claimed:
      false,

    legal_identity_proven:
      false,

    civil_identity_proven:
      false,

    trusted_external_time:
      false,

    external_immutability_proven:
      false
  };
}
