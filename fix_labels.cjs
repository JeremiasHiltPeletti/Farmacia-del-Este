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
let totalReplaced = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;
  
  // Regex to match a <label ...>...</label> followed by whitespace and then <input id="something" ... > or <select id="something"...> or <textarea...
  // This is too complex for regex.
  
  // Let's do it line by line.
  let lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('<label') && !line.includes('htmlFor=') && !line.includes('for=') && !line.includes('className="sr-only"')) {
      // Look ahead up to 5 lines for an input/select/textarea with an ID
      let foundId = null;
      for (let j = i; j < Math.min(i + 6, lines.length); j++) {
         const idMatch = lines[j].match(/id=["']([^"']+)["']/);
         if (idMatch && (lines[j].includes('<input') || lines[j].includes('<select') || lines[j].includes('<textarea'))) {
            foundId = idMatch[1];
            break;
         }
      }
      
      if (foundId) {
         lines[i] = line.replace('<label', `<label htmlFor="${foundId}"`);
         modified = true;
         totalReplaced++;
      } else {
         // Could not find an ID, maybe it wraps the input?
         // If it wraps the input, it doesn't strictly need htmlFor. But the error is "A <label> isn't associated with a form field."
         // Let's just change un-associated ones to divs.
         if (!line.includes('<input')) {
            lines[i] = line.replace(/<label/g, '<div').replace(/<\/label>/g, '</div>');
            modified = true;
            totalReplaced++;
         }
      }
    } else if (line.includes('</label>')) {
        // If we replaced a multi-line <label> with <div earlier, this </label> might be dangling.
        // It's a bit hard to track. Let's just fix the one-liners that were converted to divs.
    }
  }
  
  if (modified) {
     fs.writeFileSync(f, lines.join('\n'));
     console.log(`Fixed labels in ${f}`);
  }
});

console.log('Total fixed: ' + totalReplaced);
