# HANDOFF — 到底吃啥哟 · 微信小程序前端
> 跨 agent/IDE 接手文档 | 最后更新: 2026-09-01 | 改动项目后请同步更新此文档

## 项目定位
「到底吃啥哟」帮用户解决"今天吃什么"。核心两块：
- **抽啥吃啥**（首页）：分类随机推荐，老虎机式滚动动画，可选份数生成多结果、单项刷新、查菜谱、微信分享。
- **有啥做啥**（食材页）：输入/选择手头食材 → 后端 AI 推荐菜品 + 详细做法，支持加载更多、额外买菜开关、缺材高亮。

前端为纯展示 + 交互层，所有 AI 与热度数据来自自家后端。AppID: `wx5b37ff3cec339cfb`。

## 当前状态
- **🚩 送审中（2026-09-01）：代码 v1.11.0 已上传微信后台并提交审核**。
  - **⚠️ 后台版本号 ≠ 仓库版本号**：微信后台这一版显示为 **1.9.3**，对应代码实为仓库 **v1.11.0**（`main @ e6c5b8a`，dist 构建于 2026-08-23）。成因：开发者工具上传弹窗的版本号**手填、不读 `package.json`**，默认在上次上传号（1.9.2）基础上 +1。**仓库历史从未存在过 1.9.3** —— 已用 git 全量核验，版本史为 1.9.2 → 1.10.0 → 1.10.1 → 1.10.2 → 1.11.0。查后台「1.9.3」的源码请认准 `e6c5b8a`。
  - 本次送审**一次性覆盖 v1.9.1 / v1.9.2 / v1.10.0 / v1.10.1 / v1.10.2 / v1.11.0 六个版本的全部改动**（此前仅 v1.9.0 于 2026-07-27 上传过）。下方各条目内的「待上传 / 待提审」字样均已被本条取代。
  - 待回填：审核通过日期、是否已发布。若要让两边版本号重新对齐，需在**下一次上传时手动**把弹窗版本号填成与 `package.json` 一致（已提交的版本号无法修改，只能撤回重传）。
- **v1.11.0（依赖清理与 audit 收敛）已合并 main（2026-08-07，PR #8 rebase merge，main=6e87487），已于 2026-09-01 送审（后台号 1.9.3）**：确认仓库仅支持 weapp 后，移除 7 个未被源码或构建配置引用的 Taro 平台插件（alipay / h5 / harmony-hybrid / jd / qq / swan / tt），同步删除非 weapp 的脚手架构建命令、配置段与 README 平台声明；执行非 breaking `npm audit fix`（未用 `--force`、overrides、resolutions 或 audit ignore）。`npm audit` 从 **97（14 critical / 42 high / 39 moderate / 2 low）→ 52（5 critical / 24 high / 23 moderate）**；其中 39 个仅在 devDependency 树，`--omit=dev` 剩余 13 个均来自 Taro 构建链或不进入 weapp 的 H5 Swiper 链。**该组数字是 2026-08-07 合并当时的实测值**；2026-08-23 在同一 commit 上复测为 **56（6 critical / 28 high / 22 moderate）**、`--omit=dev` **14（3 critical / 1 high / 10 moderate）**，依赖树未变，差异来自 npm advisory 库新收录的漏洞，不是代码回退——引用这组数字前请自行复测。验证：**35 suites / 380 tests 全绿**、`^src/` TypeScript 错误仍为 7（新增 0）、weapp `Compiled successfully`、`dist` 748K；清理前后 `diff -r` 为 exit 0（35 个文件字节级一致）。
- **v1.10.2（三项 MINOR 清债）已合并 main（2026-08-07，PR #7 rebase merge）**：`shareCard` 按卡片可用宽度与 `cook_time` 实测宽度动态计算菜名上限，逐字 `measureText` 后以 `…` 截断；食材结果卡与 result 卷轴卡的同源裸色值一并改用语义匹配的 `theme.$border`；result 菜行补齐 0.3s 淡入，并把 key 收窄为「抽取批次 + 槽位 + 菜名」，换菜只重挂变化行、其余行节点保持。新增长/短/刚好贴边菜名及单行重挂回归测试，版本升至 1.10.2。
  - 验证：**35 suites / 384 jest tests 全绿**；`taro build --type weapp` **Compiled successfully in 3.09s**；`dist` **748K**（预算 2MB）；`tsc --noEmit` 的 `^src/` 错误仍为 **7**（既有 TS6133，本次新增 0）。
