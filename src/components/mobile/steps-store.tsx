"use client";

import { useState } from "react";
import { useSteps } from "@/hooks/useSteps";
import { TerminalCommand } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronRight, Copy, Terminal, Layers, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MobileStepsStore() {
  const { 
    steps, 
    searchQuery, 
    setSearchQuery, 
    addStep, 
    isLoading 
  } = useSteps();

  const [selectedStep, setSelectedStep] = useState<TerminalCommand | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCommand, setNewCommand] = useState("");

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addStep({
      title: newTitle,
      command: newCommand,
      description: "",
      category: "General",
      tags: [],
      variables: [],
      steps: newCommand ? [{ order: 1, instruction: "Run command", command: newCommand }] : [],
      os: 'all'
    });
    setNewTitle("");
    setNewCommand("");
    setIsAddOpen(false);
  };

  if (selectedStep) {
    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => setSelectedStep(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="font-semibold text-sm truncate">{selectedStep.title}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                {selectedStep.description && (
                    <p className="text-sm text-muted-foreground">{selectedStep.description}</p>
                )}

                <div className="space-y-4">
                    {selectedStep.steps?.map((step, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                    {i + 1}
                                </Badge>
                                {step.instruction}
                            </div>
                            {step.command && (
                                <div className="relative group">
                                    <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto border">
                                        {step.command}
                                    </pre>
                                    <Button 
                                        size="icon" 
                                        variant="secondary" 
                                        className="absolute top-1 right-1 h-7 w-7 opacity-80"
                                        onClick={() => {
                                            navigator.clipboard.writeText(step.command || "");
                                            toast.success("Copied");
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {(!selectedStep.steps || selectedStep.steps.length === 0) && selectedStep.command && (
                         <div className="relative group">
                            <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto border">
                                {selectedStep.command}
                            </pre>
                            <Button 
                                size="icon" 
                                variant="secondary" 
                                className="absolute top-1 right-1 h-7 w-7 opacity-80"
                                onClick={() => {
                                    navigator.clipboard.writeText(selectedStep.command || "");
                                    toast.success("Copied");
                                }}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
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
            placeholder="Search steps..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={() => setIsAddOpen(true)} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading steps...</div>
        ) : steps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No steps found</p>
            </div>
        ) : (
            steps.map((step) => (
                <Card 
                    key={step.id} 
                    className="p-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedStep(step)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg shrink-0">
                            {step.steps && step.steps.length > 1 ? (
                                <Layers className="h-5 w-5 text-slate-500" />
                            ) : (
                                <Terminal className="h-5 w-5 text-slate-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{step.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                                {step.description || (step.steps?.length ? `${step.steps.length} steps` : "Single command")}
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </Card>
            ))
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0">
            <DialogHeader>
                <DialogTitle>Quick Step</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Input 
                    placeholder="Title" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                />
                <Input 
                    placeholder="Command (optional)" 
                    value={newCommand} 
                    onChange={(e) => setNewCommand(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button onClick={handleAdd} className="w-full">Create</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
