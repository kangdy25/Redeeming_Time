export type SocialProvider = 'LOCAL' | 'GOOGLE' | 'KAKAO';
export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type AttendanceStatus = 'ACCEPTED' | 'DECLINED' | 'PENDING';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface User {
  id: number;
  email: string;
  nickname: string;
  profile_image_url: string;
  social_provider: SocialProvider;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: number;
  title: string;
  description: string;
  theme_color: string;
  created_at: string;
}

export interface CalendarMember {
  id: number;
  calendar: number;
  user: number;
  user_detail?: User;
  role: MemberRole;
  joined_at: string;
}

export interface Category {
  id: number;
  calendar: number;
  name: string;
  color_code: string;
  created_at: string;
}

export interface CongestionWarning {
  is_congested: boolean;
  daily_hours: number;
  overlap_count: number;
  reasons: string[];
}

export interface Event {
  id: number;
  calendar: number;
  creator: number | null;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  rrule: string;
  congestion_warning?: CongestionWarning;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  calendar: number;
  category: number | null;
  category_detail?: Category | null;
  creator: number;
  title: string;
  is_completed: boolean;
  target_date: string;
  priority: TaskPriority;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface PlannerSnapshot {
  calendars: Calendar[];
  categories: Category[];
  events: Event[];
  tasks: Task[];
}

export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
}

export interface CalendarPayload {
  title: string;
  description: string;
  theme_color: string;
}

export interface CategoryPayload {
  calendar: number;
  name: string;
  color_code: string;
}

export interface EventPayload {
  calendar: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  rrule: string;
}

export interface TaskPayload {
  calendar: number;
  category?: number | null;
  title: string;
  target_date: string;
  priority: TaskPriority;
  order: number;
}
