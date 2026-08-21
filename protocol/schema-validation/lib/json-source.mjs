import { readFileSync } from 'node:fs';

import { errorMessage, fail } from './errors.mjs';

const JSON_WHITESPACE = /[\u0009\u000a\u000d\u0020]/u;
const TOOLING_MAX_JSON_BYTES = 16 * 1024 * 1024;
const TOOLING_MAX_JSON_NESTING = 256;

export const PROTOCOL_JSON_LIMITS = Object.freeze({
  maximumNesting: 16,
  maximumStringUtf8Bytes: 64 * 1024,
  maximumArrayEntries: 256,
  maximumObjectMembers: 256,
  maximumTokens: 16_384,
});

function diagnostic(code, message, source, offset) {
  const location = offset === undefined ? '' : ` at code-unit offset ${offset}`;
  fail(`[${code}] ${message} in ${source}${location}`);
}

export function decodeStrictUtf8(
  bytes,
  source = 'JSON source',
  maximumBytes = TOOLING_MAX_JSON_BYTES,
) {
  if (!(bytes instanceof Uint8Array)) fail(`${source} was not supplied as bytes`);
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    fail(`${source} has an invalid caller-supplied byte ceiling`);
  }
  if (bytes.byteLength > maximumBytes)
    diagnostic('BYTE_LIMIT', `input exceeds the ${maximumBytes}-byte ceiling`, source);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    diagnostic('UTF8_BOM', 'UTF-8 BOM is prohibited', source);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    fail(`[UTF8_INVALID] Strict UTF-8 decoding failed for ${source}: ${errorMessage(error)}`, {
      cause: error,
    });
  }
}

function isUnicodeNoncharacter(codePoint) {
  return (
    (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
    (codePoint & 0xffff) === 0xfffe ||
    (codePoint & 0xffff) === 0xffff
  );
}

function assertUnicodeScalarString(value, source, offset, maximumUtf8Bytes) {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) {
        diagnostic(
          'STRING_UNICODE',
          'JSON string contains an unpaired high surrogate',
          source,
          offset,
        );
      }
      const codePoint = 0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00);
      if (isUnicodeNoncharacter(codePoint))
        diagnostic('STRING_UNICODE', 'JSON string contains a Unicode noncharacter', source, offset);
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      diagnostic(
        'STRING_UNICODE',
        'JSON string contains an unpaired low surrogate',
        source,
        offset,
      );
    } else if (isUnicodeNoncharacter(first)) {
      diagnostic('STRING_UNICODE', 'JSON string contains a Unicode noncharacter', source, offset);
    }
  }
  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength > maximumUtf8Bytes) {
    diagnostic(
      'STRING_LIMIT',
      `decoded JSON string exceeds ${maximumUtf8Bytes} UTF-8 bytes`,
      source,
      offset,
    );
  }
}

