import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { watch } from 'vue';

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

const snapshotKey = ['planner-snapshot'];

export function usePlannerSnapshot() {
  const auth = useAuthStore();
  const planner = usePlannerStore();
  const query = useQuery({
    queryKey: [...snapshotKey, auth.accessToken],
    queryFn: apiClient.plannerSnapshot,
    enabled: () => Boolean(auth.accessToken),
  });
  watch(query.data, (snapshot) => snapshot && planner.syncPlanner(snapshot));
  return query;
}

function usePlannerMutation<TPayload, TResult>(
  mutationFn: (payload: TPayload) => Promise<TResult>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: snapshotKey }),
  });
}

export const useCreateCalendar = () =>
  usePlannerMutation<CalendarPayload, Calendar>(apiClient.createCalendar);
export const useCreateCategory = () =>
  usePlannerMutation<CategoryPayload, Category>(apiClient.createCategory);
export const useCreateEvent = () => usePlannerMutation<EventPayload, Event>(apiClient.createEvent);
export const useCreateTask = () => usePlannerMutation<TaskPayload, Task>(apiClient.createTask);
export const useDeleteCalendar = () => usePlannerMutation<number, void>(apiClient.deleteCalendar);
export const useUpdateCategory = () =>
  usePlannerMutation<{ id: number; payload: Partial<CategoryPayload> }, Category>(
    ({ id, payload }) => apiClient.updateCategory(id, payload),
  );
export const useDeleteCategory = () => usePlannerMutation<number, void>(apiClient.deleteCategory);
export const useUpdateEvent = () =>
  usePlannerMutation<{ id: number; payload: Partial<EventPayload> }, Event>(({ id, payload }) =>
    apiClient.updateEvent(id, payload),
  );
export const useDeleteEvent = () => usePlannerMutation<number, void>(apiClient.deleteEvent);
export const useEditTask = () =>
  usePlannerMutation<{ id: number; payload: Partial<TaskPayload> }, Task>(({ id, payload }) =>
    apiClient.editTask(id, payload),
  );
export const useDeleteTask = () => usePlannerMutation<number, void>(apiClient.deleteTask);
export const useRolloverTasks = () =>
  usePlannerMutation<{ tasks: Task[]; targetDate: string }, Task[]>(({ tasks, targetDate }) =>
    Promise.all(tasks.map((task) => apiClient.updateTaskTargetDate(task, targetDate))),
  );

export function useToggleTask() {
  const client = useQueryClient();
  const planner = usePlannerStore();
  return useMutation({
    mutationFn: (task: Task) => apiClient.updateTask({ ...task, is_completed: !task.is_completed }),
    onMutate: async (task) => {
      await client.cancelQueries({ queryKey: snapshotKey });
      const previousTasks = [...planner.tasks];
      planner.toggleTaskCompletion(task.id);
      return { previousTasks };
    },
    onError: (_error, _task, context) => {
      if (context?.previousTasks) planner.syncPlanner({ tasks: context.previousTasks });
    },
    onSettled: () => client.invalidateQueries({ queryKey: snapshotKey }),
  });
}
