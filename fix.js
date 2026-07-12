const fs = require('fs');
let code = fs.readFileSync('js/dashboard-supabase.js', 'utf8');
code = code.replace(/const supabase = window\.supabaseClient;/g, 'const dbClient = window.supabaseClient;');
code = code.replace(/\bsupabase\./g, 'dbClient.');
fs.writeFileSync('js/dashboard-supabase.js', code);
console.log('Fixed dashboard-supabase.js');
