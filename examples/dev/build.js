import fs from 'fs/promises';

// Build a set of typescript files to then compile into JS:

(async () => {
  const example_dirs = await fs.readdir('./examples');
  if (!example_dirs || !example_dirs.length || example_dirs.length < 1) {
    console.log('ERROR: there are no examples in ./examples, readdir returned ', example_dirs);
    throw new Error('ERROR: there are no examples in ./examples');
  }
  
  // Grab all the files from ./examples
  // Maintain a global index.ts 
  let global_index = '';
  let global_all = {};

  for (const dir of example_dirs) {
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
      if (!input_filepath.match(/\.(xml|json)$/)) {
        continue; // skip non-xml and non-json files
      }
      // turn ./build/dir/hand-modus.xml into ./build/dir/hand-modus_xml.js
      const output_filename = f.replace(/\.(xml|json)$/, '_$1.ts');
      const output_filepath = `${output_path}/${output_filename}`;
      // The export will have name like hand_modus_xml from hand-modus.xml
      const output_varname = output_filename.replace(/\.ts$/,'').replaceAll('-','_');

      let str = (await fs.readFile(input_filepath)).toString();
      // If it's an XML file, wrap the string we read in backticks so we can preserve the original structure (and escape any backticks)
      if (f.match(/\.(xml)/)) {
        str = '`'+str.replaceAll('`','\\`')+'`';
      }

      // Create equivalent path in the build/ folder
      await fs.mkdir(output_path, { recursive: true } );
      await fs.writeFile(output_filepath, `export default ${str};`);
      console.log(`Converted example at ${input_filepath} to default export at ${output_filepath}`);

      const output_js_filename = output_filename.replace(/\.ts$/,'.js');
      local_index += `export { default as ${output_varname} } from './${output_js_filename}';\n`;
      local_all.push(output_js_filename);
    }
    local_index += `export const all = ${JSON.stringify(local_all)};\n`;
    global_all[dir] = local_all;

    // Write the local index file:
    await fs.writeFile(`${output_path}/index.ts`, local_index);
    
    // Add this local index file to the global index
    const global_varname = dir.replaceAll('-','_');
    global_index += `export * as ${global_varname} from './${dir}/index.js';\n`;
  }
  // Add the accumulated "all" object to the global index file
  global_index += `export const all = ${JSON.stringify(global_all, null, '  ')};\n`
  await fs.writeFile('./build/index.ts', global_index);
})();
