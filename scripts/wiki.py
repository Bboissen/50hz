#!/usr/bin/env python3
"""Small wiki maintenance and search CLI for 50Hz."""
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"

REQUIRED_KEYS = ["title", "type", "status", "updated", "tags", "summary", "related"]
ALLOWED_TYPES = {
    "index",
    "canon",
    "axioms",
    "loop",
    "model",
    "system",
    "config",
    "guardrails",
    "glossary",
    "screen",
    "art_direction",
    "naming",
    "visual_system",
    "system_ui",
    "production",
    "agent_brief",
}
ALLOWED_STATUS = {"draft", "reviewed", "stale"}
HEADING_RE = re.compile(r"^(#{1,3})\s+(.+?)\s*$", re.M)


def wiki_pages() -> list[Path]:
    return sorted(path for path in WIKI.rglob("*.md") if path.is_file())


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}, text

    meta: dict[str, object] = {}
    current_key: str | None = None
    for raw_line in match.group(1).splitlines():
        if not raw_line.strip():
            continue
        key_match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):(?:\s+(.*))?$", raw_line)
        if key_match:
            current_key = key_match.group(1)
            value = (key_match.group(2) or "").strip()
            if value == "[]":
                meta[current_key] = []
            elif value.startswith("[") and value.endswith("]"):
                meta[current_key] = [
                    item.strip().strip("\"'")
                    for item in value.strip("[]").split(",")
                    if item.strip()
                ]
            elif value:
                meta[current_key] = value.strip("\"'")
            else:
                meta[current_key] = []
            continue
        item_match = re.match(r"^\s+-\s+(.*)\s*$", raw_line)
        if item_match and current_key:
            meta.setdefault(current_key, [])
            if not isinstance(meta[current_key], list):
                meta[current_key] = [meta[current_key]]
            meta[current_key].append(item_match.group(1).strip().strip("\"'"))

    body = text[match.end() :]
    return meta, body


def page_data(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    headings = [heading for _level, heading in HEADING_RE.findall(body)]
    rel = path.relative_to(ROOT).as_posix()
    return {"path": rel, "meta": meta, "body": body, "headings": headings}


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_.-]+", text.lower())


def resolve_related(path: Path, target: str) -> Path:
    if target.startswith("wiki/"):
        return ROOT / target
    return (path.parent / target).resolve()


def cmd_check(_args: argparse.Namespace) -> int:
    errors: list[str] = []
    for path in wiki_pages():
        data = page_data(path)
        meta = data["meta"]
        rel = data["path"]
        if not meta:
            errors.append(f"{rel}: missing frontmatter")
            continue
        for key in REQUIRED_KEYS:
            if key not in meta:
                errors.append(f"{rel}: missing {key}")
        if meta.get("type") not in ALLOWED_TYPES:
            errors.append(f"{rel}: invalid type {meta.get('type')!r}")
        if meta.get("status") not in ALLOWED_STATUS:
            errors.append(f"{rel}: invalid status {meta.get('status')!r}")
        if not isinstance(meta.get("tags"), list):
            errors.append(f"{rel}: tags must be a list")
        related_links = meta.get("related")
        if not isinstance(related_links, list):
            errors.append(f"{rel}: related must be a list")
        else:
            for related in related_links:
                target = resolve_related(path, str(related))
                if not target.exists():
                    errors.append(f"{rel}: broken related link {related}")

    if errors:
        print("Wiki check failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"OK: checked {len(wiki_pages())} wiki pages")
    return 0


def cmd_index(_args: argparse.Namespace) -> int:
    for data in map(page_data, wiki_pages()):
        meta = data["meta"]
        title = meta.get("title", data["path"])
        tags = ", ".join(meta.get("tags", []))
        summary = meta.get("summary", "")
        print(f"{data['path']}\n  title: {title}\n  tags: {tags}\n  summary: {summary}\n")
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    qtokens = tokenize(" ".join(args.query))
    results: list[tuple[int, dict[str, object]]] = []

    for data in map(page_data, wiki_pages()):
        meta = data["meta"]
        weighted = " ".join(
            [
                str(meta.get("title", "")),
                str(meta.get("summary", "")),
                " ".join(meta.get("tags", [])),
                " ".join(data["headings"]),
                data["body"],
            ]
        )
        counts = Counter(tokenize(weighted))
        score = sum(counts[token] for token in qtokens)
        if qtokens and all(token in counts for token in qtokens):
            score += 8
        if score:
            results.append((score, data))

    for score, data in sorted(results, key=lambda row: (-row[0], row[1]["path"]))[: args.limit]:
        meta = data["meta"]
        headings = "; ".join(data["headings"][:6])
        print(f"{score:>4}  {data['path']}")
        print(f"      title: {meta.get('title', '')}")
        print(f"      summary: {meta.get('summary', '')}")
        print(f"      headings: {headings}\n")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("check").set_defaults(func=cmd_check)
    subparsers.add_parser("index").set_defaults(func=cmd_index)

    search = subparsers.add_parser("search")
    search.add_argument("query", nargs="+")
    search.add_argument("--limit", type=int, default=8)
    search.set_defaults(func=cmd_search)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
