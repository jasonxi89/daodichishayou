# 混血主题改版（御厨骨 × 贴纸肉）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Codex CLI 执行说明**：按「批次」执行，每批 = 一个 feature 分支 + 一个 PR（见文末「PR 契约」）。设计规格的唯一权威来源是 `docs/design/README.md`（本仓库内，含完整 token 表与逐屏像素规格）；本计划负责把规格映射到代码结构、任务序列与测试。两者冲突时以 `docs/design/README.md` 为准并在 PR 里记偏差。

**Goal:** 把「到底吃啥哟」小程序按定稿设计改版为混血主题：御厨纸感骨架（衬线/纸面/金线/印章）+ 贴纸漫画点缀（动作按钮/角标/抽取动画），覆盖首页、抽取仪式、结果页三屏及食材页/弹窗/分享卡延伸。

**Architecture:** 首页保留单页结构，抽取仪式作为同页状态机（`drawPhase: idle→shaking→rising→done`，class 切换 + WXSS keyframes，纯 transform）；结果页新增独立路由页（storage 交接数据、eventCenter 回传「再抽」）；主题层新增 `src/styles/theme.scss` design tokens 供全局复用；老虎机 hook 退役，替换为 `useDrawCeremony`。

**Tech Stack:** Taro 4.1.11 + React 18 + TypeScript + SCSS；jest + ts-jest + @testing-library/react（mock 模式沿用 `src/__mocks__/taro.ts`）；fontmin 字体子集化。

## Global Constraints（每个任务都隐含遵守）

- **铁律 1 分工**：御厨（衬线、纸面、金线、印章）= 页面结构/标题/卡片/选择态；贴纸（粗描边、硬阴影、快乐体）= 只用于动作按钮、角标、抽取动画。
- **铁律 2**：emoji 只出现在「结果」里（抽中的菜、签头图标），不进按钮、不做背景装饰。
- **铁律 3 CTA 两级**：仪式类（为我定夺/再抽）= 墨块 `#2f261a` + 金字 `#f0dfb8` + 两侧金线；确认类（就它了！）= 贴纸黄 `#ffb020` + 2.5px 黑描边 + 4px 硬阴影。
- **铁律 4**：倾角只有 ±2° 和 ±6° 两档，且只用于贴纸角标。
- **铁律 5**：硬阴影 `Npx Npx 0 #1f1b16` 只给贴纸元素；御厨卡片一律 `0 10px 26px rgba(120,90,40,.08)`。
- **rpx 换算**：设计稿基于 375pt 宽，**1 设计px = 2rpx**。README 里所有 px 值写入 SCSS 时 ×2 为 rpx。
- **禁用 custom-tab-bar**（历史 6 连败，见 HANDOFF「约定与坑」）；tab bar 只改内置配置。
- **禁用 `useDidShow`**（jest 静默崩测试）；跨页通信用 `Taro.eventCenter` + storage。
- **动画只用 transform/opacity**，勿用 top/left；状态机用 class 切换 + setTimeout 驱动。
- **44px 热区**：视觉小按钮（换一换/步进器 ∓/跳过）用 padding 或外扩热区补到 ≥44px（=88rpx）。
- 主包体积警戒 2MB：字体子集必须 <1MB，超限走网络加载兜底（Task 2）。
- git commit 格式 `type: 描述`（祈使句），**不加 Co-Authored-By**。
- 每批合并前：`npx jest` 全绿 + `npm run build:weapp` 成功（当前基线 184 tests）。
- 完成后版本号 bump：`package.json` → **1.9.0**（批3 收尾统一做）。

## 文件结构总览

```
新增:
  src/styles/theme.scss              # design tokens（色/字/影/圆角）+ 共享 class（金线、纸纹、印章、贴纸）
  src/utils/zhNumber.ts              # 数字→中文（壹贰叁…拾）
  src/utils/drawStats.ts             # 累计定夺次数 + 本周次数（storage 持久化）
  src/utils/foodMeta.ts              # 菜名→emoji、荤/素判定
  src/utils/themeFonts.ts            # loadFontFace 加载子集字体（含降级）
  src/data/categoryMeta.ts           # 菜单格主分类、显示名、小注文案
  src/hooks/useDrawCeremony.ts       # 抽取仪式状态机（替代 useSlotMachine）
  src/components/MenuGrid/           # 菜单格（3列 grid + 墨块选中态 + 更多展开）
  src/components/CountStepper/       # 份数步进器（白胶囊 + 中文数字）
  src/components/DrawCeremony/       # 签筒场景（木筒/主签/陪衬签/角标 + keyframes）
  src/pages/result/                  # 结果页「今晚菜单」（新路由）
  tools/subset-fonts.mjs             # fontmin 子集化脚本
  src/assets/fonts/                  # 子集化产物（base64 .ts 模块）
修改:
  src/app.config.ts                  # +result 页、tabBar 文字/配色、darkmode:false
  src/app.ts / src/app.scss          # 字体加载、theme 引入
  src/pages/index/*                  # 首页重构（日期行/主视觉/菜单格/底部操作行/仪式态）
  src/components/DigestCard/*        # 今日风向引文条 + 骨架屏（批3）
  src/pages/ingredient/*             # 食材页延伸 + 分享卡重绘（批3）
  src/components/RecipePopup|CustomMenuPopup  # 纸面化（批3）
删除（批2）:
  src/hooks/useSlotMachine.ts + 对应测试
  src/assets/tab-*.png（tab 改文字后弃用，确认无引用再删）
```

