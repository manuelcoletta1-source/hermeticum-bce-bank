import {
  mkdtempSync,
  mkdirSync,
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
  pathToFileURL
} from "node:url";

import {
  spawn
} from "node:child_process";


import {
  registerMandate
} from "../protocol/hbce-mandate-registry.reference.mjs";

import {
  registerRuntime
} from "../protocol/hbce-runtime-registry.reference.mjs";

import {
  registerRevocation,
  verifyRevocationRegistry
} from "../protocol/hbce-revocation.reference.mjs";

import {
  evaluateAuthorization,
  hashCanonicalArtifact
} from "../protocol/hbce-authorization-evaluator.reference.mjs";

import {
  appendEvt,
  buildAuthorizationEvaluationEvt
} from "../protocol/hbce-evt-integration.reference.mjs";

import {
  verifyHistoricalAuthorization
} from "../protocol/hbce-verify-authorization.reference.mjs";

import {
  getAuthorizationConsumption,
  verifyAuthorizationConsumptionRegistry
} from "../protocol/hbce-authorization-consumption.reference.mjs";

import {
  guardedConsumeAuthorization
} from "../protocol/hbce-guarded-consumption.reference.mjs";


const EVALUATOR_SHA =
  "c897eeca32aa680b4d23fd64518f65dad40c40a0d154c213ee29e54712a3cbee";


const expectedEvaluator = {
  evaluator_id:
    "HBCE-A008",

  evaluator_version:
    "A008.2",

  evaluator_sha256:
    EVALUATOR_SHA
};


const EXPECTED_ALLOW_CHECKS = [
  "MANDATE_VALID",
  "AUTHORITY_VALID",
  "AUTHORIZATION_VALID",
  "REQUEST_WITHIN_SCOPE",
  "DECISION_BOUND",
  "SUBJECT_BOUND",
  "RUNTIME_VALID",
  "REVOCATION_CLEAR"
];


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a011-final-"
    )
  );


let counter =
  0;


function iso(
  offsetMs
) {
  return new Date(
    Date.now() +
    offsetMs
  ).toISOString();
}


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
    actual !==
    expectedReason
  ) {
    fail(
      `${label}:EXPECTED=${expectedReason}:ACTUAL=${actual}`
    );
  }

  console.log(
    `${label}=PASS`
  );
}


function nextSuffix() {
  counter += 1;

  return String(counter)
    .padStart(
      3,
      "0"
    );
}


