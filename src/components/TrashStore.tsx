import { useState, useEffect, Fragment, useMemo, useCallback, memo } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DeletedItem {
  _id: string;
  originalId: string;
  type: 'drop' | 'snippet' | 'link' | 'todo';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  createdAt: string;
}

export function TrashStore({ searchQuery = "", isPrivacyMode = false }: { searchQuery?: string; isPrivacyMode?: boolean }) {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/trash");
      const data = await res.json();
      if (res.ok) {
        setItems(data.data);
      } else {
        toast.error("Failed to load Trash");
      }
    } catch (error) {
      console.error("Error fetching trash:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
        return (
            item.content.title?.toLowerCase().includes(query) ||
            item.content.content?.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query)
        );
    });
  }, [items, searchQuery]);

  const handleDeletePermanently = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trash/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setItems(prev => prev.filter(item => item._id !== id));
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        toast.success("Item permanently deleted");
      } else {
        toast.error("Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    try {
        const res = await fetch("/api/trash", {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (res.ok) {
            setItems(prev => prev.filter(item => !selectedIds.has(item._id)));
            setSelectedIds(new Set());
            toast.success(`Permanently deleted ${selectedIds.size} items`);
        } else {
            toast.error("Failed to delete selected items");
        }
    } catch (error) {
        console.error("Error deleting items:", error);
        toast.error("Failed to delete items");
    } finally {
        setIsBulkDeleting(false);
    }
  }, [selectedIds]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredItems.map(item => item._id)));
    }
  }, [filteredItems, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        return newSelected;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Trash2 className="h-12 w-12 mb-4 opacity-20" />
        <p>Trash is empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Trash Store</h2>
            <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>
        
        <Button 
            variant="destructive" 
            size="sm" 
            disabled={selectedIds.size === 0 || isBulkDeleting}
            onClick={handleBulkDelete}
        >
            {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Selected ({selectedIds.size})
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px]">
                        <Checkbox 
                            checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Title / Label</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead className="w-[150px]">Deleted At</TableHead>
                    <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredItems.map((item) => (
                    <TrashItemRow 
                        key={item._id}
                        item={item}
                        isPrivacyMode={isPrivacyMode}
                        isSelected={selectedIds.has(item._id)}
                        isExpanded={expandedRows.has(item._id)}
                        toggleRow={toggleRow}
                        toggleSelect={toggleSelect}
                        deletingId={deletingId}
                        handleDeletePermanently={handleDeletePermanently}
                    />
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}

const TrashItemRow = memo(function TrashItemRow({ 
    item, 
    isPrivacyMode, 
    isSelected, 
    isExpanded, 
    toggleRow, 
    toggleSelect, 
    deletingId, 
    handleDeletePermanently 
}: any) {
    return (
        <Fragment>
            <TableRow 
                className={`group cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-muted/30" : ""}`} 
                onClick={() => toggleRow(item._id)}
            >
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item._id)}
                        aria-label={`Select ${item.content.title}`}
                    />
                </TableCell>
                    <TableCell>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                        {item.type}
                    </Badge>
                </TableCell>
                <TableCell className={`font-medium ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                    {item.content.title || "(No Title)"}
                </TableCell>
                <TableCell className={`max-w-[300px] truncate text-muted-foreground text-sm ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                        {item.type === 'todo' ? item.content.description : item.content.content}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        disabled={deletingId === item._id}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePermanently(item._id);
                        }}
                    >
                        {deletingId === item._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7} className="p-4">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Item Details</div>
                            <div className={`bg-background border rounded-md p-4 font-mono text-xs whitespace-pre-wrap max-h-[300px] overflow-auto shadow-inner ${isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : ""}`}>
{JSON.stringify((({ _id, userId, originalId, ...rest }) => rest)(item.content), null, 2)}
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </Fragment>
    );
});
