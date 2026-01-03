const fs = require('fs');
const path = require('path');

const files = ['dist/stdio.js', 'dist/http.js'];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(filePath, '#!/usr/bin/env node\n' + content);
      console.log(`Added shebang to ${file}`);
    }
  }
});
