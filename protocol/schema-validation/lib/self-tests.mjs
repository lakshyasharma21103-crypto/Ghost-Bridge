import {
  EXPECTED_DIALECT,
  assertAllDeclaredPathsProcessed,
  assertLoadedSchemaIdentity,
  assertMachineAssetCoverage,
  assertManifestDiskCoverage,
  assertRegularRepositoryEntry,
  validateManifestDeclarations,
} from './bundle-loader.mjs';
import { errorMessage, fail } from './errors.mjs';
import { assertFixtureClassification, runFixtureCase } from './fixture-runner.mjs';
import {
  canonicalCombiningClass,
  frozenUnicodeEvidence,
  idna2008Category,
  isCombiningMark,
} from './frozen-unicode17.mjs';
import { idnaRuntimeEvidence } from './idna2008.mjs';
import {
  assertNoDuplicateObjectKeys,
  decodeStrictUtf8,
  validateProtocolJsonBytes,
} from './json-source.mjs';
import { decodeLosslessRawCarrier, RAW_CARRIER_LIMITS } from './r1-fixture-runner.mjs';
import {
  assertCanonicalPosixRelativePath,
  assertRepositoryPathComponentChain,
} from './path-policy.mjs';
import {
  assertClosedCoreObjectSchemas,
  assertDeclaredDependencies,
  collectExternalDependencyIds,
  collectExternalReferences,
  createOfflineSchemaValidator,
  scanSchemaSafety,
} from './schema-safety.mjs';
import {
  artifactByteIntegrityMatches,
  canonicalDnsName,
  canonicalIpv4,
  canonicalIpv6,
  createSemanticCheckRegistry,
  evaluateSemanticCheck,
  semanticCommitmentRef,
  semanticCommitmentRefForOwner,
  semanticOrigin,
  semanticTimeEvidence,
  sha256Base64url,
} from './semantic-checks.mjs';

function expectFailure(label, operation, expectedMessage) {
  try {
    operation();
  } catch (error) {
    const message = errorMessage(error);
    if (expectedMessage && !message.includes(expectedMessage)) {
      fail(`Tooling self-test ${label} failed with the wrong diagnostic: ${message}`, {
        cause: error,
      });
    }
    return;
  }
  fail(`Tooling self-test ${label} did not fail closed`);
}

function expectTrue(label, condition) {
  if (!condition) fail(`Tooling self-test ${label} did not pass`);
}

function runGroup(tests) {
  for (const [label, operation] of tests) operation(label);
  return tests.length;
}

export function runRawJsonParserSelfTests() {
  const protocol = (text, maximumBytes = Buffer.byteLength(text)) =>
    validateProtocolJsonBytes(Buffer.from(text, 'utf8'), {
      maximumBytes,
      source: 'raw JSON self-test',
    });
  const objectWithMembers = (count) =>
    `{${Array.from({ length: count }, (_, index) => `"m${String(index).padStart(3, '0')}":null`).join(',')}}`;
  return runGroup([
    [
      'duplicate ordinary property',
      (label) =>
        expectFailure(
          label,
          () => assertNoDuplicateObjectKeys('{"a":1,"a":2}', label),
          'Duplicate raw JSON member',
        ),
    ],
    [
      'duplicate escaped property',
      (label) =>
        expectFailure(
          label,
          () => assertNoDuplicateObjectKeys('{"a":1,"\\u0061":2}', label),
          'Duplicate raw JSON member',
        ),
    ],
    [
      'nested duplicate',
      (label) =>
        expectFailure(
          label,
          () => assertNoDuplicateObjectKeys('{"outer":{"x":1,"x":2}}', label),
          'Duplicate raw JSON member',
        ),
    ],
    [
      'array object duplicate',
      (label) =>
        expectFailure(
          label,
          () => assertNoDuplicateObjectKeys('[{"x":1,"x":2}]', label),
          'Duplicate raw JSON member',
        ),
    ],
    [
      'JSON punctuation inside string',
      (label) => assertNoDuplicateObjectKeys('{"value":"{a:b,c}"}', label),
    ],
    [
      'escaped quote and backslash',
      (label) => assertNoDuplicateObjectKeys('{"value":"quote: \\" slash: \\\\"}', label),
    ],
    [
      'malformed JSON',
      (label) =>
        expectFailure(
          label,
          () => assertNoDuplicateObjectKeys('{"a":[1,]}', label),
          'Trailing comma',
        ),
    ],
    [
      'strict UTF-8',
      (label) =>
        expectFailure(
          label,
          () => decodeStrictUtf8(Uint8Array.from([0xc3, 0x28]), label),
          'Strict UTF-8',
        ),
    ],
    [
      'protocol caller byte ceiling',
      (label) => expectFailure(label, () => protocol('null', 3), '[BYTE_LIMIT]'),
    ],
    [
      'protocol negative zero',
      (label) => expectFailure(label, () => protocol('-0.00e+9'), '[NUMBER_NEGATIVE_ZERO]'),
    ],
    [
      'protocol unsafe integer',
      (label) =>
        expectFailure(label, () => protocol('9007199254740992'), '[NUMBER_UNSAFE_INTEGER]'),
    ],
    [
      'protocol safe exponent integer',
      (label) => expectTrue(label, protocol('1e0').tokenCount === 1),
    ],
    [
      'protocol object members 256',
      (label) => expectTrue(label, protocol(objectWithMembers(256)).value !== undefined),
    ],
    [
      'protocol object members 257',
      (label) => expectFailure(label, () => protocol(objectWithMembers(257)), '[OBJECT_LIMIT]'),
    ],
  ]);
}

