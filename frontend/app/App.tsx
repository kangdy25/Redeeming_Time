import { QueryClientProvider } from '@tanstack/react-query';
import './global.css';
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
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <View className="mb-3 rounded-lg border border-outline border-l-[5px] border-l-preset-emerald bg-surface p-4 dark:border-outline/30">
      <Text className="text-xs font-bold uppercase text-muted">{dateLabel(event.start_time)}</Text>
      <Text className="mt-1 text-lg font-extrabold text-ink">{event.title}</Text>
      <Text className="mt-1 text-sm text-muted">{event.is_all_day ? 'All day' : 'Scheduled'}</Text>
      {event.congestion_warning?.is_congested && (
        <Text className="mt-2 rounded-md bg-preset-amber/20 px-2 py-1 text-xs font-bold text-ink">
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
      className="mb-3 flex-row items-center gap-3 rounded-lg border border-outline bg-surface p-4 dark:border-outline/30"
      onPress={() => toggleTask.mutate(task)}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${task.is_completed ? 'border-preset-emerald bg-preset-emerald' : 'border-preset-emerald'}`}
      >
        <Text className="text-xs font-black text-on-accent">{task.is_completed ? '✓' : ''}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink">{task.title}</Text>
        <Text className="mt-1 text-xs font-semibold text-muted">
          {task.priority} · {task.target_date}
          {overdue ? ' · rollover ready' : ''}
        </Text>
      </View>
      {overdue && <Text className="text-xl font-black text-danger">↷</Text>}
    </TouchableOpacity>
  );
}

function MobileAuthPanel() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
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
    <View className="rounded-lg border border-outline bg-surface p-4 dark:border-outline/30">
      <Text className="text-xs font-black uppercase text-ink">Account</Text>
      <Text className="mt-1 text-2xl font-black text-ink">
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Text>
      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-md border p-3 ${mode === 'login' ? 'border-action bg-action' : 'border-outline bg-surface dark:border-outline/30'}`}
          onPress={() => setMode('login')}
        >
          <Text
            className={`text-center font-bold ${mode === 'login' ? 'text-on-action' : 'text-ink'}`}
          >
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 rounded-md border p-3 ${mode === 'register' ? 'border-action bg-action' : 'border-outline bg-surface dark:border-outline/30'}`}
          onPress={() => setMode('register')}
        >
          <Text
            className={`text-center font-bold ${mode === 'register' ? 'text-on-action' : 'text-ink'}`}
          >
            Register
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        autoCapitalize="none"
        className="mt-4 rounded-md border border-outline px-3 py-3 text-ink placeholder:text-muted dark:border-outline/30"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      {mode === 'register' && (
        <TextInput
          className="mt-3 rounded-md border border-outline px-3 py-3 text-ink placeholder:text-muted dark:border-outline/30"
          onChangeText={setNickname}
          placeholder="Nickname"
          value={nickname}
        />
      )}
      <TextInput
        className="mt-3 rounded-md border border-outline px-3 py-3 text-ink placeholder:text-muted dark:border-outline/30"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      <TouchableOpacity className="mt-4 rounded-md bg-action p-4" onPress={submit}>
        <Text className="text-center font-black text-on-action">
          {mode === 'login' ? 'Connect' : 'Create and connect'}
        </Text>
      </TouchableOpacity>
      {message ? <Text className="mt-3 text-sm font-semibold text-muted">{message}</Text> : null}
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
  const syncStatus = snapshot.isFetching
    ? 'Syncing'
    : snapshot.isError || !isAuthenticated
      ? 'API offline'
      : 'Synced';

  useEffect(() => {
    if (calendars.length > 0 && !activeCalendarId) {
      setActiveCalendarId(calendars[0].id);
    }
  }, [activeCalendarId, calendars, setActiveCalendarId]);

  const currentCalendarId = activeCalendarId ?? calendars[0]?.id ?? null;
  const visibleEvents = useMemo(
    () =>
      currentCalendarId ? events.filter((event) => event.calendar === currentCalendarId) : events,
    [currentCalendarId, events],
  );
  const visibleTasks = tasks;

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="pb-4 pt-5">
          <Text className="text-xs font-black uppercase text-ink">Redeeming Time</Text>
          <Text className="mt-1 text-4xl font-black text-ink">Today’s Planner</Text>
          <Text className="mt-2 text-sm font-semibold text-muted">
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
          {visibleEvents.slice(0, 8).map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
          {visibleEvents.length === 0 && (
            <Text className="rounded-lg bg-surface p-4 text-muted">
              No events returned from the planner API.
            </Text>
          )}
        </View>

        <View>
          <Text className="mb-3 text-lg font-black text-ink">Task Continuity</Text>
          {visibleTasks.map((task) => (
            <TaskRow task={task} key={task.id} />
          ))}
          {visibleTasks.length === 0 && (
            <Text className="rounded-lg bg-surface p-4 text-muted">
              No tasks returned from the planner API.
            </Text>
          )}
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
