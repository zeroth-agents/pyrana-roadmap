#!/usr/bin/env python3
"""
Pyrana Roadmap CLI — portable API wrapper for the roadmap skill.

Usage:
    python roadmap_cli.py board
    python roadmap_cli.py show "Harness"
    python roadmap_cli.py move "Harness" now
    python roadmap_cli.py sync
    python roadmap_cli.py ideas [--status open|promoted|archived] [--pillar "Name"] [--sort votes|newest|comments|priority]
    python roadmap_cli.py idea-create --title "Title" --body "Description" [--pillar "Name"]
    python roadmap_cli.py vote "name or id"
    python roadmap_cli.py promote "name or id" --pillar "Name" [--lane backlog]
    python roadmap_cli.py pillars

Environment:
    ROADMAP_API_URL   — Base URL (default: https://roadmap.pyrana.ai)
    ROADMAP_API_TOKEN — Personal access token (required)
"""

import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

API_URL = os.environ.get("ROADMAP_API_URL", "https://roadmap.pyrana.ai").rstrip("/")
TOKEN = os.environ.get("ROADMAP_API_TOKEN", "")


def _headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _request(method: str, path: str, body: dict | None = None) -> dict | list:
    url = f"{API_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=_headers(), method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        if e.code == 401:
            _die("401 Unauthorized — token may be expired. Visit settings to regenerate.")
        elif e.code == 404:
            _die(f"404 Not Found — {body_text or 'item does not exist'}")
        else:
            _die(f"HTTP {e.code}: {body_text}")
    except urllib.error.URLError as e:
        _die(f"Connection failed — {e.reason}. Is {API_URL} reachable?")


def _get(path: str):
    return _request("GET", path)


def _post(path: str, body: dict | None = None):
    return _request("POST", path, body)


def _patch(path: str, body: dict):
    return _request("PATCH", path, body)


def _die(msg: str):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

def _pillars() -> list[dict]:
    return _get("/api/pillars")


def _pillar_map() -> dict[str, str]:
    """id -> name"""
    return {p["id"]: p["name"] for p in _pillars()}


def _pillar_id_by_name(name: str) -> str:
    for p in _pillars():
        if name.lower() in p["name"].lower():
            return p["id"]
    _die(f"No pillar matching '{name}'")


def _initiatives() -> list[dict]:
    return _get("/api/initiatives")


def _ideas(params: dict | None = None) -> list[dict]:
    qs = ""
    if params:
        qs = "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v})
    return _get(f"/api/ideas{qs}")


def _match_one(items: list[dict], query: str, label: str = "item") -> dict:
    """UUID or case-insensitive substring match on title."""
    # UUID check
    if len(query) == 36 and query.count("-") == 4:
        for item in items:
            if item["id"] == query:
                return item
        _die(f"No {label} with ID '{query}'")

    matches = [i for i in items if query.lower() in i["title"].lower()]
    if len(matches) == 1:
        return matches[0]
    elif len(matches) == 0:
        _die(f"No {label} matching '{query}'")
    else:
        print(f"Multiple {label}s match '{query}':")
        for i, m in enumerate(matches, 1):
            print(f"  {i}. {m['title']}  ({m['id'][:8]})")
        _die("Be more specific or use the full ID.")