- **v1.10.1（分类小注接入）已随 2026-09-01 批次送审**：菜单格小字不再统一「私房甄选」——`services/api.ts` 新增 `fetchCategoryNotes()` 接后端 v1.15.0 的 `GET /api/trending/categories/annotated`（note 为 null/空白/结构异常时剔除），首页把后端小注与自定义分类文案合并为 `categoryNotes` 传给 `MenuGrid`，`getCategoryDisplay(category, notes?)` 优先级为 **覆盖表 > 本地手写 meta > 兜底「私房甄选」**；自定义分类固定「你的地盘听你的」（优先级高于后端小注）。接口失败静默降级，不弹 toast。清偿 HANDOFF 里「批2/批3 顺带」的遗留 TODO。
  - 线上抽查：`GET /api/trending/categories/annotated` 返回 15 个分类小注（东南亚→一口入南洋、火锅→围炉咕嘟、点心→蒸的爱你…）。
  - 踩坑记录：`index.test.tsx` / `index-data.test.tsx` 用 `jest.mock('../../services/api', ...)` **整体替换模块**，新增 API 函数必须同步补进这两处 mock，否则 `useLoad` 里调用未定义函数会静默打断后续 mount 逻辑（表现为不相干的 9 个用例失败）。
- **v1.10.0（查菜谱链路恢复，issue #4）已合并 main（2026-08-07，PR #5 rebase merge，main=329c1b1），已随 2026-09-01 批次送审**：result 页每道菜「菜谱」入口（墨线按钮，88rpx 热区）→ `pages/recipe`；详情页全套旧橙色重写为 theme tokens、三态落纸面纹理、config 底色 #faf4e8；**RecipePopup 已删除**（裁决：独立页面功能更全且无安卓弹窗滚动坑），popup 测试收敛 CustomMenuPopup-only；新增 recipe-styles.test.ts 源码审计；删 pretest 重复构建（npm test 提速 ~25s）。验证：35 suites / 365 tests 全绿、build:weapp 成功。**真机待验**：result 行内双按钮窄屏不挤压、详情页观感、入口跳转。
- **v1.9.2（混血主题批 3）已合并 main（2026-08-07，PR #3 rebase merge，main=6002da4），已随 2026-09-01 批次送审**：合并前经两轮独立深审（7/30 双路 + 8/6 独立复审）均零 CRITICAL/MAJOR。复审 MINOR 备忘**已全部清偿**：pretest 与 jest.globalSetup 重复构建已于 v1.10.0 清理；shareCard `dish.name` 截断、ingredient.scss:370 裸 hex、result 页「换一换」淡入已于 v1.10.2 清理。DigestCard 加载骨架 + 御厨语气错误态与空结果兜底（`src/utils/toastCopy.ts` 集中文案）；食材页「有啥做啥」混血主题延伸（纸面底 / 衬线区块标题 / 墨块金线选中态 / 贴纸黄「开做！」CTA / 御厨纸卡结果卡）；菜谱与自定义菜单弹窗纸面化；分享卡按 3e 稿重绘为「御厨手谕」并抽出 `src/pages/ingredient/shareCard.ts`。
  - 上传前验证：**34 suites / 363 jest tests 全绿**、`build:weapp` Compiled successfully、`dist` 740K（预算 2MB）、`npx tsc --noEmit` 的 `^src/` 错误仍为 7（本批新增 0）。
  - 批 3 删除了加载态装饰 emoji（🤔）与空态装饰 emoji（🤷），并清理了 `tilt-policy.test.ts` 里 `@keyframes wobble` 的三条陈旧例外；该债务由 Task 15 承接并已清偿。
  - Canvas 分享卡此前零测试覆盖：`src/__mocks__/taro.ts` 的 `createSelectorQuery` 恒返回 `[null]`，绘制代码在测试中从未执行；本批补齐了 `shareCard` 单测与管道集成测试。
  - `RecipePopup` 目前未被任何页面 import，样式不进 `dist`；已按规格纸面化但无法真机验证，本批未接线（属逻辑改动）。
  - 版本号说明：1.9.0 / 1.9.1 已被批 1 / 批 2 占用，批 3 取 1.9.2；计划文档 Task 18 写的「bump → 1.9.0」已过时。