export function runRawFixtureCarrierSelfTests() {
  const nested = (depth, leaf = { hex: '' }) => {
    let segment = leaf;
    for (let index = 1; index < depth; index += 1) segment = { segments: [segment] };
    return segment;
  };
  const multiplicationOverflow = {
    segments: [
      {
        segments: [{ hex: '00', repeat: 2_000_000 }],
        repeat: 2_000_000,
      },
    ],
    repeat: 2_000_000,
  };
  return runGroup([
    [
      'huge repeat with empty payload',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier({ hex: '', repeat: 2_000_000 }),
          '[RAW_CARRIER_WORK]',
        ),
    ],
    [
      'nested zero-output amplification',
      (label) =>
        expectFailure(
          label,
          () =>
            decodeLosslessRawCarrier({
              segments: [{ hex: '', repeat: 2_000_000 }],
              repeat: 2_000_000,
            }),
          '[RAW_CARRIER_WORK]',
        ),
    ],
    [
      'carrier nesting boundary',
      (label) =>
        expectTrue(
          label,
          decodeLosslessRawCarrier(nested(RAW_CARRIER_LIMITS.maximumDepth)).byteLength === 0,
        ),
    ],
    [
      'carrier excessive nesting',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier(nested(RAW_CARRIER_LIMITS.maximumDepth + 1)),
          '[RAW_CARRIER_DEPTH]',
        ),
    ],
    [
      'carrier multiplication overflow',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier(multiplicationOverflow),
          '[RAW_CARRIER_ARITHMETIC]',
        ),
    ],
    [
      'carrier work exactly at limit',
      (label) =>
        expectTrue(
          label,
          decodeLosslessRawCarrier({ hex: '', repeat: RAW_CARRIER_LIMITS.maximumWork - 1 })
            .byteLength === 0,
        ),
    ],
    [
      'carrier first work above limit',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier({ hex: '', repeat: RAW_CARRIER_LIMITS.maximumWork }),
          '[RAW_CARRIER_WORK]',
        ),
    ],
    [
      'carrier output exactly at byte limit',
      (label) =>
        expectTrue(
          label,
          decodeLosslessRawCarrier({ hex: '00'.repeat(RAW_CARRIER_LIMITS.maximumBytes) })
            .byteLength === RAW_CARRIER_LIMITS.maximumBytes,
        ),
    ],
    [
      'carrier output above byte limit',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier({ hex: '00'.repeat(RAW_CARRIER_LIMITS.maximumBytes + 1) }),
          '[RAW_CARRIER_BYTES]',
        ),
    ],
    [
      'carrier low bytes high work',
      (label) =>
        expectFailure(
          label,
          () => decodeLosslessRawCarrier({ hex: '00', repeat: RAW_CARRIER_LIMITS.maximumWork }),
          '[RAW_CARRIER_WORK]',
        ),
    ],
  ]);
}

