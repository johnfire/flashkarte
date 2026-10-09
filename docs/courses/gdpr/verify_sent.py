"""Compare every import_lesson call recorded in a Claude Code transcript (.jsonl) with the fixture it should have sent.
Usage: python3 -I verify_sent.py <en|de> <transcript.jsonl>
Why: the server reports issues: [] even when a look-alike Cyrillic letter slipped into a word; only a diff catches it."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent / 'lessons'
def calls(path):
    for line in open(path):
        try: d = json.loads(line)
        except Exception: continue
        msg = d.get('message') or {}
        content = msg.get('content')
        if not isinstance(content, list): continue
        for c in content:
            if c.get('type') == 'tool_use' and c.get('name', '').endswith('import_lesson'):
                yield c['input']
def diff(a, b, path=''):
    if type(a) != type(b): yield f'{path}: type {type(a).__name__} vs {type(b).__name__}'; return
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b: yield f'{path}.{k}: missing on one side'
            else: yield from diff(a[k], b[k], f'{path}.{k}')
    elif isinstance(a, list):
        if len(a) != len(b): yield f'{path}: length {len(a)} vs {len(b)}'; return
        for i, (x, y) in enumerate(zip(a, b)): yield from diff(x, y, f'{path}[{i}]')
    elif a != b:
        bad = [(i, x, y) for i, (x, y) in enumerate(zip(a, b)) if x != y][:1]
        yield f'{path}: {a[:60]!r} vs {b[:60]!r} first diff {bad}'
locale = sys.argv[1]
bad = 0
for inp in calls(sys.argv[2]):
    slug = inp['lesson']['slug']
    fx = json.load(open(ROOT / locale / f'{slug}.json'))
    sent = {'module': inp['module'], 'lesson': inp['lesson'], 'screens': inp['screens'], 'questions': inp['questions']}
    problems = list(diff(sent, fx))
    print(slug, 'IDENTICAL' if not problems else f'{len(problems)} DIFFERENCES')
    for p in problems[:5]: print('   ', p)
    bad += bool(problems)
print('lessons with differences:', bad)
