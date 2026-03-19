# 实时投票 / 评论 / 微信登录后端安全设计稿

## 目标

为 `民声 2.0` 提供一套适合静态前端 + 外部轻后端的安全方案，让下面三类能力可以逐步上线：

- 跨设备真实投票
- 评论 / 弹幕提交与审核
- 微信用户登录与会话绑定

前端仍可继续部署在 GitHub Pages，敏感逻辑全部转移到独立后端。

## 推荐架构

### 前端

- GitHub Pages
- 只负责展示、读取聚合结果、发起登录和提交写入请求

### 后端

推荐优先级：

1. Cloudflare Workers + D1 / KV / R2
2. Supabase Edge Functions + Postgres
3. 腾讯云 CloudBase

### 关键边界

- 微信 `AppSecret`、会话签名密钥、审核接口密钥只放在后端
- GitHub Pages 不存任何服务端密钥
- 所有写接口都要求带上后端签发的短期会话

## 数据流

### 1. 登录

1. 前端跳转到后端 `/auth/wechat/start`
2. 后端重定向到微信开放平台授权页
3. 微信回调后端 `/auth/wechat/callback?code=...`
4. 后端完成 `code -> access_token / openid` 交换
5. 后端创建最小化用户记录并签发站内会话
6. 前端只拿到短期会话令牌或安全 Cookie

### 2. 投票

1. 前端读取 `/public/live-state`
2. 用户提交投票到 `/vote`
3. 后端做登录校验、速率限制、重复投票规则判断
4. 后端写入投票明细表与聚合表
5. 前端重新拉取聚合结果

### 3. 评论 / 弹幕

1. 前端提交到 `/comment` 或 `/bullet`
2. 后端做敏感词、长度、频率、重复文本和风险标签检查
3. 高风险内容进入审核队列
4. 仅“通过审核”内容进入公开聚合接口

## 最低安全控制

### 身份与会话

- 只接受后端签发的会话
- 会话有效期建议 `2 小时`
- 支持刷新，但刷新令牌必须仅存后端安全 Cookie
- 会话中只保存：
  - `user_id`
  - `provider`
  - `role`
  - `session_version`

### 传输

- 全站强制 `HTTPS`
- 禁止明文 `HTTP` 回调
- 所有 API 响应都带：
  - `Cache-Control`
  - `Content-Type`
  - `X-Request-Id`

### 写接口保护

- IP + 用户双层限流
- 同一议题 / 同一投票去重规则
- 评论与弹幕加最小提交间隔
- 长文本和重复文本检测
- 请求体大小限制

### 审计

- 记录：
  - 请求时间
  - 请求 ID
  - 用户 ID
  - IP 摘要
  - User-Agent 摘要
  - 操作类型
  - 结果状态
- 审计日志单独存表或单独存储，不和业务表混放

### 数据最小化

- 不保存不必要的实名资料
- 微信登录侧优先只保留：
  - `openid / unionid`
  - `nickname`
  - `avatar_url`
- 如果不需要头像展示，就不要长期存头像 URL

## 数据表示例

### users

- `id`
- `provider`
- `provider_user_id`
- `nickname`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

### sessions

- `id`
- `user_id`
- `session_hash`
- `expires_at`
- `ip_hash`
- `ua_hash`
- `created_at`

### poll_votes

- `id`
- `poll_id`
- `option_id`
- `topic`
- `user_id`
- `ip_hash`
- `created_at`

### comments

- `id`
- `topic`
- `content`
- `display_name`
- `user_id`
- `review_status`
- `risk_score`
- `created_at`

### bullets

- `id`
- `topic`
- `excerpt`
- `user_id`
- `review_status`
- `created_at`

### audit_logs

- `id`
- `request_id`
- `user_id`
- `action`
- `result`
- `ip_hash`
- `ua_hash`
- `created_at`

## API 建议

### 公开读取

- `GET /public/live-state`
- `GET /public/polls/:topic`
- `GET /public/comments?topic=...`
- `GET /public/bullets?topic=...`

公开接口只返回聚合结果和已经通过审核的公开内容。

### 受保护写入

- `POST /vote`
- `POST /comment`
- `POST /bullet`
- `POST /logout`

### 管理 / 审核

- `GET /admin/review-queue`
- `POST /admin/review/:id/approve`
- `POST /admin/review/:id/reject`

管理接口必须单独鉴权，不和普通登录会话共用权限。

## 风险点与应对

### 风险 1：刷票

应对：

- 用户级去重
- IP / 设备节流
- 异常行为评分
- 可疑样本隔离

### 风险 2：评论攻击

应对：

- 敏感词与重复文本过滤
- 审核队列
- 账号封禁与内容下线

### 风险 3：微信登录被伪造

应对：

- 所有 `code` 交换只在后端完成
- 校验 `state`
- 会话签名与过期控制

### 风险 4：隐私披露不足

应对：

- 上线前同步更新站内“隐私与合规”页
- 明确写清：
  - 收集什么
  - 为什么收集
  - 保存多久
  - 如何删除

## 上线前检查清单

- 已备案并可配置微信授权回调域名
- 已配置生产环境 `HTTPS`
- 已准备会话签名密钥与轮换方案
- 已启用限流
- 已启用审计日志
- 已准备审核后台
- 已更新站内隐私披露
- 已完成小规模压测与刷票测试

## 推荐上线顺序

1. 先接只读聚合接口
2. 再接登录
3. 再开放投票写入
4. 最后开放评论 / 弹幕

这样最稳，也最容易定位问题。
