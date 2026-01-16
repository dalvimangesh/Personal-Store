"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, Copy, Folder, ChevronRight, ArrowLeft, Link2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkItem {
  _id?: string;
  label: string;
  value: string;
}

interface LinkCategory {
  _id?: string;
  name: string;
  items: LinkItem[];
  folderId?: string;
  isHidden?: boolean;
  isOwner?: boolean;
}

interface LinkFolder {
  _id?: string;
  name: string;
}

export function MobileLinkStore() {
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [folders, setFolders] = useState<LinkFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = root view (folders list), 'all' = all links
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/link-share");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.data.categories || []);
        setFolders(data.data.folders || []);
      }
    } catch (e) {
      toast.error("Failed to load links");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLink = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;

    let targetCatName = isNewCategory ? newCategoryName.trim() : selectedCategoryName;
    if (!targetCatName) targetCatName = "Mobile Uploads";

    let targetCategoryIndex = categories.findIndex(c => c.name === targetCatName);
    let newCategories = [...categories];

    if (targetCategoryIndex === -1) {
        // Create new category
        const newCat: LinkCategory = { 
            name: targetCatName, 
            items: [{ label: newLabel, value: newValue }],
            folderId: selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'other' ? selectedFolderId : undefined 
        };
        newCategories.push(newCat);
    } else {
        // Add to existing
        newCategories[targetCategoryIndex] = {
            ...newCategories[targetCategoryIndex],
            items: [...newCategories[targetCategoryIndex].items, { label: newLabel, value: newValue }]
        };
    }

    // Save
    try {
        const res = await fetch("/api/link-share", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                categories: newCategories.filter(c => c.isOwner !== false), // Only save owned
                folders 
            }),
        });
        if (res.ok) {
            toast.success("Link added");
            fetchData(); // Refresh to get IDs
        } else {
            toast.error("Failed to save");
        }
    } catch (e) {
        toast.error("Error saving link");
    }

    setNewLabel("");
    setNewValue("");
    setIsAddOpen(false);
    setIsNewCategory(false);
    setNewCategoryName("");
    setSelectedCategoryName("");
  };

  const filteredCategories = categories.filter(cat => {
    // Hide categories marked as hidden in mobile view
    if (cat.isHidden) return false;

    if (selectedFolderId && selectedFolderId !== 'all') {
        if (selectedFolderId === 'other') {
            if (cat.folderId) return false;
        } else {
            if (cat.folderId !== selectedFolderId) return false;
        }
    }
    
    // Search filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
            cat.name.toLowerCase().includes(q) || 
            cat.items.some(i => i.label.toLowerCase().includes(q) || i.value.toLowerCase().includes(q))
        );
    }
    
    return true;
  });

  // Get available categories for selection dialog
  const availableCategories = categories.filter(cat => {
      // If inside a specific folder, show only categories in that folder
      if (selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'other') {
          return cat.folderId === selectedFolderId;
      }
      return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-background">
          <div className="h-9 flex-1 bg-muted animate-pulse rounded-md" />
          <div className="h-9 w-9 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-orange-500" />
          <p className="text-sm font-medium">Loading links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        {selectedFolderId && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFolderId(null)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-9" 
            placeholder="Search links..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => {
            // Pre-select first category if available
            if (availableCategories.length > 0) {
                setSelectedCategoryName(availableCategories[0].name);
            }
            setIsAddOpen(true);
        }} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {!selectedFolderId && !searchQuery ? (
            // Folders View
            <div className="grid grid-cols-2 gap-3">
                <Card 
                    className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedFolderId("all")}
                >
                    <Folder className="h-8 w-8 text-blue-500 fill-blue-500/20" />
                    <span className="font-medium text-sm">All Links</span>
                </Card>
                {folders.map(folder => (
                    <Card 
                        key={folder._id} 
                        className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedFolderId(folder._id!)}
                    >
                        <Folder className="h-8 w-8 text-yellow-500 fill-yellow-500/20" />
                        <span className="font-medium text-sm truncate w-full text-center">{folder.name}</span>
                    </Card>
                ))}
                <Card 
                    className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedFolderId("other")}
                >
                    <Folder className="h-8 w-8 text-slate-500 fill-slate-500/20" />
                    <span className="font-medium text-sm">Other</span>
                </Card>
            </div>
        ) : (
            // Items List Grouped by Category
            <div className="space-y-6">
                {filteredCategories.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No links found</p>
                    </div>
                )}
                {filteredCategories.map(cat => (
                    <div key={cat._id || cat.name} className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                            {cat.name}
                        </h3>
                        <div className="bg-card border rounded-lg overflow-hidden divide-y">
                            {cat.items.map((item, i) => (
                                <div key={i} className="p-3 flex items-center gap-3 active:bg-muted/50 transition-colors">
                                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                                        <Link2 className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0" onClick={() => window.open(item.value, '_blank')}>
                                        <h4 className="font-medium text-sm truncate leading-none mb-1">{item.label}</h4>
                                        <p className="text-[10px] text-muted-foreground truncate font-mono opacity-80">{item.value}</p>
                                    </div>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            navigator.clipboard.writeText(item.value);
                                            toast.success("Copied");
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>Add Link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input 
                    placeholder="Label" 
                    value={newLabel} 
                    onChange={(e) => setNewLabel(e.target.value)}
                    autoFocus
                />
                <Input 
                    placeholder="URL or Text" 
                    value={newValue} 
                    onChange={(e) => setNewValue(e.target.value)}
                />
                
                <div className="space-y-2">
                    {!isNewCategory ? (
                        <div className="flex gap-2">
                            <Select 
                                value={selectedCategoryName} 
                                onValueChange={(val) => {
                                    if (val === "new_category_plus") {
                                        setIsNewCategory(true);
                                        setSelectedCategoryName("");
                                    } else {
                                        setSelectedCategoryName(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new_category_plus" className="text-blue-500 font-medium">
                                        + Create New Category
                                    </SelectItem>
                                    {availableCategories.map((cat) => (
                                        <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                    {availableCategories.length === 0 && (
                                        <SelectItem value="Mobile Uploads">Mobile Uploads (Default)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Input 
                                placeholder="New Category Name" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" onClick={() => setIsNewCategory(false)}>
                                <span className="text-xs">Cancel</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAddLink} className="w-full">Save Link</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
