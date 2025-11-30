"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Copy, RefreshCw, Inbox, ExternalLink, Search, User as UserIcon, Clock, MessageSquare, Mail, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drop } from "@/types";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DropzoneManager({ searchQuery }: { searchQuery: string }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const selectedDrop = drops.find((d) => d.id === selectedDropId);

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

  const fetchDrops = async () => {
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
  };

  useEffect(() => {
    fetchDrops();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/drop/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrops((prev) => prev.filter((d) => d.id !== id));
        if (selectedDropId === id) {
            setSelectedDropId(null);
        }
        toast.success("Drop deleted");
      } else {
        toast.error("Failed to delete drop");
      }
    } catch (error) {
      toast.error("Error deleting drop");
    }
  };

  const copyLink = () => {
    if (!userId) return;
    const link = `${window.location.origin}/drop/${userId}`;
    navigator.clipboard.writeText(link);
    toast.success("Drop link copied!");
  };

  const filteredDrops = drops.filter(drop => 
    drop.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (drop.sender && drop.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar - Hidden on mobile when viewing a message details */}
      <div className={`flex-none p-3 md:p-4 border-b flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-card ${selectedDropId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Inbox className="h-5 w-5 text-primary" />
                </div>
            <div>
                <h2 className="text-lg font-semibold tracking-tight leading-none">Inbox</h2>
            </div>
            </div>
            <div className="md:hidden flex items-center gap-1">
                 <Button variant="ghost" size="icon" onClick={fetchDrops} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
            <Button className="hidden md:flex" variant="ghost" size="icon" onClick={fetchDrops} disabled={loading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" className="h-9 px-3 shrink-0" onClick={generateToken}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Link</span>
                <span className="sm:hidden">New</span>
            </Button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Drop List */}
        <div className={`w-full md:w-[350px] lg:w-[400px] border-r bg-muted/10 flex flex-col md:flex z-10 bg-background md:bg-transparent ${selectedDropId ? 'hidden' : 'flex'}`}>
            {loading ? (
                 <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                 </div>
            ) : filteredDrops.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Inbox className="h-12 w-12 mb-4 opacity-20" />
                    <p>No messages found</p>
                </div>
            ) : (
                <ScrollArea className="flex-1 h-full">
                    <div className="flex flex-col pb-20 md:pb-0">
                        {filteredDrops.map((drop) => (
                            <button
                                key={drop.id}
                                onClick={() => setSelectedDropId(drop.id)}
                                className={`flex flex-col gap-1 p-4 text-left border-b active:bg-muted/50 md:hover:bg-muted/50 transition-colors ${
                                    selectedDropId === drop.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-1">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                        {drop.sender ? (
                                            <span className="flex items-center gap-1 text-primary">
                                                <UserIcon className="h-3 w-3" /> {drop.sender}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3" /> Anonymous</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {new Date(drop.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                                    {drop.content}
                                </p>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>

        {/* Right Side - Detail View - Full screen on mobile */}
        <div className={`flex-1 flex flex-col bg-background h-full w-full md:flex z-20 md:z-auto ${!selectedDropId ? 'hidden' : 'flex'}`}>
            {selectedDrop ? (
                <>
                    {/* Message Header Mobile/Desktop */}
                    <div className="flex-none p-4 border-b bg-card">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden -ml-2 shrink-0"
                                    onClick={() => setSelectedDropId(null)}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <UserIcon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">
                                            {selectedDrop.sender || "Anonymous User"}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(selectedDrop.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 md:flex-none"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedDrop.content);
                                        toast.success("Copied");
                                    }}
                                >
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 md:flex-none"
                                    onClick={() => handleDelete(selectedDrop.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 overflow-hidden p-4 md:p-6 bg-muted/5">
                        <Card className="h-full shadow-sm border-muted">
                            <CardContent className="p-0 h-full">
                                <HighlightedTextarea
                                    value={selectedDrop.content}
                                    readOnly
                                    className="min-h-full w-full resize-none border-none shadow-none focus-visible:ring-0 p-4 md:p-6 font-mono text-sm leading-relaxed bg-transparent"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/5">
                    <div className="max-w-sm text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <Mail className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Select a message</h3>
                        <p className="text-sm">
                            Choose a message from the list on the left to view its contents details.
                        </p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
