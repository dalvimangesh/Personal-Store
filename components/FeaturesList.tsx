import { Clipboard, Link2, Inbox, Globe, Sparkles, Eye, Trash2, StickyNote, ListTodo, Flame } from "lucide-react";

export function FeaturesList() {
  return (
    <div className="space-y-2 px-4 text-xs text-muted-foreground">
      <div className="flex items-start gap-2">
        <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Snippet Store:</strong> Organize code/text/prompt with tags & privacy.</span>
      </div>
      <div className="flex items-start gap-2">
        <Clipboard className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Clipboard Store:</strong> Quick clipboard history access.</span>
      </div>
      <div className="flex items-start gap-2">
        <ListTodo className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Todo Store:</strong> Manage tasks with priority & deadlines.</span>
      </div>
      <div className="flex items-start gap-2">
        <Link2 className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Link Store:</strong> Save & manage important links.</span>
      </div>
      <div className="flex items-start gap-2">
        <Inbox className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Drop Store:</strong> Generate one-time link and let others drop text.</span>
      </div>
      <div className="flex items-start gap-2">
        <Globe className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Public Store:</strong> Share with world or specific users.</span>
      </div>
      <div className="flex items-start gap-2">
        <Flame className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Secret Store:</strong> Generate self-destructing links for sensitive info.</span>
      </div>
      <div className="flex items-start gap-2">
        <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Smart Editor:</strong> AI-powered smart editing with Gemini.</span>
      </div>
      <div className="flex items-start gap-2">
        <Eye className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Privacy Mode:</strong> Blur sensitive content instantly.</span>
      </div>
      <div className="flex items-start gap-2">
        <Trash2 className="h-3 w-3 mt-0.5 shrink-0" />
        <span><strong>Trash Store:</strong> Safety net.</span>
      </div>
    </div>
  );
}
