import { QueryClientProvider } from '@tanstack/react-query';
import {
  queryClient,
  usePlannerSnapshot,
  usePlannerStore,
  useToggleTask,
  type Event,
  type Task,
} from '@redeeming-time/shared';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function EventCard({ event }: { event: Event }) {
  const color = event.category_detail?.color_code ?? '#1F9D8A';
  return (
    <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4" style={{ borderLeftColor: color, borderLeftWidth: 5 }}>
      <Text className="text-xs font-bold uppercase text-slate-500">{dateLabel(event.start_time)}</Text>
      <Text className="mt-1 text-lg font-extrabold text-ink">{event.title}</Text>
      <Text className="mt-1 text-sm text-slate-600">{event.category_detail?.name ?? 'Uncategorized'}</Text>
      {event.congestion_warning?.is_congested && (
        <Text className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
          Schedule congestion detected
        </Text>
      )}
    </View>
  );
}

function TaskRow({ task }: { task: Task }) {
  const toggleTask = useToggleTask();
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !task.is_completed && task.target_date < today;

  return (
    <TouchableOpacity
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
      onPress={() => toggleTask.mutate(task)}
    >
      <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${task.is_completed ? 'border-sea bg-sea' : 'border-sea'}`}>
        <Text className="text-xs font-black text-white">{task.is_completed ? '✓' : ''}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink">{task.title}</Text>
        <Text className="mt-1 text-xs font-semibold text-slate-500">
          {task.priority} · {task.target_date}{overdue ? ' · rollover ready' : ''}
        </Text>
      </View>
      {overdue && <Text className="text-xl font-black text-coral">↷</Text>}
    </TouchableOpacity>
  );
}

function PlannerScreen() {
  const snapshot = usePlannerSnapshot();
  const calendars = usePlannerStore((state) => state.calendars);
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);

  return (
    <SafeAreaView className="flex-1 bg-mist">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="pb-4 pt-5">
          <Text className="text-xs font-black uppercase text-sea">Redeeming Time</Text>
          <Text className="mt-1 text-4xl font-black text-ink">Today’s Planner</Text>
          <Text className="mt-2 text-sm font-semibold text-slate-600">
            {calendars.length} calendars · {snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API offline' : 'Synced'}
          </Text>
        </View>

        <View className="mb-5">
          <Text className="mb-3 text-lg font-black text-ink">Schedule</Text>
          {events.slice(0, 8).map((event) => <EventCard event={event} key={event.id} />)}
          {events.length === 0 && <Text className="rounded-lg bg-white p-4 text-slate-600">No events returned from the planner API.</Text>}
        </View>

        <View>
          <Text className="mb-3 text-lg font-black text-ink">Task Continuity</Text>
          {tasks.map((task) => <TaskRow task={task} key={task.id} />)}
          {tasks.length === 0 && <Text className="rounded-lg bg-white p-4 text-slate-600">No tasks returned from the planner API.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlannerScreen />
    </QueryClientProvider>
  );
}
