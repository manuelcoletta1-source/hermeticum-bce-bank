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

import {
  getSubject,
  verifySubjectRegistry
} from "./hbce-subject-registry.reference.mjs";


const SUBJECT_REF_PATTERN =
  /^SUB-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const BINDING_REF_PATTERN =
  /^BINDING-[A-Z0-9][A-Z0-9._:-]{2,127}$/;


const REVOCATION_STATES =
  new Set([
    "ACTIVE",
    "REVOKED",
    "SUPERSEDED"
  ]);


const BINDING_KEYS =
  new Set([
    "schema_version",
    "binding_ref",
    "subject_ref",
    "identity_source_ref",
    "binding_type",
    "verified_at",
    "valid_until",
    "revocation_state",
    "evidence_refs"
  ]);


const RECORD_TYPES =
  new Set([
    "SUBJECT_BINDING_REGISTERED",
    "SUBJECT_BINDING_REVOKED",
    "SUBJECT_BINDING_SUPERSEDED"
  ]);


const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "event_id",
    "binding_ref",
    "subject_ref",
    "recorded_at",
    "effective_at",
    "replacement_binding_ref",
    "reason_code",
    "evidence_refs",
    "binding_sha256",
    "binding",
    "previous_record_sha256",
    "record_sha256"
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
    !/^[a-f0-9]{64}$/.test(
      value
    )
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


