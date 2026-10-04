import {
  createHash
} from "node:crypto";

import {
  getSubject,
  verifySubjectRegistry
} from "./hbce-subject-registry.reference.mjs";

import {
  listSubjectBindingEvents,
  resolveSubjectBinding,
  verifySubjectBindingRegistry
} from "./hbce-subject-binding-registry.reference.mjs";


const SUBJECT_REF_PATTERN =
  /^SUB-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const CLAIM_PATTERN =
  /^[A-Z][A-Z0-9_]{1,63}$/;

const VERIFICATION_STATES =
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


function fail(code) {
  throw new Error(code);
}


function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
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
    Number.isNaN(Date.parse(value))
  ) {
    fail(code);
  }
}


function assertRequest(request) {
  if (
    request === null ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    fail(
      "SUBJECT_VERIFICATION_REQUEST_INVALID"
    );
  }

  const expectedKeys =
    new Set([
      "subject_ref",
      "claims_requested",
      "purpose",
      "context_ref"
    ]);

  const keys =
    Object.keys(request);

  if (
    keys.length !==
      expectedKeys.size
  ) {
    fail(
      "SUBJECT_VERIFICATION_REQUEST_FIELD_SET_INVALID"
    );
  }

  for (const key of keys) {
    if (!expectedKeys.has(key)) {
      fail(
        `SUBJECT_VERIFICATION_REQUEST_UNKNOWN_FIELD:${key}`
      );
    }
  }

  if (
    typeof request.subject_ref !==
      "string" ||
    !SUBJECT_REF_PATTERN.test(
      request.subject_ref
    )
  ) {
    fail(
      "SUBJECT_VERIFICATION_SUBJECT_REF_INVALID"
    );
  }

  if (
    !Array.isArray(
      request.claims_requested
    ) ||
    request.claims_requested.length === 0 ||
    request.claims_requested.length > 32
  ) {
    fail(
      "SUBJECT_VERIFICATION_CLAIMS_INVALID"
    );
  }

  const seen =
    new Set();

  for (
    const claim of
    request.claims_requested
  ) {
    if (
      typeof claim !== "string" ||
      !CLAIM_PATTERN.test(claim)
    ) {
      fail(
        "SUBJECT_VERIFICATION_CLAIM_INVALID"
      );
    }

    if (seen.has(claim)) {
      fail(
        "SUBJECT_VERIFICATION_DUPLICATE_CLAIM"
      );
    }

    seen.add(claim);
  }

  assertString(
    request.purpose,
    "SUBJECT_VERIFICATION_PURPOSE_INVALID"
  );

  assertString(
    request.context_ref,
    "SUBJECT_VERIFICATION_CONTEXT_REF_INVALID"
  );
}


function uniqueSorted(values) {
  return [
    ...new Set(values)
  ].sort();
}


function limitations() {
  return {
    ontological_truth_proven:
      false,

    physical_person_identity_proven:
      false,

    civil_identity_proven:
      false,

    legal_identity_proven:
      false,

    identity_source_authenticity_proven:
      false,

    account_holder_status_proven:
      false,

    regulatory_compliance_proven:
      false,

    trusted_external_time:
      false
  };
}


function overallStatus(results) {
  const verified =
    results.filter(
      (result) =>
        result.status ===
          "TECHNICALLY_VERIFIED"
    ).length;

  if (
    verified ===
      results.length
  ) {
    return "TECHNICALLY_VERIFIED";
  }

  if (verified > 0) {
    return "PARTIALLY_VERIFIED";
  }

  if (results.length === 1) {
    return results[0].status;
  }

  const states =
    uniqueSorted(
      results.map(
        (result) =>
          result.status
      )
    );

  if (states.length === 1) {
    return states[0];
  }

  return "UNRESOLVED";
}


