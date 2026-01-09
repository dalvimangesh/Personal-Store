"use client";

import { useEffect, useState, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Terminal, Layers, AlertTriangle, Copy, Apple, Monitor, Command, ChevronRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { TerminalCommand } from "@/types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function PublicTerminalCategoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ name: string; author: string; commands: TerminalCommand[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const fetchPublicCategory = async () => {
      try {
        const res = await fetch(`/api/public/terminal/category/${token}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          // Initialize variables for all commands
          const initialValues: Record<string, Record<string, string>> = {};
          result.data.commands.forEach((cmd: any) => {
              const cmdVars: Record<string, string> = {};
              cmd.variables?.forEach((v: any) => {
                  cmdVars[v.name] = v.defaultValue || "";
              });
              initialValues[cmd.id] = cmdVars;
          });
          setVariableValues(initialValues);
        } else {
          setError(result.error || "Failed to load category");
        }
      } catch (err) {
        setError("An error occurred while fetching the category");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCategory();
  }, [token]);

  const interpolate = (cmdId: string, text: string) => {
    if (!text) return "";
    let result = text;
    const values = variableValues[cmdId] || {};
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    return result;
  };

  const copyToClipboard = (cmdId: string, text: string) => {
    const final = interpolate(cmdId, text);
    navigator.clipboard.writeText(final);
    toast.success("Copied to clipboard");
  };

  const handleCopyAll = (cmd: TerminalCommand) => {
      if (!cmd.steps) return;
      const allCommands = cmd.steps
          .filter(s => s.command)
          .map(s => interpolate(cmd.id, s.command!))
          .join(" && \\\n");
      
      navigator.clipboard.writeText(allCommands);
      toast.success("All commands copied as script");
  };

  const getOsIcon = (osType: string) => {
    switch (osType) {
      case 'mac': return <Apple className="h-4 w-4" />;
      case 'linux': return <Terminal className="h-4 w-4" />;
      case 'windows': return <Monitor className="h-4 w-4" />; 
      default: return <Command className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading shared category...</p>
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-8 md:space-y-10">
        
        {/* Header */}
        <div className="space-y-4 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3 text-foreground">
                <FolderOpen className="h-8 w-8 text-muted-foreground/80" />
                {data.name}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
                {data.commands.length} commands available
            </p>
        </div>

        {/* Commands List */}
        <div className="space-y-6">
            <Accordion type="multiple" className="space-y-4">
                {data.commands.map((cmd) => (
                    <AccordionItem key={cmd.id} value={cmd.id} className="bg-card border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <AccordionTrigger className="hover:no-underline py-5 px-6">
                             <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left w-full">
                                <div className="flex flex-col items-start gap-1.5 flex-1 min-w-0">
                                    <span className="font-semibold text-lg md:text-xl truncate w-full pr-4">{cmd.title}</span>
                                    {cmd.description && (
                                        <span className="text-sm text-muted-foreground font-normal line-clamp-1 text-left w-full pr-4">{cmd.description}</span>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0 self-start sm:self-center">
                                    <Badge variant="secondary" className="gap-1.5 font-medium px-2.5 py-1">
                                        {getOsIcon(cmd.os)}
                                        <span className="capitalize">{cmd.os}</span>
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 border-t bg-muted/5">
                            <div className="space-y-8">
                                {/* Variable Inputs */}
                                {cmd.variables.length > 0 && (
                                    <div className="bg-background border rounded-lg p-5 shadow-sm space-y-4">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            Parameters
                                        </Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {cmd.variables.map(variable => (
                                                <div key={variable.name} className="space-y-2">
                                                    <Label className="text-xs font-semibold flex items-center justify-between">
                                                        <span>{variable.name}</span>
                                                    </Label>
                                                    <Input 
                                                        value={variableValues[cmd.id]?.[variable.name] || ""} 
                                                        onChange={(e) => setVariableValues(prev => ({
                                                            ...prev, 
                                                            [cmd.id]: { ...prev[cmd.id], [variable.name]: e.target.value }
                                                        }))}
                                                        placeholder={variable.defaultValue || `Enter ${variable.name}...`}
                                                        className="h-9 bg-background focus-visible:ring-1"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                 {/* Steps */}
                                 <div className="space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            {cmd.steps.length > 1 ? <Layers className="h-4 w-4 text-primary" /> : <Terminal className="h-4 w-4 text-primary" />}
                                            {cmd.steps.length > 1 ? "Process Steps" : "Command Execution"}
                                        </div>
                                        {cmd.steps.length > 1 && (
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCopyAll(cmd); }} className="h-8 text-xs font-medium self-start sm:self-auto hover:bg-primary hover:text-primary-foreground transition-colors">
                                                <Copy className="h-3.5 w-3.5 mr-2" /> Copy All (Script)
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        {cmd.steps.map((step, idx) => (
                                            <div key={idx} className={`relative pb-6 last:pb-0 ${cmd.steps.length > 1 ? "pl-8 md:pl-10 border-l-2 border-muted/60 last:border-0 ml-2" : ""}`}>
                                                {cmd.steps.length > 1 && (
                                                    <div className="absolute -left-[9px] top-0 h-5 w-5 rounded-full bg-primary text-[11px] font-bold text-primary-foreground flex items-center justify-center shadow-sm ring-4 ring-background">
                                                        {idx + 1}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {step.instruction && (
                                                        <p className="text-sm md:text-base font-medium text-foreground/90 leading-relaxed">
                                                            {interpolate(cmd.id, step.instruction)}
                                                        </p>
                                                    )}
                                                    
                                                    {step.warning && (
                                                        <div className="text-xs md:text-sm bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg flex items-start gap-3 border border-yellow-200/50 dark:border-yellow-800/30">
                                                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                                                            <span className="leading-snug">{interpolate(cmd.id, step.warning)}</span>
                                                        </div>
                                                    )}

                                                    {step.command && (
                                                        <div className="relative group rounded-lg overflow-hidden border border-input/40 shadow-sm">
                                                                <pre className="bg-[#1e1e1e] text-[#e4e4e4] p-4 font-mono text-xs md:text-sm overflow-x-auto whitespace-pre-wrap break-all leading-relaxed selection:bg-primary/30">
                                                                {interpolate(cmd.id, step.command)}
                                                            </pre>
                                                            <Button 
                                                                size="icon" 
                                                                variant="secondary" 
                                                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm"
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(cmd.id, step.command!); }}
                                                                title="Copy code"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>

        <div className="text-center pt-12 pb-6 border-t">
            {(data as any).author && (
                 <p className="text-sm text-muted-foreground pb-2">
                    Shared by <span className="font-semibold text-foreground">{(data as any).author}</span>
                 </p>
            )}
            <p className="text-xs text-muted-foreground font-medium">
                Powered by Personal Store &bull; Developer Tools
            </p>
        </div>
      </div>
    </div>
  );
}
