#!/usr/bin/env python3
"""Fetch external theme art assets into assets/theme/."""
from __future__ import annotations

import argparse
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / 'data' / 'theme_media.json'
ASSET_DIR = ROOT / 'assets' / 'theme'

THEME_URLS = {
    'ancient': 'https://images.unsplash.com/photo-1741568714270-a36886b7b083?q=80&w=2400&h=1350&auto=format&fit=crop&crop=entropy',
    'cyber': 'https://images.unsplash.com/photo-1672872476232-da16b45c9001?q=80&w=2200&auto=format&fit=crop',
    'future': 'https://images.unsplash.com/photo-1707057539184-27e90364e30a?q=80&w=2600&auto=format&fit=crop'
}
ICON_URLS = {
    'ancient': 'https://unpkg.com/lucide-static@latest/icons/flower-2.svg',
    'cyber': 'https://unpkg.com/lucide-static@latest/icons/cpu.svg',
    'future': 'https://unpkg.com/lucide-static@latest/icons/orbit.svg'
}


def load_theme_media() -> list[dict]:
    return json.loads(DATA_FILE.read_text(encoding='utf-8'))


def fetch(url: str, destination: pathlib.Path) -> None:
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        destination.write_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser(description='Fetch theme media assets.')
    parser.add_argument('--force', action='store_true', help='Re-download even if files already exist.')
    args = parser.parse_args()

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    theme_media = load_theme_media()

    for item in theme_media:
        theme = item['theme']
        target = ROOT / item['local_asset']
        url = THEME_URLS.get(theme)
        if target.exists() and not args.force:
            print(f'skip {theme}: {target.name}')
        elif not url:
            print(f'missing url for {theme}')
        else:
            fetch(url, target)
            print(f'fetched {theme}: {target.name}')

        icon_target = ROOT / item.get('icon_asset', '')
        icon_url = ICON_URLS.get(theme)
        if icon_target.name and icon_url:
            if icon_target.exists() and not args.force:
                print(f'skip {theme} icon: {icon_target.name}')
            else:
                icon_target.parent.mkdir(parents=True, exist_ok=True)
                fetch(icon_url, icon_target)
                print(f'fetched {theme} icon: {icon_target.name}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
