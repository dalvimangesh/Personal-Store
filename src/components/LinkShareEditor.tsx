import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, GripVertical, Copy } from "lucide-react";

interface LinkItem {
  _id?: string;
  label: string;
  value: string;
}

export function LinkShareEditor() {
  const [items, setItems] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/link-share");
        const data = await res.json();
        if (res.ok) {
          // Ensure at least one empty row if empty
          setItems(data.data.items.length ? data.data.items : [{ label: "", value: "" }]);
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

  const saveItems = async (newItems: LinkItem[]) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/link-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      
      if (!res.ok) throw new Error("Failed to save");
    } catch (error) {
      console.error("Error saving link share:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedSave = (newItems: LinkItem[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveItems(newItems);
    }, 1000);
  };

  const handleItemChange = (index: number, field: 'label' | 'value', val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    setItems(newItems);
    debouncedSave(newItems);
  };

  const handleAddItem = () => {
    const newItems = [...items, { label: "", value: "" }];
    setItems(newItems);
    saveItems(newItems); // Immediate save for structural changes
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // If we deleted the last one, add an empty one? Or allow empty list. Let's allow empty.
    setItems(newItems);
    saveItems(newItems); // Immediate save
  };

  const handleCopy = async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          toast.success("Copied!");
      } catch (e) {
          toast.error("Failed to copy");
      }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto w-full">
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

        <div className="flex flex-col gap-2">
            {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center group p-3 sm:p-0 border sm:border-0 rounded-lg bg-muted/10 sm:bg-transparent">
                    {/* Optional drag handle placeholder or just visual */}
                    <GripVertical className="h-4 w-4 text-muted-foreground/20 cursor-grab active:cursor-grabbing hidden sm:block" />
                    
                    <Input
                        placeholder="Label (Optional)"
                        value={item.label}
                        onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                        className="w-full sm:w-1/4 sm:min-w-[100px]"
                    />
                    <div className="flex gap-2 w-full sm:flex-1">
                        <Input
                            placeholder="Paste link or text here..."
                            value={item.value}
                            onChange={(e) => handleItemChange(index, 'value', e.target.value)}
                            className="flex-1 font-mono text-sm"
                        />
                        <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(item.value)} title="Copy Value">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(index)} title="Delete Row">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <Button variant="outline" onClick={handleAddItem} className="self-start mt-2">
            <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
    </div>
  );
}

