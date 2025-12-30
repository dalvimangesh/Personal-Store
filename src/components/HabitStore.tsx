import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Flame, Trash2, CheckCircle2, ChevronDown, ChevronUp, History, Target, Loader2, Activity, TrendingUp } from "lucide-react";
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

function HabitLineGraph({ logs, days = 147 }: { logs: HabitLog[] | undefined, days?: number }) {
  const recentDays = useMemo(() => {
    return Array.from({ length: days }).map((_, i) => subDays(new Date(), i)).reverse();
  }, [days]);

  const data = useMemo(() => {
    return recentDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const log = logs?.find(l => l.date === dateStr);
      return log?.completed ? (log.value ?? 0) : 0;
    });
  }, [recentDays, logs]);

  const maxValue = 9;
  const width = 1000;
  const height = 80;
  const paddingX = 10;
  const paddingY = 10;

  const points = data.map((val, i) => {
    const x = (i / (days - 1)) * (width - 2 * paddingX) + paddingX;
    const y = height - paddingY - (val / maxValue) * (height - 2 * paddingY);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-[100px] mt-2 bg-muted/20 rounded-lg p-3 border border-muted/30 relative group/graph overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-[0.03] text-[60px] font-black italic select-none">
            <span>CONSISTENCY</span>
            <TrendingUp className="h-16 w-16" />
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-sm" preserveAspectRatio="none">
            {/* Grid Lines */}
            {[0, 3, 6, 9].map((v) => (
                <line
                    key={v}
                    x1={paddingX}
                    y1={height - paddingY - (v / maxValue) * (height - 2 * paddingY)}
                    x2={width - paddingX}
                    y2={height - paddingY - (v / maxValue) * (height - 2 * paddingY)}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                />
            ))}
            {/* Area under the line */}
            <polyline
                fill="currentColor"
                fillOpacity="0.08"
                className="text-primary"
                points={`${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`}
            />
            {/* The Line */}
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary transition-all duration-500 ease-in-out"
                points={points}
            />
            {/* Dots for non-zero values */}
            {data.map((val, i) => {
                if (val === 0) return null;
                const x = (i / (days - 1)) * (width - 2 * paddingX) + paddingX;
                const y = height - paddingY - (val / maxValue) * (height - 2 * paddingY);
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.5"
                        className="fill-primary stroke-background stroke-2"
                    />
                );
            })}
        </svg>
        <div className="absolute top-1.5 left-2 flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Consistency (0-9 Scale)</span>
        </div>
        <div className="absolute bottom-1.5 right-2 flex items-center gap-4 text-[8px] font-medium text-muted-foreground/40 uppercase tracking-widest">
            <span>{format(recentDays[0], "MMM d")}</span>
            <div className="h-[1px] w-8 bg-muted-foreground/20" />
            <span>{format(recentDays[recentDays.length - 1], "MMM d")}</span>
        </div>
    </div>
  );
}

