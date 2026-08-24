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


const EVENT_ID_PATTERN =
  /^ADAPTER-CAPABILITY-EVENT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const GRANT_ID_PATTERN =
  /^ADAPTER-CAPABILITY-GRANT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const ADAPTER_ID_PATTERN =
  /^ADAPTER-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const CAPABILITY =
  "INVOKE_EXTERNAL_SYSTEM";

const EVENT_TYPES =
  new Set([
    "GRANTED",
    "REVOKED"
  ]);

const REVOCATION_REASON_CODES =
  new Set([
    "POLICY_CHANGE",
    "SECURITY_INCIDENT",
    "ADAPTER_COMPROMISE",
    "TARGET_WITHDRAWN",
    "OPERATOR_ACTION",
    "ROTATION",
    "OTHER"
  ]);

const GRANTED_EVENT_KEYS =
  new Set([
    "schema_version",
    "event_id",
    "event_type",
    "grant_id",
    "adapter_id",
    "capability",
    "external_system_reference",
    "valid_from",
    "valid_until"
  ]);

const REVOKED_EVENT_KEYS =
  new Set([
    "schema_version",
    "event_id",
    "event_type",
    "grant_id",
    "adapter_id",
    "capability",
    "external_system_reference",
    "revoked_at",
    "reason_code"
  ]);

const RECORD_KEYS =
  new Set([
    "registry_version",
    "record_type",
    "event_id",
    "event_type",
    "grant_id",
    "adapter_id",
    "capability",
    "external_system_reference",
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
    typeof value !==
      "object" ||
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
    typeof value !==
      "string" ||
    value.length ===
      0 ||
    value.length >
      maxLength
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


function assertAdapterId(
  value
) {
  if (
    typeof value !==
      "string" ||
    !ADAPTER_ID_PATTERN.test(value)
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_ADAPTER_ID_INVALID"
    );
  }
}


function assertGrantId(
  value
) {
  if (
    typeof value !==
      "string" ||
    !GRANT_ID_PATTERN.test(value)
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_GRANT_ID_INVALID"
    );
  }
}


function assertExactTarget(
  value
) {
  assertString(
    value,
    "EXECUTION_ADAPTER_CAPABILITY_TARGET_INVALID"
  );

  if (
    value.includes("*") ||
    value.includes("?")
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_TARGET_WILDCARD_DENIED"
    );
  }
}


function assertCommonEvent(
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
      "EXECUTION_ADAPTER_CAPABILITY_EVENT_ID_INVALID"
    );
  }

  assertGrantId(
    event.grant_id
  );

  assertAdapterId(
    event.adapter_id
  );

  if (
    event.capability !==
      CAPABILITY
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_VALUE_INVALID"
    );
  }

  assertExactTarget(
    event.external_system_reference
  );
}


function assertGrantedEvent(
  event
) {
  assertExactKeys(
    event,
    GRANTED_EVENT_KEYS,
    "EXECUTION_ADAPTER_CAPABILITY_GRANTED_EVENT"
  );

  if (
    event.schema_version !==
      "1.0" ||
    event.event_type !==
      "GRANTED"
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_GRANTED_EVENT_VERSION_TYPE_INVALID"
    );
  }

  assertCommonEvent(
    event
  );

  assertIsoDate(
    event.valid_from,
    "EXECUTION_ADAPTER_CAPABILITY_VALID_FROM_INVALID"
  );

  if (
    event.valid_until !==
      null
  ) {
    assertIsoDate(
      event.valid_until,
      "EXECUTION_ADAPTER_CAPABILITY_VALID_UNTIL_INVALID"
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
        "EXECUTION_ADAPTER_CAPABILITY_VALIDITY_WINDOW_INVALID"
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
    "EXECUTION_ADAPTER_CAPABILITY_REVOKED_EVENT"
  );

  if (
    event.schema_version !==
      "1.0" ||
    event.event_type !==
      "REVOKED"
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOKED_EVENT_VERSION_TYPE_INVALID"
    );
  }

  assertCommonEvent(
    event
  );

  assertIsoDate(
    event.revoked_at,
    "EXECUTION_ADAPTER_CAPABILITY_REVOKED_AT_INVALID"
  );

  if (
    !REVOCATION_REASON_CODES.has(
      event.reason_code
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOCATION_REASON_INVALID"
    );
  }
}


