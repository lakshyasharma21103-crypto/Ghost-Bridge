const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const security = require('../services/releaseSecurity.service');

const repositoryRoot = path.resolve(__dirname, '../../..');
const generatedFacetPath =
  'protocol/registries/e1.r0-draft.1/release-data/facet-property.registry.json';
const maintainedSourcePath = 'protocol/schema-validation/release-data/e1.r0-draft.1.source.json';
const facetSchemaId = 'urn:uuid:876284f1-c7c1-468f-bab6-c679e564c3fe';
const facetArtifactId = 'urn:uuid:aef799c0-6fd3-4e3d-a0bd-c804e137661f';

function invariantProperty(token = 'release-identity-and-status') {
  return {
    token,
    revision: 1,
    classification: 'invariant',
    facets: ['HC', 'AC', 'TC'],
    meaning: 'Synthetic public release-property meaning',
    roles: 'Synthetic participant role',
    failure: ['FI'],
  };
}

function narrowableProperty(token = 'capability-receipt-disposition') {
  return {
    token,
    revision: 1,
    classification: 'capability-narrowable',
    facets: ['HG', 'AG'],
    meaning: 'Synthetic public capability-property meaning',
    applicableSources: ['Synthetic source'],
    capabilityLocalReason: 'Synthetic capability-local reason',
    noWidenNoWaiver: 'Synthetic no-widen and no-waiver rule',
    conflictFailure: 'Synthetic fail-closed conflict rule',
    values: ['required', 'permitted', 'prohibited'],
    optionalIsAlias: false,
    stricterRequirementSources: ['Synthetic stronger source'],
  };
}

function facetArtifact() {
  return {
    artifactSchema: facetSchemaId,
    protocolRelease: 'ghostbridge/e1.r0-draft.1',
    registryClass: 'gb.registry.facet-property',
    facetPropertyArtifact: facetArtifactId,
    facets: [],
    failureCodes: [],
    invariantProperties: [invariantProperty()],
    capabilityNarrowableProperties: [narrowableProperty()],
    classificationRules: {},
    releaseSelectionRoles: {},
    approvalRoleAssignments: {},
    taskRoleAssignments: {},
    receiptRoleAssignments: {},
  };
}

