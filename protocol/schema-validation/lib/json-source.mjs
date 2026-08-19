import { readFileSync } from "node:fs";

import { errorMessage, fail } from "./errors.mjs";

const JSON_WHITESPACE = /[\u0009\u000a\u000d\u0020]/u;
const MAX_TOOLING_JSON_BYTES = 16 * 1024 * 1024;
const MAX_TOOLING_JSON_NESTING = 256;
const MAX_SAFE_INTEGER_TEXT = "9007199254740991";
const SIMPLE_JSON_ESCAPES = Object.freeze({ '"': 0x22, "\\": 0x5c, "/": 0x2f, b: 0x08, f: 0x0c, n: 0x0a, r: 0x0d, t: 0x09 });

export const WIRE_JSON_LIMITS = Object.freeze({
  bodyBytes: Object.freeze({
    request: 256 * 1024,
    response: 1024 * 1024,
    "error-response": 16 * 1024,
  }),
  nesting: 16,
  stringBytes: 64 * 1024,
  arrayEntries: 256,
  objectMembers: 256,
  tokens: 16_384,
});

function assertByteLimit(maximumBytes, source) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    fail(`Invalid byte limit for ${source}`);
  }
}

export function decodeStrictUtf8(bytes, source = "JSON source", maximumBytes = MAX_TOOLING_JSON_BYTES) {
  if (!(bytes instanceof Uint8Array)) fail(`${source} was not supplied as bytes`);
  assertByteLimit(maximumBytes, source);
  if (bytes.byteLength > maximumBytes) fail(`${source} exceeds the ${maximumBytes}-byte limit`);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`UTF-8 BOM is prohibited: ${source}`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail(`Strict UTF-8 decoding failed for ${source}: ${errorMessage(error)}`, { cause: error });
  }
}

function normalizedIntegerMagnitude(digits, decimalScale) {
  if (/^0+$/u.test(digits)) return "0";
  let magnitude;
  if (decimalScale >= 0) {
    if (decimalScale > MAX_SAFE_INTEGER_TEXT.length) return `${MAX_SAFE_INTEGER_TEXT}0`;
    magnitude = `${digits}${"0".repeat(decimalScale)}`;
  } else {
    const fractionalDigits = -decimalScale;
    if (fractionalDigits > digits.length) return /^0+$/u.test(digits) ? "0" : undefined;
    const tail = digits.slice(digits.length - fractionalDigits);
    if (!/^0*$/u.test(tail)) return undefined;
    magnitude = digits.slice(0, digits.length - fractionalDigits);
  }
  magnitude = magnitude.replace(/^0+(?=[0-9])/u, "");
  return magnitude === "" ? "0" : magnitude;
}

export function inspectJsonNumberToken(token, source = "JSON source") {
  const match = token.match(/^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/u);
  if (!match) fail(`Malformed JSON number in ${source}`);
  const negative = match[1] === "-";
  const fraction = match[3] ?? "";
  const digits = `${match[2]}${fraction}`;
  const mathematicalZero = /^0+$/u.test(digits);
  const exponent = Number(match[4] ?? "0");
  if (!Number.isSafeInteger(exponent)) fail(`JSON number exponent is outside the bounded source-token range in ${source}`);
  const decimalScale = exponent - fraction.length;
  const integerMagnitude = normalizedIntegerMagnitude(digits, decimalScale);
  const mathematicalInteger = integerMagnitude !== undefined;
  const numericValue = Number(token);

  if (negative && mathematicalZero) fail(`Negative zero JSON number is prohibited in ${source}`);
  if (!Number.isFinite(numericValue)) fail(`JSON number is outside finite binary64 in ${source}`);
  if (!mathematicalZero && numericValue === 0) fail(`JSON number underflows finite binary64 in ${source}`);
  if (Object.is(numericValue, -0)) fail(`Negative zero JSON number is prohibited in ${source}`);
  if (
    mathematicalInteger &&
    (integerMagnitude.length > MAX_SAFE_INTEGER_TEXT.length ||
      (integerMagnitude.length === MAX_SAFE_INTEGER_TEXT.length && integerMagnitude > MAX_SAFE_INTEGER_TEXT))
  ) {
    fail(`Integer JSON number is outside the safe exact range in ${source}`);
  }
  return Object.freeze({ token, mathematicalInteger });
}

