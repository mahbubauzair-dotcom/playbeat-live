#!/usr/bin/env python3
"""Splice the new footer into src/components/stream/app-shell.tsx
Replaces lines 842..1025 (1-indexed) — the old footer block — with
scripts/new-footer.txt, and adds ArrowUp + Mail to the lucide imports.
"""
import io, sys

PATH = "/home/z/my-project/src/components/stream/app-shell.tsx"
NEW = "/home/z/my-project/scripts/new-footer.txt"

with io.open(PATH, encoding="utf-8") as f:
    lines = f.readlines()

# sanity checks on anchors (1-indexed)
assert "FOOTER" in lines[841], f"line 842 mismatch: {lines[841]!r}"
assert lines[1024].strip() == "</footer>", f"line 1025 mismatch: {lines[1024]!r}"

with io.open(NEW, encoding="utf-8") as f:
    new_block = f.read()
if not new_block.endswith("\n"):
    new_block += "\n"

out = lines[:841] + [new_block] + lines[1025:]
src = "".join(out)

# imports: add ArrowUp (before ArrowUpRight) and Mail (after Info,)
assert "  ArrowUpRight,\n" in src
src = src.replace("  ArrowUpRight,\n", "  ArrowUp,\n  ArrowUpRight,\n", 1)
assert "  Info,\n" in src
src = src.replace("  Info,\n", "  Info,\n  Mail,\n", 1)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("footer spliced OK; total lines now:", src.count("\n"))
