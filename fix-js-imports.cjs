const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix imports that end with .js
      const fixedContent = content.replace(/from\s+['"]([^'"]+)\.js['"]/g, "from '$1'");
      
      if (content !== fixedContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  });
}

console.log('Starting to fix .js imports in TypeScript files...');
fixImports('./server/src');
console.log('Completed fixing imports!'); 