function assertEvent(
  event
) {
  assertObject(
    event,
    "EXECUTION_ADAPTER_CAPABILITY_EVENT_INVALID"
  );

  if (
    !EVENT_TYPES.has(
      event.event_type
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_EVENT_TYPE_INVALID"
    );
  }

  if (
    event.event_type ===
      "GRANTED"
  ) {
    assertGrantedEvent(
      event
    );

    return;
  }

  assertRevokedEvent(
    event
  );
}


function grantRecordForId(
  records,
  grantId
) {
  return records.find(
    (record) =>
      record.event_type ===
        "GRANTED" &&
      record.grant_id ===
        grantId
  ) || null;
}


function revocationRecordForId(
  records,
  grantId
) {
  return records.find(
    (record) =>
      record.event_type ===
        "REVOKED" &&
      record.grant_id ===
        grantId
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
      "EXECUTION_ADAPTER_CAPABILITY_EVENT_ALREADY_REGISTERED"
    );
  }

  if (
    event.event_type ===
      "GRANTED"
  ) {
    if (
      grantRecordForId(
        records,
        event.grant_id
      )
    ) {
      fail(
        "EXECUTION_ADAPTER_CAPABILITY_GRANT_ALREADY_REGISTERED"
      );
    }

    return;
  }

  const granted =
    grantRecordForId(
      records,
      event.grant_id
    );

  if (!granted) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_GRANT_NOT_REGISTERED"
    );
  }

  if (
    granted.adapter_id !==
      event.adapter_id
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOCATION_ADAPTER_MISMATCH"
    );
  }

  if (
    granted.capability !==
      event.capability
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOCATION_CAPABILITY_MISMATCH"
    );
  }

  if (
    granted.external_system_reference !==
      event.external_system_reference
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOCATION_TARGET_MISMATCH"
    );
  }

  if (
    revocationRecordForId(
      records,
      event.grant_id
    )
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_GRANT_ALREADY_REVOKED"
    );
  }
}


