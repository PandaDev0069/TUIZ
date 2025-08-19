const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const docDir = path.join(__dirname, '..', 'doc', 'backend');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

function parseJS(content) {
  let internalImports = [];
  let externalImports = [];
  let exports = [];
  let functions = [];
  let variables = [];

  const importRegex = /import[^'"\n]*['"]([^'"\n]+)['"]/g;
  const requireRegex = /require\(['"]([^'"\n]+)['"]\)/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const mod = m[1];
    if (mod.startsWith('.') || mod.startsWith('/')) internalImports.push(mod);
    else externalImports.push(mod);
  }
  while ((m = requireRegex.exec(content)) !== null) {
    const mod = m[1];
    if (mod.startsWith('.') || mod.startsWith('/')) internalImports.push(mod);
    else externalImports.push(mod);
  }

  const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*([A-Za-z0-9_]+)/g;
  while ((m = exportRegex.exec(content)) !== null) {
    exports.push(m[1]);
  }
  const moduleExportsRegex = /module\.exports\s*=\s*{([^}]+)}/g;
  while ((m = moduleExportsRegex.exec(content)) !== null) {
    m[1].split(',').forEach(part => {
      const name = part.split(':')[0].trim();
      if (name) exports.push(name);
    });
  }
  const exportsAssignRegex = /exports\.(\w+)\s*=\s*/g;
  while ((m = exportsAssignRegex.exec(content)) !== null) {
    exports.push(m[1]);
  }

  const funcRegex = /function\s+(\w+)/g;
  while ((m = funcRegex.exec(content)) !== null) {
    functions.push(m[1]);
  }
  const arrowRegex = /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((m = arrowRegex.exec(content)) !== null) {
    functions.push(m[1]);
  }
  const arrowNoParenRegex = /const\s+(\w+)\s*=\s*(?:async\s*)?\w+\s*=>/g;
  while ((m = arrowNoParenRegex.exec(content)) !== null) {
    functions.push(m[1]);
  }

  const varRegex = /(?:const|let|var)\s+(\w+)/g;
  while ((m = varRegex.exec(content)) !== null) {
    variables.push(m[1]);
  }

  return {
    internalImports: Array.from(new Set(internalImports)),
    externalImports: Array.from(new Set(externalImports)),
    exports: Array.from(new Set(exports)),
    functions: Array.from(new Set(functions)),
    variables: Array.from(new Set(variables)),
  };
}

function generateDoc(relative, info) {
  const lines = [];
  lines.push(`# 📄 ${relative} —`);
  lines.push('');
  lines.push('> One-liner: ');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📦 Imports / Dependencies');
  lines.push('- [ ] External libs:');
  info.externalImports.forEach(mod => lines.push(`  - \`${mod}\` – purpose`));
  lines.push('- [ ] Internal modules:');
  info.internalImports.forEach(mod => lines.push(`  - \`${mod}\` – purpose`));
  lines.push('- [ ] Side-effects? (Y/N)');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📤 Exports');
  lines.push('- [ ] Functions:');
  info.exports.forEach(name => lines.push(`  - \`${name}\``));
  lines.push('- [ ] Classes:');
  lines.push('- [ ] Constants:');
  lines.push('- [ ] Main factory (if any): `<createSomething()>`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🧠 Responsibilities');
  lines.push('- [ ] Owns: <what logic this file controls>');
  lines.push('- [ ] Delegates: <what is pushed down to helpers/services>');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🔧 Functions / Classes');
  info.functions.forEach(fn => {
    lines.push(`### \`${fn}(params)\``);
    lines.push('- **Purpose:**  ');
    lines.push('- **Inputs:** `<paramName: type>`  ');
    lines.push('- **Outputs:** `<return type>`  ');
    lines.push('- **Notes:** async? order-dependent? mutates state?');
    lines.push('');
  });
  if (info.functions.length === 0) {
    lines.push('<!-- No functions detected -->');
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## 📊 Variables / Constants');
  lines.push(`- [ ] Global constants: \`${info.variables.join(', ')}\``);
  lines.push('- [ ] Env configs used here: `<process.env.SOMETHING>`');
  lines.push('- [ ] Defaults: `<DEFAULT_TIMEOUT = 5000>`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🔄 Data Flow');
  lines.push('- **Inputs:** <where data comes from>  ');
  lines.push('- **Processing:** <transformations or logic>  ');
  lines.push('- **Outputs:** <what is returned / emitted / stored>');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## ⚙️ Configuration');
  lines.push('| Key | Required | Default | Used by | Notes |');
  lines.push('|-----|----------|---------|---------|-------|');
  lines.push('| `EXAMPLE_ENV` | ✓ | none | this file | controls X |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🧰 Middleware / Pipeline (if applicable)');
  lines.push('| Order | Middleware | Purpose |');
  lines.push('|-------|------------|---------|');
  lines.push('| 1 | `<cors>` | handle origins |');
  lines.push('| 2 | `<rateLimiter>` | prevent abuse |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🌐 Route Map (if API file)');
  lines.push('| Prefix | Methods | Module | Auth | Rate Limit |');
  lines.push('|--------|---------|--------|------|------------|');
  lines.push('| `/example` | GET | `routes/example.js` | Public | Standard |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🔐 Security & Error Handling');
  lines.push('- [ ] Auth model: `<Bearer JWT>` / `<session>`  ');
  lines.push('- [ ] Rate limits: `<100/min>`  ');
  lines.push('- [ ] Error responses:  ');
  lines.push('  ```jsonc');
  lines.push('  { "error": "BadRequest", "message": "Invalid input" }');
  lines.push('  ```');
  lines.push('');
  lines.push('🧪 Testing Notes');
  lines.push('\t•\tHow to import in tests: `<supertest(app)>`');
  lines.push('\t•\tMocks / stubs required: `<SupabaseAuthHelper.fake()>`');
  lines.push('\t•\tEdge cases: list them here');
  lines.push('');
  lines.push('⸻');
  lines.push('');
  lines.push('📝 Change Log');
  lines.push('\t•\tYYYY-MM-DD — ');
  lines.push('');
  lines.push('⸻');
  lines.push('');
  lines.push('✅ Maintenance Checklist');
  lines.push('\t•\tImports match code');
  lines.push('\t•\tEnv vars documented');
  lines.push('\t•\tRoutes accurate');
  lines.push('\t•\tError shapes consistent');
  lines.push('\t•\tSecurity notes up to date');
  lines.push('');
  return lines.join('\n');
}

const files = walk(backendDir);
for (const file of files) {
  const rel = path.relative(backendDir, file);
  const out = path.join(docDir, rel + '.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let info = { internalImports: [], externalImports: [], exports: [], functions: [], variables: [] };
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    info = parseJS(content);
  }
  const doc = generateDoc(rel, info);
  fs.writeFileSync(out, doc);
}

