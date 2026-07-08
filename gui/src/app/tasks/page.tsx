'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { TaskInfo } from '@/types';
import TaskCard from '@/components/TaskCard';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.get<TaskInfo[]>('/api/tasks');
      setTasks(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCancel = async (taskId: string) => {
    try {
      await api.post(`/api/tasks/${taskId}/cancel`);
      fetchTasks();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.del(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">下载任务</h1>
          <p className="text-zinc-400">查看和管理当前下载任务</p>
        </div>
        <button className="btn-ghost flex items-center gap-2" onClick={fetchTasks}>
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg mb-2">暂无下载任务</p>
          <p className="text-zinc-600 text-sm">
            前往
            <a href="/" className="text-blue-400 hover:underline mx-1">
              下载页面
            </a>
            创建新任务
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
