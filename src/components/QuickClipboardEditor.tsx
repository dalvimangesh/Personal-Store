import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, X, Users, Shield, LogOut, UserPlus, UserMinus, Globe, Copy, ExternalLink, Eye, EyeOff, Bold, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SharedUser {
    userId: string;
    username: string;
}

interface Clipboard {
  _id?: string;
  name: string;
  content: string;
  isHidden?: boolean;
  isBold?: boolean;
  color?: string;
  isOwner?: boolean;
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: SharedUser[];
  isPublic?: boolean;
  publicToken?: string;
}

const COLORS = [
    { name: "Default", value: "inherit", class: "bg-foreground" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Red", value: "#ef4444", class: "bg-red-500" },
    { name: "Green", value: "#22c55e", class: "bg-green-500" },
    { name: "Purple", value: "#a855f7", class: "bg-purple-500" },
    { name: "Orange", value: "#f97316", class: "bg-orange-500" },
    { name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
    { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
];

export function QuickClipboardEditor({ isPrivacyMode = false, showHiddenMaster = false }: { isPrivacyMode?: boolean, showHiddenMaster?: boolean }) {
  const [clipboards, setClipboards] = useState<Clipboard[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUsername, setShareUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    // Fetch initial content
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/quick-clip");
        const data = await res.json();
        if (res.ok) {
            if (data.data.clipboards && data.data.clipboards.length > 0) {
                setClipboards(data.data.clipboards);
                
                // Find first visible tab if activeTab is not set or points to hidden
                if (!showHiddenMaster) {
                    const firstVisible = data.data.clipboards.findIndex((c: Clipboard) => !c.isHidden);
                    if (firstVisible !== -1) setActiveTab(firstVisible);
                }
            } else {
                // Fallback/Default
                setClipboards([{ name: "Main", content: "", isOwner: true }]);
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
  }, [showHiddenMaster]);

  const saveClipboards = useCallback(async (newClipboards: Clipboard[], specificIndex?: number) => {
    setIsSaving(true);
    try {
        // If specific index provided, optimize for single clipboard update (especially for shared ones)
        if (specificIndex !== undefined) {
            const targetClip = newClipboards[specificIndex];
            if (targetClip.isOwner === false) {
                // Updating shared clipboard
                const res = await fetch("/api/quick-clip/clipboard", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        clipboardId: targetClip._id,
                        ownerId: targetClip.ownerId,
                        clipboard: {
                            name: targetClip.name,
                            content: targetClip.content,
                            isHidden: targetClip.isHidden,
                            isBold: targetClip.isBold,
                            color: targetClip.color
                        }
                    }),
                });
                if (!res.ok) throw new Error("Failed to update shared clipboard");
                setIsSaving(false);
                return;
            }
        }

      // Default: save all owned clipboards
      const ownedClipboards = newClipboards.filter(c => c.isOwner !== false);
      
      const res = await fetch("/api/quick-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipboards: ownedClipboards }),
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
  }, []);

  const debouncedSave = useCallback((newClipboards: Clipboard[], changedIndex?: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
        saveClipboards(newClipboards, changedIndex);
    }, 1000);
  }, [saveClipboards]);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Synchronize editor content when tab changes
    if (editorRef.current && clipboards[activeTab]) {
        if (editorRef.current.innerHTML !== clipboards[activeTab].content) {
            editorRef.current.innerHTML = clipboards[activeTab].content || "";
        }
    }
  }, [activeTab]);

  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    const newContent = editorRef.current.innerHTML;
    
    setClipboards(prev => {
        if (prev[activeTab].content === newContent) return prev;
        const newClipboards = [...prev];
        newClipboards[activeTab] = { ...newClipboards[activeTab], content: newContent };
        setIsSaving(true);
        debouncedSave(newClipboards, activeTab);
        return newClipboards;
    });
  }, [activeTab, debouncedSave]);

  const [isBoldActive, setIsBoldActive] = useState(false);
  const [currentColor, setCurrentColor] = useState("inherit");

  const updateSelectionState = useCallback(() => {
    setIsBoldActive(document.queryCommandState('bold'));
    const color = document.queryCommandValue('foreColor');
    // Convert rgb to hex if needed or just use it
    setCurrentColor(color || "inherit");
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
        if (document.activeElement === editorRef.current) {
            updateSelectionState();
        }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateSelectionState]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        
        if (e.shiftKey) {
            // Shift + Tab: Remove 4 spaces or a tab
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            
            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            
            if (container.nodeType === Node.TEXT_NODE) {
                const text = container.textContent || "";
                const before = text.substring(0, range.startOffset);
                const after = text.substring(range.startOffset);
                
                // Look for 4 spaces or a tab before the cursor
                if (before.endsWith('    ')) {
                    container.textContent = before.substring(0, before.length - 4) + after;
                    range.setStart(container, Math.max(0, range.startOffset - 4));
                    range.setEnd(container, Math.max(0, range.startOffset - 4));
                } else if (before.endsWith('\t')) {
                    container.textContent = before.substring(0, before.length - 1) + after;
                    range.setStart(container, Math.max(0, range.startOffset - 1));
                    range.setEnd(container, Math.max(0, range.startOffset - 1));
                }
            }
        } else {
            // Tab: Insert 4 spaces
            document.execCommand('insertHTML', false, '    ');
        }
        handleContentChange();
    }
  }, [handleContentChange]);

  const toggleBold = useCallback(() => {
    document.execCommand('bold', false);
    updateSelectionState();
    handleContentChange();
    editorRef.current?.focus();
  }, [handleContentChange, updateSelectionState]);

  const handleColorChange = useCallback((color: string) => {
    document.execCommand('foreColor', false, color === 'inherit' ? 'inherit' : color);
    updateSelectionState();
    handleContentChange();
    editorRef.current?.focus();
  }, [handleContentChange, updateSelectionState]);

  const handleNameChange = useCallback((newName: string, index: number) => {
    setClipboards(prev => {
        const newClipboards = [...prev];
        newClipboards[index] = { ...newClipboards[index], name: newName };
        debouncedSave(newClipboards, index);
        return newClipboards;
    });
  }, [debouncedSave]);

  const handleAddClipboard = useCallback(async () => {
    setClipboards(prev => {
        const newClipboards = [...prev, { name: "New Clipboard", content: "", isOwner: true, sharedWith: [] }];
        const newIndex = newClipboards.length - 1;
        setActiveTab(newIndex); 
        
        saveClipboards(newClipboards).then(() => {
             // Refetch to get the _id of the new clipboard so the share button works immediately
             fetch("/api/quick-clip?t=" + Date.now()).then(res => {
                if (res.ok) {
                    res.json().then(d => {
                        setClipboards(d.data.clipboards);
                    });
                }
             });
        });
        
        return newClipboards;
    });
  }, [saveClipboards]);

  const handleLeaveClipboard = useCallback(async (clipboard: Clipboard) => {
      try {
          const res = await fetch("/api/quick-clip/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  clipboardId: clipboard._id,
                  ownerId: clipboard.ownerId,
                  action: 'leave'
              })
          });
          if (res.ok) {
              toast.success("Left clipboard");
              setClipboards(prev => {
                  const newClipboards = prev.filter(c => c !== clipboard);
                  // Adjust tab if needed
                  setActiveTab(current => {
                      if (current >= newClipboards.length) {
                          return Math.max(0, newClipboards.length - 1);
                      }
                      return current;
                  });
                  return newClipboards;
              });
          } else {
              toast.error("Failed to leave clipboard");
          }
      } catch (error) {
          toast.error("Error leaving clipboard");
      }
  }, []);

  const handleDeleteClipboard = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    
    setClipboards(prev => {
        const clipToDelete = prev[index];
        
        if (clipToDelete.isOwner === false) {
            handleLeaveClipboard(clipToDelete);
            return prev;
        }

        if (prev.length <= 1) {
            toast.error("Cannot delete the last clipboard");
            return prev;
        }

        const newClipboards = prev.filter((_, i) => i !== index);
        
        // Adjust active tab
        setActiveTab(current => {
            if (current >= index && current > 0) {
                return current - 1;
            } else if (current >= newClipboards.length) {
                return newClipboards.length - 1;
            }
            return current;
        });
        
        saveClipboards(newClipboards);
        return newClipboards;
    });
  }, [handleLeaveClipboard, saveClipboards]);

  const toggleHideClipboard = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setClipboards(prev => {
        const newClipboards = [...prev];
        newClipboards[index] = { ...newClipboards[index], isHidden: !newClipboards[index].isHidden };
        saveClipboards(newClipboards, index);
        return newClipboards;
    });
  }, [saveClipboards]);

  // Sharing Logic
  const handleAddUser = async () => {
      const activeClipboard = clipboards[activeTab];
      if (!shareUsername || !activeClipboard) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/quick-clip/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  clipboardId: activeClipboard._id,
                  action: 'add',
                  username: shareUsername
              })
          });
          const data = await res.json();
          if (res.ok) {
              toast.success("User added successfully");
              setShareUsername("");
              const fetchRes = await fetch("/api/quick-clip?t=" + Date.now());
              if (fetchRes.ok) {
                  const d = await fetchRes.json();
                  setClipboards(d.data.clipboards);
              }
          } else {
              toast.error(data.error || "Failed to add user");
          }
      } catch (error) {
          toast.error("Error adding user");
      } finally {
          setIsSharing(false);
      }
  };

  const handleRemoveUser = async (username: string) => {
      const activeClipboard = clipboards[activeTab];
      if (!activeClipboard) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/quick-clip/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  clipboardId: activeClipboard._id,
                  action: 'remove',
                  username: username
              })
          });
          if (res.ok) {
              toast.success("User removed");
              setClipboards(prev => {
                  const newClipboards = [...prev];
                  const active = newClipboards[activeTab];
                  if (active) {
                      const newSharedWith = (active.sharedWith || []).filter(u => u.username !== username);
                      newClipboards[activeTab] = { ...active, sharedWith: newSharedWith };
                  }
                  return newClipboards;
              });
          } else {
              toast.error("Failed to remove user");
          }
      } catch (error) {
          toast.error("Error removing user");
      } finally {
          setIsSharing(false);
      }
  };

  const handlePublicToggle = async () => {
      const activeClipboard = clipboards[activeTab];
      if (!activeClipboard) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/quick-clip/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  clipboardId: activeClipboard._id,
                  action: 'public_toggle'
              })
          });
          const data = await res.json();
          if (res.ok) {
               setClipboards(prev => {
                  const newClipboards = [...prev];
                  newClipboards[activeTab] = { 
                      ...prev[activeTab], 
                      isPublic: data.data.isPublic, 
                      publicToken: data.data.publicToken 
                  };
                  return newClipboards;
               });
               toast.success(data.data.isPublic ? "Public link created" : "Public link disabled");
          } else {
              toast.error(data.error || "Failed to toggle public link");
          }
      } catch (error) {
          toast.error("Error toggling public link");
      } finally {
          setIsSharing(false);
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeClipboard = clipboards[activeTab] || { content: "" };
  const isOwner = activeClipboard.isOwner !== false;
  const isShared = !isOwner;

  return (
    <div className="flex flex-col h-full gap-2">
        <div className="flex items-center justify-between px-1">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right mr-4">
                {clipboards.map((clip, index) => {
                    if (!showHiddenMaster && clip.isHidden) return null;
                    return (
                        <ClipboardTab 
                            key={clip._id || index}
                            clip={clip}
                            index={index}
                            isActive={activeTab === index}
                            isPrivacyMode={isPrivacyMode}
                            setActiveTab={setActiveTab}
                            handleNameChange={handleNameChange}
                            toggleHideClipboard={toggleHideClipboard}
                            handleDeleteClipboard={handleDeleteClipboard}
                            clipboardsCount={clipboards.length}
                        />
                    );
                })}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleAddClipboard}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="flex items-center shrink-0 gap-2">
                <div className="flex items-center bg-muted/30 rounded-md px-1 mr-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-7 w-7 rounded-sm",
                            isBoldActive ? "bg-muted text-foreground" : "text-muted-foreground"
                        )}
                        onClick={toggleBold}
                        title="Bold selection"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground"
                                title="Text color"
                            >
                                <Palette className="h-4 w-4" style={{ color: currentColor !== 'inherit' ? currentColor : undefined }} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="grid grid-cols-4 gap-1 p-2 min-w-0">
                            {COLORS.map((color) => (
                                <DropdownMenuItem
                                    key={color.value}
                                    className="p-0 h-6 w-6 rounded-full cursor-pointer overflow-hidden border border-border"
                                    onClick={() => handleColorChange(color.value)}
                                    title={color.name}
                                >
                                    <div className={cn("h-full w-full", color.class)} style={color.value !== 'inherit' ? { backgroundColor: color.value } : {}} />
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isOwner && activeClipboard._id && (
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-muted-foreground hover:text-blue-500" 
                        onClick={() => {
                            setShareUsername("");
                            setShareDialogOpen(true);
                        }}
                        title="Share this clipboard"
                    >
                        <Users className="h-4 w-4 mr-1" /> Share
                    </Button>
                )}
                {isShared && (
                     <Badge variant="secondary" className="text-xs gap-1 h-7">
                        <Shield className="h-3 w-3" />
                        {activeClipboard.ownerUsername}
                     </Badge>
                )}

                {isSaving ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">Saved</span>
                )}
            </div>
        </div>
        
        <div className={cn(
            "flex-1 relative border-2 rounded-lg overflow-hidden focus-within:border-ring/50 transition-colors bg-background"
        )}>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                onKeyDown={handleKeyDown}
                className={cn(
                    "flex-1 p-4 min-h-full w-full outline-none font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap break-words",
                    isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : "",
                    !activeClipboard.content && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
                )}
                data-placeholder="Type or paste anything here..."
                spellCheck={false}
            />
        </div>
        <p className="text-xs text-muted-foreground px-1">
            Changes are saved automatically. Use this to sync text between devices.
        </p>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share "{activeClipboard.name}"</DialogTitle>
                    <DialogDescription>
                        Manage access and public links.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    {/* Public Link Section */}
                    <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <Globe className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium">Public Link</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Anyone with the link can view this clipboard.
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant={activeClipboard.isPublic ? "destructive" : "default"} 
                                size="sm" 
                                onClick={handlePublicToggle}
                                disabled={isSharing}
                            >
                                {activeClipboard.isPublic ? "Disable" : "Enable"}
                            </Button>
                        </div>

                        {activeClipboard.isPublic && activeClipboard.publicToken && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input 
                                    readOnly 
                                    value={`${window.location.origin}/public/clip/${activeClipboard.publicToken}`}
                                    className="text-xs font-mono h-8"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/public/clip/${activeClipboard.publicToken}`);
                                        toast.success("Link copied!");
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => window.open(`${window.location.origin}/public/clip/${activeClipboard.publicToken}`, '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                    <div className="flex items-end gap-2">
                        <div className="grid gap-1 w-full">
                            <Label htmlFor="username">Add by username</Label>
                            <Input
                                id="username"
                                placeholder="username"
                                value={shareUsername}
                                onChange={(e) => setShareUsername(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                            />
                        </div>
                        <Button onClick={handleAddUser} disabled={isSharing || !shareUsername}>
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <Label>Shared with</Label>
                        {activeClipboard.sharedWith && activeClipboard.sharedWith.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {activeClipboard.sharedWith.map((user) => (
                                    <div key={user.userId} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium">{user.username}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveUser(user.username)}
                                            disabled={isSharing}
                                        >
                                            <UserMinus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Not shared with anyone yet.</p>
                        )}
                    </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

const ClipboardTab = memo(function ClipboardTab({
    clip,
    index,
    isActive,
    isPrivacyMode,
    setActiveTab,
    handleNameChange,
    toggleHideClipboard,
    handleDeleteClipboard,
    clipboardsCount
}: any) {
    const clipIsShared = clip.isOwner === false;
    
    return (
        <div 
            className={cn(
                "group relative flex items-center gap-1 px-3 py-1.5 rounded-t-md border-t border-x cursor-pointer min-w-[120px] transition-colors select-none",
                isActive 
                    ? "bg-background border-border text-foreground z-10 -mb-[2px] pb-2" 
                    : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
            onClick={() => setActiveTab(index)}
        >
            {clipIsShared && <Shield className="h-3 w-3 text-blue-500 mr-1" />}
            <Input
                value={clip.name}
                onChange={(e) => handleNameChange(e.target.value, index)}
                className={cn(
                    "h-6 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 font-medium text-sm w-full cursor-text",
                    isPrivacyMode && "blur-sm group-hover:blur-none transition-all"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isActive) setActiveTab(index);
                }} 
            />
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-muted"
                    onClick={(e) => toggleHideClipboard(e, index)}
                    title={clip.isHidden ? "Show Clipboard" : "Hide Clipboard"}
                >
                    {clip.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                
                {(clipboardsCount > 1 || clipIsShared) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-5 w-5 -mr-1 transition-all",
                            clipIsShared ? "hover:text-destructive" : "hover:bg-destructive/10 hover:text-destructive"
                        )}
                        onClick={(e) => handleDeleteClipboard(e, index)}
                        title={clipIsShared ? "Leave Clipboard" : "Delete Clipboard"}
                    >
                        {clipIsShared ? <LogOut className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </Button>
                )}
            </div>
        </div>
    );
});
