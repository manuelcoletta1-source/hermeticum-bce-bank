import {
  readFileSync,
  writeFileSync
} from "node:fs";

import {
  createHash
} from "node:crypto";

import {
  fileURLToPath
} from "node:url";


import {
  resolveAuthorizationEvaluator
} from "../protocol/hbce-evaluator-dispatch.reference.mjs";


const EXPECTED = {
  evaluator:
    "cab0273909a9c00b453ed4883bce8a7dce5ea9b935d8d9917e4c9bd5dc9d7516",

  mandate:
    "1bf91757b176ad960a3109ea3fbe14ae2e690247b9209658cb164d04c79990be",

  runtime:
    "ea1e3c28f83913db2cdbd09f29bbb130a923ff7e737a21755ecf101ffc631e2c",

  revocation:
    "60256a0206e451283ffe16c03d7ffc6ac59535c58bf4f368bb6cc52bd7856942"
};


const bundle = {
  evaluator:
    new URL(
      "../protocol/replay/A008.3/hbce-authorization-evaluator.A008.3.mjs",
      import.meta.url
    ),

  mandate:
    new URL(
      "../protocol/replay/A008.3/hbce-mandate-registry.reference.mjs",
      import.meta.url
    ),

  runtime:
    new URL(
      "../protocol/replay/A008.3/hbce-runtime-registry.reference.mjs",
      import.meta.url
    ),

  revocation:
    new URL(
      "../protocol/replay/A008.3/hbce-revocation.reference.mjs",
      import.meta.url
    )
};


function fail(message) {
  throw new Error(message);
}


function sha256(
  url
) {
  return createHash(
    "sha256"
  )
    .update(
      readFileSync(
        fileURLToPath(
          url
        )
      )
    )
    .digest(
      "hex"
    );
}


for (
  const key of
  Object.keys(
    bundle
  )
) {
  const actual =
    sha256(
      bundle[key]
    );


  if (
    actual !==
    EXPECTED[key]
  ) {
    fail(
      `A010_2_BUNDLE_SHA_MISMATCH:${key}:${actual}`
    );
  }
}


console.log(
  "A010_2_BUNDLE_SHA256_SET=PASS"
);


/*
 * The evaluator bundle must resolve exactly three local
 * HBCE imports, all inside this same replay directory.
 */

const evaluatorSource =
  readFileSync(
    fileURLToPath(
      bundle.evaluator
    ),
    "utf8"
  );


const localImports = [
  ...evaluatorSource.matchAll(
    /from\s+"(\.[^"]+)"/g
  )
].map(
  (match) =>
    match[1]
).sort();


const expectedImports = [
  "./hbce-mandate-registry.reference.mjs",
  "./hbce-revocation.reference.mjs",
  "./hbce-runtime-registry.reference.mjs"
].sort();


if (
  JSON.stringify(
    localImports
  ) !==
  JSON.stringify(
    expectedImports
  )
) {
  fail(
    `A010_2_BUNDLE_IMPORT_CLOSURE_INVALID:${JSON.stringify(localImports)}`
  );
}


console.log(
  "A010_2_BUNDLE_IMPORT_CLOSURE=PASS"
);


/*
 * The three HBCE dependency snapshots are leaves with
 * respect to local project imports.
 */

for (
  const key of [
    "mandate",
    "runtime",
    "revocation"
  ]
) {
  const source =
    readFileSync(
      fileURLToPath(
        bundle[key]
      ),
      "utf8"
    );


  const imports = [
    ...source.matchAll(
      /from\s+"(\.[^"]+)"/g
    )
  ];


  if (
    imports.length !==
    0
  ) {
    fail(
      `A010_2_NON_LEAF_HBCE_DEPENDENCY:${key}`
    );
  }
}


console.log(
  "A010_2_TRANSITIVE_HBCE_CLOSURE_COMPLETE=PASS"
);


/*
 * Dispatcher must verify evaluator plus dependency
 * snapshots before giving back an executable function.
 */

const identity = {
  evaluator_id:
    "HBCE-A008",

  evaluator_version:
    "A008.3",

  evaluator_sha256:
    EXPECTED.evaluator
};


const resolved =
  resolveAuthorizationEvaluator(
    identity
  );


if (
  resolved.module_sha256_verified !==
    true ||
  resolved.dependency_closure_sha256_verified !==
    true ||
  !Array.isArray(
    resolved.dependencies
  ) ||
  resolved.dependencies.length !==
    3 ||
  typeof resolved.evaluateAuthorization !==
    "function"
) {
  fail(
    "A010_2_RESOLVED_CLOSURE_INVALID"
  );
}


const expectedDependencies =
  new Map([
    [
      "HBCE-MANDATE-REGISTRY",
      EXPECTED.mandate
    ],
    [
      "HBCE-RUNTIME-REGISTRY",
      EXPECTED.runtime
    ],
    [
      "HBCE-REVOCATION-REGISTRY",
      EXPECTED.revocation
    ]
  ]);


for (
  const dependency of
  resolved.dependencies
) {
  if (
    dependency.module_sha256_verified !==
      true ||
    dependency.module_sha256 !==
      expectedDependencies.get(
        dependency.dependency_id
      ) ||
    dependency.actual_module_sha256 !==
      dependency.module_sha256
  ) {
    fail(
      `A010_2_RESOLVED_DEPENDENCY_INVALID:${JSON.stringify(dependency)}`
    );
  }
}


console.log(
  "A010_2_DISPATCH_DEPENDENCY_VERIFICATION=PASS"
);


/*
 * Negative tamper test.
 *
 * Alter one isolated dependency snapshot, confirm dispatch
 * fails closed, then restore the exact original bytes.
 */

const runtimePath =
  fileURLToPath(
    bundle.runtime
  );


const originalRuntimeBytes =
  readFileSync(
    runtimePath
  );


try {
  writeFileSync(
    runtimePath,
    Buffer.concat([
      originalRuntimeBytes,
      Buffer.from(
        "\n// A010.2 TEMP TAMPER\n",
        "utf8"
      )
    ])
  );


  let actual =
    null;


  try {
    resolveAuthorizationEvaluator(
      identity
    );
  } catch (error) {
    actual =
      error.message;
  }


  if (
    actual !==
    "EVALUATOR_DISPATCH_DEPENDENCY_SHA256_MISMATCH"
  ) {
    fail(
      `A010_2_DEPENDENCY_TAMPER_NOT_DENIED:${actual}`
    );
  }


  console.log(
    "A010_2_DEPENDENCY_TAMPER_FAIL_CLOSED=PASS"
  );

} finally {
  writeFileSync(
    runtimePath,
    originalRuntimeBytes
  );
}


if (
  sha256(
    bundle.runtime
  ) !==
    EXPECTED.runtime
) {
  fail(
    "A010_2_RUNTIME_SNAPSHOT_RESTORE_FAILED"
  );
}


console.log(
  "A010_2_TAMPER_TEST_RESTORED_EXACT_BYTES=PASS"
);


const resolvedAfterRestore =
  resolveAuthorizationEvaluator(
    identity
  );


if (
  resolvedAfterRestore
    .dependency_closure_sha256_verified !==
    true
) {
  fail(
    "A010_2_RESTORE_REVALIDATION_FAILED"
  );
}


console.log(
  "A010_2_RESTORE_REVALIDATION=PASS"
);

console.log(
  "A010_2_TRANSITIVE_REPLAY_BINDING_SUITE=PASS"
);
