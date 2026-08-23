import { createHash } from "node:crypto";

import {
  getMandate
} from "./hbce-mandate-registry.reference.mjs";

import {
  assertRuntimeBinding,
  getRuntime
} from "./hbce-runtime-registry.reference.mjs";

import {
  assertNotRevokedAt
} from "./hbce-revocation.reference.mjs";


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


function parseTime(
  value,
  code
) {
  if (
    typeof value !== "string"
  ) {
    fail(code);
  }

  const time =
    Date.parse(value);

  if (
    Number.isNaN(time)
  ) {
    fail(code);
  }

  return time;
}


function assertCurrentValidity(
  validity,
  nowMs,
  prefix
) {
  assertObject(
    validity,
    `${prefix}_VALIDITY_INVALID`
  );

  const from =
    parseTime(
      validity.valid_from,
      `${prefix}_VALID_FROM_INVALID`
    );

  const until =
    parseTime(
      validity.valid_until,
      `${prefix}_VALID_UNTIL_INVALID`
    );

  if (
    from > until
  ) {
    fail(
      `${prefix}_VALIDITY_RANGE_INVALID`
    );
  }

  if (
    nowMs < from
  ) {
    fail(
      `${prefix}_NOT_YET_VALID`
    );
  }

  if (
    nowMs > until
  ) {
    fail(
      `${prefix}_EXPIRED`
    );
  }
}


function sameActor(
  left,
  right
) {
  return (
    canonicalize(left) ===
    canonicalize(right)
  );
}


function sameActorIdentity(
  left,
  right
) {
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  if (
    left.subject_id !==
      right.subject_id ||
    left.subject_type !==
      right.subject_type
  ) {
    return false;
  }

  if (
    left.ipr_reference !==
      undefined &&
    right.ipr_reference !==
      undefined &&
    left.ipr_reference !==
      right.ipr_reference
  ) {
    return false;
  }

  return true;
}


function assertRequestSemantics(
  request
) {
  assertObject(
    request,
    "REQUEST_INVALID"
  );

  assertString(
    request.request_id,
    "REQUEST_ID_INVALID"
  );

  assertString(
    request.domain,
    "REQUEST_DOMAIN_INVALID"
  );

  assertString(
    request.action,
    "REQUEST_ACTION_INVALID"
  );

  if (
    request.amount !==
    undefined
  ) {
    assertObject(
      request.amount,
      "REQUEST_AMOUNT_INVALID"
    );

    if (
      typeof request.amount.amount !==
        "number" ||
      !Number.isFinite(
        request.amount.amount
      ) ||
      request.amount.amount <= 0
    ) {
      fail(
        "REQUEST_AMOUNT_INVALID"
      );
    }

    if (
      typeof request.amount.currency !==
        "string" ||
      !/^[A-Z]{3}$/.test(
        request.amount.currency
      )
    ) {
      fail(
        "REQUEST_CURRENCY_INVALID"
      );
    }
  }

  if (
    request.beneficiary_reference !==
    undefined
  ) {
    assertString(
      request.beneficiary_reference,
      "REQUEST_BENEFICIARY_INVALID"
    );
  }
}


function assertRequestBinding(
  authorization,
  request
) {
  assertObject(
    authorization.request,
    "AUTHORIZATION_REQUEST_INVALID"
  );

  assertObject(
    request,
    "REQUEST_INVALID"
  );

  const embedded =
    JSON.parse(
      JSON.stringify(
        authorization.request
      )
    );

  const expectedHash =
    embedded.request_sha256;

  assertString(
    expectedHash,
    "REQUEST_HASH_MISSING"
  );

  delete embedded.request_sha256;

  if (
    canonicalize(embedded) !==
    canonicalize(request)
  ) {
    fail(
      "REQUEST_MISMATCH"
    );
  }

  const actualHash =
    sha256Canonical(request);

  if (
    actualHash !==
    expectedHash
  ) {
    fail(
      "REQUEST_HASH_MISMATCH"
    );
  }

  return actualHash;
}


