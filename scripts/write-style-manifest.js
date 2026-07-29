// Records which SCSS inputs produced the current build.
//
// Timestamps cannot establish provenance: touching one unrelated output makes a
// newest-mtime comparison pass while the artifact you care about is stale. A
// content digest written only after a successful build can.
const { createHash } = require('crypto')
const { readdirSync, readFileSync, statSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')
const MANIFEST = join(DIST, '.style-manifest.json')

function scssFiles(dir) {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    return statSync(full).isDirectory()
      ? scssFiles(full)
      : full.endsWith('.scss') ? [full] : []
  })
}

function digest() {
  const hash = createHash('sha256')
  scssFiles(SRC)
    .map(f => f.slice(SRC.length + 1))
    .sort()
    .forEach(rel => {
      hash.update(rel)
      hash.update(readFileSync(join(SRC, rel)))
    })
  return hash.digest('hex')
}

if (!existsSync(DIST)) {
  console.error('write-style-manifest: dist is missing, run the build first')
  process.exit(1)
}

writeFileSync(MANIFEST, JSON.stringify({ styleDigest: digest() }, null, 2))
console.log('style manifest written')
