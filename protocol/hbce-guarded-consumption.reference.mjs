import {
  verifyRevocationRegistry
} from "./hbce-revocation.reference.mjs";

import {
  evaluateAuthorization
} from "./hbce-authorization-evaluator.reference.mjs";

import {
  verifyHistoricalAuthorization
} from "./hbce-verify-authorization.reference.mjs";

import {
  assertAuthorizationNotConsumed,
  consumeAuthorization,
  getAuthorizationConsumption,
  verifyAuthorizationConsumptionRegistry
} from "./hbce-authorization-consumption.reference.mjs";


const AUTHORIZED_CHECKS =
  Object.freeze([
    "MANDATE_VALID",
    "AUTHORITY_VALID",
    "AUTHORIZATION_VALID",
    "REQUEST_WITHIN_SCOPE",
    "DECISION_BOUND",
    "SUBJECT_BOUND",
    "RUNTIME_VALID",
    "REVOCATION_CLEAR"
  ]);


function fail(code) {
  throw new Error(code);
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


function sameRevocationSnapshot(
  left,
  right
) {
  return (
    left.valid === true &&
    right.valid === true &&
    left.record_count ===
      right.record_count &&
    left.head_record_sha256 ===
      right.head_record_sha256
  );
}


function assertCurrentAllow(
  result
) {
  if (
    result === null ||
    typeof result !== "object"
  ) {
    fail(
      "GUARDED_CURRENT_EVALUATION_INVALID"
    );
  }

  if (
    result.decision !==
      "ALLOW" ||
    result.reason_code !==
      "AUTHORIZED"
  ) {
    fail(
      "GUARDED_CURRENT_AUTHORIZATION_DENIED"
    );
  }

  if (
    !Array.isArray(
      result.checks
    ) ||
    result.checks.length !==
      AUTHORIZED_CHECKS.length
  ) {
    fail(
      "GUARDED_CURRENT_CHECKS_INVALID"
    );
  }

  for (
    let index = 0;
    index < AUTHORIZED_CHECKS.length;
    index += 1
  ) {
    if (
      result.checks[index] !==
      AUTHORIZED_CHECKS[index]
    ) {
      fail(
        "GUARDED_CURRENT_CHECKS_INVALID"
      );
    }
  }
}


export function guardedConsumeAuthorization({
  evtLogPath,
  evtId,

  mandateRegistryPath,
  runtimeRegistryPath,
  revocationRegistryPath,
  consumptionRegistryPath,

  consumptionId,
  consumedBy,

  authority,
  decisionEvidence,
  authorization,
  request,
  policyContext = {},

  expectedEvaluator
}) {
  assertString(
    evtLogPath,
    "GUARDED_EVT_LOG_PATH_REQUIRED"
  );

  assertString(
    evtId,
    "GUARDED_EVT_ID_REQUIRED"
  );

  assertString(
    mandateRegistryPath,
    "GUARDED_MANDATE_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    runtimeRegistryPath,
    "GUARDED_RUNTIME_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    revocationRegistryPath,
    "GUARDED_REVOCATION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    consumptionRegistryPath,
    "GUARDED_CONSUMPTION_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    consumptionId,
    "GUARDED_CONSUMPTION_ID_REQUIRED"
  );

  assertString(
    consumedBy,
    "GUARDED_CONSUMED_BY_REQUIRED"
  );

  assertObject(
    authority,
    "GUARDED_AUTHORITY_INVALID"
  );

  assertObject(
    decisionEvidence,
    "GUARDED_DECISION_EVIDENCE_INVALID"
  );

  assertObject(
    authorization,
    "GUARDED_AUTHORIZATION_INVALID"
  );

  assertObject(
    request,
    "GUARDED_REQUEST_INVALID"
  );

  assertObject(
    policyContext,
    "GUARDED_POLICY_CONTEXT_INVALID"
  );

  assertObject(
    expectedEvaluator,
    "GUARDED_EXPECTED_EVALUATOR_INVALID"
  );


  /*
   * 1. HISTORICAL PROOF
   *
   * The event must first be proven as an authentic
   * reconstructible historical ALLOW.
   */

  const historical =
    verifyHistoricalAuthorization({
      evtLogPath,
      evtId,

      mandateRegistryPath,
      runtimeRegistryPath,
      revocationRegistryPath,

      authority,
      decisionEvidence,
      authorization,
      request,
      policyContext,

      expectedEvaluator
    });


  if (
    historical.valid !== true ||
    historical
      .historical_authorization_verified !==
      true
  ) {
    fail(
      "GUARDED_HISTORICAL_VERIFICATION_FAILED"
    );
  }


  /*
   * 2. CONSUMPTION REGISTRY MUST ALREADY EXIST
   *    AND BE VALID.
   *
   * A guarded execution boundary does not silently
   * create its anti-replay state store.
   */

  const consumptionBefore =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    consumptionBefore.valid !==
    true
  ) {
    fail(
      "GUARDED_CONSUMPTION_REGISTRY_INVALID"
    );
  }


  assertAuthorizationNotConsumed({
    registryPath:
      consumptionRegistryPath,

    authorization
  });


  /*
   * 3. CAPTURE CURRENT REVOCATION STATE.
   */

  const revocationBefore =
    verifyRevocationRegistry({
      registryPath:
        revocationRegistryPath
    });


  if (
    revocationBefore.valid !==
    true
  ) {
    fail(
      "GUARDED_REVOCATION_REGISTRY_INVALID"
    );
  }


  /*
   * 4. CLAIM TIME IS INTERNAL.
   *
   * The caller is deliberately not allowed to supply
   * consumedAt. This prevents ordinary caller-controlled
   * backdating of the current authorization recheck.
   *
   * This is still local system time, not an externally
   * trusted or certified timestamp.
   */

  const claimAt =
    new Date().toISOString();


  if (
    Date.parse(
      claimAt
    ) <
    Date.parse(
      historical.occurred_at
    )
  ) {
    fail(
      "GUARDED_LOCAL_CLOCK_BEFORE_HISTORICAL_EVENT"
    );
  }


  /*
   * 5. CURRENT AUTHORIZATION RECHECK.
   *
   * Historical validity is not current validity.
   */

  const currentResult =
    evaluateAuthorization({
      mandateRegistryPath,
      runtimeRegistryPath,
      revocationRegistryPath,

      authority,
      authorization,
      decisionEvidence,
      request,

      presentedRuntimeBinding:
        authorization.runtime_binding,

      policyContext,

      now:
        claimAt
    });


  assertCurrentAllow(
    currentResult
  );


  /*
   * 6. REVOCATION STATE MUST NOT CHANGE WHILE THE
   *    CURRENT RECHECK IS BEING PERFORMED.
   */

  const revocationAfterRecheck =
    verifyRevocationRegistry({
      registryPath:
        revocationRegistryPath
    });


  if (
    !sameRevocationSnapshot(
      revocationBefore,
      revocationAfterRecheck
    )
  ) {
    fail(
      "GUARDED_REVOCATION_STATE_CHANGED_BEFORE_CLAIM"
    );
  }


  /*
   * 7. SINGLE-USE CLAIM.
   *
   * The exact EVT hash comes from A010 verification,
   * not from caller input.
   */

  const consumptionRecord =
    consumeAuthorization({
      registryPath:
        consumptionRegistryPath,

      consumptionId,

      authorization,

      evaluationEvtId:
        historical.evt_id,

      evaluationEvtSha256:
        historical.evt_sha256,

      consumedAt:
        claimAt,

      consumedBy
    });


  /*
   * 8. OPTIMISTIC REVOCATION TOCTOU DETECTION.
   *
   * If the revocation chain advanced while the
   * single-use claim was being persisted, fail closed.
   *
   * The authorization may now be intentionally burned.
   * No execution may begin from a failed gate.
   */

  const revocationAfterClaim =
    verifyRevocationRegistry({
      registryPath:
        revocationRegistryPath
    });


  if (
    !sameRevocationSnapshot(
      revocationAfterRecheck,
      revocationAfterClaim
    )
  ) {
    fail(
      "GUARDED_REVOCATION_STATE_CHANGED_DURING_CLAIM"
    );
  }


  /*
   * 9. VERIFY PERSISTED CONSUMPTION STATE.
   */

  const consumptionAfter =
    verifyAuthorizationConsumptionRegistry({
      registryPath:
        consumptionRegistryPath
    });


  if (
    consumptionAfter.valid !==
    true
  ) {
    fail(
      "GUARDED_CONSUMPTION_REGISTRY_POSTCHECK_FAILED"
    );
  }


  const persisted =
    getAuthorizationConsumption({
      registryPath:
        consumptionRegistryPath,

      authorizationId:
        authorization.authorization_id
    });


  if (
    !persisted ||
    persisted.record_sha256 !==
      consumptionRecord.record_sha256 ||
    persisted.consumption_id !==
      consumptionId ||
    persisted.evaluation_evt_id !==
      historical.evt_id ||
    persisted.evaluation_evt_sha256 !==
      historical.evt_sha256
  ) {
    fail(
      "GUARDED_CONSUMPTION_RECORD_MISMATCH"
    );
  }


  /*
   * 10. MINIMIZED GUARDED-CLAIM RECEIPT.
   *
   * This is not an execution success receipt.
   */

  return {
    valid:
      true,

    guarded_consumption_claimed:
      true,

    historical_authorization_verified:
      true,

    current_authorization_rechecked:
      true,

    revocation_state_stable_across_claim:
      true,

    single_use_consumed:
      true,

    execution_not_performed:
      true,

    execution_success_not_claimed:
      true,

    legal_conformity_not_evaluated:
      true,

    trusted_external_time:
      false,

    claim_time_source:
      "LOCAL_SYSTEM_CLOCK",

    claim_at:
      claimAt,

    consumption_id:
      consumptionRecord.consumption_id,

    consumption_record_sha256:
      consumptionRecord.record_sha256,

    evaluation_evt_id:
      historical.evt_id,

    evaluation_evt_sha256:
      historical.evt_sha256,

    authorization_id:
      authorization.authorization_id,

    revocation_snapshot: {
      record_count:
        revocationAfterClaim.record_count,

      head_record_sha256:
        revocationAfterClaim
          .head_record_sha256
    }
  };
}