---

# 批 1：主题基建 + 首页（分支 `feature/theme-batch1`）

### Task 1: theme.scss design tokens + 全局纸面底

**Files:**
- Create: `src/styles/theme.scss`
- Modify: `src/app.scss`（顶部 `@import './styles/theme.scss';`，页面底色改纸面）

**Interfaces:**
- Produces: SCSS 变量 `$ink/$ink-body/$ink-sub/$paper/$card/$gold/$gold-text/$gold-dim/$weak/$weaker/$border/$border-2/$divider/$seal-red/$hot-red/$sticker-yellow/$sticker-orange/$sticker-red/$outline-black`；mixin `@mixin paper-shadow`、`@mixin sticker-shadow($x,$y)`、`@mixin gold-line`；class `.serif`（衬线栈）、`.happy`（快乐体栈）、`.paper-texture`（7px 纸纹线）。后续所有任务的 SCSS 一律引用这些变量，不写裸色值。

- [ ] **Step 1: 写 theme.scss（完整 token 层）**

```scss
/* src/styles/theme.scss — 混血主题 tokens，值与 docs/design/README.md「Design Tokens」一一对应 */
$ink: #2f261a;            // 墨：标题/墨块/仪式按钮
$ink-body: #3d3428;       // 正文
$ink-sub: #5d5142;        // 次级
$paper: #faf4e8;          // 纸面底
$card: #fffdf8;           // 卡片纸
$gold: #b8934e;           // 鎏金
$gold-text: #f0dfb8;      // 金字（墨块上）
$gold-dim: #a3803f;       // 淡金文字
$weak: #a3937a;
$weaker: #b9ac96;
$border: #e0d2b4;
$border-2: #d9c9a6;
$divider: #efe5cf;
$seal-red: rgba(197, 48, 48, .8);
$hot-red: #c53030;
$sticker-yellow: #ffd94a;
$sticker-orange: #ffb020;
$sticker-red: #ff5d5d;
$outline-black: #1f1b16;

$serif-stack: "NotoSerifSC", "Noto Serif SC", "Songti SC", "STSong", serif;
$happy-stack: "ZCOOLKuaiLe", "ZCOOL KuaiLe", "PingFang SC", sans-serif;
$body-stack: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;

@mixin paper-shadow { box-shadow: 0 20rpx 52rpx rgba(120, 90, 40, .08); }
@mixin sticker-shadow($x: 8rpx, $y: 8rpx, $color: $outline-black) { box-shadow: $x $y 0 $color; }
@mixin gold-line { background: linear-gradient(90deg, $gold, #e3c88e, $gold); }

.serif { font-family: $serif-stack; }
.happy { font-family: $happy-stack; }
.paper-texture {
  background-color: $paper;
  background-image: repeating-linear-gradient(
    180deg, rgba(160, 130, 80, .04) 0, rgba(160, 130, 80, .04) 2rpx, transparent 2rpx, transparent 14rpx
  );
}
```

- [ ] **Step 2: app.scss 引入 + 全局底色**：`@import './styles/theme.scss';`，`page { background: $paper; color: $ink-body; font-family: $body-stack; }`
- [ ] **Step 3: `npx jest` 全绿（不应有破坏）+ `npm run build:weapp` 成功**
- [ ] **Step 4: Commit** `git commit -m "feat: 新增混血主题 design tokens 层"`

### Task 2: 字体子集化管线 + 运行时加载（含降级）

**Files:**
- Create: `tools/subset-fonts.mjs`、`tools/font-chars.txt`、`src/utils/themeFonts.ts`、`src/assets/fonts/`（产物）
- Modify: `src/app.ts`（启动时调 `loadThemeFonts()`）、`package.json`（devDependency `fontmin` + script `"subset-fonts": "node tools/subset-fonts.mjs"`）

