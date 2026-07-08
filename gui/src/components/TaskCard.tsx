'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { XCircle, Trash2, Clock, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useI18n } from '@/lib/i18n';
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
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(initialTask.status === 'failed');
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsUpdatedRef = useRef(false);

  useEffect(() => {
    if (!wsUpdatedRef.current) {
      setTask(initialTask);
    }
  }, [initialTask]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const isActive = task.status === 'downloading' || task.status === 'pending';

  const handleMessage = useCallback((msg: WsMessage) => {
    wsUpdatedRef.current = true;
    if (msg.type === 'status' && msg.status) {
      setTask((prev) => ({
        ...prev,
        status: msg.status as TaskInfo['status'],
        error_count: msg.error_count ?? prev.error_count,
        last_error: msg.error ?? prev.last_error,
      }));
      if (msg.status === 'failed' || msg.status === 'completed' || msg.status === 'cancelled') {
        wsUpdatedRef.current = false;
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
  }, []);

  useWebSocket({
    taskId: isActive ? task.id : null,
    onMessage: handleMessage,
  });

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
        <div className="border-t border-zinc-800 bg-zinc-950 p-4 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-zinc-600">{t('no_logs')}</p>
          ) : (
            logs.map((line, i) => (
              <p key={i} className="text-xs text-zinc-400 font-mono leading-relaxed">{line}</p>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