function assertRuntimeExactBinding(
  authorizationBinding,
  presentedBinding
) {
  assertObject(
    authorizationBinding,
    "AUTHORIZATION_RUNTIME_BINDING_INVALID"
  );

  assertObject(
    presentedBinding,
    "PRESENTED_RUNTIME_BINDING_INVALID"
  );

  const required = [
    "runtime_id",
    "runtime_type",
    "runtime_version",
    "runtime_digest_sha256"
  ];

  for (
    const key of required
  ) {
    assertString(
      authorizationBinding[key],
      `AUTHORIZATION_RUNTIME_${key.toUpperCase()}_MISSING`
    );

    assertString(
      presentedBinding[key],
      `PRESENTED_RUNTIME_${key.toUpperCase()}_MISSING`
    );

    if (
      authorizationBinding[key] !==
      presentedBinding[key]
    ) {
      fail(
        "RUNTIME_BINDING_MISMATCH"
      );
    }
  }
}


function assertMoneyLimit(
  limit,
  requestedAmount,
  prefix
) {
  if (
    limit === undefined
  ) {
    return;
  }

  assertObject(
    limit,
    `${prefix}_AMOUNT_LIMIT_INVALID`
  );

  assertObject(
    requestedAmount,
    `${prefix}_REQUEST_AMOUNT_REQUIRED`
  );

  if (
    typeof limit.amount !== "number" ||
    typeof requestedAmount.amount !==
      "number"
  ) {
    fail(
      `${prefix}_AMOUNT_INVALID`
    );
  }

  if (
    limit.currency !==
    requestedAmount.currency
  ) {
    fail(
      `${prefix}_CURRENCY_MISMATCH`
    );
  }

  if (
    requestedAmount.amount >
    limit.amount
  ) {
    fail(
      `${prefix}_AMOUNT_LIMIT_EXCEEDED`
    );
  }
}


function assertBeneficiaryRule(
  scope,
  request,
  policyContext,
  prefix
) {
  if (
    !scope ||
    !scope.beneficiary_restriction
  ) {
    return;
  }

  const restriction =
    scope.beneficiary_restriction;

  if (
    restriction === "ANY"
  ) {
    return;
  }

  assertString(
    request.beneficiary_reference,
    `${prefix}_BENEFICIARY_REQUIRED`
  );

  if (
    restriction ===
    "EXPLICIT_LIST"
  ) {
    const allowed =
      scope.beneficiary_references;

    if (
      !Array.isArray(allowed) ||
      !allowed.includes(
        request.beneficiary_reference
      )
    ) {
      fail(
        `${prefix}_BENEFICIARY_NOT_ALLOWED`
      );
    }

    return;
  }

  if (
    restriction ===
    "WHITELIST_ONLY"
  ) {
    const whitelist =
      policyContext
        ?.beneficiary_whitelist;

    if (
      !Array.isArray(whitelist) ||
      !whitelist.includes(
        request.beneficiary_reference
      )
    ) {
      fail(
        `${prefix}_BENEFICIARY_NOT_WHITELISTED`
      );
    }

    return;
  }

  fail(
    `${prefix}_BENEFICIARY_RULE_INVALID`
  );
}


function assertScope(
  scope,
  request,
  policyContext,
  prefix
) {
  assertObject(
    scope,
    `${prefix}_SCOPE_INVALID`
  );

  if (
    scope.domain !==
    request.domain
  ) {
    fail(
      `${prefix}_DOMAIN_MISMATCH`
    );
  }

  assertBeneficiaryRule(
    scope,
    request,
    policyContext,
    prefix
  );
}


