import { Clipboard, Link2, Inbox, Globe, Sparkles, Eye, Trash2, StickyNote, ListTodo, Flame, SquareKanban, Activity } from "lucide-react";

export function FeaturesList() {
  return (
    <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 text-sm text-muted-foreground">
      <div className="flex items-start gap-3">
        <StickyNote className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
        <span><strong>Snippet Store:</strong> Organize code, text, and prompts with tags and privacy.</span>
      </div>
      <div className="flex items-start gap-3">
        <Clipboard className="h-5 w-5 mt-0.5 shrink-0 text-purple-500" />
        <span><strong>Clipboard Store:</strong> Quick access to your clipboard history across devices.</span>
      </div>
      <div className="flex items-start gap-3">
        <ListTodo className="h-5 w-5 mt-0.5 shrink-0 text-green-500" />
        <span><strong>Todo Store:</strong> Manage tasks with priority levels and deadlines.</span>
      </div>
      <div className="flex items-start gap-3">
        <Link2 className="h-5 w-5 mt-0.5 shrink-0 text-orange-500" />
        <span><strong>Link Store:</strong> Save and manage important links in one place.</span>
      </div>
      <div className="flex items-start gap-3">
        <Inbox className="h-5 w-5 mt-0.5 shrink-0 text-pink-500" />
        <span><strong>Drop Store:</strong> Generate one-time links for others to drop content.</span>
      </div>
      <div className="flex items-start gap-3">
        <Globe className="h-5 w-5 mt-0.5 shrink-0 text-cyan-500" />
        <span><strong>Public Store:</strong> Share snippets with the world or specific users.</span>
      </div>
      <div className="flex items-start gap-3">
        <Flame className="h-5 w-5 mt-0.5 shrink-0 text-red-500" />
        <span><strong>Secret Store:</strong> Self-destructing links for sharing sensitive info.</span>
      </div>
      <div className="flex items-start gap-3">
        <SquareKanban className="h-5 w-5 mt-0.5 shrink-0 text-indigo-500" />
        <span><strong>Tracking Store:</strong> Track progress with boards, columns, and cards.</span>
      </div>
      <div className="flex items-start gap-3">
        <Activity className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" />
        <span><strong>Habit Store:</strong> Build and maintain positive daily routines.</span>
      </div>
      <div className="flex items-start gap-3">
        <Trash2 className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
        <span><strong>Trash Store:</strong> A secure safety net for your deleted items.</span>
      </div>
      <div className="flex items-start gap-3 pt-4 border-t col-span-full">
        <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-yellow-500" />
        <span><strong>Smart Editor:</strong> AI-powered editing assistant powered by Gemini.</span>
      </div>
      <div className="flex items-start gap-3 col-span-full">
        <Eye className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
        <span><strong>Privacy Mode:</strong> Instantly blur sensitive content in public spaces.</span>
      </div>
    </div>
  );
}
