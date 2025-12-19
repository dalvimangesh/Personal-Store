import { useState, useEffect } from 'react';
import { Plus, X, ExternalLink, MoreVertical, Trash2, Edit2, Layout, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface TrackerCardType {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  link?: string;
  order: number;
  createdAt: Date;
}

interface TrackerColumnType {
  id: string;
  title: string;
  order: number;
  createdAt: Date;
}

interface TrackerBoardType {
  id: string;
  title: string;
  createdAt: Date;
}

interface TrackerStoreProps {
  isPrivacyMode: boolean;
}

export function TrackerStore({ isPrivacyMode }: TrackerStoreProps) {
  const [boards, setBoards] = useState<TrackerBoardType[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<TrackerColumnType[]>([]);
  const [cards, setCards] = useState<TrackerCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoardLoading, setIsBoardLoading] = useState(true);
  
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<TrackerCardType | null>(null);

  // Board Management State
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [editingBoard, setEditingBoard] = useState<TrackerBoardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // Prevent drag on simple clicks
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (activeBoardId) {
      fetchData(activeBoardId);
    }
  }, [activeBoardId]);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/tracker/boards');
      const json = await res.json();
      if (json.success) {
        setBoards(json.data);
        if (json.data.length > 0 && !activeBoardId) {
            // Try to restore from localStorage or pick first
            const savedId = localStorage.getItem('tracker_active_board');
            if (savedId && json.data.find((b: TrackerBoardType) => b.id === savedId)) {
                setActiveBoardId(savedId);
            } else {
                setActiveBoardId(json.data[0].id);
            }
        }
      }
    } catch (error) {
      console.error('Failed to fetch boards', error);
      toast.error('Failed to load boards');
    } finally {
      setIsBoardLoading(false);
    }
  };

  const fetchData = async (boardId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracker?boardId=${boardId}`);
      const json = await res.json();
      if (json.success) {
        setColumns(json.data.columns);
        setCards(json.data.cards);
      }
    } catch (error) {
      console.error('Failed to fetch tracker data', error);
      toast.error('Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    
    try {
      const res = await fetch('/api/tracker/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle }),
      });
      const json = await res.json();
      
      if (json.success) {
        setBoards([...boards, json.data]);
        setActiveBoardId(json.data.id);
        localStorage.setItem('tracker_active_board', json.data.id);
        setNewBoardTitle('');
        setIsCreateBoardOpen(false);
        toast.success('Board created');
      } else {
        toast.error(json.error || 'Failed to create board');
      }
    } catch (error) {
      toast.error('Failed to create board');
    }
  };

  const handleDeleteBoard = async (id: string) => {
      if (!confirm('Are you sure you want to delete this board? All columns and cards will be lost.')) return;
      
      try {
          const res = await fetch(`/api/tracker/boards/${id}`, {
              method: 'DELETE',
          });
          const json = await res.json();

          if (json.success) {
              const newBoards = boards.filter(b => b.id !== id);
              setBoards(newBoards);
              if (activeBoardId === id) {
                  if (newBoards.length > 0) {
                      setActiveBoardId(newBoards[0].id);
                      localStorage.setItem('tracker_active_board', newBoards[0].id);
                  } else {
                      setActiveBoardId(null); // Should handle empty state or recreate default
                      fetchBoards(); // Will recreate default
                  }
              }
              toast.success('Board deleted');
          } else {
              toast.error(json.error || 'Failed to delete board');
          }
      } catch (error) {
          toast.error('Failed to delete board');
      }
  };

  const handleUpdateBoard = async () => {
      if (!editingBoard || !editingBoard.title.trim()) return;

      try {
          const res = await fetch(`/api/tracker/boards/${editingBoard.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: editingBoard.title }),
          });
          const json = await res.json();

          if (json.success) {
              setBoards(boards.map(b => b.id === editingBoard.id ? { ...b, title: editingBoard.title } : b));
              setEditingBoard(null);
              toast.success('Board updated');
          } else {
              toast.error(json.error || 'Failed to update board');
          }
      } catch (error) {
          toast.error('Failed to update board');
      }
  };


  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !activeBoardId) return;
    
    try {
      const res = await fetch('/api/tracker/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newColumnTitle, boardId: activeBoardId }),
      });
      const json = await res.json();
      
      if (json.success) {
        setColumns([...columns, json.data]);
        setNewColumnTitle('');
        setIsAddingColumn(false);
        toast.success('Column added');
      } else {
        toast.error(json.error || 'Failed to add column');
      }
    } catch (error) {
      toast.error('Failed to add column');
    }
  };

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('Are you sure? This will delete all cards in this column.')) return;

    try {
      const res = await fetch(`/api/tracker/columns/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (json.success) {
        setColumns(columns.filter(c => c.id !== id));
        setCards(cards.filter(c => c.columnId !== id));
        toast.success('Column deleted');
      } else {
        toast.error(json.error || 'Failed to delete column');
      }
    } catch (error) {
      toast.error('Failed to delete column');
    }
  };

  const handleAddCard = async (columnId: string, data: { title: string; description?: string; link?: string }) => {
    try {
      const res = await fetch('/api/tracker/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, columnId }),
      });
      const json = await res.json();
      
      if (json.success) {
        setCards([...cards, json.data]);
        toast.success('Card added');
      } else {
        toast.error(json.error || 'Failed to add card');
      }
    } catch (error) {
      toast.error('Failed to add card');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const res = await fetch(`/api/tracker/cards/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (json.success) {
        setCards(cards.filter(c => c.id !== id));
        toast.success('Card deleted');
      } else {
        toast.error(json.error || 'Failed to delete card');
      }
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

    const handleUpdateCard = async (id: string, updates: Partial<TrackerCardType>) => {
        // Optimistic update
        const originalCards = [...cards];
        setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
        setEditingCardId(null); // Close editor if open

        try {
            const res = await fetch(`/api/tracker/cards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const json = await res.json();
            
            if (!json.success) {
                setCards(originalCards); // Revert
                toast.error(json.error || 'Failed to update card');
            }
        } catch (error) {
            setCards(originalCards); // Revert
            toast.error('Failed to update card');
        }
    }

  const handleMoveCard = async (cardId: string, newColumnId: string) => {
    if (!newColumnId) return;
    handleUpdateCard(cardId, { columnId: newColumnId });
  };

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === 'Card';
    const isOverACard = over.data.current?.type === 'Card';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveACard) return;

    // Moving card between columns
    if (isActiveACard && isOverACard) {
        const activeCard = cards.find(c => c.id === activeId);
        const overCard = cards.find(c => c.id === overId);

        if (activeCard && overCard && activeCard.columnId !== overCard.columnId) {
             setCards(prev => {
                const activeItems = prev.filter(c => c.columnId === activeCard.columnId);
                const overItems = prev.filter(c => c.columnId === overCard.columnId);
                
                const activeIndex = activeItems.findIndex(c => c.id === activeId);
                const overIndex = overItems.findIndex(c => c.id === overId);

                // We need to update the columnId immediately for the UI to reflect
                // The actual reordering logic is handled more robustly in dragEnd, but this visual feedback is crucial
                return prev.map(c => {
                    if (c.id === activeId) {
                        return { ...c, columnId: overCard.columnId };
                    }
                    return c;
                });
             })
        }
    }

    if (isActiveACard && isOverAColumn) {
        const activeCard = cards.find(c => c.id === activeId);
        if (activeCard && activeCard.columnId !== overId) {
            setCards(prev => prev.map(c => {
                if (c.id === activeId) {
                    return { ...c, columnId: String(overId) };
                }
                return c;
            }));
        }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCard = cards.find(c => c.id === activeId);
    
    // If dropped on a column
    if (over.data.current?.type === 'Column') {
         if (activeCard && activeCard.columnId !== overId) {
             handleUpdateCard(activeId, { columnId: overId });
         }
         return;
    }

    // If dropped on another card
    if (activeId !== overId) {
         const overCard = cards.find(c => c.id === overId);
         if (activeCard && overCard) {
             if (activeCard.columnId !== overCard.columnId) {
                  // Moved to another column (and position)
                  handleUpdateCard(activeId, { columnId: overCard.columnId });
             } else {
                  // Reordered in same column
                  // For now, we just update local state, 
                  // In a real app with 'order' field, you'd calculate new order index and save API
                  const oldIndex = cards.findIndex(c => c.id === activeId);
                  const newIndex = cards.findIndex(c => c.id === overId);
                  setCards(arrayMove(cards, oldIndex, newIndex));
                  // Note: Persisting exact order index to DB is skipped for simplicity, but column change is saved
             }
         }
    }
  };

  if (isBoardLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading boards...</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
        {/* Board Switcher */}
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 overflow-x-auto max-w-[calc(100%-120px)] no-scrollbar">
                {boards.map(board => (
                     <div key={board.id} className="group flex items-center gap-1">
                        <Button
                            variant={activeBoardId === board.id ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => {
                                setActiveBoardId(board.id);
                                localStorage.setItem('tracker_active_board', board.id);
                            }}
                            className="h-8 text-xs font-medium max-w-[150px]"
                        >
                            <Layout className="w-3 h-3 mr-2 opacity-70 shrink-0" />
                            <span className={`truncate ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
                                {board.title}
                            </span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => setEditingBoard(board)}>
                                    <Edit2 className="mr-2 h-3 w-3" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => handleDeleteBoard(board.id)}
                                    className="text-destructive focus:text-destructive"
                                    disabled={boards.length <= 1}
                                >
                                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                ))}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsCreateBoardOpen(true)}
                >
                    <Plus className="w-3 h-3 mr-1" /> New
                </Button>
            </div>
        </div>

        {/* Board Content */}
        {isLoading ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">Loading board data...</div>
        ) : (
            <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            >
                <div className="flex overflow-x-auto pb-4 gap-2 items-start h-full">
                {columns.map(column => (
                    <SortableColumn 
                        key={column.id} 
                        column={column} 
                        columns={columns}
                        cards={cards.filter(c => c.columnId === column.id)}
                        isPrivacyMode={isPrivacyMode}
                        onDeleteColumn={handleDeleteColumn}
                        onDeleteCard={handleDeleteCard}
                        onEditCard={setEditingCardId}
                        editingCardId={editingCardId}
                        onUpdateCard={handleUpdateCard}
                        onCancelEdit={() => setEditingCardId(null)}
                        onAddCard={handleAddCard}
                    />
                ))}

                <div className="w-64 shrink-0">
                    {isAddingColumn ? (
                    <div className="bg-background border rounded-lg p-2 space-y-2">
                        <Input 
                        placeholder="Column title..." 
                        value={newColumnTitle} 
                        onChange={e => setNewColumnTitle(e.target.value)}
                        autoFocus
                        className="h-8 text-sm"
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAddColumn();
                            if (e.key === 'Escape') setIsAddingColumn(false);
                        }}
                        />
                        <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddColumn}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
                        </div>
                    </div>
                    ) : (
                    <Button 
                        variant="outline" 
                        className="w-full h-10 border-dashed text-xs"
                        onClick={() => setIsAddingColumn(true)}
                    >
                        <Plus className="mr-2 h-3 w-3" /> Add Column
                    </Button>
                    )}
                </div>
                </div>
                <DragOverlay>
                    {activeCard ? (
                        <TrackerCard 
                            card={activeCard} 
                            columns={[]} // Not needed for overlay
                            isPrivacyMode={isPrivacyMode}
                            onDelete={() => {}}
                            onEdit={() => {}}
                            onMove={() => {}}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        )}

        {/* Create Board Dialog */}
        <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Board</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="Board Name" 
                        value={newBoardTitle}
                        onChange={(e) => setNewBoardTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateBoard();
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsCreateBoardOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateBoard}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

         {/* Edit Board Dialog */}
         <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Board</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="Board Name" 
                        value={editingBoard?.title || ''}
                        onChange={(e) => setEditingBoard(prev => prev ? { ...prev, title: e.target.value } : null)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateBoard();
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingBoard(null)}>Cancel</Button>
                    <Button onClick={handleUpdateBoard}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}

