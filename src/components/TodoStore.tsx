import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, Save, Trash2, Plus, ChevronDown, ChevronUp, Circle, PlayCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTodos } from "@/hooks/useTodos";
import { Todo } from "@/types";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function TodoStore({ searchQuery = "", isPrivacyMode = false }: { searchQuery?: string; isPrivacyMode?: boolean }) {
  const { todos, addTodo, updateTodo, deleteTodo, isLoading, setSearchQuery } = useTodos();
  
  // Sync search query from props to hook
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  // Add Todo State
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(0);
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [newTodoDeadline, setNewTodoDeadline] = useState<Date | undefined>(undefined);
  const [newTodoStartDate, setNewTodoStartDate] = useState<Date | undefined>(new Date());
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [newTodoStatus, setNewTodoStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  // Edit Todo State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(undefined);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const success = await addTodo({
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
      toast.success("Todo added");
    } else {
      toast.error("Failed to add todo");
    }
  };

  const handleStatusChange = async (todo: Todo, newStatus: 'todo' | 'in_progress' | 'completed') => {
    const success = await updateTodo(todo.id, { 
        status: newStatus,
        isCompleted: newStatus === 'completed'
    });
    if (!success) toast.error("Failed to update todo status");
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDescription(todo.description || "");
    setEditDeadline(todo.deadline ? new Date(todo.deadline) : undefined);
    setEditStartDate(todo.startDate ? new Date(todo.startDate) : undefined);
    setEditStatus(todo.status);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditPriority(0);
    setEditDescription("");
    setEditDeadline(undefined);
    setEditStartDate(undefined);
    setEditStatus('todo');
  };

  const saveEditing = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    const success = await updateTodo(id, {
      title: editTitle,
      priority: editPriority,
      description: editDescription,
      deadline: editDeadline,
      startDate: editStartDate,
      status: editStatus,
      isCompleted: editStatus === 'completed',
    });

    if (success) {
      setEditingId(null);
      toast.success("Todo updated");
    } else {
      toast.error("Failed to update todo");
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteTodo(id);
    if (success) {
      toast.success("Todo moved to trash");
    } else {
      toast.error("Failed to delete todo");
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
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Manage your tasks with priority (0-9), deadlines, and descriptions.
        </p>
      </div>

      {/* Add Todo Form */}
      <div className="flex flex-col bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Task</label>
            <Input
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full"
                onKeyDown={(e) => {
                if (e.key === "Enter" && !isAddExpanded) handleAddTodo();
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
                    else if (e.target.value === "") setNewTodoPriority(0);
                }}
                className="w-full"
            />
            </div>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsAddExpanded(!isAddExpanded)}
                title={isAddExpanded ? "Show less" : "Show more options"}
                className="shrink-0"
            >
                {isAddExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button onClick={handleAddTodo} className="w-full sm:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-2" /> Add
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

      {/* Todo List */}
      <div className="flex flex-col gap-2">
        {todos.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No todos found.
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex flex-col gap-3 p-3 rounded-lg border transition-colors ${
                todo.status === 'completed' ? "bg-muted/30" : 
                todo.status === 'in_progress' ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
                "bg-card"
              } ${editingId === todo.id ? "ring-1 ring-primary" : "hover:bg-accent/5"}`}
            >
              {editingId === todo.id ? (
                // Editing Mode
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                         <div className="pt-2">
                            <Select value={editStatus} onValueChange={(v: 'todo' | 'in_progress' | 'completed') => setEditStatus(v)}>
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
                             <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="font-medium"
                                autoFocus
                             />
                             <Textarea 
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description"
                                className="text-sm resize-none min-h-[60px]"
                             />
                         </div>
                         <div className="w-full sm:w-auto flex flex-col gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="9"
                                value={editPriority}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0 && val <= 9) setEditPriority(val);
                                }}
                                className="w-20 sm:w-24"
                            />
                            <Popover modal>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal px-2",
                                            !editStartDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {editStartDate ? format(editStartDate, "PP") : <span className="text-xs">Start</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={editStartDate}
                                        onSelect={setEditStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover modal>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal px-2",
                                            !editDeadline && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {editDeadline ? format(editDeadline, "PP") : <span className="text-xs">Deadline</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={editDeadline}
                                        onSelect={setEditDeadline}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                         </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => saveEditing(todo.id)}>
                            <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                    </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-3">
                        <div className="pt-1">
                            <Select 
                                value={todo.status} 
                                onValueChange={(val: 'todo' | 'in_progress' | 'completed') => handleStatusChange(todo, val)}
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
                        
                        <div 
                            className="flex-1 min-w-0 cursor-pointer group"
                            onClick={() => startEditing(todo)}
                        >
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
                             <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => startEditing(todo)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <span className="sr-only">Edit</span>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00178 12.709 2.14646 12.8536C2.29113 12.9982 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM11.5 1.5L13.5 3.5L12.5 4.5L10.5 2.5L11.5 1.5ZM10.8536 2.85355L9.85355 3.85355L11.8536 5.85355L12.8536 4.85355L10.8536 2.85355ZM9.5 4.20711L3.85355 9.85355L3.14645 9.14645L8.79289 3.5L9.5 4.20711ZM3.05634 10.5L3.44366 9.59645L4.5 10.6528L3.05634 10.5ZM4.10355 11.5563L5.40355 11.9437L5.15279 10.5L4.10355 11.5563ZM6.14645 11.1464L5.79289 11.5L11.4393 5.85355L11.7929 5.5L6.14645 11.1464Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(todo.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
}