**Interfaces:**
- Produces: `loadThemeFonts(): Promise<void>` — 加载 NotoSerifSC(900/600) 与 ZCOOLKuaiLe 子集；任一失败静默返回（SCSS 字体栈已含系统衬线 fallback，UI 不裂）。
- 产物形态：`src/assets/fonts/notoSerifSC.ts` 等，内容 `export default 'data:font/woff;base64,...'`；`themeFonts.ts` 用 `Taro.loadFontFace({ global: true, family: 'NotoSerifSC', source: \`url("${base64}")\` })`。

- [ ] **Step 1: `tools/font-chars.txt`** — 收录全部界面用字：三屏与延伸屏所有中文文案（对照 `docs/design/README.md` 逐屏抄录）+ 壹贰叁肆伍陆柒捌玖拾 + 分类名全集（`src/data/defaultFoods.ts` 的 defaultCategories + categoryMeta 小注）+ 常用标点「·《》―‹」。
- [ ] **Step 2: `tools/subset-fonts.mjs`** — fontmin 读 `tools/fonts-src/*.ttf`（字体源文件不入库，脚本头部注释写明下载地址：Noto Serif SC 与 ZCOOL KuaiLe 均在 google/fonts 仓库，OFL 许可），按 font-chars.txt 裁剪 → woff → base64 → 写 `src/assets/fonts/*.ts`；输出体积并在 >1MB 总量时 `process.exit(1)`。
- [ ] **Step 3: `src/utils/themeFonts.ts`** —

```ts
import Taro from '@tarojs/taro'
import notoSerifSC from '../assets/fonts/notoSerifSC'
import zcoolKuaiLe from '../assets/fonts/zcoolKuaiLe'

const FACES = [
  { family: 'NotoSerifSC', source: notoSerifSC },
  { family: 'ZCOOLKuaiLe', source: zcoolKuaiLe },
]

export async function loadThemeFonts(): Promise<void> {
  await Promise.all(FACES.map(face =>
    new Promise<void>(resolve => {
      Taro.loadFontFace({
        global: true,
        family: face.family,
        source: `url("${face.source}")`,
        success: () => resolve(),
        fail: () => resolve(), // 静默降级：SCSS 栈里有系统衬线兜底
      })
    })
  ))
}
```

- [ ] **Step 4: 测试** `src/__tests__/utils/themeFonts.test.ts` — mock Taro.loadFontFace：①两个 face 都调用且 global:true ②fail 回调不抛错（resolve 正常）。先写测试跑 FAIL，再实现跑 PASS。
- [ ] **Step 5: 若本机无法下载字体源文件**：提交管线代码与空产物占位（`export default ''`，loadThemeFonts 对空 source 直接 resolve 跳过），PR 偏差清单里注明「字体待人工跑 subset-fonts」；**不得因此阻塞批次**。
- [ ] **Step 6: `npx jest` + `npm run build:weapp`，Commit** `feat: 字体子集化管线与运行时加载`

### Task 3: 工具函数与分类元数据

**Files:**
- Create: `src/utils/zhNumber.ts`、`src/utils/drawStats.ts`、`src/data/categoryMeta.ts`
- Test: `src/__tests__/utils/zhNumber.test.ts`、`src/__tests__/utils/drawStats.test.ts`、`src/__tests__/data/categoryMeta.test.ts`

**Interfaces:**
- Produces:
  - `toZhNumber(n: number): string` — 1→壹 … 10→拾（超出返回 String(n)）
  - `getDrawCount(): number` / `incrementDrawCount(): number`（storage key `drawCountTotal`，increment 返回新值）
  - `getWeeklyDrawCount(): number` / `incrementWeeklyDrawCount(): number`（storage key `drawCountWeekly`，存 `{weekKey, count}`，weekKey=ISO 年+周，跨周自动清零）
  - `MENU_PRIMARY: string[]`（8 个主分类 key，对应现有分类体系：`['随便','热门推荐','家常下饭','嗦粉吃面','火锅烫涮','烧烤撸串','奶茶续命','深夜食堂']`）
  - `getCategoryDisplay(cat: string): { label: string; note: string }` — 显示名+小注；设计定稿 8 组文案：随便/大厨看着办、热门(=热门推荐)/今日爆款、家常下饭/妈妈味道、嗦粉吃面/一碗入魂、火锅烫涮/咕嘟咕嘟、烧烤撸串/滋滋冒油、奶茶续命/快乐水源、深夜食堂/灯火可亲；延伸分类同调补文案（设计外扩展，PR 注明）：街头小吃/烟火气息、异国风味/环游味蕾、甜品诱惑/就要甜一口、轻食减脂/清爽无负担；未知分类（自定义/后端新分类）fallback `{label: cat, note: '私房甄选'}`。
