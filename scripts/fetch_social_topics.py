#!/usr/bin/env python3
"""Best-effort fetcher for Zhihu/Weibo hot topics with layered fallback."""

from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
USER_AGENT = 'minsheng-observer-social-fetch/2.1 (+https://github.com/dingchenchen6/minsheng-observer)'
DEFAULT_RSSHUB_BASES = ['https://rsshub.app']
RSSHUB_ROUTES = {
    'zhihu': '/zhihu/hot',
    'weibo': '/weibo/search/hot/fulltext',
}
TOPIC_KEYWORDS = {
    'employment': ['就业', '求职', '招聘', '毕业', '失业'],
    'healthcare': ['医保', '医疗', '就医', '医院', '门诊'],
    'housing': ['住房', '房价', '租房', '保障房', '城中村'],
    'technology': ['ai', '人工智能', '大模型', '科技', '算法'],
    'elderly': ['退休', '养老', '老龄', '照护'],
    'food': ['食品', '预制菜', '外卖', '抽检', '12315'],
    'education': ['教育', '高考', '学校', '升学', '分流'],
    'livelihood': ['民生', '收入', '消费', '社保'],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_label() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def load_json(name: str):
    with open(DATA / name, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def save_json(name: str, payload):
    with open(DATA / name, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def http_get(url: str, headers: dict[str, str] | None = None):
    request = Request(
        url,
        headers={
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
            **(headers or {}),
        },
    )
    with urlopen(request, timeout=20) as response:
        return response.read().decode('utf-8', errors='ignore')


def infer_topic(text: str) -> str:
    lowered = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return topic
    return 'livelihood'


def normalize_summary(text: str) -> str:
    stripped = re.sub(r'<[^>]+>', ' ', text or '')
    stripped = re.sub(r'\s+', ' ', stripped).strip()
    return stripped[:140] if stripped else '公开热榜条目摘要。'


def get_rsshub_bases() -> list[str]:
    raw = os.environ.get('RSSHUB_BASES', '')
    bases = [item.strip().rstrip('/') for item in raw.split(',') if item.strip()]
    return bases or DEFAULT_RSSHUB_BASES


def get_source(payload: dict, source_id: str) -> dict | None:
    for source in payload.get('feed_sources', []):
        if source.get('id') == source_id:
            return source
    return None


def update_feed_source(payload: dict, source_id: str, status: str, note: str, *, last_attempt: str | None = None, last_success: str | None = None, url: str | None = None):
    source = get_source(payload, source_id)
    if not source:
        return
    source['status'] = status
    source['note'] = note
    if last_attempt is not None:
        source['last_attempt'] = last_attempt
    if last_success is not None:
        source['last_success'] = last_success
    if url is not None:
        source['url'] = url


def update_layer(payload: dict, layer_id: str, status: str, label: str, detail: str):
    for layer in payload.get('strategy_layers', []):
        if layer.get('id') == layer_id:
            layer['status'] = status
            layer['label'] = label
            layer['detail'] = detail
            break


def mark_platform(payload: dict, platform: str, status: str, label: str, note: str, *, success: bool = False):
    current = payload.get('platform_status', {}).get(platform, {})
    payload['platform_status'][platform] = {
        'status': status,
        'label': label,
        'note': note,
        'last_attempt': now_iso(),
        'last_success': now_iso() if success else current.get('last_success', ''),
    }


def replace_platform_items(payload: dict, platform: str, items: list[dict]):
    payload['items'] = [item for item in payload.get('items', []) if item.get('platform') != platform] + items


def parse_rss_items(raw: str, platform: str, fallback_url: str, fetch_status: str) -> list[dict]:
    root = ET.fromstring(raw)
    items = []
    for index, node in enumerate(root.findall('.//item')[:8], start=1):
        title = (node.findtext('title') or '').strip()
        link = (node.findtext('link') or '').strip() or fallback_url
        description = normalize_summary(node.findtext('description') or '')
        if not title:
            continue
        items.append({
            'id': f'{platform}_{fetch_status}_{index}',
            'platform': platform,
            'title': title,
            'summary': description,
            'topic': infer_topic(f'{title} {description}'),
            'heat': max(60, 100 - index * 4),
            'url': link,
            'snapshot_date': today_label(),
            'fetch_status': fetch_status,
        })
    return items


def try_fetch_zhihu_direct(payload: dict) -> bool:
    try:
        raw = http_get('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10&desktop=true')
        data = json.loads(raw)
        items = []
        for index, entry in enumerate(data.get('data', [])[:8], start=1):
            target = entry.get('target', {})
            title = target.get('title') or entry.get('detail_text')
            if not title:
                continue
            summary = target.get('excerpt') or target.get('detail_text') or '知乎公开热榜抓取结果。'
            items.append({
                'id': f'zhihu_live_{index}',
                'platform': 'zhihu',
                'title': title,
                'summary': normalize_summary(summary),
                'topic': infer_topic(f'{title} {summary}'),
                'heat': max(60, 100 - index * 4),
                'url': target.get('url') or 'https://www.zhihu.com/hot',
                'snapshot_date': today_label(),
                'fetch_status': 'live',
            })
        if items:
            replace_platform_items(payload, 'zhihu', items)
            update_feed_source(payload, 'zhihu_direct', 'ok', '知乎公开 API 返回成功。', last_attempt=now_iso(), last_success=now_iso())
            mark_platform(payload, 'zhihu', 'ok', '抓取成功', '知乎公开 API 返回成功。', success=True)
            return True
    except Exception:
        pass

    try:
        raw = http_get('https://www.zhihu.com/hot')
        matches = re.findall(r'"title":"([^"]+)"', raw)
        if matches:
            items = []
            for index, title in enumerate(matches[:8], start=1):
                items.append({
                    'id': f'zhihu_live_html_{index}',
                    'platform': 'zhihu',
                    'title': title,
                    'summary': '由知乎公开页面解析得到。',
                    'topic': infer_topic(title),
                    'heat': max(60, 100 - index * 4),
                    'url': 'https://www.zhihu.com/hot',
                    'snapshot_date': today_label(),
                    'fetch_status': 'live',
                })
            replace_platform_items(payload, 'zhihu', items)
            update_feed_source(payload, 'zhihu_direct', 'ok', '知乎公开页面解析成功。', last_attempt=now_iso(), last_success=now_iso())
            mark_platform(payload, 'zhihu', 'ok', '抓取成功', '知乎公开页面解析成功。', success=True)
            return True
    except Exception:
        pass

    update_feed_source(payload, 'zhihu_direct', 'restricted', '知乎公开 API 和页面触发鉴权。', last_attempt=now_iso())
    mark_platform(payload, 'zhihu', 'restricted', '抓取受限', '知乎公开 API 和页面触发鉴权，保留最近一次成功或校准结果。')
    return False


def try_fetch_weibo_direct(payload: dict) -> bool:
    candidates = [
        'https://weibo.com/ajax/side/hotSearch',
        'https://m.weibo.cn/api/container/getIndex?containerid=231583',
        'https://s.weibo.com/top/summary',
    ]
    for url in candidates:
        try:
            raw = http_get(url)
            if 'Sina Visitor System' in raw or 'Forbidden' in raw:
                continue
            data = json.loads(raw)
            blocks = data.get('data') or data.get('cards') or []
            iterable = blocks if isinstance(blocks, list) else blocks.get('realtime', []) if isinstance(blocks, dict) else []
            items = []
            for index, entry in enumerate(iterable[:8], start=1):
                title = entry.get('word') or entry.get('desc') or entry.get('title')
                if not title:
                    continue
                summary = entry.get('note') or entry.get('desc_extr') or '由微博公开接口返回。'
                items.append({
                    'id': f'weibo_live_{index}',
                    'platform': 'weibo',
                    'title': title,
                    'summary': normalize_summary(summary),
                    'topic': infer_topic(f'{title} {summary}'),
                    'heat': max(60, 100 - index * 4),
                    'url': entry.get('scheme') or 'https://s.weibo.com/top/summary',
                    'snapshot_date': today_label(),
                    'fetch_status': 'live',
                })
            if items:
                replace_platform_items(payload, 'weibo', items)
                update_feed_source(payload, 'weibo_direct', 'ok', '微博公开接口返回成功。', last_attempt=now_iso(), last_success=now_iso())
                mark_platform(payload, 'weibo', 'ok', '抓取成功', '微博公开接口返回成功。', success=True)
                return True
        except Exception:
            continue

    update_feed_source(payload, 'weibo_direct', 'visitor_gate', '微博公开页触发访客系统或接口拒绝访问。', last_attempt=now_iso())
    mark_platform(payload, 'weibo', 'visitor_gate', '游客验证', '微博公开页触发访客系统或接口拒绝访问，保留最近一次成功或校准结果。')
    return False


def try_fetch_rsshub(payload: dict, platform: str) -> bool:
    route = RSSHUB_ROUTES[platform]
    source_id = f'{platform}_rsshub'
    bases = get_rsshub_bases()
    for base in bases:
        url = f"{base.rstrip('/')}{route}"
        try:
            raw = http_get(url)
            items = parse_rss_items(raw, platform, url, 'rsshub')
            if items:
                replace_platform_items(payload, platform, items)
                update_feed_source(payload, source_id, 'ok', f'RSSHub 实例返回 {platform} 热榜订阅成功。', last_attempt=now_iso(), last_success=now_iso(), url=url)
                mark_platform(payload, platform, 'rsshub', '代理订阅成功', '平台公开入口受限时，已使用 RSSHub 订阅层回退。', success=True)
                return True
        except Exception:
            continue

    current = payload.get('platform_status', {}).get(platform, {})
    update_feed_source(payload, source_id, 'standby', 'RSSHub 实例当前不可达或未配置，继续保留站内快照。', last_attempt=now_iso())
    if current.get('status') not in {'ok', 'rsshub'}:
        mark_platform(payload, platform, current.get('status', 'standby'), current.get('label', '等待回退'), current.get('note', '继续保留站内快照。'))
    return False


def main():
    payload = load_json('social_hot_topics.json')
    payload['updated_at'] = now_iso()

    direct_results = {
        'zhihu': try_fetch_zhihu_direct(payload),
        'weibo': try_fetch_weibo_direct(payload),
    }

    rss_results = {}
    for platform, success in direct_results.items():
        rss_results[platform] = False if success else try_fetch_rsshub(payload, platform)

    if any(direct_results.values()):
        update_layer(payload, 'direct_public', 'partial' if not all(direct_results.values()) else 'ok', '部分成功' if not all(direct_results.values()) else '抓取成功', '至少一个平台通过公开入口成功返回热点；其余平台继续按回退策略处理。')
    else:
        update_layer(payload, 'direct_public', 'blocked', '当前受限', '知乎和微博公开入口目前都存在鉴权、访客系统或接口限制。')

    if any(rss_results.values()):
        update_layer(payload, 'feed_proxy', 'partial' if not all(rss_results.values()) else 'ok', '回退成功' if not all(rss_results.values()) else '已接管', '至少一个平台通过 RSSHub / 代理订阅层成功返回条目。')
    else:
        update_layer(payload, 'feed_proxy', 'standby', '可启用', '当前保留 RSSHub 回退能力，但尚未拿到稳定返回结果；站内仍展示人工校准和历史快照。')

    update_layer(payload, 'manual_review', 'active', '已启用', '人工审核池持续保留，用于处理平台限制、临时波动和热点语义清洗。')
    payload['items'] = sorted(payload.get('items', []), key=lambda item: (item.get('platform', ''), -item.get('heat', 0), item.get('title', '')))
    save_json('social_hot_topics.json', payload)
    print('fetch_social_topics.py completed')


if __name__ == '__main__':
    main()