function generatedContent(artifact = facetArtifact()) {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function maintainedSourceContent(artifact = facetArtifact()) {
  return `${JSON.stringify(
    {
      sourceSchema: 'urn:uuid:377b6b6b-2c73-4309-9df8-343057a56e41',
      protocolRelease: 'ghostbridge/e1.r0-draft.1',
      status: 'maintained-semantic-source',
      serialization: {
        encoding: 'UTF-8',
        bom: false,
        newline: 'LF',
        indentSpaces: 2,
        terminalNewline: true,
      },
      artifacts: [
        {
          path: generatedFacetPath,
          schemaId: facetSchemaId,
          identityField: 'facetPropertyArtifact',
          artifact,
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function detectorFindings(content, filePath, detector) {
  return security.scanText(content, filePath).filter((finding) => finding.detector === detector);
}

function assertPrivacySafe(findings, syntheticValues) {
  for (const finding of findings) {
    assert.deepEqual(Object.keys(finding).sort(), [
      'detector',
      'filePath',
      'lineNumber',
      'redacted',
    ]);
  }
  const serialized = JSON.stringify(findings);
  for (const value of syntheticValues) assert.equal(serialized.includes(value), false);
}

test('exact facet-property public token positions suppress only generic token assignments', () => {
  const content = generatedContent();
  assert.equal(detectorFindings(content, generatedFacetPath, 'RUNTIME_TOKEN_ASSIGNMENT').length, 0);
  assert.equal(
    detectorFindings(content, 'application/config.json', 'RUNTIME_TOKEN_ASSIGNMENT').length,
    2,
  );
});

test('maintained release-data source recognizes the exact nested facet-property positions', () => {
  const content = maintainedSourceContent();
  assert.equal(
    detectorFindings(content, maintainedSourcePath, 'RUNTIME_TOKEN_ASSIGNMENT').length,
    0,
  );
  assert.equal(
    detectorFindings(content, 'application/source-copy.json', 'RUNTIME_TOKEN_ASSIGNMENT').length,
    2,
  );
});

test('ordinary and unrelated protocol token assignments retain generic detection', () => {
  const value = 'synthetic-credential-value-1234567890';
  const applicationJson = `${JSON.stringify({ token: value }, null, 2)}\n`;
  const applicationJs = `const token = '${value}';\n`;
  const unrelatedProtocolPath = 'protocol/registries/e1.r0-draft.1/unrelated.json';
  assert.equal(
    detectorFindings(applicationJson, 'application/config.json', 'RUNTIME_TOKEN_ASSIGNMENT').length,
    1,
  );
  assert.equal(
    detectorFindings(applicationJs, 'application/config.js', 'RUNTIME_TOKEN_ASSIGNMENT').length,
    1,
  );
  assert.equal(
    detectorFindings(applicationJson, unrelatedProtocolPath, 'RUNTIME_TOKEN_ASSIGNMENT').length,
    1,
  );
  assertPrivacySafe(security.scanText(applicationJson, 'application/config.json'), [value]);
});

test('recognized paths do not exempt token properties outside the exact semantic arrays', () => {
  const value = 'synthetic-unrecognized-token-value-1234567890';
  const artifact = facetArtifact();
  artifact.token = value;
  const content = generatedContent(artifact);
  const insertedLineNumber = content.split(/\r?\n/).findIndex((line) => line.includes(value)) + 1;
  const findings = detectorFindings(content, generatedFacetPath, 'RUNTIME_TOKEN_ASSIGNMENT');
  assert.ok(findings.some((finding) => finding.lineNumber === insertedLineNumber));
  assertPrivacySafe(findings, [value]);
});

test('recognized positions require a bounded release-registry-token value shape', () => {
  const invalidValues = ['SyntheticOpaqueTokenValue1234567890', 'a'.repeat(129)];
  for (const value of invalidValues) {
    const artifact = facetArtifact();
    artifact.invariantProperties[0].token = value;
    const content = generatedContent(artifact);
    const tokenLineNumber = content.split(/\r?\n/).findIndex((line) => line.includes(value)) + 1;
    const findings = detectorFindings(content, generatedFacetPath, 'RUNTIME_TOKEN_ASSIGNMENT');
    assert.ok(findings.some((finding) => finding.lineNumber === tokenLineNumber));
    assertPrivacySafe(findings, [value]);
  }
});

test('malformed JSON at a recognized path fails closed to ordinary assignment scanning', () => {
  const value = 'synthetic-malformed-token-value-1234567890';
  const malformed = `{\n  "token": "${value}",\n`;
  const findings = detectorFindings(malformed, generatedFacetPath, 'RUNTIME_TOKEN_ASSIGNMENT');
  assert.equal(findings.length, 1);
  assertPrivacySafe(findings, [value]);
});

test('strong content detectors take precedence in recognized protocol context', () => {
  const github = `ghp_${'a'.repeat(36)}`;
  const aws = `AKIA${'A'.repeat(16)}`;
  const mongodb = `mongodb://fixture:${'synthetic-' + 'password'}@example.invalid/db`;
  const bearer = `Authorization: Bearer ${'a'.repeat(32)}`;
  const cases = [
    {
      detector: 'GITHUB_TOKEN',
      secret: github,
      mutate(artifact) {
        artifact.invariantProperties[0].token = github;
      },
      genericFindingCount: 0,
    },
    {
      detector: 'AWS_ACCESS_KEY',
      secret: aws,
      mutate(artifact) {
        artifact.invariantProperties[0].meaning = aws;
      },
    },
    {
      detector: 'MONGODB_EMBEDDED_CREDENTIAL',
      secret: mongodb,
      mutate(artifact) {
        artifact.invariantProperties[0].meaning = mongodb;
      },
    },
    {
      detector: 'AUTHORIZATION_BEARER_TOKEN',
      secret: bearer,
      mutate(artifact) {
        artifact.invariantProperties[0].roles = bearer;
      },
    },
  ];

  for (const entry of cases) {
    const artifact = facetArtifact();
    entry.mutate(artifact);
    const findings = security.scanText(generatedContent(artifact), generatedFacetPath);
    assert.ok(
      findings.some((finding) => finding.detector === entry.detector),
      entry.detector,
    );
    if (entry.genericFindingCount !== undefined) {
      assert.equal(
        findings.filter((finding) => finding.detector === 'RUNTIME_TOKEN_ASSIGNMENT').length,
        entry.genericFindingCount,
      );
    }
    assertPrivacySafe(findings, [entry.secret]);
  }
});

test('environment-example and gitignore hygiene remain unchanged', () => {
  assert.deepEqual(
    security.validateEnvironmentExample('API_TOKEN=<replace-me>\n', 'backend/.env.example'),
    [],
  );
  const value = 'synthetic-environment-token-value';
  const issues = security.validateEnvironmentExample(
    `API_TOKEN=${value}\n`,
    'backend/.env.example',
  );
  assert.equal(issues.length, 1);
  assert.equal(JSON.stringify(issues).includes(value), false);
  assert.equal(security.validateEnvironmentExamples(repositoryRoot).passed, true);
  assert.equal(security.validateGitignore(repositoryRoot).passed, true);
});

test('oversize tracked candidates fail closed without content reads or false scan accounting', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-scanner-oversize-'));
  const relativePath = 'config/oversize.json';
  const absolutePath = path.join(root, ...relativePath.split('/'));
  const synthetic = `ghp_${'a'.repeat(36)}`;
  let openCount = 0;
  let readCount = 0;
  try {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `{"token":"${synthetic}"}\n`);
    fs.truncateSync(absolutePath, 2 * 1024 * 1024 + 1);
    const fileSystem = {
      lstatSync: fs.lstatSync,
      openSync(...args) {
        openCount += 1;
        return fs.openSync(...args);
      },
      fstatSync: fs.fstatSync,
      readSync(...args) {
        readCount += 1;
        return fs.readSync(...args);
      },
      closeSync: fs.closeSync,
    };
    const result = security.scanTrackedFiles(root, { files: [relativePath], fileSystem });
    assert.equal(result.passed, false);
    assert.equal(result.candidateFileCount, 1);
    assert.equal(result.scannedFileCount, 0);
    assert.equal(result.blockedFileCount, 1);
    assert.deepEqual(result.findings, [
      {
        detector: 'TRACKED_FILE_SIZE_LIMIT_EXCEEDED',
        filePath: relativePath,
        lineNumber: null,
        redacted: '<redacted:TRACKED_FILE_SIZE_LIMIT_EXCEEDED>',
      },
    ]);
    assert.equal(openCount, 0);
    assert.equal(readCount, 0);
    assertPrivacySafe(result.findings, [synthetic]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('tracked symlinks fail closed without opening or reading their targets', () => {
  const relativePath = 'config/tracked-link.json';
  const externalTarget = 'outside-repository-sensitive-location';
  const externalSecret = `ghp_${'b'.repeat(36)}`;
  let openCount = 0;
  let readCount = 0;
  const fileSystem = {
    lstatSync() {
      return {
        dev: 1,
        ino: 2,
        size: externalSecret.length,
        isFile: () => false,
        isSymbolicLink: () => true,
      };
    },
    openSync() {
      openCount += 1;
      throw new Error('Symlink target must not be opened');
    },
    fstatSync() {
      throw new Error('Symlink target must not be inspected');
    },
    readSync() {
      readCount += 1;
      throw new Error('Symlink target must not be read');
    },
    closeSync() {},
  };
  const result = security.scanTrackedFiles(repositoryRoot, {
    files: [relativePath],
    fileSystem,
  });
  assert.equal(result.passed, false);
  assert.equal(result.candidateFileCount, 1);
  assert.equal(result.scannedFileCount, 0);
  assert.equal(result.blockedFileCount, 1);
  assert.deepEqual(result.findings, [
    {
      detector: 'TRACKED_SYMBOLIC_LINK_BLOCKED',
      filePath: relativePath,
      lineNumber: null,
      redacted: '<redacted:TRACKED_SYMBOLIC_LINK_BLOCKED>',
    },
  ]);
  assert.equal(openCount, 0);
  assert.equal(readCount, 0);
  assert.equal(JSON.stringify(result).includes(externalTarget), false);
  assertPrivacySafe(result.findings, [externalSecret]);
});

test('filesystem inspection errors and entry replacement remain fail closed', () => {
  const relativePath = 'config/unstable.json';
  const inaccessible = security.scanTrackedFiles(repositoryRoot, {
    files: [relativePath],
    fileSystem: {
      lstatSync() {
        throw new Error('Synthetic inaccessible entry');
      },
    },
  });
  assert.equal(inaccessible.passed, false);
  assert.equal(inaccessible.scannedFileCount, 0);
  assert.equal(inaccessible.blockedFileCount, 1);
  assert.equal(inaccessible.findings[0].detector, 'TRACKED_FILE_SCAN_ERROR');

  let readCount = 0;
  let closeCount = 0;
  const changed = security.scanTrackedFiles(repositoryRoot, {
    files: [relativePath],
    fileSystem: {
      lstatSync() {
        return {
          dev: 1,
          ino: 10,
          size: 32,
          isFile: () => true,
          isSymbolicLink: () => false,
        };
      },
      openSync() {
        return 7;
      },
      fstatSync() {
        return { dev: 1, ino: 11, size: 32, isFile: () => true };
      },
      readSync() {
        readCount += 1;
        return 0;
      },
      closeSync() {
        closeCount += 1;
      },
    },
  });
  assert.equal(changed.passed, false);
  assert.equal(changed.scannedFileCount, 0);
  assert.equal(changed.blockedFileCount, 1);
  assert.equal(changed.findings[0].detector, 'TRACKED_FILE_CHANGED_DURING_SCAN');
  assert.equal(readCount, 0);
  assert.equal(closeCount, 1);
  assertPrivacySafe([...inaccessible.findings, ...changed.findings], []);
});

test('ordinary tracked regular files remain bounded content-scanning candidates', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-scanner-regular-'));
  const relativePath = 'config/regular.js';
  const absolutePath = path.join(root, ...relativePath.split('/'));
  try {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "const publicLabel = 'synthetic-public-label';\n");
    const clean = security.scanTrackedFiles(root, { files: [relativePath] });
    assert.equal(clean.passed, true);
    assert.equal(clean.candidateFileCount, 1);
    assert.equal(clean.scannedFileCount, 1);
    assert.equal(clean.blockedFileCount, 0);

    const synthetic = `ghp_${'c'.repeat(36)}`;
    fs.writeFileSync(absolutePath, `const publicLabel = '${synthetic}';\n`);
    const detected = security.scanTrackedFiles(root, { files: [relativePath] });
    assert.equal(detected.passed, false);
    assert.equal(detected.scannedFileCount, 1);
    assert.equal(detected.blockedFileCount, 0);
    assert.ok(detected.findings.some((finding) => finding.detector === 'GITHUB_TOKEN'));
    assertPrivacySafe(detected.findings, [synthetic]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('tracked-file enumeration and scanner results are deterministic', () => {
  const firstFiles = security.gitTrackedFiles(repositoryRoot);
  const secondFiles = security.gitTrackedFiles(repositoryRoot);
  assert.deepEqual(firstFiles, secondFiles);
  assert.deepEqual(firstFiles, [...firstFiles].sort());
  const firstScan = security.scanTrackedFiles(repositoryRoot);
  const secondScan = security.scanTrackedFiles(repositoryRoot);
  assert.deepEqual(firstScan, secondScan);
  assert.equal(firstScan.passed, true);
  assert.equal(firstScan.candidateFileCount, firstScan.scannedFileCount);
  assert.equal(firstScan.blockedFileCount, 0);
});
