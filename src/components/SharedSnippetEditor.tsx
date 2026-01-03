import { useState, useRef, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SharedSnippet } from "@/types";
import { X, Save, Trash2, Link2, Copy, Users, Tag, Braces } from "lucide-react";
import { toast } from "sonner";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";

interface SharedSnippetEditorProps {
  snippet?: SharedSnippet | null;
  onSave: (data: { title: string; content: string; tags: string[]; allowedUsers: string[] }) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const SharedSnippetEditor = memo(function SharedSnippetEditor({ snippet, onSave, onCancel, onDelete }: SharedSnippetEditorProps) {
  const [title, setTitle] = useState(snippet?.title || "");
  const [content, setContent] = useState(snippet?.content || "");
  const [tags, setTags] = useState(snippet?.tags.join(", ") || "");
  const [allowedUsers, setAllowedUsers] = useState(snippet?.allowedUsers.join(", ") || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = useCallback(() => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and Content are required");
      return;
    }

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const allowedUsersArray = allowedUsers
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    onSave({
      title,
      content,
      tags: tagsArray,
      allowedUsers: allowedUsersArray,
    });
  }, [title, content, tags, allowedUsers, onSave]);

  const handleCopyLink = useCallback(() => {
    if (snippet?.id) {
      const url = `${window.location.origin}/share/${snippet.id}`;
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("Save the snippet first to get a link");
    }
  }, [snippet?.id]);

  const insertVariable = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variablePlaceholder = "{{variable}}";

    const newContent = content.substring(0, start) + variablePlaceholder + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + 2;
      const selectionEnd = selectionStart + 8;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 font-semibold text-lg">
          {snippet ? "Edit Public Snippet" : "New Public Snippet"}
        </div>
        <div className="flex items-center gap-2">
           {snippet && (
             <Button
               variant="ghost"
               size="icon"
               onClick={handleCopyLink}
               title="Copy Share Link"
             >
               <Link2 className="h-4 w-4" />
             </Button>
           )}
           {snippet && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(snippet.id)}
              title="Delete Snippet"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onCancel} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Title Input */}
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium border-none px-0 shadow-none focus-visible:ring-0 rounded-none border-b placeholder:text-muted-foreground/70"
              placeholder="Snippet Title"
            />
          </div>

          {/* Meta Controls (Tags & Allowed Users) */}
          <div className="grid gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="h-8 border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/70 w-full"
                placeholder="Tags (comma separated)"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <Input
                value={allowedUsers}
                onChange={(e) => setAllowedUsers(e.target.value)}
                className="h-8 border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/70 w-full"
                placeholder="Allowed Usernames (comma separated, empty = public to all logged in users)"
              />
            </div>
             <p className="text-xs text-muted-foreground/60 pl-6">
                If empty, any logged-in user with the link can view. If usernames are added, only they can view.
            </p>
          </div>

          {/* Content Editor */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={insertVariable} 
                className="h-7 text-xs"
                title="Insert a variable placeholder like {{name}}"
              >
                <Braces className="h-3 w-3 mr-1" />
                Insert Variable
              </Button>
            </div>
            <div className="min-h-[400px] border rounded-md p-4 focus-within:ring-1 focus-within:ring-ring transition-all bg-card">
               <HighlightedTextarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] w-full resize-none border-none shadow-none focus-visible:ring-0 p-0 font-mono text-sm leading-relaxed bg-transparent"
                placeholder="Type your snippet content here... Use {{variable}} for dynamic values."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t p-4 bg-muted/5">
        <div className="flex justify-end gap-3 max-w-4xl mx-auto">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="min-w-[100px]">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
});