// Wrapper component for Sortable Column
function SortableColumn({ 
    column, 
    columns,
    cards, 
    isPrivacyMode, 
    onDeleteColumn, 
    onDeleteCard, 
    onEditCard, 
    editingCardId, 
    onUpdateCard,
    onCancelEdit,
    onAddCard 
}: {
    column: TrackerColumnType;
    columns: TrackerColumnType[];
    cards: TrackerCardType[];
    isPrivacyMode: boolean;
    onDeleteColumn: (id: string) => void;
    onDeleteCard: (id: string) => void;
    onEditCard: (id: string) => void;
    editingCardId: string | null;
    onUpdateCard: (id: string, updates: Partial<TrackerCardType>) => void;
    onCancelEdit: () => void;
    onAddCard: (colId: string, data: any) => void;
}) {
    const { setNodeRef } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });

    return (
        <div ref={setNodeRef} className="w-64 shrink-0 flex flex-col bg-secondary/30 rounded-lg border">
          <div className="p-2 font-medium flex items-center justify-between border-b bg-secondary/50 rounded-t-lg">
            <span className={`truncate text-sm ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>{column.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteColumn(column.id)}
                >
                  Delete Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="p-1.5 space-y-1.5 min-h-[50px]">
            <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {cards.map(card => (
                editingCardId === card.id ? (
                    <EditCardForm 
                        key={card.id} 
                        card={card} 
                        onSave={(updates) => onUpdateCard(card.id, updates)}
                        onCancel={onCancelEdit}
                    />
                ) : (
                    <SortableTrackerCard 
                        key={card.id} 
                        card={card} 
                        columns={columns}
                        isPrivacyMode={isPrivacyMode}
                        onDelete={() => onDeleteCard(card.id)}
                        onEdit={() => onEditCard(card.id)}
                        onMove={(newColId: string) => onUpdateCard(card.id, { columnId: newColId })}
                    />
                )
                ))}
            </SortableContext>
          </div>

          <div className="p-1.5 pt-0">
             <AddCardForm onAdd={(data) => onAddCard(column.id, data)} />
          </div>
        </div>
    );
}

function SortableTrackerCard(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: props.card.id,
        data: {
            type: 'Card',
            card: props.card,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TrackerCard {...props} />
        </div>
    );
}


function AddCardForm({ onAdd }: { onAdd: (data: { title: string; description?: string; link?: string }) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title, description, link });
    setTitle('');
    setDescription('');
    setLink('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs"
        onClick={() => setIsEditing(true)}
      >
        <Plus className="mr-2 h-3 w-3" /> Add Card
      </Button>
    );
  }

  return (
    <div className="space-y-2 bg-background p-2 rounded-md border shadow-sm">
      <Input 
        placeholder="Card title..." 
        value={title} 
        onChange={e => setTitle(e.target.value)}
        autoFocus
        className="h-8 text-sm"
      />
      <Textarea 
        placeholder="Description (optional)" 
        value={description} 
        onChange={e => setDescription(e.target.value)}
        className="min-h-[60px] text-xs resize-none"
      />
      <Input 
        placeholder="Link URL (optional)" 
        value={link} 
        onChange={e => setLink(e.target.value)}
        className="text-xs h-7"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit}>Add</Button>
      </div>
    </div>
  );
}

function EditCardForm({ card, onSave, onCancel }: { card: TrackerCardType; onSave: (updates: Partial<TrackerCardType>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [link, setLink] = useState(card.link || '');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({ title, description, link });
  };

  return (
    <div className="space-y-2 bg-background p-2 rounded-md border shadow-sm ring-2 ring-primary/20">
      <Input 
        placeholder="Card title..." 
        value={title} 
        onChange={e => setTitle(e.target.value)}
        autoFocus
        className="h-8 text-sm font-medium"
      />
      <Textarea 
        placeholder="Description (optional)" 
        value={description} 
        onChange={e => setDescription(e.target.value)}
        className="min-h-[60px] text-xs resize-none"
      />
      <Input 
        placeholder="Link URL (optional)" 
        value={link} 
        onChange={e => setLink(e.target.value)}
        className="text-xs h-7"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}

function TrackerCard({ 
    card, 
    columns, 
    isPrivacyMode, 
    onDelete, 
    onEdit,
    onMove,
    isOverlay
}: { 
    card: TrackerCardType; 
    columns: TrackerColumnType[]; 
    isPrivacyMode: boolean; 
    onDelete: () => void; 
    onEdit: () => void;
    onMove: (colId: string) => void; 
    isOverlay?: boolean;
}) {
  return (
    <Card className={`group relative bg-card hover:bg-accent/5 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing border-muted/60 ${isOverlay ? 'shadow-xl ring-2 ring-primary/20 rotate-2' : ''}`}>
      <CardContent className="p-1.5 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <h4 className={`text-xs font-bold leading-tight break-words pt-0.5 ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
            {card.title}
          </h4>
          {!isOverlay && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0 -mr-1 -mt-0.5 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
                {columns.length > 1 && (
                    <>
                        <div className="h-px bg-border my-1" />
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Move to...</div>
                        {columns.filter(c => c.id !== card.columnId).map(col => (
                            <DropdownMenuItem key={col.id} onClick={() => onMove(col.id)}>
                                {col.title}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
        
        {card.description && (
          <p className={`text-[11px] text-muted-foreground/80 line-clamp-3 leading-snug ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
            {card.description}
          </p>
        )}

        {card.link && (
            <div className={`flex items-center ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
                <a 
                    href={card.link.startsWith('http') ? card.link : `https://${card.link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary/50 hover:bg-secondary px-1.5 py-0.5 rounded-sm max-w-full"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking link
                >
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate max-w-[150px]">
                        {card.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </span>
                </a>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
