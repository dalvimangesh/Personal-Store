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
                <h2 className="font-bold text-base line-clamp-1 flex-1">{selectedHabit.title}</h2>
                <Button variant="ghost" size="icon" onClick={async () => {
                    if(confirm("Delete this habit?")) {
                        await deleteHabit(selectedHabit.id);
                        setSelectedHabitId(null);
                    }
                }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>

            <div className="flex-1 p-5 space-y-5 bg-muted/5 overflow-y-auto">
                <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 shadow-sm">
                    <div className="mx-auto w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Flame className="h-10 w-10 text-white fill-white" />
                    </div>
                    <div>
                        <div className="text-5xl font-black tracking-tighter text-orange-600 dark:text-orange-400">
                            {calculateStreak(selectedHabit.logs)}
                        </div>
                        <div className="text-[10px] text-orange-600/70 dark:text-orange-400/70 font-bold uppercase tracking-[0.2em] mt-2">
                            Day Streak
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 text-center bg-card shadow-sm border-muted/60 flex flex-col justify-center gap-1">
                        <div className="text-3xl font-bold tracking-tight">
                            {selectedHabit.logs?.filter(l => l.completed).length || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Days</div>
                    </Card>
                    <Card className="p-5 text-center bg-card shadow-sm border-muted/60 flex flex-col justify-center gap-1">
                        <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            {Math.round(((selectedHabit.logs?.filter(l => l.completed).length || 0) / Math.max(1, calculateDaysSinceCreation(selectedHabit.createdAt.toString()))) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Consistency</div>
                    </Card>
                </div>

                {selectedHabit.description && (
                    <div className="p-5 rounded-2xl bg-muted/40 text-sm text-muted-foreground leading-relaxed relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground/20" />
                        <span className="relative z-10">{selectedHabit.description}</span>
                    </div>
                )}

                <div className="pt-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.1em] mb-4 px-1">Recent History</h3>
                    <div className="flex flex-wrap gap-2">
                        {[...Array(7)].map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() - (6 - i));
                            const dStr = format(d, "yyyy-MM-dd");
                            const isDone = selectedHabit.logs?.some(l => l.date === dStr && l.completed);
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-[40px]">
                                    <div className={cn(
                                        "w-full aspect-square rounded-lg flex items-center justify-center border-2 transition-colors",
                                        isDone ? "bg-green-500 border-green-600 text-white" : "bg-muted/50 border-muted"
                                    )}>
                                        {isDone && <Check className="h-4 w-4" strokeWidth={4} />}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">{format(d, "EEE")}</span>
                                </div>
                            );
                        })}
                    </div>
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
                        "p-4 flex items-center justify-between transition-all active:scale-[0.98] border-l-4 overflow-hidden",
                        isDoneToday 
                            ? "bg-green-50/50 dark:bg-green-900/10 border-green-500 shadow-sm" 
                            : "bg-card border-transparent hover:border-muted-foreground/20 shadow-none"
                    )}
                    onClick={() => setSelectedHabitId(habit.id)}
                >
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="flex flex-col gap-1">
                            <h3 className={cn(
                                "font-bold text-base leading-tight break-words line-clamp-2",
                                isDoneToday ? "text-green-800 dark:text-green-300" : "text-foreground"
                            )}>{habit.title}</h3>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                {streak > 0 && (
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-bold shrink-0">
                                        <Flame className="h-3 w-3 fill-current" />
                                        {streak}d streak
                                    </Badge>
                                )}
                                {habit.description && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                        {habit.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="icon"
                            variant={isDoneToday ? "default" : "outline"}
                            className={cn(
                                "h-14 w-14 rounded-2xl transition-all",
                                isDoneToday 
                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20" 
                                    : "border-2 bg-muted/30 hover:bg-muted"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleHabitLog(habit.id, dateStr, !isDoneToday, isDoneToday ? undefined : 5)
                            }} 
                        >
                            <Check className={cn("h-7 w-7 transition-all", isDoneToday ? "scale-110 opacity-100" : "scale-75 opacity-20")} strokeWidth={3} />
                        </Button>
                    </div>
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
