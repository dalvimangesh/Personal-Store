"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { toast } from "sonner";
import { Trash2, Copy, RefreshCw, Inbox, Plus, User as UserIcon, Clock, ChevronRight, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drop } from "@/types";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function MobileDropStore() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const fetchDrops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drop");
      const data = await res.json();
      if (data.success) {
        setDrops(data.data);
        setUserId(data.userId);
      } else {
        toast.error(data.error || "Failed to load drops");
      }
    } catch (error) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const generateToken = async () => {
    try {
        const res = await fetch("/api/drop/token", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            const link = `${window.location.origin}/drop/${data.token}`;
            setGeneratedLink(link);
            navigator.clipboard.writeText(link);
            toast.success("One-time link copied to clipboard!");
        } else {
            toast.error("Failed to generate link");
        }
    } catch (e) {
        toast.error("Error generating link");
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/drop/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrops((prev) => prev.filter((d) => d.id !== id));
        setSelectedDrop(null);
        toast.success("Drop deleted");
      } else {
        toast.error("Failed to delete drop");
      }
    } catch (error) {
      toast.error("Error deleting drop");
    }
  }, []);

  const filteredDrops = drops.filter(drop => 
    drop.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (drop.sender && drop.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedDrop) {
      return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDrop(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-sm truncate">{selectedDrop.sender || "Anonymous"}</h2>
                    <p className="text-[10px] text-muted-foreground">
                        {new Date(selectedDrop.createdAt).toLocaleString()}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedDrop.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
                <Card className="min-h-[50vh] p-4 shadow-sm border-muted font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {selectedDrop.content}
                </Card>
                
                <div className="mt-4 flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={() => {
                        navigator.clipboard.writeText(selectedDrop.content);
                        toast.success("Copied");
                    }}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Content
                    </Button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-9" 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" variant="ghost" onClick={fetchDrops} className="h-9 w-9 shrink-0">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
        </Button>
        <Button size="icon" onClick={generateToken} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {filteredDrops.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No messages found</p>
            </div>
        )}

        {filteredDrops.map((drop) => (
            <Card 
                key={drop.id} 
                className="p-3 active:scale-[0.99] transition-transform cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedDrop(drop)}
            >
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                                {drop.sender || "Anonymous"}
                            </h3>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(drop.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted/30 p-1.5 rounded">
                            {drop.content}
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
                </div>
            </Card>
        ))}
      </div>
    </div>
  );
}