function inspectJsonText(text, source, options) {
  if (typeof text !== "string") fail(`${source} was not supplied as text`);
  const {
    maximumNesting,
    maximumStringBytes,
    maximumArrayEntries,
    maximumObjectMembers,
    maximumTokens,
    validateNumberTokens,
  } = options;
  let index = 0;
  let tokenCount = 0;
  const numberTokens = [];
  const numberToken = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/uy;

  function failAt(message) {
    fail(`${message} in ${source} at code-unit offset ${index}`);
  }

  function countToken() {
    tokenCount += 1;
    if (tokenCount > maximumTokens) failAt(`JSON token count exceeds ${maximumTokens}`);
  }

  function skipWhitespace() {
    while (index < text.length && JSON_WHITESPACE.test(text[index])) index += 1;
  }

  function parseString(retainValue = false) {
    if (text[index] !== '"') failAt("Expected JSON string");
    index += 1;
    let decoded = "";
    let decodedBytes = 0;

    function appendScalar(codePoint) {
      if ((codePoint >= 0xfdd0 && codePoint <= 0xfdef) || (codePoint & 0xffff) === 0xfffe || (codePoint & 0xffff) === 0xffff) {
        failAt("Unicode noncharacter in JSON string");
      }
      const scalarBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
      decodedBytes += scalarBytes;
      if (decodedBytes > maximumStringBytes) failAt(`JSON string exceeds ${maximumStringBytes} UTF-8 bytes`);
      if (retainValue) decoded += String.fromCodePoint(codePoint);
    }

    function parseUnicodeEscape() {
      const digits = text.slice(index + 1, index + 5);
      if (digits.length !== 4 || !/^[0-9A-Fa-f]{4}$/u.test(digits)) failAt("Invalid JSON Unicode escape");
      const codeUnit = Number.parseInt(digits, 16);
      index += 5;
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        if (text[index] !== "\\" || text[index + 1] !== "u") failAt("Unpaired high surrogate in JSON string");
        const lowDigits = text.slice(index + 2, index + 6);
        if (lowDigits.length !== 4 || !/^[0-9A-Fa-f]{4}$/u.test(lowDigits)) failAt("Invalid JSON Unicode escape");
        const low = Number.parseInt(lowDigits, 16);
        if (low < 0xdc00 || low > 0xdfff) failAt("Unpaired high surrogate in JSON string");
        index += 6;
        return 0x10000 + (codeUnit - 0xd800) * 0x400 + (low - 0xdc00);
      }
      if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) failAt("Unpaired low surrogate in JSON string");
      return codeUnit;
    }

    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        countToken();
        return decoded;
      }
      const codeUnit = character.charCodeAt(0);
      if (codeUnit < 0x20) failAt("Unescaped control character in JSON string");
      if (character !== "\\") {
        if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
          const low = text.charCodeAt(index + 1);
          if (low < 0xdc00 || low > 0xdfff) failAt("Unpaired high surrogate in JSON string");
          appendScalar(0x10000 + (codeUnit - 0xd800) * 0x400 + (low - 0xdc00));
          index += 2;
          continue;
        }
        if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) failAt("Unpaired low surrogate in JSON string");
        appendScalar(codeUnit);
        index += 1;
        continue;
      }

      index += 1;
      if (index >= text.length) failAt("Unterminated JSON escape");
      const escape = text[index];
      if ('"\\/bfnrt'.includes(escape)) {
        appendScalar(SIMPLE_JSON_ESCAPES[escape]);
        index += 1;
        continue;
      }
      if (escape !== "u") failAt(`Invalid JSON escape \\${escape}`);
      appendScalar(parseUnicodeEscape());
    }
    failAt("Unterminated JSON string");
  }

  function parseArray(depth, path) {
    if (depth > maximumNesting) failAt(`JSON nesting exceeds ${maximumNesting}`);
    countToken();
    index += 1;
    let entries = 0;
    skipWhitespace();
    if (text[index] === "]") {
      index += 1;
      return;
    }
    while (index < text.length) {
      if (entries >= maximumArrayEntries) failAt(`JSON array entries exceed ${maximumArrayEntries}`);
      parseValue(depth, [...path, entries]);
      entries += 1;
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      if (text[index] !== ",") failAt("Malformed JSON array");
      index += 1;
      skipWhitespace();
      if (text[index] === "]") failAt("Trailing comma in JSON array");
    }
    failAt("Unterminated JSON array");
  }

  function parseObject(depth, path) {
    if (depth > maximumNesting) failAt(`JSON nesting exceeds ${maximumNesting}`);
    countToken();
    index += 1;
    let members = 0;
    const keys = new Set();
    skipWhitespace();
    if (text[index] === "}") {
      index += 1;
      return;
    }
    while (index < text.length) {
      if (members >= maximumObjectMembers) failAt(`JSON object members exceed ${maximumObjectMembers}`);
      const key = parseString(true);
      if (keys.has(key)) fail(`Duplicate raw JSON member in ${source} at code-unit offset ${index}`);
      keys.add(key);
      members += 1;
      skipWhitespace();
      if (text[index] !== ":") failAt("Malformed JSON object");
      index += 1;
      parseValue(depth, [...path, key]);
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      if (text[index] !== ",") failAt("Malformed JSON object");
      index += 1;
      skipWhitespace();
      if (text[index] === "}") failAt("Trailing comma in JSON object");
    }
    failAt("Unterminated JSON object");
  }

  function parseValue(parentDepth = 0, path = []) {
    skipWhitespace();
    if (index >= text.length) failAt("Missing JSON value");
    if (text[index] === "{") return parseObject(parentDepth + 1, path);
    if (text[index] === "[") return parseArray(parentDepth + 1, path);
    if (text[index] === '"') {
      parseString();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        countToken();
        return;
      }
    }
    numberToken.lastIndex = index;
    const number = numberToken.exec(text);
    if (!number) failAt("Malformed JSON value");
    index = numberToken.lastIndex;
    const next = text[index];
    if (next !== undefined && !JSON_WHITESPACE.test(next) && !",]}".includes(next)) {
      failAt("Malformed JSON number");
    }
    countToken();
    if (validateNumberTokens) {
      const inspected = inspectJsonNumberToken(number[0], source);
      numberTokens.push(Object.freeze({ path: Object.freeze(path), ...inspected }));
    }
  }

  parseValue();
  skipWhitespace();
  if (index !== text.length) failAt("Trailing JSON input");
  return Object.freeze({ numberTokens: Object.freeze(numberTokens), tokenCount });
}