- [ ] **Step 1: 先写三个测试文件**（每个 util 覆盖：正常值/边界/storage 持久化用 mock Taro storage；weekly 跨周清零用注入 weekKey 参数或 mock Date）→ 跑 FAIL
- [ ] **Step 2: 实现三个模块** → 跑 PASS
- [ ] **Step 3: Commit** `feat: 中文数字/抽签计数/分类元数据工具`

### Task 4: MenuGrid 菜单格组件

**Files:**
- Create: `src/components/MenuGrid/index.tsx`、`src/components/MenuGrid/index.scss`
- Test: `src/__tests__/components/MenuGrid.test.tsx`

**Interfaces:**
- Consumes: `MENU_PRIMARY`、`getCategoryDisplay`（Task 3）
- Produces:

```ts
interface MenuGridProps {
  categories: string[]        // 全量分类（含后端/自定义），组件内部按 MENU_PRIMARY 排前 8，其余折叠进「更多」
  active: string
  loadingCategory: string | null
  onSelect: (cat: string) => void
  onCustomize: () => void     // 「＋ 自定义」入口
}
```

- [ ] **Step 1: 测试先行** — ①渲染 8 个主格 + 标题行「菜单 · 择一挂」+「＋ 自定义」②点击格子触发 onSelect ③active 格有 `menu-cell--active` class ④「更多 ▾」点击后追加渲染剩余分类且箭头 class 翻转 ⑤loadingCategory 格有 loading class → FAIL
- [ ] **Step 2: 实现**。结构：标题行（15px/900 衬线 + 2px $ink 粗底线）→ 3 列 grid（`display:grid; grid-template-columns:repeat(3,1fr); gap:18rpx;` 格高 104rpx，圆角 0）。关键选中态 SCSS（值来自 README §首页-菜单格，勿改）：

```scss
.menu-cell {
  background: $card;
  border: 1px solid $border;
  transition: all .15s ease;
  &:active { transform: scale(.97); }
  &--active {
    background: $ink;
    border-color: $ink;
    box-shadow: inset 0 0 0 1px $gold, inset 0 0 0 3px $ink, inset 0 0 0 4px rgba(184, 147, 78, .5);
    .menu-cell__name { color: $gold-text; }
    .menu-cell__note { color: $gold; }
  }
  &__name { font-family: $serif-stack; font-size: 28rpx; font-weight: 900; letter-spacing: 6rpx; color: $ink; }
  &__note { font-size: 19rpx; letter-spacing: 4rpx; color: $weak; }
}
.menu-more { background: transparent; border: 1px dashed #c9b088; }
```

- [ ] **Step 3: 跑测试 PASS + Commit** `feat: 菜单格组件（御厨墨块选中态+更多展开）`

### Task 5: CountStepper 份数步进器

**Files:**
- Create: `src/components/CountStepper/index.tsx` + `index.scss`
- Test: `src/__tests__/components/CountStepper.test.tsx`

**Interfaces:**
- Consumes: `toZhNumber`（Task 3）
- Produces: `interface CountStepperProps { value: number; min?: number; max?: number; onChange: (v: number) => void }`（默认 min 1 max 10）

- [ ] **Step 1: 测试先行** — 显示中文数字（value=2 → 贰）；∓ 点击回调 onChange(±1)；到边界禁用（value=1 时点 − 不触发）；∓ 按钮容器点击热区 ≥88rpx（padding 撑开，断言 class 存在即可）→ FAIL
- [ ] **Step 2: 实现**：白胶囊（`$card` 底 1px $border-2 圆角 52rpx），「份数」22rpx 标签 + 56rpx 圆形 ∓ + 中文数字 32rpx 衬线
- [ ] **Step 3: PASS + Commit** `feat: 中文数字份数步进器`

### Task 6: 首页重构（静态部分）+ tab bar + 自定义导航

**Files:**
- Modify: `src/pages/index/index.tsx`、`src/pages/index/index.scss`（按新结构重写样式，旧规则删除）、`src/pages/index/index.config.ts`（`navigationStyle: 'custom'`）、`src/app.config.ts`
- Modify: `src/components/DigestCard/index.tsx|scss`（外观改「今日风向」引文条：左 3px $gold 竖线 + rgba(255,253,248,.85) 底 + 22rpx #8d7c60 文字 + 内联书名号《今日风向》；**逻辑不动**）
- Test: 更新 `src/__tests__/pages/` 下受影响的 index 测试 + DigestCard 测试