export function runR1SemanticPredicateSelfTests() {
  const at = '2026-08-20T00:00:00.000Z';
  const later = '2026-08-20T00:00:00.001Z';
  const interval = (lowerAt, lowerInclusive, upperAt, upperInclusive) => ({
    kind: 'interval',
    lower: { at: lowerAt, inclusive: lowerInclusive },
    upper: { at: upperAt, inclusive: upperInclusive },
  });
  const commitment = {
    profile: 'gb-digest-jcs-sha256-v1',
    domain: 'receipt.task.v1',
    value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  };
  const dnsName253 = ['a'.repeat(63), 'b'.repeat(63), 'c'.repeat(63), 'd'.repeat(61)].join('.');
  const dnsName254 = `${dnsName253}d`;
  return runGroup([
    [
      'frozen Unicode identity',
      (label) =>
        expectTrue(
          label,
          frozenUnicodeEvidence.unicodeVersion === '17.0.0' &&
            frozenUnicodeEvidence.sourceSetSha256 ===
              'd290a34d75c1ddeefb728594e421b9a74b1424d64181b0788e49da5d96665d9b' &&
            frozenUnicodeEvidence.idna2008Sha256 ===
              '83840db50200fc686ff850d4c156c47910054f118c50ea27a66d8c0ec2e17fb4' &&
            frozenUnicodeEvidence.idnaPropertiesSha256 ===
              '5291042234cb645162fc20ef5dc3a4d763302c7441428d3f0293975403679c8d' &&
            frozenUnicodeEvidence.generalCategoryMarkRangeCount === 327,
        ),
    ],
    [
      'Punycode mechanism has no UTS46 authority',
      (label) =>
        expectTrue(
          label,
          idnaRuntimeEvidence.punycodeMechanism === 'punycode@2.3.1' &&
            idnaRuntimeEvidence.uts46Mapping === false,
        ),
    ],
    [
      'canonical ASCII DNS labels',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('a') &&
            canonicalDnsName('service.example') &&
            !canonicalDnsName('ab--cd.example'),
        ),
    ],
    [
      'DNS name octet boundary',
      (label) =>
        expectTrue(
          label,
          dnsName253.length === 253 &&
            dnsName254.length === 254 &&
            canonicalDnsName(dnsName253) &&
            !canonicalDnsName(dnsName254),
        ),
    ],
    [
      'canonical DNS A-label',
      (label) => expectTrue(label, canonicalDnsName('xn--bcher-kva.example')),
    ],
    ['invalid DNS A-label', (label) => expectTrue(label, !canonicalDnsName('xn--a.example'))],
    [
      'A-label round-trip mismatch rejected',
      (label) => expectTrue(label, !canonicalDnsName('xn--aa--bb.example')),
    ],
    [
      'UTS46 does not participate',
      (label) =>
        expectTrue(
          label,
          !canonicalDnsName('xn--mi7c.example') && !canonicalDnsName('xn--ab-q8t.example'),
        ),
    ],
    [
      'IDNA2008 deviation A-label retained',
      (label) => expectTrue(label, canonicalDnsName('xn--zca.example')),
    ],
    [
      'Unicode 17 frozen eligibility',
      (label) => expectTrue(label, canonicalDnsName('xn--7xb.example')),
    ],
    [
      'frozen NFC valid and mismatch',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--tda.example') && !canonicalDnsName('xn--u-ccb.example'),
        ),
    ],
    [
      'leading General_Category Mark is independent of canonical combining class',
      (label) =>
        expectTrue(
          label,
          idna2008Category(0x0900) === 'PVALID' &&
            canonicalCombiningClass(0x0900) === 0 &&
            isCombiningMark(0x0900) &&
            !canonicalDnsName('xn--g1b') &&
            idna2008Category(0x0903) === 'PVALID' &&
            canonicalCombiningClass(0x0903) === 0 &&
            isCombiningMark(0x0903) &&
            !canonicalDnsName('xn--j1b') &&
            idna2008Category(0x0061) === 'PVALID' &&
            canonicalCombiningClass(0x0061) === 0 &&
            !isCombiningMark(0x0061) &&
            canonicalDnsName('a') &&
            idna2008Category(0x094d) === 'PVALID' &&
            canonicalCombiningClass(0x094d) === 9 &&
            isCombiningMark(0x094d) &&
            !canonicalDnsName('xn--n3b'),
        ),
    ],
    [
      'runtime normalize is not consulted',
      (label) => {
        const normalize = String.prototype.normalize;
        try {
          String.prototype.normalize = () => {
            throw new Error('runtime normalization must not be called');
          };
          expectTrue(
            label,
            canonicalDnsName('xn--bcher-kva.example') && !canonicalDnsName('xn--u-ccb.example'),
          );
        } finally {
          String.prototype.normalize = normalize;
        }
      },
    ],
    [
      'ContextJ Virama branches',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--11b2ezcs70k') &&
            canonicalDnsName('xn--11b2ezcw70k') &&
            canonicalDnsName('xn--11b6iv14e') &&
            canonicalDnsName('xn--11b6iy14e'),
        ),
    ],
    [
      'ContextJ joining branch',
      (label) =>
        expectTrue(label, canonicalDnsName('xn--ngbe199q') && canonicalDnsName('xn--ngbe1ii3504a')),
    ],
    [
      'ContextJ invalid and boundaries',
      (label) =>
        expectTrue(
          label,
          [
            'xn--ab-j1t',
            'xn--ab-m1t',
            'xn--ngbe099q',
            'xn--ngbe299q',
            'xn--11b378i',
            'xn--11b478i',
          ].every((value) => !canonicalDnsName(value)),
        ),
    ],
    [
      'ContextO middle dot',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--ll-0ea') &&
            ['xn--ab-0ea', 'xn--ll-zea', 'xn--ll-1ea'].every((value) => !canonicalDnsName(value)),
        ),
    ],
    [
      'ContextO Greek',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--wva4j') &&
            !canonicalDnsName('xn--a-jib') &&
            !canonicalDnsName('xn--wva3j'),
        ),
    ],
    [
      'ContextO Hebrew',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--4db4e') &&
            canonicalDnsName('xn--4db6e') &&
            ['xn--a-0jc', 'xn--4db3e', 'xn--a-2jc'].every((value) => !canonicalDnsName(value)),
        ),
    ],
    [
      'ContextO Katakana middle dot',
      (label) => expectTrue(label, canonicalDnsName('xn--lckyi') && !canonicalDnsName('xn--a-iju')),
    ],
    [
      'ContextO digit sets',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('xn--ngb8id') &&
            canonicalDnsName('xn--ngb61bd') &&
            !canonicalDnsName('xn--ngb8i1r'),
        ),
    ],
    [
      'whole-domain Bidi trigger',
      (label) =>
        expectTrue(
          label,
          canonicalDnsName('1') &&
            !canonicalDnsName('1.xn--mgbh0fb') &&
            canonicalDnsName('example.xn--mgbh0fb'),
        ),
    ],
    [
      'canonical IPv4 boundaries',
      (label) =>
        expectTrue(
          label,
          canonicalIpv4('0.0.0.0') &&
            canonicalIpv4('255.255.255.255') &&
            !canonicalIpv4('192.0.2.256'),
        ),
    ],
    [
      'hostile IPv4 forms',
      (label) =>
        expectTrue(
          label,
          !canonicalIpv4('127.1') &&
            !canonicalIpv4('+127.0.0.1') &&
            !canonicalIpv4('0x7f.0.0.1') &&
            !canonicalIpv4(' 127.0.0.1') &&
            !canonicalIpv4('127.0.0.1 '),
        ),
    ],
    [
      'canonical IPv6 basics',
      (label) =>
        expectTrue(
          label,
          canonicalIpv6('::') &&
            canonicalIpv6('::1') &&
            canonicalIpv6('2001:db8::1') &&
            canonicalIpv6('2001:db8:1:2:3:4:5:6'),
        ),
    ],
    ['IPv6 longest zero run', (label) => expectTrue(label, canonicalIpv6('2001:0:0:1::1'))],
    [
      'IPv6 equal-run first tie',
      (label) =>
        expectTrue(label, canonicalIpv6('2001::1:0:0:1:1') && !canonicalIpv6('2001:0:0:1::1:1')),
    ],
    [
      'nonmapped embedded IPv4 bits remain eligible in hex',
      (label) => expectTrue(label, canonicalIpv6('64:ff9b::c000:201')),
    ],
    ['mapped IPv6 rejected', (label) => expectTrue(label, !canonicalIpv6('::ffff:c000:280'))],
    [
      'IPv6 aliases and dotted tails rejected',
      (label) =>
        expectTrue(
          label,
          [
            '2001:0db8::1',
            '2001:DB8::1',
            '2001:db8:0:0:0:0:0:1',
            '2001:db8::192.0.2.1',
            '[::1]',
            'fe80::1%1',
          ].every((value) => !canonicalIpv6(value)),
        ),
    ],
    [
      'malformed IPv6 rejected',
      (label) =>
        expectTrue(
          label,
          !canonicalIpv6('2001::db8::1') &&
            !canonicalIpv6('2001:00000::1') &&
            !canonicalIpv6('2001:db8:1:2:3:4:5') &&
            !canonicalIpv6('2001:db8:1:2:3:4:5:6:7'),
        ),
    ],
    [
      'http canonical representation is not authorization',
      (label) =>
        expectTrue(
          label,
          semanticOrigin({
            scheme: 'http',
            host: { kind: 'ipv4', value: '127.0.0.1' },
            port: 8080,
          }),
        ),
    ],
    [
      'generic commitment is carrier-only',
      (label) =>
        expectTrue(
          label,
          semanticCommitmentRef(commitment) &&
            semanticCommitmentRefForOwner(commitment, commitment.profile, commitment.domain) &&
            !semanticCommitmentRefForOwner(
              { ...commitment, domain: 'syntactic.example' },
              commitment.profile,
              commitment.domain,
            ),
        ),
    ],
    [
      'ordered interval all edge combinations',
      (label) =>
        expectTrue(
          label,
          [true, false].every((lowerInclusive) =>
            [true, false].every((upperInclusive) =>
              semanticTimeEvidence(interval(at, lowerInclusive, later, upperInclusive)),
            ),
          ),
        ),
    ],
    [
      'equal interval only closed closed',
      (label) =>
        expectTrue(
          label,
          semanticTimeEvidence(interval(at, true, at, true)) &&
            !semanticTimeEvidence(interval(at, false, at, true)) &&
            !semanticTimeEvidence(interval(at, true, at, false)) &&
            !semanticTimeEvidence(interval(at, false, at, false)),
        ),
    ],
    [
      'reversed interval rejected',
      (label) => expectTrue(label, !semanticTimeEvidence(interval(later, true, at, true))),
    ],
    [
      'duplicate semantic registration',
      (label) =>
        expectFailure(
          label,
          () =>
            createSemanticCheckRegistry([
              ['duplicate', () => true],
              ['duplicate', () => true],
            ]),
          'Duplicate semantic-check registration',
        ),
    ],
  ]);
}

