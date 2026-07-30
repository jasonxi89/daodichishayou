# 交接：混血主题批 3（Task 14–18）

> 接手方：GitHub Copilot ｜ 交接时间：2026-07-28
> 仓库：`~/Documents/personal/daodichishayou`（Taro 4 + React 18 + TypeScript + SCSS 微信小程序）

---

## 一、你接手时的确切状态

```
分支    main @ 3b96a42（工作区干净，已推送）
版本    1.9.1（待上传微信后台）
测试    30 suites / 334 tests 全绿
构建    npm run build:weapp 成功，dist 728K（预算 2MB）
```

批 1（首页纸感改版）和批 2（签筒仪式 + 结果页）都已合并上线路径。**剩下批 3，五个 Task。**

计划文档：`docs/plans/2026-07-20-hybrid-theme-redesign.md`
设计基准：`docs/design/README.md`、`docs/design/reference.dc.html`、`docs/design/screens/*.png`

---

## 二、开工前必读的三条硬约束

### 1. 这是个人项目，不要套企业规范

不要引入 Walmart 设计系统、Living Design、内部平台或任何企业流程。UI 一律以 `docs/design/README.md` 和设计稿为准。

### 2. `npm test` 会先跑构建，这是故意的

`jest.config.ts` 里配了 `globalSetup: '<rootDir>/jest.globalSetup.js'`，每次跑测试都会先 `build:weapp`。

原因：`src/__tests__/tilt-policy.test.ts` 审计的是**编译产物** `dist/**/*.wxss`，不是 SCSS 源码。没有构建它就会红（故意的，不是 skip）。

所以单跑一个测试文件也会有 10 秒左右的构建开销。**别为了提速把这个拆掉。**

### 3. 铁律 4（倾角）有机器强制，改样式前先看

`docs/design/README.md` 的铁律 4 已修订为「默认档位 + 具名例外表」：

- 装饰性倾角只能出现在贴纸角标，取值 ±2° / ±6°
- 例外表穷举列出：角标 +4°、印章 -12°、主签 -8°、陪衬签 -18°/+4°、摇签 ±2°、箭头 180°

`tilt-policy.test.ts` 会扫描编译后的 WXSS，按「文件 + 选择器 + 单条声明的角度序列」做**完全相等**比对。

**你在批 3 里新增或删除任何 `rotate`，这个测试都会红。** 处理方式：

1. 先确认新角度是否符合铁律（装饰性的必须 ±2/±6）
2. 若确实需要例外，**先改 `docs/design/README.md` 的例外表**，再把对应条目加进 `tilt-policy.test.ts` 的 `ALLOWED` 数组
3. 不要图省事直接往 `ALLOWED` 里塞——那等于绕过设计契约

它覆盖 `rotate` / `rotateX` / `rotateY` / `rotateZ` / `rotate3d` / 独立 `rotate` 属性，大小写不敏感，`matrix()` 一律判为不可审计。

---

## 三、工作方式（前两批就是这么做的，请延续）

### 分支与 PR

```bash
git checkout -b feature/theme-batch3   # 基于 main
```

批 3 全部 Task 完成后开**一个** PR：`feat: 混血主题批3——延伸屏/分享卡/收尾`

### 每个 Task 的节奏

**测试先行。** 先写会红的测试，再写实现，跑绿，然后单独 commit。不要攒着一起提交。

### 验证测试真的有牙

写完测试后，**故意打断实现**，确认对应测试变红，再还原。

前两批用这招抓到过好几个假绿测试。例：一个断言「换菜后原菜名消失」的测试，在「直接删掉那一行」的实现下也能通过——它没验证替换菜品真的出现了。

### 门禁

每个 Task 收尾：

```bash
npx jest --runInBand        # 全绿，只增不减（当前基线 334）
npm run build:weapp         # Compiled successfully
npx tsc --noEmit            # 只看 src/ 下的错误
```

