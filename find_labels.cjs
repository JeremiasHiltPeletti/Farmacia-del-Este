const fs = require('fs');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let f = dir + '/' + file;
    const stat = fs.statSync(f);
    if (stat && stat.isDirectory()) results = results.concat(walk(f));
    else if (f.endsWith('.tsx')) results.push(f);
  });
  return results;
}
const files = walk('./components').concat(walk('./pages'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('<label') && !line.includes('htmlFor=') && !line.includes('for=') && !line.includes('className="sr-only"')) {
      console.log(`${f}:${i+1} : ${line.trim()}`);
    }
  });
});
