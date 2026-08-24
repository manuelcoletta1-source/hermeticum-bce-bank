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
  evaluateAuthorization as
    evaluateAuthorizationA008_3
} from "./replay/A008.3/hbce-authorization-evaluator.A008.3.mjs";


const SHA256_PATTERN =
  /^[a-f0-9]{64}$/;


const A008_3_DESCRIPTOR =
  Object.freeze({
    evaluator_id:
      "HBCE-A008",

    evaluator_version:
      "A008.3",

    evaluator_sha256:
      "cab0273909a9c00b453ed4883bce8a7dce5ea9b935d8d9917e4c9bd5dc9d7516",

    module_url:
      new URL(
        "./replay/A008.3/hbce-authorization-evaluator.A008.3.mjs",
        import.meta.url
      ),

    dependencies:
      Object.freeze([
        Object.freeze({
          dependency_id:
            "HBCE-MANDATE-REGISTRY",

          module_url:
            new URL(
              "./replay/A008.3/hbce-mandate-registry.reference.mjs",
              import.meta.url
            ),

          module_sha256:
            "1bf91757b176ad960a3109ea3fbe14ae2e690247b9209658cb164d04c79990be"
        }),

        Object.freeze({
          dependency_id:
            "HBCE-RUNTIME-REGISTRY",

          module_url:
            new URL(
              "./replay/A008.3/hbce-runtime-registry.reference.mjs",
              import.meta.url
            ),

          module_sha256:
            "ea1e3c28f83913db2cdbd09f29bbb130a923ff7e737a21755ecf101ffc631e2c"
        }),

        Object.freeze({
          dependency_id:
            "HBCE-REVOCATION-REGISTRY",

          module_url:
            new URL(
              "./replay/A008.3/hbce-revocation.reference.mjs",
              import.meta.url
            ),

          module_sha256:
            "60256a0206e451283ffe16c03d7ffc6ac59535c58bf4f368bb6cc52bd7856942"
        })
      ]),

    evaluateAuthorization:
      evaluateAuthorizationA008_3
  });


const SUPPORTED =
  Object.freeze([
    A008_3_DESCRIPTOR
  ]);


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


function sha256File(
  fileUrl
) {
  const path =
    fileURLToPath(
      fileUrl
    );

  const bytes =
    readFileSync(
      path
    );

  return createHash(
    "sha256"
  )
    .update(
      bytes
    )
    .digest(
      "hex"
    );
}


export function getSupportedAuthorizationEvaluators() {
  return SUPPORTED.map(
    (descriptor) => ({
      evaluator_id:
        descriptor.evaluator_id,

      evaluator_version:
        descriptor.evaluator_version,

      evaluator_sha256:
        descriptor.evaluator_sha256
    })
  );
}


export function resolveAuthorizationEvaluator(
  identity
) {
  assertObject(
    identity,
    "EVALUATOR_DISPATCH_IDENTITY_INVALID"
  );

  assertString(
    identity.evaluator_id,
    "EVALUATOR_DISPATCH_ID_INVALID"
  );

  assertString(
    identity.evaluator_version,
    "EVALUATOR_DISPATCH_VERSION_INVALID"
  );

  assertSha256(
    identity.evaluator_sha256,
    "EVALUATOR_DISPATCH_SHA256_INVALID"
  );


  const matchingId =
    SUPPORTED.filter(
      (descriptor) =>
        descriptor.evaluator_id ===
        identity.evaluator_id
    );


  if (
    matchingId.length ===
    0
  ) {
    fail(
      "EVALUATOR_DISPATCH_ID_UNSUPPORTED"
    );
  }


  const matchingVersion =
    matchingId.filter(
      (descriptor) =>
        descriptor.evaluator_version ===
        identity.evaluator_version
    );


  if (
    matchingVersion.length ===
    0
  ) {
    fail(
      "EVALUATOR_DISPATCH_VERSION_UNSUPPORTED"
    );
  }


  const descriptor =
    matchingVersion.find(
      (candidate) =>
        candidate.evaluator_sha256 ===
        identity.evaluator_sha256
    );


  if (!descriptor) {
    fail(
      "EVALUATOR_DISPATCH_SHA256_UNSUPPORTED"
    );
  }


  /*
   * The dispatch table is not enough.
   *
   * The actual bytes of the immutable evaluator snapshot
   * must still equal the digest bound into the EVT.
   */

  const actualModuleSha256 =
    sha256File(
      descriptor.module_url
    );


  if (
    actualModuleSha256 !==
    descriptor.evaluator_sha256
  ) {
    fail(
      "EVALUATOR_DISPATCH_SNAPSHOT_SHA256_MISMATCH"
    );
  }


  const verifiedDependencies =
    descriptor.dependencies.map(
      (dependency) => {
        const actualSha256 =
          sha256File(
            dependency.module_url
          );


        if (
          actualSha256 !==
          dependency.module_sha256
        ) {
          fail(
            "EVALUATOR_DISPATCH_DEPENDENCY_SHA256_MISMATCH"
          );
        }


        return {
          dependency_id:
            dependency.dependency_id,

          module_sha256:
            dependency.module_sha256,

          actual_module_sha256:
            actualSha256,

          module_sha256_verified:
            true
        };
      }
    );


  return {
    evaluator_id:
      descriptor.evaluator_id,

    evaluator_version:
      descriptor.evaluator_version,

    evaluator_sha256:
      descriptor.evaluator_sha256,

    module_sha256:
      actualModuleSha256,

    module_sha256_verified:
      true,

    dependency_closure_sha256_verified:
      true,

    dependencies:
      verifiedDependencies,

    evaluateAuthorization:
      descriptor.evaluateAuthorization
  };
}
