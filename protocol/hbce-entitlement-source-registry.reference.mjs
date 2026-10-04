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


const ENTITLEMENT_REF_PATTERN =
  /^ENT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SUBJECT_REF_PATTERN =
  /^SUB-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const REVOCATION_STATES =
  new Set([
    "ACTIVE",
    "REVOKED",
    "SUPERSEDED"
  ]);

const TECHNICAL_STATES =
  new Set([
    "TECHNICALLY_VERIFIED",
    "PARTIALLY_VERIFIED",
    "UNRESOLVED",
    "CONTESTED",
    "INSUFFICIENT_EVIDENCE",
    "REVOKED",
    "EXPIRED",
    "SUPERSEDED"
  ]);

const ENTITLEMENT_KEYS =
  new Set([
    "entitlement_ref",
    "source_type",
    "source_ref",
    "issuer_or_origin",
    "subject_ref",
    "jurisdiction",
    "effective_from",
    "effective_until",
    "superseded_by",
    "revocation_state",
    "verification_method",
    "technical_status",
    "evidence_refs"
  ]);

const RECORD_TYPES =
  new Set([
    "ENTITLEMENT_SOURCE_REGISTERED",
    "ENTITLEMENT_SOURCE_REVOKED",
    "ENTITLEMENT_SOURCE_SUPERSEDED"
  ]);

const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "event_id",
    "entitlement_ref",
    "subject_ref",
    "recorded_at",
    "effective_at",
    "replacement_entitlement_ref",
    "reason_code",
    "evidence_refs",
    "entitlement_sha256",
    "entitlement",
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
  return createHash("sha256")
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


function assertUniqueStrings(
  value,
  code
) {
  if (!Array.isArray(value)) {
    fail(`${code}_INVALID`);
  }

  for (const item of value) {
    assertString(
      item,
      `${code}_ITEM_INVALID`
    );
  }

  if (
    new Set(value).size !==
      value.length
  ) {
    fail(`${code}_DUPLICATE`);
  }
}


function assertEntitlement(
  entitlement
) {
  assertObject(
    entitlement,
    "ENTITLEMENT_INVALID"
  );

  const keys =
    Object.keys(entitlement);

  if (
    keys.length !==
      ENTITLEMENT_KEYS.size
  ) {
    fail(
      "ENTITLEMENT_FIELD_SET_INVALID"
    );
  }

  for (const key of keys) {
    if (
      !ENTITLEMENT_KEYS.has(key)
    ) {
      fail(
        `ENTITLEMENT_UNKNOWN_FIELD:${key}`
      );
    }
  }

  if (
    typeof entitlement.entitlement_ref !==
      "string" ||
    !ENTITLEMENT_REF_PATTERN.test(
      entitlement.entitlement_ref
    )
  ) {
    fail(
      "ENTITLEMENT_REF_INVALID"
    );
  }

  assertString(
    entitlement.source_type,
    "ENTITLEMENT_SOURCE_TYPE_INVALID",
    128
  );

  assertString(
    entitlement.source_ref,
    "ENTITLEMENT_SOURCE_REF_INVALID"
  );

  assertString(
    entitlement.issuer_or_origin,
    "ENTITLEMENT_ISSUER_OR_ORIGIN_INVALID"
  );

  if (
    typeof entitlement.subject_ref !==
      "string" ||
    !SUBJECT_REF_PATTERN.test(
      entitlement.subject_ref
    )
  ) {
    fail(
      "ENTITLEMENT_SUBJECT_REF_INVALID"
    );
  }

  assertString(
    entitlement.jurisdiction,
    "ENTITLEMENT_JURISDICTION_INVALID",
    128
  );

  assertIsoDate(
    entitlement.effective_from,
    "ENTITLEMENT_EFFECTIVE_FROM_INVALID"
  );

  assertIsoDate(
    entitlement.effective_until,
    "ENTITLEMENT_EFFECTIVE_UNTIL_INVALID"
  );

  if (
    Date.parse(
      entitlement.effective_until
    ) <=
    Date.parse(
      entitlement.effective_from
    )
  ) {
    fail(
      "ENTITLEMENT_EFFECTIVE_INTERVAL_INVALID"
    );
  }

  if (
    entitlement.superseded_by !==
      null &&
    (
      typeof entitlement.superseded_by !==
        "string" ||
      !ENTITLEMENT_REF_PATTERN.test(
        entitlement.superseded_by
      ) ||
      entitlement.superseded_by ===
        entitlement.entitlement_ref
    )
  ) {
    fail(
      "ENTITLEMENT_SUPERSEDED_BY_INVALID"
    );
  }

  if (
    !REVOCATION_STATES.has(
      entitlement.revocation_state
    )
  ) {
    fail(
      "ENTITLEMENT_REVOCATION_STATE_INVALID"
    );
  }

  assertString(
    entitlement.verification_method,
    "ENTITLEMENT_VERIFICATION_METHOD_INVALID",
    128
  );

  if (
    !TECHNICAL_STATES.has(
      entitlement.technical_status
    )
  ) {
    fail(
      "ENTITLEMENT_TECHNICAL_STATUS_INVALID"
    );
  }

  assertUniqueStrings(
    entitlement.evidence_refs,
    "ENTITLEMENT_EVIDENCE_REFS"
  );
}


