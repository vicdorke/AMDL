import os
import re
import sys
from pathlib import Path


def normalize_path(path: str | Path | None, *, expand_user: bool = True) -> str | None:
    """规范化路径：去引号、展开 ~、规范化斜杠与多余空白。

    保留路径中的空格与非 ASCII 字符；不强制 resolve（避免不存在路径时报错）。
    """
    if path is None:
        return None
    s = str(path).strip()
    if not s:
        return None

    # 去掉常见的成对引号（用户从资源管理器复制路径时常带引号）
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()

    # 去掉路径两端残留的空白/不可见字符
    s = s.strip(" \t\r\n\u200b\ufeff")
    if not s:
        return None

    if expand_user:
        s = os.path.expanduser(s)

    # 统一路径分隔符（Path 会处理），并折叠多余的分隔符
    p = Path(s)
    # 不 resolve：相对路径保持相对；仅做 normpath 级清理
    return os.path.normpath(str(p))


def classify_download_error(error: Exception | str, logs: list[str] | None = None) -> str:
    """将底层异常/日志归类为可读的中文错误信息。"""
    text = str(error) if error is not None else ""
    joined = "\n".join(logs or [])
    blob = f"{text}\n{joined}".lower()

    rules: list[tuple[tuple[str, ...], str]] = [
        (("no active apple music subscription", "subscription", "未检测到", "no subscription"),
         "Cookies 有效但未检测到有效的 Apple Music 订阅，请使用订阅账号导出 cookies"),
        (("failed to initialise apple music api", "无法解析 cookies", "netscape", "cookie"),
         "Cookies 无效或已过期，请重新导出 cookies.txt"),
        (("file not found", "no such file", "文件不存在", "cannot find the path"),
         "路径不存在：请检查 cookies / 输出目录 / WVD 文件路径是否正确"),
        (("permission denied", "access is denied", "拒绝访问"),
         "没有写入权限：请更换输出目录或使用有权限的路径"),
        (("wvd", "widevine", "cdm", "device.wvd"),
         "缺少 Widevine CDM 密钥（device.wvd），ALAC / Atmos 无法解密"),
        (("ssl", "certificate", "certifi"),
         "网络证书错误：请检查系统时间、代理或防火墙设置"),
        (("timed out", "timeout", "connection reset", "connection aborted", "name resolution", "getaddrinfo"),
         "网络连接失败：请检查网络、代理或重试"),
        (("yt-dlp", "ytdlp"),
         "媒体流下载失败（yt-dlp），可能是网络中断或链接已失效"),
        (("ffmpeg",),
         "FFmpeg 处理失败：请确认 ffmpeg 可用，或检查转换格式设置"),
        (("cancelled", "任务被取消"),
         "任务已取消"),
    ]
    for keys, msg in rules:
        if any(k in blob for k in keys):
            return msg

    # 回退：截断原始错误，避免 UI 被超长 traceback 淹没
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        clean = (logs[-1] if logs else "") or "下载失败，请查看完整日志"
    if len(clean) > 240:
        clean = clean[:240] + "…"
    return clean


def resource_path(relative_path: str) -> str:
    """返回运行时资源的绝对路径。支持源码运行与 PyInstaller 打包后的 _MEIPASS。"""
    try:
        if getattr(sys, "frozen", False):
            base = getattr(sys, "_MEIPASS", Path(sys.executable).parent)
        else:
            base = Path(__file__).parent.parent
        return str(Path(base) / relative_path)
    except Exception:
        return relative_path


def prepend_tools_to_path(tool_dir_names: list[str] | None = None) -> None:
    """
    在运行时将可执行工具目录（例如 tools/）优先加入 PATH。

    - 在打包后的环境中，会优先查找 sys._MEIPASS 下的 tools 目录。
    - 在源码运行时，会查找项目根的 tools 目录和当前工作目录的 tools 目录。
    这样可以保证 subprocess 调用无需额外设置系统环境变量即可找到内置工具。
    """
    import os
    from pathlib import Path
    import sys


    candidates = []
    if tool_dir_names is None:
        tool_dir_names = ["tools"]

    # 构建 platform-specific 子目录候选，例如 tools/windows-x86_64, tools/linux-x86_64, tools/macos-arm64
    def platform_dir_names():
        import platform as _pl
        _sys = sys.platform
        machine = _pl.machine().lower()
        names = []
        if _sys.startswith("win"):
            arch = "x86_64" if "amd64" in machine or "x86_64" in machine else machine
            names.append(f"windows-{arch}")
            names.append("windows")
        elif _sys.startswith("linux"):
            arch = "x86_64" if "x86_64" in machine or "amd64" in machine else machine
            names.append(f"linux-{arch}")
            names.append("linux")
        elif _sys.startswith("darwin"):
            # macOS (darwin) -> use macos-arch
            arch = "arm64" if "arm64" in machine or "aarch64" in machine else "x86_64"
            names.append(f"macos-{arch}")
            names.append("macos")
        # generic fallback
        names.append("")
        return names

    platform_names = platform_dir_names()

    # 1) PyInstaller 解包目录
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            for pname in platform_names:
                for d in tool_dir_names:
                    p = Path(meipass) / (d if not pname else f"{d}/{pname}")
                    candidates.append(p)

    # 2) 项目根的 tools (包含 platform-specific 子目录)
    project_root = Path(__file__).parent.parent
    for pname in platform_names:
        for d in tool_dir_names:
            p = project_root / (d if not pname else Path(d) / pname)
            candidates.append(p)

    # 3) 当前工作目录的 tools (包含 platform-specific 子目录)
    for pname in platform_names:
        for d in tool_dir_names:
            p = Path.cwd() / (d if not pname else Path(d) / pname)
            candidates.append(p)

    # 将存在的目录按优先级加入 PATH 前端
    current_path = os.environ.get("PATH", "")
    normalized_path_entries = {
        os.path.normcase(os.path.normpath(x))
        for x in current_path.split(os.pathsep)
        if x
    }
    added = []
    for p in candidates:
        try:
            if p.exists() and p.is_dir():
                p_str = str(p)
                normalized_candidate = os.path.normcase(os.path.normpath(p_str))
                if normalized_candidate not in normalized_path_entries:
                    os.environ["PATH"] = p_str + os.pathsep + os.environ.get("PATH", "")
                    normalized_path_entries.add(normalized_candidate)
                    added.append(p_str)
        except Exception:
            continue

    # 可选：返回或记录已加入的路径，当前我们不返回值
    return