function buildFixture({
  amount = 100,

  mandateValidUntilOffset =
    60 * 60 * 1000,

  authorizationValidUntilOffset =
    60 * 60 * 1000,

  mandateRecordedAtOffset =
    -50 * 60 * 1000,

  runtimeRecordedAtOffset =
    -50 * 60 * 1000
} = {}) {
  const suffix =
    nextSuffix();

  const dir =
    join(
      root,
      `fixture-${suffix}`
    );

  mkdirSync(dir);


  const mandateRegistryPath =
    join(
      dir,
      "mandates.jsonl"
    );

  const runtimeRegistryPath =
    join(
      dir,
      "runtimes.jsonl"
    );

  const revocationRegistryPath =
    join(
      dir,
      "revocations.jsonl"
    );

  const consumptionRegistryPath =
    join(
      dir,
      "consumptions.jsonl"
    );

  const evtLogPath =
    join(
      dir,
      "events.jsonl"
    );


  /*
   * Fail-closed stores exist explicitly.
   */

  writeFileSync(
    revocationRegistryPath,
    "",
    "utf8"
  );

  writeFileSync(
    consumptionRegistryPath,
    "",
    "utf8"
  );


  const mandateId =
    `MANDATE-A011-FINAL-${suffix}`;

  const authorityId =
    `AUTHORITY-A011-FINAL-${suffix}`;

  const decisionId =
    `DECISION-A011-FINAL-${suffix}`;

  const authorizationId =
    `AUTHORIZATION-A011-FINAL-${suffix}`;

  const requestId =
    `REQUEST-A011-FINAL-${suffix}`;

  const evtId =
    `EVT-A011-FINAL-${suffix}`;


  const eventAt =
    iso(
      -5 * 60 * 1000
    );


  const subject = {
    subject_id:
      "AGENT-A27",

    subject_type:
      "AGENT"
  };


  const request = {
    request_id:
      requestId,

    domain:
      "PAYMENT",

    action:
      "PAYMENT_EXECUTE",

    beneficiary_reference:
      "BENEFICIARY-001",

    amount: {
      amount,

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
      mandateId,

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
        iso(
          -60 * 60 * 1000
        ),

      valid_until:
        iso(
          mandateValidUntilOffset
        )
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
        iso(
          mandateRecordedAtOffset
        )
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
        iso(
          runtimeRecordedAtOffset
        ),

      recordedBy:
        "IPR-BANK-001"
    });


  const authority = {
    schema_version:
      "1.0",

    authority_id:
      authorityId,

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
        mandateId,

      mandate_reference:
        mandateId
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
        iso(
          -60 * 60 * 1000
        ),

      valid_until:
        iso(
          60 * 60 * 1000
        )
    },

    delegation: {
      delegable:
        false,

      depth:
        0
    }
  };


  const decisionEvidence = {
    decision_id:
      decisionId,

    outcome:
      "ALLOW",

    request_sha256:
      requestHash,

    mandate_reference:
      mandateId,

    authority_reference:
      authorityId,

    decided_at:
      iso(
        -10 * 60 * 1000
      )
  };


  const authorization = {
    schema_version:
      "1.0",

    authorization_id:
      authorizationId,

    status:
      "ISSUED",

    mandate_reference:
      mandateId,

    authority_reference:
      authorityId,

    decision_reference:
      decisionId,

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
        iso(
          -20 * 60 * 1000
        ),

      valid_until:
        iso(
          authorizationValidUntilOffset
        )
    },

    usage: {
      mode:
        "SINGLE_USE",

      max_uses:
        1
    },

    issued_at:
      iso(
        -9 * 60 * 1000
      ),

    issued_by: {
      subject_id:
        "BANK-001",

      subject_type:
        "ORGANIZATION"
    }
  };


  const policyContext = {
    beneficiary_whitelist: [
      "BENEFICIARY-001"
    ]
  };


  return {
    dir,

    mandateRegistryPath,
    runtimeRegistryPath,
    revocationRegistryPath,
    consumptionRegistryPath,
    evtLogPath,

    mandateId,
    authorityId,
    decisionId,
    authorizationId,
    evtId,

    eventAt,

    mandateRecord,
    runtimeRecord,

    mandate,
    runtime,
    authority,
    authorization,
    decisionEvidence,
    request,
    policyContext
  };
}


function evaluateAt(
  fixture,
  now,
  overrides = {}
) {
  return evaluateAuthorization({
    mandateRegistryPath:
      fixture.mandateRegistryPath,

    runtimeRegistryPath:
      fixture.runtimeRegistryPath,

    revocationRegistryPath:
      fixture.revocationRegistryPath,

    authority:
      fixture.authority,

    authorization:
      fixture.authorization,

    decisionEvidence:
      fixture.decisionEvidence,

    request:
      fixture.request,

    presentedRuntimeBinding:
      fixture.authorization
        .runtime_binding,

    policyContext:
      fixture.policyContext,

    now,

    ...overrides
  });
}


function materializeHistoricalAllow(
  fixture
) {
  const result =
    evaluateAt(
      fixture,
      fixture.eventAt
    );


  if (
    result.decision !==
      "ALLOW" ||
    result.reason_code !==
      "AUTHORIZED" ||
    JSON.stringify(
      result.checks
    ) !==
    JSON.stringify(
      EXPECTED_ALLOW_CHECKS
    )
  ) {
    fail(
      `HISTORICAL_ALLOW_FIXTURE_INVALID:${JSON.stringify(result)}`
    );
  }


  const revocationSnapshot =
    verifyRevocationRegistry({
      registryPath:
        fixture.revocationRegistryPath
    });


  const event =
    buildAuthorizationEvaluationEvt({
      evtId:
        fixture.evtId,

      occurredAt:
        fixture.eventAt,

      evaluatorId:
        expectedEvaluator.evaluator_id,

      evaluatorVersion:
        expectedEvaluator.evaluator_version,

      evaluatorSha256:
        expectedEvaluator.evaluator_sha256,

      mandateId:
        fixture.mandateId,

      mandateSha256:
        fixture.mandateRecord
          .mandate_sha256,

      mandateRecordSha256:
        fixture.mandateRecord
          .record_sha256,

      authority:
        fixture.authority,

      decisionEvidence:
        fixture.decisionEvidence,

      authorization:
        fixture.authorization,

      policyContext:
        fixture.policyContext,

      runtimeSha256:
        fixture.runtimeRecord
          .runtime_sha256,

      runtimeRecordSha256:
        fixture.runtimeRecord
          .record_sha256,

      revocationAsOfRecordCount:
        revocationSnapshot
          .record_count,

      revocationAsOfHeadRecordSha256:
        revocationSnapshot
          .head_record_sha256,

      evaluationResult:
        result
    });


  return appendEvt({
    logPath:
      fixture.evtLogPath,

    event
  });
}


