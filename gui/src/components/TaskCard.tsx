'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { XCircle, Trash2, Clock, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { TaskInfo, WsMessage } from '@/types';

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', label: '等待中' },
  downloading: { icon: Download, color: 'text-blue-400', label: '下载中' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: '已完成' },
  failed: { icon: AlertTriangle, color: 'text-red-400', label: '失败' },
  cancelled: { icon: XCircle, color: 'text-zinc-500', label: '已取消' },
};

interface Props {
  task: TaskInfo;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task: initialTask, onCancel, onDelete }: Props) {
  const [task, setTask] = useState<TaskInfo>(initialTask);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(initialTask.status === 'failed');
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsUpdatedRef = useRef(false);

  // 当 prop 变化时同步到本地 state（但 WebSocket 活跃时不覆盖）
  useEffect(() => {
    if (!wsUpdatedRef.current) {
      setTask(initialTask);
    }
  }, [initialTask]);

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

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const status = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* 头部 */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
            <span className="text-xs text-zinc-600 font-mono">{task.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <button
                className="btn-danger text-xs px-3 py-1"
                onClick={() => onCancel(task.id)}
              >
                取消
              </button>
            )}
            {!isActive && (
              <button
                className="btn-ghost text-xs px-3 py-1"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* URL 列表 */}
        <div className="mb-3">
          {task.urls.slice(0, 3).map((url, i) => (
            <p key={i} className="text-xs text-zinc-500 truncate">
              {url}
            </p>
          ))}
          {task.urls.length > 3 && (
            <p className="text-xs text-zinc-600">
              ...还有 {task.urls.length - 3} 个链接
            </p>
          )}
        </div>

        {/* 进度条（下载中显示） */}
        {task.status === 'downloading' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400">
                下载进度: {task.completed}/{task.total} 首
              </span>
              <span className="text-xs font-mono text-blue-400">{task.progress}%</span>
            </div>
            <div className="progress-bar-enhanced">
              <div
                className="progress-bar-fill"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 已完成任务的进度条（灰色） */}
        {task.status === 'completed' && task.total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">
                {task.completed}/{task.total} 首
              </span>
            </div>
            <div className="progress-bar-enhanced">
              <div
                className="progress-bar-fill-completed"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* 进度信息 */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {task.status === 'downloading' && (
            <>
              <span>{task.progress}%</span>
              <span>
                {task.completed}/{task.total} 首
              </span>
            </>
          )}
          {task.status === 'completed' && task.error_count > 0 && (
            <span className="text-yellow-400">
              完成 {task.completed}/{task.total} 首（{task.error_count} 项跳过）
            </span>
          )}
          {task.status === 'completed' && !task.error_count && (
            <span>共 {task.total} 首下载完成</span>
          )}
          {task.status === 'failed' && (
            <span className="text-red-400">
              {task.last_error || (task.error_count > 0 ? `${task.error_count} 个错误` : '下载出错')}
            </span>
          )}
          {task.error_count > 0 && task.status !== 'failed' && (
            <span className="text-red-400">{task.error_count} 个错误</span>
          )}
          <button
            className="text-zinc-600 hover:text-zinc-400 ml-auto"
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? '收起日志' : '查看日志'}
          </button>
        </div>
      </div>

      {/* 日志区 */}
      {showLogs && (
        <div className="border-t border-zinc-800 bg-zinc-950 p-4 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-zinc-600">暂无日志</p>
          ) : (
            logs.map((line, i) => (
              <p key={i} className="text-xs text-zinc-400 font-mono leading-relaxed">
                {line}
              </p>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
