#!/usr/bin/env python3
"""
scripts/update-todos.py
Development Workspace Standard v1.1 (§35)
Tự động quét .ai/tasks/ sinh TODOS.md và cập nhật .ai/state.json.
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from pathlib import Path

# Cấu hình UTF-8 cho Windows console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Tìm PROJECT_ROOT (thư mục chứa script/..)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
AI_DIR = PROJECT_ROOT / ".ai"
TASKS_DIR = AI_DIR / "tasks"
STATE_FILE = AI_DIR / "state.json"
TODOS_FILE = PROJECT_ROOT / "TODOS.md"

STATUS_FOLDERS = ["backlog", "ready", "running", "review", "blocked", "done"]

def parse_yaml_simple(content: str) -> dict:
    """Parse YAML cơ bản không cần thư viện bên ngoài."""
    data = {}
    lines = content.splitlines()
    current_key = None
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
            
        # List item
        if stripped.startswith("- "):
            val = stripped[2:].strip().strip('"').strip("'")
            if current_key and isinstance(data.get(current_key), list):
                data[current_key].append(val)
            continue
            
        # Key-value
        if ":" in stripped:
            parts = stripped.split(":", 1)
            key = parts[0].strip()
            val = parts[1].strip().strip('"').strip("'")
            
            if not val:
                data[key] = []
                current_key = key
            else:
                data[key] = val
                current_key = key
                
    return data

def main():
    if not TASKS_DIR.exists():
        print(f"Error: {TASKS_DIR} does not exist.")
        sys.exit(1)

    tasks_by_status = {s: [] for s in STATUS_FOLDERS}
    violations = []

    for status in STATUS_FOLDERS:
        folder = TASKS_DIR / status
        if not folder.exists():
            folder.mkdir(parents=True, exist_ok=True)
            continue

        for file_path in sorted(folder.glob("*.yaml")):
            try:
                content = file_path.read_text(encoding="utf-8")
                task = parse_yaml_simple(content)
                task["_file"] = file_path.name
                task["_status"] = status

                # Kiểm tra vi phạm luật cứng §35
                task_id = task.get("id", file_path.stem)
                owner = task.get("owner", "").strip()
                if status == "running" and (not owner or owner.lower() == "unassigned"):
                    violations.append(f"❌ [Luật §35] Task {task_id} ở trạng thái 'running' nhưng KHÔNG có owner!")

                if status == "blocked" and not task.get("blocked_reason"):
                    violations.append(f"❌ [Luật §35] Task {task_id} ở trạng thái 'blocked' nhưng KHÔNG có lý do 'blocked_reason'!")

                tasks_by_status[status].append(task)
            except Exception as e:
                violations.append(f"⚠️ Lỗi đọc file {file_path.name}: {e}")

    total_tasks = sum(len(tasks_by_status[s]) for s in STATUS_FOLDERS)

    # Cập nhật .ai/state.json
    state_data = {
        "project_status": "development",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": {
            "total_tasks": total_tasks,
            "backlog": len(tasks_by_status["backlog"]),
            "ready": len(tasks_by_status["ready"]),
            "running": len(tasks_by_status["running"]),
            "review": len(tasks_by_status["review"]),
            "blocked": len(tasks_by_status["blocked"]),
            "done": len(tasks_by_status["done"]),
        },
        "violations": violations
    }

    if STATE_FILE.exists():
        try:
            old_state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            if "agents_status" in old_state:
                state_data["agents_status"] = old_state["agents_status"]
            if "health" in old_state:
                state_data["health"] = old_state["health"]
        except Exception:
            pass

    STATE_FILE.write_text(json.dumps(state_data, indent=2, ensure_ascii=False), encoding="utf-8")

    # Sinh file TODOS.md
    todos_content = []
    todos_content.append("# 📋 DASHBOARD TIẾN ĐỘ NHIỆM VỤ (TODOS.md)")
    todos_content.append("")
    todos_content.append("> **CẢNH BÁO**: File này được sinh tự động bởi `python scripts/update-todos.py` từ nguồn sự thật `.ai/tasks/`.")
    todos_content.append("> **CẤM SỬA TAY FILE NÀY**. Thay đổi trạng thái bằng cách di chuyển file YAML giữa các thư mục trạng thái.")
    todos_content.append(f"> **Cập nhật lần cuối**: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`")
    todos_content.append("")

    # Progress bar
    done_count = len(tasks_by_status["done"])
    percent = round((done_count / total_tasks * 100) if total_tasks > 0 else 0, 1)
    bar_len = 25
    filled_len = int(bar_len * percent // 100)
    bar = "█" * filled_len + "░" * (bar_len - filled_len)
    
    todos_content.append("## 📊 TỔNG QUAN TIẾN ĐỘ")
    todos_content.append("")
    todos_content.append(f"**Tiến độ dự án**: `[{bar}] {percent}%` ({done_count}/{total_tasks} tasks hoàn thành)")
    todos_content.append("")
    todos_content.append("| Trạng thái | Thư mục nguồn | Số lượng |")
    todos_content.append("|---|---|:---:|")
    todos_content.append(f"| 📥 **Backlog** | `.ai/tasks/backlog/` | {len(tasks_by_status['backlog'])} |")
    todos_content.append(f"| 🟢 **Ready** | `.ai/tasks/ready/` | {len(tasks_by_status['ready'])} |")
    todos_content.append(f"| ⚡ **Running** | `.ai/tasks/running/` | {len(tasks_by_status['running'])} |")
    todos_content.append(f"| 🔍 **Review** | `.ai/tasks/review/` | {len(tasks_by_status['review'])} |")
    todos_content.append(f"| 🛑 **Blocked** | `.ai/tasks/blocked/` | {len(tasks_by_status['blocked'])} |")
    todos_content.append(f"| ✅ **Done** | `.ai/tasks/done/` | {len(tasks_by_status['done'])} |")
    todos_content.append("")

    if violations:
        todos_content.append("## ⚠️ CẢNH BÁO VI PHẠM LUẬT TRẠNG THÁI (§35)")
        todos_content.append("")
        for v in violations:
            todos_content.append(f"- {v}")
        todos_content.append("")

    # Render danh sách task chi tiết theo từng trạng thái
    status_titles = [
        ("running", "⚡ ĐANG THỰC HIỆN (RUNNING)"),
        ("review", "🔍 CHỜ REVIEW & QUALITY GATE (REVIEW)"),
        ("ready", "🟢 SẴN SÀNG NHẬN (READY)"),
        ("blocked", "🛑 BỊ KẸT (BLOCKED)"),
        ("backlog", "📥 HÀNG ĐỢI (BACKLOG)"),
        ("done", "✅ ĐÃ HOÀN THÀNH (DONE)"),
    ]

    for status_key, title in status_titles:
        tasks = tasks_by_status[status_key]
        todos_content.append(f"## {title} ({len(tasks)})")
        todos_content.append("")
        if not tasks:
            todos_content.append("_Không có nhiệm vụ nào._")
            todos_content.append("")
            continue

        todos_content.append("| ID | Tiêu đề nhiệm vụ | Phân loại | Ưu tiên | Người phụ trách | File cấu hình |")
        todos_content.append("|:---|:---|:---:|:---:|:---:|:---|")
        for t in tasks:
            t_id = t.get("id", "N/A")
            t_title = t.get("title", "Không có tiêu đề")
            t_cat = t.get("category", "General")
            t_prio = t.get("priority", "medium").upper()
            t_owner = t.get("owner", "unassigned")
            t_file = t.get("_file", "")
            todos_content.append(f"| **{t_id}** | {t_title} | `{t_cat}` | **{t_prio}** | `{t_owner}` | [`.ai/tasks/{status_key}/{t_file}`](file:///{AI_DIR.as_posix()}/tasks/{status_key}/{t_file}) |")
        todos_content.append("")

    TODOS_FILE.write_text("\n".join(todos_content), encoding="utf-8")
    print(f"✅ Đã cập nhật {TODOS_FILE.name} ({total_tasks} tasks) và {STATE_FILE.name}")
    if violations:
        for v in violations:
            print(v)

if __name__ == "__main__":
    main()

