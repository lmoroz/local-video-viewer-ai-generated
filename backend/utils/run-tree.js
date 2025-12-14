const { exec } = require('node:child_process');
const path = require('node:path');
let lines = ['```text'];

exec("npx tree-cli -f -l 5 -a --ignore 'node_modules,dist,cache,utils,STRUCTURE.md,package-lock.json'", (err, stdout, stderr) => {
  if (err) {
    console.error(stderr || err.message);
    process.exit(1);
  }
  lines.push(...stdout.trimEnd().split(/\r?\n/));
  lines = lines.filter(Boolean);
  lines = lines
    .map((line, index) => {
      //console.log(index, line);
      return line.startsWith('directory:') || line.startsWith('ignored:') || line.startsWith('\x1B')
        ? ''
        : index === 1
          ? path.basename(line.trim().replace(/[\\/]+/g, path.sep))
          : line.trim();
    })
    .filter(Boolean);
  lines.push('```');
  console.log(lines.join('\n'));
});
