#!/usr/bin/env python3
"""One-shot: rewrite legal page metadata blocks to the SEO spec (content untouched)."""
import re
import json


def json_dumps(s):
    return json.dumps(s, ensure_ascii=False)


SPEC = {
    "privacy-policy": {
        "title": "Privacy Policy — Playbeat TV",
        "description": "Read the Playbeat TV Privacy Policy to understand local browser preferences, hosting-related data handling and third-party streams.",
    },
    "terms": {
        "title": "Terms of Service — Playbeat TV",
        "description": "Review the Playbeat TV Terms of Service, acceptable-use conditions, third-party broadcasting policies and service limitations.",
    },
    "dmca": {
        "title": "DMCA & Copyright Policy — Playbeat TV",
        "description": "Learn how copyright owners can report concerns about television channels listed in the Playbeat TV directory.",
    },
    "content-policy": {
        "title": "Content Sourcing & Streaming Policy — Playbeat TV",
        "description": "Understand the Playbeat TV content sourcing guidelines, excluded streams, copyright considerations and channel removal process.",
    },
}

BASE = "/home/z/my-project/src/app"

for slug, spec in SPEC.items():
    path = f"{BASE}/{slug}/page.tsx"
    src = open(path, encoding="utf8").read()
    block = re.compile(r"export const metadata: Metadata = \{.*?\};", re.S)
    new_block = (
        "export const metadata: Metadata = pageMetadata({\n"
        f"  title: {json_dumps(spec['title'])},\n"
        f"  description: {json_dumps(spec['description'])},\n"
        f'  path: "/{slug}",\n'
        "});"
    )
    src = block.sub(new_block, src, count=1)
    imp = (
        'import { pageMetadata, webPageJsonLd } from "@/lib/seo";\n'
        'import { JsonLd } from "@/components/stream/json-ld";\n'
    )
    lines = src.split("\n")
    last_import = max(i for i, l in enumerate(lines) if l.startswith("import "))
    lines.insert(last_import + 1, imp.rstrip("\n"))
    src = "\n".join(lines)
    open(path, "w", encoding="utf8").write(src)
    print(f"updated {slug}: title -> {spec['title']!r}")
