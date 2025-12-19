import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, X, Users, Shield, LogOut, UserPlus, UserMinus, Globe, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
  isOwner?: boolean;
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: SharedUser[];
  isPublic?: boolean;
  publicToken?: string;
}

export function QuickClipboardEditor({ isPrivacyMode = false }: { isPrivacyMode?: boolean }) {
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
  }, []);

  const saveClipboards = async (newClipboards: Clipboard[], specificIndex?: number) => {
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
                            content: targetClip.content
                        }
                    }),
                });
                if (!res.ok) throw new Error("Failed to update shared clipboard");
                setIsSaving(false);
                return;
            }
        }

      // Default: save all owned clipboards
      // (Note: ideally we should only save changed ones, but bulk save is simpler for now)
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
  };

  const debouncedSave = (newClipboards: Clipboard[], changedIndex?: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
        saveClipboards(newClipboards, changedIndex);
    }, 1000);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newClipboards = [...clipboards];
    newClipboards[activeTab] = { ...newClipboards[activeTab], content: newContent };
    
    setClipboards(newClipboards);
    setIsSaving(true); // Show saving immediately
    debouncedSave(newClipboards, activeTab);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newName = e.target.value;
    const newClipboards = [...clipboards];
    newClipboards[index] = { ...newClipboards[index], name: newName };
    
    setClipboards(newClipboards);
    debouncedSave(newClipboards, index);
  };

  const handleAddClipboard = async () => {
    const newClipboards = [...clipboards, { name: "New Clipboard", content: "", isOwner: true, sharedWith: [] }];
    setClipboards(newClipboards);
    const newIndex = newClipboards.length - 1;
    setActiveTab(newIndex); 
    
    // Wait for save to complete to get the new ID
    await saveClipboards(newClipboards);
    
    // Refetch to get the _id of the new clipboard so the share button works immediately
    const fetchRes = await fetch("/api/quick-clip?t=" + Date.now());
    if (fetchRes.ok) {
        const d = await fetchRes.json();
        // Keep the user on the newly created tab index
        setClipboards(d.data.clipboards);
    }
  };

  const handleDeleteClipboard = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent tab switching
    
    const clipToDelete = clipboards[index];
    
    if (clipToDelete.isOwner === false) {
        // Leave shared clipboard
        handleLeaveClipboard(clipToDelete);
        return;
    }

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
              // Refresh to get updated user list/ids
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
              // Optimistic update
              const newSharedWith = (activeClipboard.sharedWith || []).filter(u => u.username !== username);
              const newClipboards = [...clipboards];
              newClipboards[activeTab] = { ...activeClipboard, sharedWith: newSharedWith };
              setClipboards(newClipboards);
          } else {
              toast.error("Failed to remove user");
          }
      } catch (error) {
          toast.error("Error removing user");
      } finally {
          setIsSharing(false);
      }
  };

  const handleLeaveClipboard = async (clipboard: Clipboard) => {
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
              const newClipboards = clipboards.filter(c => c !== clipboard);
              setClipboards(newClipboards);
              // Adjust tab if needed
              if (activeTab >= newClipboards.length) {
                  setActiveTab(Math.max(0, newClipboards.length - 1));
              }
          } else {
              toast.error("Failed to leave clipboard");
          }
      } catch (error) {
          toast.error("Error leaving clipboard");
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
              const newClipboard = { 
                  ...activeClipboard, 
                  isPublic: data.data.isPublic, 
                  publicToken: data.data.publicToken 
              };
               
               const newClipboards = [...clipboards];
               newClipboards[activeTab] = newClipboard;
               setClipboards(newClipboards);
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
                    const clipIsShared = clip.isOwner === false;
                    return (
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
                        {clipIsShared && <Shield className="h-3 w-3 text-blue-500 mr-1" />}
                        <Input
                            value={clip.name}
                            onChange={(e) => handleNameChange(e, index)}
                            className={cn(
                                "h-6 p-0 border-none bg-transparent shadow-none focus-visible:ring-0 font-medium text-sm w-full cursor-text",
                                isPrivacyMode && "blur-sm group-hover:blur-none transition-all"
                            )}
                            // Allow typing without switching tab if already active, but switch if inactive
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab !== index) setActiveTab(index);
                            }} 
                        />
                        {/* Only show delete/leave if > 1 item OR if it's shared (can always leave shared) */}
                        {(clipboards.length > 1 || clipIsShared) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-5 w-5 opacity-0 group-hover:opacity-100 -mr-1 transition-all",
                                    clipIsShared ? "hover:text-destructive" : "hover:bg-destructive/10 hover:text-destructive"
                                )}
                                onClick={(e) => handleDeleteClipboard(e, index)}
                                title={clipIsShared ? "Leave Clipboard" : "Delete Clipboard"}
                            >
                                {clipIsShared ? <LogOut className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </Button>
                        )}
                    </div>
                )})}
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
                {/* Share Button for Active Tab */}
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
            "flex-1 relative border-2 rounded-lg overflow-hidden focus-within:border-ring/50 transition-colors"
        )}>
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
