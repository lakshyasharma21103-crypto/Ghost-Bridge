export const PROTOCOL_RELEASE_MAXIMUM_COMPONENT = 2_147_483_647;
export const PROTOCOL_RELEASE_MAXIMUM_LENGTH = 59;

export const PROTOCOL_RELEASE_STAGE_RANK = Object.freeze({
  experimental: 0,
  draft: 1,
  alpha: 2,
  beta: 3,
  rc: 4,
  final: 5,
});

export const PROTOCOL_RELEASE_ORDER_RESULTS = Object.freeze(['LESS', 'EQUAL', 'GREATER']);

const PROTOCOL_RELEASE_PATTERN =
  /^ghostbridge\/e(0|[1-9][0-9]{0,9})\.r(0|[1-9][0-9]{0,9})(?:-(experimental|draft|alpha|beta|rc)\.(0|[1-9][0-9]{0,9}))?(?![\s\S])/u;

export class ProtocolReleaseValidationError extends TypeError {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = 'ProtocolReleaseValidationError';
    this.code = code;
  }
}

function reject(code, message) {
  throw new ProtocolReleaseValidationError(code, message);
}

function parseBoundedDecimal(component, componentName) {
  let value = 0;
  for (let index = 0; index < component.length; index += 1) {
    const digit = component.charCodeAt(index) - 0x30;
    if (digit < 0 || digit > 9) {
      reject('FND-PROTOCOL-RELEASE-LEXICAL', `${componentName} contains a non-ASCII decimal digit`);
    }
    if (value > Math.floor((PROTOCOL_RELEASE_MAXIMUM_COMPONENT - digit) / 10)) {
      reject(
        'FND-PROTOCOL-RELEASE-RANGE',
        `${componentName} exceeds ${PROTOCOL_RELEASE_MAXIMUM_COMPONENT}`,
      );
    }
    value = value * 10 + digit;
  }
  return value;
}

export function parseProtocolRelease(value) {
  if (typeof value !== 'string') {
    reject('FND-PROTOCOL-RELEASE-TYPE', 'ProtocolRelease must be a string');
  }
  if (value.length > PROTOCOL_RELEASE_MAXIMUM_LENGTH) {
    reject(
      'FND-PROTOCOL-RELEASE-LENGTH',
      `ProtocolRelease exceeds ${PROTOCOL_RELEASE_MAXIMUM_LENGTH} characters`,
    );
  }

  const match = PROTOCOL_RELEASE_PATTERN.exec(value);
  if (match === null) {
    reject('FND-PROTOCOL-RELEASE-LEXICAL', 'ProtocolRelease is not canonical');
  }

  const epoch = parseBoundedDecimal(match[1], 'epoch');
  const revision = parseBoundedDecimal(match[2], 'revision');
  const stage = match[3] ?? 'final';
  const iteration = match[4] === undefined ? null : parseBoundedDecimal(match[4], 'iteration');

  return Object.freeze({
    value,
    epoch,
    revision,
    stage,
    stageRank: PROTOCOL_RELEASE_STAGE_RANK[stage],
    iteration,
  });
}

export function isProtocolRelease(value) {
  try {
    parseProtocolRelease(value);
    return true;
  } catch (error) {
    if (error instanceof ProtocolReleaseValidationError) return false;
    throw error;
  }
}

export function protocolReleasesEqual(left, right) {
  parseProtocolRelease(left);
  parseProtocolRelease(right);
  return left === right;
}

function compareIntegers(left, right) {
  if (left < right) return 'LESS';
  if (left > right) return 'GREATER';
  return 'EQUAL';
}

export function compareProtocolReleases(left, right) {
  const parsedLeft = parseProtocolRelease(left);
  const parsedRight = parseProtocolRelease(right);

  for (const [leftComponent, rightComponent] of [
    [parsedLeft.epoch, parsedRight.epoch],
    [parsedLeft.revision, parsedRight.revision],
    [parsedLeft.stageRank, parsedRight.stageRank],
  ]) {
    const result = compareIntegers(leftComponent, rightComponent);
    if (result !== 'EQUAL') return result;
  }

  if (parsedLeft.stage !== 'final') {
    return compareIntegers(parsedLeft.iteration, parsedRight.iteration);
  }
  return 'EQUAL';
}
