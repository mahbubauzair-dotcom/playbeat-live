#!/usr/bin/env python3
"""Post-process docx: patch footer PAGE instrText (WPS compat) + remove empty pgNumType from cover."""
import re, shutil, zipfile, os

DOCX = "/home/z/my-project/download/Awesome-Zhuiju-Free-Repository-Analysis.docx"
TMP = DOCX + ".tmp"

with zipfile.ZipFile(DOCX, "r") as zin:
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}

# 1. Map footerReferences (document order) to footer files via rels
doc = data["word/document.xml"].decode("utf-8")
rels = data["word/_rels/document.xml.rels"].decode("utf-8")
rids = re.findall(r'footerReference[^>]*r:id="([^"]+)"', doc)
rid2target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="(footer[^"]+)"', rels))
targets = [rid2target[r] for r in rids if r in rid2target]
print("footer order:", list(zip(rids, targets)))

def patch_footer(xml: str, fmt: str) -> str:
    # fmt: "ROMAN" or "arabic"
    return re.sub(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        lambda m: m.group(1) + f" PAGE \\* {fmt} \\* MERGEFORMAT " + m.group(2),
        xml,
    )

formats = ["ROMAN", "arabic"]  # section 2 = front matter, section 3 = body
for i, t in enumerate(targets):
    key = f"word/{t}"
    xml = data[key].decode("utf-8")
    fmt = formats[i] if i < len(formats) else "arabic"
    patched = patch_footer(xml, fmt)
    if patched != xml:
        print(f"patched {t} -> PAGE \\* {fmt}")
    else:
        print(f"WARNING: no PAGE instrText found in {t}")
    data[key] = patched.encode("utf-8")

# 2. Remove empty pgNumType (cover section artifact)
before = doc.count("<w:pgNumType/>")
doc = doc.replace("<w:pgNumType/>", "")
print(f"removed {before} empty pgNumType")
data["word/document.xml"] = doc.encode("utf-8")

# 3. Rewrite zip preserving order
with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as zout:
    for n in names:
        zout.writestr(n, data[n])
shutil.move(TMP, DOCX)
print("OK", os.path.getsize(DOCX), "bytes")
