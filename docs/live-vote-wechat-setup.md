# 实时投票 / 评论 / 微信登录接入说明

## 当前状态

站点已经预留：

- `data/live_config.json`
- 前端实时投票读取/写入接口
- 微信登录入口状态展示
- 讨论页实时弹幕数据接入位

当前 GitHub Pages 公开站点仍处于 `demo` 模式，因为还没有外部实时后端和微信开放平台参数。

## 为什么不能只靠 GitHub Pages 直接做微信登录

需要至少具备：

- 微信开放平台网站应用登录 `AppID`
- 可配置的授权回调域名
- 服务端完成 `code -> token -> user session` 交换
- 安全的投票/评论写入接口

纯静态 Pages 页面无法安全保存服务端密钥，也不能单独完成 OAuth token 交换。

## 推荐接法

### 方案 A

- 前端：继续使用 GitHub Pages
- 后端：Cloudflare Workers / Supabase Edge Functions / 腾讯云 CloudBase
- 数据库：Supabase Postgres / CloudBase 数据库
- 登录：微信开放平台网站应用登录

### 方案 B

- 前端：GitHub Pages
- 后端：自有轻量 API
- 登录：微信开放平台
- 数据：数据库聚合后给站点读取

## `data/live_config.json` 需要填写的字段

```json
{
  "vote_backend": {
    "enabled": true,
    "mode": "live",
    "provider": "custom-api",
    "read_url": "https://your-api.example.com/public/live-state",
    "write_url": "https://your-api.example.com/vote",
    "comment_url": "https://your-api.example.com/comment",
    "bullet_url": "https://your-api.example.com/bullet"
  },
  "wechat_login": {
    "enabled": true,
    "provider": "wechat-open-platform",
    "login_url": "https://your-api.example.com/auth/wechat/start"
  }
}
```

## 读取接口返回格式

前端会读取：

```json
{
  "poll_totals": {
    "poll_education_1": { "a": 12, "b": 8 },
    "poll_health_1": { "a": 4, "b": 9 }
  },
  "comments": [
    {
      "id": "comment_1",
      "topic": "education",
      "content": "希望补充县中支持",
      "created_at": "2026-03-16T09:00:00Z"
    }
  ],
  "bullets": [
    {
      "id": "bullet_1",
      "topic": "employment",
      "excerpt": "别把实习经历当成默认门槛"
    }
  ],
  "user": {
    "id": "wx_user_001",
    "provider": "wechat",
    "nickname": "示例用户"
  }
}
```

## 投票写入接口接收格式

前端会 POST：

```json
{
  "poll_id": "poll_education_1",
  "option_id": "a",
  "topic": "education",
  "created_at": "2026-03-16T09:00:00Z",
  "identity_provider": "wechat"
}
```

## 建议

- 投票接口做频率限制
- 用户级去重在服务端做，不要只依赖前端 `localStorage`
- 评论/弹幕需要审核队列
- 微信登录完成后，把公开昵称与匿名显示策略分开
