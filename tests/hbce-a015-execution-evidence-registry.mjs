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
  consumeAuthorization
} from "../protocol/hbce-authorization-consumption.reference.mjs";


import {
  hashCanonicalArtifact
} from "../protocol/hbce-authorization-evaluator.reference.mjs";


import {
  appendExecutionEvidence,
  getExecutionEvidence,
  listExecutionEvidence,
  listExecutionEvidenceForExecution,
  verifyExecutionEvidenceRegistry
} from "../protocol/hbce-execution-evidence-registry.reference.mjs";


const root =
  mkdtempSync(
    join(
      tmpdir(),
      "hbce-a015-"
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
    actual !== expected
  ) {
    fail(
      `${label}:EXPECTED=${expected}:ACTUAL=${actual}`
    );
  }

  console.log(
    `${label}=PASS`
  );
}


function createFixture(
  suffix
) {
  const dir =
    join(
      root,
      suffix
    );

  const consumptionRegistryPath =
    join(
      dir,
      "consumption.jsonl"
    );

  const executionRegistryPath =
    join(
      dir,
      "execution.jsonl"
    );


  writeFileSync(
    join(
      root,
      ".keep"
    ),
    "",
    "utf8"
  );


  /*
   * mkdir via recursive creation of a harmless file path
   * is deliberately avoided. Use the parent helper below.
   */

  return {
    dir,
    consumptionRegistryPath,
    executionRegistryPath
  };
}


import {
  mkdirSync
} from "node:fs";


function prepareFixture(
  suffix
) {
  const fixture =
    createFixture(
      suffix
    );

  mkdirSync(
    fixture.dir,
    {
      recursive:
        true
    }
  );

  const runtimeBinding = {
    runtime_id:
      "A27",

    runtime_type:
      "AI_AGENT",

    runtime_version:
      "1.0",

    runtime_digest_sha256:
      "c".repeat(64)
  };


  const authorization = {
    authorization_id:
      `AUTHORIZATION-A015-${suffix}`,

    status:
      "ISSUED",

    usage: {
      mode:
        "SINGLE_USE",

      max_uses:
        1
    },

    issued_at:
      "2026-08-24T10:00:00Z"
  };


  const evtId =
    `EVT-A015-${suffix}`;

  const evtSha =
    "a".repeat(64);


  const consumption =
    consumeAuthorization({
      registryPath:
        fixture.consumptionRegistryPath,

      consumptionId:
        `CONSUMPTION-A015-${suffix}`,

      authorization,

      evaluationEvtId:
        evtId,

      evaluationEvtSha256:
        evtSha,

      presentedRuntimeBindingSha256:
        hashCanonicalArtifact(
          runtimeBinding
        ),

      consumedAt:
        "2026-08-24T10:05:00Z",

      consumedBy:
        "IPR-BANK-001"
    });


  return {
    ...fixture,
    authorization,
    runtimeBinding,
    evtId,
    evtSha,
    consumption
  };
}


function baseAttempt(
  fixture,
  {
    evidenceId =
      "EXECUTION-EVIDENCE-A015-ATTEMPT",

    executionId =
      "EXECUTION-A015-001",

    attemptId =
      "EXECUTION-ATTEMPT-A015-001"
  } = {}
) {
  return {
    schema_version:
      "1.0",

    evidence_id:
      evidenceId,

    evidence_type:
      "EXECUTION_ATTEMPTED",

    execution_id:
      executionId,

    attempt_id:
      attemptId,

    authorization: {
      authorization_id:
        fixture.authorization
          .authorization_id,

      authorization_sha256:
        fixture.consumption
          .authorization_sha256
    },

    consumption: {
      consumption_id:
        fixture.consumption
          .consumption_id,

      consumption_record_sha256:
        fixture.consumption
          .record_sha256
    },

    evaluation_evt: {
      evt_id:
        fixture.consumption
          .evaluation_evt_id,

      evt_sha256:
        fixture.consumption
          .evaluation_evt_sha256
    },

    request_sha256:
      "b".repeat(64),

    runtime_binding: {
      ...fixture.runtimeBinding
    },

    execution_payload_sha256:
      "d".repeat(64),

    idempotency: {
      key_sha256:
        "e".repeat(64),

      scope:
        "EXECUTION_ATTEMPT",

      external_enforcement:
        "NOT_CONFIRMED"
    },

    observation_evidence_sha256:
      "f".repeat(64),

    occurred_at:
      "2026-08-24T10:06:00Z",

    recorded_at:
      "2026-08-24T10:06:01Z",

    time_source: {
      source:
        "LOCAL_SYSTEM_CLOCK",

      trusted_external_time:
        false
    },

    evidence_source: {
      source_type:
        "EXECUTION_ADAPTER",

      source_reference:
        "HBCE-EXECUTION-ADAPTER-001",

      verification_state:
        "VERIFIED"
    },

    privacy: {
      raw_request_included:
        false,

      raw_execution_payload_included:
        false,

      raw_external_response_included:
        false
    }
  };
}


