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
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
USER_AGENT = 'minsheng-observer/2.0 (+https://github.com/dingchenchen6/minsheng-observer)'
CHINA_TZ = ZoneInfo('Asia/Shanghai')


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


def china_now() -> datetime:
    return datetime.now(CHINA_TZ)


def china_edition_label(now: datetime | None = None) -> dict[str, str]:
    current = now or china_now()
    slot = 'morning' if current.hour < 12 else 'evening'
    slot_label = '早报' if slot == 'morning' else '晚报'
    return {
        'slot': slot,
        'slot_label': slot_label,
        'date_label': current.strftime(f'%Y年%m月%d日 {slot_label}'),
        'timestamp_label': current.strftime('%Y年%m月%d日 %H:%M（北京时间）')
    }


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


def classify_theme(text: str, mapping: list[tuple[str, tuple[str, ...]]], default: str) -> str:
    content = text.lower()
    for label, keywords in mapping:
        if any(keyword.lower() in content for keyword in keywords):
            return label
    return default


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
    polls = load_json('polls.json')
    edition = china_edition_label()

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

    suggestion_map = {item['topic']: item for item in polls.get('suggestion_boards', [])}
    survey_by_topic = defaultdict(list)
    for survey in polls.get('surveys', []):
        survey_by_topic[survey['topic']].append(survey)

    latest_evidence_by_topic = defaultdict(list)
    for item in sorted(evidence, key=lambda row: row.get('published_at', ''), reverse=True):
        latest_evidence_by_topic[item['topic']].append(item)

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

    opinion_overview = []
    for item in topic_rankings[:6]:
        board = suggestion_map.get(item['topic'], {})
        surveys = survey_by_topic.get(item['topic'], [])
        sample_total = 0
        best_option = {'label': '', 'votes': 0}
        for survey in surveys:
            options = survey.get('options', [])
            sample_total += sum(option.get('votes', 0) for option in options)
            top_option = max(options, key=lambda option: option.get('votes', 0), default={'label': '', 'votes': 0})
            if top_option.get('votes', 0) > best_option['votes']:
                best_option = top_option
        latest_exposure = next(
            (
                evidence_item for evidence_item in latest_evidence_by_topic.get(item['topic'], [])
                if evidence_item.get('type') in {'exposed', 'investigating'}
            ),
            latest_evidence_by_topic.get(item['topic'], [None])[0]
        )
        opinion_overview.append({
            'topic': item['topic'],
            'label': item['label'],
            'signal_label': item['signal_label'],
            'combined_score': item['combined_score'],
            'sample_total': sample_total,
            'leading_option': best_option.get('label', ''),
            'leading_votes': best_option.get('votes', 0),
            'board_summary': board.get('summary', ''),
            'key_suggestions': board.get('items', [])[:3],
            'latest_exposure_title': latest_exposure.get('title', '') if latest_exposure else '',
            'latest_exposure_verdict': latest_exposure.get('verdict', '') if latest_exposure else '',
        })

    signal_distribution = []
    for label in ['显著升温', '持续高位', '结构性关注']:
        members = [item for item in topic_rankings if item['signal_label'] == label]
        signal_distribution.append({
            'label': label,
            'count': len(members),
            'combined_score': round(sum(item['combined_score'] for item in members), 1),
        })

    express_sections = []
    for item in topic_rankings[:5]:
        opinion = next((entry for entry in opinion_overview if entry['topic'] == item['topic']), None)
        express_sections.append({
            'topic': item['topic'],
            'label': item['label'],
            'headline': f"{item['label']}列入{edition['slot_label']}优先跟踪",
            'summary': f"综合分 {item['combined_score']}，当前热度 {item['current_heat']}，社媒总热度 {item['social_total_heat']}，证据 {item['evidence_count']} 条，讨论 {item['discussion_count']} 条。",
            'opinion_hint': opinion['leading_option'] if opinion else '',
            'watch_reason': item['watch_reason'],
        })

    chart_takeaways = []
    if len(topic_rankings) >= 2:
        chart_takeaways.append(f"综合分前两位分别是“{topic_rankings[0]['label']}”和“{topic_rankings[1]['label']}”，说明当前讨论并非单点爆发。")
    elif topic_rankings:
        chart_takeaways.append(f"当前综合分最高的是“{topic_rankings[0]['label']}”，需要继续观察它是否演变成跨议题热点。")
    if signal_distribution:
        chart_takeaways.append('当前热点分层为：' + '，'.join(f"{item['label']} {item['count']} 个" for item in signal_distribution) + '。')
    strongest_support_topics = sorted(
        topic_rankings,
        key=lambda item: item['evidence_count'] + item['discussion_count'] + item['report_count'],
        reverse=True
    )[:3]
    if strongest_support_topics:
        chart_takeaways.append('证据和报告支撑较厚的议题是：' + '、'.join(item['label'] for item in strongest_support_topics) + '。')
    if restricted_platforms:
        chart_takeaways.append('平台受限仍集中在 ' + '、'.join(platform.upper() for platform in restricted_platforms) + '，因此回退层仍需保留。')

    watch_alerts = []
    for item in opinion_overview[:4]:
        alert = item['latest_exposure_title'] or item['leading_option'] or item['board_summary']
        if not alert:
            continue
        watch_alerts.append({
            'topic': item['topic'],
            'label': item['label'],
            'title': item['latest_exposure_title'] or item['leading_option'],
            'detail': item['latest_exposure_verdict'] or item['board_summary'],
        })

    express_brief = {
        'edition_slot': edition['slot'],
        'edition_label': edition['slot_label'],
        'edition_date_label': edition['date_label'],
        'edition_timestamp_label': edition['timestamp_label'],
        'headline': f"{edition['date_label']}重点关注“{top_topic['label']}”与“{rising_topic['label']}”" if top_topic and rising_topic else f"{edition['date_label']}热点快报生成中",
        'summary': f"本站按{edition['slot_label']}节奏自动汇总热点、社媒快照、证据库、讨论摘录和报告入口，帮助判断哪些议题值得继续盯。", 
        'sections': express_sections,
        'chart_takeaways': chart_takeaways,
        'watch_alerts': watch_alerts,
    }

    payload = {
        'updated_at': iso_now(),
        'edition': edition,
        'summary_cards': summary_cards,
        'lead_brief': lead_brief,
        'express_brief': express_brief,
        'weekly_report': weekly_report,
        'topic_rankings': topic_rankings,
        'platform_breakdown': platform_breakdown,
        'signal_distribution': signal_distribution,
        'opinion_overview': opinion_overview,
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


def build_insight_digest():
    topics = load_json('topics.json')
    topic_label_by_id = {item['id']: item['label'] for item in topics}
    evidence = load_json('evidence_records.json')
    polls = load_json('polls.json')
    policy_links = load_json('policy_links.json')
    policy_by_id = {item['id']: item for item in policy_links}
    suggestion_boards = polls.get('suggestion_boards', [])
    surveys = polls.get('surveys', [])

    exposure_theme_map = [
        ('信息透明', ('透明', '标注', '告知', '公开', '规则')),
        ('成本压力', ('成本', '租金', '房价', '费用', '报销', '价格')),
        ('服务可及性', ('基层', '挂号', '通勤', '可达', '服务', '就近')),
        ('就业门槛', ('就业', '岗位', '经验', '实习', '招聘', '转岗')),
        ('照护养老', ('养老', '照护', '退休', '失能', '护理')),
        ('技术治理', ('ai', '算法', '技术', '自动化', '任务')),
    ]
    guide_action_map = [
        ('信息公开', ('透明', '公开', '说明', '规则', '告知')),
        ('服务优化', ('流程', '体验', '排队', '挂号', '通勤', '就近')),
        ('供给扩容', ('供给', '扩容', '增加', '布局', '首诊', '学位')),
        ('权益保障', ('维权', '保障', '补贴', '赔付', '反馈', '投诉')),
        ('能力建设', ('培训', '师资', '照护', '转岗', '职业', '基层')),
    ]
    rumor_kind_labels = {
        'rumor': '谣言澄清',
        'impersonation': '假冒官方',
        'counterfeit': '假冒伪劣',
        'false_promo': '虚假宣传',
        'fraud': '诈骗套路',
    }

    exposure_topics = []
    exposure_theme_breakdown = defaultdict(int)
    policy_reference_ids = set()
    for topic in topics:
        topic_items = [item for item in evidence if item.get('topic') == topic['id']]
        type_counts = defaultdict(int)
        for item in topic_items:
            type_counts[item.get('type', 'context')] += 1
            policy_reference_ids.update(item.get('policy_link_ids', []))
            theme = classify_theme(
                f"{item.get('title', '')} {item.get('summary', '')} {item.get('verdict', '')}",
                exposure_theme_map,
                '其他结构性问题'
            )
            exposure_theme_breakdown[theme] += 1
        exposure_topics.append({
            'topic': topic['id'],
            'label': topic['label'],
            'exposed_count': type_counts['exposed'],
            'investigating_count': type_counts['investigating'],
            'context_count': type_counts['context'],
            'latest_titles': [item['title'] for item in sorted(topic_items, key=lambda item: item['published_at'], reverse=True)[:3]],
        })

    exposure_timeline = sorted([
        {
            'id': item['id'],
            'topic': item['topic'],
            'type': item['type'],
            'title': item['title'],
            'summary': item['summary'],
            'verdict': item['verdict'],
            'published_at': item['published_at'],
            'policy_link_ids': item.get('policy_link_ids', []),
        }
        for item in evidence
    ], key=lambda item: item['published_at'], reverse=True)

    rumor_tag_breakdown = defaultdict(int)
    rumor_watchlist = []
    for item in evidence:
        kind = item.get('misinfo_kind')
        if not kind:
            continue
        for tag in item.get('risk_tags', []):
            rumor_tag_breakdown[tag] += 1
        rumor_watchlist.append({
            'id': item['id'],
            'topic': item['topic'],
            'label': topic_label_by_id.get(item['topic'], item['topic']),
            'kind': kind,
            'kind_label': rumor_kind_labels.get(kind, '风险澄清'),
            'title': item['title'],
            'claim': item.get('claim', ''),
            'verdict': item.get('verdict', ''),
            'published_at': item.get('published_at', ''),
            'risk_tags': item.get('risk_tags', []),
            'clarification_points': item.get('clarification_points', []),
            'scam_signals': item.get('scam_signals', []),
            'policy_link_ids': item.get('policy_link_ids', []),
        })
    rumor_watchlist.sort(key=lambda entry: (entry['published_at'], entry['title']), reverse=True)

    survey_priority_map = {}
    for survey in surveys:
        ranked = sorted(survey.get('options', []), key=lambda option: option.get('votes', 0), reverse=True)
        if not ranked:
            continue
        current = survey_priority_map.get(survey['topic'])
        top_option = ranked[0]
        if not current or top_option['votes'] > current['votes']:
            survey_priority_map[survey['topic']] = {
                'question': survey['question'],
                'label': top_option['label'],
                'votes': top_option['votes'],
            }

    guide_topics = []
    guide_action_breakdown = defaultdict(int)
    for board in suggestion_boards:
        related_evidence = [item for item in evidence if item.get('topic') == board['topic']]
        pitfalls = [item['title'] for item in related_evidence if item.get('type') in {'exposed', 'investigating'}][:3]
        if not pitfalls:
            pitfalls = [item['title'] for item in related_evidence[:2]]
        for step in board.get('items', []):
            action_type = classify_theme(step, guide_action_map, '综合治理')
            guide_action_breakdown[action_type] += 1
        guide_topics.append({
            'topic': board['topic'],
            'title': board['title'],
            'summary': board['summary'],
            'risk_points': pitfalls,
            'safe_steps': board.get('items', []),
            'policy_link_ids': board.get('policy_link_ids', []),
            'discussion_ids': board.get('discussion_ids', []),
            'priority_label': survey_priority_map.get(board['topic'], {}).get('label', ''),
            'priority_votes': survey_priority_map.get(board['topic'], {}).get('votes', 0),
        })

    top_exposure_topic = max(exposure_topics, key=lambda item: (item['exposed_count'] + item['investigating_count'], item['context_count']), default=None)
    top_priority_actions = sorted(guide_topics, key=lambda item: item.get('priority_votes', 0), reverse=True)[:6]
    route_templates = {
        'education': ['先核对招生、学位或教育统计口径，再判断争议点是规则问题还是资源配置问题。', '保留通知、截图和费用记录，必要时向学校或主管部门正式反馈。', '如果讨论涉及长期结构性差距，可回到公报、调查报告和讨论区继续补充案例。'],
        'healthcare': ['先确认就诊流程、医保报销规则和医院/基层机构说明，避免信息误解。', '保留挂号、缴费、报销和转诊记录，便于后续核查服务可及性问题。', '如果是制度体验差异，可同时参考卫生公报、政策口径和站内曝光条目。'],
        'housing': ['先核对资格、租约、轮候或改造政策说明，明确问题发生在哪一层。', '保留租约、通知、通勤成本和沟通记录，方便后续维权或反馈。', '如涉及保障房、公租房或旧改争议，优先回到官方政策入口和公开规则。'],
        'employment': ['先区分岗位数量问题、招聘门槛问题和劳动条件问题。', '保留岗位要求、沟通记录和合同信息，便于比较隐性门槛与实际条件。', '如果问题具有普遍性，可结合人社政策、讨论区和案例库继续跟踪。'],
        'elderly': ['先核对养老金、照护服务或社区支持的正式规则与说明。', '保留照护服务、排队、价格和等待记录，帮助判断问题是供给不足还是信息不透明。', '涉及长期照护压力时，可同步查看统计公报与养老讨论串。'],
        'food': ['先保留商品信息、标签、订单、聊天和问题页面截图。', '遇到具体消费纠纷，优先走 12315 或监管抽检入口，不要只停留在社交平台吐槽。', '如果是系统性问题，再结合曝光案例和站内讨论看是否属于高频共性争议。'],
        'technology': ['先确认争议是技术本身、算法管理，还是劳动过程变化。', '保留绩效规则、岗位变更或培训要求等记录，帮助判断影响范围。', '如涉及 AI 与就业交叉问题，可同时查看科技和就业两个议题的案例。'],
        'livelihood': ['先把问题落到具体支出、服务、保障或信息透明哪一类。', '保留成本变化、政策通知和办事体验记录，便于区分个体案例与结构问题。', '跨议题问题建议回到统计发布、长期调查和站内归档一起看。'],
    }

    exposure_case_library = []
    for item in exposure_timeline:
        if item.get('type') not in {'exposed', 'investigating'}:
            continue
        topic_meta = next((topic for topic in exposure_topics if topic['topic'] == item['topic']), None)
        issue_count = (topic_meta.get('exposed_count', 0) + topic_meta.get('investigating_count', 0)) if topic_meta else 0
        risk_level = '高风险' if item['type'] == 'exposed' or issue_count >= 2 else '持续观察'
        policy_targets = [policy_by_id[policy_id] for policy_id in item.get('policy_link_ids', []) if policy_id in policy_by_id]
        exposure_case_library.append({
            'id': item['id'],
            'topic': item['topic'],
            'label': topic_label_by_id.get(item['topic'], item['topic']),
            'title': item['title'],
            'summary': item['summary'],
            'verdict': item['verdict'],
            'published_at': item['published_at'],
            'risk_level': risk_level,
            'risk_note': '建议优先保留凭证并回到官方入口核查。' if risk_level == '高风险' else '说明问题仍在演化，适合持续跟踪。', 
            'policy_targets': [
                {
                    'label': target['label'],
                    'url': target['url'],
                    'source_name': target['source_name'],
                }
                for target in policy_targets
            ],
        })

    complaint_routes = []
    for board in suggestion_boards:
        topic = board['topic']
        related_topic = next((item for item in exposure_topics if item['topic'] == topic), None)
        policy_targets = [policy_by_id[policy_id] for policy_id in board.get('policy_link_ids', []) if policy_id in policy_by_id]
        primary_target = policy_targets[0] if policy_targets else None
        complaint_routes.append({
            'topic': topic,
            'label': topic_label_by_id.get(topic, topic),
            'risk_level': '高关注' if (related_topic and related_topic['exposed_count'] + related_topic['investigating_count'] > 0) else '常规关注',
            'when_to_use': board.get('summary', ''),
            'steps': route_templates.get(topic, route_templates['livelihood']),
            'priority_action': survey_priority_map.get(topic, {}).get('label', ''),
            'policy_targets': [
                {
                    'label': target['label'],
                    'url': target['url'],
                    'source_name': target['source_name'],
                }
                for target in policy_targets
            ],
            'primary_target': {
                'label': primary_target['label'],
                'url': primary_target['url'],
            } if primary_target else None,
        })

    payload = {
        'updated_at': iso_now(),
        'exposure_summary': {
            'total': len(evidence),
            'exposed': sum(1 for item in evidence if item.get('type') == 'exposed'),
            'investigating': sum(1 for item in evidence if item.get('type') == 'investigating'),
            'latest_date': exposure_timeline[0]['published_at'] if exposure_timeline else '',
            'covered_topics': len([item for item in exposure_topics if item['exposed_count'] or item['investigating_count'] or item['context_count']]),
            'policy_refs': len([item for item in policy_links if item.get('id') in policy_reference_ids]),
            'focus_topic': top_exposure_topic['label'] if top_exposure_topic else '',
        },
        'exposure_topics': exposure_topics,
        'exposure_timeline': exposure_timeline,
        'exposure_case_library': exposure_case_library[:8],
        'complaint_routes': complaint_routes,
        'exposure_theme_breakdown': [
            {'label': label, 'count': count}
            for label, count in sorted(exposure_theme_breakdown.items(), key=lambda item: (-item[1], item[0]))
        ],
        'rumor_summary': {
            'case_count': len(rumor_watchlist),
            'topic_count': len({item['topic'] for item in rumor_watchlist}),
            'kind_count': len({item['kind'] for item in rumor_watchlist}),
        },
        'rumor_watchlist': rumor_watchlist[:10],
        'rumor_tag_breakdown': [
            {'label': label, 'count': count}
            for label, count in sorted(rumor_tag_breakdown.items(), key=lambda item: (-item[1], item[0]))
        ],
        'guide_summary': {
            'topic_count': len(guide_topics),
            'advice_count': sum(len(item.get('safe_steps', [])) for item in guide_topics),
            'priority_count': len(survey_priority_map),
            'action_type_count': len(guide_action_breakdown),
        },
        'guide_topics': guide_topics,
        'guide_action_breakdown': [
            {'label': label, 'count': count}
            for label, count in sorted(guide_action_breakdown.items(), key=lambda item: (-item[1], item[0]))
        ],
        'guide_priority_actions': [
            {
                'topic': item['topic'],
                'label': topic_label_by_id.get(item['topic'], item['topic']),
                'priority_label': item['priority_label'],
                'priority_votes': item['priority_votes'],
                'summary': item['summary'],
            }
            for item in top_priority_actions
        ],
    }
    save_json('insight_digest.json', payload)


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
    build_insight_digest()
    refresh_site_meta()
    refresh_sources()
    merge_current_trends_into_archive()
    enrich_paper_metadata()
    print('refresh_data.py completed')


if __name__ == '__main__':
    main()
