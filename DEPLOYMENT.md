# 部署与长期维护

## 现有私有入口

[觅径 · 室内导航实验室](https://indoor-nav-museum-lab.hangyf0225.chatgpt.site) 保持仅站点所有者访问。GitHub Pages 是另一个部署目标，代码库和网页的可见性需要分别确认。

## 独立静态部署

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm test
PAGES_BASE_PATH=/mi-jing-indoor-navigation pnpm build:pages
```

将生成的 `pages-dist` 内容上传到对应网站目录，即可运行。部署到域名根路径时不设置 `PAGES_BASE_PATH`。不能双击本地 HTML 替代 HTTP/HTTPS 服务，因为模型和脚本需要浏览器请求。

静态页面使用与私有版相同的导航组件和模型。`pages-app` 只提供普通浏览器入口；`vite.pages.config.ts` 不加载 Sites、Cloudflare 绑定或身份服务，因此访问不依赖当前对话及本机开发服务器。

## GitHub Pages

1. 在本人 GitHub 账号中创建独立仓库，并明确是否允许公开代码和公开网站。
2. 上传项目源码、模型、原始 MIT 许可和 `.github/workflows/pages.yml`，不要上传 `node_modules`、`.env`、私钥或临时视频。
3. 在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。
4. 向 `main` 提交更新，或在 Actions 中手动运行 Publish indoor navigation。
5. 等待 build 和 deploy 都成功后，以部署结果给出的真实网址为准。

工作流自动读取仓库名作为静态路径前缀。默认使用 Node.js 24 和 pnpm 11.19.0，安装锁定依赖，先检查类型和导航测试，再部署 `pages-dist`。没有设置任何第三方 API 密钥。

GitHub 免费账号通常需公开仓库才能使用 Pages；普通 Pages 网页通常对互联网公开，不能把私有代码仓库等同于私有网页。参见 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 长期访问的边界

代码保存到个人 GitHub 可降低对单个平台和临时对话的依赖，但任何托管服务都不能保证永久不变。请保留本地备份、模型和许可，不删除仓库，维护账号，并在依赖或平台规则变化时重新构建验证。可以把静态输出迁移到其他支持 HTTPS 的静态托管平台。

这仍是虚拟展厅演示，不是现场导航服务。导航状态和生成的视频只保留在当前页面内存中，刷新会清空；需要保留的视频应下载到本地。
