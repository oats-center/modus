import fs from 'fs/promises';

// Build a set of typescript files to then compile into JS:

(async () => {
  const example_dirs = await fs.readdir('./examples');
  if (!example_dirs || !example_dirs.length || example_dirs.length < 1) {
    console.log(
      'ERROR: there are no examples in ./examples, readdir returned ',
      example_dirs
    );
    throw new Error('ERROR: there are no examples in ./examples');
  }

  // Grab all the files from ./examples
  // Maintain a global index.ts
  let global_index = '';
  let global_all = {};

  for (const labdir of example_dirs) {
    const labdirstat = await fs.stat('./examples/'+labdir);
    if (!labdirstat.isDirectory()) continue;
    const typedirs = await fs.readdir(`./examples/${labdir}`);
    const lab_path = `./build/${labdir}`;
    let lab_index = '';
    let lab_all = {};
    for (const typedir of typedirs) {
      const dir = `${labdir}/${typedir}`;
      const input_path = `./examples/${dir}`;
      const output_path = `./build/${dir}`;
      const stat = await fs.stat(input_path);
      if (!stat.isDirectory()) continue; // skip regular files at this level
      const files = await fs.readdir(input_path);

      // For each directory, output a javascript file that exports the files' contents as default
      let local_index = '';
      let local_all = [];
      for (const f of files) {
        const input_filepath = `${input_path}/${f}`;
        if (!input_filepath.match(/\.(xml|json|csv|xlsx)$/)) {
          continue; // skip non-xml and non-json files
        }
        if (input_filepath.match(/^~.*\.xlsx/)) {
          // excel swap file
          continue;
        }
        // turn ./build/dir/hand-modus.xml into ./build/dir/hand-modus_xml.js
        const output_filename = f.replace(/\.(xml|json|csv|xlsx)$/, '_$1.ts');
        const output_filepath = `${output_path}/${output_filename}`;
        // The export will have name like hand_modus_xml from hand-modus.xml
        const output_varname = output_filename
          .replace(/\.ts$/, '')
          .replaceAll('-', '_');

        const isxml = !!f.match(/\.xml/);
        const iscsv = !!f.match(/\.csv/);
        const isjson = !!f.match(/\.json/);
        const isxlsx = !!f.match(/\.xlsx/);
        let finalcontents = '';
        // XML, CSV, JSON files become regular strings:
        if (isxml || iscsv || isjson) {
          let str = (await fs.readFile(input_filepath)).toString();
          // If it's an XML or CSV file, wrap the string we read in backticks so we can preserve the original structure (and escape any backticks)
          if (isxml || iscsv) {
            str = '`' + str.replaceAll('`', '\\`') + '`';
          }
          finalcontents = `export default ${str}`;

          // XLSX files become base64 encoded strings:
        } else if (isxlsx) {
          const str = (await fs.readFile(input_filepath)).toString('base64');
          finalcontents = `export default "${str}"`;
        }

        // Create equivalent path in the build/ folder
        await fs.mkdir(output_path, { recursive: true });
        await fs.writeFile(output_filepath, finalcontents);
        console.log(
          `Converted example at ${input_filepath} to default export at ${output_filepath}`
        );

        const output_js_filename = output_filename
          .replace(/\.ts$/, '.js')
        local_index += `export { default as ${output_varname} } from './${output_js_filename}';\n`;
        const cleanpath = input_filepath.replace('./examples/','');
        local_all.push({
          js: output_js_filename.replaceAll('-', '_'),
          // dynamic imports must have a file extension in the static parts of the import, so get rid of it here
          importpath: `${dir}/${output_js_filename.replace(/\.js$/, '')}`,
          path: dir,
          filename: f,
          isxml,
          iscsv,
          isjson,
          isxlsx
        });
      }
      local_index += `export const all = ${JSON.stringify(local_all)};\n`;
      lab_all[typedir] = local_all;
      global_all[labdir] = global_all[labdir] || {};
      global_all[labdir][typedir] = local_all;

      // Write the local index file:
      await fs.mkdir(output_path, { recursive: true }); // if the directory is empty, the mkdir never ran
      await fs.writeFile(`${output_path}/index.ts`, local_index);

      // Add this local index file to the global index
      const lab_varname = typedir.replaceAll('-', '_');
      lab_index += `export * as ${lab_varname} from './${typedir}/index.js';\n`;
    }

    lab_index += `export const all = ${JSON.stringify(lab_all)};\n`;
    // Write the local index file:
    await fs.writeFile(`${lab_path}/index.ts`, lab_index);

    // Add this local index file to the global index
    const global_varname = labdir.replaceAll('-', '_');
    global_index += `export * as ${global_varname} from './${labdir}/index.js';\n`;
  }
  // Add the accumulated "all" object to the global index file
  global_index += `export const all = ${JSON.stringify(
    global_all,
    null,
    '  '
  )};\n`;
  await fs.writeFile('./build/index.ts', global_index);
})();
