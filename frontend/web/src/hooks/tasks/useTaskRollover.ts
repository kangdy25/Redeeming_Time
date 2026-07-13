import { useState } from 'react';
import { useRolloverTasks, type Task } from '@redeeming-time/shared';

export function useTaskRollover(overdueTasks: Task[], today: string, onComplete: () => void) {
  const mutation = useRolloverTasks();
  const [message, setMessage] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function rollover() {
    if (overdueTasks.length === 0) return setMessage('이월할 할일이 없습니다.');
    setMessage('');
    setIsPending(true);
    try {
      await mutation.mutateAsync({ tasks: overdueTasks, targetDate: today });
      onComplete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '이월 처리에 실패했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  return { message, isPending, rollover };
}
