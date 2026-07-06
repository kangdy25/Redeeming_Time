import { QueryClientProvider } from '@tanstack/react-query';
import {
  apiClient,
  queryClient,
  useAuthStore,
  usePlannerSnapshot,
  usePlannerStore,
  useToggleTask,
  type Event,
  type Task,
} from '@redeeming-time/shared';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
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

function MobileAuthPanel() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('redeeming-demo-pass');
  const [nickname, setNickname] = useState('Demo User');
  const [message, setMessage] = useState('');

  async function submit() {
    setMessage('');
    try {
      if (mode === 'register') {
        await apiClient.register({ email, password, nickname });
      }
      const tokens = await apiClient.token(email, password);
      setTokens(tokens);
      setMessage('Connected');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  return (
    <View className="rounded-lg border border-slate-200 bg-white p-4">
      <Text className="text-xs font-black uppercase text-sea">Account</Text>
      <Text className="mt-1 text-2xl font-black text-ink">{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-md border p-3 ${mode === 'login' ? 'border-sea bg-sea' : 'border-slate-200 bg-white'}`}
          onPress={() => setMode('login')}
        >
          <Text className={`text-center font-bold ${mode === 'login' ? 'text-white' : 'text-ink'}`}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-md border p-3 ${mode === 'register' ? 'border-sea bg-sea' : 'border-slate-200 bg-white'}`}
          onPress={() => setMode('register')}
        >
          <Text className={`text-center font-bold ${mode === 'register' ? 'text-white' : 'text-ink'}`}>Register</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        autoCapitalize="none"
        className="mt-4 rounded-md border border-slate-200 px-3 py-3 text-ink"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      {mode === 'register' && (
        <TextInput
          className="mt-3 rounded-md border border-slate-200 px-3 py-3 text-ink"
          onChangeText={setNickname}
          placeholder="Nickname"
          value={nickname}
        />
      )}
      <TextInput
        className="mt-3 rounded-md border border-slate-200 px-3 py-3 text-ink"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      <TouchableOpacity className="mt-4 rounded-md bg-sea p-4" onPress={submit}>
        <Text className="text-center font-black text-white">{mode === 'login' ? 'Connect' : 'Create and connect'}</Text>
      </TouchableOpacity>
      {message ? <Text className="mt-3 text-sm font-semibold text-slate-600">{message}</Text> : null}
    </View>
  );
}

export function PlannerScreen() {
  const snapshot = usePlannerSnapshot();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const calendars = usePlannerStore((state) => state.calendars);
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);
  const syncStatus = snapshot.isFetching ? 'Syncing' : snapshot.isError || !isAuthenticated ? 'API offline' : 'Synced';

  useEffect(() => {
    if (calendars.length > 0 && !activeCalendarId) {
      setActiveCalendarId(calendars[0].id);
    }
  }, [activeCalendarId, calendars, setActiveCalendarId]);

  const currentCalendarId = activeCalendarId ?? calendars[0]?.id ?? null;
  const visibleEvents = useMemo(
    () => (currentCalendarId ? events.filter((event) => event.calendar === currentCalendarId) : events),
    [currentCalendarId, events],
  );
  const visibleTasks = useMemo(
    () => (currentCalendarId ? tasks.filter((task) => task.calendar === currentCalendarId) : tasks),
    [currentCalendarId, tasks],
  );

  return (
    <SafeAreaView className="flex-1 bg-mist">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="pb-4 pt-5">
          <Text className="text-xs font-black uppercase text-sea">Redeeming Time</Text>
          <Text className="mt-1 text-4xl font-black text-ink">Today’s Planner</Text>
          <Text className="mt-2 text-sm font-semibold text-slate-600">
            {calendars.length} calendars · {syncStatus}
          </Text>
        </View>

        {!isAuthenticated && (
          <View className="mb-5">
            <MobileAuthPanel />
          </View>
        )}

        <View className="mb-5">
          <Text className="mb-3 text-lg font-black text-ink">Schedule</Text>
          {visibleEvents.slice(0, 8).map((event) => <EventCard event={event} key={event.id} />)}
          {visibleEvents.length === 0 && <Text className="rounded-lg bg-white p-4 text-slate-600">No events returned from the planner API.</Text>}
        </View>

        <View>
          <Text className="mb-3 text-lg font-black text-ink">Task Continuity</Text>
          {visibleTasks.map((task) => <TaskRow task={task} key={task.id} />)}
          {visibleTasks.length === 0 && <Text className="rounded-lg bg-white p-4 text-slate-600">No tasks returned from the planner API.</Text>}
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
