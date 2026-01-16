"use client";

import { useState } from "react";
import { useTodos } from "@/hooks/useTodos";
import { Todo, TodoCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, ArrowLeft, Calendar, Circle, CheckCircle2, Trash2, Folder, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function MobileTodoStore() {
  const { 
    categories, 
    searchQuery, 
    setSearchQuery, 
    addTodo, 
    updateTodo, 
    deleteTodo, 
    isLoading 
  } = useTodos();

  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(0);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    
    // Default to first category if none selected (shouldn't happen in add dialog)
    const targetIndex = selectedCategoryIndex !== null ? selectedCategoryIndex : 0;

    await addTodo(targetIndex, {
      title: newTodoTitle,
      priority: newTodoPriority,
      status: 'todo',
      isCompleted: false
    });

    setNewTodoTitle("");
    setNewTodoPriority(0);
    setIsAddOpen(false);
  };

  const filteredCategories = categories.filter(c => !c.isHidden);
  
  // If searching, show all matching tasks in a flat list
  const isSearching = searchQuery.length > 0;
  const searchResults = isSearching 
    ? filteredCategories.flatMap((cat, catIdx) => cat.items.map(item => ({ ...item, catIdx })))
        .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const activeCategory = selectedCategoryIndex !== null ? filteredCategories[selectedCategoryIndex] : null;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading tasks...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search & Add Bar */}
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        {selectedCategoryIndex !== null && !isSearching && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedCategoryIndex(null)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-9" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setIsAddOpen(true)} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {isSearching ? (
            // Search Results
            <div className="space-y-2">
                {searchResults.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No tasks found</p>
                    </div>
                )}
                {searchResults.map((todo) => (
                    <TodoItem 
                        key={todo.id} 
                        todo={todo} 
                        onToggle={(completed) => updateTodo(todo.catIdx, todo.id, { 
                            isCompleted: completed, 
                            status: completed ? 'completed' : 'todo' 
                        })}
                        onDelete={() => deleteTodo(todo.catIdx, todo.id)}
                    />
                ))}
            </div>
        ) : selectedCategoryIndex === null ? (
            // Category Grid (Root)
            <div className="grid grid-cols-2 gap-3">
                {filteredCategories.map((category, index) => (
                    <Card 
                        key={category._id || index}
                        className="p-4 flex flex-col items-center justify-center gap-2 aspect-[4/3] active:scale-95 transition-transform cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCategoryIndex(index)}
                    >
                        <Folder className="h-8 w-8 text-green-500 fill-green-500/20" />
                        <span className="font-medium text-sm truncate w-full text-center">{category.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 min-w-[1.25rem]">
                            {category.items.filter(i => !i.isCompleted).length}
                        </Badge>
                    </Card>
                ))}
                {filteredCategories.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                        <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No categories found</p>
                    </div>
                )}
            </div>
        ) : (
            // Active Category Tasks
            <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center justify-between">
                    <span>{activeCategory?.name}</span>
                    <span className="text-xs">{activeCategory?.items.filter(i => !i.isCompleted).length} active</span>
                </div>
                {activeCategory?.items.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No tasks in this category</p>
                    </div>
                )}
                {activeCategory?.items.map((todo) => (
                    <TodoItem 
                        key={todo.id} 
                        todo={todo} 
                        onToggle={(completed) => updateTodo(selectedCategoryIndex, todo.id, { 
                            isCompleted: completed, 
                            status: completed ? 'completed' : 'todo' 
                        })}
                        onDelete={() => deleteTodo(selectedCategoryIndex, todo.id)}
                    />
                ))}
            </div>
        )}
      </div>

      {/* Add Todo Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Input 
                        placeholder="What needs to be done?" 
                        value={newTodoTitle} 
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Select 
                            value={selectedCategoryIndex !== null ? selectedCategoryIndex.toString() : "0"} 
                            onValueChange={(v) => setSelectedCategoryIndex(parseInt(v))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCategories.map((cat, i) => (
                                    <SelectItem key={i} value={i.toString()}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[100px]">
                        <Input 
                            type="number" 
                            min="0" 
                            max="9" 
                            placeholder="Pri"
                            value={newTodoPriority}
                            onChange={(e) => setNewTodoPriority(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAddTodo} className="w-full">Create Task</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: (c: boolean) => void; onDelete: () => void }) {
    return (
        <Card className={cn(
            "p-3 flex items-start gap-3 active:scale-[0.99] transition-transform",
            todo.isCompleted ? "opacity-60 bg-muted/20" : "bg-card"
        )}>
            <button 
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => onToggle(!todo.isCompleted)}
            >
                {todo.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                    <Circle className="h-5 w-5" />
                )}
            </button>
            
            <div className="flex-1 min-w-0 gap-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                        "text-sm font-medium leading-tight break-words",
                        todo.isCompleted && "line-through decoration-muted-foreground/50"
                    )}>
                        {todo.title}
                    </span>
                    {todo.priority > 0 && (
                        <Badge variant={todo.priority > 5 ? "destructive" : "secondary"} className="h-4 px-1 text-[10px] shrink-0">
                            {todo.priority}
                        </Badge>
                    )}
                </div>
                
                {(todo.deadline || todo.description) && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        {todo.deadline && (
                            <span className={cn(
                                "flex items-center gap-1",
                                new Date(todo.deadline) < new Date() && !todo.isCompleted && "text-red-500"
                            )}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(todo.deadline), "MMM d")}
                            </span>
                        )}
                        {todo.description && (
                            <span className="line-clamp-1">{todo.description}</span>
                        )}
                    </div>
                )}
            </div>

            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1 text-muted-foreground/50" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </Card>
    );
}
