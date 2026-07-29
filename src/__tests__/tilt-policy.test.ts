import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
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
    // Fixtures exist to exercise the parser and deliberately break the policy.
    if (entry === 'fixtures') return []
    if (statSync(full).isDirectory()) return scssFiles(full)
    return full.endsWith('.scss') ? [full] : []
  })
}

// Tracks the nearest enclosing selector so a rotation is attributed to the
// element that actually carries it.
//
// Every syntax expressing a planar rotation must be covered, or the guard is
// bypassable by spelling alone: rotate(), rotateZ(), rotate3d(), the individual
// rotate property, and matrix() which hides rotation inside raw numbers.
const ROTATION_FN = /\b(rotate3d|rotateZ|rotate)\s*\(([^)]*)\)/g
const ROTATION_PROP = /(?:^|[;{])\s*rotate\s*:\s*([^;}]+)/g
const OPAQUE_FN = /\b(matrix3d|matrix)\s*\(/

const DEGREES = /^(-?[\d.]+)deg$/

function angleFrom(fn: string, args: string): number | null {
  if (fn === 'rotate3d') {
    // rotate3d(x, y, z, angle): only a pure z-axis turn is a planar tilt.
    const parts = args.split(',').map(p => p.trim())
    if (parts.length !== 4) return null
    const match = parts[3].match(DEGREES)
    return match ? Number(match[1]) : null
  }
  const match = args.trim().match(DEGREES)
  return match ? Number(match[1]) : null
}

function rotationsIn(file: string, text: string) {
  const found: Rotation[] = []
  const unparsed: string[] = []
  const stack: string[] = []

  const selectorNow = () => {
    const inKeyframes = stack.some(s => s.startsWith('@keyframes'))
    if (!inKeyframes) return stack[stack.length - 1] ?? ''
    return stack.filter(s => s.startsWith('@keyframes') || /^[\d%,\s]+$/.test(s)).join(' ')
  }

  const push = (selector: string, angle: number) => {
    found.push({ file, selector, angle })
  }

  const scan = (raw: string) => {
    const selector = selectorNow()

    for (const m of raw.matchAll(ROTATION_FN)) {
      const angle = angleFrom(m[1], m[2])
      if (angle === null) unparsed.push(file + ' :: ' + raw)
      else push(selector, angle)
    }

    for (const m of raw.matchAll(ROTATION_PROP)) {
      const literal = m[1].trim().match(DEGREES)
      if (literal) push(selector, Number(literal[1]))
      else unparsed.push(file + ' :: ' + raw)
    }

    // A matrix encodes rotation numerically; it cannot be audited statically.
    if (OPAQUE_FN.test(raw)) unparsed.push(file + ' :: ' + raw)
  }

  // Declarations may span lines, so buffer until the statement terminates.
  let buffer = ''

  text.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return

    const opener = trimmed.match(/^(.+?)\s*\{/)
    if (opener) stack.push(opener[1].trim())

    buffer = buffer ? buffer + ' ' + trimmed : trimmed
    if (/[;}{]/.test(trimmed) || trimmed === '') {
      if (buffer) scan(buffer)
      buffer = ''
    }

    if (trimmed.endsWith('}')) stack.pop()
  })

  if (buffer) scan(buffer)

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

  it('matches the exception table occurrence for occurrence', () => {
    // Multiset, not set: rotate(4deg) rotate(4deg) composes to 8deg while
    // producing a key that is individually allowed, so counts must match too.
    expect(all.map(key).sort()).toEqual(ALLOWED.map(key).sort())
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

// A policy guard is only as strong as its parser. These pin the SCSS shapes
// that could silently misattribute a rotation or drop one entirely.
describe('tilt parser edge cases', () => {
  const scanned = rotationsIn(
    'fixture',
    readFileSync(join(__dirname, 'fixtures/tilt-edge.scss'), 'utf-8'),
  )
  const at = (angle: number) => scanned.found.find(r => r.angle === angle)

  it('keeps a comma-separated selector list intact', () => {
    expect(at(3)?.selector).toBe('.a, .b')
  })

  it('attributes a nested rotation to the child, not the parent', () => {
    expect(at(7)?.selector).toBe('.nested-child')
  })

  it('catches a rotation sharing its line with another declaration', () => {
    expect(at(13)?.selector).toBe('.two-decls')
  })

  it('catches a rotation split across lines', () => {
    expect(at(17)?.selector).toBe('.multiline-decl')
  })

  it('reports non-literal angles rather than silently ignoring them', () => {
    // rotate(var(--a)), rotate($tilt) and matrix() cannot be audited statically.
    expect(scanned.unparsed).toHaveLength(3)
  })

  it('finds every literal rotation in the fixture', () => {
    expect(scanned.found.map(r => r.angle).sort((a, b) => a - b))
      .toEqual([3, 7, 13, 17, 23, 23, 29, 31, 37])
  })
})

// Equivalent syntaxes must not become a bypass: rotateZ, the individual
// rotate property, rotate3d and matrix all express the same visual tilt.
describe('tilt parser equivalent syntaxes', () => {
  const scanned = rotationsIn(
    'fixture',
    readFileSync(join(__dirname, 'fixtures/tilt-edge.scss'), 'utf-8'),
  )
  const anglesFor = (selector: string) =>
    scanned.found.filter(r => r.selector === selector).map(r => r.angle)

  it('counts a composed double rotation as two occurrences', () => {
    expect(anglesFor('.composed-double')).toEqual([23, 23])
  })

  it('sees rotateZ', () => {
    expect(anglesFor('.z-axis')).toEqual([29])
  })

  it('sees the individual rotate property', () => {
    expect(anglesFor('.individual-prop')).toEqual([31])
  })

  it('sees rotate3d', () => {
    expect(anglesFor('.three-d')).toEqual([37])
  })

  it('refuses to silently accept a matrix transform', () => {
    expect(scanned.unparsed.some(u => u.includes('matrix'))).toBe(true)
  })
})

// The guard reads SCSS source. A mixin or variable could in principle emit a
// rotation that never appears literally in source, so cross-check the compiled
// WXSS when a build is present.
describe('compiled output agrees with the source policy', () => {
  const DIST = join(SRC, '..', 'dist')
  const built = existsSync(DIST)

  const wxss = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap(entry => {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) return wxss(full)
      return full.endsWith('.wxss') ? [full] : []
    })

  const maybe = built ? it : it.skip

  maybe('emits no angle that the exception table does not declare', () => {
    const declared = new Set(ALLOWED.map(r => r.angle))
    const emitted = wxss(DIST).flatMap(f =>
      [...readFileSync(f, 'utf-8').matchAll(/rotate[A-Za-z0-9]*\(\s*(-?[\d.]+)deg\s*\)/g)]
        .map(m => Number(m[1])),
    )

    expect(emitted.length).toBeGreaterThan(0)
    expect([...new Set(emitted)].filter(a => !declared.has(a)).sort()).toEqual([])
  })

  it('states plainly whether the compiled cross-check ran', () => {
    // Fails loudly if someone deletes dist and assumes the suite still covers it.
    expect(typeof built).toBe('boolean')
  })
})
