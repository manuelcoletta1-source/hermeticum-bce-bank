import {
  createHash
} from "node:crypto";

import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";


import {
  assertExecutionAdapterCapabilityAuthorized,
  grantExecutionAdapterCapability,
  listExecutionAdapterCapabilityEvents,
  resolveExecutionAdapterCapability,
  revokeExecutionAdapterCapability,
  verifyExecutionAdapterCapabilityRegistry
} from "../protocol/hbce-execution-adapter-capability.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a020b-"
    )
  );


function fail(message) {
  throw new Error(message);
}


function expectError(
  label,
  fn,
  expected
) {
  let actual =
    null;

  try {
    fn();
  } catch (error) {
    actual =
      error.message;
  }

  if (
    actual !==
      expected
  ) {
    fail(
      `${label}:EXPECTED=${expected}:ACTUAL=${actual}`
    );
  }

  console.log(
    `${label}=PASS`
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


function grant({
  eventId,
  grantId,
  adapterId =
    "ADAPTER-A020-BANK",
  target =
    "BANK-SANDBOX-A",
  validFrom =
    "2026-08-24T17:00:00Z",
  validUntil =
    "2026-08-24T20:00:00Z"
}) {
  return {
    schema_version:
      "1.0",

    event_id:
      eventId,

    event_type:
      "GRANTED",

    grant_id:
      grantId,

    adapter_id:
      adapterId,

    capability:
      "INVOKE_EXTERNAL_SYSTEM",

    external_system_reference:
      target,

    valid_from:
      validFrom,

    valid_until:
      validUntil
  };
}


function revocation({
  eventId,
  grantId,
  adapterId =
    "ADAPTER-A020-BANK",
  target =
    "BANK-SANDBOX-A",
  revokedAt,
  reasonCode =
    "OPERATOR_ACTION"
}) {
  return {
    schema_version:
      "1.0",

    event_id:
      eventId,

    event_type:
      "REVOKED",

    grant_id:
      grantId,

    adapter_id:
      adapterId,

    capability:
      "INVOKE_EXTERNAL_SYSTEM",

    external_system_reference:
      target,

    revoked_at:
      revokedAt,

    reason_code:
      reasonCode
  };
}


try {
  const registryPath =
    join(
      root,
      "capability.jsonl"
    );

  /*
   * ===================================================
   * 1. MISSING REGISTRY
   * ===================================================
   */

  expectError(
    "A020B_MISSING_REGISTRY_FAIL_CLOSED",

    () =>
      verifyExecutionAdapterCapabilityRegistry({
        registryPath
      }),

    "EXECUTION_ADAPTER_CAPABILITY_REGISTRY_UNAVAILABLE"
  );


  /*
   * ===================================================
   * 2. REGISTER GRANT
   * ===================================================
   */

  const grantId =
    "ADAPTER-CAPABILITY-GRANT-A020-MAIN";

  const grantRecord =
    grantExecutionAdapterCapability({
      registryPath,

      grant:
        grant({
          eventId:
            "ADAPTER-CAPABILITY-EVENT-A020-GRANT",

          grantId
        }),

      recordedAt:
        "2026-08-24T16:55:00Z",

      recordedBy:
        "IPR-A020-CAPABILITY-ADMIN"
    });


  if (
    grantRecord.event_type !==
      "GRANTED" ||
    grantRecord.grant_id !==
      grantId
  ) {
    fail(
      "A020B_GRANT_RECORD_INVALID"
    );
  }


  console.log(
    "A020B_CAPABILITY_GRANTED=PASS"
  );


  /*
   * ===================================================
   * 3. NOT OBSERVED / NOT YET VALID
   * ===================================================
   */

  const notObserved =
    resolveExecutionAdapterCapability({
      registryPath,
      grantId,

      adapterId:
        "ADAPTER-A020-BANK",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      externalSystemReference:
        "BANK-SANDBOX-A",

      asOf:
        "2026-08-24T16:54:00Z"
    });


  if (
    notObserved.status !==
      "NOT_OBSERVED"
  ) {
    fail(
      "A020B_NOT_OBSERVED_STATE_INVALID"
    );
  }


  console.log(
    "A020B_GRANT_NOT_OBSERVED_BEFORE_RECORD=PASS"
  );


  const notYetValid =
    resolveExecutionAdapterCapability({
      registryPath,
      grantId,

      adapterId:
        "ADAPTER-A020-BANK",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      externalSystemReference:
        "BANK-SANDBOX-A",

      asOf:
        "2026-08-24T16:57:00Z"
    });


  if (
    notYetValid.status !==
      "NOT_YET_VALID"
  ) {
    fail(
      "A020B_NOT_YET_VALID_STATE_INVALID"
    );
  }


  console.log(
    "A020B_VALID_FROM_ENFORCED=PASS"
  );


  /*
   * ===================================================
   * 4. EXACT AUTHORIZATION
   * ===================================================
   */

  const authorized =
    assertExecutionAdapterCapabilityAuthorized({
      registryPath,
      grantId,

      adapterId:
        "ADAPTER-A020-BANK",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      externalSystemReference:
        "BANK-SANDBOX-A",

      asOf:
        "2026-08-24T17:30:00Z"
    });


  if (
    authorized.authorized !==
      true ||
    authorized.capability_authorized !==
      true ||
    authorized.exact_target_authorized !==
      true ||
    authorized.remote_target_authenticity_proven !==
      false ||
    authorized.legal_authority_created !==
      false ||
    authorized.trusted_external_time !==
      false
  ) {
    fail(
      "A020B_AUTHORIZED_STATE_INVALID"
    );
  }


  console.log(
    "A020B_EXACT_CAPABILITY_TARGET_AUTHORIZED=PASS"
  );


  /*
   * ===================================================
   * 5. TARGET SUBSTITUTION
   * ===================================================
   */

  expectError(
    "A020B_TARGET_SUBSTITUTION_DENIED",

    () =>
      assertExecutionAdapterCapabilityAuthorized({
        registryPath,
        grantId,

        adapterId:
          "ADAPTER-A020-BANK",

        capability:
          "INVOKE_EXTERNAL_SYSTEM",

        externalSystemReference:
          "BANK-SANDBOX-B",

        asOf:
          "2026-08-24T17:30:00Z"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_TARGET_MISMATCH"
  );


  /*
   * ===================================================
   * 6. ADAPTER SUBSTITUTION
   * ===================================================
   */

  expectError(
    "A020B_ADAPTER_SUBSTITUTION_DENIED",

    () =>
      assertExecutionAdapterCapabilityAuthorized({
        registryPath,
        grantId,

        adapterId:
          "ADAPTER-A020-SUBSTITUTED",

        capability:
          "INVOKE_EXTERNAL_SYSTEM",

        externalSystemReference:
          "BANK-SANDBOX-A",

        asOf:
          "2026-08-24T17:30:00Z"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_ADAPTER_MISMATCH"
  );


  /*
   * ===================================================
   * 7. CAPABILITY SUBSTITUTION
   * ===================================================
   */

  expectError(
    "A020B_CAPABILITY_SUBSTITUTION_DENIED",

    () =>
      assertExecutionAdapterCapabilityAuthorized({
        registryPath,
        grantId,

        adapterId:
          "ADAPTER-A020-BANK",

        capability:
          "ADMINISTER_EXTERNAL_SYSTEM",

        externalSystemReference:
          "BANK-SANDBOX-A",

        asOf:
          "2026-08-24T17:30:00Z"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_MISMATCH"
  );


  /*
   * ===================================================
   * 8. WILDCARDS DENIED
   * ===================================================
   */

  expectError(
    "A020B_TARGET_WILDCARD_DENIED",

    () =>
      grantExecutionAdapterCapability({
        registryPath,

        grant:
          grant({
            eventId:
              "ADAPTER-CAPABILITY-EVENT-A020-WILDCARD",

            grantId:
              "ADAPTER-CAPABILITY-GRANT-A020-WILDCARD",

            target:
              "BANK-*"
          }),

        recordedAt:
          "2026-08-24T17:10:00Z",

        recordedBy:
          "IPR-A020-CAPABILITY-ADMIN"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_TARGET_WILDCARD_DENIED"
  );


  /*
   * ===================================================
   * 9. EXPIRY
   * ===================================================
   */

  const expired =
    resolveExecutionAdapterCapability({
      registryPath,
      grantId,

      adapterId:
        "ADAPTER-A020-BANK",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      externalSystemReference:
        "BANK-SANDBOX-A",

      asOf:
        "2026-08-24T20:00:00Z"
    });


  if (
    expired.status !==
      "EXPIRED" ||
    expired.authorized !==
      false
  ) {
    fail(
      "A020B_EXPIRY_STATE_INVALID"
    );
  }


  expectError(
    "A020B_EXPIRED_CAPABILITY_DENIED",

    () =>
      assertExecutionAdapterCapabilityAuthorized({
        registryPath,
        grantId,

        adapterId:
          "ADAPTER-A020-BANK",

        capability:
          "INVOKE_EXTERNAL_SYSTEM",

        externalSystemReference:
          "BANK-SANDBOX-A",

        asOf:
          "2026-08-24T20:00:00Z"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_EXPIRED"
  );


  /*
   * ===================================================
   * 10. SEPARATE REVOCABLE GRANT
   * ===================================================
   */

  const revokeGrantId =
    "ADAPTER-CAPABILITY-GRANT-A020-REVOKE";

  grantExecutionAdapterCapability({
    registryPath,

    grant:
      grant({
        eventId:
          "ADAPTER-CAPABILITY-EVENT-A020-REVOKE-GRANT",

        grantId:
          revokeGrantId,

        validFrom:
          "2026-08-24T17:00:00Z",

        validUntil:
          null
      }),

    recordedAt:
      "2026-08-24T17:15:00Z",

    recordedBy:
      "IPR-A020-CAPABILITY-ADMIN"
  });


  revokeExecutionAdapterCapability({
    registryPath,

    revocation:
      revocation({
        eventId:
          "ADAPTER-CAPABILITY-EVENT-A020-REVOKE",

        grantId:
          revokeGrantId,

        revokedAt:
          "2026-08-24T18:00:00Z"
      }),

    recordedAt:
      "2026-08-24T18:05:00Z",

    recordedBy:
      "IPR-A020-CAPABILITY-ADMIN"
  });


  const beforeObserved =
    assertExecutionAdapterCapabilityAuthorized({
      registryPath,
      grantId:
        revokeGrantId,

      adapterId:
        "ADAPTER-A020-BANK",

      capability:
        "INVOKE_EXTERNAL_SYSTEM",

      externalSystemReference:
        "BANK-SANDBOX-A",

      asOf:
        "2026-08-24T18:03:00Z"
    });


  if (
    beforeObserved.authorized !==
      true
  ) {
    fail(
      "A020B_UNOBSERVED_REVOCATION_REWROTE_HISTORY"
    );
  }


  console.log(
    "A020B_UNOBSERVED_REVOCATION_DOES_NOT_REWRITE_HISTORY=PASS"
  );


  expectError(
    "A020B_EFFECTIVE_OBSERVED_REVOCATION_DENIED",

    () =>
      assertExecutionAdapterCapabilityAuthorized({
        registryPath,
        grantId:
          revokeGrantId,

        adapterId:
          "ADAPTER-A020-BANK",

        capability:
          "INVOKE_EXTERNAL_SYSTEM",

        externalSystemReference:
          "BANK-SANDBOX-A",

        asOf:
          "2026-08-24T18:06:00Z"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_REVOKED"
  );


  /*
   * ===================================================
   * 11. UNKNOWN REVOCATION
   * ===================================================
   */

  expectError(
    "A020B_UNKNOWN_GRANT_REVOCATION_DENIED",

    () =>
      revokeExecutionAdapterCapability({
        registryPath,

        revocation:
          revocation({
            eventId:
              "ADAPTER-CAPABILITY-EVENT-A020-UNKNOWN-REVOKE",

            grantId:
              "ADAPTER-CAPABILITY-GRANT-A020-UNKNOWN",

            revokedAt:
              "2026-08-24T18:10:00Z"
          }),

        recordedAt:
          "2026-08-24T18:10:00Z",

        recordedBy:
          "IPR-A020-CAPABILITY-ADMIN"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_GRANT_NOT_REGISTERED"
  );


  /*
   * ===================================================
   * 12. DUPLICATE GRANT / REVOCATION
   * ===================================================
   */

  expectError(
    "A020B_DUPLICATE_GRANT_ID_DENIED",

    () =>
      grantExecutionAdapterCapability({
        registryPath,

        grant:
          grant({
            eventId:
              "ADAPTER-CAPABILITY-EVENT-A020-DUPLICATE",

            grantId
          }),

        recordedAt:
          "2026-08-24T18:10:00Z",

        recordedBy:
          "IPR-A020-CAPABILITY-ADMIN"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_GRANT_ALREADY_REGISTERED"
  );


  expectError(
    "A020B_DUPLICATE_REVOCATION_DENIED",

    () =>
      revokeExecutionAdapterCapability({
        registryPath,

        revocation:
          revocation({
            eventId:
              "ADAPTER-CAPABILITY-EVENT-A020-DUP-REVOKE",

            grantId:
              revokeGrantId,

            revokedAt:
              "2026-08-24T18:10:00Z"
          }),

        recordedAt:
          "2026-08-24T18:10:00Z",

        recordedBy:
          "IPR-A020-CAPABILITY-ADMIN"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_GRANT_ALREADY_REVOKED"
  );


  /*
   * ===================================================
   * 13. BACKDATED APPEND
   * ===================================================
   */

  expectError(
    "A020B_BACKDATED_APPEND_DENIED",

    () =>
      grantExecutionAdapterCapability({
        registryPath,

        grant:
          grant({
            eventId:
              "ADAPTER-CAPABILITY-EVENT-A020-BACKDATED",

            grantId:
              "ADAPTER-CAPABILITY-GRANT-A020-BACKDATED",

            validFrom:
              "2026-08-24T17:00:00Z",

            validUntil:
              null
          }),

        recordedAt:
          "2026-08-24T17:00:00Z",

        recordedBy:
          "IPR-A020-CAPABILITY-ADMIN"
      }),

    "EXECUTION_ADAPTER_CAPABILITY_RECORDED_AT_ORDER_INVALID"
  );


  /*
   * ===================================================
   * 14. CANONICAL VERIFY
   * ===================================================
   */

  const verification =
    verifyExecutionAdapterCapabilityRegistry({
      registryPath
    });


  if (
    verification.valid !==
      true ||
    verification.append_only_chain_verified !==
      true ||
    verification.exact_target_matching !==
      true ||
    verification.trusted_external_time !==
      false
  ) {
    fail(
      "A020B_REGISTRY_VERIFY_INVALID"
    );
  }


  console.log(
    "A020B_CANONICAL_REGISTRY_VERIFY=PASS"
  );


  const events =
    listExecutionAdapterCapabilityEvents({
      registryPath
    });


  if (
    events.length !==
      3
  ) {
    fail(
      `A020B_EVENT_COUNT_INVALID:${events.length}`
    );
  }


  console.log(
    "A020B_LIST_API=PASS"
  );


  /*
   * ===================================================
   * 15. RECORD TAMPER
   * ===================================================
   */

  const tamperPath =
    join(
      root,
      "tamper.jsonl"
    );


  const canonicalLines =
    readFileSync(
      registryPath,
      "utf8"
    )
      .trim()
      .split("\n");


  const tamperedRecord =
    JSON.parse(
      canonicalLines[0]
    );


  tamperedRecord.recorded_by =
    "FORGED-ADMIN";


  writeFileSync(
    tamperPath,
    `${JSON.stringify(tamperedRecord)}\n`,
    "utf8"
  );


  expectError(
    "A020B_RECORD_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterCapabilityRegistry({
        registryPath:
          tamperPath
      }),

    "EXECUTION_ADAPTER_CAPABILITY_RECORD_HASH_INVALID:1"
  );


  /*
   * ===================================================
   * 16. CHAIN TAMPER
   * ===================================================
   */

  const chainPath =
    join(
      root,
      "chain.jsonl"
    );


  const first =
    JSON.parse(
      canonicalLines[0]
    );

  const second =
    JSON.parse(
      canonicalLines[1]
    );


  second.previous_record_sha256 =
    "0".repeat(64);


  const secondBasis = {
    registry_version:
      second.registry_version,

    record_type:
      second.record_type,

    event_id:
      second.event_id,

    event_type:
      second.event_type,

    grant_id:
      second.grant_id,

    adapter_id:
      second.adapter_id,

    capability:
      second.capability,

    external_system_reference:
      second.external_system_reference,

    recorded_at:
      second.recorded_at,

    recorded_by:
      second.recorded_by,

    previous_record_sha256:
      second.previous_record_sha256,

    event_sha256:
      second.event_sha256,

    event:
      second.event
  };


  second.record_sha256 =
    sha256Canonical(
      secondBasis
    );


  writeFileSync(
    chainPath,
    `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`,
    "utf8"
  );


  expectError(
    "A020B_CHAIN_TAMPER_DETECTED",

    () =>
      verifyExecutionAdapterCapabilityRegistry({
        registryPath:
          chainPath
      }),

    "EXECUTION_ADAPTER_CAPABILITY_CHAIN_INVALID:2"
  );


  console.log("");
  console.log(
    "===== A020B FINAL MATRIX ====="
  );

  console.log(
    "CAPABILITY=INVOKE_EXTERNAL_SYSTEM"
  );

  console.log(
    "EXACT_TARGET_MATCH=ENFORCED"
  );

  console.log(
    "TARGET_WILDCARDS=DENIED"
  );

  console.log(
    "TARGET_ALIASES=NOT_SUPPORTED"
  );

  console.log(
    "GRANT_VALID_FROM=ENFORCED"
  );

  console.log(
    "GRANT_VALID_UNTIL=ENFORCED"
  );

  console.log(
    "REVOCATION_EFFECTIVE_AND_OBSERVED=ENFORCED"
  );

  console.log(
    "APPEND_ONLY_RECORD_CHAIN=PASS"
  );

  console.log(
    "CAPABILITY_AUTHORIZATION=TRUE_WHEN_ACTIVE"
  );

  console.log(
    "EXACT_TARGET_AUTHORIZATION=TRUE_WHEN_ACTIVE"
  );

  console.log(
    "REMOTE_TARGET_AUTHENTICITY=FALSE"
  );

  console.log(
    "REMOTE_INSTITUTIONAL_IDENTITY=FALSE"
  );

  console.log(
    "LEGAL_AUTHORITY_CREATED=FALSE"
  );

  console.log(
    "TRUSTED_EXTERNAL_TIME=NO"
  );

  console.log(
    "A020B_ADAPTER_CAPABILITY_TARGET_REGISTRY=PASS"
  );

} finally {
  rmSync(
    root,
    {
      recursive:
        true,

      force:
        true
    }
  );
}
