import {
  getMandate,
  verifyMandateRegistry
} from "./hbce-mandate-registry.reference.mjs";

import {
  getRuntime,
  verifyRuntimeRegistry
} from "./hbce-runtime-registry.reference.mjs";

import {
  listRevocations,
  verifyRevocationRegistry
} from "./hbce-revocation.reference.mjs";

import {
  evaluateAuthorization,
  hashCanonicalArtifact
} from "./hbce-authorization-evaluator.reference.mjs";

import {
  listEvts,
  verifyEvtLog
} from "./hbce-evt-integration.reference.mjs";


const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


function fail(code) {
  throw new Error(code);
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
  code
) {
  if (
    typeof value !== "string" ||
    value.length === 0
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


function sameArtifact(
  left,
  right
) {
  return (
    hashCanonicalArtifact(
      left
    ) ===
    hashCanonicalArtifact(
      right
    )
  );
}


function assertTrustedEvaluator(
  eventEvaluator,
  expectedEvaluator
) {
  assertObject(
    eventEvaluator,
    "A010_EVENT_EVALUATOR_INVALID"
  );

  assertObject(
    expectedEvaluator,
    "A010_EXPECTED_EVALUATOR_INVALID"
  );

  assertString(
    expectedEvaluator.evaluator_id,
    "A010_EXPECTED_EVALUATOR_ID_INVALID"
  );

  assertString(
    expectedEvaluator.evaluator_version,
    "A010_EXPECTED_EVALUATOR_VERSION_INVALID"
  );

  assertSha256(
    expectedEvaluator.evaluator_sha256,
    "A010_EXPECTED_EVALUATOR_SHA256_INVALID"
  );

  if (
    eventEvaluator.evaluator_id !==
    expectedEvaluator.evaluator_id
  ) {
    fail(
      "A010_EVALUATOR_ID_MISMATCH"
    );
  }

  if (
    eventEvaluator.evaluator_version !==
    expectedEvaluator.evaluator_version
  ) {
    fail(
      "A010_EVALUATOR_VERSION_MISMATCH"
    );
  }

  if (
    eventEvaluator.evaluator_sha256 !==
    expectedEvaluator.evaluator_sha256
  ) {
    fail(
      "A010_EVALUATOR_SHA256_MISMATCH"
    );
  }
}


function assertReferenceBindings({
  event,
  mandateRecord,
  authority,
  decisionEvidence,
  authorization
}) {
  if (
    event.references.mandate_id !==
      mandateRecord.mandate_id ||
    authorization.mandate_reference !==
      mandateRecord.mandate_id
  ) {
    fail(
      "A010_MANDATE_REFERENCE_MISMATCH"
    );
  }

  if (
    event.references.authority_id !==
      authority.authority_id ||
    authorization.authority_reference !==
      authority.authority_id
  ) {
    fail(
      "A010_AUTHORITY_REFERENCE_MISMATCH"
    );
  }

  if (
    event.references.decision_id !==
      decisionEvidence.decision_id ||
    authorization.decision_reference !==
      decisionEvidence.decision_id
  ) {
    fail(
      "A010_DECISION_REFERENCE_MISMATCH"
    );
  }

  if (
    event.references.authorization_id !==
    authorization.authorization_id
  ) {
    fail(
      "A010_AUTHORIZATION_REFERENCE_MISMATCH"
    );
  }
}


function assertArtifactBindings({
  event,
  mandateRecord,
  runtimeRecord,
  authority,
  decisionEvidence,
  authorization,
  request,
  policyContext
}) {
  if (
    mandateRecord.mandate_sha256 !==
    event.artifact_hashes.mandate_sha256
  ) {
    fail(
      "A010_MANDATE_CONTENT_HASH_MISMATCH"
    );
  }

  if (
    mandateRecord.record_sha256 !==
    event.registry_anchors
      .mandate_record_sha256
  ) {
    fail(
      "A010_MANDATE_RECORD_ANCHOR_MISMATCH"
    );
  }

  if (
    runtimeRecord.runtime_sha256 !==
    event.artifact_hashes.runtime_sha256
  ) {
    fail(
      "A010_RUNTIME_CONTENT_HASH_MISMATCH"
    );
  }

  if (
    runtimeRecord.record_sha256 !==
    event.registry_anchors
      .runtime_record_sha256
  ) {
    fail(
      "A010_RUNTIME_RECORD_ANCHOR_MISMATCH"
    );
  }

  if (
    hashCanonicalArtifact(
      authority
    ) !==
    event.artifact_hashes.authority_sha256
  ) {
    fail(
      "A010_AUTHORITY_HASH_MISMATCH"
    );
  }

  if (
    hashCanonicalArtifact(
      decisionEvidence
    ) !==
    event.artifact_hashes.decision_sha256
  ) {
    fail(
      "A010_DECISION_HASH_MISMATCH"
    );
  }

  if (
    hashCanonicalArtifact(
      authorization
    ) !==
    event.artifact_hashes
      .authorization_sha256
  ) {
    fail(
      "A010_AUTHORIZATION_HASH_MISMATCH"
    );
  }

  if (
    hashCanonicalArtifact(
      policyContext
    ) !==
    event.artifact_hashes
      .policy_context_sha256
  ) {
    fail(
      "A010_POLICY_CONTEXT_HASH_MISMATCH"
    );
  }

  const requestHash =
    hashCanonicalArtifact(
      request
    );

  if (
    requestHash !==
    event.request_sha256
  ) {
    fail(
      "A010_REQUEST_HASH_MISMATCH"
    );
  }

  if (
    authorization.request
      ?.request_sha256 !==
    event.request_sha256
  ) {
    fail(
      "A010_AUTHORIZATION_REQUEST_HASH_MISMATCH"
    );
  }

  if (
    decisionEvidence.request_sha256 !==
    event.request_sha256
  ) {
    fail(
      "A010_DECISION_REQUEST_HASH_MISMATCH"
    );
  }
}


function assertRuntimeEvidence({
  event,
  runtimeRecord,
  authorization
}) {
  assertObject(
    authorization.runtime_binding,
    "A010_AUTHORIZATION_RUNTIME_BINDING_INVALID"
  );

  if (
    !sameArtifact(
      authorization.runtime_binding,
      event.runtime_binding
    )
  ) {
    fail(
      "A010_EVENT_RUNTIME_BINDING_MISMATCH"
    );
  }

  const runtime =
    runtimeRecord.runtime;

  if (
    runtime.runtime_id !==
      event.runtime_binding.runtime_id ||
    runtime.runtime_type !==
      event.runtime_binding.runtime_type ||
    runtime.runtime_version !==
      event.runtime_binding.runtime_version ||
    runtime.runtime_digest_sha256 !==
      event.runtime_binding
        .runtime_digest_sha256
  ) {
    fail(
      "A010_RUNTIME_RECORD_BINDING_MISMATCH"
    );
  }
}


function deriveRevocationPrefix({
  records,
  at
}) {
  assertIsoDate(
    at,
    "A010_EVENT_TIME_INVALID"
  );

  const atMs =
    Date.parse(at);

  const prefix =
    records.filter(
      (record) =>
        Date.parse(
          record.recorded_at
        ) <= atMs
    );

  return {
    record_count:
      prefix.length,

    head_record_sha256:
      prefix.length === 0
        ? null
        : prefix[
            prefix.length - 1
          ].record_sha256
  };
}


function assertRevocationPrefix({
  event,
  revocationRecords
}) {
  const prefix =
    deriveRevocationPrefix({
      records:
        revocationRecords,

      at:
        event.occurred_at
    });

  if (
    prefix.record_count !==
    event.registry_anchors
      .revocation_as_of_record_count
  ) {
    fail(
      "A010_REVOCATION_PREFIX_COUNT_MISMATCH"
    );
  }

  if (
    prefix.head_record_sha256 !==
    event.registry_anchors
      .revocation_as_of_head_record_sha256
  ) {
    fail(
      "A010_REVOCATION_PREFIX_HEAD_MISMATCH"
    );
  }

  return prefix;
}


function assertReplayMatch(
  replay,
  eventResult
) {
  if (
    replay.decision !==
    eventResult.decision
  ) {
    fail(
      "A010_REPLAY_DECISION_MISMATCH"
    );
  }

  if (
    replay.reason_code !==
    eventResult.reason_code
  ) {
    fail(
      "A010_REPLAY_REASON_MISMATCH"
    );
  }

  if (
    !sameArtifact(
      replay.checks,
      eventResult.checks
    )
  ) {
    fail(
      "A010_REPLAY_CHECKS_MISMATCH"
    );
  }
}


export function verifyHistoricalAuthorization({
  evtLogPath,
  evtId,

  mandateRegistryPath,
  runtimeRegistryPath,
  revocationRegistryPath,

  authority,
  decisionEvidence,
  authorization,
  request,
  policyContext = {},

  expectedEvaluator
}) {
  assertString(
    evtLogPath,
    "A010_EVT_LOG_PATH_REQUIRED"
  );

  assertString(
    evtId,
    "A010_EVT_ID_REQUIRED"
  );

  assertString(
    mandateRegistryPath,
    "A010_MANDATE_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    runtimeRegistryPath,
    "A010_RUNTIME_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    revocationRegistryPath,
    "A010_REVOCATION_REGISTRY_PATH_REQUIRED"
  );

  assertObject(
    authority,
    "A010_AUTHORITY_INVALID"
  );

  assertObject(
    decisionEvidence,
    "A010_DECISION_EVIDENCE_INVALID"
  );

  assertObject(
    authorization,
    "A010_AUTHORIZATION_INVALID"
  );

  assertObject(
    request,
    "A010_REQUEST_INVALID"
  );

  assertObject(
    policyContext,
    "A010_POLICY_CONTEXT_INVALID"
  );


  /*
   * 1. EVT INTEGRITY
   */

  const evtVerification =
    verifyEvtLog({
      logPath:
        evtLogPath
    });

  if (
    evtVerification.valid !==
    true
  ) {
    fail(
      "A010_EVT_LOG_INVALID"
    );
  }

  const evtRecords =
    listEvts({
      logPath:
        evtLogPath
    });

  const evtRecord =
    evtRecords.find(
      (record) =>
        record.evt_id ===
        evtId
    );

  if (!evtRecord) {
    fail(
      "A010_EVT_NOT_FOUND"
    );
  }

  const event =
    evtRecord.event;

  if (
    event.schema_version !==
    "1.2"
  ) {
    fail(
      "A010_EVT_1_2_REQUIRED"
    );
  }

  if (
    event.evt_type !==
    "AUTHORIZATION_EVALUATED"
  ) {
    fail(
      "A010_EVT_TYPE_INVALID"
    );
  }

  assertIsoDate(
    event.occurred_at,
    "A010_EVENT_TIME_INVALID"
  );


  /*
   * A010 verifies a historical positive authorization.
   * It does not claim complete replayability of every
   * possible DENY cause.
   */

  if (
    event.result.decision !==
      "ALLOW" ||
    event.result.reason_code !==
      "AUTHORIZED"
  ) {
    fail(
      "A010_ALLOW_EVENT_REQUIRED"
    );
  }


  /*
   * 2. TRUSTED EVALUATOR BINDING
   */

  assertTrustedEvaluator(
    event.evaluator,
    expectedEvaluator
  );


  /*
   * 3. REGISTRY INTEGRITY
   */

  const mandateRegistryVerification =
    verifyMandateRegistry({
      registryPath:
        mandateRegistryPath
    });

  if (
    mandateRegistryVerification.valid !==
    true
  ) {
    fail(
      "A010_MANDATE_REGISTRY_INVALID"
    );
  }


  const runtimeRegistryVerification =
    verifyRuntimeRegistry({
      registryPath:
        runtimeRegistryPath
    });

  if (
    runtimeRegistryVerification.valid !==
    true
  ) {
    fail(
      "A010_RUNTIME_REGISTRY_INVALID"
    );
  }


  const revocationRegistryVerification =
    verifyRevocationRegistry({
      registryPath:
        revocationRegistryPath
    });

  if (
    revocationRegistryVerification.valid !==
    true
  ) {
    fail(
      "A010_REVOCATION_REGISTRY_INVALID"
    );
  }


  /*
   * 4. EXACT MANDATE / RUNTIME RECORDS
   */

  const mandateRecord =
    getMandate({
      registryPath:
        mandateRegistryPath,

      mandateId:
        event.references.mandate_id
    });

  if (!mandateRecord) {
    fail(
      "A010_MANDATE_NOT_FOUND"
    );
  }


  const runtimeRecord =
    getRuntime({
      registryPath:
        runtimeRegistryPath,

      runtimeId:
        event.runtime_binding.runtime_id
    });

  if (!runtimeRecord) {
    fail(
      "A010_RUNTIME_NOT_FOUND"
    );
  }


  const eventTimeMs =
    Date.parse(
      event.occurred_at
    );

  if (
    Date.parse(
      mandateRecord.recorded_at
    ) > eventTimeMs
  ) {
    fail(
      "A010_MANDATE_RECORDED_AFTER_EVT"
    );
  }

  if (
    Date.parse(
      runtimeRecord.recorded_at
    ) > eventTimeMs
  ) {
    fail(
      "A010_RUNTIME_RECORDED_AFTER_EVT"
    );
  }


  /*
   * 5. ID / CONTENT / ENVELOPE BINDINGS
   */

  assertReferenceBindings({
    event,
    mandateRecord,
    authority,
    decisionEvidence,
    authorization
  });

  assertArtifactBindings({
    event,
    mandateRecord,
    runtimeRecord,
    authority,
    decisionEvidence,
    authorization,
    request,
    policyContext
  });

  assertRuntimeEvidence({
    event,
    runtimeRecord,
    authorization
  });


  /*
   * 6. REVOCATION PREFIX AS OBSERVABLE AT EVT T
   */

  const revocationRecords =
    listRevocations({
      registryPath:
        revocationRegistryPath
    });

  const revocationPrefix =
    assertRevocationPrefix({
      event,
      revocationRecords
    });


  /*
   * 7. HISTORICAL A008 REPLAY
   *
   * event.runtime_binding is acceptable as presented
   * runtime binding for a positive historical event:
   * A008 requires presented == authorization binding
   * before ALLOW can occur.
   */

  const replay =
    evaluateAuthorization({
      mandateRegistryPath,
      runtimeRegistryPath,
      revocationRegistryPath,

      authority,
      authorization,
      decisionEvidence,
      request,

      presentedRuntimeBinding:
        event.runtime_binding,

      policyContext,

      now:
        event.occurred_at
    });


  assertReplayMatch(
    replay,
    event.result
  );


  /*
   * 8. MINIMIZED VERIFICATION RECEIPT
   *
   * No raw request, raw policy context, banking amount,
   * beneficiary or personal payload is emitted.
   */

  return {
    valid:
      true,

    evaluation_verified:
      true,

    historical_decision:
      "ALLOW",

    historical_authorization_verified:
      true,

    current_executability_not_evaluated:
      true,

    execution_not_verified:
      true,

    legal_conformity_not_evaluated:
      true,

    evt_id:
      event.evt_id,

    evt_sha256:
      evtRecord.evt_sha256,

    occurred_at:
      event.occurred_at,

    references: {
      mandate_id:
        event.references.mandate_id,

      authority_id:
        event.references.authority_id,

      decision_id:
        event.references.decision_id,

      authorization_id:
        event.references.authorization_id,

      runtime_id:
        event.runtime_binding.runtime_id
    },

    evaluator: {
      evaluator_id:
        event.evaluator.evaluator_id,

      evaluator_version:
        event.evaluator.evaluator_version,

      evaluator_sha256:
        event.evaluator.evaluator_sha256
    },

    evidence_anchors: {
      mandate_sha256:
        event.artifact_hashes
          .mandate_sha256,

      mandate_record_sha256:
        event.registry_anchors
          .mandate_record_sha256,

      runtime_sha256:
        event.artifact_hashes
          .runtime_sha256,

      runtime_record_sha256:
        event.registry_anchors
          .runtime_record_sha256,

      revocation_as_of_record_count:
        revocationPrefix.record_count,

      revocation_as_of_head_record_sha256:
        revocationPrefix
          .head_record_sha256
    },

    verification_checks: [
      "EVT_LOG_INTEGRITY",
      "EVT_1_2",
      "TRUSTED_EVALUATOR_BOUND",
      "MANDATE_REGISTRY_INTEGRITY",
      "RUNTIME_REGISTRY_INTEGRITY",
      "REVOCATION_REGISTRY_INTEGRITY",
      "MANDATE_CONTENT_BOUND",
      "MANDATE_RECORD_BOUND",
      "RUNTIME_CONTENT_BOUND",
      "RUNTIME_RECORD_BOUND",
      "AUTHORITY_BOUND",
      "DECISION_BOUND",
      "AUTHORIZATION_BOUND",
      "REQUEST_BOUND",
      "POLICY_CONTEXT_BOUND",
      "RUNTIME_BINDING_BOUND",
      "REVOCATION_PREFIX_BOUND",
      "A008_HISTORICAL_REPLAY_MATCH"
    ]
  };
}
