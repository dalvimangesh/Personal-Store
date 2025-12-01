import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function QuickClipboardEditor() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch initial content
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/quick-clip");
        const data = await res.json();
        if (res.ok) {
          setContent(data.data.content);
        } else {
          toast.error("Failed to load Quick Clipboard");
        }
      } catch (error) {
        console.error("Error fetching quick clip:", error);
        toast.error("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsSaving(true);

    // Debounce save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/quick-clip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to save");
        }
      } catch (error) {
        console.error("Error saving quick clip:", error);
        toast.error("Failed to save changes");
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Save after 1 second of no typing
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
        <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
                Changes are saved automatically. Use this to sync text between devices.
            </p>
            {isSaving ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
            ) : (
                <span className="text-xs text-muted-foreground">Saved</span>
            )}
        </div>
      <Textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Type or paste anything here..."
        className="flex-1 resize-none font-mono text-sm p-4 leading-relaxed border-2 focus-visible:ring-0"
        spellCheck={false}
      />
    </div>
  );
}

