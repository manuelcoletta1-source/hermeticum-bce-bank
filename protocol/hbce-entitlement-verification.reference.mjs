import {
  getSubject,
  verifySubjectRegistry
} from "./hbce-subject-registry.reference.mjs";

import {
  resolveEntitlementSource,
  verifyEntitlementSourceRegistry
} from "./hbce-entitlement-source-registry.reference.mjs";


const ENTITLEMENT_REF_PATTERN =
  /^ENT-[A-Z0-9][A-Z0-9._:-]{2,127}$/;

const SUPPORTED_METHOD =
  "HBCE_REGISTERED_EVIDENCE_REFERENCE_V1";


function fail(code) {
  throw new Error(code);
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


function result({
  entitlementRef,
  subjectRef = null,
  status,
  reasonCode,
  evaluatedAt,
  entitlementSha256 = null,
  registrationRecordSha256 = null,
  entitlementRegistryHead = null,
  subjectRegistryHead = null,
  evidenceRefs = []
}) {
  return {
    profile_version:
      "R1.1-W2A-1.0",

    entitlement_ref:
      entitlementRef,

    subject_ref:
      subjectRef,

    status,

    reason_code:
      reasonCode,

    evaluated_at:
      evaluatedAt,

    entitlement_sha256:
      entitlementSha256,

    registration_record_sha256:
      registrationRecordSha256,

    entitlement_registry_head_record_sha256:
      entitlementRegistryHead,

    subject_registry_head_record_sha256:
      subjectRegistryHead,

    evidence_refs:
      [...evidenceRefs],

    checks: {
      registry_integrity:
        true,

      subject_registered:
        subjectRef !== null,

      lifecycle_active:
        status ===
          "TECHNICALLY_VERIFIED",

      effective_window:
        status ===
          "TECHNICALLY_VERIFIED",

      verification_method_supported:
        status ===
          "TECHNICALLY_VERIFIED",

      evidence_present:
        status ===
          "TECHNICALLY_VERIFIED"
    },

    limitations: {
      api_record_is_source_of_power:
        false,

      external_source_authenticity_proven:
        false,

      legal_entitlement_proven:
        false,

      legal_interpretation_proven:
        false,

      authority_derived:
        false,

      authorization_created:
        false,

      account_holder_fact_proven:
        false,

      regulatory_compliance_proven:
        false,

      trusted_external_time:
        false
    }
  };
}


export function verifyEntitlementSource({
  entitlementRegistryPath,
  subjectRegistryPath,
  entitlementRef,
  evaluatedAt
}) {
  if (
    typeof entitlementRef !==
      "string" ||
    !ENTITLEMENT_REF_PATTERN.test(
      entitlementRef
    )
  ) {
    fail(
      "ENTITLEMENT_VERIFICATION_REF_INVALID"
    );
  }

  assertIsoDate(
    evaluatedAt,
    "ENTITLEMENT_VERIFICATION_TIME_INVALID"
  );

  const entitlementRegistry =
    verifyEntitlementSourceRegistry({
      registryPath:
        entitlementRegistryPath
    });

  const subjectRegistry =
    verifySubjectRegistry({
      registryPath:
        subjectRegistryPath
    });

  if (
    entitlementRegistry.valid !==
      true
  ) {
    fail(
      "ENTITLEMENT_VERIFICATION_REGISTRY_INVALID"
    );
  }

  if (
    subjectRegistry.valid !==
      true
  ) {
    fail(
      "ENTITLEMENT_VERIFICATION_SUBJECT_REGISTRY_INVALID"
    );
  }

  const view =
    resolveEntitlementSource({
      registryPath:
        entitlementRegistryPath,

      entitlementRef,

      asOf:
        evaluatedAt
    });

  if (!view) {
    return result({
      entitlementRef,

      status:
        "UNRESOLVED",

      reasonCode:
        "ENTITLEMENT_NOT_FOUND_OR_NOT_YET_OBSERVED",

      evaluatedAt,

      entitlementRegistryHead:
        entitlementRegistry
          .head_record_sha256,

      subjectRegistryHead:
        subjectRegistry
          .head_record_sha256
    });
  }

  const entitlement =
    view.entitlement;

  const common = {
    entitlementRef,

    subjectRef:
      entitlement.subject_ref,

    evaluatedAt,

    entitlementSha256:
      view.entitlement_sha256,

    registrationRecordSha256:
      view.registration_record_sha256,

    entitlementRegistryHead:
      entitlementRegistry
        .head_record_sha256,

    subjectRegistryHead:
      subjectRegistry
        .head_record_sha256,

    evidenceRefs:
      entitlement.evidence_refs
  };

  const subject =
    getSubject({
      registryPath:
        subjectRegistryPath,

      subjectRef:
        entitlement.subject_ref
    });

  if (
    !subject ||
    Date.parse(
      subject.recorded_at
    ) >
    Date.parse(evaluatedAt)
  ) {
    return result({
      ...common,

      status:
        "UNRESOLVED",

      reasonCode:
        "ENTITLEMENT_SUBJECT_NOT_OBSERVED"
    });
  }

  if (
    view.revocation_state ===
      "REVOKED"
  ) {
    return result({
      ...common,

      status:
        "REVOKED",

      reasonCode:
        "ENTITLEMENT_SOURCE_REVOKED"
    });
  }

  if (
    view.revocation_state ===
      "SUPERSEDED"
  ) {
    return result({
      ...common,

      status:
        "SUPERSEDED",

      reasonCode:
        "ENTITLEMENT_SOURCE_SUPERSEDED"
    });
  }

  if (
    view.effective_started !==
      true
  ) {
    return result({
      ...common,

      status:
        "UNRESOLVED",

      reasonCode:
        "ENTITLEMENT_NOT_YET_EFFECTIVE"
    });
  }

  if (
    view.within_effective_window !==
      true
  ) {
    return result({
      ...common,

      status:
        "EXPIRED",

      reasonCode:
        "ENTITLEMENT_SOURCE_EXPIRED"
    });
  }

  if (
    entitlement.verification_method !==
      SUPPORTED_METHOD
  ) {
    return result({
      ...common,

      status:
        "UNRESOLVED",

      reasonCode:
        "ENTITLEMENT_VERIFICATION_METHOD_UNSUPPORTED"
    });
  }

  if (
    entitlement.evidence_refs.length ===
      0
  ) {
    return result({
      ...common,

      status:
        "INSUFFICIENT_EVIDENCE",

      reasonCode:
        "ENTITLEMENT_EVIDENCE_REQUIRED"
    });
  }

  /*
   * TECHNICALLY_VERIFIED here means only:
   *
   * - canonical registry record is intact
   * - Subject exists and was observed
   * - lifecycle is active
   * - effective window contains evaluatedAt
   * - supported technical verification profile is declared
   * - evidence references are present
   *
   * It does NOT authenticate the external issuer/source
   * and does NOT establish legal entitlement or authority.
   */
  return result({
    ...common,

    status:
      "TECHNICALLY_VERIFIED",

    reasonCode:
      "ENTITLEMENT_REGISTERED_EVIDENCE_PROFILE_VERIFIED"
  });
}


export const entitlementVerificationProfile = {
  profile_version:
    "R1.1-W2A-1.0",

  supported_method:
    SUPPORTED_METHOD,

  external_source_authentication:
    false,

  legal_entitlement_interpretation:
    false,

  authority_resolution:
    false,

  trusted_external_time:
    false
};
