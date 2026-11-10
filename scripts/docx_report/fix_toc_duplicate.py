#!/usr/bin/env python3
"""Fix duplicate first TOC entry: strip the hyperlink entry embedded in the TOC field-start
paragraph (p0), keeping the 13 uniform injected placeholder entries (p1..p13)."""
import re, shutil, zipfile, os

DOCX = "/home/z/my-project/download/Awesome-Zhuiju-Free-Repository-Analysis.docx"
TMP = DOCX + ".tmp"

with zipfile.ZipFile(DOCX, "r") as zin:
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}

doc = data["word/document.xml"].decode("utf-8")

sdt_start = doc.find("<w:sdtContent>")
sdt_end = doc.find("</w:sdtContent>", sdt_start)
region = doc[sdt_start:sdt_end]

# First paragraph of sdtContent = field-start paragraph (holds begin+instrText+separate + entry #1)
m = re.search(r"<w:p>.*?</w:p>", region, re.S)
p0 = m.group(0)

if "<w:hyperlink" in p0 and 'w:fldCharType="separate"' in p0:
    fixed_p0 = re.sub(r"<w:hyperlink.*?</w:hyperlink>", "", p0, count=1, flags=re.S)
    # verify field-start runs survived
    assert 'w:fldCharType="begin"' in fixed_p0 and 'w:fldCharType="separate"' in fixed_p0, "field runs lost"
    assert "<w:hyperlink" not in fixed_p0, "hyperlink not removed"
    region_fixed = region.replace(p0, fixed_p0, 1)
    doc = doc[:sdt_start] + region_fixed + doc[sdt_end:]
    print("stripped duplicate hyperlink entry from field-start paragraph")
else:
    print("no duplicate found in field-start paragraph; nothing to do")

data["word/document.xml"] = doc.encode("utf-8")
with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as zout:
    for n in names:
        zout.writestr(n, data[n])
shutil.move(TMP, DOCX)
print("OK", os.path.getsize(DOCX), "bytes")