**Interfaces:**
- Consumes: MenuGrid、CountStepper、`getDrawCount`、theme tokens
- Produces: 首页新版式；**本批仍暂用 useSlotMachine 驱动结果**（批2 才换仪式），「为我定夺」按钮接现有 `handleStart`

- [ ] **Step 1: app.config.ts** —

```ts
tabBar: {
  color: '#b9ac96',
  selectedColor: '#a3803f',
  backgroundColor: '#ffffff',
  list: [
    { pagePath: 'pages/index/index', text: '抽' },
    { pagePath: 'pages/ingredient/ingredient', text: '做' },
  ],
},
darkmode: false,
```

  纯文字 tab（删 iconPath；内置 tabBar 用系统字体渲染，无法衬线 —— 已知偏差，PR 注明；**严禁**为此上 custom-tab-bar）。`src/assets/tab-*.png` 确认无其他引用后删除。
- [ ] **Step 2: index.tsx 重构 JSX**（保留全部现有数据逻辑：useLoad 拉取、AI 缓存、自定义菜单、菜谱弹窗、分享 hooks）。新版式自上而下（规格详见 README §Screens/1，逐条实现）：自定义导航（衬线「到底吃啥哟」居中，注意胶囊避让 `Taro.getMenuButtonBoundingClientRect`）→ 日期行（农历风格「七月十九 · 晚膳时分」：月份用中文月+日、17 点后「晚膳时分」/11–14「午膳时分」/其余「点心时分」；右侧「第 N 次帮你定夺」用 `getDrawCount()`）→ 主视觉「今晚食何」（52px/900 衬线 letter-spacing 8px；有结果时该区域显示结果，样式沿用旧 result-list 但按纸面 token 重配色）→ DigestCard 引文条 → `<MenuGrid …/>`（替换原 categories chip 区；「＋ 自定义」接 `setShowCustomMenu(true)`）→ 底部操作行（`<CountStepper/>` + 为我定夺按钮）。
- [ ] **Step 3: 「为我定夺」按钮 SCSS**（全页唯一贴纸元素，值锁定）：

```scss
.decree-btn {
  flex: 1; height: 108rpx; border-radius: 54rpx;
  background: $ink; border: 5rpx solid $outline-black;
  @include sticker-shadow(8rpx, 8rpx, $sticker-yellow);
  color: $gold-text; font-family: $serif-stack; font-size: 34rpx; letter-spacing: 12rpx;
  display: flex; align-items: center; justify-content: center;
  &::before, &::after { content: ''; width: 40rpx; height: 2rpx; @include gold-line; margin: 0 16rpx; }
}
```

- [ ] **Step 4: 点「为我定夺」时调用 `incrementDrawCount()`**（在现有 handleStart 的包装函数里，滚动被 block 时不计数）。
- [ ] **Step 5: 更新受影响测试**：index 相关测试改断言新结构（MenuGrid 替代 chip、开始按钮文案「为我定夺」、份数中文数字）；DigestCard 测试补外观 class 断言。跑 `npx jest` 全绿。
- [ ] **Step 6: `npm run build:weapp` 成功；开发者工具人工过一眼三态（无结果/单结果/多结果）**
- [ ] **Step 7: Commit** `feat: 首页混血主题重构（日期行/主视觉/菜单格/为我定夺）`

### Task 7: 批1 收口 → PR #1

- [ ] `npx jest`（全绿，数量 ≥184）+ `npm run build:weapp`
- [ ] 自查清单（见文末 PR 契约）逐项过
- [ ] push 分支，开 PR：`feat: 混血主题批1——主题基建与首页`，body 按 PR 契约

---

# 批 2：抽取仪式 + 结果页（分支 `feature/theme-batch2`，基于批1）

### Task 8: useDrawCeremony 状态机 hook

**Files:**
- Create: `src/hooks/useDrawCeremony.ts`
- Test: `src/__tests__/hooks/useDrawCeremony.test.ts`（jest fake timers）

**Interfaces:**
- Produces:

