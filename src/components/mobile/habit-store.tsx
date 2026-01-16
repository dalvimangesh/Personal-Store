"use client";

import { useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Check, Flame, ChevronRight, Activity, ArrowLeft, Trash2, Calendar, Target, TrendingUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, subDays, isSameDay, eachDayOfInterval } from "date-fns";
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

  const last7Days = eachDayOfInterval({
    start: subDays(today, 6),
    end: today
  });

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your habits...</p>
    </div>
  );

  const filteredHabits = habits.filter(h => 
    !h.isHidden && 
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedHabit) {
      const streak = calculateStreak(selectedHabit.logs);
      const totalDays = selectedHabit.logs?.filter(l => l.completed).length || 0;
      const daysSinceCreation = calculateDaysSinceCreation(selectedHabit.createdAt.toString());
      const consistency = Math.round((totalDays / daysSinceCreation) * 100);

      return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedHabitId(null)} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="font-bold text-base truncate flex-1 min-w-0">{selectedHabit.title}</h2>
                <Button variant="ghost" size="icon" onClick={async () => {
                    if(confirm("Delete this habit?")) {
                        await deleteHabit(selectedHabit.id);
                        setSelectedHabitId(null);
                    }
                }} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-1 gap-4">
                    <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-lg relative overflow-hidden">
                        <Flame className="absolute -right-4 -bottom-4 h-32 w-32 opacity-20 rotate-12" />
                        <div className="relative min-w-0">
                            <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">Current Streak</p>
                            <div className="flex items-baseline gap-2 overflow-hidden">
                                <span className="text-5xl font-black truncate">{streak}</span>
                                <span className="text-xl font-bold shrink-0">days</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-card border-muted shadow-sm min-w-0">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Target className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-center w-full min-w-0">
                            <p className="text-2xl font-bold truncate">{totalDays}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Total Hits</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex flex-col items-center justify-center gap-2 bg-card border-muted shadow-sm min-w-0">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-center w-full min-w-0">
                            <p className="text-2xl font-bold truncate">{consistency}%</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">Consistency</p>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Last 7 Days</h3>
                    <div className="flex justify-between gap-1">
                        {last7Days.map((date, i) => {
                            const dStr = format(date, "yyyy-MM-dd");
                            const isDone = selectedHabit.logs?.some(l => l.date === dStr && l.completed);
                            const isToday = isSameDay(date, today);
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase",
                                        isToday ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {format(date, "EEE")}
                                    </span>
                                    <div className={cn(
                                        "w-full aspect-square rounded-lg flex items-center justify-center transition-all",
                                        isDone 
                                            ? "bg-green-500 text-white shadow-sm shadow-green-500/20" 
                                            : "bg-muted/50 border-2 border-dashed border-muted-foreground/20"
                                    )}>
                                        {isDone && <Check className="h-4 w-4" strokeWidth={4} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selectedHabit.description && (
                    <div className="p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground italic relative">
                        <span className="absolute -top-2 left-4 px-2 bg-background text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Note</span>
                        "{selectedHabit.description}"
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-10 bg-muted/40 border-none rounded-xl" 
            placeholder="Search habits..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setIsAddOpen(true)} className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
                <h2 className="text-lg font-bold tracking-tight">Today</h2>
                <p className="text-xs text-muted-foreground font-medium">
                    {format(today, "EEEE, MMMM do")}
                </p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground/40" />
        </div>
        
        {filteredHabits.length === 0 && (
            <div className="text-center py-20 text-muted-foreground animate-in zoom-in duration-300">
                <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-10 w-10 opacity-20" />
                </div>
                <h3 className="font-bold text-lg text-foreground">No habits yet</h3>
                <p className="text-sm max-w-[200px] mx-auto mt-1">Start small and build your consistency today!</p>
            </div>
        )}

        <div className="grid grid-cols-1 gap-3">
            {filteredHabits.map((habit) => {
                const isDoneToday = habit.logs?.some(l => l.date === dateStr && l.completed);
                const streak = calculateStreak(habit.logs);

                return (
                    <Card 
                        key={habit.id} 
                        className={cn(
                            "p-4 flex items-center justify-between transition-all active:scale-[0.98] border shadow-sm rounded-2xl overflow-hidden relative group",
                            isDoneToday 
                                ? "bg-green-500/5 border-green-500/30" 
                                : "bg-card border-border hover:border-primary/20"
                        )}
                        onClick={() => setSelectedHabitId(habit.id)}
                    >
                        <div className="flex-1 min-w-0 pr-4 relative z-10">
                            <div className="flex items-center gap-2 mb-1.5">
                                <h3 className={cn(
                                    "font-bold text-base truncate leading-none transition-colors",
                                    isDoneToday ? "text-green-600 dark:text-green-400" : "text-foreground"
                                )}>{habit.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 overflow-hidden">
                                 {streak > 0 ? (
                                    <Badge variant="secondary" className={cn(
                                        "h-5 px-1.5 text-[10px] gap-1 border-0 font-bold uppercase tracking-wider transition-colors shrink-0",
                                        isDoneToday 
                                            ? "bg-green-500/20 text-green-700 dark:text-green-400" 
                                            : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    )}>
                                        <Flame className={cn("h-3 w-3 fill-current", isDoneToday ? "text-green-500" : "text-orange-500")} />
                                        <span className="truncate">{streak} day streak</span>
                                    </Badge>
                                ) : habit.description ? (
                                    <p className="text-xs text-muted-foreground line-clamp-1 italic font-medium break-words">
                                        {habit.description}
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest truncate">Daily Goal</p>
                                )}
                            </div>
                        </div>

                        <Button
                            size="icon"
                            variant={isDoneToday ? "default" : "outline"}
                            className={cn(
                                "h-14 w-14 shrink-0 rounded-2xl transition-all duration-300 relative z-10",
                                isDoneToday 
                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20" 
                                    : "border-2 bg-background hover:bg-muted"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleHabitLog(habit.id, dateStr, !isDoneToday, isDoneToday ? undefined : 5)
                            }} 
                        >
                            <Check className={cn("h-8 w-8 transition-all duration-500", isDoneToday ? "scale-110 rotate-0" : "scale-50 opacity-10 -rotate-45")} strokeWidth={4} />
                        </Button>
                        
                        {/* Subtle progress indicator or background glow */}
                        {isDoneToday && (
                            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-green-500/10 to-transparent pointer-events-none" />
                        )}
                    </Card>
                );
            })}
        </div>
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
