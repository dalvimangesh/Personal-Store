"use client";

import { useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Check, Flame, ChevronRight, Activity, ArrowLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function MobileHabitStore() {
  const { 
    habits, 
    searchQuery, 
    setSearchQuery, 
    addHabit, 
    toggleHabitLog, 
    deleteHabit,
    isLoading 
  } = useHabits();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addHabit({
      title: newTitle,
      description: newDescription,
      frequency: 'daily'
    });
    setNewTitle("");
    setNewDescription("");
    setIsAddOpen(false);
  };

  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading habits...</div>;

  const filteredHabits = habits.filter(h => h.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (selectedHabit) {
      return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedHabitId(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="font-semibold text-sm truncate flex-1">{selectedHabit.title}</h2>
                <Button variant="ghost" size="icon" onClick={async () => {
                    if(confirm("Delete this habit?")) {
                        await deleteHabit(selectedHabit.id);
                        setSelectedHabitId(null);
                    }
                }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>

            <div className="flex-1 p-6 space-y-6 bg-muted/5">
                <Card className="p-6 text-center space-y-4 bg-card shadow-sm border-muted">
                    <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                        <Flame className="h-8 w-8 text-orange-500" />
                    </div>
                    <div>
                        <div className="text-4xl font-bold tracking-tighter">
                            {calculateStreak(selectedHabit.logs)}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">
                            Current Streak
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 text-center bg-card shadow-sm border-muted">
                        <div className="text-2xl font-bold">
                            {selectedHabit.logs?.filter(l => l.completed).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total Days</div>
                    </Card>
                    <Card className="p-4 text-center bg-card shadow-sm border-muted">
                        <div className="text-2xl font-bold">
                            {Math.round(((selectedHabit.logs?.filter(l => l.completed).length || 0) / Math.max(1, calculateDaysSinceCreation(selectedHabit.createdAt.toString()))) * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Consistency</div>
                    </Card>
                </div>

                {selectedHabit.description && (
                    <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground italic text-center">
                        "{selectedHabit.description}"
                    </div>
                )}
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
            placeholder="Search habits..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setIsAddOpen(true)} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {format(today, "EEEE, MMMM do")}
        </div>
        
        {filteredHabits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No habits found</p>
            </div>
        )}

        {filteredHabits.map((habit) => {
            const isDoneToday = habit.logs?.some(l => l.date === dateStr && l.completed);
            const streak = calculateStreak(habit.logs);

            return (
                <Card 
                    key={habit.id} 
                    className={cn(
                        "p-4 flex items-center justify-between transition-all active:scale-[0.98] border-l-4",
                        isDoneToday 
                            ? "bg-green-50/50 dark:bg-green-900/10 border-green-500" 
                            : "bg-card border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => setSelectedHabitId(habit.id)}
                >
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className={cn(
                                "font-semibold text-base truncate leading-none",
                                isDoneToday && "text-green-700 dark:text-green-400"
                            )}>{habit.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                             {streak > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-medium">
                                    <Flame className="h-3 w-3 fill-current" />
                                    {streak} day streak
                                </Badge>
                            )}
                            {habit.description && !streak && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{habit.description}</p>
                            )}
                        </div>
                    </div>

                    <Button
                        size="icon"
                        variant={isDoneToday ? "default" : "outline"}
                        className={cn(
                            "h-12 w-12 shrink-0 rounded-full transition-all shadow-sm",
                            isDoneToday 
                                ? "bg-green-500 hover:bg-green-600 text-white border-green-600 ring-2 ring-green-100 dark:ring-green-900" 
                                : "border-2 hover:bg-muted"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleHabitLog(habit.id, dateStr, !isDoneToday, isDoneToday ? undefined : 5)
                        }} 
                    >
                        <Check className={cn("h-6 w-6 transition-all", isDoneToday ? "scale-100" : "scale-75 opacity-20")} strokeWidth={3} />
                    </Button>
                </Card>
            );
        })}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>New Habit</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input 
                    placeholder="Habit Title (e.g. Drink Water)" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                />
                <Input 
                    placeholder="Description (optional)" 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button onClick={handleAdd} className="w-full">Create Habit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function calculateStreak(logs: any[] = []) {
    if (!logs.length) return 0;
    const sortedLogs = [...logs].filter(l => l.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!sortedLogs.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Check if latest is today or yesterday
    const latest = new Date(sortedLogs[0].date);
    latest.setHours(0,0,0,0);
    
    const diffTime = Math.abs(today.getTime() - latest.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > 1) return 0; // Streak broken

    // Simple streak calc (consecutive days)
    let currentDate = latest;
    for (const log of sortedLogs) {
        const logDate = new Date(log.date);
        logDate.setHours(0,0,0,0);
        
        if (logDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (logDate.getTime() > currentDate.getTime()) {
            continue; // Duplicate entry for same day
        } else {
            break; // Gap found
        }
    }
    return streak;
}

function calculateDaysSinceCreation(createdAt?: string) {
    if(!createdAt) return 1;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
