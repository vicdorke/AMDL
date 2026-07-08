"""AMDL 桌面壳 —— pywebview 包装 FastAPI 后端 + Next.js 前端"""
from __future__ import annotations

import multiprocessing
import os
import sys

# ── 必须在任何其他导入之前修复 Windows GBK 编码 ──
os.environ.setdefault("PYTHONUTF8", "1")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
sys._BaseDefaultEncoding = "utf-8"  # type: ignore

# ── PyInstaller + multiprocessing 修复（关键！）──
multiprocessing.freeze_support()

import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import uvicorn
import webview


# ── 路径配置（兼容 PyInstaller 打包）───────────────────────────────
def _get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).parent

ROOT_DIR = _get_base_dir()
GUI_OUT_DIR = ROOT_DIR / "gui" / "out"
SRC_DIR = ROOT_DIR / "amdl"


# ── 端口 ───────────────────────────────────────────────────────

def find_free_port(start: int = 18000) -> int:
    import socket
    for port in range(start, start + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return 18080


BACKEND_PORT = find_free_port(18000)
FRONTEND_PORT = find_free_port(BACKEND_PORT + 1)
BACKEND_URL = f"http://127.0.0.1:{BACKEND_PORT}"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"


# ── 后端 ───────────────────────────────────────────────────────

def run_backend():
    if str(SRC_DIR.parent) not in sys.path and SRC_DIR.exists():
        sys.path.insert(0, str(SRC_DIR.parent))
    elif (ROOT_DIR / "src").exists():
        sys.path.insert(0, str(ROOT_DIR / "src"))

    if getattr(sys, "frozen", False):
        from amdl.server import app as amdl_app
        uvicorn.run(amdl_app, host="127.0.0.1", port=BACKEND_PORT, log_level="warning")
    else:
        uvicorn.run(
            "amdl.server:app",
            host="127.0.0.1",
            port=BACKEND_PORT,
            log_level="warning",
        )


# ── 前端静态文件服务器 ──────────────────────────────────────────

class StaticHandler(SimpleHTTPRequestHandler):
    """自定义静态文件处理器：支持干净 URL（无 .html 后缀）"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(GUI_OUT_DIR), **kwargs)

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        from urllib.parse import urlparse, unquote

        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path.startswith("/_next/"):
            super().do_GET()
            return

        file_path = Path(self.directory) / path.lstrip("/")
        if path and "." in Path(path).name:
            if file_path.exists() and file_path.is_file():
                super().do_GET()
                return
            else:
                self.send_error(404)
                return

        clean = path.strip("/")
        if clean:
            html_file = Path(self.directory) / f"{clean}.html"
            if html_file.exists():
                self.path = f"/{clean}.html" + (f"?{parsed.query}" if parsed.query else "")
                super().do_GET()
                return

        if clean:
            index_file = Path(self.directory) / clean / "index.html"
            if index_file.exists():
                self.path = f"/{clean}/index.html" + (f"?{parsed.query}" if parsed.query else "")
                super().do_GET()
                return

        if not clean:
            self.path = "/index.html"
            super().do_GET()
            return

        not_found = Path(self.directory) / "404.html"
        if not_found.exists():
            self.path = "/404.html"
            super().do_GET()
        else:
            self.send_error(404)


def run_frontend_server():
    with HTTPServer(("127.0.0.1", FRONTEND_PORT), StaticHandler) as httpd:
        httpd.serve_forever()


# ── pywebview JS API ────────────────────────────────────────────

class AMDLJsApi:
    """暴露给前端的 JS API —— 前端通过 window.pywebview.api 调用"""

    def select_file(self, title: str = "选择文件", file_types: str = "*.txt") -> str:
        result = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG,
            directory=str(Path.home()),
            file_types=(f"支持的格式 ({file_types})", "All files (*.*)"),
        )
        if result and len(result) > 0:
            return result[0]
        return ""


# ── 桌面窗口 ───────────────────────────────────────────────────

def create_window():
    use_production = GUI_OUT_DIR.exists() and (GUI_OUT_DIR / "index.html").exists()

    if use_production:
        print(f"[AMDL] Production mode: serving from {GUI_OUT_DIR}")
        threading.Thread(target=run_frontend_server, daemon=True).start()
        time.sleep(0.5)
        url = FRONTEND_URL
    else:
        url = "http://127.0.0.1:3000"
        print("[AMDL] Dev mode: loading http://127.0.0.1:3000")

    inject_js = f"""
    window.AMDL_BACKEND_URL = '{BACKEND_URL}';
    localStorage.setItem('amdl_api_base', '{BACKEND_URL}');
    """

    window = webview.create_window(
        title="AMDL - Apple Music Downloader",
        url=url,
        width=1200,
        height=800,
        min_size=(900, 600),
        resizable=True,
        fullscreen=False,
        text_select=True,
        confirm_close=True,
        background_color="#09090b",
        js_api=AMDLJsApi(),
    )

    def on_loaded():
        window.evaluate_js(inject_js)

    window.events.loaded += on_loaded

    webview.start(debug=("--debug" in sys.argv))


# ── 入口 ───────────────────────────────────────────────────────

def main():
    print(f"[AMDL] Backend:  {BACKEND_URL}")
    print(f"[AMDL] Frontend: {FRONTEND_URL}")

    threading.Thread(target=run_backend, daemon=True).start()

    import urllib.request
    for _ in range(30):
        try:
            urllib.request.urlopen(f"{BACKEND_URL}/api/health", timeout=1)
            print("[AMDL] Backend ready")
            break
        except Exception:
            time.sleep(0.5)
    else:
        print("[AMDL] Warning: Backend may not be ready")

    create_window()


if __name__ == "__main__":
    main()
