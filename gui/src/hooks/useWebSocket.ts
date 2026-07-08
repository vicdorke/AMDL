'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { WsMessage } from '@/types';

interface UseWebSocketOptions {
  taskId: string | null;
  onMessage?: (msg: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  enabled?: boolean;
}

export function useWebSocket({
  taskId,
  onMessage,
  onOpen,
  onClose,
  onError,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!taskId || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = api.wsUrl(`/api/ws/${taskId}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessage?.(msg);
      } catch {
        // ignore invalid JSON
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onClose?.();
      // 自动重连
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      onError?.(err);
      ws.close();
    };

    wsRef.current = ws;
  }, [taskId, enabled, onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, sendMessage };
}