function callGate(
  fixture,
  consumptionId
) {
  return guardedConsumeAuthorization({
    evtLogPath:
      fixture.evtLogPath,

    evtId:
      fixture.evtId,

    mandateRegistryPath:
      fixture.mandateRegistryPath,

    runtimeRegistryPath:
      fixture.runtimeRegistryPath,

    revocationRegistryPath:
      fixture.revocationRegistryPath,

    consumptionRegistryPath:
      fixture.consumptionRegistryPath,

    consumptionId,

    consumedBy:
      "IPR-BANK-001",

    authority:
      fixture.authority,

    decisionEvidence:
      fixture.decisionEvidence,

    authorization:
      fixture.authorization,

    request:
      fixture.request,

    policyContext:
      fixture.policyContext,

    expectedEvaluator
  });
}


async function runWorker(
  workerPath,
  fixturePath,
  suffix
) {
  return await new Promise(
    (resolve) => {
      const child =
        spawn(
          process.execPath,
          [
            workerPath,
            fixturePath,
            suffix
          ],
          {
            cwd:
              process.cwd(),

            stdio: [
              "ignore",
              "pipe",
              "pipe"
            ]
          }
        );


      let stdout =
        "";

      let stderr =
        "";


      child.stdout.on(
        "data",
        (chunk) => {
          stdout +=
            chunk.toString();
        }
      );


      child.stderr.on(
        "data",
        (chunk) => {
          stderr +=
            chunk.toString();
        }
      );


      child.on(
        "close",
        (code) => {
          resolve({
            code,
            stdout:
              stdout.trim(),
            stderr:
              stderr.trim()
          });
        }
      );
    }
  );
}


