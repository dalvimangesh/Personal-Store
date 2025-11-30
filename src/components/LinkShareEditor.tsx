import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, GripVertical, Copy, ExternalLink, FolderPlus } from "lucide-react";

interface LinkItem {
  _id?: string;
  label: string;
  value: string;
}

interface LinkCategory {
  _id?: string;
  name: string;
  items: LinkItem[];
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

  // ... fetchItems ...

  const filteredCategories = categories.map(cat => {
    const matchesCategory = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingItems = cat.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (matchesCategory) return cat; // If category matches, show all items? Or just matching items? Let's show all for now or maybe just keep original items. 
    // Actually, if category matches, we probably want to see the category, but maybe only matching items is better UX if the list is long.
    // Let's go with: if category matches, show all. If items match, show category + matching items.
    
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
            // data.data.categories should be returned by the new API
            let fetchedCategories = data.data.categories || [];
            
            // Fallback for safety if API returns weird data
            if (!fetchedCategories.length && data.data.items) {
                 fetchedCategories = [{ name: "Default", items: data.data.items }];
            }
            if (!fetchedCategories.length) {
                fetchedCategories = [{ name: "Default", items: [{ label: "", value: "" }] }];
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
      const res = await fetch("/api/link-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: newCategories }),
      });
      
      if (!res.ok) throw new Error("Failed to save");
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
        { name: "New Category", items: [{ label: "", value: "" }] }
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
      // Prevent deleting the last category if it's the only one, or just allow it and show empty state?
      // User requirement: "if any link dont have catorgy then treat them as default category."
      // If we delete all categories, we probably want to reset to a Default one.
      
      let newCategories = categories.filter((_, i) => i !== index);
      if (newCategories.length === 0) {
          newCategories = [{ name: "Default", items: [{ label: "", value: "" }] }];
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
    // Reverse iteration sometimes helps with focus management, but standard is fine.
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
                // We need to map back to the original index for editing
                const originalIndex = categories.findIndex(c => c._id === category._id || c === category); // Fallback to object reference if no ID
                
                return (
                <div key={category._id || catIndex} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 group/cat">
                        <Input
                            value={category.name}
                            onChange={(e) => handleCategoryNameChange(originalIndex, e.target.value)}
                            className={`font-semibold text-lg h-auto py-1 px-2 border-transparent hover:border-input focus:border-input bg-transparent w-auto min-w-[150px] ${isPrivacyMode ? "blur-sm group-hover/cat:blur-none transition-all duration-300" : ""}`}
                            placeholder="Category Name"
                        />
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover/cat:opacity-100 transition-opacity" 
                            onClick={() => handleOpenCategoryLinks(category)} 
                            title="Open All Links in Category"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/cat:opacity-100 transition-opacity" 
                            onClick={() => handleDeleteCategory(originalIndex)} 
                            title="Delete Category"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2 pl-4 border-l-2 border-muted">
                        {category.items.map((item, filteredItemIndex) => {
                            // Map back to original item index
                            const originalCategory = categories[originalIndex];
                            const originalItemIndex = originalCategory.items.findIndex(i => i === item); // Using object reference

                            const isUrl = isValidUrl(item.value);
                            return (
                                <div key={item._id || filteredItemIndex} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center group p-3 sm:p-0 border sm:border-0 rounded-lg bg-muted/10 sm:bg-transparent w-full">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/20 cursor-grab active:cursor-grabbing hidden sm:block" />
                                    
                                    <Input
                                        placeholder="Label"
                                        value={item.label}
                                        onChange={(e) => handleItemChange(originalIndex, originalItemIndex, 'label', e.target.value)}
                                        className={`w-full sm:w-1/4 sm:min-w-[100px] ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}
                                    />
                                    <div className="flex gap-2 w-full sm:flex-1">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Paste link or text..."
                                                value={item.value}
                                                onChange={(e) => handleItemChange(originalIndex, originalItemIndex, 'value', e.target.value)}
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
                                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(originalIndex, originalItemIndex)} title="Delete Row">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                         <Button variant="ghost" size="sm" onClick={() => handleAddItem(originalIndex)} className="self-start mt-1 text-muted-foreground hover:text-foreground">
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
    </div>
  );
}