function sourceNumberIsMathematicalInteger(token) {
  const match = token.match(/^-?([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/u);
  if (!match) return false;
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? '0');
  if (!Number.isFinite(exponent)) return false;
  const coefficient = `${match[1]}${fraction}`.replace(/^0+/u, '') || '0';
  if (coefficient === '0') return true;
  const decimalShift = exponent - fraction.length;
  if (decimalShift >= 0) return true;
  const requiredZeros = -decimalShift;
  return requiredZeros <= coefficient.length && coefficient.endsWith('0'.repeat(requiredZeros));
}

function sourceIntegerMagnitude(token) {
  const match = token.match(/^-?([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/u);
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? '0');
  let coefficient = `${match[1]}${fraction}`.replace(/^0+/u, '') || '0';
  if (coefficient === '0') return coefficient;
  const decimalShift = exponent - fraction.length;
  if (decimalShift >= 0) coefficient += '0'.repeat(decimalShift);
  else coefficient = coefficient.slice(0, coefficient.length + decimalShift);
  return coefficient.replace(/^0+/u, '') || '0';
}

function assertProtocolNumber(token, source, offset) {
  const coefficient = token.match(/^-?([0-9]+)(?:\.([0-9]+))?/u);
  if (
    token.startsWith('-') &&
    `${coefficient[1]}${coefficient[2] ?? ''}`.split('').every((digit) => digit === '0')
  ) {
    diagnostic('NUMBER_NEGATIVE_ZERO', 'negative-zero source number is prohibited', source, offset);
  }
  const value = Number(token);
  if (!Number.isFinite(value))
    diagnostic('NUMBER_NONFINITE', 'JSON number is not finite binary64', source, offset);
  if (Object.is(value, -0))
    diagnostic(
      'NUMBER_NEGATIVE_ZERO',
      'negative-zero binary64 result is prohibited',
      source,
      offset,
    );
  if (!sourceNumberIsMathematicalInteger(token)) return;
  const magnitude = sourceIntegerMagnitude(token);
  const maximum = '9007199254740991';
  if (
    magnitude.length > maximum.length ||
    (magnitude.length === maximum.length && magnitude > maximum)
  ) {
    diagnostic(
      'NUMBER_UNSAFE_INTEGER',
      'mathematical integer exceeds the exact safe-integer range',
      source,
      offset,
    );
  }
}

function scanJsonText(text, source, limits) {
  if (typeof text !== 'string') fail(`${source} was not supplied as text`);
  let index = 0;
  let tokenCount = 0;
  const numberToken = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/uy;

  function countToken() {
    tokenCount += 1;
    if (tokenCount > limits.maximumTokens) {
      diagnostic('TOKEN_LIMIT', `JSON token count exceeds ${limits.maximumTokens}`, source, index);
    }
  }

  function failAt(message) {
    diagnostic('JSON_SYNTAX', message, source, index);
  }

  function skipWhitespace() {
    while (index < text.length && JSON_WHITESPACE.test(text[index])) index += 1;
  }

  function parseString() {
    const start = index;
    if (text[index] !== '"') failAt('Expected JSON string');
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        let decoded;
        try {
          decoded = JSON.parse(text.slice(start, index));
        } catch (error) {
          fail(`[JSON_SYNTAX] Malformed JSON string in ${source}: ${errorMessage(error)}`, {
            cause: error,
          });
        }
        if (limits.validateStrings)
          assertUnicodeScalarString(decoded, source, start, limits.maximumStringUtf8Bytes);
        countToken();
        return decoded;
      }
      if (character.charCodeAt(0) < 0x20) failAt('Unescaped control character in JSON string');
      if (character !== '\\') {
        index += 1;
        continue;
      }
      index += 1;
      if (index >= text.length) failAt('Unterminated JSON escape');
      const escape = text[index];
      if ('"\\/bfnrt'.includes(escape)) {
        index += 1;
        continue;
      }
      if (escape !== 'u') failAt(`Invalid JSON escape \\${escape}`);
      const digits = text.slice(index + 1, index + 5);
      if (digits.length !== 4 || !/^[0-9A-Fa-f]{4}$/u.test(digits))
        failAt('Invalid JSON Unicode escape');
      index += 5;
    }
    failAt('Unterminated JSON string');
  }

  function enterContainer(depth) {
    if (depth > limits.maximumNesting)
      diagnostic('NESTING_LIMIT', `JSON nesting exceeds ${limits.maximumNesting}`, source, index);
  }

  function parseArray(depth) {
    enterContainer(depth);
    index += 1;
    countToken();
    let entries = 0;
    skipWhitespace();
    if (text[index] === ']') {
      index += 1;
      countToken();
      return;
    }
    while (index < text.length) {
      entries += 1;
      if (entries > limits.maximumArrayEntries) {
        diagnostic(
          'ARRAY_LIMIT',
          `JSON array has more than ${limits.maximumArrayEntries} entries`,
          source,
          index,
        );
      }
      parseValue(depth);
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        countToken();
        return;
      }
      if (text[index] !== ',') failAt('Malformed JSON array');
      index += 1;
      countToken();
      skipWhitespace();
      if (text[index] === ']') failAt('Trailing comma in JSON array');
    }
    failAt('Unterminated JSON array');
  }

  function parseObject(depth) {
    enterContainer(depth);
    index += 1;
    countToken();
    const keys = new Set();
    skipWhitespace();
    if (text[index] === '}') {
      index += 1;
      countToken();
      return;
    }
    while (index < text.length) {
      const key = parseString();
      if (keys.has(key))
        diagnostic(
          'DUPLICATE_MEMBER',
          `Duplicate raw JSON member ${JSON.stringify(key)}`,
          source,
          index,
        );
      keys.add(key);
      if (keys.size > limits.maximumObjectMembers) {
        diagnostic(
          'OBJECT_LIMIT',
          `JSON object has more than ${limits.maximumObjectMembers} unique members`,
          source,
          index,
        );
      }
      skipWhitespace();
      if (text[index] !== ':') failAt('Malformed JSON object');
      index += 1;
      countToken();
      parseValue(depth);
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        countToken();
        return;
      }
      if (text[index] !== ',') failAt('Malformed JSON object');
      index += 1;
      countToken();
      skipWhitespace();
      if (text[index] === '}') failAt('Trailing comma in JSON object');
    }
    failAt('Unterminated JSON object');
  }

  function parseValue(parentDepth = 0) {
    skipWhitespace();
    if (index >= text.length) failAt('Missing JSON value');
    if (text[index] === '{') return parseObject(parentDepth + 1);
    if (text[index] === '[') return parseArray(parentDepth + 1);
    if (text[index] === '"') {
      parseString();
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        countToken();
        return;
      }
    }
    numberToken.lastIndex = index;
    const number = numberToken.exec(text);
    if (!number) failAt('Malformed JSON value');
    index = numberToken.lastIndex;
    if (limits.validateNumbers) assertProtocolNumber(number[0], source, number.index);
    countToken();
  }

  parseValue();
  skipWhitespace();
  if (index !== text.length) failAt('Trailing JSON input');
  return tokenCount;
}

