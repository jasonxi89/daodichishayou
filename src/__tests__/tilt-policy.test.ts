import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..')

// Iron rule 4 lives in docs/design/README.md, but a rule only enforced by prose
// drifts. This mirrors the named-exception table so a stray angle fails the build.
const DEFAULT_ANGLES = [-6, -2, 2, 6]

const EXCEPTIONS: Record<string, number[]> = {
  'pages/result/result.scss': [
    4, // sticker badge 天意如此！
    -12, // seal 大厨认证
  ],
  'components/DrawCeremony/index.scss': [
    -8, // main stick, geometry
    -18, // backing sticks, geometry
    4, // backing stick, geometry
  ],
  'pages/ingredient/ingredient.scss': [
    -10, // pre-existing shake animation, owned by Task 15
    10,
  ],
  'components/MenuGrid/index.scss': [
    180, // disclosure arrow flip, functional not decorative
  ],
}

function scssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return scssFiles(full)
    return full.endsWith('.scss') ? [full] : []
  })
}

function anglesIn(text: string): number[] {
  const found = [...text.matchAll(/rotate\((-?[\d.]+)deg\)/g)]
  return found.map(m => Number(m[1]))
}

describe('iron rule 4: tilt angles', () => {
  const files = scssFiles(SRC)

  it('scans a non-trivial number of stylesheets', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map(f => [f.slice(SRC.length + 1), f]))(
    '%s uses only permitted angles',
    (rel, full) => {
      const allowed = new Set([...DEFAULT_ANGLES, 0, ...(EXCEPTIONS[rel] ?? [])])
      const offenders = anglesIn(readFileSync(full, 'utf-8')).filter(a => !allowed.has(a))

      expect(offenders).toEqual([])
    },
  )
})
