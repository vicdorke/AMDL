# AMDL - Apple Music Downloader

一个基于 [gamdl](https://github.com/glomatico/gamdl) 的桌面端 Apple Music 下载工具，拥有美观的暗色 Web 界面。

灵感来自 [wenfeng110402/AppleMusic-Downloader](https://github.com/wenfeng110402/AppleMusic-Downloader)。

## 功能

- **歌曲/专辑/歌单/MV 下载** — 支持 AAC 256kbps、ALAC 无损、Dolby Atmos 等多种编码
- **歌单自动识别** — 检测到歌单链接后自动以歌单名建文件夹，文件名仅保留歌曲名
- **实时进度条** — WebSocket 实时推送下载进度，支持多任务队列
- **Cookies 检测** — 一键验证 cookies 文件是否有效、订阅是否激活
- **下载后格式转换** — 支持转为 MP3 / FLAC / WAV / AAC / OGG 等格式
- **歌词下载开关** — 可关闭歌词下载以减少资源占用
- **任务管理** — 支持取消、清空任务列表和历史记录
- **配置持久化** — 所有设置自动保存，重启不丢失
- **深色主题** — 全局暗色 UI

## 下载

从 [Releases](../../releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `AMDL_Setup_v3.0.0.exe` | 安装程序（推荐），自动创建桌面快捷方式和开始菜单 |
| `AMDL_v3.0.0_portable.zip` | 便携版，解压后运行 `启动.bat` |

## 使用

1. 导出浏览器中 Apple Music 的 cookies 为 **Netscape 格式**（浏览器扩展搜索 "cookies.txt"）
2. 启动 AMDL，点击「浏览」选择 cookies 文件，点击「检测」验证有效性
3. 粘贴 Apple Music 链接（支持歌曲、专辑、歌单、MV、艺人页面）
4. 设置保存路径，点击「开始下载」
5. 在任务页面查看实时进度

> **注意**：需要有效的 Apple Music 订阅。下载内容仅供个人使用。

## 开发

```bash
# 克隆
git clone https://github.com/DerekH-233/AMDL.git
cd AMDL

# 后端依赖
pip install -r requirements.txt

# 前端依赖
cd gui && npm install

# 开发模式（需要两个终端）
# 终端 1: 启动前端 dev server
cd gui && npm run dev
# 终端 2: 启动桌面应用
python desktop.py

# 一键打包
python build.py
```

## 技术栈

| 层面 | 技术 |
|------|------|
| 下载引擎 | [gamdl](https://github.com/glomatico/gamdl) + [yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| 后端 | FastAPI + WebSocket + SQLite |
| 前端 | Next.js + TypeScript + Tailwind CSS |
| 桌面壳 | pywebview |
| 打包 | PyInstaller + NSIS |

## 鸣谢

- [glomatico/gamdl](https://github.com/glomatico/gamdl) — Apple Music 下载引擎
- [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) — 通用视频下载器
- [wenfeng110402/AppleMusic-Downloader](https://github.com/wenfeng110402/AppleMusic-Downloader) — 项目灵感来源

## 免责声明

本工具仅供学习与研究使用。使用者需自行提供合法的 Apple Music 订阅凭证，并对自己的行为承担全部责任。
