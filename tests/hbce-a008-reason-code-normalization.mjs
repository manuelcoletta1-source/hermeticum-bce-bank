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
  registerMandate
} from "../protocol/hbce-mandate-registry.reference.mjs";

import {
  registerRuntime
} from "../protocol/hbce-runtime-registry.reference.mjs";

import {
  evaluateAuthorization,
  hashCanonicalArtifact
} from "../protocol/hbce-authorization-evaluator.reference.mjs";

import {
  buildAuthorizationEvaluationEvt
} from "../protocol/hbce-evt-integration.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a0083-"
    )
  );


const mandateRegistryPath =
  join(
    root,
    "mandates.jsonl"
  );

const runtimeRegistryPath =
  join(
    root,
    "runtimes.jsonl"
  );

const revocationRegistryPath =
  join(
    root,
    "revocations.jsonl"
  );


const NOW =
  "2026-08-23T17:00:00Z";


function fail(message) {
  throw new Error(message);
}


function expectDeny(
  label,
  result,
  expectedReason
) {
  if (
    result.decision !==
      "DENY" ||
    result.reason_code !==
      expectedReason ||
    !Array.isArray(
      result.checks
    ) ||
    result.checks.length !==
      0
  ) {
    fail(
      `${label}:EXPECTED=DENY/${expectedReason}/[]:ACTUAL=${JSON.stringify(result)}`
    );
  }

  console.log(
    `${label}=PASS`
  );
}


function expectError(
  label,
  fn,
  expectedReason
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
    actual !== expectedReason
  ) {
    fail(
      `${label}:EXPECTED=${expectedReason}:ACTUAL=${actual}`
    );
  }

  console.log(
    `${label}=PASS`
  );
}


