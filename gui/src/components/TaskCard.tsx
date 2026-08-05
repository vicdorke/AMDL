'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { XCircle, Trash2, Clock, Download, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';
import type { TaskInfo, WsMessage } from '@/types';

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  downloading: Download,
  completed: CheckCircle2,
  failed: AlertTriangle,
  cancelled: XCircle,
};
const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  downloading: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-zinc-500',
};

interface Props {
  task: TaskInfo;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task: initialTask, onCancel, onDelete }: Props) {
  const { t } = useI18n();
  const [task, setTask] = useState<TaskInfo>(initialTask);
  const [logs, setLogs] = useState<string[]>(initialTask.logs || []);
  const [showLogs, setShowLogs] = useState(initialTask.status === 'failed');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(Boolean(initialTask.logs?.length));
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsUpdatedRef = useRef(false);

  useEffect(() => {
    if (!wsUpdatedRef.current) {
      setTask(initialTask);
      if (initialTask.logs?.length) {
        setLogs(initialTask.logs);
        setLogsLoaded(true);
      }
    }
  }, [initialTask]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchLogs = useCallback(async () => {
    if (loadingLogs) return;
    setLoadingLogs(true);
    try {
      const res = await api.get<{ logs: string[]; last_error?: string }>(`/api/tasks/${task.id}/logs?limit=500`);
      setLogs(res.logs || []);
      if (res.last_error) {
        setTask((prev) => ({ ...prev, last_error: res.last_error || prev.last_error }));
      }
      setLogsLoaded(true);
    } catch {
      try {
        const detail = await api.get<TaskInfo>(`/api/tasks/${task.id}?include_logs=true`);
        setLogs(detail.logs || []);
        if (detail.last_error) {
          setTask((prev) => ({ ...prev, last_error: detail.last_error }));
        }
        setLogsLoaded(true);
      } catch {
        /* ignore */
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [task.id, loadingLogs]);

  useEffect(() => {
    if (showLogs && !logsLoaded && !loadingLogs) {
      void fetchLogs();
    }
  }, [showLogs, logsLoaded, loadingLogs, fetchLogs]);

  useEffect(() => {
    if (task.status === 'failed' && !logsLoaded) {
      void fetchLogs();
    }
  }, [task.status, logsLoaded, fetchLogs]);

  const isActive = task.status === 'downloading' || task.status === 'pending';

  const handleMessage = useCallback((msg: WsMessage) => {
    wsUpdatedRef.current = true;
    if (msg.type === 'status' && msg.status) {
      setTask((prev) => ({
        ...prev,
        status: msg.status as TaskInfo['status'],
        error_count: msg.error_count ?? prev.error_count,
        last_error: msg.last_error ?? msg.error ?? prev.last_error,
      }));
      if (msg.status === 'failed' || msg.status === 'completed' || msg.status === 'cancelled') {
        wsUpdatedRef.current = false;
        setLogsLoaded(false);
      }
      if (msg.status === 'failed') {
        setShowLogs(true);
      }
    }
    if (msg.type === 'progress') {
      setTask((prev) => ({
        ...prev,
        progress: msg.progress ?? prev.progress,
        completed: msg.completed ?? prev.completed,
        total: msg.total ?? prev.total,
      }));
    }
    if (msg.type === 'log' && msg.message) {
      setLogs((prev) => [...prev.slice(-200), msg.message!]);
    }
    if (msg.type === 'done') {
      setLogsLoaded(false);
    }
  }, []);

  useWebSocket({
    taskId: isActive ? task.id : null,
    onMessage: handleMessage,
  });

  const handleCopyLogs = useCallback(async () => {
    const text = [
      task.last_error ? `${t('error_detail')}: ${task.last_error}` : '',
      ...logs,
    ].filter(Boolean).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [logs, task.last_error, t]);

  const StatusIcon = statusIcons[task.status] || Clock;
  const statusColor = statusColors[task.status] || 'text-zinc-500';
  const statusLabel = t(task.status);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-600 font-mono">{task.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <button className="btn-danger text-xs px-3 py-1" onClick={() => onCancel(task.id)}>
                {t('cancel')}
              </button>
            )}
            {!isActive && (
              <button className="btn-ghost text-xs px-3 py-1" onClick={() => onDelete(task.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-3">
          {task.urls.slice(0, 3).map((url, i) => (
            <p key={i} className="text-xs text-zinc-500 truncate">{url}</p>
          ))}
          {task.urls.length > 3 && (
            <p className="text-xs text-zinc-600">...{task.urls.length - 3} more</p>
          )}
        </div>

        {task.status === 'downloading' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400">{t('progress')}: {task.completed}/{task.total} {t('songs')}</span>
              <span className="text-xs font-mono text-blue-400">{task.progress}%</span>
            </div>
            <div className="progress-bar-enhanced">
              <div className="progress-bar-fill" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}

        {task.status === 'completed' && task.total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">{task.completed}/{task.total} {t('songs')}</span>
            </div>
            <div className="progress-bar-enhanced">
              <div className="progress-bar-fill-completed" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {(task.status === 'failed' || (task.status === 'completed' && task.error_count > 0)) && task.last_error && (
          <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2">
            <p className="text-xs text-red-300">
              <span className="text-red-400 font-medium">{t('error_detail')}: </span>
              {task.last_error}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {task.status === 'downloading' && (
            <>
              <span>{task.progress}%</span>
              <span>{task.completed}/{task.total} {t('songs')}</span>
            </>
          )}
          {task.status === 'completed' && task.error_count > 0 && (
            <span className="text-yellow-400">
              {task.completed}/{task.total} {t('songs')} ({task.error_count} {t('skipped')})
            </span>
          )}
          {task.status === 'completed' && !task.error_count && (
            <span>{task.total} {t('done_songs')}</span>
          )}
          {task.status === 'failed' && (
            <span className="text-red-400">
              {task.last_error || (task.error_count > 0 ? `${task.error_count} ${t('errors')}` : t('download_error'))}
            </span>
          )}
          {task.error_count > 0 && task.status !== 'failed' && (
            <span className="text-red-400">{task.error_count} {t('errors')}</span>
          )}
          <button className="text-zinc-600 hover:text-zinc-400 ml-auto" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? t('hide_logs') : t('view_logs')}
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80">
            <span className="text-xs text-zinc-500">
              {loadingLogs ? t('loading_logs') : `${logs.length} lines`}
            </span>
            <button
              className="btn-ghost text-xs px-2 py-1 flex items-center gap-1"
              onClick={handleCopyLogs}
              disabled={logs.length === 0 && !task.last_error}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('logs_copied') : t('copy_logs')}
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {loadingLogs && logs.length === 0 ? (
              <p className="text-xs text-zinc-600">{t('loading_logs')}</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-zinc-600">{t('no_logs')}</p>
            ) : (
              logs.map((line, i) => (
                <p key={i} className="text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-all">{line}</p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
