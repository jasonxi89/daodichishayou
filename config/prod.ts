import type { UserConfigExport } from "@tarojs/cli"

export default {
  defineConstants: {
    API_BASE: JSON.stringify('https://food.zuitian.ai'),
  },
  mini: {}
} satisfies UserConfigExport<'webpack5'>