def _fmt_date(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return iso[:10]


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_pillars():
    for p in _pillars():
        print(f"  {p['name']}")
        if p.get("description"):
            print(f"    {p['description']}")


def cmd_board():
    pmap = _pillar_map()
    inits = _initiatives()

    lanes = ["now", "next", "backlog", "done"]
    by_pillar: dict[str, dict[str, list]] = {}

    for ini in inits:
        pid = ini.get("pillarId", "unknown")
        pname = pmap.get(pid, "Unknown")
        by_pillar.setdefault(pname, {l: [] for l in lanes})
        lane = ini.get("lane", "backlog")
        if lane in by_pillar[pname]:
            by_pillar[pname][lane].append(ini)

    for pname in sorted(by_pillar.keys()):
        print(f"\n## {pname}")
        for lane in lanes:
            items = by_pillar[pname][lane]
            if not items:
                continue
            print(f"\n  **{lane.upper()}**")
            for it in items:
                done = it.get("issueCountDone", 0)
                total = it.get("issueCountTotal", 0)
                progress = f" ({done}/{total})" if total else ""
                size = f" [{it.get('size', '?')}]" if it.get("size") else ""
                print(f"    - {it['title']}{size}{progress}")


def cmd_show(query: str):
    pmap = _pillar_map()
    ini = _match_one(_initiatives(), query, "initiative")

    done = ini.get("issueCountDone", 0)
    total = ini.get("issueCountTotal", 0)

    print(f"# {ini['title']}")
    print(f"  Pillar:   {pmap.get(ini.get('pillarId', ''), '?')}")
    print(f"  Lane:     {ini.get('lane', '?')}")
    print(f"  Size:     {ini.get('size', '?')}")
    print(f"  Progress: {done}/{total} issues")
    if ini.get("why"):
        print(f"  Why:      {ini['why']}")
    if ini.get("linearProjectUrl"):
        print(f"  Linear:   {ini['linearProjectUrl']}")
    if ini.get("description"):
        print(f"\n  {ini['description']}")
    if ini.get("content"):
        print(f"\n  {ini['content'][:500]}")

    milestones_raw = ini.get("milestones", "[]")
    if isinstance(milestones_raw, str):
        try:
            milestones = json.loads(milestones_raw)
        except json.JSONDecodeError:
            milestones = []
    else:
        milestones = milestones_raw

    if milestones:
        print("\n  Milestones:")
        for m in sorted(milestones, key=lambda x: x.get("sortOrder", 0)):
            prog = m.get("progress", 0)
            print(f"    [{prog:>3}%] {m.get('name', '?')}")

    print(f"\n  Created:  {_fmt_date(ini.get('createdAt'))}")
    print(f"  Updated:  {_fmt_date(ini.get('updatedAt'))}")
    if ini.get("createdByName"):
        print(f"  By:       {ini['createdByName']}")


def cmd_move(query: str, lane: str):
    valid = ("now", "next", "backlog", "done")
    if lane not in valid:
        _die(f"Invalid lane '{lane}'. Must be one of: {', '.join(valid)}")

    ini = _match_one(_initiatives(), query, "initiative")
    result = _patch(f"/api/initiatives/{ini['id']}", {"lane": lane})
    print(f"Moved '{result.get('title', ini['title'])}' to {lane}")


def cmd_sync():
    result = _post("/api/sync/linear")
    print(f"Sync complete: {result.get('created', 0)} created, "
          f"{result.get('updated', 0)} updated, "
          f"{result.get('errors', []) or 'no'} errors")


def cmd_ideas(status=None, pillar=None, sort=None):
    params = {}
    if status:
        params["status"] = status
    if pillar:
        params["pillarId"] = _pillar_id_by_name(pillar)
    if sort:
        params["sort"] = sort

    ideas = _ideas(params)
    if not ideas:
        print("No ideas found.")
        return

    print(f"{'Votes':>5}  {'Title':<50}  {'Author':<12}  {'Status':<10}  Created")
    print("-" * 100)
    for idea in ideas:
        votes = idea.get("voteCount", 0)
        title = idea.get("title", "?")[:50]
        author = idea.get("authorName", "?")[:12]
        status_val = idea.get("status", "?")
        created = _fmt_date(idea.get("createdAt"))
        print(f"{votes:>5}  {title:<50}  {author:<12}  {status_val:<10}  {created}")


def cmd_idea_create(title: str, body: str, pillar: str | None = None):
    payload: dict = {"title": title, "body": body}
    if pillar:
        payload["pillarId"] = _pillar_id_by_name(pillar)
    result = _post("/api/ideas", payload)
    print(f"Idea created: '{result.get('title', title)}' (ID: {result.get('id', '?')[:8]})")


def cmd_vote(query: str):
    idea = _match_one(_ideas(), query, "idea")
    result = _post(f"/api/ideas/{idea['id']}/vote")
    action = "Voted for" if result.get("voted") else "Removed vote for"
    print(f"{action} '{idea['title']}'. Total votes: {result.get('voteCount', '?')}")


def cmd_attachments(target_type: str, query: str):
    """List attachments for an idea or initiative."""
    if target_type == "idea":
        item = _match_one(_ideas(), query, "idea")
    else:
        item = _match_one(_initiatives(), query, "initiative")

    atts = _get(f"/api/attachments?target_type={target_type}&target_id={item['id']}")
    if not atts:
        print(f"No attachments on '{item['title']}'.")
        return

    print(f"Attachments for '{item['title']}':")
    for a in atts:
        linked = " (linked)" if not a.get("driveFolderId") else ""
        print(f"  - {a['fileName']}{linked}")
        print(f"    {a['driveUrl']}")
        print(f"    Uploaded by {a.get('uploadedByName', '?')} on {_fmt_date(a.get('createdAt'))}")


def cmd_attach(target_type: str, query: str, file_path: str):
    """Upload a file attachment to an idea or initiative."""
    import mimetypes

    if target_type == "idea":
        item = _match_one(_ideas(), query, "idea")
    else:
        item = _match_one(_initiatives(), query, "initiative")

    if not os.path.isfile(file_path):
        _die(f"File not found: {file_path}")

    file_name = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

    # Build multipart form data manually (no external deps)
    boundary = "----PyranaUploadBoundary"
    body_parts = []

    # targetType field
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"targetType\"\r\n\r\n{target_type}")
    # targetId field
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"targetId\"\r\n\r\n{item['id']}")

    # File field
    with open(file_path, "rb") as f:
        file_data = f.read()

    file_header = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{file_name}\"\r\n"
        f"Content-Type: {mime_type}\r\n\r\n"
    )

    # Assemble body as bytes
    body_bytes = "\r\n".join(body_parts).encode() + b"\r\n" + file_header.encode() + file_data + f"\r\n--{boundary}--\r\n".encode()

    url = f"{API_URL}/api/attachments"
    req = urllib.request.Request(url, data=body_bytes, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
            print(f"Attached '{result.get('fileName', file_name)}' to '{item['title']}'")
            print(f"  Drive URL: {result.get('driveUrl', '?')}")
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        _die(f"Upload failed — HTTP {e.code}: {body_text}")


def cmd_promote(query: str, pillar: str, lane: str = "backlog"):
    idea = _match_one(_ideas(), query, "idea")
    if idea.get("status") != "open":
        _die(f"Idea '{idea['title']}' has status '{idea.get('status')}' — only open ideas can be promoted.")

    pillar_id = _pillar_id_by_name(pillar)
    result = _post(f"/api/ideas/{idea['id']}/promote", {"pillarId": pillar_id, "lane": lane})
    print(f"Promoted '{idea['title']}' to initiative under '{pillar}' in {lane}.")
    if result.get("linearProjectUrl"):
        print(f"Linear: {result['linearProjectUrl']}")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def _usage():
    print(__doc__)
    sys.exit(0)


def main():
    if not TOKEN:
        _die("ROADMAP_API_TOKEN not set. Run `/roadmap token` for setup instructions.")

    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        _usage()

    cmd = args[0]

    if cmd == "board":
        cmd_board()

    elif cmd == "pillars":
        cmd_pillars()

    elif cmd == "show":
        if len(args) < 2:
            _die("Usage: roadmap_cli.py show <name>")
        cmd_show(args[1])

    elif cmd == "move":
        if len(args) < 3:
            _die("Usage: roadmap_cli.py move <name> <lane>")
        cmd_move(args[1], args[2])

    elif cmd == "sync":
        cmd_sync()

    elif cmd == "ideas":
        status = pillar = sort = None
        i = 1
        while i < len(args):
            if args[i] == "--status" and i + 1 < len(args):
                status = args[i + 1]; i += 2
            elif args[i] == "--pillar" and i + 1 < len(args):
                pillar = args[i + 1]; i += 2
            elif args[i] == "--sort" and i + 1 < len(args):
                sort = args[i + 1]; i += 2
            else:
                i += 1
        cmd_ideas(status, pillar, sort)

    elif cmd == "idea-create":
        title = body = pillar = None
        i = 1
        while i < len(args):
            if args[i] == "--title" and i + 1 < len(args):
                title = args[i + 1]; i += 2
            elif args[i] == "--body" and i + 1 < len(args):
                body = args[i + 1]; i += 2
            elif args[i] == "--pillar" and i + 1 < len(args):
                pillar = args[i + 1]; i += 2
            else:
                i += 1
        if not title or not body:
            _die("Usage: roadmap_cli.py idea-create --title '...' --body '...' [--pillar '...']")
        cmd_idea_create(title, body, pillar)

    elif cmd == "vote":
        if len(args) < 2:
            _die("Usage: roadmap_cli.py vote <name-or-id>")
        cmd_vote(args[1])

    elif cmd == "promote":
        query = pillar = None
        lane = "backlog"
        if len(args) >= 2:
            query = args[1]
        i = 2
        while i < len(args):
            if args[i] == "--pillar" and i + 1 < len(args):
                pillar = args[i + 1]; i += 2
            elif args[i] == "--lane" and i + 1 < len(args):
                lane = args[i + 1]; i += 2
            else:
                i += 1
        if not query or not pillar:
            _die("Usage: roadmap_cli.py promote <name-or-id> --pillar '...' [--lane backlog]")
        cmd_promote(query, pillar, lane)

    elif cmd == "attachments":
        if len(args) < 3:
            _die("Usage: roadmap_cli.py attachments <idea|initiative> <name-or-id>")
        cmd_attachments(args[1], args[2])

    elif cmd == "attach":
        target_type = "initiative"
        query = file_path = None
        i = 1
        while i < len(args):
            if args[i] == "--idea" and i + 1 < len(args):
                target_type = "idea"; query = args[i + 1]; i += 2
            elif args[i] == "--initiative" and i + 1 < len(args):
                target_type = "initiative"; query = args[i + 1]; i += 2
            elif args[i] == "--file" and i + 1 < len(args):
                file_path = args[i + 1]; i += 2
            else:
                i += 1
        if not query or not file_path:
            _die("Usage: roadmap_cli.py attach --idea|--initiative <name> --file <path>")
        cmd_attach(target_type, query, file_path)

    else:
        _die(f"Unknown command '{cmd}'. Run with --help for usage.")


if __name__ == "__main__":
    main()