```ts
export type DrawPhase = 'idle' | 'shaking' | 'rising' | 'done'
interface DrawCeremonyOptions {
  count: number
  isBlocked: boolean
  getPool: () => string[] | undefined
  onDone: (results: string[]) => void   // done 后由页面决定跳结果页
}
interface DrawCeremonyReturn {
  phase: DrawPhase
  mainResult: string            // 主签上的菜名（results[0]）
  results: string[]
  startDraw: () => void         // idle → shaking(2000ms) → rising(500ms) → done
  skip: () => void              // shaking/rising 期间点签筒 → 立即 done
  refreshItem: (index: number) => string | null  // 单项换一换（从 pool 去重随机），返回新菜名或 null
  reset: () => void             // 回 idle（「再抽」用）
}
export default function useDrawCeremony(opts: DrawCeremonyOptions): DrawCeremonyReturn
```

  结果选取逻辑从 useSlotMachine 迁移：`n = Math.min(count, pool.length)`，shuffle 后取前 n；refreshItem 沿用旧 handleRefreshItem 的去重规则。timer 须在 unmount 清理；空池 toast「该分类正在加载中，请稍后」。
- [ ] **Step 1: 测试先行**（fake timers）：①startDraw 后 phase=shaking，advanceTimersByTime(2000) → rising，再 500 → done 且 onDone 收到 n 个不重复结果 ②skip 在 shaking 中调用 → 立即 done ③isBlocked 时 startDraw 无效 ④refreshItem 返回值不与其他结果重复 ⑤reset 回 idle ⑥unmount 不泄漏 timer → FAIL
- [ ] **Step 2: 实现 → PASS**
- [ ] **Step 3: Commit** `feat: 抽取仪式状态机 hook`

### Task 9: DrawCeremony 签筒场景组件

**Files:**
- Create: `src/components/DrawCeremony/index.tsx` + `index.scss`
- Test: `src/__tests__/components/DrawCeremony.test.tsx`

**Interfaces:**
- Consumes: `DrawPhase`（Task 8）；emoji 以 props 传入（`emoji: string`，由页面用 Task 10 的 `getFoodEmoji` 求值，本组件不直接依赖）
- Produces: `interface DrawCeremonyProps { phase: DrawPhase; mainResult: string; emoji: string; category: string; servings: number; drawIndex: number; onSkip: () => void }`

- [ ] **Step 1: 测试先行**：①phase 映射到根节点 class（`ceremony--shaking` 等）②点击签筒触发 onSkip ③rising 态渲染主签菜名与 emoji ④文案「随便 · 三份 · 第 128 抽」由 props 拼出（中文数字用 toZhNumber）→ FAIL
- [ ] **Step 2: 实现**。布局规格逐条按 README §Screens/2（木筒 300×344rpx 渐变、竖排「食签」、主签 92×316rpx -8°、陪衬签 -18°/+4°、贴纸角标「手感不错！」-6°、顶部金线 +「御签摇动中」、跳过提示、禁用态底按钮「签落即定 ···」）。动画核心 keyframes（纯 transform，锁定）：

```scss
.ceremony--shaking .tube { animation: tube-shake .34s ease-in-out infinite; }
.ceremony--shaking .stick-group { animation: sticks-jiggle .34s ease-in-out infinite; }
@keyframes tube-shake {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
@keyframes sticks-jiggle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}
.main-stick { transform: translateY(60%) rotate(-8deg); transition: transform .5s cubic-bezier(.34, 1.56, .64, 1); }
.ceremony--rising .main-stick, .ceremony--done .main-stick { transform: translateY(-30%) rotate(-8deg); }
.badge { transform: scale(0) rotate(-6deg); transition: transform .3s cubic-bezier(.34, 1.56, .64, 1) .25s; }
.ceremony--rising .badge, .ceremony--done .badge { transform: scale(1) rotate(-6deg); }
```

- [ ] **Step 3: PASS + `npm run build:weapp` + Commit** `feat: 签筒抽取仪式组件`

### Task 10: foodMeta（emoji + 荤素）

**Files:**
- Create: `src/utils/foodMeta.ts`
- Test: `src/__tests__/utils/foodMeta.test.ts`

**Interfaces:**
- Produces: `getFoodEmoji(name: string): string`（关键词→emoji 映射 ≥40 条：面/粉→🍜 火锅→🍲 烧烤/串→🍢 鸡→🍗 鱼→🐟 虾→🦐 饭→🍚 饺→🥟 奶茶→🧋 蛋糕→🍰 …默认 🍽；最长关键词优先）；`isMeatDish(name: string): boolean`（荤关键词表：肉/鸡/鸭/牛/猪/羊/鱼/虾/蟹/蛋/排骨/培根/火腿…命中即荤）
- [ ] **Step 1: 测试先行**（番茄炒蛋→荤且 emoji 按映射断言；素菜→false；未知菜→默认 emoji）→ FAIL → 实现 → PASS
- [ ] **Step 2: Commit** `feat: 菜名 emoji 与荤素判定`

### Task 11: 首页接入仪式态 + 老虎机退役