- **v1.9.1（混血主题批 2）已随 2026-09-01 批次送审**：对应 `main @ ab9d454`（PR #2 squash merge）；签筒抽取仪式取代老虎机（`useDrawCeremony` + `DrawCeremony`）、新增结果页「今晚菜单」（卷轴卡 / 换一换 / 印章 / 本周彩蛋）、`foodMeta` 三态荤素判定、交接契约常量收敛到 `drawContract.ts`。上传前验证：**30 suites / 334 jest tests 全绿**、`build:weapp` 成功、官方 CLI Preview 610.8 KB、真机扫码走通全链路（定夺→仪式→跳过→结果→换一换→再抽→就它了）。
  - 版本号说明：1.9.0 已于批 1 占用，故批 2 取 1.9.1。计划文档 Task 18 写的「bump → 1.9.0」已过时，批 3 收尾时需另定号。
  - 铁律 4（倾角）已修订为「默认档位 ±2°/±6° + 具名例外表」，Owner 裁决保留现有视觉（角标 +4°、印章 -12°）。`tilt-policy.test.ts` 审计编译产物强制执行，`jest.globalSetup.js` 保证任何入口都先构建。
- **v1.9.0（混血主题批 1）已于 2026-07-27 上传微信后台**：对应 `main @ e67eb70`；首页御厨纸感改版（design tokens、字体子集、MenuGrid、中文数字份数、为我定夺 CTA、双行 tab）。上传前验证：229 jest tests 全绿、`build:weapp` 成功、官方 CLI Preview 成功、真机扫码可用。**抽取交互仍为老虎机**，签筒仪式与结果页属于批 2。
- v1.8.0 已于 2026-07-20 审核通过并发布上线（零等待改造：投机预取、两段式 quick/steps、NDJSON 流式步骤、静默本地降级；2026-07-18 提审）。
- 发布日线上抽查（API 侧）：health 返回 1.14.1 ✓；`POST /api/recommend/quick` 预生成命中 0.07s ✓；`POST /api/recommend/steps` NDJSON 流 0.11s 返回完整做法（命中缓存）✓。降级场景为纯前端行为，已由审核前真机回归覆盖。
- `feature/zero-wait` 已合并回 main 并推送（merge commit `31a5aea`）。
- 测试 **229 jest tests** 全绿；`build:weapp` 可正常构建。
- **本机开发者工具模拟器无法运行本项目**：`libVersion 3.14.2` 本机未下载（仅有 3.15.2/3.15.3）且开发者工具 CGI 登录报 41002，导致 Node 层 `ERR_INVALID_ARG_TYPE` 与 `routeTo appLaunch timeout`。属环境问题，**真机不受影响**；本机可在 `project.private.config.json` 里覆盖 `libVersion`（该文件已改为本地私有、不入仓）。
- 后端配套 v1.14.1：菜谱步骤 LLM 补写已完成（653/656 条），465 组合矩阵 2026-07-20 手动一次性铺满（此前每日 03:30 cron 铺 120）。

## 技术栈与结构
Taro **4.1.11** + React **18** + TypeScript + Sass；测试 jest + ts-jest + @testing-library/react。

