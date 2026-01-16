"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Layout, ArrowLeft, MoreVertical, Edit2, Trash2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Board {
  id: string;
  title: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
}

interface CardType {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  link?: string;
  order: number;
}

export function MobileTrackerStore() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>("");
  
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/tracker/boards");
      const json = await res.json();
      if (json.success) {
        setBoards(json.data);
      }
    } catch (e) {
      toast.error("Failed to load boards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBoardData = useCallback(async (boardId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracker?boardId=${boardId}`);
      const json = await res.json();
      if (json.success) {
        setColumns(json.data.columns);
        setCards(json.data.cards);
        if (json.data.columns.length > 0) {
            setActiveTab(json.data.columns[0].id);
        }
      }
    } catch (e) {
      toast.error("Failed to load board data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (activeBoardId) {
        fetchBoardData(activeBoardId);
    }
  }, [activeBoardId, fetchBoardData]);

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || !activeTab) return;

    try {
      const res = await fetch('/api/tracker/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: newCardTitle, 
            description: newCardDesc, 
            columnId: activeTab 
        }),
      });
      const json = await res.json();
      
      if (json.success) {
        setCards(prev => [...prev, json.data]);
        toast.success('Card added');
        setNewCardTitle("");
        setNewCardDesc("");
        setIsAddCardOpen(false);
      } else {
        toast.error('Failed to add card');
      }
    } catch (e) {
      toast.error('Error adding card');
    }
  };

  const handleCardDelete = async (id: string) => {
      if(!confirm("Delete card?")) return;
      try {
        await fetch(`/api/tracker/cards/${id}`, { method: 'DELETE' });
        setCards(prev => prev.filter(c => c.id !== id));
        toast.success("Card deleted");
      } catch (e) {
          toast.error("Error deleting card");
      }
  }

  if (isLoading && !activeBoardId) return <div className="p-8 text-center text-muted-foreground text-sm">Loading tracker...</div>;

  if (!activeBoardId) {
      return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        className="pl-9 h-9" 
                        placeholder="Search boards..." 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                {boards.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Layout className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No boards found.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    {boards.map(board => (
                        <Card 
                            key={board.id} 
                            className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                            onClick={() => setActiveBoardId(board.id)}
                        >
                            <Layout className="h-8 w-8 text-indigo-500 fill-indigo-500/20" />
                            <span className="font-medium text-sm truncate w-full text-center">{board.title}</span>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  const activeColumn = columns.find(c => c.id === activeTab);
  const activeCards = cards.filter(c => c.columnId === activeTab);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setActiveBoardId(null)}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-sm truncate flex-1">
            {boards.find(b => b.id === activeBoardId)?.title}
        </h2>
        <Button size="icon" onClick={() => setIsAddCardOpen(true)} className="h-8 w-8 shrink-0">
            <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {columns.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-4 py-2 border-b overflow-x-auto no-scrollbar">
                    <TabsList className="w-auto inline-flex h-9 p-1">
                        {columns.map(col => (
                            <TabsTrigger key={col.id} value={col.id} className="text-xs px-3">
                                {col.title}
                                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[9px]">{cards.filter(c => c.columnId === col.id).length}</Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 bg-muted/5">
                    {activeCards.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No cards in this column</p>
                        </div>
                    )}
                    {activeCards.map(card => (
                        <Card key={card.id} className="p-3 bg-card shadow-sm border active:scale-[0.99] transition-transform">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h4 className="font-medium text-sm leading-tight">{card.title}</h4>
                                    {card.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 -mr-1 text-muted-foreground/50"
                                    onClick={() => handleCardDelete(card.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </Tabs>
        ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>No columns defined</p>
            </div>
        )}
      </div>

      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>Add Card to {activeColumn?.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input 
                    placeholder="Title" 
                    value={newCardTitle} 
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    autoFocus
                />
                <Input 
                    placeholder="Description (optional)" 
                    value={newCardDesc} 
                    onChange={(e) => setNewCardDesc(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button onClick={handleAddCard} className="w-full">Add Card</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
