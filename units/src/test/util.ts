export function deepdiff(
  a: any,
  b: any,
  path?: string,
  differences?: string[]
): string[] {
  if (!differences) differences = [];
  path = path || '';

  // Same type:
  if (typeof a !== typeof b) {
    differences.push(
      `a is a ${typeof a} but b is a ${typeof b} at path ${path}`
    );
    return differences;
  }

  // they are the same at this point if they are not an object
  if (typeof a !== 'object') {
    return differences;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    differences.push(
      `isArray(a) is ${Array.isArray(a)}, but isArray(b) is ${Array.isArray(
        b
      )} at path ${path}`
    );
    return differences;
  }

  // They both have keys/values, so compare them
  for (const [key, value] of Object.entries(a)) {
    differences = deepdiff(value, b[key], `${path}/${key}`, differences);
  }

  return differences;
}
