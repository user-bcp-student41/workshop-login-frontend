export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginRequest extends LoginCredentials {
  client: string;
}

export interface SessionUser {
  username?: string;
  displayName?: string;
}

export interface LoginResponse {
  token?: string;
  user: SessionUser;
}

export interface Preferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

export interface Task {
  title?: string;
  description?: string;
  priority?: string;
  owner?: string;
  status?: string;
}

export interface TaskView extends Task {
  label: string;
}

export interface TasksRequest {
  owner: string;
}

export type TasksResponse = Task[];
