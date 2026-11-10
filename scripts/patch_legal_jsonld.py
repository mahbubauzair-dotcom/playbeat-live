#!/usr/bin/env python3
"""Add WebPage JSON-LD to the four legal pages (wrap LegalPage render)."""
import json

PAGES = {
    "privacy-policy": "Privacy Policy",
    "terms": "Terms of Service",
    "dmca": "DMCA & Copyright Policy",
    "content-policy": "Content Sourcing & Streaming Policy",
}

TITLES = {
    "privacy-policy": "Privacy Policy — Playbeat TV",
    "terms": "Terms of Service — Playbeat TV",
    "dmca": "DMCA & Copyright Policy — Playbeat TV",
    "content-policy": "Content Sourcing & Streaming Policy — Playbeat TV",
}

DESCS = {
    "privacy-policy": "Read the Playbeat TV Privacy Policy to understand local browser preferences, hosting-related data handling and third-party streams.",
    "terms": "Review the Playbeat TV Terms of Service, acceptable-use conditions, third-party broadcasting policies and service limitations.",
    "dmca": "Learn how copyright owners can report concerns about television channels listed in the Playbeat TV directory.",
    "content-policy": "Understand the Playbeat TV content sourcing guidelines, excluded streams, copyright considerations and channel removal process.",
}

for slug, h1 in PAGES.items():
    path = f"/home/z/my-project/src/app/{slug}/page.tsx"
    src = open(path, encoding="utf8").read()
    # find the return ( <LegalPage ...> and wrap with fragment + JsonLd
    old = "  return (\n    <LegalPage"
    if old not in src:
        print(f"SKIP {slug}: pattern not found")
        continue
    name = json.dumps(TITLES[slug], ensure_ascii=False)
    desc = json.dumps(DESCS[slug], ensure_ascii=False)
    inject = (
        "  return (\n"
        "    <>\n"
        "      <JsonLd data={webPageJsonLd({\n"
        f"        path: `https://stream.playbeattv.buzz/{slug}`,\n"
        f"        name: {name},\n"
        f"        description: {desc},\n"
        "      })} />\n"
        "      <LegalPage"
    )
    src = src.replace(old, inject, 1)
    # close the fragment: the final `  );\n}` of the component needs `</>`
    # find last `</LegalPage>\n  );\n}` and append
    tail_old = "</LegalPage>\n  );\n}"
    tail_new = "</LegalPage>\n    </>\n  );\n}"
    if tail_old not in src:
        print(f"SKIP {slug}: tail not found")
        continue
    src = src.replace(tail_old, tail_new, 1)
    open(path, "w", encoding="utf8").write(src)
    print(f"json-ld injected: {slug}")