```
config/                dev.ts / prod.ts / index.ts —— 用 defineConstants 注入全局常量 API_BASE
src/
  app.config.ts        页面注册 + 内置 tabBar（抽啥吃啥 / 有啥做啥）+ lazyCodeLoading
  app.ts / app.scss    应用入口
  pages/
    index/             首页（抽啥吃啥），index.tsx 已拆分瘦身
    ingredient/        食材页（有啥做啥），AI 配菜
      shareCard.ts     「御厨手谕」Canvas 分享卡纯绘制函数
    recipe/            菜谱详情页（URL params 传 difficulty/cook_time）
    result/            结果页（今晚菜单）
  components/          CountStepper / CustomMenuPopup / DigestCard / DrawCeremony / MenuGrid / RecipePopup
  hooks/               useDrawCeremony.ts（签筒抽取仪式状态机）
  services/api.ts      后端接口封装（trending/categories/health/recommend/recipes/digest…）
  data/                recipes.ts（RecipeOut→Recipe 映射 + 硬编码菜谱）/ defaultFoods.ts（硬编码食物）
  utils/toastCopy.ts   御厨语气 toast / 空结果文案集中定义
  styles/popup-base.scss 弹窗纸面基础 mixin
  styles/theme.scss    全局混血主题 token 与字体
  __tests__/           与源文件对应的测试；__mocks__/ 有 taro/components mock
  native-tab-bar/      历史遗留 copy:tabbar 素材，当前未启用（用内置 tabBar）
```

后端 API 地址由 `API_BASE` 常量注入，按环境切换：
- 生产：`https://food.zuitian.ai`（config/prod.ts）
- 开发：`http://192.168.1.64:8900`（config/dev.ts，NAS 内网）

## 常用命令
```bash
npm run dev:weapp     # 开发模式（build:weapp --watch）
npm run build:weapp   # 生产构建，产物在 dist/
npx jest              # 跑测试（package.json 的 test 脚本是 jest --coverage）
```
预览：微信开发者工具「导入项目」选仓库根目录，编译后加载 `dist/`。改代码后需在开发者工具**重新编译**才生效。

## 约定与坑
- **不用 custom-tab-bar**，用微信内置 tabBar（`app.config.ts` 不加 `custom:true`，高亮框架自管）。custom 方案 6 种试法在真机全部失败过，是微信+Taro 已知经典坑。
- **不要在页面组件用 `useDidShow`**：jest 里会静默崩测试（空错误消息，全量崩溃）。
- **真机与开发工具行为常不一致**：开发工具正常不代表真机正常，改交互后务必真机验证。
- **API 失败静默降级**：接口挂了不弹错，回落到 `data/defaultFoods.ts` / `data/recipes.ts` 的硬编码数据，保证可用。
- **版本号每次功能更新必须 bump**：`package.json` 的 `version`，遵循 semver。
- **`rpx` 与 `vh` / `vw` 不可互换**：`rpx` 按屏幕宽度换算，`vh` / `vw` 按视口换算；做 `px → rpx` 统一时不要顺手替换视口单位。批 3 review 曾抓到弹窗抽屉 `max-height: 70vh` 被换成固定 `1120rpx`，会在矮宽屏上顶穿视口；`popup-styles.test.ts` 已加守卫。
- **新增 API 函数必须同步补进页面测试的 `jest.mock`**：`src/__tests__/pages/index.test.tsx` 与 `index-data.test.tsx` 用工厂形式整体替换 `services/api` 模块，漏补新函数会让 `useLoad` 调到 undefined 而静默打断 mount 后续逻辑，报错指向完全不相干的用例。
- **git commit 不加 Co-Authored-By 行**，commit message 用 `type: 描述` 祈使句。
- 上传压缩（es6/postcss/minified）已在 v1.7.0 于 project.config.json 开启。

## 进行中 / TODO
**混血主题改版（→ v1.9.0）批1 已合并 main（2026-07-20，PR #1 rebase merge）**：主题 token 层、字体子集管线（真实产物 ~199KB）、MenuGrid（含展开限高内滚）、CountStepper、首页重构、tab 双行（衬线大字 PNG 图标 + 小字，未用 custom-tab-bar）。计划 `docs/plans/2026-07-20-hybrid-theme-redesign.md`，批2（抽取仪式+结果页）、批3（延伸+分享卡+版本 bump）待 Codex 执行。
- **TODO（批2/批3 顺带）**：~~菜单格小字 fallback「私房甄选」重复感强~~ **已于 v1.10.1 完成**：① 后端 `GET /api/trending/categories/annotated`（v1.15.1 已上线）已由 `fetchCategoryNotes()` 接入，`getCategoryDisplay` 优先用后端 note ② 自定义分类固定「你的地盘听你的」
- **真机待验证（批1 合并时未逐项确认）**：tab 双行效果与图标清晰度（如糊升 2x）、反馈钮 bottom 300rpx 新位置、菜单展开滚动手感
- 零等待改造已收尾：v1.8.0 于 2026-07-20 发布，线上抽查通过。发布后留意小程序后台「运维中心」反馈。