const TOOLING_INSPECTION = Object.freeze({
  maximumNesting: MAX_TOOLING_JSON_NESTING,
  maximumStringBytes: Number.POSITIVE_INFINITY,
  maximumArrayEntries: Number.POSITIVE_INFINITY,
  maximumObjectMembers: Number.POSITIVE_INFINITY,
  maximumTokens: Number.POSITIVE_INFINITY,
  validateNumberTokens: false,
});

const WIRE_INSPECTION = Object.freeze({
  maximumNesting: WIRE_JSON_LIMITS.nesting,
  maximumStringBytes: WIRE_JSON_LIMITS.stringBytes,
  maximumArrayEntries: WIRE_JSON_LIMITS.arrayEntries,
  maximumObjectMembers: WIRE_JSON_LIMITS.objectMembers,
  maximumTokens: WIRE_JSON_LIMITS.tokens,
  validateNumberTokens: true,
});

export function assertNoDuplicateObjectKeys(text, source = "JSON source") {
  inspectJsonText(text, source, TOOLING_INSPECTION);
}

export function parseJsonSource(text, source = "JSON source") {
  inspectJsonText(text, source, TOOLING_INSPECTION);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Malformed JSON in ${source}: ${errorMessage(error)}`, { cause: error });
  }
}

function maximumWireBytes(wireClass, source) {
  const maximumBytes = WIRE_JSON_LIMITS.bodyBytes[wireClass];
  if (maximumBytes === undefined) fail(`Unknown wire JSON class for ${source}`);
  return maximumBytes;
}

export function parseWireJsonBytes(bytes, { wireClass, source = "wire JSON" } = {}) {
  const maximumBytes = maximumWireBytes(wireClass, source);
  const text = decodeStrictUtf8(bytes, source, maximumBytes);
  const inspection = inspectJsonText(text, source, WIRE_INSPECTION);
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    fail(`Malformed JSON in ${source}: ${errorMessage(error)}`, { cause: error });
  }
  return Object.freeze({
    value,
    numberTokens: inspection.numberTokens,
    stats: Object.freeze({ bytes: bytes.byteLength, tokens: inspection.tokenCount }),
  });
}

export function createWireJsonByteCollector({ wireClass, source = "wire JSON" } = {}) {
  const maximumBytes = maximumWireBytes(wireClass, source);
  let storage = Buffer.allocUnsafe(maximumBytes);
  let byteLength = 0;
  let finished = false;
  return Object.freeze({
    append(chunk) {
      if (finished) fail(`Wire JSON collector is already finished: ${source}`);
      if (!(chunk instanceof Uint8Array)) fail(`Wire JSON chunk was not supplied as bytes: ${source}`);
      if (byteLength + chunk.byteLength > maximumBytes) fail(`${source} exceeds the ${maximumBytes}-byte limit`);
      storage.set(chunk, byteLength);
      byteLength += chunk.byteLength;
    },
    finish() {
      if (finished) fail(`Wire JSON collector is already finished: ${source}`);
      finished = true;
      const bytes = storage.subarray(0, byteLength);
      storage = undefined;
      return parseWireJsonBytes(bytes, { wireClass, source });
    },
  });
}

export function readJsonFile(absolutePath, source) {
  const bytes = readFileSync(absolutePath);
  const text = decodeStrictUtf8(bytes, source);
  if (/[ \t]+$/mu.test(text)) fail(`Trailing whitespace is prohibited: ${source}`);
  return { text, value: parseJsonSource(text, source) };
}
