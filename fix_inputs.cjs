const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let f = dir + '/' + file;
    const stat = fs.statSync(f);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(f));
    } else if (f.endsWith('.tsx')) {
      results.push(f);
    }
  });
  return results;
}

const files = walk('./components').concat(walk('./pages'));
let totalReplaced = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let counter = 0;
  
  // Also we want to ensure we don't mess up things. But React is fine with static random IDs as long as they don't change on render.
  // Oh wait! If we write random strings into the source file, they become constant strings in the source! That's perfectly fine!
  
  content = content.replace(/<input\b(?![^>]*\bid=)(?![^>]*\bname=)/g, (match) => {
    counter++;
    const r = Math.random().toString(36).substr(2, 6);
    return `<input id="field-${r}" name="field-${r}"`;
  });
  
  if (counter > 0) {
     fs.writeFileSync(f, content);
     totalReplaced += counter;
     console.log(`Replaced ${counter} inputs in ${f}`);
  }
});
console.log(`Total replaced: ${totalReplaced}`);
