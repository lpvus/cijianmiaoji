# 抖音搜索按设备分流设计

## 目标

调整现有单词抖音搜索行为：电脑浏览器不再尝试唤起抖音客户端，而是直接在新标签页打开抖音网页搜索；手机和平板继续使用现有的 App 优先、网页回退策略。

本设计只修改抖音搜索启动策略及其版本、测试和说明，不改变六类学习页面的按钮、单词显示、登录、Supabase、同步、共享、词库或学习进度行为。

## 设备分类

新增纯函数 `isMobileDouyinDevice(navigatorRef): boolean`，按以下顺序识别手机和平板：

1. `navigator.userAgentData.mobile === true` 时认定为移动设备。
2. `navigator.userAgent` 包含 `Android`、`iPhone`、`iPad`、`iPod` 或 `Mobile` 时认定为移动设备。Android 平板即使不含 `Mobile`，仍会因 `Android` 被识别。
3. `navigator.platform === "MacIntel"` 且 `navigator.maxTouchPoints > 1` 时认定为使用桌面 UA 的 iPad。
4. 其他情况认定为电脑，包括 Windows、macOS、Linux 和触摸屏电脑。

`userAgentData.mobile === false` 不作为电脑的唯一依据，以免把 Android 平板误判为电脑。无法识别的平台默认按电脑处理，直接打开网页。

## 跳转行为

`openDouyinSearch(value, options)` 继续先清理单词并构造完全相同的 App URL 和网页 URL。`options` 新增可注入的 `navigatorRef`，方便确定性测试。

### 电脑

电脑端同步调用：

```text
popup = window.open("", "_blank")
```

调用发生在用户点击事件的同步链路中，以降低被浏览器拦截的概率，并以是否取得真实窗口句柄判断新标签页是否创建成功。取得句柄后，在同源空白页仍可操作时，依次把 `popup.opener` 设为 `null`、在空白文档中安装 `meta[name="referrer"][content="no-referrer"]`，最后调用 `popup.location.replace(webUrl)` 导航到抖音网页。电脑端不会访问 `snssdk1128://`，不会创建 1500ms 定时器，也不会注册 `visibilitychange` 监听器。

不能直接用 `window.open(webUrl, "_blank", "noopener,noreferrer")` 的返回值判断弹窗是否成功，因为 HTML Standard 规定启用 `noopener` 时，即使已创建新浏览上下文也返回 `null`。如果空白窗口调用抛出异常、返回空值，或断开 opener、安装 referrer policy、导航空白窗口中的任何一步失败，则使用 `window.location.assign(webUrl)` 在当前标签页打开同一个网页搜索，确保按钮仍然可用。空白窗口已经创建但后续失败时，先尽力关闭它；即使关闭操作也失败，仍继续当前标签页回退。

### 手机和平板

手机和平板保留现有行为：

1. 先访问 `snssdk1128://search?keyword=<编码后的英文单词>`。
2. 页面约 1500ms 后仍可见时，在当前标签页打开 `https://www.douyin.com/search/<编码后的英文单词>`。
3. 页面在等待期间变为隐藏时取消网页回退。
4. App Scheme 访问立即抛出异常时直接在当前标签页打开网页。

空白单词在所有平台都返回 `{ launched: false }`，不打开窗口、不导航、不创建定时器。

## 接口与兼容性

`js/douyin-search.mjs` 新增导出：

```text
isMobileDouyinDevice(navigatorRef): boolean
```

现有 `normalizeDouyinWord`、`buildDouyinLinks` 和 `openDouyinSearch` 的名称及返回结构保持兼容。浏览器全局 `window.DouyinSearch` 继续提供页面所需的 `buildDouyinLinks` 和 `openDouyinSearch`；六类页面仍通过同一个委托点击路径调用启动器。

## PWA 与版本

因为启动策略位于独立 ES 模块中，必须同时更新缓存标识：

- `index.html` 把模块地址从 `js/douyin-search.mjs?v=1` 升级为 `?v=2`。
- `sw.js` 把缓存名从 `wbm-cache-v9` 升级为 `wbm-cache-v10`。
- Service Worker 预缓存 `./js/douyin-search.mjs?v=2`，保留未修改的 `./js/app.js?v=9`。

这样已安装的 PWA 会获取新的模块地址，不会继续运行旧的“电脑端 App 优先”逻辑。

## 隐私与安全

- 仍只向抖音发送用户点击的完整英文单词，不附加账号、邮箱、Supabase、妙计、学习进度或其他状态。
- 电脑端在同源空白窗口导航前显式把 `popup.opener` 设为 `null`，不给抖音页面原网站窗口控制能力；同时安装 `meta[name="referrer"][content="no-referrer"]`，使随后由 `location.replace` 发起的抖音导航不发送来源页 URL。
- 只有完成上述两项安全准备后才导航空白窗口；准备或导航失败时尽力关闭空白窗口并改用当前标签页回退，不留下未完成安全准备的外部导航。
- 不调用抖音 API，不抓取或嵌入搜索结果。

## 测试

扩展 `tests/douyin-search-contract.mjs`，在修改生产代码前观察失败，并覆盖：

1. Windows/macOS/Linux 桌面环境只调用一次 `window.open("", "_blank")` 预留空白窗口，断开 opener、安装 no-referrer meta 后通过 `location.replace` 打开网页 URL；原学习页不导航，不访问 App Scheme，不创建定时器或监听器。
2. 新标签页被拦截、`window.open` 抛出异常、安全准备失败或空白窗口导航失败时，尽力关闭已创建的空白窗口，并在当前标签页打开网页 URL。
3. Android 手机和平板继续走 App 优先和 1500ms 网页回退。
4. 普通 iPad UA 和 `MacIntel + maxTouchPoints > 1` 的桌面模式 iPad继续按移动设备处理。
5. 页面隐藏时取消移动端网页回退。
6. 空白输入保持完全无副作用。

扩展静态契约，要求模块版本 `v2`、缓存名 `wbm-cache-v10` 和预缓存地址一致。运行全部现有契约、相关语法检查及本地浏览器检查，确认六类按钮仍正常渲染。

## 发布与验收

本地验证通过后，生成与当前生产清单一致的 20 文件发布包，部署到 Cloudflare Pages 项目 `cijianmiaoji`，并推送同一提交到 GitHub `main`。线上验收包括：

- `/`、`/sw.js` 和 `/js/douyin-search.mjs?v=2` 返回 HTTP 200。
- 线上 HTML 加载模块 `v2`，Service Worker 使用缓存 `v10`。
- 电脑浏览器点击按钮直接打开抖音网页新标签页，不出现 App Scheme 尝试。
- 手机或平板仍先尝试抖音 App。

## 非目标

- 不改变按钮位置、样式或六类页面覆盖范围。
- 不改变搜索关键词格式。
- 不为抖音客户端搜索 Scheme 提供额外兼容层。
- 不修改 Supabase、Cloudflare DNS、认证、同步或共享配置。
