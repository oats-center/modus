export default async function() {
  const global_index = await import('../dist/index.js');
  console.log('global index imported');
  for (const dir of Object.keys(global_index.all)) {
    await import(`../dist/${dir}/index.js`);
    console.log('local index imported from', dir);
    for (const f of global_index.all[dir]) {
      const thisone = await import(`../dist/${dir}/${f}`);
      console.log('imported example ',f,' from ', dir);
      if (typeof thisone === 'string' && thisone.length < 1) {
        throw new Error('imported string is of zero length');
      }
    }
  }
}
