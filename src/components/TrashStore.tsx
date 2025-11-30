import { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
        item.content.title?.toLowerCase().includes(query) ||
        item.content.content?.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
    );
  });

  const fetchItems = async () => {
    try {
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
  };

  const handleDeletePermanently = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trash/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setItems(prev => prev.filter(item => item._id !== id));
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
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
        newExpanded.delete(id);
    } else {
        newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

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
        <h2 className="text-lg font-semibold">Trash Store</h2>
        <span className="text-sm text-muted-foreground">{items.length} items</span>
      </div>
      
      <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Title / Label</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead className="w-[150px]">Deleted At</TableHead>
                    <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredItems.map((item) => (
                    <Fragment key={item._id}>
                    <TableRow className="group cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(item._id)}>
                         <TableCell>
                            {expandedRows.has(item._id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        disabled={deletingId === item._id}
                                    >
                                        {deletingId === item._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Delete Permanently?</DialogTitle>
                                        <DialogDescription>
                                            This action cannot be undone. This will permanently remove this item.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button 
                                            variant="destructive"
                                            onClick={() => handleDeletePermanently(item._id)}
                                        >
                                            Delete Permanently
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                    </TableRow>
                    {expandedRows.has(item._id) && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={6} className="p-4">
                                <div className="flex flex-col gap-2">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Filtered Content Data</div>
                                    <div className={`bg-background border rounded-md p-4 font-mono text-xs whitespace-pre-wrap max-h-[300px] overflow-auto shadow-inner ${isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : ""}`}>
{JSON.stringify({
    type: item.type,
    title: item.content.title,
    content: item.type === 'todo' ? item.content.description : item.content.content,
    priority: item.type === 'todo' ? item.content.priority : undefined,
    deadline: item.type === 'todo' ? item.content.deadline : undefined
}, null, 2)}
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