function assertUniqueStrings(
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


function assertBinding(
  binding
) {
  assertObject(
    binding,
    "SUBJECT_BINDING_INVALID"
  );

  const keys =
    Object.keys(binding);

  if (
    keys.length !==
      BINDING_KEYS.size
  ) {
    fail(
      "SUBJECT_BINDING_FIELD_SET_INVALID"
    );
  }

  for (
    const key of
    keys
  ) {
    if (
      !BINDING_KEYS.has(key)
    ) {
      fail(
        `SUBJECT_BINDING_UNKNOWN_FIELD:${key}`
      );
    }
  }

  if (
    binding.schema_version !==
      "1.0"
  ) {
    fail(
      "SUBJECT_BINDING_SCHEMA_VERSION_UNSUPPORTED"
    );
  }

  if (
    typeof binding.binding_ref !==
      "string" ||
    !BINDING_REF_PATTERN.test(
      binding.binding_ref
    )
  ) {
    fail(
      "SUBJECT_BINDING_REF_INVALID"
    );
  }

  if (
    typeof binding.subject_ref !==
      "string" ||
    !SUBJECT_REF_PATTERN.test(
      binding.subject_ref
    )
  ) {
    fail(
      "SUBJECT_BINDING_SUBJECT_REF_INVALID"
    );
  }

  assertString(
    binding.identity_source_ref,
    "SUBJECT_BINDING_IDENTITY_SOURCE_REF_INVALID"
  );

  assertString(
    binding.binding_type,
    "SUBJECT_BINDING_TYPE_INVALID",
    128
  );

  assertIsoDate(
    binding.verified_at,
    "SUBJECT_BINDING_VERIFIED_AT_INVALID"
  );

  assertIsoDate(
    binding.valid_until,
    "SUBJECT_BINDING_VALID_UNTIL_INVALID"
  );

  if (
    Date.parse(
      binding.valid_until
    ) <=
    Date.parse(
      binding.verified_at
    )
  ) {
    fail(
      "SUBJECT_BINDING_VALIDITY_INTERVAL_INVALID"
    );
  }

  if (
    !REVOCATION_STATES.has(
      binding.revocation_state
    )
  ) {
    fail(
      "SUBJECT_BINDING_REVOCATION_STATE_INVALID"
    );
  }

  assertUniqueStrings(
    binding.evidence_refs,
    "SUBJECT_BINDING_EVIDENCE_REFS"
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
      "SUBJECT_BINDING_REGISTRY_LOCKED"
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


function recordBasis(
  record
) {
  return {
    registry_version:
      record.registry_version,

    record_type:
      record.record_type,

    event_id:
      record.event_id,

    binding_ref:
      record.binding_ref,

    subject_ref:
      record.subject_ref,

    recorded_at:
      record.recorded_at,

    effective_at:
      record.effective_at,

    replacement_binding_ref:
      record.replacement_binding_ref,

    reason_code:
      record.reason_code,

    evidence_refs:
      record.evidence_refs,

    binding_sha256:
      record.binding_sha256,

    binding:
      record.binding,

    previous_record_sha256:
      record.previous_record_sha256
  };
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
      "SUBJECT_BINDING_REGISTRY_UNAVAILABLE"
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

  const seenEventIds =
    new Set();

  const seenBindings =
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
        `SUBJECT_BINDING_REGISTRY_CORRUPT_JSON_LINE:${index + 1}`
      );
    }

    assertExactKeys(
      record,
      RECORD_KEYS,
      `SUBJECT_BINDING_REGISTRY_RECORD_${index + 1}`
    );

    if (
      record.registry_version !==
        "1.0" ||
      !RECORD_TYPES.has(
        record.record_type
      )
    ) {
      fail(
        `SUBJECT_BINDING_REGISTRY_RECORD_TYPE_INVALID:${index + 1}`
      );
    }

    assertString(
      record.event_id,
      `SUBJECT_BINDING_EVENT_ID_INVALID:${index + 1}`
    );

    if (
      typeof record.binding_ref !==
        "string" ||
      !BINDING_REF_PATTERN.test(
        record.binding_ref
      )
    ) {
      fail(
        `SUBJECT_BINDING_RECORD_REF_INVALID:${index + 1}`
      );
    }

    if (
      typeof record.subject_ref !==
        "string" ||
      !SUBJECT_REF_PATTERN.test(
        record.subject_ref
      )
    ) {
      fail(
        `SUBJECT_BINDING_RECORD_SUBJECT_REF_INVALID:${index + 1}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `SUBJECT_BINDING_RECORDED_AT_INVALID:${index + 1}`
    );

    assertIsoDate(
      record.effective_at,
      `SUBJECT_BINDING_EFFECTIVE_AT_INVALID:${index + 1}`
    );

    if (
      Date.parse(
        record.recorded_at
      ) <
      Date.parse(
        record.effective_at
      )
    ) {
      fail(
        `SUBJECT_BINDING_RECORDED_BEFORE_EFFECTIVE:${index + 1}`
      );
    }

    if (
      previousRecordedAtMs !==
        null &&
      Date.parse(
        record.recorded_at
      ) <
      previousRecordedAtMs
    ) {
      fail(
        `SUBJECT_BINDING_TIME_ORDER_MISMATCH:${index + 1}`
      );
    }

    if (
      record.previous_record_sha256 !==
        expectedPrevious
    ) {
      fail(
        `SUBJECT_BINDING_CHAIN_MISMATCH:${index + 1}`
      );
    }

    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `SUBJECT_BINDING_PREVIOUS_SHA256_INVALID:${index + 1}`
      );
    }

    assertSha256(
      record.binding_sha256,
      `SUBJECT_BINDING_SHA256_INVALID:${index + 1}`
    );

    assertSha256(
      record.record_sha256,
      `SUBJECT_BINDING_RECORD_SHA256_INVALID:${index + 1}`
    );

    if (
      record.record_type ===
        "SUBJECT_BINDING_REGISTERED"
    ) {
      assertBinding(
        record.binding
      );

      if (
        record.binding
          .revocation_state !==
            "ACTIVE"
      ) {
        fail(
          `SUBJECT_BINDING_REGISTERED_NOT_ACTIVE:${index + 1}`
        );
      }

      if (
        record.binding_ref !==
          record.binding
            .binding_ref ||
        record.subject_ref !==
          record.binding
            .subject_ref
      ) {
        fail(
          `SUBJECT_BINDING_REGISTERED_BINDING_MISMATCH:${index + 1}`
        );
      }

      if (
        record.effective_at !==
          record.binding
            .verified_at
      ) {
        fail(
          `SUBJECT_BINDING_REGISTERED_EFFECTIVE_TIME_MISMATCH:${index + 1}`
        );
      }

      if (
        sha256Canonical(
          record.binding
        ) !==
          record.binding_sha256
      ) {
        fail(
          `SUBJECT_BINDING_HASH_MISMATCH:${index + 1}`
        );
      }

      if (
        seenBindings.has(
          record.binding_ref
        )
      ) {
        fail(
          "SUBJECT_BINDING_DUPLICATE_BINDING_REF"
        );
      }

      seenBindings.add(
        record.binding_ref
      );
    } else {
      if (
        record.binding !==
          null
      ) {
        fail(
          `SUBJECT_BINDING_LIFECYCLE_RAW_BINDING_FORBIDDEN:${index + 1}`
        );
      }

      const registration =
        records.find(
          (item) =>
            item.record_type ===
              "SUBJECT_BINDING_REGISTERED" &&
            item.binding_ref ===
              record.binding_ref
        );

      if (!registration) {
        fail(
          `SUBJECT_BINDING_LIFECYCLE_WITHOUT_REGISTRATION:${index + 1}`
        );
      }

      if (
        registration.subject_ref !==
          record.subject_ref ||
        registration.binding_sha256 !==
          record.binding_sha256
      ) {
        fail(
          `SUBJECT_BINDING_LIFECYCLE_BINDING_MISMATCH:${index + 1}`
        );
      }

      const priorLifecycle =
        records.filter(
          (item) =>
            item.binding_ref ===
              record.binding_ref &&
            item.record_type !==
              "SUBJECT_BINDING_REGISTERED"
        );

      if (
        priorLifecycle.length >
          0
      ) {
        fail(
          "SUBJECT_BINDING_ALREADY_TERMINAL"
        );
      }

      if (
        record.record_type ===
          "SUBJECT_BINDING_REVOKED"
      ) {
        if (
          record.replacement_binding_ref !==
            null
        ) {
          fail(
            `SUBJECT_BINDING_REVOKE_REPLACEMENT_FORBIDDEN:${index + 1}`
          );
        }

        assertString(
          record.reason_code,
          `SUBJECT_BINDING_REVOKE_REASON_REQUIRED:${index + 1}`,
          128
        );
      }

      if (
        record.record_type ===
          "SUBJECT_BINDING_SUPERSEDED"
      ) {
        if (
          typeof record.replacement_binding_ref !==
            "string" ||
          !BINDING_REF_PATTERN.test(
            record.replacement_binding_ref
          ) ||
          record.replacement_binding_ref ===
            record.binding_ref
        ) {
          fail(
            `SUBJECT_BINDING_REPLACEMENT_REF_INVALID:${index + 1}`
          );
        }

        assertString(
          record.reason_code,
          `SUBJECT_BINDING_SUPERSEDE_REASON_REQUIRED:${index + 1}`,
          128
        );
      }
    }

    assertUniqueStrings(
      record.evidence_refs,
      `SUBJECT_BINDING_RECORD_EVIDENCE_REFS_${index + 1}`
    );

    const calculatedRecordSha =
      sha256Canonical(
        recordBasis(
          record
        )
      );

    if (
      calculatedRecordSha !==
        record.record_sha256
    ) {
      fail(
        `SUBJECT_BINDING_RECORD_HASH_MISMATCH:${index + 1}`
      );
    }

    if (
      seenEventIds.has(
        record.event_id
      )
    ) {
      fail(
        "SUBJECT_BINDING_DUPLICATE_EVENT_ID"
      );
    }

    seenEventIds.add(
      record.event_id
    );

    records.push(
      record
    );

    expectedPrevious =
      record.record_sha256;

    previousRecordedAtMs =
      Date.parse(
        record.recorded_at
      );
  }

  return records;
}


function registrationFor(
  records,
  bindingRef
) {
  return records.find(
    (record) =>
      record.record_type ===
        "SUBJECT_BINDING_REGISTERED" &&
      record.binding_ref ===
        bindingRef
  ) ?? null;
}


function lifecycleFor(
  records,
  bindingRef,
  asOf
) {
  const asOfMs =
    Date.parse(asOf);

  return records.find(
    (record) =>
      record.binding_ref ===
        bindingRef &&
      record.record_type !==
        "SUBJECT_BINDING_REGISTERED" &&
      Date.parse(
        record.effective_at
      ) <=
        asOfMs &&
      Date.parse(
        record.recorded_at
      ) <=
        asOfMs
  ) ?? null;
}


export function registerSubjectBinding({
  registryPath,
  subjectRegistryPath,
  binding,
  recordedAt,
  eventId
}) {
  assertString(
    registryPath,
    "SUBJECT_BINDING_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    subjectRegistryPath,
    "SUBJECT_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    eventId,
    "SUBJECT_BINDING_EVENT_ID_REQUIRED"
  );

  assertBinding(
    binding
  );

  if (
    binding.revocation_state !==
      "ACTIVE"
  ) {
    fail(
      "SUBJECT_BINDING_INITIAL_STATE_MUST_BE_ACTIVE"
    );
  }

  assertIsoDate(
    recordedAt,
    "SUBJECT_BINDING_RECORDED_AT_INVALID"
  );

  if (
    Date.parse(recordedAt) <
    Date.parse(
      binding.verified_at
    )
  ) {
    fail(
      "SUBJECT_BINDING_RECORDED_BEFORE_VERIFIED_AT"
    );
  }

  const subjectRegistryVerification =
    verifySubjectRegistry({
      registryPath:
        subjectRegistryPath
    });

  if (
    subjectRegistryVerification.valid !==
      true
  ) {
    fail(
      "SUBJECT_BINDING_SUBJECT_REGISTRY_INVALID"
    );
  }

  const subject =
    getSubject({
      registryPath:
        subjectRegistryPath,

      subjectRef:
        binding.subject_ref
    });

  if (!subject) {
    fail(
      "SUBJECT_BINDING_UNKNOWN_SUBJECT"
    );
  }

  const immutableBinding =
    clone(binding);

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
      registrationFor(
        records,
        immutableBinding
          .binding_ref
      )
    ) {
      fail(
        "SUBJECT_BINDING_ALREADY_REGISTERED"
      );
    }

    if (
      records.some(
        (record) =>
          record.event_id ===
            eventId
      )
    ) {
      fail(
        "SUBJECT_BINDING_EVENT_ALREADY_REGISTERED"
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
        "SUBJECT_BINDING_RECORDED_AT_ORDER_INVALID"
      );
    }

    const bindingSha =
      sha256Canonical(
        immutableBinding
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
        "SUBJECT_BINDING_REGISTERED",

      event_id:
        eventId,

      binding_ref:
        immutableBinding
          .binding_ref,

      subject_ref:
        immutableBinding
          .subject_ref,

      recorded_at:
        recordedAt,

      effective_at:
        immutableBinding
          .verified_at,

      replacement_binding_ref:
        null,

      reason_code:
        null,

      evidence_refs:
        clone(
          immutableBinding
            .evidence_refs
        ),

      binding_sha256:
        bindingSha,

      binding:
        immutableBinding,

      previous_record_sha256:
        previous
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


function appendLifecycleEvent({
  registryPath,
  bindingRef,
  effectiveAt,
  recordedAt,
  eventId,
  recordType,
  reasonCode,
  evidenceRefs = [],
  replacementBindingRef = null
}) {
  assertString(
    registryPath,
    "SUBJECT_BINDING_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    eventId,
    "SUBJECT_BINDING_EVENT_ID_REQUIRED"
  );

  if (
    typeof bindingRef !==
      "string" ||
    !BINDING_REF_PATTERN.test(
      bindingRef
    )
  ) {
    fail(
      "SUBJECT_BINDING_REF_INVALID"
    );
  }

  assertIsoDate(
    effectiveAt,
    "SUBJECT_BINDING_EFFECTIVE_AT_INVALID"
  );

  assertIsoDate(
    recordedAt,
    "SUBJECT_BINDING_RECORDED_AT_INVALID"
  );

  if (
    Date.parse(recordedAt) <
    Date.parse(effectiveAt)
  ) {
    fail(
      "SUBJECT_BINDING_RECORDED_BEFORE_EFFECTIVE"
    );
  }

  assertString(
    reasonCode,
    "SUBJECT_BINDING_REASON_CODE_REQUIRED",
    128
  );

  assertUniqueStrings(
    evidenceRefs,
    "SUBJECT_BINDING_EVIDENCE_REFS"
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

    if (
      records.some(
        (record) =>
          record.event_id ===
            eventId
      )
    ) {
      fail(
        "SUBJECT_BINDING_EVENT_ALREADY_REGISTERED"
      );
    }

    const registration =
      registrationFor(
        records,
        bindingRef
      );

    if (!registration) {
      fail(
        "SUBJECT_BINDING_NOT_FOUND"
      );
    }

    const priorLifecycle =
      records.find(
        (record) =>
          record.binding_ref ===
            bindingRef &&
          record.record_type !==
            "SUBJECT_BINDING_REGISTERED"
      );

    if (priorLifecycle) {
      fail(
        "SUBJECT_BINDING_ALREADY_TERMINAL"
      );
    }

    if (
      Date.parse(
        effectiveAt
      ) <
      Date.parse(
        registration
          .binding
          .verified_at
      )
    ) {
      fail(
        "SUBJECT_BINDING_LIFECYCLE_BEFORE_VERIFICATION"
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
        "SUBJECT_BINDING_RECORDED_AT_ORDER_INVALID"
      );
    }

    if (
      recordType ===
        "SUBJECT_BINDING_SUPERSEDED"
    ) {
      if (
        typeof replacementBindingRef !==
          "string" ||
        !BINDING_REF_PATTERN.test(
          replacementBindingRef
        ) ||
        replacementBindingRef ===
          bindingRef
      ) {
        fail(
          "SUBJECT_BINDING_REPLACEMENT_REF_INVALID"
        );
      }

      const replacement =
        registrationFor(
          records,
          replacementBindingRef
        );

      if (!replacement) {
        fail(
          "SUBJECT_BINDING_REPLACEMENT_NOT_FOUND"
        );
      }

      if (
        replacement.subject_ref !==
          registration.subject_ref
      ) {
        fail(
          "SUBJECT_BINDING_REPLACEMENT_SUBJECT_MISMATCH"
        );
      }

      const replacementLifecycle =
        records.find(
          (record) =>
            record.binding_ref ===
              replacementBindingRef &&
            record.record_type !==
              "SUBJECT_BINDING_REGISTERED"
        );

      if (replacementLifecycle) {
        fail(
          "SUBJECT_BINDING_REPLACEMENT_NOT_ACTIVE"
        );
      }
    }

    const previous =
      records[
        records.length - 1
      ].record_sha256;

    const basis = {
      registry_version:
        "1.0",

      record_type:
        recordType,

      event_id:
        eventId,

      binding_ref:
        bindingRef,

      subject_ref:
        registration
          .subject_ref,

      recorded_at:
        recordedAt,

      effective_at:
        effectiveAt,

      replacement_binding_ref:
        replacementBindingRef,

      reason_code:
        reasonCode,

      evidence_refs:
        clone(
          evidenceRefs
        ),

      binding_sha256:
        registration
          .binding_sha256,

      binding:
        null,

      previous_record_sha256:
        previous
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


export function revokeSubjectBinding({
  registryPath,
  bindingRef,
  revokedAt,
  recordedAt,
  eventId,
  reasonCode,
  evidenceRefs = []
}) {
  return appendLifecycleEvent({
    registryPath,
    bindingRef,

    effectiveAt:
      revokedAt,

    recordedAt,
    eventId,

    recordType:
      "SUBJECT_BINDING_REVOKED",

    reasonCode,
    evidenceRefs,

    replacementBindingRef:
      null
  });
}


export function supersedeSubjectBinding({
  registryPath,
  bindingRef,
  replacementBindingRef,
  supersededAt,
  recordedAt,
  eventId,
  reasonCode,
  evidenceRefs = []
}) {
  return appendLifecycleEvent({
    registryPath,
    bindingRef,

    effectiveAt:
      supersededAt,

    recordedAt,
    eventId,

    recordType:
      "SUBJECT_BINDING_SUPERSEDED",

    reasonCode,
    evidenceRefs,
    replacementBindingRef
  });
}


export function resolveSubjectBinding({
  registryPath,
  bindingRef,
  asOf
}) {
  if (
    typeof bindingRef !==
      "string" ||
    !BINDING_REF_PATTERN.test(
      bindingRef
    )
  ) {
    fail(
      "SUBJECT_BINDING_REF_INVALID"
    );
  }

  assertIsoDate(
    asOf,
    "SUBJECT_BINDING_AS_OF_INVALID"
  );

  const records =
    parseRegistry(
      registryPath
    );

  const registration =
    registrationFor(
      records,
      bindingRef
    );

  if (!registration) {
    return null;
  }

  const asOfMs =
    Date.parse(asOf);

  const observedRegistration =
    Date.parse(
      registration.recorded_at
    ) <=
      asOfMs &&
    Date.parse(
      registration.effective_at
    ) <=
      asOfMs;

  if (!observedRegistration) {
    return null;
  }

  const lifecycle =
    lifecycleFor(
      records,
      bindingRef,
      asOf
    );

  const revocationState =
    lifecycle
      ? lifecycle.record_type ===
          "SUBJECT_BINDING_REVOKED"
        ? "REVOKED"
        : "SUPERSEDED"
      : "ACTIVE";

  const withinValidity =
    asOfMs <=
      Date.parse(
        registration
          .binding
          .valid_until
      );

  return {
    binding:
      clone(
        registration
          .binding
      ),

    binding_sha256:
      registration
        .binding_sha256,

    registration_record_sha256:
      registration
        .record_sha256,

    revocation_state:
      revocationState,

    lifecycle_event:
      lifecycle
        ? clone(lifecycle)
        : null,

    within_validity:
      withinValidity,

    technically_usable:
      revocationState ===
        "ACTIVE" &&
      withinValidity,

    subject_revoked:
      false,

    person_revoked:
      false,

    identity_source_authenticity_proven:
      false,

    legal_identity_proven:
      false,

    civil_identity_proven:
      false,

    trusted_external_time:
      false
  };
}


export function getSubjectBinding({
  registryPath,
  bindingRef
}) {
  const records =
    parseRegistry(
      registryPath
    );

  const registration =
    registrationFor(
      records,
      bindingRef
    );

  return registration
    ? clone(registration)
    : null;
}


export function listSubjectBindingEvents({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifySubjectBindingRegistry({
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

    binding_revocation_supported:
      true,

    binding_supersession_supported:
      true,

    binding_expiry_separate_from_subject:
      true,

    subject_revocation_supported:
      false,

    person_revocation_supported:
      false,

    identity_source_authenticity_proven:
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
