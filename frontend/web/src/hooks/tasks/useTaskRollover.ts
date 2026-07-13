import { useState } from 'react';
import { apiClient, type Task } from '@redeeming-time/shared';

export function useTaskRollover(overdueTasks: Task[], today: string, onComplete: () => void) {
  const [message, setMessage] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function rollover() {
    if (overdueTasks.length === 0) return setMessage('이월할 할일이 없습니다.');
    setMessage('');
    setIsPending(true);
    try {
      await Promise.all(overdueTasks.map((task) => apiClient.updateTaskTargetDate(task, today)));
      onComplete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '이월 처리에 실패했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  return { message, isPending, rollover };
}
