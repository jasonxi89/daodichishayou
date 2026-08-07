import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

// Issue #4 relink: the recipe page joined the hybrid theme late; these audits
// keep it from quietly drifting back to the legacy orange palette.
describe('recipe page theme contract', () => {
  it('styles the page with theme tokens instead of the legacy palette', () => {
    const styles = source('pages/recipe/recipe.scss')
    const legacyColors = /#f5a623|#f7b84e|#f5f8fd|#fff3e0|#fafafa/i

    expect(styles).toContain("@use '../../styles/theme' as theme;")
    expect(styles).not.toMatch(legacyColors)
    expect(styles).not.toMatch(/\brotate(?:[XYZ3d]*)?\s*\(/i)
  })

  it('keeps the page config on the paper background', () => {
    const config = source('pages/recipe/recipe.config.ts')

    expect(config).toContain("navigationBarBackgroundColor: '#faf4e8'")
    expect(config).toContain("backgroundColor: '#faf4e8'")
    expect(config).not.toContain('#f5f8fd')
  })

  it('renders every page state on the paper texture', () => {
    const page = source('pages/recipe/recipe.tsx')
    const states = page.match(/className='recipe-page paper-texture'/g) ?? []

    // Loading, missing-recipe and loaded states must all sit on the paper.
    expect(states).toHaveLength(3)
    expect(page).not.toMatch(/className='recipe-page'/)
  })

  it('leaves no RecipePopup remnants in the source tree', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/RecipePopup'))).toBe(false)
  })
})
