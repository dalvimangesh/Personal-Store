import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Flame, Trash2, Edit2, CheckCircle2, Circle, ChevronDown, ChevronUp, History, Target, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isSameDay, parseISO, startOfDay } from "date-fns";
import { useHabits } from "@/hooks/useHabits";
import { Habit, HabitLog } from "@/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HabitStoreProps {
  searchQuery?: string;
  isPrivacyMode?: boolean;
}

export function HabitStore({ searchQuery = "", isPrivacyMode = false }: HabitStoreProps) {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabitLog, isLoading, setSearchQuery } = useHabits();
  
  // Sync search query
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGoalValue, setNewGoalValue] = useState<string>("");
  const [newGoalUnit, setNewGoalUnit] = useState("");

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const handleAddHabit = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    
    const success = await addHabit({
      title: newTitle,
      description: newDescription,
      goalValue: newGoalValue ? parseInt(newGoalValue) : undefined,
      goalUnit: newGoalUnit,
      frequency: 'daily',
    });

    if (success) {
      setNewTitle("");
      setNewDescription("");
      setNewGoalValue("");
      setNewGoalUnit("");
      setIsAddExpanded(false);
    }
  };

  const calculateStreak = (logs: HabitLog[] | undefined) => {
    if (!logs || logs.length === 0) return 0;
    
    const sortedLogs = [...logs]
      .filter(l => l.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedLogs.length === 0) return 0;

    let streak = 0;
    let currentDate = startOfDay(new Date());
    
    // Check if the latest log is today or yesterday
    const latestLogDate = parseISO(sortedLogs[0].date);
    if (!isSameDay(latestLogDate, currentDate) && !isSameDay(latestLogDate, subDays(currentDate, 1))) {
      return 0;
    }

    let checkDate = isSameDay(latestLogDate, currentDate) ? currentDate : subDays(currentDate, 1);

    for (const log of sortedLogs) {
      const logDate = parseISO(log.date);
      if (isSameDay(logDate, checkDate)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else if (logDate < checkDate) {
        break;
      }
    }
    
    return streak;
  };

  const getRecentDays = (days = 14) => {
    return Array.from({ length: days }).map((_, i) => subDays(new Date(), i)).reverse();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 w-full pb-10">
      <div className="flex items-center justify-between px-1 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b">
        <p className="text-sm text-muted-foreground">
          Track your daily habits and build consistent streaks.
        </p>
      </div>

      {/* Add Habit Form */}
      <div className="flex flex-col bg-card p-4 rounded-lg border shadow-sm gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground ml-1">New Habit</label>
                <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Reading book, Meditation..."
                    className="w-full"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isAddExpanded) handleAddHabit();
                    }}
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsAddExpanded(!isAddExpanded)}
                    className="shrink-0"
                >
                    {isAddExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button onClick={handleAddHabit} className="flex-1 sm:w-auto shrink-0">
                    <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
            </div>
        </div>
        
        {isAddExpanded && (
            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Description</label>
                    <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Add details about why this habit is important..."
                        className="resize-none min-h-[80px]"
                    />
                </div>
                <div className="flex flex-row sm:flex-col gap-2 min-w-[180px]">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Goal Value</label>
                        <Input
                            type="number"
                            value={newGoalValue}
                            onChange={(e) => setNewGoalValue(e.target.value)}
                            placeholder="30"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Unit</label>
                        <Input
                            value={newGoalUnit}
                            onChange={(e) => setNewGoalUnit(e.target.value)}
                            placeholder="min, pages..."
                        />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Habit List */}
      <div className="flex flex-col gap-3">
        {habits.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            No habits found. Start by adding one above!
          </div>
        ) : (
          habits.map((habit) => {
            const streak = calculateStreak(habit.logs);
            const todayDate = format(new Date(), "yyyy-MM-dd");
            const isDoneToday = habit.logs?.some(l => l.date === todayDate && l.completed);
            const recentDays = getRecentDays(42);

            return (
              <Card key={habit.id} className={cn(
                "group relative overflow-hidden transition-all hover:shadow-sm",
                isDoneToday ? "bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-card"
              )}>
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Left: Info */}
                    <div className="flex-[0.8] min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 mb-1">
                             <h3 className={cn(
                                "font-bold text-lg truncate",
                                isPrivacyMode && "blur-sm"
                            )}>
                                {habit.title}
                            </h3>
                            {streak > 0 && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1 border-orange-200 dark:border-orange-800 h-5 px-1.5 text-[10px]">
                                    <Flame className="h-3 w-3 fill-current" />
                                    {streak}
                                </Badge>
                            )}
                        </div>
                        {habit.description && (
                            <p className={cn(
                                "text-sm text-muted-foreground line-clamp-1 mb-2",
                                isPrivacyMode && "blur-sm"
                            )}>
                                {habit.description}
                            </p>
                        )}
                        {habit.goalValue && (
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded border shadow-sm">
                                <Target className="h-3 w-3 text-primary/70" />
                                {habit.goalValue} {habit.goalUnit}
                            </div>
                        )}
                    </div>

                    {/* Middle: Progress Grid */}
                    <div className="flex-[1.5] flex flex-col items-center justify-center py-2 px-8 border-x hidden md:flex min-h-[80px]">
                        <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2 max-w-[340px]">
                            <span className="flex items-center gap-1.5 text-primary/80"><Activity className="h-3 w-3" /> Consistency</span>
                            <span className="opacity-60">Last 42 Days</span>
                        </div>
                        <div className="grid grid-cols-14 gap-2">
                            {recentDays.map((day, idx) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const log = habit.logs?.find(l => l.date === dateStr);
                                const isCompleted = log?.completed;
                                const isToday = isSameDay(day, new Date());
                                
                                return (
                                    <Popover key={dateStr}>
                                        <PopoverTrigger asChild>
                                            <div 
                                                className={cn(
                                                    "h-5 w-5 rounded-[3px] cursor-pointer transition-all hover:scale-125 hover:z-10",
                                                    isCompleted ? "bg-green-500 dark:bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-muted hover:bg-muted-foreground/30",
                                                    isToday && !isCompleted && "ring-2 ring-primary ring-offset-2"
                                                )}
                                            />
                                        </PopoverTrigger>
                                        <PopoverContent side="top" className="w-auto p-2 text-xs">
                                            <div className="font-semibold">{format(day, "PPP")}</div>
                                            <div className={isCompleted ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                                {isCompleted ? "Completed" : "Not completed"}
                                            </div>
                                            {!isToday && (
                                                 <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-6 w-full mt-2 text-[10px] px-1"
                                                    onClick={() => toggleHabitLog(habit.id, dateStr, !isCompleted)}
                                                >
                                                    {isCompleted ? "Unmark" : "Mark as Done"}
                                                </Button>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-[0.8] flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <div className="lg:hidden flex flex-col items-end gap-1">
                             <div className="grid grid-cols-7 gap-0.5">
                                {recentDays.slice(-14).map((day, idx) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const isCompleted = habit.logs?.some(l => l.date === dateStr && l.completed);
                                    return <div key={idx} className={cn("h-1.5 w-1.5 rounded-[1px]", isCompleted ? "bg-green-500" : "bg-muted")} />;
                                })}
                             </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                variant={isDoneToday ? "secondary" : "default"}
                                className={cn(
                                    "h-8 gap-2 text-xs px-3",
                                    isDoneToday && "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400"
                                )}
                                onClick={() => toggleHabitLog(habit.id, todayDate, !isDoneToday)}
                            >
                                {isDoneToday ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                                ) : (
                                    <><Circle className="h-3.5 w-3.5" /> Mark Done</>
                                )}
                            </Button>
                            
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => deleteHabit(habit.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

