# 民声 2.0 / Minsheng Observer

静态发布的中国社会经济议题观察站，使用 GitHub Pages 承载页面，使用 GitHub Discussions/Giscus 承载正式留言，并通过结构化 JSON 驱动热点、证据库、论文卡片与归档检索。

## 站点结构

- `index.html`: 首页，总览热点、来源入口、研究卡片和弹幕墙
- `analysis.html`: 八大议题分析页
- `trends.html`: 热点追踪与历史快照
- `evidence.html`: 证据库 / 辟谣与背景说明
- `discuss.html`: 讨论与弹幕页，承接 Giscus / Discussions
- `archive.html`: 可按关键词与日期检索的归档页
- `polls.html`: 轻投票模块
- `methodology.html`: 方法说明、来源分级与免责声明

## 数据目录

`data/` 下的 JSON 为站点唯一内容源，包括：

- `topics.json`
- `indicators.json`
- `trend_current.json`
- `trend_archive.json`
- `papers.json`
- `sources.json`
- `policy_links.json`
- `discussion_archive.json`
- `social_hot_topics.json`
- `evidence_records.json`
- `polls.json`
- `live_config.json`
- `site_meta.json`

## 自动化

- `scripts/refresh_data.py`: 刷新站点元数据、来源检查时间、热点归档，并尝试用 Crossref/OpenAlex 补充论文元数据
- `scripts/fetch_social_topics.py`: 采用“公开入口直抓 -> RSSHub/代理订阅 -> 人工审核池”三层策略抓取知乎/微博热点；若触发鉴权或访客系统，则保留最近一次成功结果并公开标记抓取状态
- `scripts/export_discussions.py`: 从 GitHub Discussions 导出公开讨论摘录到 `discussion_archive.json`
- `.github/workflows/refresh-data.yml`: 定时刷新数据
- `.github/workflows/export-discussions.yml`: 定时导出讨论归档
- `.github/workflows/deploy-pages.yml`: 部署到 GitHub Pages

## 轻投票

- `data/polls.json`: 存放多议题轻投票、高频建议板和正式反馈入口卡片
- `data/live_config.json`: 存放实时投票/评论后端与微信登录的接入配置位
- 浏览器投票与“本机意见板”都只保存在本地 `localStorage`
- 若希望建议进入站内公开归档，请发到 GitHub Discussions

## 实时互动与微信登录

- 接入说明见 [`docs/live-vote-wechat-setup.md`](docs/live-vote-wechat-setup.md)
- 当前公开 Pages 版本已经预留实时投票、实时弹幕和微信登录配置位
- 但若没有外部后端与微信开放平台参数，公开站点仍会保持 `demo` / `未配置` 状态

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 <http://localhost:8000/>。

## Giscus 配置

`data/site_meta.json` 中保留了 Giscus 配置位。创建仓库并开启 Discussions 后，把以下字段填入即可启用嵌入：

- `giscus.enabled`
- `giscus.repo_id`
- `giscus.category_id`

在此之前，讨论页会显示 Discussions 入口和配置提示，而不是空白区域。
