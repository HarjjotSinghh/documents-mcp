import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const files = ['dist/server/stdio.js', 'dist/server/http.js'];

files.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(filePath, '#!/usr/bin/env node\n' + content);
      console.log(`Added shebang to ${file}`);
    } else {
      console.log(`Shebang already present in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
