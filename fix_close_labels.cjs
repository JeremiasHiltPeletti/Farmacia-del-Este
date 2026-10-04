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
  let content = fs.readFileSync(f, 'utf8');
  
  let lines = content.split('\n');
  let openDivLabelsCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
     let line = lines[i];
     
     // Detect if this line has a `<div` that was originally a `<label`
     // E.g. in our previous script we replaced `<label className="... text-gray-500 ..."` with `<div className="... text-gray-500 ..."`
     
     // But a generic way: parse backwards or just check if it compiles.
  }
  
});
