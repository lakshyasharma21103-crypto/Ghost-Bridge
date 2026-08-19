import { readFileSync } from "node:fs";

import { errorMessage, fail } from "./errors.mjs";

const JSON_WHITESPACE = /[\u0009\u000a\u000d\u0020]/u;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_JSON_NESTING = 256;

export function decodeStrictUtf8(bytes, source = "JSON source") {
  if (!(bytes instanceof Uint8Array)) fail(`${source} was not supplied as bytes`);
  if (bytes.byteLength > MAX_JSON_BYTES) fail(`${source} exceeds the ${MAX_JSON_BYTES}-byte tooling limit`);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`UTF-8 BOM is prohibited: ${source}`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    fail(`Strict UTF-8 decoding failed for ${source}: ${errorMessage(error)}`, { cause: error });
  }
}

export function assertNoDuplicateObjectKeys(text, source = "JSON source") {
  if (typeof text !== "string") fail(`${source} was not supplied as text`);
  let index = 0;
  const numberToken = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/uy;

  function failAt(message) {
    fail(`${message} in ${source} at code-unit offset ${index}`);
  }

  function skipWhitespace() {
    while (index < text.length && JSON_WHITESPACE.test(text[index])) index += 1;
  }

  function parseString() {
    const start = index;
    if (text[index] !== '"') failAt("Expected JSON string");
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(text.slice(start, index));
        } catch (error) {
          fail(`Malformed JSON string in ${source}: ${errorMessage(error)}`, { cause: error });
        }
      }
      if (character.charCodeAt(0) < 0x20) failAt("Unescaped control character in JSON string");
      if (character !== "\\") {
        index += 1;
        continue;
      }

      index += 1;
      if (index >= text.length) failAt("Unterminated JSON escape");
      const escape = text[index];
      if ('"\\/bfnrt'.includes(escape)) {
        index += 1;
        continue;
      }
      if (escape !== "u") failAt(`Invalid JSON escape \\${escape}`);
      const digits = text.slice(index + 1, index + 5);
      if (digits.length !== 4 || !/^[0-9A-Fa-f]{4}$/u.test(digits)) failAt("Invalid JSON Unicode escape");
      index += 5;
    }
    failAt("Unterminated JSON string");
  }

  function parseArray(depth) {
    if (depth > MAX_JSON_NESTING) failAt(`JSON nesting exceeds ${MAX_JSON_NESTING}`);
    index += 1;
    skipWhitespace();
    if (text[index] === "]") {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue(depth);
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

  function parseObject(depth) {
    if (depth > MAX_JSON_NESTING) failAt(`JSON nesting exceeds ${MAX_JSON_NESTING}`);
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (text[index] === "}") {
      index += 1;
      return;
    }
    while (index < text.length) {
      const key = parseString();
      if (keys.has(key)) fail(`Duplicate raw JSON member ${JSON.stringify(key)} in ${source}`);
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ":") failAt("Malformed JSON object");
      index += 1;
      parseValue(depth);
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

  function parseValue(parentDepth = 0) {
    skipWhitespace();
    if (index >= text.length) failAt("Missing JSON value");
    if (text[index] === "{") return parseObject(parentDepth + 1);
    if (text[index] === "[") return parseArray(parentDepth + 1);
    if (text[index] === '"') {
      parseString();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    numberToken.lastIndex = index;
    const number = numberToken.exec(text);
    if (!number) failAt("Malformed JSON value");
    index = numberToken.lastIndex;
  }

  parseValue();
  skipWhitespace();
  if (index !== text.length) failAt("Trailing JSON input");
}

export function parseJsonSource(text, source = "JSON source") {
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
