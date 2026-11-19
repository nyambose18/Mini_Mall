"""Download the catalogue's original photographs and retain their source credits."""

import argparse
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import time
import urllib.parse


PHOTO_DIR = Path(__file__).resolve().parents[1] / 'client/public/images/photos'
MANIFEST = PHOTO_DIR / 'sources.json'


class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image = None
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('property') == 'og:image':
            self.image = attrs.get('content')

    def handle_data(self, data):
        self.text.append(data)


def plain_text(value):
    parser = MetadataParser()
    parser.feed(value)
    return ''.join(parser.text)


def fetch(url):
    # Use the system HTTPS client and certificate store on Windows.
    result = subprocess.run([
        'curl.exe', '--fail', '--silent', '--show-error', '--location', '--max-time', '30',
        '--user-agent', 'MiniMallTeachingCatalogue/1.0 (local educational demo)',
        '--write-out', '\n%{content_type}', url,
    ], capture_output=True)
    if result.returncode:
        raise OSError(result.stderr.decode('utf-8', errors='replace').strip())
    raw, content_type = result.stdout.rsplit(b'\n', 1)
    return raw, content_type.decode().split(';')[0]


def main():
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument('--refresh', nargs='*', default=[])
    options = arguments.parse_args()
    photos = json.loads(MANIFEST.read_text(encoding='utf-8'))
    commons = [photo for photo in photos if photo.get('commons') and not photo.get('url')]
    query = urllib.parse.urlencode({
        'action': 'query', 'format': 'json',
        'titles': '|'.join(photo['commons'] for photo in commons),
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 960,
    })
    info = {}
    if commons:
        raw, _ = fetch('https://commons.wikimedia.org/w/api.php?' + query)
        pages = json.loads(raw)['query']['pages'].values()
        info = {page['title']: page['imageinfo'][0] for page in pages if 'imageinfo' in page}
    failures = []
    for photo in photos:
        try:
            target = PHOTO_DIR / photo['file']
            if target.exists() and photo['file'] not in options.refresh:
                print(f"Present: {photo['file']}", flush=True)
                continue
            if photo.get('commons') in info:
                image = info[photo['commons']]
                photo['url'] = image.get('thumburl', image['url']).split('?')[0]
                photo['source'] = image['descriptionurl']
                metadata = image.get('extmetadata', {})
                photo['credit'] = plain_text(metadata.get('Artist', {}).get('value', 'Wikimedia Commons contributor'))
                photo['license'] = plain_text(metadata.get('LicenseShortName', {}).get('value', 'See source'))
                photo['licenseUrl'] = metadata.get('LicenseUrl', {}).get('value', '')
            if not photo.get('url'):
                raw, _ = fetch(photo['source'])
                parser = MetadataParser()
                parser.feed(raw.decode('utf-8', errors='replace'))
                if not parser.image:
                    raise ValueError('No product photo metadata found')
                photo['url'] = urllib.parse.urljoin(photo['source'], parser.image)
            if not target.exists() or photo['file'] in options.refresh:
                raw, mime = fetch(photo['url'])
                if mime not in ('image/jpeg', 'image/jpg', 'image/png', 'image/webp'):
                    raise ValueError('Expected a photograph, received ' + mime)
                target.write_bytes(raw)
                print(f"Downloaded {photo['file']}: {len(raw)} bytes", flush=True)
        except Exception as error:
            failures.append(photo['file'])
            print(f"FAILED {photo['file']}: {error}", flush=True)
        time.sleep(1)
    MANIFEST.write_text(json.dumps(photos, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
    credits = []
    for photo in photos:
        source = html.escape(photo.get('source', ''), quote=True)
        license_url = html.escape(photo.get('licenseUrl', photo.get('source', '')), quote=True)
        credits.append(f'<li><strong>{html.escape(photo["file"])}</strong>: '
                       f'{html.escape(photo.get("credit", ""))}. '
                       f'<a href="{source}">Original source</a>. '
                       f'<a href="{license_url}">{html.escape(photo.get("license", "See source"))}</a>.'
                       f'{" Representative product photo." if photo.get("reference") else ""}</li>')
    (PHOTO_DIR / 'credits.html').write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>Mini Mall Photo Credits</title>'
        '<style>body{max-width:960px;margin:32px auto;padding:0 20px;font:16px/1.6 system-ui}'
        'li{margin-bottom:16px;overflow-wrap:anywhere}a{color:#165fa4}</style>'
        '<h1>Product Photo Credits</h1><p>Real product photographs used in the Mini Mall '
        'teaching demo. Supplier photographs remain the property of their owners. '
        'Fictional models and generic kits use representative photographs; '
        'the listing specifications and contents describe the demo item.</p><ul>'
        + ''.join(credits) + '</ul><a href="/products">Back to products</a></html>',
        encoding='utf-8',
    )
    if failures:
        raise SystemExit('Missing photographs: ' + ', '.join(failures))


if __name__ == '__main__':
    main()
