const { execSync } = require('child_process');
const fs = require('fs');

let success = false;
let iterations = 0;

while (!success && iterations < 20) {
    iterations++;
    try {
        console.log("Running esbuild...");
        execSync('npm run build', { stdio: 'pipe' });
        success = true;
        console.log("Build succeeded!");
    } catch (err) {
        const output = err.stdout.toString() + err.stderr.toString();
        
        let fixedSomething = false;
        const lines = output.split('\n');
        
        for (let l of lines) {
            // Updated regex to just grab the file part after /app/applet
            const match = l.match(/\/app\/applet\/([^:]+\.tsx):(\d+):(\d+): ERROR: Unexpected closing "label" tag does not match opening "(div|button)" tag/);
            if (match) {
                const file = './' + match[1];
                const lineNum = parseInt(match[2]) - 1;
                
                if (fs.existsSync(file)) {
                    let fileLines = fs.readFileSync(file, 'utf8').split('\n');
                    fileLines[lineNum] = fileLines[lineNum].replace('</label>', '</div>');
                    fs.writeFileSync(file, fileLines.join('\n'));
                    console.log(`Fixed ${file}:${lineNum + 1}`);
                    fixedSomething = true;
                }
            } else {
               const match2 = l.match(/\/app\/applet\/([^:]+\.tsx):(\d+):(\d+): ERROR: Unexpected closing "(label)" tag/);
               if (match2) {
                   const file = './' + match2[1];
                   const lineNum = parseInt(match2[2]) - 1;
                   if (fs.existsSync(file)) {
                        let fileLines = fs.readFileSync(file, 'utf8').split('\n');
                        fileLines[lineNum] = fileLines[lineNum].replace('</label>', '</div>');
                        fs.writeFileSync(file, fileLines.join('\n'));
                        console.log(`Fixed generic label closing at ${file}:${lineNum + 1}`);
                        fixedSomething = true;
                   }
               }
            }
        }
        
        if (!fixedSomething) {
           console.log("Could not find any fixable errors in output:");
           console.log(output);
           break;
        }
    }
}
