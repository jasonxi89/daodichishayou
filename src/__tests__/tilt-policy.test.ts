/**
 * Iron rule 4 enforcement, defined in docs/design/README.md.
 *
 * This audits the compiled WXSS, not the SCSS source. Compilation resolves
 * mixins, variables, interpolation and nesting and strips comments, so what is
 * scanned here is exactly what ships. A source-level scan would instead be
 * enforcing spelling, and could be bypassed by any construct it did not model.
 *
 * The build must be current: staleness is asserted, never skipped.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..')
const DIST = join(SRC, '..', 'dist')

interface Rotation {
  file: string
  selector: string
  angles: number[]
}

const key = (r: Rotation) => r.file + ' :: ' + r.selector + ' :: ' + r.angles.join('+')

// CSS function and property names are ASCII case-insensitive, hence the i flag.
// Longest-first alternation stops rotate3d being consumed as bare rotate.
const ROTATION_FN = /\b(rotate3d|rotateX|rotateY|rotateZ|rotate)\s*\(([^)]*)\)/gi
const ROTATION_PROP = /(?:^|[;{])\s*rotate\s*:\s*([^;}]+)/gi
const OPAQUE_FN = /\b(matrix3d|matrix)\s*\(/i

// A real CSS number: optional sign, digits with optional fraction, optional
// exponent. [\d.]+ would accept 1.2.3 and reject +2deg.
const DEGREES = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)deg$/i

function angleFrom(fn: string, args: string): number | null {
  const parse = (raw: string) => {
    const match = raw.trim().match(DEGREES)
    if (!match) return null
    const value = Number(match[1])
    return Number.isFinite(value) ? value : null
  }

  if (fn.toLowerCase() === 'rotate3d') {
    const parts = args.split(',')
    return parts.length === 4 ? parse(parts[3]) : null
  }
  return parse(args)
}

function filesUnder(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (entry === 'fixtures') return []
    if (statSync(full).isDirectory()) return filesUnder(full, ext)
    return full.endsWith(ext) ? [full] : []
  })
}

const newest = (paths: string[]) =>
  paths.reduce((max, p) => Math.max(max, statSync(p).mtimeMs), 0)

const RULE = /([^{}]+)\{([^{}]*)\}/g

// One entry per declaration, not per regex match. Autoprefixer duplicates a
// rule across vendor prefixes, so match counts reflect the build tool; the
// angle sequence inside a single declaration reflects design intent.
// That distinction is what makes rotate(4deg) rotate(4deg) detectable as an
// 8deg composition rather than two innocent 4deg occurrences.
export function rotationsInCss(
  file: string,
  css: string,
) {
  const found: Rotation[] = []
  const unparsed: string[] = []

  const emit = (
    selector: string,
    body: string,
  ) => {
    body.split(';').forEach(decl => {
      const angles: number[] = []
      let bad = false

      for (const m of decl.matchAll(ROTATION_FN)) {
        const angle = angleFrom(m[1], m[2])
        if (angle === null) bad = true
        else angles.push(angle)
      }

      for (const m of decl.matchAll(ROTATION_PROP)) {
        const angle = angleFrom('rotate', m[1])
        if (angle === null) bad = true
        else angles.push(angle)
      }

      // A matrix hides rotation in raw numbers and cannot be audited.
      if (OPAQUE_FN.test(decl)) bad = true

      if (bad) unparsed.push(file + ' :: ' + selector + ' :: ' + decl.trim())
      else if (angles.length > 0) found.push({ file, selector, angles })
    })
  }

  // Lift at-rule blocks out with a balanced-brace scan rather than a regex, so
  // a rule that merely follows @keyframes is never attributed to it.
  let rest = ''
  let i = 0

  while (i < css.length) {
    const at = css.indexOf('@', i)
    const open = at === -1 ? -1 : css.indexOf('{', at)

    if (at === -1 || open === -1) {
      rest += css.slice(i)
      break
    }

    rest += css.slice(i, at)

    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1
      if (css[j] === '}') depth -= 1
      j += 1
    }

    // Vendor-prefixed keyframe copies are the same design intent.
    const header = css.slice(at, open).trim().replace(/@-\w+-/, '@')
    const inner = css.slice(open + 1, j - 1)

    for (const rule of inner.matchAll(RULE)) {
      emit(header + ' ' + rule[1].trim(), rule[2])
    }

    i = j
  }

  for (const rule of rest.matchAll(RULE)) {
    emit(rule[1].trim(), rule[2])
  }

  return { found, unparsed }
}

// Mirrors the named-exception table in docs/design/README.md.
// Keyed by compiled file, selector and the angle sequence of one
// declaration. category records WHY each entry is permitted.
const ALLOWED = [
  { file: 'pages/index/index.wxss', selector: '.badge', angles: [-6], category: 'decorative, default band' },
  { file: 'pages/index/index.wxss', selector: '.ceremony--done .badge,.ceremony--rising .badge', angles: [-6], category: 'decorative, default band' },
  { file: 'pages/index/index.wxss', selector: '.ceremony--done .main-stick,.ceremony--rising .main-stick', angles: [-8], category: 'geometry, holds stick angle' },
  { file: 'pages/index/index.wxss', selector: '.main-stick', angles: [-8], category: 'geometry, stick leaves the tube' },
  { file: 'pages/index/index.wxss', selector: '.menu-more--expanded .menu-more__arrow', angles: [180], category: 'functional, disclosure flip' },
  { file: 'pages/index/index.wxss', selector: '.menu-more__arrow', angles: [0], category: 'functional, arrow rest state' },
  { file: 'pages/index/index.wxss', selector: '.stick--left', angles: [-18], category: 'geometry, sticks fan out' },
  { file: 'pages/index/index.wxss', selector: '.stick--right', angles: [4], category: 'geometry, sticks fan out' },
  { file: 'pages/index/index.wxss', selector: '@keyframes sticks-jiggle 0%,100%', angles: [-18], category: 'animation, holds fan angle' },
  { file: 'pages/index/index.wxss', selector: '@keyframes sticks-jiggle 50%', angles: [-18], category: 'animation, holds fan angle' },
  { file: 'pages/index/index.wxss', selector: '@keyframes tube-shake 0%,100%', angles: [-2], category: 'animation, shake cycle' },
  { file: 'pages/index/index.wxss', selector: '@keyframes tube-shake 50%', angles: [2], category: 'animation, shake cycle' },
  { file: 'pages/ingredient/ingredient.wxss', selector: '@keyframes wobble 0%,100%', angles: [0], category: 'pre-existing, owned by Task 15' },
  { file: 'pages/ingredient/ingredient.wxss', selector: '@keyframes wobble 25%', angles: [-10], category: 'pre-existing, owned by Task 15' },
  { file: 'pages/ingredient/ingredient.wxss', selector: '@keyframes wobble 75%', angles: [10], category: 'pre-existing, owned by Task 15' },
  { file: 'pages/result/result.wxss', selector: '.scroll-card__badge', angles: [4], category: 'decorative, NAMED EXCEPTION' },
  { file: 'pages/result/result.wxss', selector: '.seal', angles: [-12], category: 'decorative, NAMED EXCEPTION' },
]

describe('iron rule 4: tilt policy', () => {
  const wxss = filesUnder(DIST, '.wxss')
  const scanned = wxss.map(f => rotationsInCss(f.slice(DIST.length + 1), readFileSync(f, 'utf-8')))
  const all = scanned.flatMap(s => s.found)
  const unparsed = scanned.flatMap(s => s.unparsed)

  // Vendor prefixing duplicates identical declarations; dedupe so the
  // table records design intent rather than autoprefixer behaviour.
  const actual = [...new Set(all.map(key))].sort()
  const expected = [...new Set(ALLOWED.map(key))].sort()

  it('runs against a build that is not missing', () => {
    // Never skip. A missing build must fail, not quietly pass.
    expect(wxss.length).toBeGreaterThan(0)
    expect(all.length).toBeGreaterThan(0)
  })

  it('runs against a build that is not stale', () => {
    const sources = filesUnder(SRC, '.scss')
    expect(sources.length).toBeGreaterThan(5)
    // A stale dist would audit styles nobody is shipping any more.
    expect(newest(wxss)).toBeGreaterThanOrEqual(newest(sources))
  })

  it('emits no rotation it cannot audit', () => {
    expect(unparsed).toEqual([])
  })

  it('matches the exception table exactly', () => {
    // Equality, not subset: a declaration that vanished from the build is
    // as much a policy break as one that appeared.
    expect(actual).toEqual(expected)
  })
})
