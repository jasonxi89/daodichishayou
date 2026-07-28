# HANDOFF — 到底吃啥哟 · 微信小程序前端
> 跨 agent/IDE 接手文档 | 最后更新: 2026-07-27 | 改动项目后请同步更新此文档

## 项目定位
「到底吃啥哟」帮用户解决"今天吃什么"。核心两块：
- **抽啥吃啥**（首页）：分类随机推荐，老虎机式滚动动画，可选份数生成多结果、单项刷新、查菜谱、微信分享。
- **有啥做啥**（食材页）：输入/选择手头食材 → 后端 AI 推荐菜品 + 详细做法，支持加载更多、额外买菜开关、缺材高亮。

前端为纯展示 + 交互层，所有 AI 与热度数据来自自家后端。AppID: `wx5b37ff3cec339cfb`。

## 当前状态
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
    recipe/            菜谱详情页（URL params 传 difficulty/cook_time）
  components/          DigestCard（今日风向卡）/ FoodDecorIcons / CustomMenuPopup / RecipePopup
  hooks/               useSlotMachine（老虎机滚动动画逻辑）
  services/api.ts      后端接口封装（trending/categories/health/recommend/recipes/digest…）
  data/                recipes.ts（RecipeOut→Recipe 映射 + 硬编码菜谱）/ defaultFoods.ts（硬编码食物）
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
- **git commit 不加 Co-Authored-By 行**，commit message 用 `type: 描述` 祈使句。
- 上传压缩（es6/postcss/minified）已在 v1.7.0 于 project.config.json 开启。

## 进行中 / TODO
**混血主题改版（→ v1.9.0）批1 已合并 main（2026-07-20，PR #1 rebase merge）**：主题 token 层、字体子集管线（真实产物 ~199KB）、MenuGrid（含展开限高内滚）、CountStepper、首页重构、tab 双行（衬线大字 PNG 图标 + 小字，未用 custom-tab-bar）。计划 `docs/plans/2026-07-20-hybrid-theme-redesign.md`，批2（抽取仪式+结果页）、批3（延伸+分享卡+版本 bump）待 Codex 执行。
- **TODO（批2/批3 顺带）**：菜单格小字 fallback「私房甄选」重复感强 → ① **后端已就绪（v1.15.1 已上线）**：`GET /api/trending/categories/annotated` 返回 `{categories:[{name,note}]}`（note 可能 null，需兜底），前端接入并让 `getCategoryDisplay` 优先用后端 note ② 自定义分类小字固定「你的地盘听你的」（纯前端）
- **真机待验证（批1 合并时未逐项确认）**：tab 双行效果与图标清晰度（如糊升 2x）、反馈钮 bottom 300rpx 新位置、菜单展开滚动手感
- 零等待改造已收尾：v1.8.0 于 2026-07-20 发布，线上抽查通过。发布后留意小程序后台「运维中心」反馈。

**已知非阻塞告警**：Jest 仍有历史 React `act(...)` warning；npm audit 报告 86 个依赖漏洞（14 critical / 32 high），未使用 ignore 或强制 audit fix 掩盖，需单独评估 Taro 依赖升级兼容性。

**审核上线前 · 代码质量清单**（微信包体/性能门槛）：
- [ ] 分包加载：把 recipe 页拆到子包，减小主包体积（主包限制 2M）。
- [ ] 图片上 CDN：>200K 图片不打包，改网络加载。
- [ ] 用时注入：为自定义组件配置占位组件（placeholder），延迟到渲染时注入。
- [ ] 依赖清理：微信开发者工具「代码依赖分析」排查未用依赖/文件。
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
