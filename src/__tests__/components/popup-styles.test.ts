import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('popup style ownership', () => {
  it('RecipePopup imports complete baseline styles', () => {
    expect(source('components/RecipePopup/index.tsx')).toContain("import './index.scss'")
    const styles = source('components/RecipePopup/index.scss')
    expect(styles).toContain('.recipe-overlay')
    expect(styles).toContain('.recipe-popup')
    expect(styles).toContain('.recipe-popup-actions')
  })

  it('CustomMenuPopup imports complete baseline styles', () => {
    expect(source('components/CustomMenuPopup/index.tsx')).toContain("import './index.scss'")
    const styles = source('components/CustomMenuPopup/index.scss')
    expect(styles).toContain('.custom-menu-overlay')
    expect(styles).toContain('.custom-menu-popup')
    expect(styles).toContain('.custom-add-cat-btn')
  })
})
