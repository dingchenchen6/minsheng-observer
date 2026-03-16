#!/usr/bin/env python3
"""Refresh metadata, source check timestamps, trend archive snapshots, and paper metadata."""

from __future__ import annotations

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


def refresh_social_topics():
    script = ROOT / 'scripts' / 'fetch_social_topics.py'
    try:
        subprocess.run(['python3', str(script)], cwd=ROOT, check=True)
    except Exception as error:
        print(f'social topic refresh skipped: {error}')


def main():
    refresh_social_topics()
    refresh_site_meta()
    refresh_sources()
    merge_current_trends_into_archive()
    enrich_paper_metadata()
    print('refresh_data.py completed')


if __name__ == '__main__':
    main()
