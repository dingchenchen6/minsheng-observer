#!/usr/bin/env python3
"""Export public GitHub Discussions snippets into data/discussion_archive.json."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
USER_AGENT = 'minsheng-observer-discussion-export/1.0'
GRAPHQL_URL = 'https://api.github.com/graphql'


def load_json(name: str):
    with open(DATA / name, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def save_json(name: str, payload):
    with open(DATA / name, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def request_graphql(query: str, variables: dict[str, str], token: str):
    payload = json.dumps({'query': query, 'variables': variables}).encode('utf-8')
    request = Request(
        GRAPHQL_URL,
        data=payload,
        headers={
            'User-Agent': USER_AGENT,
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json'
        },
        method='POST'
    )
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))


def request_graphql_via_gh(query: str, variables: dict[str, str]):
    command = ['gh', 'api', 'graphql', '-f', f'query={query}']
    for key, value in variables.items():
        command.extend(['-F', f'{key}={value}'])
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def map_topic(category_name: str) -> str:
    text = (category_name or '').lower()
    for topic in ['education', 'healthcare', 'housing', 'technology', 'elderly', 'food', 'employment', 'livelihood']:
        if topic in text:
            return topic
    mapping = {
        'general': 'livelihood',
        'q&a': 'livelihood'
    }
    return mapping.get(text, 'livelihood')


def infer_topic_from_text(*parts: str) -> str:
    combined = ' '.join(part for part in parts if part).lower()
    if '欢迎来到民声' in combined or '留言、提交线索与建议' in combined:
        return 'livelihood'
    keyword_map = {
        'employment': ['就业', '求职', '招聘', '毕业', '失业'],
        'healthcare': ['医疗', '医保', '就医', '医院', '门诊'],
        'housing': ['住房', '租房', '保障房', '城中村', '房价'],
        'technology': ['ai', '人工智能', '大模型', '科技', '自动化'],
        'elderly': ['养老', '退休', '照护', '老龄'],
        'food': ['食品', '预制菜', '外卖', '12315', '抽检'],
        'education': ['教育', '高考', '学校', '升学'],
        'livelihood': ['民生', '收入', '社保', '消费']
    }
    matched = [topic for topic, keywords in keyword_map.items() if any(keyword in combined for keyword in keywords)]
    if len(set(matched)) > 1:
        return 'livelihood'
    if matched:
        return matched[0]
    return 'livelihood'


def main():
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    owner = os.environ.get('REPO_OWNER', 'dingchenchen6')
    name = os.environ.get('REPO_NAME', 'minsheng-observer')
    query = '''
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 12, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            id
            title
            bodyText
            url
            createdAt
            upvoteCount
            category { name }
          }
        }
      }
    }
    '''

    try:
        if token:
            response = request_graphql(query, {'owner': owner, 'name': name}, token)
        else:
            response = request_graphql_via_gh(query, {'owner': owner, 'name': name})
    except (URLError, HTTPError, TimeoutError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f'Failed to fetch discussions: {error}')
        return

    nodes = (((response.get('data') or {}).get('repository') or {}).get('discussions') or {}).get('nodes') or []
    if not nodes:
        print('No discussions returned; keeping existing archive.')
        return

    archive = []
    for index, node in enumerate(nodes):
        excerpt = ' '.join((node.get('bodyText') or '').split())[:160] or 'Discussion without body text.'
        archive.append({
            'id': node['id'],
            'source_type': 'featured' if index < 3 else 'latest',
            'title': node.get('title', 'Untitled discussion'),
            'excerpt': excerpt,
            'topic': infer_topic_from_text(node.get('title', ''), node.get('bodyText', ''), (node.get('category') or {}).get('name', '')) or map_topic((node.get('category') or {}).get('name', '')),
            'created_at': node.get('createdAt'),
            'url': node.get('url'),
            'likes': node.get('upvoteCount', 0),
            'featured': index < 3
        })

    save_json('discussion_archive.json', archive)
    print(f'Exported {len(archive)} discussions')


if __name__ == '__main__':
    main()