function parseRegistry(
  registryPath,
  {
    allowMissing =
      false
  } = {}
) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_PATH_REQUIRED"
  );

  if (
    !existsSync(
      registryPath
    )
  ) {
    if (allowMissing) {
      return [];
    }

    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_UNAVAILABLE"
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

  let previousRecordSha256 =
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
        `EXECUTION_ADAPTER_CAPABILITY_REGISTRY_JSON_INVALID:${lineNumber}`
      );
    }

    assertExactKeys(
      record,
      RECORD_KEYS,
      `EXECUTION_ADAPTER_CAPABILITY_REGISTRY_RECORD:${lineNumber}`
    );

    if (
      record.registry_version !==
        "1.0" ||
      record.record_type !==
        "EXECUTION_ADAPTER_CAPABILITY_EVENT_RECORDED"
    ) {
      fail(
        `EXECUTION_ADAPTER_CAPABILITY_RECORD_TYPE_INVALID:${lineNumber}`
      );
    }

    assertIsoDate(
      record.recorded_at,
      `EXECUTION_ADAPTER_CAPABILITY_RECORDED_AT_INVALID:${lineNumber}`
    );

    assertString(
      record.recorded_by,
      `EXECUTION_ADAPTER_CAPABILITY_RECORDED_BY_INVALID:${lineNumber}`
    );

    if (
      record.previous_record_sha256 !==
        previousRecordSha256
    ) {
      fail(
        `EXECUTION_ADAPTER_CAPABILITY_CHAIN_INVALID:${lineNumber}`
      );
    }

    assertEvent(
      record.event
    );

    if (
      record.event_id !==
        record.event.event_id ||
      record.event_type !==
        record.event.event_type ||
      record.grant_id !==
        record.event.grant_id ||
      record.adapter_id !==
        record.event.adapter_id ||
      record.capability !==
        record.event.capability ||
      record.external_system_reference !==
        record.event.external_system_reference
    ) {
      fail(
        `EXECUTION_ADAPTER_CAPABILITY_ENVELOPE_MISMATCH:${lineNumber}`
      );
    }

    const eventSha256 =
      sha256Canonical(
        record.event
      );

    if (
      eventSha256 !==
        record.event_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_CAPABILITY_EVENT_HASH_INVALID:${lineNumber}`
      );
    }

    const basis = {
      registry_version:
        record.registry_version,

      record_type:
        record.record_type,

      event_id:
        record.event_id,

      event_type:
        record.event_type,

      grant_id:
        record.grant_id,

      adapter_id:
        record.adapter_id,

      capability:
        record.capability,

      external_system_reference:
        record.external_system_reference,

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

    if (
      sha256Canonical(
        basis
      ) !==
      record.record_sha256
    ) {
      fail(
        `EXECUTION_ADAPTER_CAPABILITY_RECORD_HASH_INVALID:${lineNumber}`
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
        `EXECUTION_ADAPTER_CAPABILITY_CHRONOLOGY_INVALID:${lineNumber}`
      );
    }

    assertEventAgainstHistory(
      records,
      record.event
    );

    records.push(
      record
    );

    previousRecordSha256 =
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
      "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_LOCKED"
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


function appendEvent({
  registryPath,
  event,
  recordedAt,
  recordedBy
}) {
  assertString(
    registryPath,
    "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_PATH_REQUIRED"
  );

  assertEvent(
    event
  );

  assertIsoDate(
    recordedAt,
    "EXECUTION_ADAPTER_CAPABILITY_RECORDED_AT_INVALID"
  );

  assertString(
    recordedBy,
    "EXECUTION_ADAPTER_CAPABILITY_RECORDED_BY_INVALID"
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
      "EXECUTION_ADAPTER_CAPABILITY_REVOCATION_RECORDED_BEFORE_EFFECTIVE_TIME"
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
        "EXECUTION_ADAPTER_CAPABILITY_RECORDED_AT_ORDER_INVALID"
      );
    }

    assertEventAgainstHistory(
      records,
      immutableEvent
    );

    const previousRecordSha256 =
      records.length ===
        0
        ? null
        : records[
            records.length - 1
          ].record_sha256;

    const eventSha256 =
      sha256Canonical(
        immutableEvent
      );

    const basis = {
      registry_version:
        "1.0",

      record_type:
        "EXECUTION_ADAPTER_CAPABILITY_EVENT_RECORDED",

      event_id:
        immutableEvent.event_id,

      event_type:
        immutableEvent.event_type,

      grant_id:
        immutableEvent.grant_id,

      adapter_id:
        immutableEvent.adapter_id,

      capability:
        immutableEvent.capability,

      external_system_reference:
        immutableEvent
          .external_system_reference,

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
      ...basis,

      record_sha256:
        sha256Canonical(
          basis
        )
    };

    const fd =
      openSync(
        registryPath,
        "a"
      );

    try {
      writeSync(
        fd,
        `${JSON.stringify(record)}\n`,
        null,
        "utf8"
      );

      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }

    return clone(
      record
    );

  } finally {
    releaseLock(
      lock
    );
  }
}


export function grantExecutionAdapterCapability({
  registryPath,
  grant,
  recordedAt,
  recordedBy
}) {
  if (
    grant ===
      null ||
    typeof grant !==
      "object" ||
    Array.isArray(grant) ||
    grant.event_type !==
      "GRANTED"
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_GRANTED_EVENT_REQUIRED"
    );
  }

  return appendEvent({
    registryPath,
    event:
      grant,
    recordedAt,
    recordedBy
  });
}


export function revokeExecutionAdapterCapability({
  registryPath,
  revocation,
  recordedAt,
  recordedBy
}) {
  if (
    revocation ===
      null ||
    typeof revocation !==
      "object" ||
    Array.isArray(
      revocation
    ) ||
    revocation.event_type !==
      "REVOKED"
  ) {
    fail(
      "EXECUTION_ADAPTER_CAPABILITY_REVOKED_EVENT_REQUIRED"
    );
  }

  return appendEvent({
    registryPath,
    event:
      revocation,
    recordedAt,
    recordedBy
  });
}


export function listExecutionAdapterCapabilityEvents({
  registryPath
}) {
  return clone(
    parseRegistry(
      registryPath
    )
  );
}


export function verifyExecutionAdapterCapabilityRegistry({
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

    append_only_chain_verified:
      true,

    exact_target_matching:
      true,

    capability_vocabulary:
      [
        CAPABILITY
      ],

    registry_administrator_authenticity_proven:
      false,

    external_immutability_proven:
      false,

    trusted_external_time:
      false
  };
}


export function resolveExecutionAdapterCapability({
  registryPath,
  grantId,
  adapterId,
  capability,
  externalSystemReference,
  asOf
}) {
  assertGrantId(
    grantId
  );

  assertAdapterId(
    adapterId
  );

  if (
    capability !==
      CAPABILITY
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "CAPABILITY_MISMATCH",

      authorized:
        false
    };
  }

  assertExactTarget(
    externalSystemReference
  );

  assertIsoDate(
    asOf,
    "EXECUTION_ADAPTER_CAPABILITY_AS_OF_INVALID"
  );

  const records =
    parseRegistry(
      registryPath
    );

  const grant =
    grantRecordForId(
      records,
      grantId
    );

  if (!grant) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "NOT_REGISTERED",

      authorized:
        false
    };
  }

  if (
    grant.adapter_id !==
      adapterId
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "ADAPTER_MISMATCH",

      authorized:
        false
    };
  }

  if (
    grant.capability !==
      capability
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "CAPABILITY_MISMATCH",

      authorized:
        false
    };
  }

  if (
    grant.external_system_reference !==
      externalSystemReference
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "TARGET_MISMATCH",

      authorized:
        false
    };
  }

  if (
    Date.parse(
      grant.recorded_at
    ) >
    Date.parse(
      asOf
    )
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "NOT_OBSERVED",

      authorized:
        false
    };
  }

  if (
    Date.parse(
      asOf
    ) <
    Date.parse(
      grant.event.valid_from
    )
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "NOT_YET_VALID",

      authorized:
        false
    };
  }

  const revocation =
    revocationRecordForId(
      records,
      grantId
    );

  const revoked =
    revocation !==
      null &&
    Date.parse(
      revocation.event.revoked_at
    ) <=
    Date.parse(
      asOf
    ) &&
    Date.parse(
      revocation.recorded_at
    ) <=
    Date.parse(
      asOf
    );

  if (revoked) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "REVOKED",

      authorized:
        false,

      grant_record_sha256:
        grant.record_sha256,

      revocation_record_sha256:
        revocation.record_sha256
    };
  }

  if (
    grant.event.valid_until !==
      null &&
    Date.parse(
      asOf
    ) >=
    Date.parse(
      grant.event.valid_until
    )
  ) {
    return {
      grant_id:
        grantId,

      adapter_id:
        adapterId,

      capability,

      external_system_reference:
        externalSystemReference,

      as_of:
        asOf,

      status:
        "EXPIRED",

      authorized:
        false,

      grant_record_sha256:
        grant.record_sha256
    };
  }

  return {
    grant_id:
      grantId,

    adapter_id:
      adapterId,

    capability,

    external_system_reference:
      externalSystemReference,

    as_of:
      asOf,

    status:
      "AUTHORIZED",

    authorized:
      true,

    capability_authorized:
      true,

    exact_target_authorized:
      true,

    grant_record_sha256:
      grant.record_sha256,

    valid_from:
      grant.event.valid_from,

    valid_until:
      grant.event.valid_until,

    target_aliases_allowed:
      false,

    target_wildcards_allowed:
      false,

    remote_target_authenticity_proven:
      false,

    remote_institutional_identity_proven:
      false,

    legal_authority_created:
      false,

    trusted_external_time:
      false
  };
}


export function assertExecutionAdapterCapabilityAuthorized({
  registryPath,
  grantId,
  adapterId,
  capability,
  externalSystemReference,
  asOf
}) {
  const state =
    resolveExecutionAdapterCapability({
      registryPath,
      grantId,
      adapterId,
      capability,
      externalSystemReference,
      asOf
    });

  if (
    state.status !==
      "AUTHORIZED"
  ) {
    const reasonCodes = {
      NOT_REGISTERED:
        "EXECUTION_ADAPTER_CAPABILITY_GRANT_NOT_REGISTERED",

      ADAPTER_MISMATCH:
        "EXECUTION_ADAPTER_CAPABILITY_ADAPTER_MISMATCH",

      CAPABILITY_MISMATCH:
        "EXECUTION_ADAPTER_CAPABILITY_MISMATCH",

      TARGET_MISMATCH:
        "EXECUTION_ADAPTER_CAPABILITY_TARGET_MISMATCH",

      NOT_OBSERVED:
        "EXECUTION_ADAPTER_CAPABILITY_NOT_OBSERVED",

      NOT_YET_VALID:
        "EXECUTION_ADAPTER_CAPABILITY_NOT_YET_VALID",

      REVOKED:
        "EXECUTION_ADAPTER_CAPABILITY_REVOKED",

      EXPIRED:
        "EXECUTION_ADAPTER_CAPABILITY_EXPIRED"
    };

    fail(
      reasonCodes[
        state.status
      ] ||
      "EXECUTION_ADAPTER_CAPABILITY_NOT_AUTHORIZED"
    );
  }

  return clone(
    state
  );
}
