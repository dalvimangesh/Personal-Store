"use client";

import { useEffect, useState, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle2, PlayCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import { Todo } from "@/types";

export default function PublicTodoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ name: string; items: Todo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicTodos = async () => {
      try {
        const res = await fetch(`/api/public/todos/${token}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load todos");
        }
      } catch (err) {
        setError("An error occurred while fetching the todos");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTodos();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading shared tasks...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full">
            <Badge variant="destructive" className="text-lg py-1 px-4">Error</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{error || "Link not found"}</h1>
        <p className="text-muted-foreground max-w-md">
            The shared category might have been deleted or set to private by the owner.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2 text-center">
          <Badge variant="outline" className="mb-2">Shared TODO Category</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            {data.name}
          </h1>
          <p className="text-muted-foreground">
            {data.items.length} tasks shared with you
          </p>
        </div>

        <div className="grid gap-4">
          {data.items.length === 0 ? (
            <Card className="border-dashed bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No tasks in this category yet.</p>
              </CardContent>
            </Card>
          ) : (
            data.items.map((todo) => (
              <Card key={todo.id} className={cn(
                  "transition-all hover:shadow-md",
                  todo.status === 'completed' ? "opacity-75 bg-muted/50" : ""
              )}>
                <CardHeader className="p-4 flex flex-row items-start gap-4 space-y-0">
                  <div className="pt-1">
                      {todo.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                       todo.status === 'in_progress' ? <PlayCircle className="h-5 w-5 text-blue-500" /> :
                       <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className={cn(
                          "text-base",
                          todo.status === 'completed' ? "line-through text-muted-foreground" : ""
                      )}>
                        {todo.title}
                      </CardTitle>
                      <Badge variant={todo.priority > 5 ? "destructive" : "secondary"} className="text-[10px] h-5">
                        Priority {todo.priority}
                      </Badge>
                    </div>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {todo.description}
                      </p>
                    )}
                    <div className="flex gap-3 pt-1">
                         {todo.startDate && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" />
                                <span>Started {format(new Date(todo.startDate), "MMM d, yyyy")}</span>
                            </div>
                        )}
                        {todo.deadline && (
                            <div className={cn(
                                "flex items-center gap-1 text-[11px]",
                                new Date(todo.deadline) < new Date() && todo.status !== 'completed' ? "text-destructive font-medium" : "text-muted-foreground"
                            )}>
                                <Clock className="h-3 w-3" />
                                <span>Due {format(new Date(todo.deadline), "MMM d, yyyy")}</span>
                            </div>
                        )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <div className="text-center pt-8">
            <p className="text-xs text-muted-foreground">
                Powered by Personal Store &bull; Created for productivity
            </p>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}

