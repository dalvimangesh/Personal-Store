"use client";

import { useEffect, useState, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Terminal, Layers, AlertTriangle, Copy, Apple, Monitor, Command, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { TerminalCommand } from "@/types";

export default function PublicTerminalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<TerminalCommand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPublicCommand = async () => {
      try {
        const res = await fetch(`/api/public/steps/${token}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          // Initialize variables
          const initialValues: Record<string, string> = {};
          result.data.variables?.forEach((v: any) => {
            initialValues[v.name] = v.defaultValue || "";
          });
          setVariableValues(initialValues);
        } else {
          setError(result.error || "Failed to load command");
        }
      } catch (err) {
        setError("An error occurred while fetching the command");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCommand();
  }, [token]);

  const interpolate = (text: string) => {
    if (!text) return "";
    let result = text;
    Object.entries(variableValues).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    return result;
  };

  const copyToClipboard = (text: string) => {
    const final = interpolate(text);
    navigator.clipboard.writeText(final);
    toast.success("Copied to clipboard");
  };

  const handleCopyAll = () => {
      if (!data || !data.steps) return;
      const allCommands = data.steps
          .filter(s => s.command)
          .map(s => interpolate(s.command!))
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
        <p className="text-muted-foreground animate-pulse">Loading shared command...</p>
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
            The shared command might have been deleted or set to private by the owner.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-4 text-center">
            {/* <Badge variant="outline" className="mb-2">Shared Terminal Command</Badge> */}
            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
                {data.title}
            </h1>
            {data.description && (
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    {data.description}
                </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
                 <Badge variant="secondary" className="gap-1 font-normal">
                    {getOsIcon(data.os)}
                    <span className="capitalize">{data.os}</span>
                </Badge>
                {data.tags.map(tag => (
                    <span key={tag} className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">#{tag}</span>
                ))}
            </div>
            {/* {(data as any).author && (
                 <p className="text-xs text-muted-foreground pt-2">
                    Shared by <span className="font-medium text-foreground">{(data as any).author}</span>
                 </p>
            )} */}
        </div>

        {/* Variable Inputs */}
        {data.variables.length > 0 && (
            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b pb-2">
                    <Settings2 className="h-4 w-4" />
                    Parameter Configuration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.variables.map(variable => (
                        <div key={variable.name} className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center justify-between">
                                <span>{variable.name}</span>
                                {variable.description && (
                                    <span className="text-[10px] text-muted-foreground font-normal">{variable.description}</span>
                                )}
                            </Label>
                            <Input 
                                value={variableValues[variable.name] || ""} 
                                onChange={(e) => setVariableValues(prev => ({...prev, [variable.name]: e.target.value}))}
                                placeholder={variable.defaultValue || `Enter ${variable.name}...`}
                                className="h-9 bg-background"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Content Display */}
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            <div className="p-6 space-y-6">
                 {data.steps && data.steps.length > 0 ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                {data.steps.length > 1 ? <Layers className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                                {data.steps.length > 1 ? "Process Steps" : "Command Execution"}
                            </div>
                            {data.steps.length > 1 && (
                                <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-7 text-xs">
                                    <Copy className="h-3 w-3 mr-2" /> Copy All (Script)
                                </Button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {data.steps.map((step, idx) => (
                                <div key={idx} className={`relative pb-4 last:pb-0 ${data.steps.length > 1 ? "pl-8 border-l-2 border-muted last:border-0" : ""}`}>
                                    {data.steps.length > 1 && (
                                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {step.instruction && (
                                            <p className="text-sm font-medium">
                                                {interpolate(step.instruction)}
                                            </p>
                                        )}
                                        
                                        {step.warning && (
                                            <div className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded flex items-start gap-2">
                                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                                {interpolate(step.warning)}
                                            </div>
                                        )}

                                        {step.command && (
                                            <div className="relative group">
                                                 <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all border border-input/20">
                                                    {interpolate(step.command)}
                                                </pre>
                                                <Button 
                                                    size="icon" 
                                                    variant="secondary" 
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => copyToClipboard(step.command!)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Fallback for empty or legacy
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Terminal className="h-4 w-4" />
                                Command
                            </Label>
                            <Button size="sm" onClick={() => copyToClipboard(data.command || "")} className={!interpolate(data.command || "") ? "opacity-50" : ""}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Command
                            </Button>
                        </div>
                        <div className="relative group">
                            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all shadow-inner border border-input/20 min-h-[80px] flex items-center">
                                {interpolate(data.command || "") || <span className="text-muted-foreground/30 italic">Command will appear here...</span>}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="text-center pt-8">
            {(data as any).author && (
                 <p className="text-xs text-muted-foreground pb-2">
                    Shared by <span className="font-medium text-foreground">{(data as any).author}</span>
                 </p>
            )}
            <p className="text-xs text-muted-foreground">
                Powered by Personal Store &bull; Developer Tools
            </p>
        </div>
      </div>
    </div>
  );
}
