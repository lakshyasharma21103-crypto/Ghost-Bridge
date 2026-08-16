import { lstatSync } from "node:fs";
import path from "node:path";

import { fail } from "./errors.mjs";

const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const WINDOWS_DRIVE = /^[A-Za-z]:/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;

export function canonicalPosixRelativePathViolation(candidate) {
  if (typeof candidate !== "string") return "path is not a string";
  if (candidate.length === 0) return "path is empty";
  if (CONTROL_CHARACTER.test(candidate)) return "path contains a control character";
  if (candidate.startsWith("/")) return "path is absolute";
  if (candidate.endsWith("/")) return "path has a trailing slash";
  if (candidate.includes("\\")) return "path contains a backslash";
  if (candidate.includes("//")) return "path contains an empty segment";
  if (WINDOWS_DRIVE.test(candidate)) return "path uses a Windows drive form";
  if (URI_SCHEME.test(candidate)) return "path uses an absolute URI or scheme form";

  const segments = candidate.split("/");
  if (segments.includes(".")) return "path contains a dot segment";
  if (segments.includes("..")) return "path contains a dot-dot segment";
  if (segments.some((segment) => segment.length === 0)) return "path contains an empty segment";
  return undefined;
}

export function assertCanonicalPosixRelativePath(candidate, label = "path") {
  const violation = canonicalPosixRelativePathViolation(candidate);
  if (violation) fail(`${label} is not a canonical POSIX-relative path (${violation}): ${String(candidate)}`);
  return candidate;
}

export function resolveRepositoryPath(repositoryRoot, relativePath, label = "path") {
  assertCanonicalPosixRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(repositoryRoot);
  const resolvedPath = path.resolve(resolvedRoot, ...relativePath.split("/"));
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    return resolvedPath;
  }
  fail(`${label} escapes repository root: ${relativePath}`);
}

export function assertRepositoryPathComponentChain(components, terminalKind, label = "path") {
  if (!Array.isArray(components) || components.length === 0) fail(`${label} has no repository path components`);
  if (terminalKind !== "file" && terminalKind !== "directory") {
    fail(`${label} has an invalid terminal kind: ${String(terminalKind)}`);
  }
  for (const [index, component] of components.entries()) {
    const terminal = index === components.length - 1;
    if (component.kind === "symlink") {
      fail(`Symbolic-link repository path component is prohibited: ${component.path}`);
    }
    if (!terminal && component.kind !== "directory") {
      fail(`Repository path ancestor is not an ordinary directory: ${component.path}`);
    }
    if (terminal && component.kind !== terminalKind) {
      fail(`Repository path terminal is not an ordinary ${terminalKind}: ${component.path}`);
    }
  }
}

function filesystemComponentKind(stat) {
  if (stat.isSymbolicLink()) return "symlink";
  if (stat.isDirectory()) return "directory";
  if (stat.isFile()) return "file";
  return "special";
}

export function resolveRepositoryFilesystemPath(repositoryRoot, relativePath, terminalKind, label = "path") {
  const resolvedPath = resolveRepositoryPath(repositoryRoot, relativePath, label);
  const resolvedRoot = path.resolve(repositoryRoot);
  const segments = relativePath.split("/");
  let currentPath = resolvedRoot;
  const checkedComponents = [];
  for (const [index, segment] of segments.entries()) {
    currentPath = path.join(currentPath, segment);
    let stat;
    try {
      stat = lstatSync(currentPath);
    } catch (error) {
      fail(`${label} component is unavailable: ${segments.slice(0, index + 1).join("/")}`, { cause: error });
    }
    const component = {
      path: segments.slice(0, index + 1).join("/"),
      kind: filesystemComponentKind(stat),
    };
    checkedComponents.push(component);
    assertRepositoryPathComponentChain(
      checkedComponents,
      index === segments.length - 1 ? terminalKind : "directory",
      label,
    );
  }
  return resolvedPath;
}
