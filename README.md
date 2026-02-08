# 到底吃啥哟

一款跨平台应用，帮助选择困难症的你决定今天吃什么。

## 功能

- 智能推荐：根据你的偏好推荐今天吃什么
- 生成菜单：自动生成菜单方案，告别纠结
- 生成视频：将推荐的美食以短视频形式呈现

## 技术栈

- **框架**: [Taro](https://taro-docs.jd.com/) v4 + React
- **语言**: TypeScript
- **样式**: Sass
- **构建**: Webpack5

## 支持平台

- 微信小程序
- iOS（React Native）
- Android（React Native）
- H5

## 快速开始

```bash
# 安装依赖
npm install

# 微信小程序开发
npm run dev:weapp

# H5 开发
npm run dev:h5

# React Native 开发
npm run dev:rn
```

## 项目结构

```
├── config/               # 编译配置
│   ├── dev.ts
│   ├── index.ts
│   └── prod.ts
├── src/                  # 源代码
│   ├── pages/            # 页面
│   ├── app.config.ts     # 应用配置
│   ├── app.scss          # 全局样式
│   ├── app.ts            # 应用入口
│   └── index.html        # H5 入口
├── types/                # 类型定义
├── package.json
└── tsconfig.json
```

## 构建

```bash
# 微信小程序
npm run build:weapp

# H5
npm run build:h5

# React Native
npm run build:rn
```

## 参考文档

- [Taro 文档](https://taro-docs.jd.com/)
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