**已知非阻塞告警**：Jest 仍有历史 React `act(...)` warning；npm audit 报告 52 个依赖漏洞（5 critical / 24 high / 23 moderate）。其中 39 个为 devDependency-only；`npm audit --omit=dev` 的 13 个（3 critical / 10 moderate）仍由 Taro 4.1.11 的构建依赖及仅供 H5 的 `swiper` 传递链触发，未发现对应漏洞模块进入 weapp `dist`。非 breaking `npm audit fix` 已执行至无进一步变更；未使用 ignore、`--force` 或依赖覆盖掩盖，余项需等待 Taro 上游升级并做大版本兼容验证。Taro 自带的 `types/index.d.ts` 会无条件引用各平台 shim；清理后曾有 7 条 `node_modules` TS2688，其中 weapp / h5 / rn 3 条在清理前已存在，移除依赖实际新增 alipay / jd / swan / tt 4 条。现已启用 `"skipLibCheck": true`，将 `node_modules` 声明噪音从 101 条降为 0、TS2688 从 7 条降为 0，同时 `^src/` 的 7 条 TS6133 原样保留，未掩盖业务源码类型问题。`tsc --noEmit` 仍预期 exit 2，原因是这 7 条既有 src TS6133 加上 `config/` 的 1 条既有 TS6198，与 `skipLibCheck` 无关；本次刻意不处理 config TS6198，避免范围继续蔓延。

**审核上线前 · 代码质量清单**（微信包体/性能门槛）：
- [x] 分包加载评估：**经实测判定无需执行**——完整 `dist` 748K（2M 上限的 36.5%），全部 `dist/pages` 156K，recipe 仅 20K；拆包收益小于跳转与首次加载成本。
- [x] 图片上 CDN 评估：**经实测判定无需执行**——运行时仅打包 4 个 tab PNG，内容共 6,495 bytes（`dist/assets` 占盘 16K），最大 2,062 bytes，远低于 200K 门槛；`docs/` 内设计截图不进入产物。
- [x] 用时注入评估：**经实测判定不实施**——Taro 将页面统一映射到仅约 0.2K 的 `comp` 包装组件，placeholder 无法拆出 290K 的 `app.js`；该包主要受约 195K 内嵌字体源影响，配置占位收益不明确且有首屏替换风险。
- [x] 依赖清理：移除 7 个未使用的非 weapp 平台插件与 48 个传递包，执行安全 audit fix，并用构建产物字节级一致性验证。
- [x] 启用 `lazyCodeLoading: 'requiredComponents'`（已完成）。

**功能增强**（未排期）：
- [ ] 去点外卖：跳转美团/饿了么小程序深链（按钮已从 UI 移除，待实现再加回）。
- [ ] 附近功能：LBS 定位 + 地图 API。
- [ ] 用户历史记录（本地或云端）。
- [ ] 食物封面图（爬虫抓图或图片 API）。

## 相关资源
- 前端仓库：https://github.com/jasonxi89/daodichishayou
- 后端仓库（本地）：`C:\Users\goodb\daodichishayou-backend` —— FastAPI + SQLite，部署在极空间 NAS Docker（`192.168.1.64:8900` / 外网 `https://food.zuitian.ai`）。
- Memory 知识库（可能滞后，以仓库实况为准）：
  - `daodichishayou_progress.md` —— 完整开发进度 / 版本记录 / 前后端联调。
  - `wechat_mistakes.md` —— 小程序踩坑（TabBar、useDidShow 等）。
  - `wechat_tabbar_lessons.md` —— custom-tab-bar 失败详细复盘。
