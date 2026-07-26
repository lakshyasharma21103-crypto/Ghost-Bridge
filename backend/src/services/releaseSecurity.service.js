const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PLACEHOLDER = /^(?:<[^>\r\n]+>|$)/;
const EXCLUDED_SEGMENT =
  /(?:^|\/)(?:node_modules|dist|build|coverage|\.cache|test-results|playwright-report)(?:\/|$)/;
const DOCUMENTED_FIXTURE_PATHS = Object.freeze([
  /(?:^|\/)tests?(?:\/|$)/,
  /(?:^|\/)scripts\/verify[^/]*\.js$/i,
  /(?:^|\/)(?:developerSandboxService|dataAccessPerformanceHarness\.service|dataAccessRegistry\.service)\.js$/i,
  /^gemini-(?:basic-request|basic-response|models-response)\.json$/i,
]);

const DETECTORS = Object.freeze([
  {
    name: 'PRIVATE_KEY_BLOCK',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'MONGODB_EMBEDDED_CREDENTIAL',
    pattern: /mongodb(?:\+srv)?:\/\/[^:\s/"'<>]+:[^@\s/"'<>]+@/i,
  },
  {
    name: 'REDIS_EMBEDDED_CREDENTIAL',
    pattern: /rediss?:\/\/[^@\s/"'<>]*:[^@\s/"'<>]+@/i,
  },
  {
    name: 'AWS_ACCESS_KEY',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    name: 'GITHUB_TOKEN',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,255}\b/,
  },
  {
    name: 'SLACK_TOKEN',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,255}\b/,
  },
  {
    name: 'PROVIDER_API_KEY',
    pattern: /\bAIza[0-9A-Za-z_-]{30,80}\b/,
  },
  {
    name: 'AUTHORIZATION_BEARER_TOKEN',
    pattern: /\bAuthorization\s*[:=]\s*["']?Bearer\s+[A-Za-z0-9._~+/-]{20,}/i,
  },
  {
    name: 'SIGNED_URL_CREDENTIAL',
    pattern:
      /[?&](?:X-Amz-Signature|X-Goog-Signature|Signature|sig|token)=[A-Fa-f0-9%_-]{20,}/i,
  },
]);

function normalizePath(filePath) {
  return String(filePath || '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function sensitiveVariableName(name) {
  const normalized = String(name || '').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  if (/(?:_VERSION|_TIMEOUT|_LIMIT|_COUNT|_MAX|_MIN|OUTPUT_TOKENS)$/.test(normalized)) {
    return false;
  }
  return (
    ['MONGODB_URI', 'REDIS_URL', 'AUTHORIZATION'].includes(normalized) ||
    /(?:^|_)(?:SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|ENCRYPTION_KEY)$/.test(normalized)
  );
}

function safeAssignmentFinding(line, filePath) {
  const environmentFile = /(?:^|\/)\.env(?:\.example)?$/i.test(normalizePath(filePath));
  const match = environmentFile
    ? line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,127})\s*=\s*(.*)$/)
    : line.match(
        /^\s*(?:const|let|var)?\s*["']?([A-Za-z][A-Za-z0-9_]*)["']?\s*[:=]\s*["'`]([^"'`]{16,})["'`]/,
      );
  if (!match || !sensitiveVariableName(match[1])) return null;
  const value = match[2].trim();
  if (
    PLACEHOLDER.test(value) ||
    value.includes('<') ||
    /^(?:undefined|null|false|true|process\.env|source\[|environment\.|input\.|options\.)/i.test(
      value,
    ) ||
    value.length < 16
  ) {
    return null;
  }
  return /ENCRYPTION_KEY/i.test(match[1])
    ? 'ENCRYPTION_KEY_ASSIGNMENT'
    : /JWT/i.test(match[1])
      ? 'JWT_SECRET_ASSIGNMENT'
      : /TOKEN/i.test(match[1])
        ? 'RUNTIME_TOKEN_ASSIGNMENT'
        : 'SECRET_ASSIGNMENT';
}

