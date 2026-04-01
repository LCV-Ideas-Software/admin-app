const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  'functions/api/cfdns',
  'functions/api/cfpw',
  'functions/api/mtasts',
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Usa RegEx para remover as tipagens das propriedades legadas, com ou sem whitespace e ponto e virgula
  content = content.replace(/\bCF_API_TOKEN\??\s*:\s*string\s*;?/g, '');
  content = content.replace(/\bCLOUDFLARE_API_TOKEN\??\s*:\s*string\s*;?/g, '');
  
  // Limpa linhas em branco duplas que possam ter ficado dentro da interface Env
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleaned file:', filePath);
  }
}

function processDirectory(dir) {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(path.join(dir, file));
    } else if (file.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

for (const dir of DIRECTORIES) {
  processDirectory(dir);
}
console.log('Done scanning!');
