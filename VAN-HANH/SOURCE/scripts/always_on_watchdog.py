#!/usr/bin/env python3
"""
======================================================================
CRM NETVIETSOFT — BỘ ĐIỀU KHIỂN TRUNG TÂM (ALWAYS-ON WATCHDOG SCRIPT)
======================================================================
Vị trí: D:\\SetupC\\WWW\\crm\\VAN-HANH\\SOURCE\\scripts\\always_on_watchdog.py
Nguyên tắc:
- Vận hành vòng lặp vô tận while True với cơ chế chống crash.
- Giám sát sức khỏe Backend (Port 3901), Frontend (Port 3900), Database và Task State.
- Tự động ghi nhật ký (Heartbeat & Health status) vào watchdog.log.
- Chu kỳ kiểm tra định kỳ 5 phút (300 giây).
"""

import os
import sys
import time
import socket
import logging
from datetime import datetime

# Thiết lập đường dẫn gốc
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
LOG_FILE = os.path.join(SCRIPT_DIR, "watchdog.log")

# Đảm bảo UTF-8 cho Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [WATCHDOG] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)


def check_port(host: str, port: int, timeout: float = 3.0) -> bool:
    """Kiểm tra xem port hệ thống có đang mở hay không."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def inspect_tasks_state() -> dict:
    """Đọc trạng thái các task trong .ai/tasks/."""
    ai_dir = os.path.join(PROJECT_ROOT, ".ai", "tasks")
    result = {"running": 0, "ready": 0, "review": 0, "done": 0, "blocked": 0}
    if not os.path.exists(ai_dir):
        return result

    for state in result.keys():
        state_path = os.path.join(ai_dir, state)
        if os.path.exists(state_path):
            files = [f for f in os.listdir(state_path) if f.endswith(".yaml") or f.endswith(".yml")]
            result[state] = len(files)
    return result


def inspect_locks() -> int:
    """Kiểm tra số lượng file lock hiện tại."""
    lock_file = os.path.join(PROJECT_ROOT, ".ai", "locks.json")
    if not os.path.exists(lock_file):
        return 0
    try:
        import json
        with open(lock_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return len(data) if isinstance(data, dict) else 0
    except Exception:
        return 0


def run_cycle():
    """Thực hiện một chu kỳ kiểm tra toàn diện."""
    logging.info("--- Bắt đầu chu kỳ giám sát hệ thống ---")

    # 1. Kiểm tra Backend (Port 3901)
    backend_up = check_port("127.0.0.1", 3901)
    status_be = "HEALTHY (UP)" if backend_up else "OFFLINE/IDLE (Port 3901 chưa mở)"
    logging.info(f"Backend NestJS (Port 3901): {status_be}")

    # 2. Kiểm tra Frontend (Port 3900)
    frontend_up = check_port("127.0.0.1", 3900)
    status_fe = "HEALTHY (UP)" if frontend_up else "OFFLINE/IDLE (Port 3900 chưa mở)"
    logging.info(f"Frontend Next.js (Port 3900): {status_fe}")

    # 3. Kiểm tra MySQL Database (Port 3306)
    mysql_up = check_port("127.0.0.1", 3306)
    status_db = "HEALTHY (UP)" if mysql_up else "UNKNOWN/OFFLINE (Port 3306)"
    logging.info(f"MySQL Database (Port 3306): {status_db}")

    # 4. Trạng thái Task và Locks
    tasks = inspect_tasks_state()
    locks_count = inspect_locks()
    logging.info(
        f"Tasks State: Running={tasks['running']}, Ready={tasks['ready']}, "
        f"Review={tasks['review']}, Done={tasks['done']}, Blocked={tasks['blocked']} | Active Locks={locks_count}"
    )

    logging.info("--- Chu kỳ giám sát hoàn tất an toàn ---")


def main():
    logging.info("Kích hoạt Hệ thống Giám sát & Tự phục hồi Watchdog (CRM Netvietsoft)...")
    logging.info(f"Thư mục làm việc: {PROJECT_ROOT}")

    while True:
        try:
            run_cycle()
        except KeyboardInterrupt:
            logging.info("Người dùng gửi tín hiệu dừng watchdog. Tạm biệt.")
            break
        except Exception as e:
            logging.error(f"Phát hiện lỗi không mong muốn trong chu kỳ: {e}", exc_info=True)
            logging.info("Cơ chế chống crash kích hoạt: Tiếp tục sau 10 giây hồi phục...")
            time.sleep(10)
            continue

        # Nghỉ định kỳ 5 phút (300 giây)
        time.sleep(300)


if __name__ == "__main__":
    main()
