import debug from 'debug';
import { execaCommand } from 'execa';
import fs from 'fs/promises';
import chalk from 'chalk';

const { green, red } = chalk;
const info = debug('@modusjs/cli#test:info');
const test = (msg: string) => info(green(msg));

async function passthru(command: string) {
  info('Running command: ', command);
  const ps = execaCommand(command);
  if (ps.stdout) ps.stdout.pipe(process.stdout);
  if (ps.stderr) ps.stderr.pipe(process.stderr);
  return ps; // Promise<string>
}

export default async function run() {
  info('copying assets from examples');
  await fs.cp(
    '../examples/examples/enyart-east50-a_l_labs/hand-modus.xml',
    './test-work/hand-modus.xml'
  );
  await fs.cp(
    '../examples/examples/enyart-east50-a_l_labs/hand-modus.json',
    './test-work/expected-hand-modus.json'
  );
  await fs.cp(
    '../examples/examples/tomkat-historic/tomkat_source_data.xlsx',
    './test-work/tomkat.xlsx'
  );

  test('tojson hand-modus.xml');
  await passthru('yarn tojson ./test-work/hand-modus.xml');

  test(
    'tojson result test-work/hand-modus.json matched expected-hand-modus.json'
  );
  const result = JSON.parse(
    (await fs.readFile('./test-work/hand-modus.json')).toString()
  );
  const expected = JSON.parse(
    (await fs.readFile('./test-work/expected-hand-modus.json')).toString()
  );
  const diff = deepdiff(result, expected);
  if (diff.length > 0) {
    throw new Error(
      `Hand-created json (a) and parsed result for sample1 (b) are different and they should be the same. Differences are: ${JSON.stringify(
        diff,
        null,
        '  '
      )}`
    );
  }

  test('tojson -f tomkat ./test-work/tomkat.xlsx');
  await passthru('yarn tojson -f tomkat ./test-work/tomkat.xlsx');
}

function deepdiff(
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