export function HabitStore({ searchQuery = "", isPrivacyMode = false }: HabitStoreProps) {
  const { habits, addHabit, deleteHabit, toggleHabitLog, isLoading, setSearchQuery } = useHabits();
  
  // Sync search query
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGoalValue, setNewGoalValue] = useState<string>("");
  const [newGoalUnit, setNewGoalUnit] = useState("");

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
    const currentDate = startOfDay(new Date());
    
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
    <div className="flex flex-col h-full gap-6 w-full pb-32">
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
      <div className="flex flex-col gap-6 pb-20">
        {habits.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            No habits found. Start by adding one above!
          </div>
        ) : (
          habits.map((habit) => {
            const streak = calculateStreak(habit.logs);
            const todayDate = format(new Date(), "yyyy-MM-dd");
            const isDoneToday = habit.logs?.some(l => l.date === todayDate && l.completed);
            const recentDays = getRecentDays(147); // 21 weeks of data

            return (
              <Card key={habit.id} className={cn(
                "group relative overflow-hidden transition-all hover:shadow-md",
                isDoneToday ? "bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-card"
              )}>
                <CardContent className="p-3 sm:p-4 flex flex-col lg:flex-row items-stretch gap-4">
                    {/* Left: Info */}
                    <div className="flex-none min-w-0 w-full lg:w-[280px] flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                             <h3 className={cn(
                                "font-bold text-lg break-words",
                                isPrivacyMode && "blur-sm"
                            )}>
                                {habit.title}
                            </h3>
                            {streak > 0 && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1 border-orange-200 dark:border-orange-800 h-5 px-1.5 text-[10px] shrink-0">
                                    <Flame className="h-3 w-3 fill-current" />
                                    {streak}
                                </Badge>
                            )}
                        </div>
                        {habit.description && (
                            <p className={cn(
                                "text-xs text-muted-foreground mb-3 leading-snug whitespace-pre-wrap break-words",
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

                    {/* Middle: Progress Grid & Graph */}
                    <div className="flex-1 w-full flex flex-col items-start justify-center py-2 border-t lg:border-t-0 lg:border-l lg:pl-4 min-h-[180px]">
                        <div className="w-full flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
                            <span className="flex items-center gap-1.5 text-primary/80"><Activity className="h-3 w-3" /> Consistency</span>
                            <span className="opacity-60">Last 147 Days</span>
                        </div>
                        
                        <HabitLineGraph logs={habit.logs} days={147} />

                        <div className="mt-3 w-full">
                             <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-tighter opacity-70">
                                <History className="h-2.5 w-2.5" /> Full History (Last 147 Days)
                            </div>
                            <div className="flex flex-wrap gap-1 w-full">
                                {recentDays.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const log = habit.logs?.find(l => l.date === dateStr);
                                    const isCompleted = log?.completed;
                                    const val = log?.value ?? 0;
                                    const isToday = isSameDay(day, new Date());
                                    const isPast = day < startOfDay(new Date());
                                    
                                    return (
                                        <Popover key={dateStr}>
                                            <PopoverTrigger asChild>
                                                <div 
                                                    className={cn(
                                                        "h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10",
                                                        isCompleted ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.3)]" : 
                                                        (isPast ? "bg-red-500/20 border border-red-500/30" : "bg-muted border border-muted-foreground/10 hover:bg-muted-foreground/20"),
                                                        isToday && !isCompleted && "ring-1 ring-primary ring-offset-1"
                                                    )}
                                                />
                                            </PopoverTrigger>
                                            <PopoverContent side="top" className="w-auto p-2 text-xs">
                                                <div className="font-semibold">{format(day, "PPP")}</div>
                                                <div className={cn(
                                                    "font-medium flex items-center gap-2",
                                                    isCompleted ? "text-green-600" : (isPast ? "text-red-500" : "text-muted-foreground")
                                                )}>
                                                    {isCompleted ? `Completed (Score: ${val})` : (isPast ? "Missed" : "Not completed yet")}
                                                </div>
                                                <div className="mt-2 space-y-2">
                                                    {!isCompleted && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => (
                                                                <Button 
                                                                    key={v}
                                                                    size="icon" 
                                                                    variant="outline" 
                                                                    className="h-5 w-5 text-[9px]"
                                                                    onClick={() => toggleHabitLog(habit.id, dateStr, true, v)}
                                                                >
                                                                    {v}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-6 w-full text-[10px] px-1"
                                                        onClick={() => toggleHabitLog(habit.id, dateStr, !isCompleted, isCompleted ? undefined : 0)}
                                                    >
                                                        {isCompleted ? "Unmark" : "Mark as Done (0)"}
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-none flex flex-col items-center gap-3 w-full lg:w-[200px] justify-center shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 self-center">
                        <div className="w-full flex flex-col gap-2">
                            {isDoneToday ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">Today&apos;s Score</span>
                                            <span className="text-xl font-black text-green-600 dark:text-green-500">
                                                {habit.logs?.find(l => l.date === todayDate)?.value ?? 0}
                                            </span>
                                        </div>
                                        <CheckCircle2 className="h-6 w-6 text-green-500 opacity-50" />
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-8 gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => toggleHabitLog(habit.id, todayDate, false)}
                                    >
                                        <History className="h-3 w-3" /> Unmark Today
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center mb-1">
                                        Mark Today&apos;s Progress
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
                                            <Button
                                                key={val}
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-full text-xs font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                                                onClick={() => toggleHabitLog(habit.id, todayDate, true, val)}
                                            >
                                                {val}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t w-full justify-center">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                    onClick={() => deleteHabit(habit.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
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