function acceptedFrom(
  attempt,
  attemptRecord
) {
  return {
    ...attempt,

    evidence_id:
      "EXECUTION-EVIDENCE-A015-ACCEPTED",

    evidence_type:
      "EXECUTION_ACCEPTED",

    previous_evidence: {
      evidence_id:
        attempt.evidence_id,

      evidence_sha256:
        attemptRecord
          .evidence_sha256
    },

    idempotency: {
      ...attempt.idempotency,

      external_enforcement:
        "CONFIRMED"
    },

    observation_evidence_sha256:
      "1".repeat(64),

    occurred_at:
      "2026-08-24T10:07:00Z",

    recorded_at:
      "2026-08-24T10:07:01Z",

    external_evidence: {
      evidence_kind:
        "ACCEPTANCE",

      external_system_reference:
        "BANK-CORE-001",

      external_operation_reference:
        "OP-A015-001",

      evidence_sha256:
        "2".repeat(64),

      external_observed_at:
        "2026-08-24T10:07:00Z"
    }
  };
}


function completedFrom(
  accepted,
  acceptedRecord
) {
  return {
    ...accepted,

    evidence_id:
      "EXECUTION-EVIDENCE-A015-COMPLETED",

    evidence_type:
      "EXECUTION_COMPLETED",

    previous_evidence: {
      evidence_id:
        accepted.evidence_id,

      evidence_sha256:
        acceptedRecord
          .evidence_sha256
    },

    observation_evidence_sha256:
      "3".repeat(64),

    occurred_at:
      "2026-08-24T10:08:00Z",

    recorded_at:
      "2026-08-24T10:08:01Z",

    external_evidence: {
      ...accepted.external_evidence,

      evidence_kind:
        "COMPLETION",

      evidence_sha256:
        "4".repeat(64),

      external_observed_at:
        "2026-08-24T10:08:00Z"
    }
  };
}


function outcomeFrom(
  completed,
  completedRecord
) {
  return {
    ...completed,

    evidence_id:
      "EXECUTION-EVIDENCE-A015-OUTCOME",

    evidence_type:
      "OUTCOME_OBSERVED",

    previous_evidence: {
      evidence_id:
        completed.evidence_id,

      evidence_sha256:
        completedRecord
          .evidence_sha256
    },

    observation_evidence_sha256:
      "5".repeat(64),

    occurred_at:
      "2026-08-24T10:09:00Z",

    recorded_at:
      "2026-08-24T10:09:01Z",

    external_evidence: {
      ...completed.external_evidence,

      evidence_kind:
        "OUTCOME",

      evidence_sha256:
        "6".repeat(64),

      external_observed_at:
        "2026-08-24T10:09:00Z"
    },

    outcome: {
      status:
        "SUCCEEDED",

      outcome_code:
        "PAYMENT_PROCESSED",

      finality:
        "PROVISIONAL",

      business_reference:
        "BANK-OP-A015-001"
    }
  };
}