export function runPathPolicySelfTests() {
  return runGroup([
    [
      'valid POSIX-relative path',
      () => assertCanonicalPosixRelativePath('protocol/schemas/schema.json', 'self-test'),
    ],
    [
      'leading slash',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('/absolute', label),
          'absolute',
        ),
    ],
    [
      'trailing slash',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('trailing/', label),
          'trailing slash',
        ),
    ],
    [
      'backslash',
      (label) =>
        expectFailure(label, () => assertCanonicalPosixRelativePath('a\\b', label), 'backslash'),
    ],
    [
      'empty segment',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('a//b', label),
          'empty segment',
        ),
    ],
    [
      'dot segment',
      (label) =>
        expectFailure(label, () => assertCanonicalPosixRelativePath('a/./b', label), 'dot segment'),
    ],
    [
      'dot-dot segment',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('a/../b', label),
          'dot-dot segment',
        ),
    ],
    [
      'Windows drive absolute',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('C:/Windows', label),
          'Windows drive',
        ),
    ],
    [
      'Windows drive relative',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('C:relative', label),
          'Windows drive',
        ),
    ],
    [
      'URI absolute form',
      (label) =>
        expectFailure(
          label,
          () => assertCanonicalPosixRelativePath('file:/tmp/value', label),
          'scheme',
        ),
    ],
    [
      'empty path',
      (label) => expectFailure(label, () => assertCanonicalPosixRelativePath('', label), 'empty'),
    ],
  ]);
}

export function runArtifactExactByteSelfTests() {
  const emptyBytes = Buffer.alloc(0);
  const emptyDigest = sha256Base64url(emptyBytes);
  const emptyExact = { algorithm: 'sha-256', value: emptyDigest, byteLength: 0 };
  const emptyInput = { artifactBytesHex: '' };
  const nonemptyBytes = Buffer.from([0x00]);
  const nonemptyDigest = sha256Base64url(nonemptyBytes);
  const nonemptyExact = { algorithm: 'sha-256', value: nonemptyDigest, byteLength: 1 };
  const nonemptyInput = { artifactBytesHex: '00' };
  const arbitraryBytes = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
  const arbitraryExact = {
    algorithm: 'sha-256',
    value: sha256Base64url(arbitraryBytes),
    byteLength: 4,
  };
  const utf8Bytes = Buffer.from('é', 'utf8');
  const utf8Exact = { algorithm: 'sha-256', value: sha256Base64url(utf8Bytes), byteLength: 2 };
  const compactText = Buffer.from('{"a":1}', 'utf8');
  const spacedText = Buffer.from('{ "a": 1 }', 'utf8');
  return runGroup([
    [
      'empty-byte exact digest',
      (label) => expectTrue(label, emptyDigest === '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU'),
    ],
    [
      'empty-byte exact match',
      (label) => expectTrue(label, artifactByteIntegrityMatches(emptyExact, emptyInput)),
    ],
    [
      'digest mismatch',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches(
            { ...emptyExact, value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
            emptyInput,
          ),
        ),
    ],
    [
      'byteLength mismatch',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches({ ...emptyExact, byteLength: 1 }, emptyInput),
        ),
    ],
    [
      'malformed semantic bytes',
      (label) =>
        expectTrue(label, !artifactByteIntegrityMatches(emptyExact, { artifactBytesHex: '0g' })),
    ],
    [
      'one-byte exact digest',
      (label) =>
        expectTrue(label, nonemptyDigest === 'bjQLnP-zepicpUTmu3gKLHiQHT-zNzh2hRGjBhevoB0'),
    ],
    [
      'one-byte exact match',
      (label) => expectTrue(label, artifactByteIntegrityMatches(nonemptyExact, nonemptyInput)),
    ],
    [
      'one-byte content mismatch',
      (label) =>
        expectTrue(label, !artifactByteIntegrityMatches(nonemptyExact, { artifactBytesHex: '01' })),
    ],
    [
      'one-byte length mismatch',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches({ ...nonemptyExact, byteLength: 0 }, nonemptyInput),
        ),
    ],
    [
      'deterministic arbitrary bytes',
      (label) =>
        expectTrue(
          label,
          artifactByteIntegrityMatches(arbitraryExact, {
            artifactBytesHex: arbitraryBytes.toString('hex'),
          }),
        ),
    ],
    [
      'UTF-8 exact bytes',
      (label) =>
        expectTrue(
          label,
          artifactByteIntegrityMatches(utf8Exact, { artifactBytesHex: utf8Bytes.toString('hex') }),
        ),
    ],
    [
      'semantically equivalent text remains byte-distinct',
      (label) => expectTrue(label, sha256Base64url(compactText) !== sha256Base64url(spacedText)),
    ],
    [
      'wrong algorithm',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches({ ...emptyExact, algorithm: 'sha512' }, emptyInput),
        ),
    ],
    [
      'noncanonical digest',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches({ ...emptyExact, value: `${emptyDigest}=` }, emptyInput),
        ),
    ],
    [
      'one-bit mutation',
      (label) =>
        expectTrue(
          label,
          !artifactByteIntegrityMatches(arbitraryExact, { artifactBytesHex: 'dfadbeef' }),
        ),
    ],
  ]);
}

