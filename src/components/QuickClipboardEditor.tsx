import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Clipboard {
  _id?: string;
  name: string;
  content: string;
}

export function QuickClipboardEditor({ isPrivacyMode = false }: { isPrivacyMode?: boolean }) {
  const [clipboards, setClipboards] = useState<Clipboard[]>([]);
  const [activeTab, setActiveTab] = useState(0);
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
            if (data.data.clipboards && data.data.clipboards.length > 0) {
                setClipboards(data.data.clipboards);
            } else {
                // Fallback/Default
                setClipboards([{ name: "Main", content: "" }]);
            }
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

  const saveClipboards = async (newClipboards: Clipboard[]) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/quick-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipboards: newClipboards }),
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
  };

  const debouncedSave = (newClipboards: Clipboard[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
        saveClipboards(newClipboards);
    }, 1000);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newClipboards = [...clipboards];
    newClipboards[activeTab] = { ...newClipboards[activeTab], content: newContent };
    
    setClipboards(newClipboards);
    setIsSaving(true); // Show saving immediately
    debouncedSave(newClipboards);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newName = e.target.value;
    const newClipboards = [...clipboards];
    newClipboards[index] = { ...newClipboards[index], name: newName };
    
    setClipboards(newClipboards);
    debouncedSave(newClipboards);
  };

  const handleAddClipboard = () => {
    const newClipboards = [...clipboards, { name: "New Clipboard", content: "" }];
    setClipboards(newClipboards);
    setActiveTab(newClipboards.length - 1); // Switch to new tab
    saveClipboards(newClipboards); // Save immediately on structure change
  };

  const handleDeleteClipboard = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent tab switching
    
    if (clipboards.length <= 1) {
        toast.error("Cannot delete the last clipboard");
        return;
    }

    const newClipboards = clipboards.filter((_, i) => i !== index);
    setClipboards(newClipboards);
    
    // Adjust active tab
    if (activeTab >= index && activeTab > 0) {
        setActiveTab(activeTab - 1);
    } else if (activeTab >= newClipboards.length) {
        setActiveTab(newClipboards.length - 1);
    }
    
    saveClipboards(newClipboards);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeClipboard = clipboards[activeTab] || { content: "" };

  return (
    <div className="flex flex-col h-full gap-2">
        <div className="flex items-center justify-between px-1">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right mr-4">
                {clipboards.map((clip, index) => (
                    <div 
                        key={clip._id || index} 
                        className={cn(
                            "group relative flex items-center gap-1 px-3 py-1.5 rounded-t-md border-t border-x cursor-pointer min-w-[120px] transition-colors select-none",
                            activeTab === index 
                                ? "bg-background border-border text-foreground z-10 -mb-[2px] pb-2" 
                                : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                        onClick={() => setActiveTab(index)}
                    >
                        <Input
                            value={clip.name}
                            onChange={(e) => handleNameChange(e, index)}
                            className={cn(
                                "h-6 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 font-medium text-sm w-full cursor-text",
                                isPrivacyMode && "blur-sm group-hover:blur-none transition-all"
                            )}
                            onClick={(e) => e.stopPropagation()} // Allow typing without re-triggering tab click
                        />
                        {clipboards.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive -mr-1 transition-all"
                                onClick={(e) => handleDeleteClipboard(e, index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleAddClipboard}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="flex items-center shrink-0">
                {isSaving ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">Saved</span>
                )}
            </div>
        </div>
        
        <div className="flex-1 relative border-2 rounded-lg overflow-hidden focus-within:border-ring/50 transition-colors">
            <Textarea
                value={activeClipboard.content}
                onChange={handleContentChange}
                placeholder="Type or paste anything here..."
                className={cn(
                    "flex-1 resize-none font-mono text-sm p-4 leading-relaxed border-0 focus-visible:ring-0 h-full w-full rounded-none",
                    isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : ""
                )}
                spellCheck={false}
            />
        </div>
        <p className="text-xs text-muted-foreground px-1">
            Changes are saved automatically. Use this to sync text between devices.
        </p>
    </div>
  );
}
