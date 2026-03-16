#!/usr/bin/env python3
"""Refresh metadata, source check timestamps, trend archive snapshots, and paper metadata."""

from __future__ import annotations

from collections import defaultdict
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
USER_AGENT = 'minsheng-observer/2.0 (+https://github.com/dingchenchen6/minsheng-observer)'


def load_json(name: str):
    with open(DATA / name, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def save_json(name: str, payload):
    with open(DATA / name, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def label_now() -> str:
    return datetime.now().strftime('%Y年%m月%d日 %H:%M（本地构建时间）')


def http_json(url: str):
    request = Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))


def check_url(url: str) -> bool:
    request = Request(url, headers={'User-Agent': USER_AGENT}, method='HEAD')
    try:
        with urlopen(request, timeout=12):
            return True
    except (HTTPError, URLError, ValueError):
        return False


def average(values) -> float:
    values = [value for value in values if value is not None]
    if not values:
        return 0.0
    return round(sum(values) / len(values), 1)


def refresh_site_meta():
    meta = load_json('site_meta.json')
    meta['last_updated'] = iso_now()
    meta['last_updated_label'] = label_now()
    topic_count = len(load_json('topics.json'))
    source_count = len(load_json('sources.json'))
    archive_total = (
        len(load_json('trend_archive.json'))
        + len(load_json('evidence_records.json'))
        + len(load_json('papers.json'))
        + len(load_json('discussion_archive.json'))
        + len(load_json('social_hot_topics.json').get('items', []))
        + len(load_json('reports.json'))
    )
    for item in meta.get('hero_stats', []):
        if item.get('label') == '重点议题':
            item['value'] = str(topic_count)
        elif item.get('label') == '权威入口':
            item['value'] = str(source_count)
        elif item.get('label') == '归档条目':
            item['value'] = str(archive_total)
            item['note'] = '热点快照、证据库、论文卡片、报告入口、讨论摘录与社媒热榜均可检索'
    save_json('site_meta.json', meta)


def refresh_sources():
    sources = load_json('sources.json')
    today = datetime.now().strftime('%Y-%m-%d')
    for source in sources:
        if check_url(source['url']):
            source['last_checked'] = today
    save_json('sources.json', sources)


def merge_current_trends_into_archive():
    current = load_json('trend_current.json')
    archive = load_json('trend_archive.json')
    known = {(item['snapshot_date'], item['title']) for item in archive}
    for item in current:
        key = (item['snapshot_date'], item['title'])
        if key in known:
            continue
        archive.insert(0, {
            'id': f"archive_{item['id']}",
            'snapshot_date': item['snapshot_date'],
            'topic': item['topic'],
            'title': item['title'],
            'summary': item['summary'],
            'heat_score': item['heat_score'],
            'source_links': item['source_links'],
            'related_policy_links': item['related_policy_links'],
            'related_papers': item['related_papers']
        })
    archive = sorted(archive, key=lambda item: item['snapshot_date'], reverse=True)[:40]
    save_json('trend_archive.json', archive)


def enrich_paper_metadata():
    papers = load_json('papers.json')
    for paper in papers:
        doi = paper.get('doi')
        if not doi:
            continue
        doi_quoted = quote(doi, safe='')
        updated = False
        try:
            crossref = http_json(f'https://api.crossref.org/works/{doi_quoted}')
            message = crossref.get('message', {})
            titles = message.get('title') or []
            if titles:
                paper['title'] = titles[0]
            container = message.get('container-title') or []
            if container:
                paper['journal'] = container[0]
            published = message.get('issued', {}).get('date-parts', [[paper.get('year', 2024)]])
            paper['year'] = published[0][0]
            authors = []
            for author in message.get('author', [])[:6]:
                given = author.get('given', '').strip()
                family = author.get('family', '').strip()
                full = ' '.join(part for part in [given, family] if part)
                if full:
                    authors.append(full)
            if authors:
                paper['authors'] = ', '.join(authors)
            updated = True
        except Exception:
            pass

        if updated:
            continue

        try:
            openalex = http_json(f'https://api.openalex.org/works/https://doi.org/{doi_quoted}')
            if openalex.get('display_name'):
                paper['title'] = openalex['display_name']
            if openalex.get('publication_year'):
                paper['year'] = openalex['publication_year']
            authorships = openalex.get('authorships') or []
            authors = [item.get('author', {}).get('display_name') for item in authorships[:6] if item.get('author', {}).get('display_name')]
            if authors:
                paper['authors'] = ', '.join(authors)
            venue = openalex.get('primary_location', {}).get('source', {}).get('display_name')
            if venue:
                paper['journal'] = venue
        except Exception:
            continue

    save_json('papers.json', papers)