function assertRecordKeys(
  record,
  line
) {
  assertObject(
    record,
    `ENTITLEMENT_REGISTRY_RECORD_INVALID:${line}`
  );

  const keys =
    Object.keys(record);

  if (
    keys.length !==
      RECORD_KEYS.size
  ) {
    fail(
      `ENTITLEMENT_REGISTRY_RECORD_FIELD_SET_INVALID:${line}`
    );
  }

  for (const key of keys) {
    if (!RECORD_KEYS.has(key)) {
      fail(
        `ENTITLEMENT_REGISTRY_RECORD_UNKNOWN_FIELD:${line}:${key}`
      );
    }
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
      "ENTITLEMENT_REGISTRY_LOCKED"
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


function recordBasis(record) {
  return {
    registry_version:
      record.registry_version,

    record_type:
      record.record_type,

    event_id:
      record.event_id,

    entitlement_ref:
      record.entitlement_ref,

    subject_ref:
      record.subject_ref,

    recorded_at:
      record.recorded_at,

    effective_at:
      record.effective_at,

    replacement_entitlement_ref:
      record.replacement_entitlement_ref,

    reason_code:
      record.reason_code,

    evidence_refs:
      record.evidence_refs,

    entitlement_sha256:
      record.entitlement_sha256,

    entitlement:
      record.entitlement,

    previous_record_sha256:
      record.previous_record_sha256
  };
}


function registrationFor(
  records,
  entitlementRef
) {
  return records.find(
    (record) =>
      record.record_type ===
        "ENTITLEMENT_SOURCE_REGISTERED" &&
      record.entitlement_ref ===
        entitlementRef
  ) ?? null;
}


function lifecycleFor(
  records,
  entitlementRef,
  asOf
) {
  const asOfMs =
    Date.parse(asOf);

  return records.find(
    (record) =>
      record.entitlement_ref ===
        entitlementRef &&
      record.record_type !==
        "ENTITLEMENT_SOURCE_REGISTERED" &&
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
      "ENTITLEMENT_REGISTRY_UNAVAILABLE"
    );
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

  const seenEvents =
    new Set();

  const seenEntitlements =
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
    const line =
      index + 1;

    let record;

    try {
      record =
        JSON.parse(
          lines[index]
        );
    } catch {
      fail(
        `ENTITLEMENT_REGISTRY_CORRUPT_JSON_LINE:${line}`
      );
    }

    assertRecordKeys(
      record,
      line
    );

    if (
      record.registry_version !==
        "1.0" ||
      !RECORD_TYPES.has(
        record.record_type
      )
    ) {
      fail(
        `ENTITLEMENT_REGISTRY_RECORD_TYPE_INVALID:${line}`
      );
    }

    assertString(
      record.event_id,
      `ENTITLEMENT_EVENT_ID_INVALID:${line}`
    );

    if (
      typeof record.entitlement_ref !==
        "string" ||
      !ENTITLEMENT_REF_PATTERN.test(
        record.entitlement_ref
      )
    ) {
      fail(
        `ENTITLEMENT_RECORD_REF_INVALID:${line}`
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
        `ENTITLEMENT_RECORD_SUBJECT_REF_INVALID:${line}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `ENTITLEMENT_RECORDED_AT_INVALID:${line}`
    );

    assertIsoDate(
      record.effective_at,
      `ENTITLEMENT_EVENT_EFFECTIVE_AT_INVALID:${line}`
    );

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
        `ENTITLEMENT_REGISTRY_TIME_ORDER_INVALID:${line}`
      );
    }

    if (
      record.previous_record_sha256 !==
        expectedPrevious
    ) {
      fail(
        `ENTITLEMENT_REGISTRY_CHAIN_MISMATCH:${line}`
      );
    }

    if (
      record.previous_record_sha256 !==
        null
    ) {
      assertSha256(
        record.previous_record_sha256,
        `ENTITLEMENT_PREVIOUS_SHA_INVALID:${line}`
      );
    }

    assertSha256(
      record.entitlement_sha256,
      `ENTITLEMENT_SHA_INVALID:${line}`
    );

    assertSha256(
      record.record_sha256,
      `ENTITLEMENT_RECORD_SHA_INVALID:${line}`
    );

    assertUniqueStrings(
      record.evidence_refs,
      `ENTITLEMENT_RECORD_EVIDENCE_REFS:${line}`
    );

    if (
      record.record_type ===
        "ENTITLEMENT_SOURCE_REGISTERED"
    ) {
      assertEntitlement(
        record.entitlement
      );

      if (
        record.entitlement_ref !==
          record.entitlement
            .entitlement_ref ||
        record.subject_ref !==
          record.entitlement
            .subject_ref
      ) {
        fail(
          `ENTITLEMENT_REGISTRATION_BINDING_MISMATCH:${line}`
        );
      }

      if (
        record.effective_at !==
          record.entitlement
            .effective_from
      ) {
        fail(
          `ENTITLEMENT_REGISTRATION_EFFECTIVE_AT_MISMATCH:${line}`
        );
      }

      if (
        record.entitlement
          .revocation_state !==
            "ACTIVE" ||
        record.entitlement
          .superseded_by !==
            null
      ) {
        fail(
          `ENTITLEMENT_INITIAL_LIFECYCLE_INVALID:${line}`
        );
      }

      if (
        record.entitlement
          .technical_status !==
            "UNRESOLVED"
      ) {
        fail(
          `ENTITLEMENT_INITIAL_TECHNICAL_STATUS_INVALID:${line}`
        );
      }

      if (
        sha256Canonical(
          record.entitlement
        ) !==
          record.entitlement_sha256
      ) {
        fail(
          `ENTITLEMENT_HASH_MISMATCH:${line}`
        );
      }

      if (
        seenEntitlements.has(
          record.entitlement_ref
        )
      ) {
        fail(
          "ENTITLEMENT_DUPLICATE_REF"
        );
      }

      seenEntitlements.add(
        record.entitlement_ref
      );
    } else {
      if (
        record.entitlement !==
          null
      ) {
        fail(
          `ENTITLEMENT_LIFECYCLE_RAW_SOURCE_FORBIDDEN:${line}`
        );
      }

      if (
        Date.parse(
          record.recorded_at
        ) <
        Date.parse(
          record.effective_at
        )
      ) {
        fail(
          `ENTITLEMENT_LIFECYCLE_RECORDED_BEFORE_EFFECTIVE:${line}`
        );
      }

      const registration =
        registrationFor(
          records,
          record.entitlement_ref
        );

      if (!registration) {
        fail(
          `ENTITLEMENT_LIFECYCLE_WITHOUT_REGISTRATION:${line}`
        );
      }

      if (
        registration.subject_ref !==
          record.subject_ref ||
        registration.entitlement_sha256 !==
          record.entitlement_sha256
      ) {
        fail(
          `ENTITLEMENT_LIFECYCLE_BINDING_MISMATCH:${line}`
        );
      }

      if (
        records.some(
          (prior) =>
            prior.entitlement_ref ===
              record.entitlement_ref &&
            prior.record_type !==
              "ENTITLEMENT_SOURCE_REGISTERED"
        )
      ) {
        fail(
          "ENTITLEMENT_ALREADY_TERMINAL"
        );
      }

      assertString(
        record.reason_code,
        `ENTITLEMENT_REASON_REQUIRED:${line}`,
        128
      );

      if (
        record.record_type ===
          "ENTITLEMENT_SOURCE_REVOKED"
      ) {
        if (
          record.replacement_entitlement_ref !==
            null
        ) {
          fail(
            `ENTITLEMENT_REVOKE_REPLACEMENT_FORBIDDEN:${line}`
          );
        }
      }

      if (
        record.record_type ===
          "ENTITLEMENT_SOURCE_SUPERSEDED"
      ) {
        if (
          typeof record.replacement_entitlement_ref !==
            "string" ||
          !ENTITLEMENT_REF_PATTERN.test(
            record.replacement_entitlement_ref
          ) ||
          record.replacement_entitlement_ref ===
            record.entitlement_ref
        ) {
          fail(
            `ENTITLEMENT_REPLACEMENT_INVALID:${line}`
          );
        }
      }
    }

    const calculated =
      sha256Canonical(
        recordBasis(record)
      );

    if (
      calculated !==
        record.record_sha256
    ) {
      fail(
        `ENTITLEMENT_RECORD_HASH_MISMATCH:${line}`
      );
    }

    if (
      seenEvents.has(
        record.event_id
      )
    ) {
      fail(
        "ENTITLEMENT_DUPLICATE_EVENT_ID"
      );
    }

    seenEvents.add(
      record.event_id
    );

    records.push(record);

    expectedPrevious =
      record.record_sha256;

    previousRecordedAtMs =
      recordedAtMs;
  }

  return records;
}


export function registerEntitlementSource({
  registryPath,
  subjectRegistryPath,
  entitlement,
  recordedAt,
  eventId
}) {
  assertString(
    registryPath,
    "ENTITLEMENT_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    subjectRegistryPath,
    "ENTITLEMENT_SUBJECT_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    eventId,
    "ENTITLEMENT_EVENT_ID_REQUIRED"
  );

  assertIsoDate(
    recordedAt,
    "ENTITLEMENT_RECORDED_AT_INVALID"
  );

  assertEntitlement(
    entitlement
  );

  if (
    entitlement.revocation_state !==
      "ACTIVE" ||
    entitlement.superseded_by !==
      null
  ) {
    fail(
      "ENTITLEMENT_INITIAL_LIFECYCLE_INVALID"
    );
  }

  /*
   * Registration is not verification.
   * A caller cannot self-promote an incoming record
   * to TECHNICALLY_VERIFIED.
   */
  if (
    entitlement.technical_status !==
      "UNRESOLVED"
  ) {
    fail(
      "ENTITLEMENT_INITIAL_STATUS_MUST_BE_UNRESOLVED"
    );
  }

  const subjectRegistry =
    verifySubjectRegistry({
      registryPath:
        subjectRegistryPath
    });

  if (
    subjectRegistry.valid !==
      true
  ) {
    fail(
      "ENTITLEMENT_SUBJECT_REGISTRY_INVALID"
    );
  }

  const subject =
    getSubject({
      registryPath:
        subjectRegistryPath,

      subjectRef:
        entitlement.subject_ref
    });

  if (!subject) {
    fail(
      "ENTITLEMENT_UNKNOWN_SUBJECT"
    );
  }

  const immutableEntitlement =
    clone(entitlement);

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
        immutableEntitlement
          .entitlement_ref
      )
    ) {
      fail(
        "ENTITLEMENT_ALREADY_REGISTERED"
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
        "ENTITLEMENT_EVENT_ALREADY_REGISTERED"
      );
    }

    if (
      records.length > 0 &&
      Date.parse(recordedAt) <
      Date.parse(
        records[
          records.length - 1
        ].recorded_at
      )
    ) {
      fail(
        "ENTITLEMENT_RECORDED_AT_ORDER_INVALID"
      );
    }

    const entitlementSha =
      sha256Canonical(
        immutableEntitlement
      );

    const previous =
      records.length === 0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

    const basis = {
      registry_version:
        "1.0",

      record_type:
        "ENTITLEMENT_SOURCE_REGISTERED",

      event_id:
        eventId,

      entitlement_ref:
        immutableEntitlement
          .entitlement_ref,

      subject_ref:
        immutableEntitlement
          .subject_ref,

      recorded_at:
        recordedAt,

      effective_at:
        immutableEntitlement
          .effective_from,

      replacement_entitlement_ref:
        null,

      reason_code:
        null,

      evidence_refs:
        clone(
          immutableEntitlement
            .evidence_refs
        ),

      entitlement_sha256:
        entitlementSha,

      entitlement:
        immutableEntitlement,

      previous_record_sha256:
        previous
    };

    const record = {
      ...basis,

      record_sha256:
        sha256Canonical(basis)
    };

    appendDurable(
      registryPath,
      `${JSON.stringify(record)}\n`
    );

    return clone(record);
  } finally {
    releaseLock(lock);
  }
}


function appendLifecycle({
  registryPath,
  entitlementRef,
  effectiveAt,
  recordedAt,
  eventId,
  reasonCode,
  evidenceRefs,
  recordType,
  replacementEntitlementRef
}) {
  assertString(
    registryPath,
    "ENTITLEMENT_REGISTRY_PATH_REQUIRED"
  );

  if (
    typeof entitlementRef !==
      "string" ||
    !ENTITLEMENT_REF_PATTERN.test(
      entitlementRef
    )
  ) {
    fail(
      "ENTITLEMENT_REF_INVALID"
    );
  }

  assertIsoDate(
    effectiveAt,
    "ENTITLEMENT_LIFECYCLE_EFFECTIVE_AT_INVALID"
  );

  assertIsoDate(
    recordedAt,
    "ENTITLEMENT_LIFECYCLE_RECORDED_AT_INVALID"
  );

  if (
    Date.parse(recordedAt) <
    Date.parse(effectiveAt)
  ) {
    fail(
      "ENTITLEMENT_LIFECYCLE_RECORDED_BEFORE_EFFECTIVE"
    );
  }

  assertString(
    eventId,
    "ENTITLEMENT_EVENT_ID_REQUIRED"
  );

  assertString(
    reasonCode,
    "ENTITLEMENT_REASON_REQUIRED",
    128
  );

  assertUniqueStrings(
    evidenceRefs,
    "ENTITLEMENT_LIFECYCLE_EVIDENCE_REFS"
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
        "ENTITLEMENT_EVENT_ALREADY_REGISTERED"
      );
    }

    const registration =
      registrationFor(
        records,
        entitlementRef
      );

    if (!registration) {
      fail(
        "ENTITLEMENT_NOT_FOUND"
      );
    }

    if (
      records.some(
        (record) =>
          record.entitlement_ref ===
            entitlementRef &&
          record.record_type !==
            "ENTITLEMENT_SOURCE_REGISTERED"
      )
    ) {
      fail(
        "ENTITLEMENT_ALREADY_TERMINAL"
      );
    }

    if (
      Date.parse(effectiveAt) <
      Date.parse(
        registration.entitlement
          .effective_from
      )
    ) {
      fail(
        "ENTITLEMENT_LIFECYCLE_BEFORE_EFFECTIVE_FROM"
      );
    }

    if (
      records.length > 0 &&
      Date.parse(recordedAt) <
      Date.parse(
        records[
          records.length - 1
        ].recorded_at
      )
    ) {
      fail(
        "ENTITLEMENT_RECORDED_AT_ORDER_INVALID"
      );
    }

    if (
      recordType ===
        "ENTITLEMENT_SOURCE_SUPERSEDED"
    ) {
      if (
        typeof replacementEntitlementRef !==
          "string" ||
        !ENTITLEMENT_REF_PATTERN.test(
          replacementEntitlementRef
        ) ||
        replacementEntitlementRef ===
          entitlementRef
      ) {
        fail(
          "ENTITLEMENT_REPLACEMENT_INVALID"
        );
      }

      const replacement =
        registrationFor(
          records,
          replacementEntitlementRef
        );

      if (!replacement) {
        fail(
          "ENTITLEMENT_REPLACEMENT_NOT_FOUND"
        );
      }

      if (
        replacement.subject_ref !==
          registration.subject_ref
      ) {
        fail(
          "ENTITLEMENT_REPLACEMENT_SUBJECT_MISMATCH"
        );
      }

      if (
        records.some(
          (record) =>
            record.entitlement_ref ===
              replacementEntitlementRef &&
          record.record_type !==
              "ENTITLEMENT_SOURCE_REGISTERED"
        )
      ) {
        fail(
          "ENTITLEMENT_REPLACEMENT_NOT_ACTIVE"
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

      entitlement_ref:
        entitlementRef,

      subject_ref:
        registration.subject_ref,

      recorded_at:
        recordedAt,

      effective_at:
        effectiveAt,

      replacement_entitlement_ref:
        replacementEntitlementRef,

      reason_code:
        reasonCode,

      evidence_refs:
        clone(evidenceRefs),

      entitlement_sha256:
        registration
          .entitlement_sha256,

      entitlement:
        null,

      previous_record_sha256:
        previous
    };

    const record = {
      ...basis,

      record_sha256:
        sha256Canonical(basis)
    };

    appendDurable(
      registryPath,
      `${JSON.stringify(record)}\n`
    );

    return clone(record);
  } finally {
    releaseLock(lock);
  }
}


export function revokeEntitlementSource({
  registryPath,
  entitlementRef,
  revokedAt,
  recordedAt,
  eventId,
  reasonCode,
  evidenceRefs = []
}) {
  return appendLifecycle({
    registryPath,
    entitlementRef,

    effectiveAt:
      revokedAt,

    recordedAt,
    eventId,
    reasonCode,
    evidenceRefs,

    recordType:
      "ENTITLEMENT_SOURCE_REVOKED",

    replacementEntitlementRef:
      null
  });
}


export function supersedeEntitlementSource({
  registryPath,
  entitlementRef,
  replacementEntitlementRef,
  supersededAt,
  recordedAt,
  eventId,
  reasonCode,
  evidenceRefs = []
}) {
  return appendLifecycle({
    registryPath,
    entitlementRef,

    effectiveAt:
      supersededAt,

    recordedAt,
    eventId,
    reasonCode,
    evidenceRefs,

    recordType:
      "ENTITLEMENT_SOURCE_SUPERSEDED",

    replacementEntitlementRef
  });
}


export function getEntitlementSource({
  registryPath,
  entitlementRef
}) {
  const records =
    parseRegistry(
      registryPath
    );

  const registration =
    registrationFor(
      records,
      entitlementRef
    );

  return registration
    ? clone(registration)
    : null;
}


export function resolveEntitlementSource({
  registryPath,
  entitlementRef,
  asOf
}) {
  if (
    typeof entitlementRef !==
      "string" ||
    !ENTITLEMENT_REF_PATTERN.test(
      entitlementRef
    )
  ) {
    fail(
      "ENTITLEMENT_REF_INVALID"
    );
  }

  assertIsoDate(
    asOf,
    "ENTITLEMENT_AS_OF_INVALID"
  );

  const records =
    parseRegistry(
      registryPath
    );

  const registration =
    registrationFor(
      records,
      entitlementRef
    );

  if (!registration) {
    return null;
  }

  const asOfMs =
    Date.parse(asOf);

  if (
    Date.parse(
      registration.recorded_at
    ) >
    asOfMs
  ) {
    return null;
  }

  const lifecycle =
    lifecycleFor(
      records,
      entitlementRef,
      asOf
    );

  const state =
    lifecycle
      ? lifecycle.record_type ===
          "ENTITLEMENT_SOURCE_REVOKED"
        ? "REVOKED"
        : "SUPERSEDED"
      : "ACTIVE";

  const afterStart =
    asOfMs >=
      Date.parse(
        registration.entitlement
          .effective_from
      );

  const beforeEnd =
    asOfMs <=
      Date.parse(
        registration.entitlement
          .effective_until
      );

  return {
    entitlement:
      clone(
        registration.entitlement
      ),

    entitlement_sha256:
      registration
        .entitlement_sha256,

    registration_record_sha256:
      registration
        .record_sha256,

    revocation_state:
      state,

    lifecycle_event:
      lifecycle
        ? clone(lifecycle)
        : null,

    effective_started:
      afterStart,

    within_effective_window:
      afterStart &&
      beforeEnd,

    source_authenticity_proven:
      false,

    legal_entitlement_proven:
      false,

    authority_created:
      false,

    trusted_external_time:
      false
  };
}


export function listEntitlementSourceEvents({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifyEntitlementSourceRegistry({
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

    registration_is_verification:
      false,

    api_record_is_source_of_power:
      false,

    legal_entitlement_proven:
      false,

    authority_created:
      false,

    source_authenticity_proven:
      false,

    trusted_external_time:
      false,

    external_immutability_proven:
      false
  };
}