**Files:**
- Modify: `src/pages/index/index.tsx`（`ceremonyActive` 期间全屏渲染 DrawCeremony（保留 tab bar），隐藏常规内容；done 后 `onDone` 写交接数据并 `Taro.navigateTo({url:'/pages/result/result'})` 且回 idle）
- Delete: `src/hooks/useSlotMachine.ts` 及其测试（迁移后无引用）
- Test: 更新 index 测试

**Interfaces:**
- Consumes: useDrawCeremony、DrawCeremony
- Produces: **结果页交接契约（Task 12 消费，两边必须一致）**：
  - storage key `lastDrawResult` = `{ foods: string[], category: string, servings: number, pool: string[], drawIndex: number, ts: number }`
  - eventCenter 事件 `'ddcsy:redraw'`：结果页「再抽」触发 → 首页监听（**useEffect 内订阅/清理，不用 useDidShow**）→ navigateBack 已由结果页做，首页收到事件后直接 `startDraw()`
- [ ] **Step 1: 更新 index 测试**：①「为我定夺」→ 仪式 class 出现 ②模拟 done → setStorage 被调 + navigateTo('/pages/result/result') ③eventCenter 'ddcsy:redraw' 触发后重新进入仪式态 → FAIL
- [ ] **Step 2: 实现接线；删 useSlotMachine 与旧滚动样式（index.scss 的 rolling/landed 段）**
- [ ] **Step 3: 全量 jest PASS + build + Commit** `feat: 首页接入抽取仪式，老虎机退役`

### Task 12: 结果页「今晚菜单」

**Files:**
- Create: `src/pages/result/result.tsx`、`result.scss`、`result.config.ts`（`navigationStyle:'custom'`）
- Modify: `src/app.config.ts` pages 增加 `'pages/result/result'`
- Test: `src/__tests__/pages/result.test.tsx`

**Interfaces:**
- Consumes: Task 11 交接契约（storage `lastDrawResult` + eventCenter `'ddcsy:redraw'`）、`toZhNumber`、`getFoodEmoji`、`isMeatDish`、`getWeeklyDrawCount/incrementWeeklyDrawCount`、`getCategoryDisplay`
- Produces: 完整结果页。行为：
  - onLoad 读 `lastDrawResult`（缺失→toast「厨房走神了，再试一次」+ navigateBack）；进入即 `incrementWeeklyDrawCount()`
  - 菜行数量 = foods.length（1–10，>3 时卡内可滚动），序号 `toZhNumber(i+1)`，荤 `#fff3e0` / 素 `#f0f7ec` 圆片 + emoji
  - 「换一换」：从 pool 里去重随机替换该行（逻辑同 refreshItem），行 0.3s 淡出淡入（opacity transition + key 变更）
  - 「再抽」：`Taro.eventCenter.trigger('ddcsy:redraw')` + `Taro.navigateBack()`
  - 「就它了！」：`Button openType='share'`（贴纸橙样式）；useShareAppMessage 文案「今晚吃：{foods.join('、')}」
  - 「查菜谱」：复用 `RecipePopup`（与首页相同的 props 组装，菜谱 fetch 逻辑照抄首页 loadRecipe/handleSwitchFood/handleViewDetail 三函数——三处以上复用时才抽公共 hook，本期两处，允许复制）
  - 「昭告亲友」：同 share Button 的御厨胶囊版
  - 彩蛋行：「本周第 {N} 次听天由命 · 已解锁「干饭锦鲤」」（N≥5 才显示「已解锁」尾巴）
  - 视觉规格逐条按 README §Screens/3：卷轴卡（顶部 3px 金线渐变条、右上「天意如此！」贴纸角标 +4°、居中日期）、卡底印章（84rpx 双圆环 $seal-red、「大厨认证」-12°）、底部双按钮（再抽=御厨白胶囊、就它了=贴纸橙 5rpx 黑边硬阴影 8rpx 8rpx 0 $outline-black）
- [ ] **Step 1: 测试先行**：①storage 有数据 → 渲染 n 行 + 壹贰叁序号 + 荤素 class ②storage 空 → navigateBack ③换一换后该行菜名变化且不与其他行重复 ④再抽触发 eventCenter+navigateBack ⑤彩蛋行 N<5 无解锁尾巴 → FAIL
- [ ] **Step 2: 实现 → PASS**
- [ ] **Step 3: build + Commit** `feat: 结果页今晚菜单（卷轴卡/换一换/印章/彩蛋）`

### Task 13: 批2 收口 → PR #2

