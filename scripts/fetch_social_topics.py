#!/usr/bin/env python3
"""Best-effort fetcher for public Zhihu/Weibo hot topics with fallback preservation."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
USER_AGENT = 'minsheng-observer-social-fetch/1.0 (+https://github.com/dingchenchen6/minsheng-observer)'

TOPIC_KEYWORDS = {
    'employment': ['就业', '求职', '招聘', '毕业', '失业'],
    'healthcare': ['医保', '医疗', '就医', '医院', '门诊'],
    'housing': ['住房', '房价', '租房', '保障房', '城中村'],
    'technology': ['ai', '人工智能', '大模型', '科技', '算法'],
    'elderly': ['退休', '养老', '老龄', '照护'],
    'food': ['食品', '预制菜', '外卖', '抽检', '12315'],
    'education': ['教育', '高考', '学校', '升学'],
    'livelihood': ['民生', '收入', '消费', '社保']
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(name: str):
    with open(DATA / name, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def save_json(name: str, payload):
    with open(DATA / name, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def http_get(url: str, headers: dict[str, str] | None = None):
    request = Request(url, headers={
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
        **(headers or {})
    })
    with urlopen(request, timeout=20) as response:
        return response.read().decode('utf-8', errors='ignore')


def infer_topic(text: str) -> str:
    lowered = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return topic
    return 'livelihood'


def keep_previous_items(payload: dict, platform: str, status: str, label: str, note: str):
    payload['platform_status'][platform] = {
        'status': status,
        'label': label,
        'note': note,
        'last_attempt': now_iso(),
        'last_success': payload.get('platform_status', {}).get(platform, {}).get('last_success', '')
    }


def try_fetch_zhihu(payload: dict) -> None:
    previous = [item for item in payload['items'] if item['platform'] == 'zhihu']
    try:
        raw = http_get('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10&desktop=true')
        data = json.loads(raw)
        items = []
        for entry in data.get('data', []):
            target = entry.get('target', {})
            title = target.get('title') or entry.get('detail_text')
            if not title:
                continue
            items.append({
                'id': f"zhihu_{target.get('id', len(items))}",
                'platform': 'zhihu',
                'title': title,
                'summary': target.get('excerpt') or target.get('detail_text') or '知乎公开热榜抓取结果。',
                'topic': infer_topic(title),
                'heat': max(60, 100 - len(items) * 4),
                'url': target.get('url') or 'https://www.zhihu.com/hot',
                'snapshot_date': datetime.now().strftime('%Y-%m-%d'),
                'fetch_status': 'live'
            })
        if items:
            payload['items'] = [item for item in payload['items'] if item['platform'] != 'zhihu'] + items
            payload['platform_status']['zhihu'] = {
                'status': 'ok',
                'label': '抓取成功',
                'note': '知乎公开 API 返回成功。',
                'last_attempt': now_iso(),
                'last_success': now_iso()
            }
            return
    except Exception:
        pass

    try:
        raw = http_get('https://www.zhihu.com/hot')
        matches = re.findall(r'"title":"([^"]+)"', raw)
        if matches:
            items = []
            for index, title in enumerate(matches[:8], start=1):
                title = title.replace('\\u003C', '<')
                items.append({
                    'id': f'zhihu_html_{index}',
                    'platform': 'zhihu',
                    'title': title,
                    'summary': '由知乎公开页面解析得到。',
                    'topic': infer_topic(title),
                    'heat': max(60, 100 - index * 4),
                    'url': 'https://www.zhihu.com/hot',
                    'snapshot_date': datetime.now().strftime('%Y-%m-%d'),
                    'fetch_status': 'live'
                })
            payload['items'] = [item for item in payload['items'] if item['platform'] != 'zhihu'] + items
            payload['platform_status']['zhihu'] = {
                'status': 'ok',
                'label': '抓取成功',
                'note': '知乎公开页面解析成功。',
                'last_attempt': now_iso(),
                'last_success': now_iso()
            }
            return
    except Exception:
        pass

    if previous:
        keep_previous_items(payload, 'zhihu', 'restricted', '抓取受限', '知乎公开 API 和页面触发鉴权，保留最近一次成功或校准结果。')


def try_fetch_weibo(payload: dict) -> None:
    previous = [item for item in payload['items'] if item['platform'] == 'weibo']
    candidates = [
        'https://weibo.com/ajax/side/hotSearch',
        'https://m.weibo.cn/api/container/getIndex?containerid=231583',
        'https://s.weibo.com/top/summary'
    ]
    for url in candidates:
        try:
            raw = http_get(url)
            if 'Sina Visitor System' in raw or 'Forbidden' in raw:
                continue
            data = json.loads(raw)
            blocks = data.get('data') or data.get('cards') or []
            items = []
            iterable = blocks if isinstance(blocks, list) else blocks.get('realtime', []) if isinstance(blocks, dict) else []
            for index, entry in enumerate(iterable[:8], start=1):
                title = entry.get('word') or entry.get('desc') or entry.get('title')
                if not title:
                    continue
                items.append({
                    'id': f"weibo_{entry.get('word_scheme', index)}",
                    'platform': 'weibo',
                    'title': title,
                    'summary': '由微博公开接口返回。',
                    'topic': infer_topic(title),
                    'heat': max(60, 100 - index * 4),
                    'url': entry.get('scheme') or 'https://s.weibo.com/top/summary',
                    'snapshot_date': datetime.now().strftime('%Y-%m-%d'),
                    'fetch_status': 'live'
                })
            if items:
                payload['items'] = [item for item in payload['items'] if item['platform'] != 'weibo'] + items
                payload['platform_status']['weibo'] = {
                    'status': 'ok',
                    'label': '抓取成功',
                    'note': '微博公开接口返回成功。',
                    'last_attempt': now_iso(),
                    'last_success': now_iso()
                }
                return
        except Exception:
            continue

    if previous:
        keep_previous_items(payload, 'weibo', 'visitor_gate', '游客验证', '微博公开页触发访客系统或接口拒绝访问，保留最近一次成功或校准结果。')


def main():
    payload = load_json('social_hot_topics.json')
    payload['updated_at'] = now_iso()
    try_fetch_zhihu(payload)
    try_fetch_weibo(payload)
    payload['items'] = sorted(payload['items'], key=lambda item: (item['platform'], -item.get('heat', 0), item['title']))
    save_json('social_hot_topics.json', payload)
    print('fetch_social_topics.py completed')


if __name__ == '__main__':
    main()
