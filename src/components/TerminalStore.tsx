import { useState, useMemo, useEffect } from "react";
import { TerminalCommand, CommandVariable, CommandStep } from "@/types";
import { useTerminalCommands } from "@/hooks/useTerminalCommands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, Copy, Trash2, Edit, Plus, Search, 
  Monitor, Apple, Command, ChevronRight, ChevronDown,
  Settings2, Play, Hash, FolderOpen, Save, X, Layers, AlertTriangle, ArrowRight,
  ArrowLeft, Share2, Globe, UserPlus, UserMinus, Shield, ExternalLink, Download,
  Check, ChevronsUpDown
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command as CommandPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TerminalStoreProps {
  searchQuery?: string;
  isPrivacyMode?: boolean;
}

export function TerminalStore({ searchQuery = "", isPrivacyMode = false }: TerminalStoreProps) {
  const { 
    commands, 
    addCommand, 
    updateCommand, 
    deleteCommand, 
    isLoading,
    categoryConfigs,
    refresh 
  } = useTerminalCommands();

  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'create'>('view');
  
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [openCategory, setOpenCategory] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  
  // Share State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCategoryMode, setShareCategoryMode] = useState(false); // if true, sharing category
  const [shareTargetName, setShareTargetName] = useState(""); // command title or category name
  const [shareUsername, setShareUsername] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  
  // Category public state
  const currentCategoryConfig = useMemo(() => {
    if (!shareCategoryMode || !shareTargetName) return null;
    return categoryConfigs.find((c: any) => c.name === shareTargetName) || null;
  }, [categoryConfigs, shareCategoryMode, shareTargetName]);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    os: 'linux' | 'mac' | 'windows' | 'all';
    tags: string;
    variables: CommandVariable[];
    steps: CommandStep[]; 
  }>({
    title: "",
    description: "",
    category: "General",
    os: "all",
    tags: "",
    variables: [],
    steps: []
  });

  // Filter Logic
  const filteredCommands = useMemo(() => {
    let result = commands;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(q) || 
        (c.command && c.command.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [commands, searchQuery]);

  // Group by Category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, TerminalCommand[]> = {};
    filteredCommands.forEach(cmd => {
      const cat = cmd.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const selectedCommand = useMemo(() => 
    commands.find(c => c.id === selectedCommandId) || null
  , [commands, selectedCommandId]);

  // Initialize variable values when selecting a command
  useEffect(() => {
    if (selectedCommand) {
      const initialValues: Record<string, string> = {};
      selectedCommand.variables.forEach(v => {
        initialValues[v.name] = v.defaultValue || "";
      });
      setVariableValues(initialValues);
    } else {
      setVariableValues({});
    }
  }, [selectedCommand]);

  const handleOpenAdd = () => {
    setViewMode('create');
    setSelectedCommandId(null);
    setFormData({
      title: "",
      description: "",
      category: "General",
      os: "all",
      tags: "",
      variables: [],
      steps: [{ order: 1, instruction: "", command: "", warning: "" }]
    });
  };

  const handleOpenEdit = (cmd: TerminalCommand) => {
    setViewMode('edit');
    // Normalize steps: if legacy command exists, convert to one step.
    let steps = cmd.steps && cmd.steps.length > 0 ? [...cmd.steps] : [];
    if (steps.length === 0 && cmd.command) {
        steps = [{ order: 1, instruction: "Execute command", command: cmd.command, warning: "" }];
    } else if (steps.length === 0) {
        steps = [{ order: 1, instruction: "", command: "", warning: "" }];
    }

    setFormData({
      title: cmd.title,
      description: cmd.description,
      category: cmd.category || "General",
      os: cmd.os,
      tags: cmd.tags.join(", "),
      variables: [...cmd.variables],
      steps: steps
    });
  };

  const handleCancelForm = () => {
    setViewMode('view');
    // If we were creating, clear selection. If editing, keep selection.
    if (!selectedCommandId) {
       setSelectedCommandId(null);
    }
  };

  // Auto-detect variables from command string
  const detectVariables = (text: string) => {
    const regex = /{{([^}]+)}}/g;
    const matches = [...text.matchAll(regex)];
    const detectedNames = Array.from(new Set(matches.map(m => m[1].trim())));
    
    // Merge with existing to preserve descriptions/defaults
    const currentVars = formData.variables;
    const newVars: CommandVariable[] = detectedNames.map(name => {
      const existing = currentVars.find(v => v.name === name);
      return existing || { name, description: "", defaultValue: "" };
    });
    
    const existingNames = new Set(currentVars.map(v => v.name));
    const toAdd = newVars.filter(v => !existingNames.has(v.name));
    
    if (toAdd.length > 0) {
        setFormData(prev => ({ ...prev, variables: [...prev.variables, ...toAdd] }));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (formData.steps.some(s => !s.instruction.trim())) {
        toast.error("All steps must have instructions");
        return;
    }

    const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(Boolean);
    const commandData: any = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      os: formData.os,
      tags: tagsArray,
      variables: formData.variables,
      command: "", // Clear legacy field
      steps: formData.steps.map((s, idx) => ({ ...s, order: idx + 1 }))
    };

    let success = false;

    if (viewMode === 'edit' && selectedCommandId) {
      success = await updateCommand(selectedCommandId, commandData);
      if (success) {
          toast.success("Command updated");
      }
    } else {
      success = await addCommand(commandData);
      if (success) {
          toast.success("Command added");
      }
    }

    if (success) {
      setViewMode('view');
    } else {
      toast.error("Failed to save command");
    }
  };

  // Interpolate Logic
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

  const getOsIcon = (osType: string) => {
    switch (osType) {
      case 'mac': return <Apple className="h-4 w-4" />;
      case 'linux': return <Terminal className="h-4 w-4" />;
      case 'windows': return <Monitor className="h-4 w-4" />; 
      default: return <Command className="h-4 w-4" />;
    }
  };

  const handleShareAction = async (action: 'add' | 'remove' | 'leave' | 'public_toggle' | 'share_category' | 'unshare_category', specificUsername?: string) => {
      setIsSharing(true);
      try {
          const body: any = { action };
          const userToUse = specificUsername || shareUsername;
          
          if (shareCategoryMode) {
              body.categoryName = shareTargetName;
              body.username = userToUse;
          } else {
              if (!selectedCommandId) return;
              body.commandId = selectedCommandId;
              body.username = userToUse;
          }

          const res = await fetch("/api/terminal/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
          });
          
          const data = await res.json();

          if (res.ok) {
              toast.success("Share settings updated");
              if (action === 'add' || action === 'remove' || action === 'share_category' || action === 'unshare_category') {
                  setShareUsername("");
              }
              // Refresh data to reflect changes
              await refresh();
          } else {
              toast.error(data.error || "Failed to update share settings");
          }
      } catch (error) {
          toast.error("Error updating share settings");
      } finally {
          setIsSharing(false);
      }
  };

  const handleCopyAll = () => {
      if (!selectedCommand || !selectedCommand.steps) return;
      const allCommands = selectedCommand.steps
          .filter(s => s.command)
          .map(s => interpolate(s.command!))
          .join(" && \\\n");
      
      navigator.clipboard.writeText(allCommands);
      toast.success("All commands copied as script");
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Sidebar - List */}
      <div className={cn(
          "w-full md:w-[260px] flex-col shrink-0 transition-all duration-200",
          (selectedCommandId || viewMode !== 'view') ? "hidden md:flex" : "flex"
      )}>
        <div className="pb-3 px-1 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                <Terminal className="h-4 w-4" />
                Library
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
        
        <ScrollArea className="flex-1">
            <div className="pr-3">
                {isLoading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">Loading...</div>
                ) : Object.keys(groupedCommands).length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                        No commands found.
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={Object.keys(groupedCommands)} className="w-full space-y-1">
                        {Object.entries(groupedCommands).map(([category, cmds]) => (
                            <AccordionItem key={category} value={category} className="border-none">
                                <div className="flex items-center group/cat hover:bg-muted/50 rounded-md pr-2 transition-colors">
                                    <AccordionTrigger className="py-1.5 px-2 hover:bg-transparent hover:no-underline rounded-md text-sm font-medium text-muted-foreground hover:text-foreground flex-1">
                                        <span className="flex items-center gap-2">
                                            <FolderOpen className="h-3.5 w-3.5" />
                                            {category}
                                        </span>
                                    </AccordionTrigger>
                                    <div 
                                        className="opacity-0 group-hover/cat:opacity-100 transition-opacity"
                                    >
                                        <Button
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShareCategoryMode(true);
                                                setShareTargetName(category);
                                                setShareDialogOpen(true);
                                            }}
                                            title="Share Category"
                                        >
                                            <Share2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <AccordionContent className="pb-0 pt-0.5">
                                    <div className="flex flex-col gap-0.5 ml-2 border-l pl-2">
                                        {cmds.map(cmd => (
                                            <button
                                                key={cmd.id}
                                                onClick={() => {
                                                    setSelectedCommandId(cmd.id);
                                                    setViewMode('view');
                                                }}
                                                className={cn(
                                                    "text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between group w-full",
                                                    selectedCommandId === cmd.id 
                                                        ? "bg-accent text-accent-foreground font-medium" 
                                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                     {cmd.steps && cmd.steps.length > 1 ? (
                                                         <Layers className="h-3 w-3 shrink-0 opacity-70" />
                                                     ) : (
                                                         <Terminal className="h-3 w-3 shrink-0 opacity-70" />
                                                     )}
                                                    <span className={`truncate ${isPrivacyMode ? 'blur-[2px] hover:blur-none transition-all' : ''}`}>
                                                        {cmd.title}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </ScrollArea>
      </div>

      {/* Main Content - Detail */}
      <div className={cn(
          "flex-1 flex-col bg-card border rounded-lg overflow-hidden shadow-sm",
          (!selectedCommandId && viewMode === 'view') ? "hidden md:flex" : "flex"
      )}>
        {viewMode === 'create' || viewMode === 'edit' ? (
           <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-200">
             <div className="flex items-center justify-between p-6 border-b">
               <div className="flex items-center gap-3">
                   <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                       <ArrowLeft className="h-4 w-4" />
                   </Button>
                   <div>
                       <h2 className="text-lg font-semibold tracking-tight">
                           {viewMode === 'edit' ? "Edit Command" : "New Command"}
                       </h2>
                       <p className="text-sm text-muted-foreground">
                           Configure your command template and parameters. Use <code className="bg-muted px-1 rounded">{`{{variable}}`}</code> syntax.
                       </p>
                   </div>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleCancelForm}>Cancel</Button>
                   <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save</Button>
               </div>
             </div>
             
             <ScrollArea className="flex-1">
               <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                   {/* Basic Info */}
                   <div className="grid gap-6 grid-cols-2">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input 
                                value={formData.title} 
                                onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                                placeholder="e.g. Interactive Rebase" 
                                className="font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Category</Label>
                             <Popover open={openCategory} onOpenChange={setOpenCategory}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCategory}
                                        className="w-full justify-between font-normal"
                                    >
                                        {formData.category || "Select category..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                    <CommandPrimitive>
                                        <CommandInput 
                                            placeholder="Search or create category..." 
                                            value={categorySearch}
                                            onValueChange={setCategorySearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="flex flex-col items-center justify-center p-2">
                                                    <p className="text-sm text-muted-foreground mb-2">No category found.</p>
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="w-full"
                                                        onClick={() => {
                                                            setFormData(prev => ({...prev, category: categorySearch}));
                                                            setOpenCategory(false);
                                                        }}
                                                    >
                                                        Create "{categorySearch}"
                                                    </Button>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {Object.keys(groupedCommands).map((category) => (
                                                    <CommandItem
                                                        key={category}
                                                        value={category}
                                                        onSelect={() => {
                                                            setFormData(prev => ({...prev, category: category}));
                                                            setOpenCategory(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.category === category ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {category}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </CommandPrimitive>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Steps Editor - Replaced Tabs */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Steps & Commands</Label>
                        </div>
                        <div className="space-y-4">
                            {formData.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-start border p-4 rounded-lg bg-card shadow-sm">
                                    <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold mt-1">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input 
                                                    placeholder="Command (Optional)" 
                                                    value={step.command}
                                                    onChange={(e) => {
                                                        const newSteps = [...formData.steps];
                                                        newSteps[idx].command = e.target.value;
                                                        setFormData(prev => ({...prev, steps: newSteps}));
                                                    }}
                                                    onBlur={(e) => detectVariables(e.target.value)}
                                                    className="font-mono text-xs w-full"
                                                />
                                                <Input 
                                                    placeholder="Warning/Note (Optional)" 
                                                    value={step.warning}
                                                    onChange={(e) => {
                                                        const newSteps = [...formData.steps];
                                                        newSteps[idx].warning = e.target.value;
                                                        setFormData(prev => ({...prev, steps: newSteps}));
                                                    }}
                                                    className="text-yellow-600 dark:text-yellow-400 placeholder:text-yellow-600/50 w-full"
                                                />
                                            </div>
                                            <Input 
                                                placeholder="Instruction (e.g. Start the rebase)" 
                                                value={step.instruction}
                                                onChange={(e) => {
                                                    const newSteps = [...formData.steps];
                                                    newSteps[idx].instruction = e.target.value;
                                                    setFormData(prev => ({...prev, steps: newSteps}));
                                                }}
                                                onBlur={(e) => detectVariables(e.target.value)}
                                                className="font-medium w-full"
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                                        onClick={() => {
                                            const newSteps = formData.steps.filter((_, i) => i !== idx);
                                            setFormData(prev => ({...prev, steps: newSteps}));
                                        }}
                                        disabled={formData.steps.length === 1}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-dashed"
                                onClick={() => setFormData(prev => ({
                                    ...prev, 
                                    steps: [...prev.steps, { order: prev.steps.length + 1, instruction: "", command: "", warning: "" }]
                                }))}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Step
                            </Button>
                        </div>
                    </div>

                    {/* Variable Configuration */}
                    {formData.variables.length > 0 && (
                        <div className="space-y-4 bg-muted/30 p-6 rounded-lg border">
                            <Label className="flex items-center gap-2 text-base font-semibold">
                                <Settings2 className="h-4 w-4" />
                                Parameter Settings
                            </Label>
                            <div className="space-y-3">
                                {formData.variables.map((v, idx) => (
                                    <div key={v.name} className="grid grid-cols-12 gap-3 items-start">
                                        <div className="col-span-12 md:col-span-3 pt-2">
                                            <Badge variant="outline" className="font-mono text-xs px-2 py-1">{v.name}</Badge>
                                        </div>
                                        <div className="col-span-6 md:col-span-4">
                                            <Input 
                                                placeholder="Default Value" 
                                                value={v.defaultValue}
                                                onChange={(e) => {
                                                    const newVars = [...formData.variables];
                                                    newVars[idx].defaultValue = e.target.value;
                                                    setFormData(prev => ({...prev, variables: newVars}));
                                                }}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-5 flex gap-2">
                                            <Input 
                                                placeholder="Description" 
                                                value={v.description}
                                                onChange={(e) => {
                                                    const newVars = [...formData.variables];
                                                    newVars[idx].description = e.target.value;
                                                    setFormData(prev => ({...prev, variables: newVars}));
                                                }}
                                                className="h-9 text-sm flex-1"
                                            />
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    const newVars = formData.variables.filter((_, i) => i !== idx);
                                                    setFormData(prev => ({...prev, variables: newVars}));
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="grid gap-6 grid-cols-2">
                        <div className="space-y-2">
                            <Label>Operating System</Label>
                            <Select value={formData.os} onValueChange={(v: any) => setFormData(prev => ({...prev, os: v}))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any / All</SelectItem>
                                    <SelectItem value="linux">Linux</SelectItem>
                                    <SelectItem value="mac">macOS</SelectItem>
                                    <SelectItem value="windows">Windows</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <Input 
                                value={formData.tags} 
                                onChange={(e) => setFormData(prev => ({...prev, tags: e.target.value}))}
                                placeholder="git, cli, setup" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                            placeholder="What does this command do? When should it be used?"
                            className="h-24 resize-none"
                        />
                    </div>
               </div>
             </ScrollArea>
           </div>
        ) : selectedCommand ? (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b bg-card">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="md:hidden -ml-2 h-8 w-8" 
                                onClick={() => setSelectedCommandId(null)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className={`text-xl font-semibold tracking-tight ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all' : ''}`}>
                                {selectedCommand.title}
                            </h2>
                            <Badge variant="secondary" className="gap-1 font-normal">
                                {getOsIcon(selectedCommand.os)}
                                <span className="capitalize">{selectedCommand.os}</span>
                            </Badge>
                            {selectedCommand.steps && selectedCommand.steps.length > 1 && (
                                <Badge variant="outline" className="text-muted-foreground bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                    Process Guide
                                </Badge>
                            )}
                        </div>
                        {selectedCommand.description && (
                            <p className={`text-sm text-muted-foreground ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all' : ''}`}>
                                {selectedCommand.description}
                            </p>
                        )}
                        <div className="flex gap-2 pt-1">
                            {selectedCommand.tags.map(tag => (
                                <span key={tag} className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">#{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                            setShareCategoryMode(false);
                            setShareTargetName(selectedCommand.title);
                            setShareDialogOpen(true);
                        }}>
                            <Share2 className="h-4 w-4 mr-2" /> Share
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(selectedCommand)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                                if(confirm("Delete this command?")) {
                                    await deleteCommand(selectedCommand.id);
                                    setSelectedCommandId(null);
                                    toast.success("Command deleted");
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/5">
                    {/* Variable Inputs */}
                    {selectedCommand.variables.length > 0 && (
                        <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <Settings2 className="h-4 w-4" />
                                Configuration
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedCommand.variables.map(variable => (
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
                                            className="h-8 bg-background"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content Display */}
                    {selectedCommand.steps && selectedCommand.steps.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    {selectedCommand.steps.length > 1 ? <Layers className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                                    {selectedCommand.steps.length > 1 ? "Process Steps" : "Command Execution"}
                                </div>
                                {selectedCommand.steps.length > 1 && (
                                    <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-7 text-xs">
                                        <Copy className="h-3 w-3 mr-2" /> Copy All (Script)
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {selectedCommand.steps.map((step, idx) => (
                                    <div key={idx} className={`relative pb-4 last:pb-0 ${selectedCommand.steps.length > 1 ? "pl-8 border-l-2 border-muted last:border-0" : ""}`}>
                                        {selectedCommand.steps.length > 1 && (
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                                {idx + 1}
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            {step.instruction && (
                                                <p className={`text-sm font-medium ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all' : ''}`}>
                                                    {interpolate(step.instruction)}
                                                </p>
                                            )}
                                            
                                            {step.warning && (
                                                <div className={`text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded flex items-start gap-2 ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all' : ''}`}>
                                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                                    {interpolate(step.warning)}
                                                </div>
                                            )}

                                            {step.command && (
                                                <div className="relative group">
                                                     <pre className={`bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all border border-input/20 ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
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
                        <div className="space-y-3">
                            {/* Fallback for old simple commands (shouldn't really hit if normalized) */}
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Terminal className="h-4 w-4" />
                                    Command
                                </Label>
                                <Button size="sm" onClick={() => copyToClipboard(selectedCommand.command || "")} className={!interpolate(selectedCommand.command || "") ? "opacity-50" : ""}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Command
                                </Button>
                            </div>
                            <div className="relative group">
                                <pre className={`bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all shadow-inner border border-input/20 min-h-[80px] flex items-center ${isPrivacyMode ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}>
                                    {interpolate(selectedCommand.command || "") || <span className="text-muted-foreground/30 italic">Command will appear here...</span>}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 space-y-4">
                <div className="bg-muted/30 p-6 rounded-full">
                    <Terminal className="h-12 w-12 opacity-20" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="font-semibold text-lg">No Command Selected</h3>
                    <p className="text-sm">Select a command from the library or create a new one.</p>
                </div>
                <Button onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Create Command
                </Button>
            </div>
        )}
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share &quot;{shareTargetName}&quot;</DialogTitle>
                    <DialogDescription>Manage access and public links {shareCategoryMode ? 'for this category' : 'for this command'}.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <Globe className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium">Public Link</h4>
                                    <p className="text-xs text-muted-foreground">Anyone with the link can view this {shareCategoryMode ? 'category' : 'command'}.</p>
                                </div>
                            </div>
                            <Button 
                                variant={
                                    (shareCategoryMode ? currentCategoryConfig?.isPublic : selectedCommand?.isPublic) 
                                    ? "destructive" : "default"
                                } 
                                size="sm" 
                                onClick={() => handleShareAction('public_toggle')} 
                                disabled={isSharing}
                            >
                                {(shareCategoryMode ? currentCategoryConfig?.isPublic : selectedCommand?.isPublic) ? "Disable" : "Enable"}
                            </Button>
                        </div>
                        
                        {/* Command Public Link */}
                        {!shareCategoryMode && selectedCommand?.isPublic && selectedCommand.publicToken && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input readOnly value={`${window.location.origin}/public/terminal/${selectedCommand.publicToken}`} className="text-xs font-mono h-8" />
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/public/terminal/${selectedCommand.publicToken}`);
                                    toast.success("Link copied!");
                                }}><Copy className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => window.open(`${window.location.origin}/public/terminal/${selectedCommand.publicToken}`, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                            {/* Category Public Link */}
                            {shareCategoryMode && currentCategoryConfig?.isPublic && currentCategoryConfig.publicToken && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input readOnly value={`${window.location.origin}/public/terminal/category/${currentCategoryConfig.publicToken}`} className="text-xs font-mono h-8" />
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/public/terminal/category/${currentCategoryConfig.publicToken}`);
                                    toast.success("Link copied!");
                                }}><Copy className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => window.open(`${window.location.origin}/public/terminal/category/${currentCategoryConfig.publicToken}`, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex items-end gap-2">
                            <div className="grid gap-1 w-full">
                                <Label htmlFor="username">Add by username</Label>
                                <Input 
                                    id="username" 
                                    placeholder="username" 
                                    value={shareUsername} 
                                    onChange={(e) => setShareUsername(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleShareAction(shareCategoryMode ? 'share_category' : 'add')} 
                                />
                            </div>
                            <Button onClick={() => handleShareAction(shareCategoryMode ? 'share_category' : 'add')} disabled={isSharing || !shareUsername}>
                                {isSharing ? "..." : <UserPlus className="h-4 w-4" />}
                            </Button>
                        </div>
                        
                        {!shareCategoryMode && (
                            <div className="flex flex-col gap-2 mt-2">
                                <Label>Shared with</Label>
                                {selectedCommand?.sharedWith && selectedCommand.sharedWith.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {selectedCommand.sharedWith.map((user: any) => (
                                            <div key={user.userId} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                        {user.username[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium">{user.username}</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                                                    onClick={() => handleShareAction('remove', user.username)} 
                                                    disabled={isSharing}
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Not shared with anyone yet.</p>
                                )}
                            </div>
                        )}
                        
                         {shareCategoryMode && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded text-sm">
                                <p>Sharing a category will add the user to all <strong>current</strong> commands in this category.</p>
                                <p className="mt-2 text-xs opacity-80">To remove a user from a category, use the &quot;Unshare&quot; action below (requires typing username).</p>
                                <div className="mt-4 flex justify-end">
                                     <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleShareAction('unshare_category')}
                                        disabled={!shareUsername || isSharing}
                                        className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                     >
                                         Unshare from Category
                                     </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
      </Dialog>
    </div>
  );
}
