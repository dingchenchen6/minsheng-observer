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
      "display_name": "教育观察员",
      "avatar_url": "",
      "likes": 3,
      "created_at": "2026-03-16T09:00:00Z"
    }
  ],
  "bullets": [
    {
      "id": "bullet_1",
      "topic": "employment",
      "excerpt": "别把实习经历当成默认门槛",
      "display_name": "求职用户",
      "color": "#ffd56a",
      "mode": "scroll",
      "time_offset": 15
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

## 评论写入接口建议字段

```json
{
  "topic": "education",
  "content": "县中支持政策要更细一点",
  "display_name": "教育观察员",
  "avatar_url": ""
}
```

## 弹幕写入接口建议字段

```json
{
  "topic": "employment",
  "excerpt": "别把实习经历当成默认门槛",
  "display_name": "求职用户",
  "avatar_url": "",
  "color": "#ffd56a",
  "mode": "scroll",
  "time_offset": 15
}
```

## 建议

- 投票接口做频率限制
- 用户级去重在服务端做，不要只依赖前端 `localStorage`
- 评论/弹幕需要审核队列
- 微信登录完成后，把公开昵称与匿名显示策略分开

## 最低安全要求

- 登录、投票、评论、弹幕都只走 `HTTPS`
- 微信 `AppSecret` 只放服务端
- 所有写接口都要求后端签发的短期会话
- 服务端必须记录审计日志
- 评论与弹幕必须具备审核 / 下线能力

## 推荐后端能力

- `rate limit`：按 IP、用户、设备摘要三层限流
- `dedupe`：同用户同题去重或按规则限制重复投票
- `review queue`：评论 / 弹幕先过风险检查
- `audit log`：记录请求时间、请求 ID、用户、动作、结果
- `session rotation`：短期会话 + 可刷新机制

## 与站内页面的配合

- [隐私与合规页](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/privacy.html) 需要同步披露新增的数据项、用途、保留周期与删除方式
- [方法说明页](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/methodology.html) 需要同步更新后端状态与审核边界
- 更完整的服务端方案见：[live-backend-security-blueprint.md](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/docs/live-backend-security-blueprint.md)