function assertDecisionEvidence(
  decisionEvidence,
  {
    requestHash,
    mandateId,
    authorityId,
    authorization,
    nowMs
  }
) {
  assertObject(
    decisionEvidence,
    "DECISION_EVIDENCE_MISSING"
  );

  assertString(
    decisionEvidence.decision_id,
    "DECISION_ID_INVALID"
  );

  if (
    decisionEvidence.outcome !==
    "ALLOW"
  ) {
    fail(
      "DECISION_NOT_ALLOW"
    );
  }

  if (
    authorization.decision_reference !==
    decisionEvidence.decision_id
  ) {
    fail(
      "DECISION_REFERENCE_MISMATCH"
    );
  }

  if (
    decisionEvidence.request_sha256 !==
    requestHash
  ) {
    fail(
      "DECISION_REQUEST_HASH_MISMATCH"
    );
  }

  if (
    decisionEvidence.mandate_reference !==
    mandateId
  ) {
    fail(
      "DECISION_MANDATE_MISMATCH"
    );
  }

  if (
    decisionEvidence.authority_reference !==
    authorityId
  ) {
    fail(
      "DECISION_AUTHORITY_MISMATCH"
    );
  }

  const decidedAt =
    parseTime(
      decisionEvidence.decided_at,
      "DECISION_TIME_INVALID"
    );

  const issuedAt =
    parseTime(
      authorization.issued_at,
      "AUTHORIZATION_ISSUED_AT_INVALID"
    );

  if (
    decidedAt > issuedAt
  ) {
    fail(
      "DECISION_AFTER_AUTHORIZATION"
    );
  }

  if (
    decidedAt > nowMs
  ) {
    fail(
      "DECISION_IN_FUTURE"
    );
  }
}


function assertMandateRuntime(
  mandate,
  runtimeId
) {
  const constraints =
    mandate.runtime_constraints;

  assertObject(
    constraints,
    "MANDATE_RUNTIME_CONSTRAINTS_INVALID"
  );

  if (
    constraints.binding_mode ===
    "ANY_AUTHORIZED"
  ) {
    return;
  }

  if (
    constraints.binding_mode ===
    "ALLOWLIST"
  ) {
    if (
      !Array.isArray(
        constraints.allowed_runtime_ids
      ) ||
      !constraints.allowed_runtime_ids.includes(
        runtimeId
      )
    ) {
      fail(
        "MANDATE_RUNTIME_NOT_ALLOWED"
      );
    }

    return;
  }

  fail(
    "MANDATE_RUNTIME_BINDING_MODE_INVALID"
  );
}


function assertAuthorityRuntime(
  authority,
  runtimeId
) {
  const restrictions =
    authority.constraints
      ?.runtime_restrictions;

  if (
    restrictions === undefined
  ) {
    return;
  }

  if (
    !Array.isArray(restrictions) ||
    !restrictions.includes(
      runtimeId
    )
  ) {
    fail(
      "AUTHORITY_RUNTIME_NOT_ALLOWED"
    );
  }
}


function allow(checks) {
  return {
    decision: "ALLOW",
    reason_code: "AUTHORIZED",
    checks
  };
}


function deny(
  reasonCode,
  checks
) {
  return {
    decision: "DENY",
    reason_code:
      reasonCode,
    checks
  };
}


