// Single source of truth for the home-to-result handoff.
//
// These three strings are the entire wire format between two pages that never
// import each other. Declaring them twice compiles fine and fails at runtime,
// so every consumer must import from here.

export const TOTAL_KEY = 'drawCountTotal'
export const LAST_RESULT_KEY = 'lastDrawResult'
export const REDRAW_EVENT = 'ddcsy:redraw'

export const HOME_PAGE = '/pages/index/index'
export const RESULT_PAGE = '/pages/result/result'

export interface DrawResultInput {
  foods: string[]
  category: string
  servings: number
  pool: string[]
}

export interface DrawResult extends DrawResultInput {
  drawIndex: number
  ts: number
}