export function runDirectoryEntrySelfTests() {
  const entry = (kind) => ({
    isSymbolicLink: () => kind === 'symlink',
    isDirectory: () => kind === 'directory',
    isFile: () => kind === 'file',
  });
  return runGroup([
    [
      'regular directory entry',
      (label) =>
        expectTrue(label, assertRegularRepositoryEntry(entry('directory'), label) === 'directory'),
    ],
    [
      'regular file entry',
      (label) => expectTrue(label, assertRegularRepositoryEntry(entry('file'), label) === 'file'),
    ],
    [
      'symbolic-link directory entry',
      (label) =>
        expectFailure(
          label,
          () => assertRegularRepositoryEntry(entry('symlink'), label),
          'Symbolic-link',
        ),
    ],
    [
      'non-regular directory entry',
      (label) =>
        expectFailure(
          label,
          () => assertRegularRepositoryEntry(entry('special'), label),
          'Non-regular',
        ),
    ],
  ]);
}

export function runAncestorComponentSelfTests() {
  const ordinaryFileChain = [
    { path: 'protocol', kind: 'directory' },
    { path: 'protocol/schemas', kind: 'directory' },
    { path: 'protocol/schemas/foundation-manifest.json', kind: 'file' },
  ];
  return runGroup([
    [
      'ordinary ancestor chain',
      () => assertRepositoryPathComponentChain(ordinaryFileChain, 'file', 'self-test'),
    ],
    [
      'intermediate symbolic link',
      (label) =>
        expectFailure(
          label,
          () =>
            assertRepositoryPathComponentChain(
              [
                ordinaryFileChain[0],
                { path: 'protocol/schemas', kind: 'symlink' },
                ordinaryFileChain[2],
              ],
              'file',
              label,
            ),
          'Symbolic-link repository path component',
        ),
    ],
    [
      'terminal symbolic link',
      (label) =>
        expectFailure(
          label,
          () =>
            assertRepositoryPathComponentChain(
              [
                ordinaryFileChain[0],
                ordinaryFileChain[1],
                { path: ordinaryFileChain[2].path, kind: 'symlink' },
              ],
              'file',
              label,
            ),
          'Symbolic-link repository path component',
        ),
    ],
    [
      'intermediate regular file',
      (label) =>
        expectFailure(
          label,
          () =>
            assertRepositoryPathComponentChain(
              [
                ordinaryFileChain[0],
                { path: 'protocol/schemas', kind: 'file' },
                ordinaryFileChain[2],
              ],
              'file',
              label,
            ),
          'not an ordinary directory',
        ),
    ],
    [
      'intermediate special entry',
      (label) =>
        expectFailure(
          label,
          () =>
            assertRepositoryPathComponentChain(
              [
                ordinaryFileChain[0],
                { path: 'protocol/schemas', kind: 'special' },
                ordinaryFileChain[2],
              ],
              'file',
              label,
            ),
          'not an ordinary directory',
        ),
    ],
  ]);
}

export function runMachineAssetCoverageSelfTests(bundle) {
  const manifestPath = 'protocol/schemas/e1.r0-draft.1/foundation-manifest.json';
  const schemaRoot = 'protocol/schemas/e1.r0-draft.1';
  const fixtureRoot = 'protocol/fixtures/wire/e1.r0-draft.1/foundation';
  const registryRoot = 'protocol/registries/e1.r0-draft.1';
  const coverage = (manifest, diskOverrides = {}) =>
    assertMachineAssetCoverage({
      manifest,
      manifestPath,
      schemaRoot,
      fixtureRoot,
      registryRoot,
      ...bundle.diskPaths,
      ...diskOverrides,
    });
  return runGroup([
    [
      'extra disk fixture',
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              fixtureRootFiles: [
                ...bundle.diskPaths.fixtureRootFiles,
                `${fixtureRoot}/tooling-self-test-extra.json`,
              ],
            }),
          'fixture disk coverage mismatch',
        ),
    ],
    [
      'extra disk registry',
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              registryRootFiles: [
                ...bundle.diskPaths.registryRootFiles,
                `${registryRoot}/tooling-self-test-extra.json`,
              ],
            }),
          'registry disk coverage mismatch',
        ),
    ],
    [
      'unexpected schema-root JSON',
      (label) =>
        expectFailure(
          label,
          () =>
            coverage(bundle.manifest, {
              schemaRootFiles: [
                ...bundle.diskPaths.schemaRootFiles,
                `${schemaRoot}/tooling-self-test-extra.json`,
              ],
            }),
          'schema-root non-schema JSON asset disk coverage mismatch',
        ),
    ],
    [
      'fixture outside canonical root',
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.fixtures[0].path = 'protocol/fixtures/wire/e1.r0-draft.1/tooling-self-test.json';
        expectFailure(label, () => coverage(candidate), 'outside canonical root');
      },
    ],
    [
      'registry outside canonical root',
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.registries[0].path = 'protocol/registries/tooling-self-test.json';
        expectFailure(label, () => coverage(candidate), 'outside canonical root');
      },
    ],
    [
      'cross-role duplicate',
      (label) => {
        const candidate = structuredClone(bundle.manifest);
        candidate.semanticConstraintInventory.path = candidate.schemas[0].path;
        expectFailure(label, () => coverage(candidate), 'Cross-role declared path collision');
      },
    ],
    [
      'declared registry not processed',
      (label) =>
        expectFailure(
          label,
          () =>
            assertAllDeclaredPathsProcessed(
              'registry',
              bundle.manifest.registries.map((entry) => entry.path),
              new Set(),
            ),
          'registry processing disk coverage mismatch',
        ),
    ],
  ]);
}