- [ ] 全量 jest + build:weapp + 自查清单 + 开发者工具人工走通「定夺→仪式→跳过→结果→换一换→再抽→就它了」全链路
- [ ] PR：`feat: 混血主题批2——抽取仪式与结果页`

---

# 批 3：延伸屏 + 分享卡 + 收尾（分支 `feature/theme-batch3`，基于批2）

### Task 14: 需补状态三件套

**Files:**
- Modify: `src/components/DigestCard/*`（加载中灰条 shimmer 骨架；失败/null 保持整卡不渲染的现有行为）
- Modify: `src/pages/index/index.tsx`、`src/pages/result/result.tsx`（请求失败 toast 统一御厨语气「厨房走神了，再试一次」；空结果兜底文案）
- Test: DigestCard 骨架态断言 + toast 文案断言
- [ ] 测试先行 → 实现 → PASS → Commit `feat: 骨架屏与御厨语气错误态`

### Task 15: 食材页「有啥做啥」主题延伸

**Files:**
- Modify: `src/pages/ingredient/ingredient.tsx` + `ingredient.scss`（**逻辑零改动，纯视觉**）
- Test: 更新受影响断言（class/文案）

按主题铁律延伸（参考 `docs/design/reference.dc.html` 画布 2b/3b）：纸面底+纸纹、区块标题衬线化、食材选择 chip 用御厨卡片态（选中=墨块金线，同 MenuGrid 选中态 token）、主 CTA「开做！」贴纸黄确认类、AI 推荐结果卡御厨纸卡+菜 emoji 允许出现在结果卡、加载更多为御厨胶囊。禁改：API 调用、状态管理、加载更多/额外买菜开关逻辑。
- [ ] 实现 → jest 全绿 + build → Commit `feat: 食材页混血主题延伸`

### Task 16: 弹窗纸面化

**Files:**
- Modify: `src/components/RecipePopup/*`、`src/components/CustomMenuPopup/*`（纯视觉：纸面底/衬线标题/金线分隔/御厨胶囊按钮；交互与 props 不动）
- Test: 更新受影响断言
- [ ] 实现 → PASS → Commit `feat: 菜谱与自定义菜单弹窗纸面化`

### Task 17: 分享卡「御厨手谕」重绘

**Files:**
- Modify: `src/pages/ingredient/ingredient.tsx` 的 Canvas 绘制段（约 L100–230）
- Test: 现有 canvas 相关测试更新（mock 断言绘制调用序列的关键步骤：纸底色 `#faf4e8`、标题「御厨手谕」、壹贰叁菜单行、印章双圆环）

按 reference.dc.html 3e 稿重画：纸底 + 金线边框 + 衬线标题 + 壹贰叁菜名列表 + 右下大厨认证印章（双圆 + 旋转文字用 ctx.rotate）。聊天与朋友圈同一张图（现状保持）。
- [ ] 实现 → PASS → Commit `feat: 分享卡御厨手谕样式重绘`

### Task 18: 版本与文档收尾 → PR #3

- [ ] `package.json` version → **1.9.0**
- [ ] `HANDOFF.md` 当前状态段更新（v1.9.0 混血主题改版、指向本计划）
- [ ] 全量 jest + build:weapp + 自查清单
- [ ] PR：`feat: 混血主题批3——延伸屏/分享卡/收尾`

---

## PR 契约（每批相同）

PR body 必须包含：
1. **变更摘要**（按 Task 列出）
2. **测试结果**：`npx jest` 通过数（前基线 184，只增不减）+ `npm run build:weapp` 结果
3. **设计偏差清单**：与 `docs/design/README.md` 不一致处逐条列出原因（如 tab bar 系统字体、字体子集未跑等）；无偏差写「无」
4. **自查清单**（逐项打勾）：
   - [ ] 无 custom-tab-bar / 无 useDidShow
   - [ ] emoji 只在结果里（按钮/背景零 emoji）
   - [ ] 硬阴影只出现在贴纸元素；倾角只有 ±2°/±6°
   - [ ] 动画只用 transform/opacity
   - [ ] 小按钮热区 ≥88rpx
   - [ ] commit 无 Co-Authored-By
5. **真机验证提示**：列出本批需真机确认项（字体 900 字重渲染 iOS/安卓、仪式动画帧率、胶囊避让）——由用户执行

## 真机最终清单（批3 合并后，人工）

- [ ] iOS + 安卓各过一遍三屏 + 食材页
- [ ] 字体子集加载成功/失败两种情况下的观感
- [ ] 分享卡聊天/朋友圈实图
- [ ] 主包体积 <2MB（开发者工具「代码依赖分析」）
- [ ] 上传体验版 → 提审 v1.9.0
