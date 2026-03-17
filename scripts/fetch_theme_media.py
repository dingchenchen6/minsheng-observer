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
    'ancient': 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/39628/91784/main-image',
    'cyber': 'https://images.unsplash.com/photo-1672872476232-da16b45c9001?q=80&w=2200&auto=format&fit=crop',
    'future': 'https://assets.science.nasa.gov/content/dam/science/astro/universe/2023/09/Black_Hole_Face_on_View.png/jcr:content/renditions/cq5dam.web.1280.1280.png'
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
        if target.exists() and not args.force:
            print(f'skip {theme}: {target.name}')
            continue
        url = THEME_URLS.get(theme)
        if not url:
            print(f'missing url for {theme}')
            continue
        fetch(url, target)
        print(f'fetched {theme}: {target.name}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