export function runClosedCoreSelfTests(bundle) {
  const entry = { path: 'tooling-self-test.schema.json' };
  const workspaceEntry = bundle.manifest.schemas.find(
    (candidate) => candidate.logicalName === 'WorkspaceScope',
  );
  const timeEntry = bundle.manifest.schemas.find(
    (candidate) => candidate.logicalName === 'TimeEvidence',
  );
  return runGroup([
    [
      'direct composed branch inherits root closure',
      () =>
        assertClosedCoreObjectSchemas(entry, {
          oneOf: [
            { type: 'object', properties: { kind: { const: 'a' } } },
            { type: 'object', properties: { kind: { const: 'b' } } },
          ],
          unevaluatedProperties: false,
        }),
    ],
    [
      'nested child object does not inherit root closure',
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              type: 'object',
              properties: {
                payload: { type: 'object', properties: { value: { type: 'string' } } },
              },
              unevaluatedProperties: false,
            }),
          'Object schema is not closed',
        ),
    ],
    [
      'nested child object with local closure',
      () =>
        assertClosedCoreObjectSchemas(entry, {
          type: 'object',
          properties: {
            payload: {
              type: 'object',
              properties: { value: { type: 'string' } },
              additionalProperties: false,
            },
          },
          unevaluatedProperties: false,
        }),
    ],
    [
      'deep composition cannot leak closure to child instance',
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              oneOf: [{ allOf: [{ type: 'object', properties: { payload: { type: 'object' } } }] }],
              unevaluatedProperties: false,
            }),
          'Object schema is not closed',
        ),
    ],
    [
      'object keywords without explicit type require closure',
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              properties: { value: { type: 'string' } },
            }),
          'Object schema is not closed',
        ),
    ],
    [
      'object union type requires closure',
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              type: ['object', 'null'],
              properties: { value: { type: 'string' } },
            }),
          'Object schema is not closed',
        ),
    ],
    [
      'object keywords without type pass with local closure',
      () =>
        assertClosedCoreObjectSchemas(entry, {
          properties: { value: { type: 'string' } },
          additionalProperties: false,
        }),
    ],
    [
      'object-keyword branch inherits same-instance closure',
      () =>
        assertClosedCoreObjectSchemas(entry, {
          oneOf: [
            { properties: { kind: { const: 'a' } }, required: ['kind'] },
            { properties: { kind: { const: 'b' } }, required: ['kind'] },
          ],
          unevaluatedProperties: false,
        }),
    ],
    [
      'object-keyword child does not inherit parent closure',
      (label) =>
        expectFailure(
          label,
          () =>
            assertClosedCoreObjectSchemas(entry, {
              properties: {
                payload: { properties: { value: { type: 'string' } } },
              },
              unevaluatedProperties: false,
            }),
          'Object schema is not closed',
        ),
    ],
    [
      'WorkspaceScope unchanged',
      () =>
        assertClosedCoreObjectSchemas(workspaceEntry, bundle.schemas.get(workspaceEntry.schemaId)),
    ],
    [
      'TimeEvidence unchanged',
      () => assertClosedCoreObjectSchemas(timeEntry, bundle.schemas.get(timeEntry.schemaId)),
    ],
  ]);
}

export function runFixtureClassificationSelfTests() {
  return runGroup([
    [
      'misclassified structural-negative',
      (label) =>
        expectFailure(
          label,
          () =>
            assertFixtureClassification('structural-negative', {
              id: label,
              kind: 'value',
              structuralExpected: 'pass',
              semanticExpected: 'not-applicable',
              semanticCheck: 'none',
            }),
          'Misclassified structural-negative',
        ),
    ],
    [
      'misclassified semantic-negative',
      (label) =>
        expectFailure(
          label,
          () =>
            assertFixtureClassification('semantic-negative', {
              id: label,
              kind: 'value',
              structuralExpected: 'pass',
              semanticExpected: 'fail',
              semanticCheck: 'none',
            }),
          'Misclassified semantic-negative',
        ),
    ],
    [
      'semantic-positive equality retained',
      () =>
        assertFixtureClassification('semantic-positive', {
          id: 'tooling-self-test-equality',
          kind: 'equality',
          semanticCheck: 'tenant-exact-equality',
        }),
    ],
  ]);
}

export function runRegistryExactSetSelfTests({ registry, validateRegistry }) {
  const rejects = (label, candidate) => expectTrue(label, validateRegistry(candidate) === false);
  return runGroup([
    [
      'order independence',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.reverse();
        expectTrue(label, validateRegistry(candidate) === true);
      },
    ],
    [
      'wrong registry class',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].registryClass = 'gb.registry.tool-self-test-wrong';
        rejects(label, candidate);
      },
    ],
    [
      'extra registry class',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.push({
          ...candidate.registryArtifacts[0],
          registryClass: 'gb.registry.tool-self-test-extra',
        });
        rejects(label, candidate);
      },
    ],
    [
      'missing registry class',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts.pop();
        rejects(label, candidate);
      },
    ],
    [
      'duplicate registry class',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[1] = structuredClone(candidate.registryArtifacts[0]);
        rejects(label, candidate);
      },
    ],
    [
      'wrong typed artifact field',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].directionalBindingArtifact =
          candidate.registryArtifacts[0].sourceClaimAuthorityArtifact;
        delete candidate.registryArtifacts[0].sourceClaimAuthorityArtifact;
        rejects(label, candidate);
      },
    ],
    [
      'wrong artifact schema',
      (label) => {
        const candidate = structuredClone(registry);
        candidate.registryArtifacts[0].artifactSchema =
          candidate.registryArtifacts[1].artifactSchema;
        rejects(label, candidate);
      },
    ],
  ]);
}

