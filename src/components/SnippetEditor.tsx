import { useState, useRef, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Snippet } from "@/types";
import { X, Save, Trash2, EyeOff, Eye, Tag, Braces } from "lucide-react";
import { toast } from "sonner";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";

interface SnippetEditorProps {
  snippet?: Snippet | null;
  onSave: (data: { title: string; content: string; tags: string[]; isHidden: boolean; isHiding: boolean }) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const SnippetEditor = memo(function SnippetEditor({ snippet, onSave, onCancel, onDelete }: SnippetEditorProps) {
  const [title, setTitle] = useState(snippet?.title || "");
  const [content, setContent] = useState(snippet?.content || "");
  const [tags, setTags] = useState(snippet?.tags.join(", ") || "");
  const [isHidden, setIsHidden] = useState(snippet?.isHidden || false);
  const [isHiding, setIsHiding] = useState(snippet?.isHiding || false);
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

    onSave({
      title,
      content,
      tags: tagsArray,
      isHidden,
      isHiding,
    });
  }, [title, content, tags, isHidden, isHiding, onSave]);

  const insertVariable = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variablePlaceholder = "{{variable}}";

    const newContent = content.substring(0, start) + variablePlaceholder + content.substring(end);
    setContent(newContent);

    // Set focus and select the 'variable' part so user can type name immediately
    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + 2;
      const selectionEnd = selectionStart + 8; // length of "variable"
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 font-semibold text-lg">
          {snippet ? "Edit Snippet" : "New Snippet"}
        </div>
        <div className="flex items-center gap-2">
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

          {/* Meta Controls (Tags & Visibility) */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2 flex-1">
              <Tag className="h-4 w-4 shrink-0" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="h-8 border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/70 min-w-[200px]"
                placeholder="Tags (comma separated)"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hidden-mode"
                checked={isHidden}
                onCheckedChange={(checked) => setIsHidden(checked as boolean)}
              />
              <Label
                htmlFor="hidden-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isHidden ? "Hidden Snippet" : "Normal Snippet"}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hiding-mode"
                checked={isHiding}
                onCheckedChange={(checked) => setIsHiding(checked as boolean)}
              />
              <Label
                htmlFor="hiding-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                {isHiding ? <EyeOff className="h-3 w-3 text-red-500" /> : <Eye className="h-3 w-3 text-green-500" />}
                {isHiding ? "Soft Hidden" : "Soft Visible"}
              </Label>
            </div>
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
