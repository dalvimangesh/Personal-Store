export interface Snippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isHidden?: boolean;
  createdAt: Date;
}