export function assertNoDuplicateObjectKeys(text, source = 'JSON source') {
  return scanJsonText(text, source, {
    maximumNesting: TOOLING_MAX_JSON_NESTING,
    maximumStringUtf8Bytes: Number.MAX_SAFE_INTEGER,
    maximumArrayEntries: Number.MAX_SAFE_INTEGER,
    maximumObjectMembers: Number.MAX_SAFE_INTEGER,
    maximumTokens: Number.MAX_SAFE_INTEGER,
    validateNumbers: false,
    validateStrings: false,
  });
}

export function validateProtocolJsonBytes(
  bytes,
  { maximumBytes, source = 'protocol JSON input' } = {},
) {
  if (maximumBytes === undefined) fail(`${source} requires a caller-supplied byte ceiling`);
  const text = decodeStrictUtf8(bytes, source, maximumBytes);
  const tokenCount = scanJsonText(text, source, {
    ...PROTOCOL_JSON_LIMITS,
    validateNumbers: true,
    validateStrings: true,
  });
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    fail(`[JSON_SYNTAX] Malformed JSON in ${source}: ${errorMessage(error)}`, { cause: error });
  }
  return { text, value, tokenCount };
}

export function parseJsonSource(text, source = 'JSON source') {
  assertNoDuplicateObjectKeys(text, source);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Malformed JSON in ${source}: ${errorMessage(error)}`, { cause: error });
  }
}

export function readJsonFile(absolutePath, source) {
  const bytes = readFileSync(absolutePath);
  const text = decodeStrictUtf8(bytes, source);
  if (/[ \t]+$/mu.test(text)) fail(`Trailing whitespace is prohibited: ${source}`);
  return { text, value: parseJsonSource(text, source) };
}
