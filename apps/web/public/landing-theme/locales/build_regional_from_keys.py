#!/usr/bin/env python3
"""
Merge regional.json: for each locale, fill all keys present in `te` by translating
the English *key* string (same string used in data-en / regionalLookup), then overlay
existing hand translations so curated entries win.

Requires: pip install deep-translator
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("Install: pip install deep-translator", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
REG = ROOT / "regional.json"

# Google Translate language codes
LANGS = {
    "ta": "ta",
    "kn": "kn",
    "mr": "mr",
    "bn": "bn",
    "gu": "gu",
    "ml": "ml",
    "ur": "ur",
    "pa": "pa",
    "ne": "ne",
}


def translate_key(text: str, target: str, delay: float) -> str:
    t = (text or "").strip()
    if not t:
        return t
    # Preserve pure symbols / numbers-only lines
    if t in ("4", "1000+", "100%", "—", "RTI", "BASLP", "PGDEI", "ASLP", "AVT", "SLP"):
        return t
    try:
        out = GoogleTranslator(source="en", target=target).translate(t)
        time.sleep(delay)
        return out or t
    except Exception:
        time.sleep(delay * 2)
        return t


def main() -> None:
    data = json.loads(REG.read_text(encoding="utf-8"))
    te = data.get("te") or {}
    keys = list(te.keys())
    delay = 0.04

    for code, gcode in LANGS.items():
        print(f"Building {code} ({gcode})…", flush=True)
        auto: dict[str, str] = {}
        for i, k in enumerate(keys):
            if (i + 1) % 25 == 0:
                print(f"  {i + 1}/{len(keys)}", flush=True)
            auto[k] = translate_key(k, gcode, delay)
        existing = data.get(code)
        if isinstance(existing, dict) and existing:
            merged = {**auto, **existing}
        else:
            merged = auto
        data[code] = merged

    REG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", REG, flush=True)


if __name__ == "__main__":
    main()
