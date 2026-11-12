import { readFileSync } from 'node:fs';
const src=readFileSync(new URL('./app-script.js', import.meta.url),'utf8');
new Function(src);
console.log('Syntax OK');
