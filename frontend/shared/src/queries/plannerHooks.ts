import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';
import type {
  Calendar,
  CalendarPayload,
  Category,
  CategoryPayload,
  Event,
  EventPayload,
  Task,
  TaskPayload,
} from '../types';

export function usePlannerSnapshot() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const syncPlanner = usePlannerStore((state) => state.syncPlanner);

  const query = useQuery({
    queryKey: ['planner-snapshot', accessToken],
    queryFn: apiClient.plannerSnapshot,
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (query.data) {
      syncPlanner(query.data);
    }
  }, [query.data, syncPlanner]);

  return query;
}

function usePlannerMutation<TPayload, TResult>(
  mutationFn: (payload: TPayload) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner-snapshot'] }),
  });
}

export function useCreateCalendar() {
  return usePlannerMutation<CalendarPayload, Calendar>(apiClient.createCalendar);
}

export function useCreateCategory() {
  return usePlannerMutation<CategoryPayload, Category>(apiClient.createCategory);
}

export function useCreateEvent() {
  return usePlannerMutation<EventPayload, Event>(apiClient.createEvent);
}

export function useCreateTask() {
  return usePlannerMutation<TaskPayload, Task>(apiClient.createTask);
}

export function useDeleteCalendar() {
  return usePlannerMutation<number, void>(apiClient.deleteCalendar);
}

export function useUpdateCategory() {
  return usePlannerMutation<{ id: number; payload: Partial<CategoryPayload> }, Category>(
    ({ id, payload }) => apiClient.updateCategory(id, payload),
  );
}

export function useDeleteCategory() {
  return usePlannerMutation<number, void>(apiClient.deleteCategory);
}

export function useUpdateEvent() {
  return usePlannerMutation<{ id: number; payload: Partial<EventPayload> }, Event>(
    ({ id, payload }) => apiClient.updateEvent(id, payload),
  );
}

export function useDeleteEvent() {
  return usePlannerMutation<number, void>(apiClient.deleteEvent);
}

export function useEditTask() {
  return usePlannerMutation<{ id: number; payload: Partial<TaskPayload> }, Task>(
    ({ id, payload }) => apiClient.editTask(id, payload),
  );
}

export function useDeleteTask() {
  return usePlannerMutation<number, void>(apiClient.deleteTask);
}

export function useRolloverTasks() {
  return usePlannerMutation<{ tasks: Task[]; targetDate: string }, Task[]>(
    ({ tasks, targetDate }) =>
      Promise.all(tasks.map((task) => apiClient.updateTaskTargetDate(task, targetDate))),
  );
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  const toggleTaskCompletion = usePlannerStore((state) => state.toggleTaskCompletion);
  const syncPlanner = usePlannerStore((state) => state.syncPlanner);

  return useMutation({
    mutationFn: (task: Task) => apiClient.updateTask({ ...task, is_completed: !task.is_completed }),
    onMutate: (task) => {
      void queryClient.cancelQueries({ queryKey: ['planner-snapshot'] });
      const previousTasks = usePlannerStore.getState().tasks;
      toggleTaskCompletion(task.id);
      return { previousTasks };
    },
    onError: (_error, _task, context) => {
      if (context?.previousTasks) {
        syncPlanner({ tasks: context.previousTasks });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['planner-snapshot'] }),
  });
}
