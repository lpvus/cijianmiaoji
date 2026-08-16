# Cloudflare 网站入口域名提示设计

## 目标

网站只展示当前 Cloudflare Pages 正式入口 `https://cijianmiaoji.pages.dev`，不再展示原 Netlify 主站或 `dpdns.org` 备用站。

## 页面变更

- 页脚保留单一“主站”链接，地址改为 `https://cijianmiaoji.pages.dev`。
- “网站入口”弹窗只显示 Cloudflare 主网站。
- 当前站点提示固定为“你当前正在访问主站。”。
- 删除基于 hostname 判断 `dpdns.org` 主站/备用站状态的前端逻辑。

## 范围

不修改学习、登录、Supabase 云同步、共享妙计、PWA 或词库功能，也不添加新的备用域名。

## 验证

- 静态合约确认页面中存在 Cloudflare Pages 地址。
- 静态扫描确认 `cijianmiaoji.netlify.app` 和 `001100.dpdns.org` 不再出现在生产代码中。
- 运行现有合约测试和 JavaScript 语法检查。
- 重新部署后检查首页返回 200，并确认线上页面只展示 Cloudflare 主站入口。
