import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync
} from "node:fs";

import { createHash } from "node:crypto";

const MANDATE_ID_PATTERN =
  /^MANDATE-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

function fail(message) {
  throw new Error(message);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
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
  return JSON.parse(JSON.stringify(value));
}

function assertMandateEnvelope(mandate) {
  if (
    mandate === null ||
    typeof mandate !== "object" ||
    Array.isArray(mandate)
  ) {
    fail("MANDATE_INVALID_OBJECT");
  }

  if (mandate.schema_version !== "1.0") {
    fail("MANDATE_SCHEMA_VERSION_UNSUPPORTED");
  }

  if (
    typeof mandate.mandate_id !== "string" ||
    !MANDATE_ID_PATTERN.test(mandate.mandate_id)
  ) {
    fail("MANDATE_ID_INVALID");
  }

  if (typeof mandate.status !== "string") {
    fail("MANDATE_STATUS_MISSING");
  }

  if (
    mandate.grantor === null ||
    typeof mandate.grantor !== "object"
  ) {
    fail("MANDATE_GRANTOR_MISSING");
  }

  if (
    mandate.grantee === null ||
    typeof mandate.grantee !== "object"
  ) {
    fail("MANDATE_GRANTEE_MISSING");
  }

  if (
    typeof mandate.function !== "string" ||
    mandate.function.length === 0
  ) {
    fail("MANDATE_FUNCTION_MISSING");
  }

  if (
    !Array.isArray(mandate.allowed_actions) ||
    mandate.allowed_actions.length === 0
  ) {
    fail("MANDATE_ALLOWED_ACTIONS_MISSING");
  }

  if (
    mandate.validity === null ||
    typeof mandate.validity !== "object"
  ) {
    fail("MANDATE_VALIDITY_MISSING");
  }

  if (
    mandate.runtime_constraints === null ||
    typeof mandate.runtime_constraints !== "object"
  ) {
    fail("MANDATE_RUNTIME_CONSTRAINTS_MISSING");
  }

  if (
    mandate.revocation === null ||
    typeof mandate.revocation !== "object"
  ) {
    fail("MANDATE_REVOCATION_STATE_MISSING");
  }
}

function parseRegistry(registryPath) {
  if (!existsSync(registryPath)) {
    return [];
  }

  const raw = readFileSync(registryPath, "utf8");

  if (raw.trim() === "") {
    return [];
  }

  const lines = raw.split("\n").filter(Boolean);
  const records = [];

  for (let index = 0; index < lines.length; index += 1) {
    let record;

    try {
      record = JSON.parse(lines[index]);
    } catch {
      fail(`REGISTRY_CORRUPT_JSON_LINE:${index + 1}`);
    }

    if (
      record === null ||
      typeof record !== "object" ||
      typeof record.mandate_id !== "string" ||
      typeof record.mandate_sha256 !== "string" ||
      record.mandate === null ||
      typeof record.mandate !== "object"
    ) {
      fail(`REGISTRY_CORRUPT_RECORD:${index + 1}`);
    }

    const calculatedHash = sha256(
      canonicalize(record.mandate)
    );

    if (calculatedHash !== record.mandate_sha256) {
      fail(`REGISTRY_HASH_MISMATCH:${index + 1}`);
    }

    if (record.mandate_id !== record.mandate.mandate_id) {
      fail(`REGISTRY_ID_MISMATCH:${index + 1}`);
    }

    records.push(record);
  }

  return records;
}

function acquireLock(registryPath) {
  const lockPath = `${registryPath}.lock`;

  let fd;

  try {
    fd = openSync(lockPath, "wx");
  } catch {
    fail("REGISTRY_LOCKED");
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
    if (existsSync(lock.lockPath)) {
      unlinkSync(lock.lockPath);
    }
  }
}

export function registerMandate({
  registryPath,
  mandate,
  recordedAt
}) {
  if (
    typeof registryPath !== "string" ||
    registryPath.length === 0
  ) {
    fail("REGISTRY_PATH_REQUIRED");
  }

  assertMandateEnvelope(mandate);

  if (
    typeof recordedAt !== "string" ||
    Number.isNaN(Date.parse(recordedAt))
  ) {
    fail("RECORDED_AT_INVALID");
  }

  const immutableMandate = deepClone(mandate);

  const lock = acquireLock(registryPath);

  try {
    const records = parseRegistry(registryPath);

    const duplicate = records.some(
      (record) =>
        record.mandate_id === immutableMandate.mandate_id
    );

    if (duplicate) {
      fail("MANDATE_ALREADY_REGISTERED");
    }

    const mandateCanonical =
      canonicalize(immutableMandate);

    const mandateHash =
      sha256(mandateCanonical);

    const record = {
      registry_version: "1.0",
      record_type: "MANDATE_REGISTERED",
      mandate_id: immutableMandate.mandate_id,
      recorded_at: recordedAt,
      mandate_sha256: mandateHash,
      mandate: immutableMandate
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

export function getMandate({
  registryPath,
  mandateId
}) {
  if (
    typeof mandateId !== "string" ||
    !MANDATE_ID_PATTERN.test(mandateId)
  ) {
    fail("MANDATE_ID_INVALID");
  }

  const records = parseRegistry(registryPath);

  const record = records.find(
    (item) => item.mandate_id === mandateId
  );

  if (!record) {
    return null;
  }

  return deepClone(record);
}

export function listMandates({
  registryPath
}) {
  return deepClone(parseRegistry(registryPath));
}

export function verifyMandateRegistry({
  registryPath
}) {
  const records = parseRegistry(registryPath);

  const seen = new Set();

  for (const record of records) {
    if (seen.has(record.mandate_id)) {
      fail("REGISTRY_DUPLICATE_MANDATE_ID");
    }

    seen.add(record.mandate_id);
  }

  return {
    valid: true,
    record_count: records.length
  };
}
