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

  it('uses theme tokens without legacy popup colors', () => {
    const recipeStyles = source('components/RecipePopup/index.scss')
    const customMenuStyles = source('components/CustomMenuPopup/index.scss')
    const popupStyles = `${recipeStyles}\n${customMenuStyles}`
    const legacyColors = /#f5a623|#f7b84e|#f5f5f5|#f0f0f0|rgba\(\s*245\s*,\s*166\s*,\s*35/i

    expect(recipeStyles).toContain("@use '../../styles/theme' as theme;")
    expect(customMenuStyles).toContain("@use '../../styles/theme' as theme;")
    expect(recipeStyles).toContain('background: theme.$card')
    expect(customMenuStyles).toContain('background: theme.$card')
    expect(popupStyles).not.toMatch(legacyColors)
    expect(popupStyles).not.toMatch(/\brotate(?:[XYZ3d]*)?\s*\(/i)
    expect(popupStyles).not.toMatch(/(?:0\s+)+#1f1b16|(?:0\s+)+rgba\(\s*31/i)
  })

  it('keeps the shared popup base paper-themed and mixin-only', () => {
    const styles = source('styles/popup-base.scss')
    const concreteSelectorLines = styles
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.endsWith('{') && !line.startsWith('@'))

    expect(styles).toContain("@use './theme' as theme;")
    expect(styles).toMatch(/@mixin sheet\s*\{[\s\S]*?background: theme\.\$card;/)
    expect(styles).not.toContain('background: #fff;')
    expect(concreteSelectorLines).toEqual([])
  })
})
