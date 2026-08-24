import {
  readFileSync
} from "node:fs";

import {
  createHash
} from "node:crypto";

import {
  fileURLToPath
} from "node:url";


import {
  getSupportedAuthorizationEvaluators,
  resolveAuthorizationEvaluator
} from "../protocol/hbce-evaluator-dispatch.reference.mjs";


const EXPECTED_SHA =
  "cab0273909a9c00b453ed4883bce8a7dce5ea9b935d8d9917e4c9bd5dc9d7516";


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


const supported =
  getSupportedAuthorizationEvaluators();


if (
  !Array.isArray(
    supported
  ) ||
  supported.length !==
    1
) {
  fail(
    "A010_1_SUPPORTED_SET_INVALID"
  );
}


const identity =
  supported[0];


if (
  identity.evaluator_id !==
    "HBCE-A008" ||
  identity.evaluator_version !==
    "A008.3" ||
  identity.evaluator_sha256 !==
    EXPECTED_SHA
) {
  fail(
    `A010_1_SUPPORTED_IDENTITY_INVALID:${JSON.stringify(identity)}`
  );
}


console.log(
  "A010_1_SUPPORTED_A008_3_IDENTITY=PASS"
);


/*
 * Independent filesystem hash of immutable snapshot.
 */

const snapshotUrl =
  new URL(
    "../protocol/hbce-authorization-evaluator.A008.3.mjs",
    import.meta.url
  );


const snapshotBytes =
  readFileSync(
    fileURLToPath(
      snapshotUrl
    )
  );


const snapshotSha =
  createHash(
    "sha256"
  )
    .update(
      snapshotBytes
    )
    .digest(
      "hex"
    );


if (
  snapshotSha !==
    EXPECTED_SHA
) {
  fail(
    `A010_1_SNAPSHOT_DIGEST_INVALID:${snapshotSha}`
  );
}


console.log(
  "A010_1_SNAPSHOT_SHA256_VERIFIED=PASS"
);


/*
 * Exact dispatch.
 */

const resolved =
  resolveAuthorizationEvaluator({
    evaluator_id:
      "HBCE-A008",

    evaluator_version:
      "A008.3",

    evaluator_sha256:
      EXPECTED_SHA
  });


if (
  resolved.evaluator_id !==
    "HBCE-A008" ||
  resolved.evaluator_version !==
    "A008.3" ||
  resolved.evaluator_sha256 !==
    EXPECTED_SHA ||
  resolved.module_sha256 !==
    EXPECTED_SHA ||
  resolved.module_sha256_verified !==
    true ||
  typeof resolved.evaluateAuthorization !==
    "function"
) {
  fail(
    "A010_1_RESOLUTION_INVALID"
  );
}


console.log(
  "A010_1_EXACT_A008_3_DISPATCH=PASS"
);


/*
 * Historical versions without an immutable snapshot
 * must fail closed. A008.2 is deliberately not silently
 * replayed through A008.3.
 */

expectError(
  "A010_1_A008_2_VERSION_FAIL_CLOSED",

  () =>
    resolveAuthorizationEvaluator({
      evaluator_id:
        "HBCE-A008",

      evaluator_version:
        "A008.2",

      evaluator_sha256:
        "c897eeca32aa680b4d23fd64518f65dad40c40a0d154c213ee29e54712a3cbee"
    }),

  "EVALUATOR_DISPATCH_VERSION_UNSUPPORTED"
);


expectError(
  "A010_1_WRONG_DIGEST_FAIL_CLOSED",

  () =>
    resolveAuthorizationEvaluator({
      evaluator_id:
        "HBCE-A008",

      evaluator_version:
        "A008.3",

      evaluator_sha256:
        "0".repeat(64)
    }),

  "EVALUATOR_DISPATCH_SHA256_UNSUPPORTED"
);


expectError(
  "A010_1_UNKNOWN_EVALUATOR_FAIL_CLOSED",

  () =>
    resolveAuthorizationEvaluator({
      evaluator_id:
        "HBCE-A999",

      evaluator_version:
        "A008.3",

      evaluator_sha256:
        EXPECTED_SHA
    }),

  "EVALUATOR_DISPATCH_ID_UNSUPPORTED"
);


console.log(
  "A010_1_UNSUPPORTED_VERSION_NO_FALLBACK=PASS"
);

console.log(
  "A010_1_EVALUATOR_VERSION_BINDING_SUITE=PASS"
);