try {
  writeFileSync(
    revocationRegistryPath,
    "",
    "utf8"
  );


  const subject = {
    subject_id:
      "AGENT-A27",

    subject_type:
      "AGENT"
  };


  const request = {
    request_id:
      "REQUEST-A0083-001",

    domain:
      "PAYMENT",

    action:
      "PAYMENT_EXECUTE",

    beneficiary_reference:
      "BENEFICIARY-001",

    amount: {
      amount:
        100,

      currency:
        "EUR"
    }
  };


  const requestHash =
    hashCanonicalArtifact(
      request
    );


  const mandate = {
    schema_version:
      "1.0",

    mandate_id:
      "MANDATE-A0083-001",

    status:
      "ACTIVE",

    grantor: {
      subject_id:
        "BANK-001",

      subject_type:
        "ORGANIZATION"
    },

    grantee:
      subject,

    function:
      "BANK_PAYMENT_EXECUTION",

    scope: {
      domain:
        "PAYMENT",

      beneficiary_restriction:
        "WHITELIST_ONLY"
    },

    allowed_actions: [
      "PAYMENT_EXECUTE"
    ],

    limits: {
      max_amount: {
        amount:
          10000,

        currency:
          "EUR"
      }
    },

    validity: {
      valid_from:
        "2026-08-23T16:00:00Z",

      valid_until:
        "2026-08-23T18:00:00Z"
    },

    runtime_constraints: {
      binding_mode:
        "ALLOWLIST",

      allowed_runtime_ids: [
        "A27"
      ]
    },

    revocation: {
      state:
        "NOT_REVOKED"
    }
  };


  const mandateRecord =
    registerMandate({
      registryPath:
        mandateRegistryPath,

      mandate,

      recordedAt:
        "2026-08-23T16:00:00Z"
    });


  const runtime = {
    schema_version:
      "1.0",

    runtime_id:
      "A27",

    runtime_type:
      "AI_AGENT",

    status:
      "ACTIVE",

    provider:
      "HBCE",

    runtime_version:
      "1.0",

    runtime_digest_sha256:
      "a".repeat(64),

    capabilities: [
      "PAYMENT_EXECUTE"
    ]
  };


  const runtimeRecord =
    registerRuntime({
      registryPath:
        runtimeRegistryPath,

      runtime,

      recordedAt:
        "2026-08-23T16:00:00Z",

      recordedBy:
        "IPR-BANK-001"
    });


  const authority = {
    schema_version:
      "1.0",

    authority_id:
      "AUTHORITY-A0083-001",

    status:
      "ACTIVE",

    subject,

    issuer: {
      subject_id:
        "BANK-001",

      subject_type:
        "ORGANIZATION"
    },

    function:
      "BANK_PAYMENT_EXECUTION",

    source: {
      source_type:
        "MANDATE",

      source_reference:
        mandate.mandate_id,

      mandate_reference:
        mandate.mandate_id
    },

    scope: {
      domain:
        "PAYMENT",

      beneficiary_restriction:
        "WHITELIST_ONLY"
    },

    allowed_actions: [
      "PAYMENT_EXECUTE"
    ],

    constraints: {
      max_amount: {
        amount:
          10000,

        currency:
          "EUR"
      },

      runtime_restrictions: [
        "A27"
      ]
    },

    validity: {
      valid_from:
        "2026-08-23T16:00:00Z",

      valid_until:
        "2026-08-23T18:00:00Z"
    },

    delegation: {
      delegable:
        false,

      depth:
        0
    }
  };


  const authorization = {
    schema_version:
      "1.0",

    authorization_id:
      "AUTHORIZATION-A0083-001",

    status:
      "ISSUED",

    mandate_reference:
      mandate.mandate_id,

    authority_reference:
      authority.authority_id,

    decision_reference:
      "DECISION-A0083-001",

    authorized_subject:
      subject,

    request: {
      ...request,

      request_sha256:
        requestHash
    },

    runtime_binding: {
      runtime_id:
        "A27",

      runtime_type:
        "AI_AGENT",

      runtime_version:
        "1.0",

      runtime_digest_sha256:
        "a".repeat(64)
    },

    validity: {
      valid_from:
        "2026-08-23T16:00:00Z",

      valid_until:
        "2026-08-23T18:00:00Z"
    },

    usage: {
      mode:
        "SINGLE_USE",

      max_uses:
        1
    },

    issued_at:
      "2026-08-23T16:20:00Z",

    issued_by: {
      subject_id:
        "BANK-001",

      subject_type:
        "ORGANIZATION"
    }
  };


  const decisionAllow = {
    decision_id:
      authorization.decision_reference,

    outcome:
      "ALLOW",

    request_sha256:
      requestHash,

    mandate_reference:
      mandate.mandate_id,

    authority_reference:
      authority.authority_id,

    decided_at:
      "2026-08-23T16:10:00Z"
  };


  const policyContext = {
    beneficiary_whitelist: [
      "BENEFICIARY-001"
    ]
  };


  const baseInput = {
    mandateRegistryPath,
    runtimeRegistryPath,
    revocationRegistryPath,

    authority,
    authorization,

    decisionEvidence:
      decisionAllow,

    request,

    presentedRuntimeBinding:
      authorization.runtime_binding,

    policyContext,

    now:
      NOW
  };


  /*
   * Baseline ALLOW must be untouched by reason
   * normalization.
   */

  const baseline =
    evaluateAuthorization(
      baseInput
    );


  if (
    baseline.decision !==
      "ALLOW" ||
    baseline.reason_code !==
      "AUTHORIZED" ||
    baseline.checks.length !==
      8
  ) {
    fail(
      `A008_3_BASELINE_ALLOW_CHANGED:${JSON.stringify(baseline)}`
    );
  }


  console.log(
    "A008_3_BASELINE_ALLOW_PRESERVED=PASS"
  );


  /*
   * Existing stable domain codes remain exact.
   */

  const stableDeny =
    evaluateAuthorization({
      ...baseInput,

      presentedRuntimeBinding: {
        ...authorization
          .runtime_binding,

        runtime_id:
          "A28"
      }
    });


  expectDeny(
    "A008_3_STABLE_DOMAIN_REASON_PRESERVED",
    stableDeny,
    "RUNTIME_BINDING_MISMATCH"
  );


  /*
   * Mandate registry parser diagnostics contain line
   * numbers. Those diagnostics must not escape as EVT
   * reason codes.
   */

  const validMandateBytes =
    readFileSync(
      mandateRegistryPath,
      "utf8"
    );


  writeFileSync(
    mandateRegistryPath,
    "{\n",
    "utf8"
  );


  const decisionDeny = {
    ...decisionAllow,

    outcome:
      "DENY"
  };


  const mandateRegistryDeny =
    evaluateAuthorization({
      ...baseInput,

      decisionEvidence:
        decisionDeny
    });


  expectDeny(
    "A008_3_MANDATE_REGISTRY_REASON_NORMALIZED",
    mandateRegistryDeny,
    "MANDATE_REGISTRY_INVALID"
  );


  writeFileSync(
    mandateRegistryPath,
    validMandateBytes,
    "utf8"
  );


  /*
   * A009 previously rejects the raw dynamic diagnostic.
   * Keep this assertion so the compatibility boundary is
   * explicit rather than folklore.
   */

  const buildDenyEvent =
    (evaluationResult) =>
      buildAuthorizationEvaluationEvt({
        evtId:
          "EVT-A0083-DENY-001",

        occurredAt:
          NOW,

        evaluatorId:
          "HBCE-A008",

        evaluatorVersion:
          "A008.3",

        evaluatorSha256:
          "f".repeat(64),

        mandateId:
          mandate.mandate_id,

        mandateSha256:
          mandateRecord.mandate_sha256,

        mandateRecordSha256:
          mandateRecord.record_sha256,

        authority,

        decisionEvidence:
          decisionDeny,

        authorization,

        policyContext,

        runtimeSha256:
          runtimeRecord.runtime_sha256,

        runtimeRecordSha256:
          runtimeRecord.record_sha256,

        revocationAsOfRecordCount:
          0,

        revocationAsOfHeadRecordSha256:
          null,

        evaluationResult
      });


  expectError(
    "A008_3_RAW_DYNAMIC_REASON_REJECTED_BY_A009",

    () =>
      buildDenyEvent({
        decision:
          "DENY",

        reason_code:
          "MANDATE_REGISTRY_CORRUPT_JSON_LINE:1",

        checks:
          []
      }),

    "EVT_REASON_CODE_VOCABULARY_INVALID"
  );


  const normalizedEvent =
    buildDenyEvent(
      mandateRegistryDeny
    );


  if (
    normalizedEvent.result.decision !==
      "DENY" ||
    normalizedEvent.result.reason_code !==
      "MANDATE_REGISTRY_INVALID"
  ) {
    fail(
      "A008_3_NORMALIZED_DENY_NOT_SERIALIZABLE"
    );
  }


  console.log(
    "A008_3_NORMALIZED_DENY_A009_COMPATIBLE=PASS"
  );


  /*
   * Runtime registry diagnostics.
   */

  const validRuntimeBytes =
    readFileSync(
      runtimeRegistryPath,
      "utf8"
    );


  writeFileSync(
    runtimeRegistryPath,
    "{\n",
    "utf8"
  );


  const runtimeRegistryDeny =
    evaluateAuthorization(
      baseInput
    );


  expectDeny(
    "A008_3_RUNTIME_REGISTRY_REASON_NORMALIZED",
    runtimeRegistryDeny,
    "RUNTIME_REGISTRY_INVALID"
  );


  writeFileSync(
    runtimeRegistryPath,
    validRuntimeBytes,
    "utf8"
  );


  /*
   * Revocation registry diagnostics.
   */

  writeFileSync(
    revocationRegistryPath,
    "{\n",
    "utf8"
  );


  const revocationRegistryDeny =
    evaluateAuthorization(
      baseInput
    );


  expectDeny(
    "A008_3_REVOCATION_REGISTRY_REASON_NORMALIZED",
    revocationRegistryDeny,
    "REVOCATION_REGISTRY_INVALID"
  );


  writeFileSync(
    revocationRegistryPath,
    "",
    "utf8"
  );


  /*
   * Native/non-protocol exceptions must collapse to a
   * stable generic fail-closed code.
   */

  const fallback =
    evaluateAuthorization(
      null
    );


  expectDeny(
    "A008_3_UNKNOWN_EXCEPTION_NORMALIZED",
    fallback,
    "AUTHORIZATION_EVALUATION_FAILED"
  );


  const stablePattern =
    /^[A-Z][A-Z0-9_]{1,63}$/;


  for (
    const result of [
      stableDeny,
      mandateRegistryDeny,
      runtimeRegistryDeny,
      revocationRegistryDeny,
      fallback
    ]
  ) {
    if (
      !stablePattern.test(
        result.reason_code
      )
    ) {
      fail(
        `A008_3_UNSTABLE_REASON_CODE:${result.reason_code}`
      );
    }
  }


  console.log(
    "A008_3_ALL_DENY_REASON_CODES_STABLE=PASS"
  );


  console.log(
    "A008_3_REASON_CODE_NORMALIZATION_SUITE=PASS"
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