function runExternalSchemaFragmentSafetySelfTests() {
  const baseSchemaId = 'urn:uuid:11111111-1111-4111-8111-111111111111';
  const consumerSchemaId = 'urn:uuid:22222222-2222-4222-8222-222222222222';
  const manifestId = 'urn:uuid:33333333-3333-4333-8333-333333333333';
  const existingReference = `${baseSchemaId}#/$defs/existingDefinition`;
  const secondReference = `${baseSchemaId}#/$defs/secondDefinition`;
  const baseSchema = {
    $schema: EXPECTED_DIALECT,
    $id: baseSchemaId,
    type: 'string',
    $defs: {
      existingDefinition: { type: 'string' },
      secondDefinition: { type: 'integer' },
    },
  };
  const makeConsumer = (references) => ({
    $schema: EXPECTED_DIALECT,
    $id: consumerSchemaId,
    ...(references.length === 1
      ? { $ref: references[0] }
      : { anyOf: references.map((reference) => ({ $ref: reference })) }),
  });
  const scanReferences = (references, dependencies = [baseSchemaId]) => {
    const schema = makeConsumer(references);
    const schemas = new Map([
      [baseSchemaId, baseSchema],
      [consumerSchemaId, schema],
    ]);
    return scanSchemaSafety({
      entry: {
        logicalName: 'ExternalFragmentConsumerSelfTest',
        path: 'protocol/tooling/external-fragment-consumer.schema.json',
        schemaId: consumerSchemaId,
        dependencies,
      },
      schema,
      text: JSON.stringify(schema),
      schemaIds: new Set(schemas.keys()),
      schemas,
    });
  };

  const count = runGroup([
    ['bare UUID external reference', () => scanReferences([baseSchemaId])],
    ['canonical external $defs reference', () => scanReferences([existingReference])],
    [
      'fragment dependency satisfied by bare UUID',
      (label) => {
        const schema = makeConsumer([existingReference]);
        assertDeclaredDependencies({ logicalName: label, dependencies: [baseSchemaId] }, schema);
      },
    ],
    [
      'two fragments normalize to one dependency',
      (label) => {
        const schema = makeConsumer([existingReference, secondReference]);
        expectTrue(
          label,
          collectExternalDependencyIds(schema).size === 1 &&
            collectExternalDependencyIds(schema).has(baseSchemaId),
        );
        scanReferences([existingReference, secondReference]);
      },
    ],
    [
      'unknown external fragment base',
      (label) =>
        expectFailure(
          label,
          () =>
            scanReferences([
              'urn:uuid:44444444-4444-4444-8444-444444444444#/$defs/existingDefinition',
            ]),
          'Unresolved schema reference',
        ),
    ],
    [
      'nonexistent external $defs member',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([`${baseSchemaId}#/$defs/missingDefinition`]),
          'Unresolved external schema fragment',
        ),
    ],
    [
      'malformed nested external fragment',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([`${existingReference}/nested`]),
          'Unsupported external schema fragment',
        ),
    ],
    [
      'empty external fragment',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([`${baseSchemaId}#`]),
          'Empty external schema fragment',
        ),
    ],
    [
      'non-pointer external anchor',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([`${baseSchemaId}#existingDefinition`]),
          'Unsupported external schema fragment',
        ),
    ],
    [
      'HTTP external fragment',
      (label) =>
        expectFailure(
          label,
          () => scanReferences(['https://example.invalid/schema#/$defs/existingDefinition']),
          'External schema reference is prohibited',
        ),
    ],
    [
      'Ghost Bridge external fragment',
      (label) =>
        expectFailure(
          label,
          () => scanReferences(['urn:ghostbridge:tooling#/$defs/existingDefinition']),
          'External Ghost Bridge schema reference',
        ),
    ],
    [
      'noncanonical UUID fragment base',
      (label) =>
        expectFailure(
          label,
          () =>
            scanReferences([
              'urn:uuid:AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA#/$defs/existingDefinition',
            ]),
          'Noncanonical schema reference',
        ),
    ],
    [
      'fragmented schema identity',
      (label) =>
        expectFailure(
          label,
          () =>
            validateManifestDeclarations({
              bundleId: manifestId,
              schemas: [
                {
                  logicalName: 'FragmentedIdentitySelfTest',
                  schemaId: `${consumerSchemaId}#/$defs/notAnIdentity`,
                  path: 'protocol/tooling/fragmented-identity.schema.json',
                  dependencies: [],
                },
              ],
            }),
          'Noncanonical schema ID',
        ),
    ],
    [
      'offline Ajv external $defs compilation',
      (label) => {
        const consumer = makeConsumer([existingReference]);
        const schemas = new Map([
          [baseSchemaId, baseSchema],
          [consumerSchemaId, consumer],
        ]);
        const { ajv } = createOfflineSchemaValidator(schemas);
        expectTrue(label, typeof ajv.getSchema(consumerSchemaId) === 'function');
      },
    ],
    [
      'normalized dependency mismatch',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([existingReference], []),
          'Direct dependency mismatch',
        ),
    ],
    [
      'percent-encoded external fragment',
      (label) =>
        expectFailure(
          label,
          () => scanReferences([`${baseSchemaId}#/%24defs/existingDefinition`]),
          'Unsupported external schema fragment',
        ),
    ],
    [
      'prohibited dynamic reference',
      (label) => {
        const schema = {
          $schema: EXPECTED_DIALECT,
          $id: consumerSchemaId,
          $dynamicRef: '#toolingDynamicReference',
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: {
                logicalName: label,
                path: 'protocol/tooling/dynamic-reference.schema.json',
                schemaId: consumerSchemaId,
                dependencies: [],
              },
              schema,
              text: JSON.stringify(schema),
              schemaIds: new Set([consumerSchemaId]),
              schemas: new Map([[consumerSchemaId, schema]]),
            }),
          'Prohibited $dynamicRef',
        );
      },
    ],
    [
      'full fragmented references retained for audit',
      (label) => {
        const references = collectExternalReferences(
          makeConsumer([existingReference, secondReference]),
        );
        expectTrue(
          label,
          references.size === 2 &&
            references.has(existingReference) &&
            references.has(secondReference),
        );
      },
    ],
  ]);
  if (count !== 18) {
    throw new Error(`External schema fragment safety self-test count changed: ${count}`);
  }
  return { count, namedProofs: new Set(['EXTERNAL_SCHEMA_FRAGMENT_SAFETY']) };
}

