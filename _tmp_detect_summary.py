import json
from pathlib import Path
from collections import Counter

d = json.loads(Path('.graphify_detect.json').read_text())
files = d.get('files', {})
total = d.get('total_files', 0)
words = d.get('total_words', 0)
print(f'total_files={total}')
print(f'total_words={words}')
for k, v in files.items():
    print(f'{k}={len(v)}')
print(f'skipped_sensitive={len(d.get("skipped_sensitive", []))}')
warn = d.get('warning')
print(f'warning={warn}')
subdirs = Counter()
for cat, flist in files.items():
    for f in flist:
        p = Path(f)
        sub = p.parts[0] if p.parts else '.'
        subdirs[sub] += 1
for sub, cnt in subdirs.most_common(5):
    print(f'topdir={sub}:{cnt}')
