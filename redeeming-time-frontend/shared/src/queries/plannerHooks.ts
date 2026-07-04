import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';
import type { Calendar, CalendarPayload, Category, CategoryPayload, Event, EventPayload, Task, TaskPayload } from '../types';

export function usePlannerSnapshot() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const syncPlanner = usePlannerStore((state) => state.syncPlanner);

  const query = useQuery({
    queryKey: ['planner-snapshot'],
    queryFn: apiClient.plannerSnapshot,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (query.data) {
      syncPlanner(query.data);
    }
  }, [query.data, syncPlanner]);

  return query;
}

function useCreateMutation<TPayload, TResult>(mutationFn: (payload: TPayload) => Promise<TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-snapshot'] }),
  });
}

export function useCreateCalendar() {
  return useCreateMutation<CalendarPayload, Calendar>(apiClient.createCalendar);
}

export function useCreateCategory() {
  return useCreateMutation<CategoryPayload, Category>(apiClient.createCategory);
}

export function useCreateEvent() {
  return useCreateMutation<EventPayload, Event>(apiClient.createEvent);
}

export function useCreateTask() {
  return useCreateMutation<TaskPayload, Task>(apiClient.createTask);
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
