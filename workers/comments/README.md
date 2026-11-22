# 匿名留言

Astro 站点继续部署到 GitHub Pages。Cloudflare Worker 按页面读取 D1 中的留言，提交时用免费的 `glm-4.7-flash` 审核昵称和正文，通过后才写入 D1。`GLM_API_KEY` 只由 Worker 读取。旧的 GitHub Discussions 留言可从评论区底部的存档链接访问。

## 本地运行

从仓库根目录执行以下命令。GLM 密钥可放在本机的 `workers/comments/.dev.vars`，格式为 `GLM_API_KEY=实际密钥`。该文件已被 Git 忽略。没有密钥时仍可读取留言，提交会提示审核服务不可用。

```sh
wrangler d1 migrations apply DB --local --config workers/comments/wrangler.toml
wrangler dev --config workers/comments/wrangler.toml --var SITE_ORIGIN:http://localhost:4321 --port 8787
```

另开终端执行 `npm run dev -- --port 4321`，访问 `http://localhost:4321/changshi/`。使用其他开发端口或主机名时，修改 `SITE_ORIGIN` 使它与 Astro 的地址一致。

## 部署

在已完成 `wrangler login` 的 Windows 终端，可以从仓库根目录运行 `powershell -ExecutionPolicy RemoteSigned -File .\workers\comments\deploy.ps1`。脚本复用或创建同名数据库、应用迁移、部署 Worker，再从 Windows 环境读取 `GLM_API_KEY` 写入 Cloudflare Secret。审核通过和拒绝各验证一条，并隐藏测试留言。成功后复制输出的 `PUBLIC_COMMENTS_API`，接着完成下方第 3 步。

后端已部署时，给脚本加上 `-VerifyEndpoint <完整留言接口 URL>` 可单独运行验收。

1. 登录 Cloudflare 后，运行 `wrangler d1 create zhumen-comments --config workers/comments/wrangler.toml`。把返回的 `database_id` 填入 `wrangler.toml` 的 D1 绑定。
2. 应用 D1 迁移并部署 Worker。

   ```sh
   wrangler d1 migrations apply DB --remote --config workers/comments/wrangler.toml
   wrangler deploy --config workers/comments/wrangler.toml
   wrangler secret put GLM_API_KEY --config workers/comments/wrangler.toml
   ```

3. 运行 **Deploy Astro site to GitHub Pages** 工作流。当前默认接口在工作流的 `PUBLIC_COMMENTS_API` 中配置。换用其他后端时，可以在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 设置同名变量来覆盖。

构建时将 `PUBLIC_COMMENTS_API` 留空会使用 Giscus。回退时清空工作流中的默认值以及仓库同名变量，然后重新部署 Pages。

## 站长管控

登录 Cloudflare，打开 **D1 SQL Database → zhumen-comments → Console**。在控制台执行相应语句。权限由 Cloudflare 账号管理。

| 操作 | SQL |
| --- | --- |
| 找到最近的留言与编号 | `SELECT id, page, hidden, name, body, created_at FROM comments ORDER BY id DESC LIMIT 30;` |
| 隐藏第 123 条留言 | `UPDATE comments SET hidden = 1 WHERE id = 123;` |
| 恢复第 123 条留言 | `UPDATE comments SET hidden = 0 WHERE id = 123;` |
| 暂停全站新留言 | `UPDATE comment_settings SET posting_enabled = 0 WHERE id = 1;` |
| 恢复全站新留言 | `UPDATE comment_settings SET posting_enabled = 1 WHERE id = 1;` |

把示例编号 `123` 换成要处理的留言编号。隐藏保留原文，可以随时恢复。暂停只影响新提交，在途审核也会检查开关。审核拒绝时，访客会看到「内容违规，留言未发布。请修改后重试。」审核服务异常会提示稍后再试。
