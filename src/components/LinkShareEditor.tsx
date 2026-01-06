import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, GripVertical, Copy, ExternalLink, FolderPlus, Users, UserMinus, LogOut, Shield, UserPlus, Globe, Eye, EyeOff } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder } from "lucide-react";

interface LinkItem {
  _id?: string;
  label: string;
  value: string;
}

interface SharedUser {
    userId: string;
    username: string;
}

interface LinkFolder {
  _id?: string;
  name: string;
}

interface LinkCategory {
  _id?: string;
  name: string;
  items: LinkItem[];
  isHidden?: boolean;
  isOwner?: boolean;
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: SharedUser[];
  isPublic?: boolean;
  publicToken?: string;
  folderId?: string;
}

const isValidUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkShareEditor({ searchQuery = "", isPrivacyMode = false, showHiddenMaster = false }: { searchQuery?: string; isPrivacyMode?: boolean; showHiddenMaster?: boolean }) {
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [folders, setFolders] = useState<LinkFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search effect to switch to 'all' folder
  useEffect(() => {
    if (searchQuery) {
        setActiveFolderId("all");
    }
  }, [searchQuery]);

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LinkCategory | null>(null);
  const [shareUsername, setShareUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/link-share");
      const data = await res.json();
      if (res.ok) {
          let fetchedCategories = data.data.categories || [];
          let fetchedFolders = data.data.folders || [];
          
          if (!fetchedCategories.length && data.data.items) {
               fetchedCategories = [{ name: "Default", items: data.data.items, isOwner: true, folderId: null }];
          }
          if (!fetchedCategories.length) {
              fetchedCategories = [{ name: "Default", items: [{ label: "", value: "" }], isOwner: true, folderId: null }];
          }

          setCategories(fetchedCategories);
          setFolders(fetchedFolders);
      } else {
        toast.error("Failed to load Link Share");
      }
    } catch (error) {
      console.error("Error fetching link share:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredCategories = useMemo(() => {
    return categories.map(cat => {
      // Guard clause for missing or malformed categories
      if (!cat || !cat.items) return null;

      // Filter by master hidden toggle
      if (!showHiddenMaster && cat.isHidden) return null;

      // Filter by folder
      if (activeFolderId !== "all") {
          if (activeFolderId === "other") {
              if (cat.folderId) return null;
          } else {
              if (cat.folderId !== activeFolderId) return null;
          }
      }

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
  }, [categories, searchQuery, showHiddenMaster, activeFolderId]);

  const saveData = useCallback(async (newCategories?: LinkCategory[], newFolders?: LinkFolder[]) => {
    setIsSaving(true);
    try {
        const categoriesToSave = newCategories || categories;
        const foldersToSave = newFolders || folders;

        // Split categories into owned and shared
        const ownedCategories = categoriesToSave.filter(c => c.isOwner !== false);
        const sharedCategories = categoriesToSave.filter(c => c.isOwner === false);

        // 1. Save owned categories and folders
        const res = await fetch("/api/link-share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                categories: ownedCategories,
                folders: foldersToSave
            }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save data");

        // Update state with returned IDs for owned categories and folders
        if (data.data) {
            if (data.data.categories) {
                const savedOwned = data.data.categories;
                setCategories(prevCats => {
                    let savedIndex = 0;
                    return prevCats.map(cat => {
                        if (cat.isOwner !== false) {
                            if (savedIndex < savedOwned.length) {
                                const savedCat = savedOwned[savedIndex];
                                savedIndex++;
                                return {
                                    ...cat,
                                    _id: savedCat._id,
                                    publicToken: savedCat.publicToken || cat.publicToken,
                                    folderId: savedCat.folderId || cat.folderId,
                                };
                            }
                        }
                        return cat;
                    });
                });
            }
            if (data.data.folders) {
                // Trust the server's folder list to avoid duplicate keys/IDs
                // But for the active folder, if we are currently editing it, preserve the local name
                const savedFolders = data.data.folders;
                setFolders(prevFolders => {
                    return savedFolders.map((sf: any) => {
                        const pf = prevFolders.find(p => p._id === sf._id);
                        if (pf && pf._id === activeFolderId) {
                            return { ...sf, name: pf.name };
                        }
                        return sf;
                    });
                });
            }
        }

        // 2. Update shared categories individually
        await Promise.all(sharedCategories.map(async (cat) => {
            const updateData = {
                categoryId: cat._id,
                ownerId: cat.ownerId,
                category: {
                    name: cat.name,
                    items: cat.items,
                    isHidden: cat.isHidden
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
  }, [categories, folders]);

  const debouncedSave = useCallback((newCategories?: LinkCategory[], newFolders?: LinkFolder[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveData(newCategories, newFolders);
    }, 1000);
  }, [saveData]);

  // Folder Operations
  const handleAddFolder = useCallback(() => {
    setFolders(prev => {
        const newFolders = [...prev, { name: "New Folder" }];
        saveData(categories, newFolders);
        return newFolders;
    });
  }, [categories, saveData]);

  const handleFolderRename = useCallback((folderId: string | undefined, index: number, newName: string) => {
    setFolders(prev => {
        let newFolders;
        if (folderId) {
            newFolders = prev.map(f => f._id === folderId ? { ...f, name: newName } : f);
        } else {
            newFolders = prev.map((f, i) => i === index ? { ...f, name: newName } : f);
        }
        debouncedSave(categories, newFolders);
        return newFolders;
    });
  }, [categories, debouncedSave]);

  const handleFolderDelete = useCallback((folderId: string | undefined, index: number) => {
    // When a folder is deleted, its categories go to 'other' (folderId = null)
    setFolders(prev => {
        let newFolders;
        if (folderId) {
            newFolders = prev.filter(f => f._id !== folderId);
        } else {
            newFolders = prev.filter((_, i) => i !== index);
        }
        
        const newCategories = categories.map(cat => (folderId && cat.folderId === folderId) ? { ...cat, folderId: undefined } : cat);
        
        setCategories(newCategories);
        saveData(newCategories, newFolders);

        if (activeFolderId === folderId) {
            setActiveFolderId("all");
        }
        
        return newFolders;
    });
  }, [categories, activeFolderId, saveData]);

  const handleMigrateCategory = useCallback((categoryIndex: number, folderId: string | null) => {
    const newCategories = [...categories];
    newCategories[categoryIndex] = { ...newCategories[categoryIndex], folderId: folderId || undefined };
    setCategories(newCategories);
    saveData(newCategories);
  }, [categories, saveData]);

  // Category Operations
  const handleAddCategory = useCallback(() => {
    const newCategories = [
        ...categories, 
        { 
            name: "New Category", 
            items: [{ label: "", value: "" }], 
            isOwner: true, 
            sharedWith: [],
            folderId: activeFolderId === "all" || activeFolderId === "other" ? undefined : activeFolderId
        }
    ];
    setCategories(newCategories);
    saveData(newCategories);
  }, [categories, activeFolderId, saveData]);

  const handleCategoryNameChange = useCallback((index: number, name: string) => {
      const newCategories = [...categories];
      newCategories[index] = { ...newCategories[index], name };
      setCategories(newCategories);
      debouncedSave(newCategories);
  }, [categories, debouncedSave]);

  const handleToggleHideCategory = useCallback((index: number) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], isHidden: !newCategories[index].isHidden };
    setCategories(newCategories);
    saveData(newCategories); // Immediate save for visibility
    toast.success(newCategories[index].isHidden ? "Category hidden" : "Category visible");
  }, [categories, saveData]);

  const handleLeaveCategory = useCallback(async (category: LinkCategory) => {
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
              setCategories(prev => prev.filter(c => c !== category));
              setShareDialogOpen(false);
          } else {
              toast.error("Failed to leave category");
          }
      } catch {
          toast.error("Error leaving category");
      }
  }, []);

  const handleDeleteCategory = useCallback((index: number) => {
      const catToDelete = categories[index];
      const isOwner = catToDelete.isOwner !== false;

      if (!window.confirm(`Are you sure you want to ${isOwner ? 'delete' : 'leave'} category "${catToDelete.name}"?`)) {
          return;
      }

      if (!isOwner) {
          // Shared category - leave directly
          handleLeaveCategory(catToDelete);
          return;
      }

      let newCategories = categories.filter((_, i) => i !== index);
      if (newCategories.length === 0) {
          newCategories = [{ name: "Default", items: [{ label: "", value: "" }], isOwner: true }];
      }
      setCategories(newCategories);
      saveData(newCategories);
  }, [categories, handleLeaveCategory, saveData]);

  // Item Operations
  const handleAddItem = useCallback((categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: [...newCategories[categoryIndex].items, { label: "", value: "" }]
    };
    setCategories(newCategories);
    saveData(newCategories); 
  }, [categories, saveData]);

  const handleItemChange = useCallback((categoryIndex: number, itemIndex: number, field: 'label' | 'value', val: string) => {
    const newCategories = [...categories];
    const newItems = [...newCategories[categoryIndex].items];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: val };
    
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems
    };
    
    setCategories(newCategories);
    debouncedSave(newCategories);
  }, [categories, debouncedSave]);

  const handleDeleteItem = useCallback((categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    const newItems = newCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
    
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newItems
    };

    setCategories(newCategories);
    saveData(newCategories); 
  }, [categories, saveData]);

  const handleCopy = useCallback(async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          toast.success("Copied!");
      } catch {
          toast.error("Failed to copy");
      }
  }, []);

  const handleOpenCategoryLinks = useCallback((category: LinkCategory) => {
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
  }, []);

  // Sharing Logic
  const openShareDialog = useCallback((category: LinkCategory) => {
      if (!category._id) {
          toast.warning("Please wait for the category to be saved before sharing.");
          return;
      }
      setSelectedCategory(category);
      setShareUsername("");
      setShareDialogOpen(true);
  }, []);

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
                   const updatedCat = d.data.categories.find((c: LinkCategory) => c._id === selectedCategory._id);
                   if (updatedCat) setSelectedCategory(updatedCat);
              }
          } else {
              toast.error(data.error || "Failed to add user");
          }
      } catch {
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
      } catch {
          toast.error("Error removing user");
      } finally {
          setIsSharing(false);
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
      } catch {
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
        <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b">
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

            {/* Folder Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide">
                <Button 
                    variant={activeFolderId === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveFolderId("all")}
                    className="shrink-0 transition-none"
                >
                    All
                </Button>
                {folders.map((folder, index) => (
                    <div 
                        key={folder._id ? `folder-id-${folder._id}` : `folder-idx-${index}`} 
                        className={`inline-flex items-center shrink-0 group/folder h-8 pl-3 pr-8 rounded-md border text-sm font-medium transition-none cursor-pointer relative shadow-xs ${
                            activeFolderId === folder._id 
                                ? "bg-primary text-primary-foreground border-primary shadow-none" 
                                : "bg-background hover:bg-accent hover:text-accent-foreground border-input"
                        }`}
                        onClick={() => setActiveFolderId(folder._id!)}
                    >
                        <div className="relative flex items-center min-w-[30px] h-full">
                            {/* Hidden span to measure text width accurately */}
                            <span className="invisible whitespace-pre text-sm font-medium px-1 shadow-none" aria-hidden="true">
                                {folder.name || "Folder Name"}
                            </span>
                            <Input
                                value={folder.name}
                                onChange={(e) => handleFolderRename(folder._id, index, e.target.value)}
                                onFocus={() => setActiveFolderId(folder._id!)}
                                className={`absolute inset-0 h-full w-full px-1 py-0 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium shadow-none transition-none ${
                                    activeFolderId === folder._id 
                                        ? "text-primary-foreground placeholder:text-primary-foreground/50" 
                                        : "text-foreground"
                                }`}
                                placeholder="Folder Name"
                            />
                        </div>
                        
                        <div className="absolute right-1 flex items-center opacity-0 group-hover/folder:opacity-100 transition-none">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-7 w-7 shrink-0 transition-none ${
                                    activeFolderId === folder._id 
                                        ? "hover:bg-primary-foreground/20 text-primary-foreground" 
                                        : "hover:bg-muted-foreground/10 text-muted-foreground hover:text-destructive"
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete folder "${folder.name}"? Categories will be moved to "Other".`)) {
                                        handleFolderDelete(folder._id, index);
                                    }
                                }}
                                title="Delete folder"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
                <Button 
                    variant={activeFolderId === "other" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveFolderId("other")}
                    className="shrink-0 transition-none"
                >
                    Other
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddFolder}
                    className="shrink-0 border-dashed border-2 transition-none"
                >
                    <Plus className="h-4 w-4 mr-1" /> New Folder
                </Button>
            </div>
        </div>

        <div className="flex flex-col gap-8">
            {filteredCategories.map((category, catIndex) => {
                const originalIndex = categories.findIndex(c => c === category);

                return (
                    <CategorySection 
                        key={category._id || `cat-${catIndex}`}
                        category={category}
                        originalIndex={originalIndex}
                        isPrivacyMode={isPrivacyMode}
                        handleCategoryNameChange={handleCategoryNameChange}
                        handleOpenCategoryLinks={handleOpenCategoryLinks}
                        handleToggleHideCategory={handleToggleHideCategory}
                        openShareDialog={openShareDialog}
                        handleDeleteCategory={handleDeleteCategory}
                        handleAddItem={handleAddItem}
                        handleItemChange={handleItemChange}
                        handleDeleteItem={handleDeleteItem}
                        handleCopy={handleCopy}
                        categories={categories}
                        folders={folders}
                        handleMigrateCategory={handleMigrateCategory}
                    />
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
                    <DialogTitle>Share &quot;{selectedCategory?.name}&quot;</DialogTitle>
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

interface CategorySectionProps {
    category: LinkCategory;
    originalIndex: number;
    isPrivacyMode: boolean;
    handleCategoryNameChange: (index: number, name: string) => void;
    handleOpenCategoryLinks: (category: LinkCategory) => void;
    handleToggleHideCategory: (index: number) => void;
    openShareDialog: (category: LinkCategory) => void;
    handleDeleteCategory: (index: number) => void;
    handleAddItem: (categoryIndex: number) => void;
    handleItemChange: (categoryIndex: number, itemIndex: number, field: 'label' | 'value', val: string) => void;
    handleDeleteItem: (categoryIndex: number, itemIndex: number) => void;
    handleCopy: (text: string) => void;
    categories: LinkCategory[];
    folders: LinkFolder[];
    handleMigrateCategory: (index: number, folderId: string | null) => void;
}

const CategorySection = memo(function CategorySection({
    category,
    originalIndex,
    isPrivacyMode,
    handleCategoryNameChange,
    handleOpenCategoryLinks,
    handleToggleHideCategory,
    openShareDialog,
    handleDeleteCategory,
    handleAddItem,
    handleItemChange,
    handleDeleteItem,
    handleCopy,
    categories,
    folders,
    handleMigrateCategory
}: CategorySectionProps) {
    const isOwner = category.isOwner !== false;
    const isShared = !isOwner;
    const currentFolder = folders.find(f => f._id === category.folderId);

    return (
        <div className="flex flex-col gap-2">
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

                {isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-1 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity"
                            >
                                <Folder className="h-3 w-3" />
                                <span className="text-xs">{currentFolder ? currentFolder.name : "Other"}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleMigrateCategory(originalIndex, null)}>
                                Other (None)
                            </DropdownMenuItem>
                            {folders.map((folder, index) => (
                                <DropdownMenuItem 
                                    key={folder._id ? `migrate-id-${folder._id}` : `migrate-idx-${index}`} 
                                    onClick={() => handleMigrateCategory(originalIndex, folder._id!)}
                                >
                                    {folder.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                        <>
                        <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-blue-500 opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                        onClick={() => handleToggleHideCategory(originalIndex)}
                        title={category.isHidden ? "Show Category" : "Hide Category"}
                    >
                        {category.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>

                        <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-blue-500 opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                        onClick={() => openShareDialog(category)}
                        title="Share Category"
                    >
                        <Users className="h-4 w-4" />
                    </Button>
                    </>
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
                <Button variant="ghost" size="sm" onClick={() => {
                        const originalCategoryIndex = categories.findIndex((c: LinkCategory) => c._id === category._id || c === category);
                        if (originalCategoryIndex !== -1) handleAddItem(originalCategoryIndex);
                }} className="self-start mb-1 text-muted-foreground hover:text-foreground">
                    <Plus className="h-3 w-3 mr-2" /> Add Row
                </Button>

                {category.items.map((item: LinkItem, filteredItemIndex: number) => {
                    const originalCategoryIndex = categories.findIndex((c: LinkCategory) => c._id === category._id || c === category);
                    const originalCategory = originalCategoryIndex !== -1 ? categories[originalCategoryIndex] : category;
                    const originalItemIndex = originalCategory.items ? originalCategory.items.findIndex((i: LinkItem) => i === item) : -1;

                    return (
                        <LinkItemRow 
                            key={item._id || `item-${filteredItemIndex}`}
                            item={item}
                            originalCategoryIndex={originalCategoryIndex}
                            originalItemIndex={originalItemIndex}
                            isPrivacyMode={isPrivacyMode}
                            handleItemChange={handleItemChange}
                            handleDeleteItem={handleDeleteItem}
                            handleCopy={handleCopy}
                        />
                    );
                })}
            </div>
        </div>
    );
});

interface LinkItemRowProps {
    item: LinkItem;
    originalCategoryIndex: number;
    originalItemIndex: number;
    isPrivacyMode: boolean;
    handleItemChange: (categoryIndex: number, itemIndex: number, field: 'label' | 'value', val: string) => void;
    handleDeleteItem: (categoryIndex: number, itemIndex: number) => void;
    handleCopy: (text: string) => void;
}

const LinkItemRow = memo(function LinkItemRow({
    item,
    originalCategoryIndex,
    originalItemIndex,
    isPrivacyMode,
    handleItemChange,
    handleDeleteItem,
    handleCopy
}: LinkItemRowProps) {
    const isUrl = isValidUrl(item.value);

    return (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center group p-3 sm:p-0 border sm:border-0 rounded-lg bg-muted/10 sm:bg-transparent w-full">
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
});
