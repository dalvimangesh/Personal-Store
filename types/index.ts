export interface Snippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isHidden?: boolean;
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
  isCompleted: boolean; // Keep for backward compatibility if needed, or map to status
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: Date;
}
