"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Palette, Bold, Copy, Eye, EyeOff, Trash2, Share2, MoreVertical, X, Clipboard as ClipboardIcon, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Clipboard {
  _id?: string;
  name: string;
  content: string;
  isHidden?: boolean;
  isBold?: boolean;
  color?: string;
  isOwner?: boolean;
}

const COLORS = [
    { name: "Default", value: "inherit", class: "bg-transparent border-2 border-dashed border-muted-foreground/60" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Red", value: "#ef4444", class: "bg-red-500" },
    { name: "Green", value: "#22c55e", class: "bg-green-500" },
    { name: "Purple", value: "#a855f7", class: "bg-purple-500" },
    { name: "Orange", value: "#f97316", class: "bg-orange-500" },
    { name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
    { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
    { name: "Black", value: "#000000", class: "bg-black" },
    { name: "White", value: "#ffffff", class: "bg-white border border-border" },
];

export function MobileClipboardStore() {
  const [clipboards, setClipboards] = useState<Clipboard[]>([]);
  const [activeTabIndex, setActiveTab] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newClipName, setNewClipName] = useState("");
  
  const editorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/quick-clip");
      const data = await res.json();
      if (res.ok) {
        if (data.data.clipboards && data.data.clipboards.length > 0) {
            setClipboards(data.data.clipboards);
        } else {
            setClipboards([{ name: "Main", content: "", isOwner: true }]);
        }
      }
    } catch (e) {
      toast.error("Failed to load clipboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const saveClipboards = useCallback(async (newClipboards: Clipboard[]) => {
    setIsSaving(true);
    try {
        const ownedClipboards = newClipboards.filter(c => c.isOwner !== false);
        await fetch("/api/quick-clip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clipboards: ownedClipboards }),
        });
    } catch (e) {
        toast.error("Failed to save changes");
    } finally {
        setIsSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((newClipboards: Clipboard[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveClipboards(newClipboards), 1000);
  }, [saveClipboards]);

  // Sync editor content when tab changes
  useEffect(() => {
    if (editorRef.current && activeTabIndex !== null && clipboards[activeTabIndex]) {
        if (editorRef.current.innerHTML !== clipboards[activeTabIndex].content) {
            editorRef.current.innerHTML = clipboards[activeTabIndex].content || "";
        }
    }
  }, [activeTabIndex, clipboards]);

  const handleContentChange = useCallback(() => {
    if (!editorRef.current || activeTabIndex === null) return;
    const newContent = editorRef.current.innerHTML;
    
    setClipboards(prev => {
        if (prev[activeTabIndex].content === newContent) return prev;
        const newClipboards = [...prev];
        newClipboards[activeTabIndex] = { ...newClipboards[activeTabIndex], content: newContent };
        debouncedSave(newClipboards);
        return newClipboards;
    });
  }, [activeTabIndex, debouncedSave]);

  const handleAddClipboard = async () => {
      if (!newClipName.trim()) return;
      const newClips = [...clipboards, { name: newClipName, content: "", isOwner: true }];
      setClipboards(newClips);
      saveClipboards(newClips);
      setNewClipName("");
      setIsAddOpen(false);
  };

  const handleDeleteClipboard = async (index: number) => {
      if (!confirm("Delete this clipboard tab?")) return;
      
      const newClips = clipboards.filter((_, i) => i !== index);
      if (newClips.length === 0) {
          newClips.push({ name: "Main", content: "", isOwner: true });
      }
      
      setClipboards(newClips);
      saveClipboards(newClips);
      setActiveTab(null); // Go back to root view after delete
  };

  const formatText = (command: string, value?: string) => {
      document.execCommand('styleWithCSS', false, "true");
      document.execCommand(command, false, value);
      handleContentChange();
      editorRef.current?.focus();
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading clipboard...</div>;

  // Filter clipboards for root view based on search
  const filteredClipboards = clipboards.filter(c => 
      !c.isHidden && (
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (c.content && c.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        {activeTabIndex !== null && (
            <Button variant="ghost" size="icon" onClick={() => setActiveTab(null)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-9" 
            placeholder={activeTabIndex !== null ? "Search within content..." : "Search clipboards..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {!activeTabIndex && (
            <Button size="icon" onClick={() => setIsAddOpen(true)} className="h-9 w-9 shrink-0">
                <Plus className="h-5 w-5" />
            </Button>
        )}
      </div>

      {activeTabIndex === null ? (
          // Root View: Grid of Clipboards
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
              <div className="grid grid-cols-2 gap-3">
                  {filteredClipboards.map((clip, index) => {
                      // Need to find original index for selection
                      const originalIndex = clipboards.indexOf(clip);
                      return (
                        <Card 
                            key={index}
                            className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                            onClick={() => setActiveTab(originalIndex)}
                        >
                            <ClipboardIcon className="h-8 w-8 text-purple-500 fill-purple-500/20" />
                            <span className="font-medium text-sm truncate w-full text-center">{clip.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                                {clip.content ? "Has content" : "Empty"}
                            </span>
                        </Card>
                      );
                  })}
              </div>
              {filteredClipboards.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                      <p>No clipboards found</p>
                  </div>
              )}
          </div>
      ) : (
          // Detail View: Editor
          <>
             {/* Toolbar */}
             <div className="flex items-center justify-between p-2 border-b bg-muted/10 px-4">
                 <div className="flex items-center gap-2">
                     <span className="text-sm font-medium max-w-[120px] truncate">
                         {clipboards[activeTabIndex]?.name}
                     </span>
                     <div className="h-4 w-[1px] bg-border mx-1" />
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('bold')}>
                            <Bold className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Palette className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="grid grid-cols-5 gap-1 p-2">
                                {COLORS.map((c) => (
                                    <DropdownMenuItem 
                                        key={c.value} 
                                        className="p-0 h-6 w-6 rounded-full border cursor-pointer"
                                        style={{ backgroundColor: c.value !== 'inherit' ? c.value : 'transparent' }}
                                        onClick={() => formatText('foreColor', c.value)}
                                    />
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-1">
                     <span className="text-[10px] text-muted-foreground mr-2">
                         {isSaving ? "Saving..." : "Saved"}
                     </span>
                     <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreVertical className="h-4 w-4" />
                             </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => {
                                 navigator.clipboard.writeText(editorRef.current?.innerText || "");
                                 toast.success("Copied to clipboard");
                             }}>
                                 <Copy className="mr-2 h-4 w-4" /> Copy All
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                                 className="text-destructive focus:text-destructive"
                                 onClick={() => handleDeleteClipboard(activeTabIndex)}
                                 disabled={clipboards.length <= 1}
                             >
                                 <Trash2 className="mr-2 h-4 w-4" /> Delete Clipboard
                             </DropdownMenuItem>
                         </DropdownMenuContent>
                     </DropdownMenu>
                 </div>
             </div>

             {/* Editor Area */}
             <div className="flex-1 relative overflow-hidden bg-background">
                 <div
                     ref={editorRef}
                     contentEditable
                     onInput={handleContentChange}
                     className={cn(
                         "absolute inset-0 p-4 outline-none font-mono text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap break-words",
                         !clipboards[activeTabIndex]?.content && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
                     )}
                     data-placeholder="Type here..."
                     spellCheck={false}
                 />
             </div>
          </>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>New Clipboard</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    placeholder="Clipboard Name" 
                    value={newClipName} 
                    onChange={(e) => setNewClipName(e.target.value)}
                    autoFocus
                />
            </div>
            <DialogFooter>
                <Button onClick={handleAddClipboard} className="w-full">Create</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
