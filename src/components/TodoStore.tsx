import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    Calendar as CalendarIcon, Clock, Save, Trash2, Plus, 
    ChevronDown, ChevronUp, Circle, PlayCircle, CheckCircle2,
    FolderPlus, Users, UserMinus, LogOut, Shield, UserPlus, Globe, Copy, ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useTodos } from "@/hooks/useTodos";
import { Todo, TodoCategory } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function TodoStore({ searchQuery = "", isPrivacyMode = false }: { searchQuery?: string; isPrivacyMode?: boolean }) {
  const { 
    categories, 
    isLoading, 
    setSearchQuery, 
    addCategory, 
    deleteCategory, 
    addTodo, 
    updateTodo, 
    deleteTodo, 
    isSaving,
    debouncedSave,
    setCategories,
    allCategories,
    fetchCategories
  } = useTodos();
  
  // Sync search query from props to hook
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  // Add Todo State
  const [addingToCategoryIndex, setAddingToCategoryIndex] = useState<number | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(0);
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [newTodoDeadline, setNewTodoDeadline] = useState<Date | undefined>(undefined);
  const [newTodoStartDate, setNewTodoStartDate] = useState<Date | undefined>(new Date());
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [newTodoStatus, setNewTodoStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  // Edit Todo State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(undefined);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TodoCategory | null>(null);
  const [shareUsername, setShareUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleAddTodo = async (categoryIndex: number) => {
    if (!newTodoTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const success = await addTodo(categoryIndex, {
      title: newTodoTitle,
      priority: newTodoPriority,
      description: newTodoDescription,
      deadline: newTodoDeadline,
      startDate: newTodoStartDate,
      status: newTodoStatus,
      isCompleted: newTodoStatus === 'completed',
    });

    if (success) {
      setNewTodoTitle("");
      setNewTodoPriority(0);
      setNewTodoDescription("");
      setNewTodoDeadline(undefined);
      setNewTodoStartDate(new Date());
      setNewTodoStatus('todo');
      setIsAddExpanded(false);
      setAddingToCategoryIndex(null);
      toast.success("Todo added");
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDescription(todo.description || "");
    setEditDeadline(todo.deadline ? new Date(todo.deadline) : undefined);
    setEditStartDate(todo.startDate ? new Date(todo.startDate) : undefined);
    setEditStatus(todo.status);
  };

  const cancelEditing = () => {
    setEditingTodoId(null);
  };

  const saveEditing = async (categoryIndex: number, todoId: string) => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    await updateTodo(categoryIndex, todoId, {
      title: editTitle,
      priority: editPriority,
      description: editDescription,
      deadline: editDeadline,
      startDate: editStartDate,
      status: editStatus,
      isCompleted: editStatus === 'completed',
    });
    setEditingTodoId(null);
    toast.success("Todo updated");
  };

  const handleCategoryNameChange = (index: number, name: string) => {
    const newCategories = [...allCategories];
    newCategories[index] = { ...newCategories[index], name };
    setCategories(newCategories);
    debouncedSave(newCategories);
  };

  const openShareDialog = (category: TodoCategory) => {
      if (!category._id) {
          toast.warning("Please wait for the category to be saved before sharing.");
          return;
      }
      setSelectedCategory(category);
      setShareUsername("");
      setShareDialogOpen(true);
  };

  const handleAddUser = async () => {
      if (!shareUsername || !selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/todos/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'add',
                  username: shareUsername
              })
          });
          if (res.ok) {
              toast.success("User added successfully");
              setShareUsername("");
              await fetchCategories();
              const refreshed = categories.find(c => c._id === selectedCategory._id);
              if (refreshed) setSelectedCategory(refreshed);
          } else {
              const data = await res.json();
              toast.error(data.error || "Failed to add user");
          }
      } catch (error) {
          toast.error("Error adding user");
      } finally {
          setIsSharing(false);
      }
  };

  const handleRemoveUser = async (username: string) => {
      if (!selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/todos/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'remove',
                  username: username
              })
          });
          if (res.ok) {
              toast.success("User removed");
              await fetchCategories();
          } else {
              toast.error("Failed to remove user");
          }
      } catch (error) {
          toast.error("Error removing user");
      } finally {
          setIsSharing(false);
      }
  };

  const handlePublicToggle = async () => {
      if (!selectedCategory) return;
      setIsSharing(true);
      try {
          const res = await fetch("/api/todos/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  categoryId: selectedCategory._id,
                  action: 'public_toggle'
              })
          });
          const data = await res.json();
          if (res.ok) {
               await fetchCategories();
               toast.success(data.data.isPublic ? "Public link created" : "Public link disabled");
          } else {
              toast.error(data.error || "Failed to toggle public link");
          }
      } catch (error) {
          toast.error("Error toggling public link");
      } finally {
          setIsSharing(false);
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
      <div className="flex items-center justify-between px-1 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b">
        <p className="text-sm text-muted-foreground">
          Manage your tasks with categories, priority (0-9), and sharing.
        </p>
        {isSaving ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
        ) : (
            <span className="text-xs text-muted-foreground">Saved</span>
        )}
      </div>

      <div className="flex flex-col gap-10">
          {categories.map((category, catIndex) => {
              const originalIndex = allCategories.findIndex(c => c._id === category._id || c === category);
              const isOwner = category.isOwner !== false;

              return (
                  <div key={category._id || catIndex} className="flex flex-col gap-4">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 group/cat">
                            <Input
                                value={category.name}
                                onChange={(e) => handleCategoryNameChange(originalIndex, e.target.value)}
                                className={`font-semibold text-lg h-auto py-1 px-2 border-transparent hover:border-input focus:border-input bg-transparent w-auto min-w-[150px] ${isPrivacyMode ? "blur-sm group-hover/cat:blur-none transition-all duration-300" : ""}`}
                                placeholder="Category Name"
                            />
                            
                            {!isOwner && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                    <Shield className="h-3 w-3" />
                                    Shared by {category.ownerUsername}
                                </Badge>
                            )}

                            {isOwner && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-500 opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                                    onClick={() => openShareDialog(category)}
                                    title="Share Category"
                                >
                                    <Users className="h-4 w-4" />
                                </Button>
                            )}

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100 transition-opacity" 
                                onClick={() => deleteCategory(originalIndex)} 
                                title={isOwner ? "Delete Category" : "Leave Category"}
                            >
                                {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                            </Button>
                      </div>

                      {/* Add Todo Button for this category */}
                      {addingToCategoryIndex !== originalIndex ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="self-start text-muted-foreground h-8" 
                            onClick={() => {
                                setAddingToCategoryIndex(originalIndex);
                                setNewTodoTitle("");
                                setIsAddExpanded(false);
                            }}
                          >
                              <Plus className="h-4 w-4 mr-2" /> Add Task
                          </Button>
                      ) : (
                          <div className="flex flex-col bg-card p-4 rounded-lg border shadow-sm gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex flex-col sm:flex-row gap-3 items-end">
                                    <div className="w-full flex-1 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground ml-1">Task</label>
                                        <Input
                                            value={newTodoTitle}
                                            onChange={(e) => setNewTodoTitle(e.target.value)}
                                            placeholder="What needs to be done?"
                                            className="w-full"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !isAddExpanded) handleAddTodo(originalIndex);
                                                if (e.key === "Escape") setAddingToCategoryIndex(null);
                                            }}
                                        />
                                    </div>
                                    <div className="w-full sm:w-24 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground ml-1">Priority</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="9"
                                            value={newTodoPriority}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val >= 0 && val <= 9) setNewTodoPriority(val);
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => setIsAddExpanded(!isAddExpanded)}
                                        className="shrink-0"
                                    >
                                        {isAddExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <Button onClick={() => handleAddTodo(originalIndex)} className="w-full sm:w-auto shrink-0">
                                        Add
                                    </Button>
                                    <Button variant="ghost" onClick={() => setAddingToCategoryIndex(null)} className="w-full sm:w-auto shrink-0">
                                        Cancel
                                    </Button>
                                </div>
                                {isAddExpanded && (
                                    <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Description</label>
                                            <Textarea
                                                value={newTodoDescription}
                                                onChange={(e) => setNewTodoDescription(e.target.value)}
                                                placeholder="Add details..."
                                                className="resize-none min-h-[80px]"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-[240px]">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium text-muted-foreground ml-1">Start Date</label>
                                                    <Popover modal>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full justify-start text-left font-normal",
                                                                    !newTodoStartDate && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {newTodoStartDate ? format(newTodoStartDate, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={newTodoStartDate}
                                                                onSelect={setNewTodoStartDate}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium text-muted-foreground ml-1">Deadline</label>
                                                    <Popover modal>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full justify-start text-left font-normal",
                                                                    !newTodoDeadline && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {newTodoDeadline ? format(newTodoDeadline, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={newTodoDeadline}
                                                                onSelect={setNewTodoDeadline}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                            {newTodoDeadline && (
                                                <Button variant="ghost" size="sm" onClick={() => setNewTodoDeadline(undefined)} className="h-6 px-2 text-xs text-muted-foreground mt-1">
                                                    Clear Deadline
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                          </div>
                      )}

                      {/* Todo Items in Category */}
                      <div className="flex flex-col gap-2 pl-4 border-l-2 border-muted">
                          {category.items.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">No tasks in this category.</p>
                          ) : (
                              category.items.map((todo) => (
                                  <div
                                      key={todo.id}
                                      className={`flex flex-col gap-3 p-3 rounded-lg border transition-colors ${
                                        todo.status === 'completed' ? "bg-muted/30" : 
                                        todo.status === 'in_progress' ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
                                        "bg-card"
                                      } ${editingTodoId === todo.id ? "ring-1 ring-primary" : "hover:bg-accent/5"}`}
                                  >
                                      {editingTodoId === todo.id ? (
                                          // Editing Mode
                                          <div className="flex flex-col gap-3">
                                              <div className="flex flex-col sm:flex-row gap-3 items-start">
                                                  <div className="pt-2">
                                                      <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                                                          <SelectTrigger className="w-[140px] h-8">
                                                              <SelectValue placeholder="Status" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                              <SelectItem value="todo">To Do</SelectItem>
                                                              <SelectItem value="in_progress">In Progress</SelectItem>
                                                              <SelectItem value="completed">Completed</SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  </div>
                                                  <div className="flex-1 w-full space-y-2">
                                                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="font-medium" autoFocus />
                                                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="text-sm resize-none min-h-[60px]" />
                                                  </div>
                                                  <div className="w-full sm:w-auto flex flex-col gap-2">
                                                      <Input type="number" min="0" max="9" value={editPriority} onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)} className="w-20 sm:w-24" />
                                                      <Popover modal>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" className="w-full justify-start text-left font-normal px-2">
                                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                                    {editStartDate ? format(editStartDate, "PP") : <span className="text-xs">Start</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar mode="single" selected={editStartDate} onSelect={setEditStartDate} initialFocus />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Popover modal>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" className="w-full justify-start text-left font-normal px-2">
                                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                                    {editDeadline ? format(editDeadline, "PP") : <span className="text-xs">Deadline</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar mode="single" selected={editDeadline} onSelect={setEditDeadline} initialFocus />
                                                            </PopoverContent>
                                                        </Popover>
                                                  </div>
                                              </div>
                                              <div className="flex justify-end gap-2 pt-2">
                                                  <Button size="sm" variant="outline" onClick={cancelEditing}>Cancel</Button>
                                                  <Button size="sm" onClick={() => saveEditing(originalIndex, todo.id)}><Save className="h-4 w-4 mr-2" /> Save</Button>
                                              </div>
                                          </div>
                                      ) : (
                                          // View Mode
                                          <div className="flex flex-col gap-1">
                                              <div className="flex items-start gap-3">
                                                  <div className="pt-1">
                                                      <Select 
                                                          value={todo.status} 
                                                          onValueChange={(val: any) => updateTodo(originalIndex, todo.id, { status: val, isCompleted: val === 'completed' })}
                                                      >
                                                          <SelectTrigger className={`h-8 w-[130px] text-xs ${
                                                              todo.status === 'completed' ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" :
                                                              todo.status === 'in_progress' ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400" :
                                                              "text-muted-foreground"
                                                          }`}>
                                                              <div className="flex items-center gap-2">
                                                                  {todo.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                                                                   todo.status === 'in_progress' ? <PlayCircle className="h-3.5 w-3.5" /> :
                                                                   <Circle className="h-3.5 w-3.5" />}
                                                                  <SelectValue />
                                                              </div>
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                              <SelectItem value="todo">To Do</SelectItem>
                                                              <SelectItem value="in_progress">In Progress</SelectItem>
                                                              <SelectItem value="completed">Completed</SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  </div>
                                                  <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => startEditing(todo)}>
                                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                          <span className={`text-sm font-medium break-all ${todo.status === 'completed' ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""} ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                                                              {todo.title}
                                                          </span>
                                                          <Badge variant={todo.priority > 5 ? "destructive" : "secondary"} className="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center rounded-full text-[10px] font-mono shrink-0">
                                                              {todo.priority}
                                                          </Badge>
                                                          {todo.startDate && (
                                                              <Badge variant="outline" className="h-5 gap-1 font-normal text-muted-foreground">
                                                                  <CalendarIcon className="h-3 w-3" />
                                                                  {format(new Date(todo.startDate), "MMM d")}
                                                              </Badge>
                                                          )}
                                                          {todo.deadline && (
                                                              <Badge variant="outline" className={`h-5 gap-1 font-normal ${todo.status === 'completed' ? "text-muted-foreground border-muted" : 
                                                                  (new Date(todo.deadline) < new Date() ? "text-destructive border-destructive" : "text-muted-foreground")
                                                              }`}>
                                                                  <Clock className="h-3 w-3" />
                                                                  {format(new Date(todo.deadline), "MMM d")}
                                                              </Badge>
                                                          )}
                                                      </div>
                                                      {todo.description && (
                                                          <p className={`text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-2 ${todo.status === 'completed' ? "opacity-70" : ""} ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300 select-none" : ""}`}>
                                                              {todo.description}
                                                          </p>
                                                      )}
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0 opacity-100 transition-opacity self-start">
                                                      <Button size="icon" variant="ghost" onClick={() => startEditing(todo)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                          <span className="sr-only">Edit</span>
                                                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00178 12.709 2.14646 12.8536C2.29113 12.9982 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM11.5 1.5L13.5 3.5L12.5 4.5L10.5 2.5L11.5 1.5ZM10.8536 2.85355L9.85355 3.85355L11.8536 5.85355L12.8536 4.85355L10.8536 2.85355ZM9.5 4.20711L3.85355 9.85355L3.14645 9.14645L8.79289 3.5L9.5 4.20711ZM3.05634 10.5L3.44366 9.59645L4.5 10.6528L3.05634 10.5ZM4.10355 11.5563L5.40355 11.9437L5.15279 10.5L4.10355 11.5563ZM6.14645 11.1464L5.79289 11.5L11.4393 5.85355L11.7929 5.5L6.14645 11.1464Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                                      </Button>
                                                      <Button size="icon" variant="ghost" onClick={() => deleteTodo(originalIndex, todo.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                          <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              );
          })}
      </div>

      <div className="border-t pt-4 mt-4 pb-8">
            <Button variant="outline" onClick={addCategory} className="w-full sm:w-auto">
                <FolderPlus className="h-4 w-4 mr-2" /> Add Category
            </Button>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share &quot;{selectedCategory?.name}&quot;</DialogTitle>
                    <DialogDescription>Manage access and public links.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <Globe className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium">Public Link</h4>
                                    <p className="text-xs text-muted-foreground">Anyone with the link can view this category.</p>
                                </div>
                            </div>
                            <Button variant={selectedCategory?.isPublic ? "destructive" : "default"} size="sm" onClick={handlePublicToggle} disabled={isSharing}>
                                {selectedCategory?.isPublic ? "Disable" : "Enable"}
                            </Button>
                        </div>
                        {selectedCategory?.isPublic && selectedCategory.publicToken && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input readOnly value={`${window.location.origin}/public/todo/${selectedCategory.publicToken}`} className="text-xs font-mono h-8" />
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/public/todo/${selectedCategory.publicToken}`);
                                    toast.success("Link copied!");
                                }}><Copy className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => window.open(`${window.location.origin}/public/todo/${selectedCategory.publicToken}`, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-end gap-2">
                            <div className="grid gap-1 w-full">
                                <Label htmlFor="username">Add by username</Label>
                                <Input id="username" placeholder="username" value={shareUsername} onChange={(e) => setShareUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUser()} />
                            </div>
                            <Button onClick={handleAddUser} disabled={isSharing || !shareUsername}>
                                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                            <Label>Shared with</Label>
                            {selectedCategory?.sharedWith && selectedCategory.sharedWith.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {selectedCategory.sharedWith.map(user => (
                                        <div key={user.userId} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium">{user.username}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveUser(user.username)} disabled={isSharing}>
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Not shared with anyone yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
      </Dialog>
    </div>
  );
}
