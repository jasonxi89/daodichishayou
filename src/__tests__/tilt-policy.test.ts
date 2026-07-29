import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..')

// Iron rule 4 lives in docs/design/README.md. Prose drifts, so the named
// exception table is mirrored here as exact occurrences.
//
// A numeric allowlist would be too weak: any element could borrow an in-band
// angle, which is precisely the "extension by analogy" the rule forbids.
// So a rotation must match on file AND owning selector AND angle.
interface Rotation {
  file: string
  selector: string
  angle: number
}

const key = (r: Rotation) => `${r.file} :: ${r.selector} :: ${r.angle}`

function scssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return scssFiles(full)
    return full.endsWith('.scss') ? [full] : []
  })
}

// Tracks the nearest enclosing selector so a rotation is attributed to the
// element that actually carries it.
function rotationsIn(file: string, text: string) {
  const found: Rotation[] = []
  const unparsed: string[] = []
  const stack: string[] = []

  text.split('\n').forEach(line => {
    const trimmed = line.trim()
    const opener = trimmed.match(/^(.+?)\s*\{/)
    if (opener) stack.push(opener[1].trim())

    if (trimmed.includes('rotate(')) {
      const inKeyframes = stack.filter(s => s.startsWith('@keyframes'))
      const selector = inKeyframes.length > 0
        ? stack.filter(s => s.startsWith('@keyframes') || /^[\d%,\s]+$/.test(s)).join(' ')
        : (stack[stack.length - 1] ?? '')

      const literals = [...trimmed.matchAll(/rotate\((-?[\d.]+)deg\)/g)]
      const every = [...trimmed.matchAll(/rotate\(([^)]*)\)/g)]

      // A non-literal argument cannot be audited; surface it, never skip it.
      if (every.length !== literals.length) unparsed.push(`${file} :: ${trimmed}`)

      literals.forEach(m => {
        found.push({ file, selector, angle: Number(m[1]) })
      })
    }

    if (trimmed.endsWith('}')) stack.pop()
  })

  return { found, unparsed }
}

// Mirrors the named-exception table in docs/design/README.md.
// category is documentation: it records WHY each occurrence is permitted.
const ALLOWED: (Rotation & { category: string })[] = [
  { file: 'components/DrawCeremony/index.scss', selector: '.stick--left', angle: -18, category: 'geometry, sticks fan out' },
  { file: 'components/DrawCeremony/index.scss', selector: '.stick--right', angle: 4, category: 'geometry, sticks fan out' },
  { file: 'components/DrawCeremony/index.scss', selector: '.main-stick', angle: -8, category: 'geometry, stick leaves the tube' },
  { file: 'components/DrawCeremony/index.scss', selector: '.badge', angle: -6, category: 'decorative, default band' },
  { file: 'components/DrawCeremony/index.scss', selector: '.ceremony--done .main-stick', angle: -8, category: 'geometry, holds stick angle' },
  { file: 'components/DrawCeremony/index.scss', selector: '.ceremony--done .badge', angle: -6, category: 'decorative, default band' },
  { file: 'components/DrawCeremony/index.scss', selector: '@keyframes tube-shake 0%, 100%', angle: -2, category: 'animation, shake cycle' },
  { file: 'components/DrawCeremony/index.scss', selector: '@keyframes tube-shake 50%', angle: 2, category: 'animation, shake cycle' },
  { file: 'components/DrawCeremony/index.scss', selector: '@keyframes sticks-jiggle 0%, 100%', angle: -18, category: 'animation, holds fan angle' },
  { file: 'components/DrawCeremony/index.scss', selector: '@keyframes sticks-jiggle 50%', angle: -18, category: 'animation, holds fan angle' },
  { file: 'components/MenuGrid/index.scss', selector: '&__arrow', angle: 0, category: 'functional, arrow rest state' },
  { file: 'components/MenuGrid/index.scss', selector: '&--expanded .menu-more__arrow', angle: 180, category: 'functional, disclosure flip' },
  { file: 'pages/ingredient/ingredient.scss', selector: '@keyframes wobble 0%, 100%', angle: 0, category: 'pre-existing, owned by Task 15' },
  { file: 'pages/ingredient/ingredient.scss', selector: '@keyframes wobble 25%', angle: -10, category: 'pre-existing, owned by Task 15' },
  { file: 'pages/ingredient/ingredient.scss', selector: '@keyframes wobble 75%', angle: 10, category: 'pre-existing, owned by Task 15' },
  { file: 'pages/result/result.scss', selector: '.scroll-card__badge', angle: 4, category: 'decorative, NAMED EXCEPTION' },
  { file: 'pages/result/result.scss', selector: '.seal', angle: -12, category: 'decorative, NAMED EXCEPTION' },
]

describe('iron rule 4: tilt policy', () => {
  const files = scssFiles(SRC)
  const scanned = files.map(full => rotationsIn(full.slice(SRC.length + 1), readFileSync(full, "utf-8")))
  const all = scanned.flatMap(s => s.found)
  const unparsed = scanned.flatMap(s => s.unparsed)

  it('scans a non-trivial number of stylesheets', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('finds every rotation with a literal, auditable angle', () => {
    // rotate($a) or rotate(var(--a)) cannot be audited, so it must not pass silently.
    expect(unparsed).toEqual([])
  })

  it('permits no rotation outside the named exception table', () => {
    const allowed = new Set(ALLOWED.map(key))
    const offenders = all.filter(r => !allowed.has(key(r))).map(key)

    expect(offenders).toEqual([])
  })

  it('keeps the exception table free of stale entries', () => {
    // A removed rotation must not leave a dead allowance behind.
    const actual = new Set(all.map(key))
    const stale = ALLOWED.map(key).filter(k => !actual.has(k))

    expect(stale).toEqual([])
  })
})
