import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, GripVertical, Copy, ExternalLink, FolderPlus, Users, UserMinus, LogOut, Shield, UserPlus, Globe, Check } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface LinkItem {
  _id?: string;
  label: string;
  value: string;
}

interface SharedUser {
    userId: string;
    username: string;
}

interface LinkCategory {
  _id?: string;
  name: string;
  items: LinkItem[];
  isOwner?: boolean;
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: SharedUser[];
  isPublic?: boolean;
  publicToken?: string;
}

const isValidUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkShareEditor({ searchQuery = "", isPrivacyMode = false }: { searchQuery?: string; isPrivacyMode?: boolean }) {
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LinkCategory | null>(null);
  const [shareUsername, setShareUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const filteredCategories = categories.map(cat => {
    // Guard clause for missing or malformed categories
    if (!cat || !cat.items) return null;

    const matchesCategory = (cat.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchingItems = (cat.items || []).filter(item => 
        (item.label || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.value || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (matchesCategory) return cat;
    
    if (matchingItems.length > 0) {
        return { ...cat, items: matchingItems };
    }
    return null;
  }).filter((cat): cat is LinkCategory => cat !== null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/link-share");
        const data = await res.json();
        if (res.ok) {
            let fetchedCategories = data.data.categories || [];
            
            if (!fetchedCategories.length && data.data.items) {
                 fetchedCategories = [{ name: "Default", items: data.data.items, isOwner: true }];
            }
            if (!fetchedCategories.length) {
                fetchedCategories = [{ name: "Default", items: [{ label: "", value: "" }], isOwner: true }];
            }

            setCategories(fetchedCategories);
        } else {
          toast.error("Failed to load Link Share");
        }
      } catch (error) {
        console.error("Error fetching link share:", error);
        toast.error("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  const saveCategories = async (newCategories: LinkCategory[]) => {
    setIsSaving(true);
    try {
        // Split categories into owned and shared
        const ownedCategories = newCategories.filter(c => c.isOwner !== false);
        const sharedCategories = newCategories.filter(c => c.isOwner === false);

        // 1. Save owned categories
        const res = await fetch("/api/link-share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categories: ownedCategories }),
        });
        
        if (!res.ok) throw new Error("Failed to save owned categories");

        // 2. Update shared categories individually
        // Note: This is inefficient if many shared categories change at once, 
        // but typical usage is editing one at a time.
        // We could optimize by checking if they actually changed.
        await Promise.all(sharedCategories.map(async (cat) => {
            // Only send necessary data
            const updateData = {
                categoryId: cat._id,
                ownerId: cat.ownerId,
                category: {
                    name: cat.name,
                    items: cat.items
                }
            };

            const shareRes = await fetch("/api/link-share/category", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            if (!shareRes.ok) console.error(`Failed to update shared category ${cat.name}`);
        }));

    } catch (error) {
      console.error("Error saving link share:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedSave = (newCategories: LinkCategory[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveCategories(newCategories);
    }, 1000);
  };

  // Category Operations
  const handleAddCategory = () => {
    const newCategories = [
        ...categories, 
        { name: "New Category", items: [{ label: "", value: "" }], isOwner: true, sharedWith: [] }
    ];
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  const handleCategoryNameChange = (index: number, name: string) => {
      const newCategories = [...categories];
      newCategories[index] = { ...newCategories[index], name };
      setCategories(newCategories);
      debouncedSave(newCategories);
  };

  const handleDeleteCategory = (index: number) => {
      const catToDelete = categories[index];
      if (catToDelete.isOwner === false) {
          // Shared category - leave directly
          handleLeaveCategory(catToDelete);
          return;
      }

      let newCategories = categories.filter((_, i) => i !== index);
      if (newCategories.length === 0) {
          newCategories = [{ name: "Default", items: [{ label: "", value: "" }], isOwner: true }];
      }
      setCategories(newCategories);
      saveCategories(newCategories);
  };

  // Item Operations
  const handleAddItem = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: [...newCategories[categoryIndex].items, { label: "", value: "" }]
    };
    setCategories(newCategories);
    saveCategories(newCategories); 
  };

  const handleItemChange = (categoryIndex: number, itemIndex: number, field: 'label' | 'value', val: string) => {
    const newCategories = [...categories];
    const newItems = [...newCategories[categoryIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: val };
    
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems
    };
    
    setCategories(newCategories);
    debouncedSave(newCategories);
  };

  const handleDeleteItem = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    const newItems = newCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
    
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems
    };

    setCategories(newCategories);
    saveCategories(newCategories); 
  };

  const handleCopy = async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          toast.success("Copied!");
      } catch {
          toast.error("Failed to copy");
      }
  }

  const handleOpenCategoryLinks = (category: LinkCategory) => {
    const validItems = category.items.filter(item => isValidUrl(item.value));
    
    if (validItems.length === 0) {
        toast.info("No valid links to open in this category");
        return;
    }

    let blocked = false;
    validItems.forEach(item => {
        const w = window.open(item.value, '_blank');
        if (!w) blocked = true;
    });

    if (blocked) {
        toast.warning("Some tabs were blocked. Please allow pop-ups for this site.", {
            duration: 5000,
        });
    }
  };

  // Sharing Logic
  const openShareDialog = (category: LinkCategory) => {
      setSelectedCategory(category);
      setShareUsername("");
      setShareDialogOpen(true);
  };

  const handleAddUser = async () => {
      if (!shareUsername || !selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/link-share/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'add',
                  username: shareUsername
              })
          });
          const data = await res.json();
          if (res.ok) {
              toast.success("User added successfully");
              setShareUsername("");
              // Update local state
              // We need to refetch to get the correct user ID/details or just rely on next refresh?
              // Ideally update local state to show immediately. 
              // But we don't have the user ID from just username without response data returning it.
              // Let's just reload categories or wait. 
              // Better: re-fetch categories to update UI.
              const fetchRes = await fetch("/api/link-share?t=" + Date.now());
              if(fetchRes.ok) {
                   const d = await fetchRes.json();
                   setCategories(d.data.categories);
                   // Update selected category ref
                   const updatedCat = d.data.categories.find((c: any) => c._id === selectedCategory._id);
                   if (updatedCat) setSelectedCategory(updatedCat);
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
      if (!selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/link-share/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'remove',
                  username: username
              })
          });
          if (res.ok) {
              toast.success("User removed");
               // Update local state
               const newSharedWith = (selectedCategory.sharedWith || []).filter(u => u.username !== username);
               const newCategory = { ...selectedCategory, sharedWith: newSharedWith };
               
               // Update in categories list
               setCategories(categories.map(c => c._id === selectedCategory._id ? newCategory : c));
               setSelectedCategory(newCategory);
          } else {
              toast.error("Failed to remove user");
          }
      } catch (error) {
          toast.error("Error removing user");
      } finally {
          setIsSharing(false);
      }
  };

  const handleLeaveCategory = async (category: LinkCategory) => {
      try {
          const res = await fetch("/api/link-share/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: category._id,
                  ownerId: category.ownerId,
                  action: 'leave'
              })
          });
          if (res.ok) {
              toast.success("Left category");
              setCategories(categories.filter(c => c !== category));
              setShareDialogOpen(false);
          } else {
              toast.error("Failed to leave category");
          }
      } catch (error) {
          toast.error("Error leaving category");
      }
  };

  const handlePublicToggle = async () => {
      if (!selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/link-share/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'public_toggle'
              })
          });
          const data = await res.json();
          if (res.ok) {
              const newCategory = { 
                  ...selectedCategory, 
                  isPublic: data.data.isPublic, 
                  publicToken: data.data.publicToken 
              };
               
               setCategories(categories.map(c => c._id === selectedCategory._id ? newCategory : c));
               setSelectedCategory(newCategory);
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

  return (
    <div className="flex flex-col h-full gap-6 w-full pb-10">
        <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
            Share links or short text between devices.
            </p>
            {isSaving ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
            ) : (
                <span className="text-xs text-muted-foreground">Saved</span>
            )}
        </div>

        <div className="flex flex-col gap-8">
            {filteredCategories.map((category, catIndex) => {
                const originalIndex = categories.findIndex(c => c === category);
                const isOwner = category.isOwner !== false;
                const isShared = !isOwner;

                return (
                <div key={category._id || catIndex} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 group/cat">
                        <Input
                            value={category.name}
                            onChange={(e) => handleCategoryNameChange(originalIndex, e.target.value)}
                            className={`font-semibold text-lg h-auto py-1 px-2 border-transparent hover:border-input focus:border-input bg-transparent w-auto min-w-[150px] ${isPrivacyMode ? "blur-sm group-hover/cat:blur-none transition-all duration-300" : ""}`}
                            placeholder="Category Name"
                        />
                        
                        {isShared && (
                             <Badge variant="secondary" className={`text-xs gap-1 ${isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : ""}`}>
                                <Shield className="h-3 w-3" />
                                Shared by {category.ownerUsername}
                             </Badge>
                        )}

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                            onClick={() => handleOpenCategoryLinks(category)} 
                            title="Open All Links in Category"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>

                        {/* Share Button */}
                        {isOwner && (
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-blue-500 opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                                onClick={() => openShareDialog(category)}
                                title="Share Category"
                            >
                                <Users className="h-4 w-4" />
                            </Button>
                        )}

                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                            onClick={() => handleDeleteCategory(originalIndex)} 
                            title={isOwner ? "Delete Category" : "Leave Category"}
                        >
                            {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className={`flex flex-col gap-2 pl-4 border-l-2 ${isShared ? 'border-blue-500/30' : 'border-muted'}`}>
                        {category.items.map((item, filteredItemIndex) => {
                            // Map back to original item index
                            // Safety check: category might be a filtered object, but we need to find it in the main 'categories' state
                            const originalCategoryIndex = categories.findIndex(c => c._id === category._id || c === category);
                            
                            // If category not found (shouldn't happen often but safety first), use the current category object
                            const originalCategory = originalCategoryIndex !== -1 ? categories[originalCategoryIndex] : category;
                            
                            // Find item index safely
                            const originalItemIndex = originalCategory.items ? originalCategory.items.findIndex(i => i === item) : -1;

    // Fallback if not found (e.g. new item not yet saved/synced with ID)
    // This prevents the crash if originalCategory.items is somehow undefined or item isn't found
    if (!originalCategory || !originalCategory.items || originalItemIndex === -1) {
        // If we can't find the original index, we can't edit it reliably. 
        // Rendering it read-only or just returning null might be safer, but let's try to render
        // and rely on filteredItemIndex if absolutely necessary, though editing might be glitchy.
        // Better to just return what we have for display.
    }

                            const isUrl = isValidUrl(item.value);
                            return (
                                <div key={item._id || filteredItemIndex} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center group p-3 sm:p-0 border sm:border-0 rounded-lg bg-muted/10 sm:bg-transparent w-full">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/20 cursor-grab active:cursor-grabbing hidden sm:block opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                                    
                                    <Input
                                        placeholder="Label"
                                        value={item.label}
                                        onChange={(e) => {
                                            if (originalCategoryIndex !== -1 && originalItemIndex !== -1) {
                                                handleItemChange(originalCategoryIndex, originalItemIndex, 'label', e.target.value)
                                            }
                                        }}
                                        className={`w-full sm:w-1/4 sm:min-w-[100px] ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}
                                    />
                                    <div className="flex gap-2 w-full sm:flex-1">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Paste link or text..."
                                                value={item.value}
                                                onChange={(e) => {
                                                    if (originalCategoryIndex !== -1 && originalItemIndex !== -1) {
                                                        handleItemChange(originalCategoryIndex, originalItemIndex, 'value', e.target.value)
                                                    }
                                                }}
                                                className={`flex-1 font-mono text-sm ${isUrl ? "text-blue-500 underline decoration-blue-500/30" : ""} ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}
                                            />
                                        </div>
                                        
                                        <div className="flex gap-1 shrink-0">
                                            {isUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => window.open(item.value, '_blank')}
                                                    title="Open Link"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(item.value)} title="Copy Value">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" 
                                                onClick={() => {
                                                    if (originalCategoryIndex !== -1 && originalItemIndex !== -1) {
                                                        handleDeleteItem(originalCategoryIndex, originalItemIndex)
                                                    }
                                                }} 
                                                title="Delete Row"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                         <Button variant="ghost" size="sm" onClick={() => {
                             const originalCategoryIndex = categories.findIndex(c => c._id === category._id || c === category);
                             if (originalCategoryIndex !== -1) handleAddItem(originalCategoryIndex);
                         }} className="self-start mt-1 text-muted-foreground hover:text-foreground">
                            <Plus className="h-3 w-3 mr-2" /> Add Row
                        </Button>
                    </div>
                </div>
                );
            })}
        </div>

        <div className="border-t pt-4 mt-4 pb-8">
            <Button variant="outline" onClick={handleAddCategory} className="w-full sm:w-auto">
                <FolderPlus className="h-4 w-4 mr-2" /> Add Category
            </Button>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share "{selectedCategory?.name}"</DialogTitle>
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
                                        Anyone with the link can view this category.
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant={selectedCategory?.isPublic ? "destructive" : "default"} 
                                size="sm" 
                                onClick={handlePublicToggle}
                                disabled={isSharing}
                            >
                                {selectedCategory?.isPublic ? "Disable" : "Enable"}
                            </Button>
                        </div>

                        {selectedCategory?.isPublic && selectedCategory.publicToken && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input 
                                    readOnly 
                                    value={`${window.location.origin}/public/link/${selectedCategory.publicToken}`}
                                    className="text-xs font-mono h-8"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/public/link/${selectedCategory.publicToken}`);
                                        toast.success("Link copied!");
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => window.open(`${window.location.origin}/public/link/${selectedCategory.publicToken}`, '_blank')}
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
                        {selectedCategory?.sharedWith && selectedCategory.sharedWith.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {selectedCategory.sharedWith.map((user) => (
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
