# Cloudflare Worker Prototype

这个目录提供 `民声 2.0` 的实时后端原型骨架，目标是和 GitHub Pages 前端配合，承接：

- 微信登录
- 实时投票
- 评论 / 弹幕提交
- 聚合结果读取

## 快速开始

1. 安装依赖

```bash
cd backend/cloudflare-worker
npm install
```

2. 创建 D1 与 KV

- 建立一个 D1 数据库并把 `database_id` 写入 `wrangler.toml`
- 建立一个 KV namespace 并把 `id` 写入 `wrangler.toml`

3. 初始化数据库

```bash
npx wrangler d1 execute minsheng-observer-live --file=./schema.sql
```

4. 配置密钥

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put WECHAT_APP_SECRET
```

5. 本地开发

```bash
npm run dev
```

## 需要补充的部分

- 微信 `code -> token -> openid` 真实交换
- 管理端审核接口
- 更完整的敏感词与风险规则
- 会话刷新与登出策略
- 更细的异常行为评分

## 站内联动

- 前端配置文件：[data/live_config.json](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/data/live_config.json)
- 接入说明：[docs/live-vote-wechat-setup.md](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/docs/live-vote-wechat-setup.md)
- 安全设计稿：[docs/live-backend-security-blueprint.md](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/docs/live-backend-security-blueprint.md)
