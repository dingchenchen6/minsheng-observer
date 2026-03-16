#!/usr/bin/env python3
"""Export public GitHub Discussions snippets into data/discussion_archive.json."""

from __future__ import annotations

import json
import os
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


def main():
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    owner = os.environ.get('REPO_OWNER', 'dingchenchen6')
    name = os.environ.get('REPO_NAME', 'minsheng-observer')
    if not token:
        print('No GitHub token found; keeping existing discussion archive.')
        return

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
      response = request_graphql(query, {'owner': owner, 'name': name}, token)
    except (URLError, HTTPError, TimeoutError) as error:
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
            'topic': map_topic((node.get('category') or {}).get('name', '')),
            'created_at': node.get('createdAt'),
            'url': node.get('url'),
            'likes': node.get('upvoteCount', 0),
            'featured': index < 3
        })

    save_json('discussion_archive.json', archive)
    print(f'Exported {len(archive)} discussions')


if __name__ == '__main__':
    main()
