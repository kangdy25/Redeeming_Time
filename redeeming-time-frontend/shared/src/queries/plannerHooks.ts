import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiClient } from '../api/client';
import { usePlannerStore } from '../stores/plannerStore';
import type { Task } from '../types';

export function usePlannerSnapshot() {
  const syncPlanner = usePlannerStore((state) => state.syncPlanner);

  const query = useQuery({
    queryKey: ['planner-snapshot'],
    queryFn: apiClient.plannerSnapshot,
  });

  useEffect(() => {
    if (query.data) {
      syncPlanner(query.data);
    }
  }, [query.data, syncPlanner]);

  return query;
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  const toggleTaskCompletion = usePlannerStore((state) => state.toggleTaskCompletion);

  return useMutation({
    mutationFn: (task: Task) => apiClient.updateTask({ ...task, is_completed: !task.is_completed }),
    onMutate: (task) => toggleTaskCompletion(task.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['planner-snapshot'] }),
  });
}