注意：`npx tsc --noEmit` 全项目有约 118 个错误，**全部在 `node_modules` 的 Taro 类型定义里**，main 分支同样有。只关心 `^src/` 开头的。

---

## 四、五个 Task

### Task 14：需补状态三件套

**改：**
- `src/components/DigestCard/*` — 加载中显示灰条 shimmer 骨架；失败或 null 时保持「整卡不渲染」的现有行为，不要改
- `src/pages/index/index.tsx`、`src/pages/result/result.tsx` — 请求失败 toast 统一御厨语气「厨房走神了，再试一次」；空结果兜底文案

**测试：** DigestCard 骨架态断言 + toast 文案断言

**Commit:** `feat: 骨架屏与御厨语气错误态`

> 注：结果页已经在用「厨房走神了，再试一次」这句（交接数据缺失时）。检查一下其他地方的 toast 文案是否一致。

---

### Task 15：食材页主题延伸

**改：** `src/pages/ingredient/ingredient.tsx` + `ingredient.scss`

**逻辑零改动，纯视觉。** 明令禁改：API 调用、状态管理、加载更多逻辑、额外买菜开关逻辑。

按主题铁律延伸（参考 `reference.dc.html` 画布 2b/3b）：

- 纸面底 + 纸纹
- 区块标题衬线化
- 食材 chip 用御厨卡片态（选中 = 墨块金线，复用 MenuGrid 选中态 token）
- 主 CTA「开做！」用贴纸黄确认类
- AI 推荐结果卡用御厨纸卡，**菜 emoji 允许出现在结果卡里**（铁律 2 允许「结果」里有 emoji）
- 加载更多改御厨胶囊

**Commit:** `feat: 食材页混血主题延伸`

> `ingredient.scss` 的 `@keyframes wobble` 用了 `0deg / -10deg / 10deg`，在 `tilt-policy.test.ts` 例外表里标着「pre-existing, owned by Task 15」——**就是留给你这一步的**。动它就要同步改例外表，否则守卫会红。若改成符合铁律的 ±2°/±6°，记得把例外条目删掉（守卫会报陈旧条目）。

---

### Task 16：弹窗纸面化

**改：** `src/components/RecipePopup/*`、`src/components/CustomMenuPopup/*`

纯视觉：纸面底 / 衬线标题 / 金线分隔 / 御厨胶囊按钮。**交互与 props 不动。**

**Commit:** `feat: 菜谱与自定义菜单弹窗纸面化`

> **这里有个历史坑。** 批 1 时首页 SCSS 重构误删了这两个弹窗的样式，reviewer 抓出来才补回。现在有 `src/styles/popup-base.scss` 存放共享 mixin，且有 `src/__tests__/components/popup-styles.test.ts` 做样式归属回归。改的时候别再把归属搞乱。

---

### Task 17：分享卡「御厨手谕」重绘

**改：** `src/pages/ingredient/ingredient.tsx` 的 Canvas 绘制段

**实际位置 L103–226**（计划文档写的 L100–230 大致准确，已核实）。

按 `reference.dc.html` 3e 稿重画：

- 纸底 `#faf4e8`（现在是 `#faf7f2`）
- 金线边框
- 衬线标题「御厨手谕」
- 壹贰叁菜名列表（用 `src/utils/zhNumber.ts` 的 `toZhNumber`）
- 右下「大厨认证」印章：双圆环 + 旋转文字用 `ctx.rotate`

聊天与朋友圈同一张图，保持现状。

**测试：** 更新现有 canvas 测试，mock 断言绘制调用序列的关键步骤（纸底色、标题文案、壹贰叁菜单行、印章双圆环）

**Commit:** `feat: 分享卡御厨手谕样式重绘`

> **两个提醒。**
> 1. `ctx.rotate` 是 Canvas 2D API，不是 CSS `transform`，`tilt-policy.test.ts` 扫不到它，也不该扫。印章旋转角度请对齐设计稿的 -12°。
> 2. `ingredient.tsx` 现在 **598 行**，接近 600 行上限。Task 15 和 17 都要改它。建议把 Canvas 绘制逻辑抽成 `src/pages/ingredient/shareCard.ts`——既降行数，又让绘制逻辑可单测。