def build_hotspot_analysis():
    topics = load_json('topics.json')
    current = load_json('trend_current.json')
    archive = load_json('trend_archive.json')
    social = load_json('social_hot_topics.json')
    evidence = load_json('evidence_records.json')
    discussions = load_json('discussion_archive.json')
    reports = load_json('reports.json')

    current_by_topic = defaultdict(list)
    archive_by_topic = defaultdict(list)
    social_by_topic = defaultdict(list)
    evidence_by_topic = defaultdict(int)
    discussions_by_topic = defaultdict(int)
    reports_by_topic = defaultdict(int)

    for item in current:
        current_by_topic[item['topic']].append(item.get('heat_score', 0))
    for item in archive:
        archive_by_topic[item['topic']].append(item.get('heat_score', 0))
    for item in social.get('items', []):
        social_by_topic[item['topic']].append(item.get('heat', 0))
    for item in evidence:
        evidence_by_topic[item['topic']] += 1
    for item in discussions:
        discussions_by_topic[item['topic']] += 1
    for item in reports:
        reports_by_topic[item['topic']] += 1

    topic_rankings = []
    for topic in topics:
        topic_id = topic['id']
        current_heat = average(current_by_topic[topic_id])
        archive_avg = average(archive_by_topic[topic_id])
        social_avg = average(social_by_topic[topic_id])
        social_total = round(sum(social_by_topic[topic_id]), 1)
        archive_mentions = len(archive_by_topic[topic_id])
        evidence_count = evidence_by_topic[topic_id]
        discussion_count = discussions_by_topic[topic_id]
        report_count = reports_by_topic[topic_id]
        delta = round(current_heat - archive_avg, 1) if archive_mentions else round(current_heat, 1)
        combined_score = round(
            current_heat * 1.1
            + social_total * 0.45
            + archive_mentions * 7
            + evidence_count * 5
            + discussion_count * 5
            + report_count * 3
        )

        if delta >= 10 or social_total >= 170:
            signal_label = '显著升温'
        elif combined_score >= 120:
            signal_label = '持续高位'
        else:
            signal_label = '结构性关注'

        if social_total >= current_heat and social_total > 0:
            watch_reason = '社媒热度高于站内快照，适合优先补政策口径和讨论摘录。'
        elif evidence_count >= 2 or discussion_count >= 2:
            watch_reason = '证据和讨论积累较厚，适合做专题化持续追踪。'
        else:
            watch_reason = '当前热度存在，但仍需要更多证据和长期报告支撑。'

        topic_rankings.append({
            'topic': topic_id,
            'label': topic['label'],
            'combined_score': combined_score,
            'current_heat': current_heat,
            'archive_average_heat': archive_avg,
            'archive_mentions': archive_mentions,
            'social_average_heat': social_avg,
            'social_total_heat': social_total,
            'social_item_count': len(social_by_topic[topic_id]),
            'evidence_count': evidence_count,
            'discussion_count': discussion_count,
            'report_count': report_count,
            'delta_vs_archive': delta,
            'signal_label': signal_label,
            'watch_reason': watch_reason,
        })

    topic_rankings.sort(key=lambda item: (-item['combined_score'], -item['current_heat'], item['topic']))

    platform_breakdown = []
    for platform, status in social.get('platform_status', {}).items():
        items = [item for item in social.get('items', []) if item.get('platform') == platform]
        platform_breakdown.append({
            'platform': platform,
            'label': platform.upper(),
            'status': status.get('status', 'unknown'),
            'status_label': status.get('label', '未标注'),
            'item_count': len(items),
            'average_heat': average([item.get('heat', 0) for item in items]),
            'top_topic': max(items, key=lambda item: item.get('heat', 0)).get('topic', 'livelihood') if items else 'livelihood',
            'note': status.get('note', ''),
        })

    restricted_platforms = [platform for platform, status in social.get('platform_status', {}).items() if status.get('status') not in {'ok', 'rsshub'}]
    top_topic = topic_rankings[0] if topic_rankings else None
    rising_topic = max(topic_rankings, key=lambda item: item['delta_vs_archive'], default=None)

    lead_brief = []
    if top_topic:
        lead_brief.append(f"当前综合信号最强的议题是“{top_topic['label']}”，综合分值 {top_topic['combined_score']}，说明热点、证据和讨论正在同向累积。")
    if rising_topic:
        lead_brief.append(f"相对历史档案升温最快的是“{rising_topic['label']}”，较历史平均热度变化 {rising_topic['delta_vs_archive']:+.1f}。")
    lead_brief.append(f"当前社媒快照共保留 {len(social.get('items', []))} 条，其中 {sum(1 for item in social.get('items', []) if item.get('fetch_status') == 'review_pool')} 条来自审核池或站内热点回填。")
    if restricted_platforms:
        lead_brief.append(f"当前仍受平台限制的入口有：{'、'.join(platform.upper() for platform in restricted_platforms)}，因此站点继续保留回退层和人工校准快照。")

    summary_cards = [
        {
            'label': '监测议题',
            'value': f'{len(topics)} 个',
            'note': '综合当前热点、社媒快照、历史档案、证据库、讨论和报告入口做交叉判断。',
        },
        {
            'label': '社媒快照',
            'value': f"{len(social.get('items', []))} 条",
            'note': '抓取失败时会自动回退到人工审核池和站内热点回填，保证监测面不空白。',
        },
        {
            'label': '热点档案',
            'value': f'{len(archive)} 条',
            'note': '当前热点不是孤立事件，历史快照会一起参与评分，帮助判断“短时爆点”还是“长期争议”。',
        },
        {
            'label': '平台受限',
            'value': f'{len(restricted_platforms)} 个',
            'note': '即使公开入口受限，站点仍会保留公开来源、回退层与人工审核说明，不伪装成实时热搜。',
        },
    ]

    weekly_sections = []
    for item in topic_rankings[:4]:
        weekly_sections.append({
            'topic': item['topic'],
            'label': item['label'],
            'headline': f"{item['label']}进入{item['signal_label']}区间",
            'summary': f"综合分 {item['combined_score']}，当前热度 {item['current_heat']}，社媒均值 {item['social_average_heat']}，历史差值 {item['delta_vs_archive']:+.1f}。",
            'action': item['watch_reason'],
        })

    strongest_support = max(topic_rankings, key=lambda item: item['evidence_count'] + item['report_count'] + item['discussion_count'], default=None)
    poll_candidate = max(topic_rankings, key=lambda item: item['social_total_heat'] + item['current_heat'], default=None)
    weekly_report = {
        'headline': f"本周最值得持续追踪的是“{top_topic['label']}”" if top_topic else '本周热点周报生成中',
        'summary': '把当前热点、社媒快照、历史档案、证据库、讨论摘录和报告入口一起看，能更快判断哪些议题只是短时情绪，哪些已经进入结构性关注阶段。',
        'sections': weekly_sections,
        'editor_notes': [
            f"当前监测面已覆盖 {len(topics)} 个议题、{len(social.get('items', []))} 条社媒快照和 {len(archive)} 条历史档案。",
            f"证据支撑最厚的议题是“{strongest_support['label']}”。" if strongest_support else '证据支撑议题正在统计。',
            f"最适合和站内投票联动观察的议题是“{poll_candidate['label']}”。" if poll_candidate else '投票联动议题正在统计。',
            '平台公开入口受限时，周报会明确保留“回退层”和“人工校准”说明，不把平台限制包装成实时抓取成功。'
        ]
    }

    payload = {
        'updated_at': iso_now(),
        'summary_cards': summary_cards,
        'lead_brief': lead_brief,
        'weekly_report': weekly_report,
        'topic_rankings': topic_rankings,
        'platform_breakdown': platform_breakdown,
        'capture_overview': {
            'current_trend_count': len(current),
            'social_item_count': len(social.get('items', [])),
            'archive_count': len(archive),
            'discussion_count': len(discussions),
            'evidence_count': len(evidence),
        },
    }
    save_json('hotspot_analysis.json', payload)