export function runSeededValidatorSelfTests({ bundle, registry, validateRegistry }) {
  const manifest = bundle.manifest;
  const firstEntry = manifest.schemas[0];
  const firstSchema = bundle.schemas.get(firstEntry.schemaId);
  const schemaIds = bundle.schemaIds;
  const syntheticText = JSON.stringify(firstSchema);
  const tests = [
    [
      'duplicate schema $id',
      (label) => {
        const secondEntry = manifest.schemas[1];
        const candidate = structuredClone(bundle.schemas.get(secondEntry.schemaId));
        candidate.$id = firstSchema.$id;
        expectFailure(
          label,
          () => assertLoadedSchemaIdentity(secondEntry, candidate, new Set([firstSchema.$id])),
          'Duplicate schema $id',
        );
      },
    ],
    [
      'missing manifest schema',
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas.pop();
        expectFailure(
          label,
          () => assertManifestDiskCoverage(candidate, bundle.onDiskSchemaPaths),
          'count mismatch',
        );
      },
    ],
    [
      'missing dependency',
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas[0].dependencies.push('urn:uuid:00000000-0000-4000-8000-000000000000');
        expectFailure(label, () => validateManifestDeclarations(candidate), 'Missing dependency');
      },
    ],
    [
      'duplicate manifest path',
      (label) => {
        const candidate = structuredClone(manifest);
        candidate.schemas[1].path = candidate.schemas[0].path;
        expectFailure(
          label,
          () => validateManifestDeclarations(candidate),
          'Duplicate manifest schema path',
        );
      },
    ],
    [
      'unresolved $ref',
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { $ref: 'urn:uuid:00000000-0000-4000-8000-000000000000' } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: JSON.stringify(candidate),
              schemaIds,
            }),
          'Unresolved schema reference',
        );
      },
    ],
    [
      'unknown semantic-check identifier',
      (label) =>
        expectFailure(
          label,
          () => evaluateSemanticCheck({ semanticCheck: 'unknown-tool-self-test' }, {}),
          'Unknown semantic-check',
        ),
    ],
    [
      'duplicate semantic-check registration',
      (label) =>
        expectFailure(
          label,
          () =>
            createSemanticCheckRegistry([
              ['duplicate', () => true],
              ['duplicate', () => true],
            ]),
          'Duplicate semantic-check registration',
        ),
    ],
    [
      'semantic-negative unexpectedly passes',
      (label) =>
        expectFailure(
          label,
          () =>
            runFixtureCase({
              testCase: {
                id: 'TOOL-SELF-TEST-SEMANTIC-NEGATIVE',
                kind: 'value',
                value: 'accepted',
                structuralExpected: 'pass',
                semanticExpected: 'fail',
                semanticCheck: 'tenant-id',
              },
              validateTarget: () => true,
            }),
          'Semantic expectation mismatch',
        ),
    ],
    [
      'prohibited default',
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { type: 'string', default: 'x' } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: syntheticText,
              schemaIds,
            }),
          'Prohibited default',
        );
      },
    ],
    [
      'prohibited nullable',
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { type: 'string', nullable: true } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: syntheticText,
              schemaIds,
            }),
          'Prohibited nullable',
        );
      },
    ],
    [
      'external Ghost Bridge schema reference',
      (label) => {
        const candidate = {
          ...structuredClone(firstSchema),
          $defs: { toolingSelfTest: { $ref: 'urn:ghostbridge:tool-self-test' } },
        };
        expectFailure(
          label,
          () =>
            scanSchemaSafety({
              entry: firstEntry,
              schema: candidate,
              text: JSON.stringify(candidate),
              schemaIds,
            }),
          'External Ghost Bridge',
        );
      },
    ],
  ];
  const coreCount = runGroup(tests);
  const pathCount = runPathPolicySelfTests();
  const registryCount = runRegistryExactSetSelfTests({ registry, validateRegistry });
  const artifactCount = runArtifactExactByteSelfTests();
  const directoryEntryCount = runDirectoryEntrySelfTests();
  const ancestorComponentCount = runAncestorComponentSelfTests();
  const machineAssetCoverageCount = runMachineAssetCoverageSelfTests(bundle);
  const closedCoreCount = runClosedCoreSelfTests(bundle);
  const fixtureClassificationCount = runFixtureClassificationSelfTests();
  const externalSchemaFragmentSafety = runExternalSchemaFragmentSafetySelfTests();
  return {
    coreCount,
    pathCount,
    registryCount,
    artifactCount,
    directoryEntryCount,
    ancestorComponentCount,
    machineAssetCoverageCount,
    closedCoreCount,
    fixtureClassificationCount,
    externalSchemaFragmentSafetyCount: externalSchemaFragmentSafety.count,
    namedProofs: externalSchemaFragmentSafety.namedProofs,
    totalCount:
      coreCount +
      pathCount +
      registryCount +
      artifactCount +
      directoryEntryCount +
      ancestorComponentCount +
      machineAssetCoverageCount +
      closedCoreCount +
      fixtureClassificationCount +
      externalSchemaFragmentSafety.count,
  };
}
