// Uncompressed bytes needed by one look. Thumbnails are outside the JS + CSS budget.
import { readdir, stat } from 'node:fs/promises';
import { THEMES } from '../js/theme.js';

const root = new URL('../', import.meta.url);
const bytes = async file => (await stat(new URL(file, root))).size;
const sum = values => values.reduce((total, value) => total + value, 0);
async function scripts(dir) {
  const names = await readdir(new URL(dir, root));
  return Promise.all(names.filter(name => name.endsWith('.js')).map(name => bytes(dir + name)));
}
const shared = sum([...await scripts('js/'), ...await scripts('js/views/'), await bytes('css/base.css')]);
const budget = 220_000;
console.log('Shared scripts and base CSS:', shared, 'bytes. Limit:', budget);
for (const {id} of THEMES) {
  const family = id === 'a-light' ? 'a' : id;
  const art = await bytes('js/themes/' + family + '.js');
  const css = await bytes('css/theme-' + family + '.css') + (id === 'a-light' ? await bytes('css/theme-a-light.css') : 0);
  const total = shared + art + css;
  console.log(id.padEnd(8), total, 'bytes (theme CSS', css, '+ theme JS', art + ')');
  if (total > budget) process.exitCode = 1;
}
