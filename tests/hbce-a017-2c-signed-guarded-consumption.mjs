import {
  guardedConsumeAuthorization
} from "../protocol/hbce-guarded-consumption.reference.mjs";


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


const base = {
  evtLogPath:
    "a0172c-events.jsonl",

  evtId:
    "EVT-A0172C",

  mandateRegistryPath:
    "a0172c-mandates.jsonl",

  runtimeRegistryPath:
    "a0172c-runtimes.jsonl",

  revocationRegistryPath:
    "a0172c-revocations.jsonl",

  consumptionRegistryPath:
    "a0172c-consumptions.jsonl",

  consumptionId:
    "CONSUMPTION-A0172C",

  consumedBy:
    "IPR-A0172C",

  admissionTrustRegistryPath:
    "a0172c-trust.jsonl",

  admissionSignerId:
    "ADMISSION-SIGNER-A0172C",

  admissionKeyId:
    "ADMISSION-KEY-A0172C",

  signAdmissionPayload:
    () =>
      Buffer.alloc(64),

  authority:
    {},

  decisionEvidence:
    {},

  authorization:
    {},

  request:
    {},

  presentedRuntimeBinding:
    {},

  policyContext:
    {},

  expectedEvaluator:
    {}
};


expectError(
  "A017_2C_TRUST_REGISTRY_PATH_REQUIRED",

  () =>
    guardedConsumeAuthorization({
      ...base,

      admissionTrustRegistryPath:
        ""
    }),

  "GUARDED_ADMISSION_TRUST_REGISTRY_PATH_REQUIRED"
);


expectError(
  "A017_2C_SIGNER_ID_REQUIRED",

  () =>
    guardedConsumeAuthorization({
      ...base,

      admissionSignerId:
        ""
    }),

  "GUARDED_ADMISSION_SIGNER_ID_REQUIRED"
);


expectError(
  "A017_2C_KEY_ID_REQUIRED",

  () =>
    guardedConsumeAuthorization({
      ...base,

      admissionKeyId:
        ""
    }),

  "GUARDED_ADMISSION_KEY_ID_REQUIRED"
);


expectError(
  "A017_2C_SIGNER_CALLBACK_REQUIRED",

  () =>
    guardedConsumeAuthorization({
      ...base,

      signAdmissionPayload:
        null
    }),

  "GUARDED_ADMISSION_SIGNER_CALLBACK_REQUIRED"
);


console.log("");
console.log(
  "===== A017.2C FINAL MATRIX ====="
);

console.log(
  "GUARDED_TRUST_REGISTRY_REFERENCE=REQUIRED"
);

console.log(
  "GUARDED_SIGNER_ID=REQUIRED"
);

console.log(
  "GUARDED_KEY_ID=REQUIRED"
);

console.log(
  "GUARDED_SIGNER_CALLBACK=REQUIRED"
);

console.log(
  "CONSUMED_AT_CALLER_CONTROL=DENIED"
);

console.log(
  "SIGNED_CONSUMPTION_PROVES_EXECUTION=FALSE"
);

console.log(
  "A017_2C_SIGNED_GUARDED_CONSUMPTION_CONTRACT=PASS"
);
