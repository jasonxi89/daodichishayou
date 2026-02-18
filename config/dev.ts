import type { UserConfigExport } from "@tarojs/cli"

export default {
   logger: {
    quiet: false,
    stats: true
  },
  defineConstants: {
    API_BASE: JSON.stringify('http://192.168.1.64:8900'),
  },
  mini: {},
  h5: {}
} satisfies UserConfigExport<'webpack5'>