---

### Task 18：收尾 → PR #3

- [ ] `package.json` + `package-lock.json` 版本号 bump
- [ ] `HANDOFF.md` 当前状态段更新
- [ ] 全量 jest + build:weapp + 自查清单
- [ ] 开 PR

> **计划文档这里写错了。**
>
> Task 18 原文写「version → 1.9.0」，但 **1.9.0 已被批 1 占用**（2026-07-27 上传），**1.9.1 已被批 2 占用**（当前 `package.json`）。
>
> 批 3 请用 **1.9.2** 或 **1.10.0**，跟 Xi 确认一下。别再撞号。

---

## 五、PR 契约（三批相同）

PR body 必须包含：

1. **变更摘要**，按 Task 列出
2. **测试结果**：jest 通过数（当前基线 334，只增不减）+ `build:weapp` 结果
3. **设计偏差清单**：与 `docs/design/README.md` 不一致处逐条列原因；无偏差写「无」
4. **自查清单**，逐项打勾：
   - [ ] 无 custom-tab-bar / 无 useDidShow
   - [ ] emoji 只在结果里（按钮 / 背景零 emoji）
   - [ ] 硬阴影只出现在贴纸元素
   - [ ] 倾角符合铁律 4（含具名例外表）
   - [ ] 动画只用 transform / opacity
   - [ ] 小按钮热区 ≥ 88rpx
   - [ ] commit 无 Co-Authored-By
5. **真机验证提示**：列出需 Xi 人工确认的项

---

## 六、代码里几个你该知道的约定

### 交接契约集中在一处

`src/utils/drawContract.ts` 独占首页↔结果页之间的全部 wire format：两个 storage key、事件名、两个路由、两个 payload 接口。

`src/__tests__/contract.test.ts` 强制「每个字面量有且仅有契约模块声明」。**不要在页面里重新声明这些字符串**，会红。

背景：批 2 复审时发现 `'lastDrawResult'` 和 `'ddcsy:redraw'` 各被声明了两遍，两个页面互不 import，改一处另一处照常编译，只在运行时静默断链。

### 项目禁用 `useDidShow`

历史决定，全项目没有。页面初始化用 `useLoad`，且要加 `loadedRef` 守卫防重入。

### 测试用的 Taro 双替身

`src/__mocks__/taro.ts` 和 `src/__mocks__/components.tsx`。需要新 API 时在这两处加，注意**默认导出和具名导出两块都要加**（批 2 加 `reLaunch` 时漏过一次）。

`ScrollView` 的 mock 会把 `scrollY` 转成 DOM 属性，测试可以断言它。

### 页面测试硬编码字面量而非 import 契约

这是故意的。测试构成独立的第二条腿：契约模块打错字，页面测试也会红。别改成 import。

---

## 七、已知债务，批 3 不用管

- `app.js` 约 290KB，主要是内联 base64 字体
- `npm audit` 95 项（15 critical / 39 high），fontmin 引入。**不要加 `.snyk` 或 `--force` 强修**
- React `act()` 警告若干
- 微信开发者工具模拟器本机跑不起来（`libVersion 3.14.2` 未下载、CGI 登录 41002），真机预览不受影响
- `tilt-policy.test.ts` 剩余风险：若有人删掉 tsx 里的 scss import，产物会含不该有的样式。已评估为不值得用 hermetic build attestation 去封

---

## 八、给 Copilot 的一句话开场

> 我要继续 `~/Documents/personal/daodichishayou` 的混血主题批 3（Task 14–18）。
> 请先读 `docs/HANDOFF-batch3.md`，再读 `docs/plans/2026-07-20-hybrid-theme-redesign.md` 的批 3 段落和 `docs/design/README.md` 的主题铁律。
> 从 main 切 `feature/theme-batch3`，按 Task 14 开始，测试先行，每个 Task 单独 commit。
