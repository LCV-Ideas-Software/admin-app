const fs = require('fs');
const path = require('path');

const HEADER = `/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
`;

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (['node_modules', 'dist', 'build', '.git', 'out', 'coverage', '.vite'].includes(file)) continue;
            walkDir(fullPath);
        } else {
            if (/\.(js|jsx|ts|tsx)$/.test(file)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (!content.includes('SPDX-License-Identifier')) {
                    fs.writeFileSync(fullPath, HEADER + content);
                }
            }
        }
    }
}

const root = path.resolve(__dirname, '..');
['src', 'mainsite-frontend/src', 'mainsite-worker/src', 'mainsite-admin/src', 'astrologo-frontend/src', 'tlsrpt-front/src'].forEach(d => {
    let p = path.join(root, d);
    if (fs.existsSync(p)) walkDir(p);
});
console.log('SPDX Headers aplicados em: ' + path.basename(root));
