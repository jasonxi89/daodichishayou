import { readFileSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..')

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8')

// The home page hands a draw to the result page through storage and an event.
// If either side re-declares the literal, one can be renamed without the other
// failing to compile, and the handoff silently breaks at runtime instead.
describe('draw handoff contract', () => {
  const MODULES = [
    'utils/drawContract.ts',
    'utils/drawStats.ts',
    'pages/index/index.tsx',
    'pages/result/result.tsx',
  ]

  const LITERALS = ["'lastDrawResult'", "'drawCountTotal'", "'ddcsy:redraw'"]

  it.each(LITERALS)('declares %s in exactly one module', literal => {
    const owners = MODULES.filter(file => read(file).includes(literal))

    // Exactly one, and it has to be the contract module rather than a consumer.
    expect(owners).toEqual(['utils/drawContract.ts'])
  })

  it('routes every consumer through the shared contract module', () => {
    const contract = read('utils/drawContract.ts')

    LITERALS.forEach(literal => expect(contract).toContain(literal))
  })
})
