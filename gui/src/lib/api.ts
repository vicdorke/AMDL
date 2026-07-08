/** API 客户端 */

// 优先级：localStorage > window.AMDL_BACKEND_URL (桌面壳注入) > 环境变量 > 默认值
const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('amdl_api_base');
    if (stored) return stored;
    const win = window as unknown as Record<string, unknown>;
    if (win.AMDL_BACKEND_URL) return win.AMDL_BACKEND_URL as string;
  }
  return 'http://127.0.0.1:18000';
};

class ApiClient {
  private base: string;

  constructor(base: string) {
    this.base = base;
  }

  private resolveBase(): string {
    // 优先级：localStorage > window.AMDL_BACKEND_URL > 初始值
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('amdl_api_base');
        if (stored) return stored;
      } catch { /* ignore */ }
      const win = window as unknown as Record<string, unknown>;
      if (win.AMDL_BACKEND_URL) return win.AMDL_BACKEND_URL as string;
    }
    return this.base;
  }

  setBase(url: string) {
    this.base = url;
  }

  getBase() {
    return this.base;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.resolveBase()}${path}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail || res.statusText);
    }
    return res.json();
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.resolveBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || res.statusText);
    }
    return res.json();
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.resolveBase()}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || res.statusText);
    }
    return res.json();
  }

  async del<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.resolveBase()}${path}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || res.statusText);
    }
    return res.json();
  }

  wsUrl(path: string): string {
    return this.base.replace(/^http/, 'ws') + path;
  }
}

export const api = new ApiClient('http://127.0.0.1:18000');