function identityContinuityResult(
  observedBindings
) {
  const usable =
    observedBindings.filter(
      (entry) =>
        entry.view !== null &&
        entry.view.technically_usable ===
          true
    );

  if (usable.length > 0) {
    return {
      claim:
        "IDENTITY_CONTINUITY",

      status:
        "TECHNICALLY_VERIFIED",

      reason_code:
        "ACTIVE_SUBJECT_BINDING_OBSERVED",

      binding_refs:
        uniqueSorted(
          usable.map(
            (entry) =>
              entry.registration
                .binding_ref
          )
        ),

      evidence_refs:
        uniqueSorted(
          usable.flatMap(
            (entry) =>
              entry.registration
                .binding
                .evidence_refs
          )
        )
    };
  }

  const observed =
    observedBindings.filter(
      (entry) =>
        entry.view !== null
    );

  if (observed.length === 0) {
    return {
      claim:
        "IDENTITY_CONTINUITY",

      status:
        "INSUFFICIENT_EVIDENCE",

      reason_code:
        "NO_OBSERVED_SUBJECT_BINDING",

      binding_refs: [],
      evidence_refs: []
    };
  }

  const bindingRefs =
    uniqueSorted(
      observed.map(
        (entry) =>
          entry.registration
            .binding_ref
      )
    );

  const evidenceRefs =
    uniqueSorted(
      observed.flatMap(
        (entry) =>
          entry.registration
            .binding
            .evidence_refs
      )
    );

  if (
    observed.some(
      (entry) =>
        entry.view.revocation_state ===
          "REVOKED"
    )
  ) {
    return {
      claim:
        "IDENTITY_CONTINUITY",

      status:
        "REVOKED",

      reason_code:
        "SUBJECT_BINDING_REVOKED",

      binding_refs:
        bindingRefs,

      evidence_refs:
        evidenceRefs
    };
  }

  if (
    observed.some(
      (entry) =>
        entry.view.revocation_state ===
          "SUPERSEDED"
    )
  ) {
    return {
      claim:
        "IDENTITY_CONTINUITY",

      status:
        "SUPERSEDED",

      reason_code:
        "SUBJECT_BINDING_SUPERSEDED",

      binding_refs:
        bindingRefs,

      evidence_refs:
        evidenceRefs
    };
  }

  if (
    observed.every(
      (entry) =>
        entry.view.within_validity ===
          false
    )
  ) {
    return {
      claim:
        "IDENTITY_CONTINUITY",

      status:
        "EXPIRED",

      reason_code:
        "SUBJECT_BINDING_EXPIRED",

      binding_refs:
        bindingRefs,

      evidence_refs:
        evidenceRefs
    };
  }

  return {
    claim:
      "IDENTITY_CONTINUITY",

    status:
      "INSUFFICIENT_EVIDENCE",

    reason_code:
      "SUBJECT_BINDING_NOT_TECHNICALLY_USABLE",

    binding_refs:
      bindingRefs,

    evidence_refs:
      evidenceRefs
  };
}


function evaluateClaim(
  claim,
  observedBindings
) {
  if (
    claim ===
      "IDENTITY_CONTINUITY"
  ) {
    return identityContinuityResult(
      observedBindings
    );
  }

  if (
    claim ===
      "ACCOUNT_HOLDER"
  ) {
    return {
      claim,

      status:
        "UNRESOLVED",

      reason_code:
        "ENTITLEMENT_SOURCE_REQUIRED",

      binding_refs: [],
      evidence_refs: []
    };
  }

  return {
    claim,

    status:
      "UNRESOLVED",

    reason_code:
      "CLAIM_PROFILE_UNSUPPORTED",

    binding_refs: [],
    evidence_refs: []
  };
}


function unresolvedResponse({
  request,
  evaluatedAt,
  reasonCode,
  requestSha256,
  subjectRegistryHead,
  bindingRegistryHead
}) {
  return {
    profile_version:
      "R1.1-W1C-1.0",

    subject_ref:
      request.subject_ref,

    status:
      "UNRESOLVED",

    claims_requested:
      [...request.claims_requested],

    claim_results:
      request.claims_requested.map(
        (claim) => ({
          claim,

          status:
            "UNRESOLVED",

          reason_code:
            reasonCode,

          binding_refs: [],
          evidence_refs: []
        })
      ),

    purpose:
      request.purpose,

    context_ref:
      request.context_ref,

    evaluated_at:
      evaluatedAt,

    request_sha256:
      requestSha256,

    subject_record_sha256:
      null,

    subject_registry_head_record_sha256:
      subjectRegistryHead,

    binding_registry_head_record_sha256:
      bindingRegistryHead,

    limitations:
      limitations()
  };
}