def build_hotspot_timeseries():
    topics = load_json('topics.json')
    archive = load_json('trend_archive.json')
    current = load_json('trend_current.json')
    social = load_json('social_hot_topics.json')
    evidence = load_json('evidence_records.json')
    discussions = load_json('discussion_archive.json')

    topic_series = []

    for topic in topics:
        topic_id = topic['id']
        heat_by_date = defaultdict(list)
        evidence_dates = []
        discussion_dates = []

        for item in archive:
            if item.get('topic') == topic_id:
                heat_by_date[item['snapshot_date']].append(float(item.get('heat_score', 0)))
        for item in current:
            if item.get('topic') == topic_id:
                heat_by_date[item['snapshot_date']].append(float(item.get('heat_score', 0)))
        for item in social.get('items', []):
            if item.get('topic') == topic_id:
                heat_by_date[item['snapshot_date']].append(float(item.get('heat', 0)))
        for item in evidence:
            if item.get('topic') == topic_id:
                evidence_dates.append(item['published_at'])
        for item in discussions:
            if item.get('topic') == topic_id:
                discussion_dates.append(item['created_at'][:10])

        all_dates = sorted(set(heat_by_date.keys()) | set(evidence_dates) | set(discussion_dates))
        heat_labels = sorted(heat_by_date.keys())[-6:]
        heat_values = [round(sum(heat_by_date[label]) / len(heat_by_date[label]), 1) for label in heat_labels]

        evidence_total = 0
        discussion_total = 0
        cumulative_labels = all_dates[-8:]
        evidence_values = []
        discussion_values = []
        for label in cumulative_labels:
            evidence_total += evidence_dates.count(label)
            discussion_total += discussion_dates.count(label)
            evidence_values.append(evidence_total)
            discussion_values.append(discussion_total)

        topic_series.append({
            'topic': topic_id,
            'label': topic['label'],
            'heat_series': {
                'labels': heat_labels,
                'values': heat_values,
            },
            'evidence_series': {
                'labels': cumulative_labels,
                'evidence_values': evidence_values,
                'discussion_values': discussion_values,
            }
        })

    save_json('hotspot_timeseries.json', {
        'updated_at': iso_now(),
        'topics': topic_series,
    })


def refresh_social_topics():
    script = ROOT / 'scripts' / 'fetch_social_topics.py'
    try:
        subprocess.run(['python3', str(script)], cwd=ROOT, check=True)
    except Exception as error:
        print(f'social topic refresh skipped: {error}')


def main():
    refresh_social_topics()
    build_hotspot_analysis()
    build_hotspot_timeseries()
    refresh_site_meta()
    refresh_sources()
    merge_current_trends_into_archive()
    enrich_paper_metadata()
    print('refresh_data.py completed')


if __name__ == '__main__':
    main()
