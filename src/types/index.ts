export interface Snippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isHidden?: boolean;
  createdAt: Date;
}

export interface Drop {
  id: string;
  content: string;
  createdAt: Date;
  sender?: string;
}