function scanText(content, filePath = '<memory>') {
  const findings = [];
  const lines = String(content || '').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const detector of DETECTORS) {
      if (!detector.pattern.test(line)) continue;
      if (
        line.includes(`release-secret-scanner: allow ${detector.name}`) ||
        line.includes('release-secret-scanner: fixture')
      ) {
        continue;
      }
      findings.push({
        detector: detector.name,
        filePath: normalizePath(filePath),
        lineNumber: index + 1,
        redacted: `<redacted:${detector.name}>`,
      });
    }
    const assignmentDetector = safeAssignmentFinding(line, filePath);
    if (
      assignmentDetector &&
      !line.includes(`release-secret-scanner: allow ${assignmentDetector}`) &&
      !line.includes('release-secret-scanner: fixture')
    ) {
      findings.push({
        detector: assignmentDetector,
        filePath: normalizePath(filePath),
        lineNumber: index + 1,
        redacted: `<redacted:${assignmentDetector}>`,
      });
    }
  });
  return findings;
}

function gitTrackedFiles(repositoryRoot) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return output
    .split('\0')
    .map(normalizePath)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function isScannableTrackedPath(relativePath) {
  const normalized = normalizePath(relativePath);
  if (EXCLUDED_SEGMENT.test(normalized)) return false;
  if (/(?:^|\/)\.env(?:\..+)?$/i.test(normalized) && !/\.env\.example$/i.test(normalized)) {
    return false;
  }
  return /\.(?:c?js|mjs|json|ya?ml|toml|ini|conf|properties|env|example|md|txt|ps1)$/i.test(
    normalized,
  );
}

function scanTrackedFiles(repositoryRoot, options = {}) {
  const candidates = (options.files || gitTrackedFiles(repositoryRoot))
    .map(normalizePath)
    .filter(isScannableTrackedPath);
  const fixtureFiles = candidates.filter((file) =>
    DOCUMENTED_FIXTURE_PATHS.some((pattern) => pattern.test(file)),
  );
  const files = candidates.filter((file) => !fixtureFiles.includes(file));
  const findings = [];
  for (const relativePath of files) {
    const absolutePath = path.resolve(repositoryRoot, relativePath);
    if (!absolutePath.startsWith(path.resolve(repositoryRoot) + path.sep)) continue;
    const stat = fs.statSync(absolutePath);
    if (stat.size > 2 * 1024 * 1024) continue;
    findings.push(...scanText(fs.readFileSync(absolutePath, 'utf8'), relativePath));
  }
  return Object.freeze({
    passed: findings.length === 0,
    scannedFileCount: files.length,
    documentedFixtureFileCount: fixtureFiles.length,
    findings: Object.freeze(findings),
    historyScanned: false,
  });
}

function validateEnvironmentExample(content, filePath) {
  const issues = [];
  String(content || '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || !sensitiveVariableName(match[1])) return;
      const value = match[2].trim();
      if (value === '' || value.includes('<') || PLACEHOLDER.test(value)) return;
      issues.push({
        code: 'ENVIRONMENT_EXAMPLE_REAL_VALUE',
        variableName: match[1],
        filePath: normalizePath(filePath),
        lineNumber: index + 1,
      });
    });
  return issues;
}

function validateEnvironmentExamples(repositoryRoot) {
  const files = gitTrackedFiles(repositoryRoot).filter((file) => /\.env\.example$/i.test(file));
  const issues = files.flatMap((file) =>
    validateEnvironmentExample(fs.readFileSync(path.resolve(repositoryRoot, file), 'utf8'), file),
  );
  return { passed: issues.length === 0, files, issues };
}

function validateGitignore(repositoryRoot) {
  const requiredPatterns = [
    '.env',
    '.env.*',
    '**/.env',
    '**/.env.*',
    '!.env.example',
    '!**/.env.example',
  ];
  const content = fs.readFileSync(path.resolve(repositoryRoot, '.gitignore'), 'utf8');
  const lines = new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#')),
  );
  const missingPatterns = requiredPatterns.filter((pattern) => !lines.has(pattern));
  const trackedRealEnvironmentFiles = gitTrackedFiles(repositoryRoot).filter(
    (file) => /(?:^|\/)\.env(?:\..+)?$/i.test(file) && !/\.env\.example$/i.test(file),
  );
  return {
    passed: missingPatterns.length === 0 && trackedRealEnvironmentFiles.length === 0,
    missingPatterns,
    trackedRealEnvironmentFiles,
  };
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

module.exports = {
  DETECTORS,
  DOCUMENTED_FIXTURE_PATHS,
  gitTrackedFiles,
  isScannableTrackedPath,
  normalizePath,
  scanText,
  scanTrackedFiles,
  sha256,
  sensitiveVariableName,
  validateEnvironmentExample,
  validateEnvironmentExamples,
  validateGitignore,
};
