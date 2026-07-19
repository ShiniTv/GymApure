import type { MemberOnboarding } from '../../components/members/OnboardingStatus';

export interface LookupResult {
  found: boolean;
  user?: {
    id: number;
    full_name: string;
    email: string;
    cedula: string | null;
    phone: string | null;
    status: string;
    role: string;
  };
  subscription?: {
    membership_name: string;
    end_date: string | null;
    days_remaining: number;
    status?: 'active' | 'paused';
    pause_reason?: string | null;
  } | null;
  attendance?: {
    is_inside: boolean;
    today_session: { check_in_time: string; check_out_time: string | null } | null;
  };
  access_status?: 'allowed' | 'inactive' | 'no_subscription' | 'paused';
  can_check_in?: boolean;
  can_check_out?: boolean;
  onboarding?: MemberOnboarding | null;
  error?: string;
}

export interface InsideMember {
  id: number;
  full_name: string;
  cedula: string | null;
  check_in_time: string;
}

export type ReceptionTab = 'access' | 'inside' | 'register' | 'renew' | 'guests';

export interface AttendanceActionResult {
  error?: string;
  user_name?: string;
  message?: string;
  already_checked_in?: boolean;
  already_checked_out?: boolean;
  duration_label?: string;
}