function evaluateInternal({
  mandateRegistryPath,
  runtimeRegistryPath,
  revocationRegistryPath,
  authority,
  authorization,
  decisionEvidence,
  request,
  presentedRuntimeBinding,
  policyContext = {},
  now
}) {
  const checks = [];

  assertString(
    mandateRegistryPath,
    "MANDATE_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    runtimeRegistryPath,
    "RUNTIME_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    revocationRegistryPath,
    "REVOCATION_REGISTRY_PATH_REQUIRED"
  );

  const nowMs =
    parseTime(
      now,
      "EVALUATION_TIME_INVALID"
    );

  assertObject(
    authority,
    "AUTHORITY_INVALID"
  );

  assertObject(
    authorization,
    "AUTHORIZATION_INVALID"
  );

  assertObject(
    request,
    "REQUEST_INVALID"
  );

  assertObject(
    presentedRuntimeBinding,
    "PRESENTED_RUNTIME_BINDING_INVALID"
  );

  /*
   * MANDATE
   */

  assertString(
    authorization.mandate_reference,
    "AUTHORIZATION_MANDATE_REFERENCE_MISSING"
  );

  const mandateRecord =
    getMandate({
      registryPath:
        mandateRegistryPath,

      mandateId:
        authorization.mandate_reference
    });

  if (!mandateRecord) {
    fail(
      "MANDATE_NOT_REGISTERED"
    );
  }

  const mandateRecordedAt =
    parseTime(
      mandateRecord.recorded_at,
      "MANDATE_RECORDED_AT_INVALID"
    );

  if (
    mandateRecordedAt > nowMs
  ) {
    fail(
      "MANDATE_REGISTERED_IN_FUTURE"
    );
  }

  const mandate =
    mandateRecord.mandate;

  if (
    mandate.status !==
    "ACTIVE"
  ) {
    fail(
      "MANDATE_NOT_ACTIVE"
    );
  }

  if (
    mandate.revocation
      ?.state !==
    "NOT_REVOKED"
  ) {
    fail(
      "MANDATE_EMBEDDED_REVOCATION"
    );
  }

  assertCurrentValidity(
    mandate.validity,
    nowMs,
    "MANDATE"
  );

  checks.push(
    "MANDATE_VALID"
  );

  /*
   * AUTHORITY
   */

  assertString(
    authority.authority_id,
    "AUTHORITY_ID_INVALID"
  );

  if (
    authorization.authority_reference !==
    authority.authority_id
  ) {
    fail(
      "AUTHORITY_REFERENCE_MISMATCH"
    );
  }

  if (
    authority.status !==
    "ACTIVE"
  ) {
    fail(
      "AUTHORITY_NOT_ACTIVE"
    );
  }

  if (
    authority.source
      ?.source_type !==
    "MANDATE"
  ) {
    fail(
      "AUTHORITY_NOT_MANDATE_DERIVED"
    );
  }

  if (
    authority.source
      ?.mandate_reference !==
    mandate.mandate_id
  ) {
    fail(
      "AUTHORITY_MANDATE_MISMATCH"
    );
  }

  if (
    authority.source
      ?.source_reference !==
    mandate.mandate_id
  ) {
    fail(
      "AUTHORITY_SOURCE_REFERENCE_MISMATCH"
    );
  }

  if (
    !sameActorIdentity(
      mandate.grantee,
      authority.subject
    )
  ) {
    fail(
      "MANDATE_GRANTEE_AUTHORITY_SUBJECT_MISMATCH"
    );
  }

  if (
    authority.function !==
    mandate.function
  ) {
    fail(
      "AUTHORITY_FUNCTION_MISMATCH"
    );
  }

  assertCurrentValidity(
    authority.validity,
    nowMs,
    "AUTHORITY"
  );

  checks.push(
    "AUTHORITY_VALID"
  );

  /*
   * AUTHORIZATION
   */

  assertString(
    authorization.authorization_id,
    "AUTHORIZATION_ID_INVALID"
  );

  if (
    authorization.status !==
    "ISSUED"
  ) {
    fail(
      "AUTHORIZATION_NOT_ISSUED"
    );
  }

  assertCurrentValidity(
    authorization.validity,
    nowMs,
    "AUTHORIZATION"
  );

  const issuedAt =
    parseTime(
      authorization.issued_at,
      "AUTHORIZATION_ISSUED_AT_INVALID"
    );

  if (
    issuedAt > nowMs
  ) {
    fail(
      "AUTHORIZATION_ISSUED_IN_FUTURE"
    );
  }

  if (
    authorization.usage
      ?.mode !==
      "SINGLE_USE" ||
    authorization.usage
      ?.max_uses !== 1
  ) {
    fail(
      "AUTHORIZATION_USAGE_STATE_UNSUPPORTED"
    );
  }

  if (
    authorization.usage
      ?.consumption_reference !==
    undefined
  ) {
    fail(
      "AUTHORIZATION_ALREADY_CONSUMED"
    );
  }

  checks.push(
    "AUTHORIZATION_VALID"
  );

  /*
   * REQUEST
   */

  assertRequestSemantics(
    request
  );

  const requestHash =
    assertRequestBinding(
      authorization,
      request
    );

  if (
    !Array.isArray(
      mandate.allowed_actions
    ) ||
    !mandate.allowed_actions.includes(
      request.action
    )
  ) {
    fail(
      "MANDATE_ACTION_NOT_ALLOWED"
    );
  }

  if (
    !Array.isArray(
      authority.allowed_actions
    ) ||
    !authority.allowed_actions.includes(
      request.action
    )
  ) {
    fail(
      "AUTHORITY_ACTION_NOT_ALLOWED"
    );
  }

  assertScope(
    mandate.scope,
    request,
    policyContext,
    "MANDATE"
  );

  assertScope(
    authority.scope,
    request,
    policyContext,
    "AUTHORITY"
  );

  assertMoneyLimit(
    mandate.limits
      ?.max_amount,
    request.amount,
    "MANDATE"
  );

  assertMoneyLimit(
    authority.constraints
      ?.max_amount,
    request.amount,
    "AUTHORITY"
  );

  checks.push(
    "REQUEST_WITHIN_SCOPE"
  );

  /*
   * DECISION EVIDENCE
   */

  assertDecisionEvidence(
    decisionEvidence,
    {
      requestHash,
      mandateId:
        mandate.mandate_id,
      authorityId:
        authority.authority_id,
      authorization,
      nowMs
    }
  );

  checks.push(
    "DECISION_BOUND"
  );

  /*
   * SUBJECT
   */

  if (
    !sameActor(
      authority.subject,
      authorization.authorized_subject
    )
  ) {
    fail(
      "AUTHORIZED_SUBJECT_MISMATCH"
    );
  }

  checks.push(
    "SUBJECT_BOUND"
  );

  /*
   * RUNTIME
   */

  assertRuntimeExactBinding(
    authorization.runtime_binding,
    presentedRuntimeBinding
  );

  const runtimeCheck =
    assertRuntimeBinding({
      registryPath:
        runtimeRegistryPath,

      binding:
        presentedRuntimeBinding
    });

  const runtimeRecord =
    getRuntime({
      registryPath:
        runtimeRegistryPath,

      runtimeId:
        presentedRuntimeBinding.runtime_id
    });

  if (!runtimeRecord) {
    fail(
      "RUNTIME_NOT_REGISTERED"
    );
  }

  const runtimeRecordedAt =
    parseTime(
      runtimeRecord.recorded_at,
      "RUNTIME_RECORDED_AT_INVALID"
    );

  if (
    runtimeRecordedAt > nowMs
  ) {
    fail(
      "RUNTIME_REGISTERED_IN_FUTURE"
    );
  }

  if (
    runtimeRecord.runtime_sha256 !==
    runtimeCheck.runtime_sha256
  ) {
    fail(
      "RUNTIME_REGISTRY_BINDING_HASH_MISMATCH"
    );
  }

  const runtimeId =
    presentedRuntimeBinding.runtime_id;

  assertMandateRuntime(
    mandate,
    runtimeId
  );

  assertAuthorityRuntime(
    authority,
    runtimeId
  );

  checks.push(
    "RUNTIME_VALID"
  );

  /*
   * REVOCATION
   */

  const authorityHash =
    sha256Canonical(
      authority
    );

  const authorizationHash =
    sha256Canonical(
      authorization
    );

  assertNotRevokedAt({
    registryPath:
      revocationRegistryPath,

    targetType:
      "MANDATE",

    targetId:
      mandate.mandate_id,

    targetSha256:
      mandateRecord.mandate_sha256,

    at:
      now
  });

  assertNotRevokedAt({
    registryPath:
      revocationRegistryPath,

    targetType:
      "AUTHORITY",

    targetId:
      authority.authority_id,

    targetSha256:
      authorityHash,

    at:
      now
  });

  assertNotRevokedAt({
    registryPath:
      revocationRegistryPath,

    targetType:
      "AUTHORIZATION",

    targetId:
      authorization.authorization_id,

    targetSha256:
      authorizationHash,

    at:
      now
  });

  assertNotRevokedAt({
    registryPath:
      revocationRegistryPath,

    targetType:
      "RUNTIME",

    targetId:
      runtimeId,

    targetSha256:
      runtimeCheck.runtime_sha256,

    at:
      now
  });

  checks.push(
    "REVOCATION_CLEAR"
  );

  return allow(checks);
}


export function evaluateAuthorization(
  input
) {
  const checks = [];

  try {
    const result =
      evaluateInternal(
        input
      );

    return result;
  } catch (error) {
    return deny(
      error instanceof Error
        ? error.message
        : "EVALUATION_ERROR",
      checks
    );
  }
}


export function hashCanonicalArtifact(
  value
) {
  return sha256Canonical(
    value
  );
}