try {

  /*
   * =====================================================
   * 1. CANONICAL FOUR-STAGE CHAIN
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "CHAIN"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    console.log(
      "A015_ATTEMPT_APPEND=PASS"
    );


    const accepted =
      acceptedFrom(
        attempt,
        attemptRecord
      );


    const acceptedRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          accepted,

        appendedAt:
          "2026-08-24T10:07:02Z"
      });


    console.log(
      "A015_ACCEPTED_APPEND=PASS"
    );


    const completed =
      completedFrom(
        accepted,
        acceptedRecord
      );


    const completedRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          completed,

        appendedAt:
          "2026-08-24T10:08:02Z"
      });


    console.log(
      "A015_COMPLETED_APPEND=PASS"
    );


    const outcome =
      outcomeFrom(
        completed,
        completedRecord
      );


    const outcomeRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          outcome,

        appendedAt:
          "2026-08-24T10:09:02Z"
      });


    console.log(
      "A015_OUTCOME_APPEND=PASS"
    );


    if (
      outcomeRecord.evidence
        .outcome.finality !==
        "PROVISIONAL"
    ) {
      fail(
        "A015_SUCCESS_IMPLIED_FINALITY"
      );
    }


    console.log(
      "A015_SUCCESS_NOT_FINALITY=PASS"
    );


    const verification =
      verifyExecutionEvidenceRegistry({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath
      });


    if (
      verification.valid !==
        true ||
      verification.record_count !==
        4 ||
      verification.execution_count !==
        1 ||
      typeof verification
        .head_record_sha256 !==
        "string"
    ) {
      fail(
        `A015_REGISTRY_VERIFY_INVALID:${JSON.stringify(verification)}`
      );
    }


    console.log(
      "A015_CANONICAL_CHAIN_VERIFY=PASS"
    );


    const all =
      listExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath
      });


    if (
      all.length !==
        4
    ) {
      fail(
        "A015_LIST_COUNT_INVALID"
      );
    }


    const execution =
      listExecutionEvidenceForExecution({
        registryPath:
          fixture.executionRegistryPath,

        executionId:
          attempt.execution_id
      });


    if (
      execution.length !==
        4
    ) {
      fail(
        "A015_EXECUTION_LIST_COUNT_INVALID"
      );
    }


    const fetched =
      getExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        evidenceId:
          completed.evidence_id
      });


    if (
      fetched?.evidence_type !==
        "EXECUTION_COMPLETED"
    ) {
      fail(
        "A015_GET_EVIDENCE_INVALID"
      );
    }


    console.log(
      "A015_READ_API=PASS"
    );
  }


  /*
   * =====================================================
   * 2. SEQUENCE MUST START WITH ATTEMPT
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "START"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const fakeAttemptRecord = {
      evidence_sha256:
        "7".repeat(64)
    };


    const accepted =
      acceptedFrom(
        attempt,
        fakeAttemptRecord
      );


    expectError(
      "A015_ACCEPTED_CANNOT_START_CHAIN",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            accepted,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_SEQUENCE_MUST_START_ATTEMPTED"
    );
  }


  /*
   * =====================================================
   * 3. NO STAGE SKIPPING
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "SKIP"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        attemptRecord
      );


    const fakeAcceptedRecord = {
      evidence_sha256:
        "8".repeat(64)
    };


    const completed =
      completedFrom(
        accepted,
        fakeAcceptedRecord
      );


    completed.previous_evidence = {
      evidence_id:
        attempt.evidence_id,

      evidence_sha256:
        attemptRecord
          .evidence_sha256
    };


    expectError(
      "A015_STAGE_SKIP_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            completed,

          appendedAt:
            "2026-08-24T10:08:02Z"
        }),

      "EXECUTION_TRANSITION_INVALID"
    );
  }


  /*
   * =====================================================
   * 4. PREVIOUS EVIDENCE HASH BINDING
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "PREVIOUS"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        attempt,

      appendedAt:
        "2026-08-24T10:06:02Z"
    });


    const accepted = {
      ...acceptedFrom(
        attempt,
        {
          evidence_sha256:
            "9".repeat(64)
        }
      )
    };


    expectError(
      "A015_PREVIOUS_EVIDENCE_SUBSTITUTION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            accepted,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_PREVIOUS_EVIDENCE_MISMATCH"
    );
  }


  /*
   * =====================================================
   * 5. RUNTIME SUBSTITUTION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "RUNTIME"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        attemptRecord
      );


    accepted.runtime_binding = {
      ...accepted.runtime_binding,

      runtime_id:
        "A28"
    };


    expectError(
      "A015_RUNTIME_SUBSTITUTION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            accepted,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_RUNTIME_BINDING_MISMATCH"
    );
  }


  /*
   * =====================================================
   * 6. CONSUMPTION RECORD SUBSTITUTION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "CONSUMPTIONHASH"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    attempt.consumption = {
      ...attempt.consumption,

      consumption_record_sha256:
        "0".repeat(64)
    };


    expectError(
      "A015_CONSUMPTION_HASH_SUBSTITUTION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            attempt,

          appendedAt:
            "2026-08-24T10:06:02Z"
        }),

      "EXECUTION_CONSUMPTION_RECORD_SHA256_MISMATCH"
    );
  }


  /*
   * =====================================================
   * 7. SINGLE CONSUMPTION CANNOT SPAWN TWO EXECUTIONS
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "DOUBLEEXEC"
      );


    const first =
      baseAttempt(
        fixture,
        {
          evidenceId:
            "EXECUTION-EVIDENCE-A015-FIRST",

          executionId:
            "EXECUTION-A015-FIRST",

          attemptId:
            "EXECUTION-ATTEMPT-A015-FIRST"
        }
      );


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        first,

      appendedAt:
        "2026-08-24T10:06:02Z"
    });


    const second =
      baseAttempt(
        fixture,
        {
          evidenceId:
            "EXECUTION-EVIDENCE-A015-SECOND",

          executionId:
            "EXECUTION-A015-SECOND",

          attemptId:
            "EXECUTION-ATTEMPT-A015-SECOND"
        }
      );


    expectError(
      "A015_SINGLE_CONSUMPTION_SECOND_EXECUTION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            second,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_CONSUMPTION_ALREADY_BOUND"
    );
  }


  /*
   * =====================================================
   * 8. APPEND CHRONOLOGY
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "TIME"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:08:00Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        attemptRecord
      );


    expectError(
      "A015_BACKDATED_APPEND_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            accepted,

          appendedAt:
            "2026-08-24T10:07:00Z"
        }),

      "EXECUTION_REGISTRY_TIME_ORDER_INVALID"
    );
  }


  /*
   * =====================================================
   * 9. TERMINAL CHAIN
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "TERMINAL"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const r1 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        r1
      );


    const r2 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          accepted,

        appendedAt:
          "2026-08-24T10:07:02Z"
      });


    const completed =
      completedFrom(
        accepted,
        r2
      );


    const r3 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          completed,

        appendedAt:
          "2026-08-24T10:08:02Z"
      });


    const outcome =
      outcomeFrom(
        completed,
        r3
      );


    const r4 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          outcome,

        appendedAt:
          "2026-08-24T10:09:02Z"
      });


    const impossible = {
      ...outcome,

      evidence_id:
        "EXECUTION-EVIDENCE-A015-AFTER-OUTCOME",

      previous_evidence: {
        evidence_id:
          outcome.evidence_id,

        evidence_sha256:
          r4.evidence_sha256
      },

      observation_evidence_sha256:
        "7".repeat(64)
    };


    expectError(
      "A015_TERMINAL_SEQUENCE_ENFORCED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            impossible,

          appendedAt:
            "2026-08-24T10:10:02Z"
        }),

      "EXECUTION_SEQUENCE_ALREADY_TERMINAL"
    );
  }


  /*
   * =====================================================
   * 10. EVIDENCE TAMPER DETECTION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "TAMPER"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        attempt,

      appendedAt:
        "2026-08-24T10:06:02Z"
    });


    const raw =
      readFileSync(
        fixture.executionRegistryPath,
        "utf8"
      );


    const record =
      JSON.parse(
        raw.trim()
      );


    record.evidence
      .observation_evidence_sha256 =
      "0".repeat(64);


    writeFileSync(
      fixture.executionRegistryPath,
      `${JSON.stringify(record)}\n`,
      "utf8"
    );


    expectError(
      "A015_EVIDENCE_TAMPER_DETECTED",

      () =>
        verifyExecutionEvidenceRegistry({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath
        }),

      "EXECUTION_REGISTRY_EVIDENCE_HASH_MISMATCH:1"
    );
  }


  /*
   * =====================================================
   * 11. GLOBAL HASH CHAIN TAMPER
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "CHAINHASH"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const r1 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        r1
      );


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        accepted,

      appendedAt:
        "2026-08-24T10:07:02Z"
    });


    const records =
      readFileSync(
        fixture.executionRegistryPath,
        "utf8"
      )
        .trim()
        .split("\n")
        .map(
          (line) =>
            JSON.parse(line)
        );


    records[1]
      .previous_record_sha256 =
      "0".repeat(64);


    writeFileSync(
      fixture.executionRegistryPath,
      `${records
        .map(
          (record) =>
            JSON.stringify(record)
        )
        .join("\n")}\n`,
      "utf8"
    );


    expectError(
      "A015_RECORD_CHAIN_TAMPER_DETECTED",

      () =>
        verifyExecutionEvidenceRegistry({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath
        }),

      "EXECUTION_REGISTRY_CHAIN_MISMATCH:2"
    );
  }


  /*
   * =====================================================
   * 12. IDEMPOTENCY ENFORCEMENT CANNOT REGRESS
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "IDEMPOTENCY"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    attempt.idempotency = {
      ...attempt.idempotency,

      external_enforcement:
        "CONFIRMED"
    };


    const r1 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        r1
      );


    accepted.idempotency = {
      ...accepted.idempotency,

      external_enforcement:
        "NOT_CONFIRMED"
    };


    expectError(
      "A015_IDEMPOTENCY_REGRESSION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            accepted,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_IDEMPOTENCY_ENFORCEMENT_REGRESSION"
    );
  }


  /*
   * =====================================================
   * 13. ATTEMPT MAY TERMINATE IN REJECTION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "REJECTBRANCH"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const rejected = {
      ...attempt,

      evidence_id:
        "EXECUTION-EVIDENCE-A015-REJECTED",

      evidence_type:
        "OUTCOME_OBSERVED",

      previous_evidence: {
        evidence_id:
          attempt.evidence_id,

        evidence_sha256:
          attemptRecord
            .evidence_sha256
      },

      observation_evidence_sha256:
        "8".repeat(64),

      occurred_at:
        "2026-08-24T10:07:00Z",

      recorded_at:
        "2026-08-24T10:07:01Z",

      external_evidence: {
        evidence_kind:
          "OUTCOME",

        external_system_reference:
          "BANK-CORE-001",

        external_operation_reference:
          "OP-A015-REJECTED",

        evidence_sha256:
          "9".repeat(64),

        external_observed_at:
          "2026-08-24T10:07:00Z"
      },

      outcome: {
        status:
          "REJECTED",

        outcome_code:
          "BANK_REJECTED",

        finality:
          "PROVISIONAL"
      }
    };


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        rejected,

      appendedAt:
        "2026-08-24T10:07:02Z"
    });


    console.log(
      "A015_ATTEMPT_TO_REJECTED_OUTCOME=PASS"
    );
  }


  /*
   * =====================================================
   * 14. ACCEPTED MAY TERMINATE IN FAILURE
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "FAILBRANCH"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const r1 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const accepted =
      acceptedFrom(
        attempt,
        r1
      );


    const r2 =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          accepted,

        appendedAt:
          "2026-08-24T10:07:02Z"
      });


    const failed = {
      ...accepted,

      evidence_id:
        "EXECUTION-EVIDENCE-A015-FAILED",

      evidence_type:
        "OUTCOME_OBSERVED",

      previous_evidence: {
        evidence_id:
          accepted.evidence_id,

        evidence_sha256:
          r2.evidence_sha256
      },

      observation_evidence_sha256:
        "a".repeat(64),

      occurred_at:
        "2026-08-24T10:08:00Z",

      recorded_at:
        "2026-08-24T10:08:01Z",

      external_evidence: {
        ...accepted.external_evidence,

        evidence_kind:
          "OUTCOME",

        evidence_sha256:
          "b".repeat(64),

        external_observed_at:
          "2026-08-24T10:08:00Z"
      },

      outcome: {
        status:
          "FAILED",

        outcome_code:
          "EXECUTION_FAILED",

        finality:
          "PROVISIONAL"
      }
    };


    appendExecutionEvidence({
      registryPath:
        fixture.executionRegistryPath,

      consumptionRegistryPath:
        fixture.consumptionRegistryPath,

      evidence:
        failed,

      appendedAt:
        "2026-08-24T10:08:02Z"
    });


    console.log(
      "A015_ACCEPTED_TO_FAILED_OUTCOME=PASS"
    );
  }


  /*
   * =====================================================
   * 15. SUCCESS CANNOT BYPASS COMPLETION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "SUCCESSBYPASS"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    const attemptRecord =
      appendExecutionEvidence({
        registryPath:
          fixture.executionRegistryPath,

        consumptionRegistryPath:
          fixture.consumptionRegistryPath,

        evidence:
          attempt,

        appendedAt:
          "2026-08-24T10:06:02Z"
      });


    const impossibleSuccess = {
      ...attempt,

      evidence_id:
        "EXECUTION-EVIDENCE-A015-ILLEGAL-SUCCESS",

      evidence_type:
        "OUTCOME_OBSERVED",

      previous_evidence: {
        evidence_id:
          attempt.evidence_id,

        evidence_sha256:
          attemptRecord
            .evidence_sha256
      },

      observation_evidence_sha256:
        "c".repeat(64),

      occurred_at:
        "2026-08-24T10:07:00Z",

      recorded_at:
        "2026-08-24T10:07:01Z",

      external_evidence: {
        evidence_kind:
          "OUTCOME",

        external_system_reference:
          "BANK-CORE-001",

        external_operation_reference:
          "OP-A015-ILLEGAL-SUCCESS",

        evidence_sha256:
          "d".repeat(64),

        external_observed_at:
          "2026-08-24T10:07:00Z"
      },

      outcome: {
        status:
          "SUCCEEDED",

        outcome_code:
          "PAYMENT_PROCESSED",

        finality:
          "PROVISIONAL"
      }
    };


    expectError(
      "A015_SUCCESS_WITHOUT_COMPLETION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            impossibleSuccess,

          appendedAt:
            "2026-08-24T10:07:02Z"
        }),

      "EXECUTION_SUCCESS_REQUIRES_COMPLETION"
    );
  }


  /*
   * =====================================================
   * 16. INITIAL EXECUTION RUNTIME MUST MATCH ADMISSION
   * =====================================================
   */

  {
    const fixture =
      prepareFixture(
        "INITIALADMISSIONRUNTIME"
      );


    const attempt =
      baseAttempt(
        fixture
      );


    attempt.runtime_binding = {
      ...attempt.runtime_binding,

      runtime_id:
        "A28"
    };


    expectError(
      "A015_INITIAL_ADMISSION_RUNTIME_SUBSTITUTION_DENIED",

      () =>
        appendExecutionEvidence({
          registryPath:
            fixture.executionRegistryPath,

          consumptionRegistryPath:
            fixture.consumptionRegistryPath,

          evidence:
            attempt,

          appendedAt:
            "2026-08-24T10:06:02Z"
        }),

      "EXECUTION_ADMISSION_RUNTIME_BINDING_MISMATCH"
    );
  }


  console.log("");
  console.log(
    "===== A015 FINAL MATRIX ====="
  );

  console.log(
    "APPEND_ONLY_RECORD_CHAIN=PASS"
  );

  console.log(
    "CONSUMPTION_BINDING=PASS"
  );

  console.log(
    "ATTEMPTED_TO_ACCEPTED=ENFORCED"
  );

  console.log(
    "ACCEPTED_TO_COMPLETED=ENFORCED"
  );

  console.log(
    "COMPLETED_TO_OUTCOME=ENFORCED"
  );

  console.log(
    "STAGE_SKIPPING=DENIED"
  );

  console.log(
    "ATTEMPT_TO_TERMINAL_REJECTION=SUPPORTED"
  );

  console.log(
    "ACCEPTED_TO_TERMINAL_FAILURE=SUPPORTED"
  );

  console.log(
    "SUCCESS_WITHOUT_COMPLETION=DENIED"
  );

  console.log(
    "PREVIOUS_EVIDENCE_SUBSTITUTION=DENIED"
  );

  console.log(
    "RUNTIME_SUBSTITUTION=DENIED"
  );

  console.log(
    "INITIAL_ADMISSION_RUNTIME_SUBSTITUTION=DENIED"
  );

  console.log(
    "SECOND_EXECUTION_FROM_SINGLE_CONSUMPTION=DENIED"
  );

  console.log(
    "REGISTRY_APPEND_CHRONOLOGY=ENFORCED"
  );

  console.log(
    "EVIDENCE_TAMPER=DETECTED"
  );

  console.log(
    "RECORD_CHAIN_TAMPER=DETECTED"
  );

  console.log(
    "SUCCESS_DOES_NOT_IMPLY_FINALITY=TRUE"
  );

  console.log(
    "OCCURRED_AT_CAUSALITY=NOT_PROVEN"
  );

  console.log(
    "EXTERNAL_EVIDENCE_AUTHENTICITY=NOT_VERIFIED_BY_A015"
  );

  console.log(
    "EVALUATION_EVT_EXISTENCE=NOT_VERIFIED_BY_A015"
  );

  console.log(
    "EXTERNAL_EXECUTION=NOT_PERFORMED_BY_A015"
  );

  console.log(
    "A015_EXECUTION_EVIDENCE_REGISTRY=PASS"
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
