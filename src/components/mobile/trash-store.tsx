"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, ChevronRight, ChevronDown, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DeletedItem {
  _id: string;
  type: string;
  content: any;
  createdAt: string;
}

export function MobileTrashStore() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/trash");
      const data = await res.json();
      if (res.ok) {
        setItems(data.data);
      }
    } catch (e) {
      toast.error("Failed to load trash");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
      if(!confirm("Permanently delete this item?")) return;
      try {
          const res = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
          if(res.ok) {
              setItems(prev => prev.filter(i => i._id !== id));
              toast.success("Deleted permanently");
          }
      } catch(e) {
          toast.error("Error deleting item");
      }
  };

  const filteredItems = items.filter(item => {
      if (item.content.isHidden) return false;
      const q = searchQuery.toLowerCase();
      const title = item.content.title || item.content.content || "";
      return title.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading trash...</div>;

  return (
    <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    className="pl-9 h-9" 
                    placeholder="Search trash..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button variant="ghost" size="icon" onClick={fetchItems} className="h-9 w-9 shrink-0">
                <RefreshCw className="h-5 w-5" />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
            {filteredItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Trash is empty</p>
                </div>
            )}
            {filteredItems.map(item => {
                const isExpanded = expandedId === item._id;
                return (
                    <Card key={item._id} className="p-3 bg-card shadow-sm border active:scale-[0.99] transition-transform">
                        <div className="flex flex-col gap-2" onClick={() => setExpandedId(isExpanded ? null : item._id)}>
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] uppercase">{item.type}</Badge>
                                <span className="text-[10px] text-muted-foreground">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="font-medium text-sm truncate flex-1">
                                    {item.content.title || item.content.content || "(No Title)"}
                                </h4>
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            
                            {isExpanded && (
                                <div className="mt-2 pt-2 border-t space-y-3">
                                    <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(item.content, null, 2)}
                                    </pre>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        className="w-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item._id);
                                        }}
                                    >
                                        Delete Permanently
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    </div>
  );
}