try {

  /*
   * =====================================================
   * 1. GOLDEN VALID ALLOW
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    const result =
      evaluateAt(
        fixture,
        fixture.eventAt
      );


    if (
      result.decision !==
        "ALLOW" ||
      result.reason_code !==
        "AUTHORIZED" ||
      JSON.stringify(
        result.checks
      ) !==
      JSON.stringify(
        EXPECTED_ALLOW_CHECKS
      )
    ) {
      fail(
        `A011_GOLDEN_VALID_ALLOW_INVALID:${JSON.stringify(result)}`
      );
    }


    console.log(
      "A011_FINAL_GOLDEN_VALID_ALLOW=PASS"
    );
  }


  /*
   * =====================================================
   * 2. OVER LIMIT
   * =====================================================
   */

  {
    const fixture =
      buildFixture({
        amount:
          20000
      });


    expectDeny(
      "A011_FINAL_OVER_LIMIT_DENY",
      evaluateAt(
        fixture,
        fixture.eventAt
      ),
      "MANDATE_AMOUNT_LIMIT_EXCEEDED"
    );
  }


  /*
   * =====================================================
   * 3. RUNTIME SUBSTITUTION
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    expectDeny(
      "A011_FINAL_RUNTIME_SUBSTITUTION_DENY",

      evaluateAt(
        fixture,
        fixture.eventAt,
        {
          presentedRuntimeBinding: {
            ...fixture.authorization
              .runtime_binding,

            runtime_id:
              "A28"
          }
        }
      ),

      "RUNTIME_BINDING_MISMATCH"
    );
  }


  /*
   * =====================================================
   * 4. EXPIRED MANDATE
   * =====================================================
   */

  {
    const fixture =
      buildFixture({
        mandateValidUntilOffset:
          -6 * 60 * 1000
      });


    expectDeny(
      "A011_FINAL_EXPIRED_MANDATE_DENY",

      evaluateAt(
        fixture,
        fixture.eventAt
      ),

      "MANDATE_EXPIRED"
    );
  }


  /*
   * =====================================================
   * 5. REVOKED MANDATE
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    const revokedAt =
      iso(
        -6 * 60 * 1000
      );


    registerRevocation({
      registryPath:
        fixture.revocationRegistryPath,

      recordedAt:
        revokedAt,

      revocation: {
        schema_version:
          "1.0",

        revocation_id:
          "REVOCATION-A011-FINAL-MANDATE",

        target_type:
          "MANDATE",

        target_id:
          fixture.mandateId,

        target_sha256:
          fixture.mandateRecord
            .mandate_sha256,

        revoked_at:
          revokedAt,

        revoked_by:
          "IPR-BANK-001",

        reason_code:
          "MANDATE_WITHDRAWN"
      }
    });


    expectDeny(
      "A011_FINAL_REVOKED_MANDATE_DENY",

      evaluateAt(
        fixture,
        fixture.eventAt
      ),

      "TARGET_REVOKED"
    );
  }


  /*
   * =====================================================
   * 6. FUTURE MANDATE EVIDENCE
   * =====================================================
   */

  {
    const fixture =
      buildFixture({
        mandateRecordedAtOffset:
          60 * 1000
      });


    expectDeny(
      "A011_FINAL_FUTURE_MANDATE_DENY",

      evaluateAt(
        fixture,
        fixture.eventAt
      ),

      "MANDATE_REGISTERED_IN_FUTURE"
    );
  }


  /*
   * =====================================================
   * 7. FUTURE RUNTIME EVIDENCE
   * =====================================================
   */

  {
    const fixture =
      buildFixture({
        runtimeRecordedAtOffset:
          60 * 1000
      });


    expectDeny(
      "A011_FINAL_FUTURE_RUNTIME_DENY",

      evaluateAt(
        fixture,
        fixture.eventAt
      ),

      "RUNTIME_REGISTERED_IN_FUTURE"
    );
  }


  /*
   * =====================================================
   * 8. VALID GUARDED CONSUMPTION + SEQUENTIAL REPLAY
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    materializeHistoricalAllow(
      fixture
    );


    const receipt =
      callGate(
        fixture,
        "CONSUMPTION-A011-FINAL-VALID"
      );


    if (
      receipt.valid !==
        true ||
      receipt
        .historical_authorization_verified !==
        true ||
      receipt
        .current_authorization_rechecked !==
        true ||
      receipt.single_use_consumed !==
        true ||
      receipt.execution_not_performed !==
        true
    ) {
      fail(
        "A011_FINAL_GUARDED_VALID_RECEIPT_INVALID"
      );
    }


    console.log(
      "A011_FINAL_GUARDED_VALID_CLAIM=PASS"
    );


    expectError(
      "A011_FINAL_SEQUENTIAL_REPLAY_DENY",

      () =>
        callGate(
          fixture,
          "CONSUMPTION-A011-FINAL-REPLAY"
        ),

      "AUTHORIZATION_ALREADY_CONSUMED"
    );


    const consumptionState =
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          fixture.consumptionRegistryPath
      });


    if (
      consumptionState.record_count !==
      1
    ) {
      fail(
        "A011_FINAL_SEQUENTIAL_REPLAY_CREATED_SECOND_RECORD"
      );
    }


    console.log(
      "A011_FINAL_SEQUENTIAL_SINGLE_RECORD=PASS"
    );
  }


  /*
   * =====================================================
   * 9. HISTORICAL ALLOW, CURRENT AUTHORIZATION REVOKED
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    materializeHistoricalAllow(
      fixture
    );


    const revokedAt =
      iso(
        -1000
      );


    registerRevocation({
      registryPath:
        fixture.revocationRegistryPath,

      recordedAt:
        revokedAt,

      revocation: {
        schema_version:
          "1.0",

        revocation_id:
          "REVOCATION-A011-FINAL-AUTHORIZATION",

        target_type:
          "AUTHORIZATION",

        target_id:
          fixture.authorizationId,

        target_sha256:
          hashCanonicalArtifact(
            fixture.authorization
          ),

        revoked_at:
          revokedAt,

        revoked_by:
          "IPR-BANK-001",

        reason_code:
          "AUTHORITY_WITHDRAWN"
      }
    });


    expectError(
      "A011_FINAL_CURRENT_AUTHORIZATION_REVOKED_DENY",

      () =>
        callGate(
          fixture,
          "CONSUMPTION-A011-FINAL-REVOKED"
        ),

      "GUARDED_CURRENT_AUTHORIZATION_DENIED"
    );


    const state =
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          fixture.consumptionRegistryPath
      });


    if (
      state.record_count !==
      0
    ) {
      fail(
        "A011_FINAL_REVOKED_AUTHORIZATION_CONSUMED"
      );
    }


    console.log(
      "A011_FINAL_REVOKED_AUTHORIZATION_NOT_CONSUMED=PASS"
    );
  }


  /*
   * =====================================================
   * 10. HISTORICAL ALLOW, CURRENT AUTHORIZATION EXPIRED
   * =====================================================
   */

  {
    const fixture =
      buildFixture({
        authorizationValidUntilOffset:
          -1000
      });


    materializeHistoricalAllow(
      fixture
    );


    expectError(
      "A011_FINAL_CURRENT_AUTHORIZATION_EXPIRED_DENY",

      () =>
        callGate(
          fixture,
          "CONSUMPTION-A011-FINAL-EXPIRED"
        ),

      "GUARDED_CURRENT_AUTHORIZATION_DENIED"
    );


    const state =
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          fixture.consumptionRegistryPath
      });


    if (
      state.record_count !==
      0
    ) {
      fail(
        "A011_FINAL_EXPIRED_AUTHORIZATION_CONSUMED"
      );
    }


    console.log(
      "A011_FINAL_EXPIRED_AUTHORIZATION_NOT_CONSUMED=PASS"
    );
  }


  /*
   * =====================================================
   * 11. EVIDENCE SUBSTITUTION
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    materializeHistoricalAllow(
      fixture
    );


    expectError(
      "A011_FINAL_EVIDENCE_SUBSTITUTION_DENY",

      () =>
        verifyHistoricalAuthorization({
          evtLogPath:
            fixture.evtLogPath,

          evtId:
            fixture.evtId,

          mandateRegistryPath:
            fixture.mandateRegistryPath,

          runtimeRegistryPath:
            fixture.runtimeRegistryPath,

          revocationRegistryPath:
            fixture.revocationRegistryPath,

          authority: {
            ...fixture.authority,

            function:
              "SUBSTITUTED_FUNCTION"
          },

          decisionEvidence:
            fixture.decisionEvidence,

          authorization:
            fixture.authorization,

          request:
            fixture.request,

          policyContext:
            fixture.policyContext,

          expectedEvaluator
        }),

      "A010_AUTHORITY_HASH_MISMATCH"
    );
  }


  /*
   * =====================================================
   * 12. CONCURRENT DOUBLE GUARDED CLAIM
   * =====================================================
   */

  {
    const fixture =
      buildFixture();


    materializeHistoricalAllow(
      fixture
    );


    const workerPath =
      join(
        root,
        "a011-race-worker.mjs"
      );

    const fixturePath =
      join(
        root,
        "a011-race-fixture.json"
      );


    const guardedModuleUrl =
      pathToFileURL(
        join(
          process.cwd(),
          "protocol",
          "hbce-guarded-consumption.reference.mjs"
        )
      ).href;


    writeFileSync(
      fixturePath,

      JSON.stringify(
        {
          evtLogPath:
            fixture.evtLogPath,

          evtId:
            fixture.evtId,

          mandateRegistryPath:
            fixture.mandateRegistryPath,

          runtimeRegistryPath:
            fixture.runtimeRegistryPath,

          revocationRegistryPath:
            fixture.revocationRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          authority:
            fixture.authority,

          decisionEvidence:
            fixture.decisionEvidence,

          authorization:
            fixture.authorization,

          request:
            fixture.request,

          policyContext:
            fixture.policyContext,

          expectedEvaluator
        }
      ),

      "utf8"
    );


    writeFileSync(
      workerPath,

`import {
  readFileSync
} from "node:fs";


const {
  guardedConsumeAuthorization
} =
  await import(
    ${JSON.stringify(guardedModuleUrl)}
  );


const [
  fixturePath,
  suffix
] =
  process.argv.slice(2);


const fixture =
  JSON.parse(
    readFileSync(
      fixturePath,
      "utf8"
    )
  );


try {
  const receipt =
    guardedConsumeAuthorization({
      ...fixture,

      consumptionId:
        \`CONSUMPTION-A011-FINAL-RACE-\${suffix}\`,

      consumedBy:
        \`IPR-RACE-\${suffix}\`
    });


  console.log(
    \`SUCCESS:\${receipt.consumption_id}\`
  );
} catch (error) {
  console.log(
    \`DENY:\${error.message}\`
  );
}
`,

      "utf8"
    );


    const [
      raceA,
      raceB
    ] =
      await Promise.all([
        runWorker(
          workerPath,
          fixturePath,
          "A"
        ),

        runWorker(
          workerPath,
          fixturePath,
          "B"
        )
      ]);


    if (
      raceA.code !== 0 ||
      raceB.code !== 0
    ) {
      fail(
        `A011_FINAL_RACE_WORKER_CRASH:${JSON.stringify({
          raceA,
          raceB
        })}`
      );
    }


    const outputs = [
      raceA.stdout,
      raceB.stdout
    ];


    console.log(
      `A011_FINAL_RACE_A=${raceA.stdout}`
    );

    console.log(
      `A011_FINAL_RACE_B=${raceB.stdout}`
    );


    const winners =
      outputs.filter(
        (value) =>
          value.startsWith(
            "SUCCESS:"
          )
      );


    const allowedDenies =
      new Set([
        "DENY:CONSUMPTION_REGISTRY_LOCKED",
        "DENY:AUTHORIZATION_ALREADY_CONSUMED"
      ]);


    const losers =
      outputs.filter(
        (value) =>
          allowedDenies.has(
            value
          )
      );


    if (
      winners.length !==
        1 ||
      losers.length !==
        1
    ) {
      fail(
        `A011_FINAL_CONCURRENT_RESULT_INVALID:${JSON.stringify(outputs)}`
      );
    }


    const consumptionState =
      verifyAuthorizationConsumptionRegistry({
        registryPath:
          fixture.consumptionRegistryPath
      });


    if (
      consumptionState.valid !==
        true ||
      consumptionState.record_count !==
        1
    ) {
      fail(
        `A011_FINAL_CONCURRENT_DOUBLE_CONSUMPTION:${JSON.stringify(consumptionState)}`
      );
    }


    const persisted =
      getAuthorizationConsumption({
        registryPath:
          fixture.consumptionRegistryPath,

        authorizationId:
          fixture.authorizationId
      });


    if (!persisted) {
      fail(
        "A011_FINAL_CONCURRENT_CONSUMPTION_MISSING"
      );
    }


    console.log(
      "A011_FINAL_CONCURRENT_ONE_WINNER=PASS"
    );

    console.log(
      "A011_FINAL_CONCURRENT_ONE_FAIL_CLOSED=PASS"
    );

    console.log(
      "A011_FINAL_CONCURRENT_SINGLE_RECORD=PASS"
    );
  }


  /*
   * =====================================================
   * FINAL MATRIX
   * =====================================================
   */

  console.log("");
  console.log(
    "===== A011 FINAL MATRIX ====="
  );

  console.log(
    "VALID_AUTHORIZATION=PASS"
  );

  console.log(
    "OVER_LIMIT=DENY"
  );

  console.log(
    "RUNTIME_SUBSTITUTION=DENY"
  );

  console.log(
    "EXPIRED_MANDATE=DENY"
  );

  console.log(
    "REVOKED_MANDATE=DENY"
  );

  console.log(
    "FUTURE_MANDATE_EVIDENCE=DENY"
  );

  console.log(
    "FUTURE_RUNTIME_EVIDENCE=DENY"
  );

  console.log(
    "CURRENT_AUTHORIZATION_REVOKED=DENY"
  );

  console.log(
    "CURRENT_AUTHORIZATION_EXPIRED=DENY"
  );

  console.log(
    "SEQUENTIAL_REPLAY=DENY"
  );

  console.log(
    "CONCURRENT_DOUBLE_CLAIM=DENY"
  );

  console.log(
    "EVIDENCE_SUBSTITUTION=DENY"
  );

  console.log("");
  console.log(
    "A011_FINAL_GOLDEN_NEGATIVE_GATE=PASS"
  );

  console.log(
    "A011_AUTHORIZATION_CONTROL_PLANE=PASS"
  );

  console.log(
    "A011_GUARDED_CONSUMPTION_CONTROL_PLANE=PASS"
  );

  console.log(
    "A011_EXECUTION_NOT_TESTED=TRUE"
  );

  console.log(
    "A011_EXECUTION_ATOMICITY_NOT_CLAIMED=TRUE"
  );

  console.log(
    "A011_TRUSTED_EXTERNAL_TIME_NOT_CLAIMED=TRUE"
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
