export interface Snippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isHidden?: boolean;
  isHiding?: boolean;
  createdAt: Date;
}

export interface SharedSnippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  allowedUsers: string[];
  createdAt: Date;
  isOwner?: boolean;
  author?: string;
}

export interface Drop {
  id: string;
  content: string;
  createdAt: Date;
  sender?: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: number;
  startDate?: Date;
  deadline?: Date;
  isCompleted: boolean; 
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: Date;
}

export interface TodoCategory {
  _id?: string;
  name: string;
  items: Todo[];
  isOwner?: boolean;
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: { userId: string; username: string }[];
  isPublic?: boolean;
  publicToken?: string;
  isHidden?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  goalValue?: number;
  goalUnit?: string;
  frequency: 'daily' | 'weekly';
  isHidden?: boolean;
  createdAt: Date;
  updatedAt: Date;
  logs?: HabitLog[];
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  value?: number;
  completed: boolean;
  createdAt: Date;
}