export function verifySubjectClaims({
  subjectRegistryPath,
  bindingRegistryPath,
  request,
  evaluatedAt
}) {
  assertString(
    subjectRegistryPath,
    "SUBJECT_VERIFICATION_SUBJECT_REGISTRY_PATH_REQUIRED"
  );

  assertString(
    bindingRegistryPath,
    "SUBJECT_VERIFICATION_BINDING_REGISTRY_PATH_REQUIRED"
  );

  assertRequest(request);

  assertIsoDate(
    evaluatedAt,
    "SUBJECT_VERIFICATION_EVALUATED_AT_INVALID"
  );

  const subjectRegistryVerification =
    verifySubjectRegistry({
      registryPath:
        subjectRegistryPath
    });

  const bindingRegistryVerification =
    verifySubjectBindingRegistry({
      registryPath:
        bindingRegistryPath
    });

  if (
    subjectRegistryVerification.valid !==
      true
  ) {
    fail(
      "SUBJECT_VERIFICATION_SUBJECT_REGISTRY_INVALID"
    );
  }

  if (
    bindingRegistryVerification.valid !==
      true
  ) {
    fail(
      "SUBJECT_VERIFICATION_BINDING_REGISTRY_INVALID"
    );
  }

  const requestSha256 =
    sha256Canonical(request);

  const subjectRecord =
    getSubject({
      registryPath:
        subjectRegistryPath,

      subjectRef:
        request.subject_ref
    });

  if (!subjectRecord) {
    return unresolvedResponse({
      request,
      evaluatedAt,

      reasonCode:
        "SUBJECT_NOT_FOUND",

      requestSha256,

      subjectRegistryHead:
        subjectRegistryVerification
          .head_record_sha256,

      bindingRegistryHead:
        bindingRegistryVerification
          .head_record_sha256
    });
  }

  if (
    Date.parse(
      subjectRecord.recorded_at
    ) >
    Date.parse(evaluatedAt)
  ) {
    return unresolvedResponse({
      request,
      evaluatedAt,

      reasonCode:
        "SUBJECT_NOT_YET_OBSERVED",

      requestSha256,

      subjectRegistryHead:
        subjectRegistryVerification
          .head_record_sha256,

      bindingRegistryHead:
        bindingRegistryVerification
          .head_record_sha256
    });
  }

  const registrations =
    listSubjectBindingEvents({
      registryPath:
        bindingRegistryPath
    }).filter(
      (record) =>
        record.record_type ===
          "SUBJECT_BINDING_REGISTERED" &&
        record.subject_ref ===
          request.subject_ref
    );

  const observedBindings =
    registrations.map(
      (registration) => ({
        registration,

        view:
          resolveSubjectBinding({
            registryPath:
              bindingRegistryPath,

            bindingRef:
              registration.binding_ref,

            asOf:
              evaluatedAt
          })
      })
    );

  const claimResults =
    request.claims_requested.map(
      (claim) =>
        evaluateClaim(
          claim,
          observedBindings
        )
    );

  for (
    const result of
    claimResults
  ) {
    if (
      !VERIFICATION_STATES.has(
        result.status
      )
    ) {
      fail(
        "SUBJECT_VERIFICATION_INTERNAL_STATUS_INVALID"
      );
    }
  }

  const status =
    overallStatus(
      claimResults
    );

  if (
    !VERIFICATION_STATES.has(
      status
    )
  ) {
    fail(
      "SUBJECT_VERIFICATION_OVERALL_STATUS_INVALID"
    );
  }

  return {
    profile_version:
      "R1.1-W1C-1.0",

    subject_ref:
      request.subject_ref,

    status,

    claims_requested:
      [...request.claims_requested],

    claim_results:
      claimResults,

    purpose:
      request.purpose,

    context_ref:
      request.context_ref,

    evaluated_at:
      evaluatedAt,

    request_sha256:
      requestSha256,

    subject_record_sha256:
      subjectRecord.record_sha256,

    subject_registry_head_record_sha256:
      subjectRegistryVerification
        .head_record_sha256,

    binding_registry_head_record_sha256:
      bindingRegistryVerification
        .head_record_sha256,

    limitations:
      limitations()
  };
}
