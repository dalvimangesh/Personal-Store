"use client";

import { useState, useMemo, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Copy, Trash2, Pencil, Menu, Tag, EyeOff, Eye, Shield, Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSnippets } from "@/hooks/useSnippets";
import { Snippet } from "@/types";
import { SmartEditor } from "@/components/SmartEditor";

// Privacy Context
const PrivacyContext = createContext<{
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
});

interface TagSidebarProps {
  uniqueTags: string[];
  selectedTag: string | null;
  showHidden: boolean;
  onSelectTag: (tag: string | null) => void;
  onToggleHidden: (show: boolean) => void;
}

const TagSidebar = ({ uniqueTags, selectedTag, showHidden, onSelectTag, onToggleHidden }: TagSidebarProps) => (
  <div className="space-y-4">
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
        Filters
      </h2>
      <div className="space-y-1">
        <Button
          variant={selectedTag === null && !showHidden ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
              onSelectTag(null);
              onToggleHidden(false);
          }}
        >
          <Tag className="mr-2 h-4 w-4" />
          All Snippets
        </Button>
        <Button
            variant={showHidden ? "secondary" : "ghost"}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => onToggleHidden(true)}
        >
            <EyeOff className="mr-2 h-4 w-4" />
            Hidden Snippets
        </Button>
      </div>

      <h2 className="mt-6 mb-2 px-4 text-lg font-semibold tracking-tight">
        Tags
      </h2>
      <div className="space-y-1">
        {uniqueTags.map((tag) => (
          <Button
            key={tag}
            variant={selectedTag === tag ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
                onSelectTag(tag);
                onToggleHidden(false);
            }}
          >
            <Tag className="mr-2 h-4 w-4" />
            {tag}
          </Button>
        ))}
      </div>
    </div>
  </div>
);

export default function Home() {
  const router = useRouter();
  const {
    snippets,
    searchQuery,
    setSearchQuery,
    addSnippet,
    updateSnippet,
    deleteSnippet,
  } = useSnippets();
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    isHidden: false,
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  
  // Privacy Mode State
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const togglePrivacyMode = () => setIsPrivacyMode(!isPrivacyMode);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    snippets.forEach((s) => {
        if (!s.isHidden) {
             s.tags.forEach((t) => tags.add(t))
        }
    });
    return Array.from(tags).sort();
  }, [snippets]);

  const displayedSnippets = snippets.filter((snippet) => {
    if (showHidden) {
        if (!snippet.isHidden) return false;
    } else {
        if (snippet.isHidden) return false;
    }
    if (selectedTag && !snippet.tags.includes(selectedTag)) {
        return false;
    }
    return true;
  });

  const handleCopy = async (content: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  };

  const openAddDialog = () => {
    setSelectedSnippet(null);
    setFormData({ title: "", content: "", tags: "", isHidden: false });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openViewDialog = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setFormData({
      title: snippet.title,
      content: snippet.content,
      tags: snippet.tags.join(", "),
      isHidden: snippet.isHidden || false,
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and Content are required");
      return;
    }

    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (selectedSnippet) {
      updateSnippet(selectedSnippet.id, {
        title: formData.title,
        content: formData.content,
        tags: tagsArray,
        isHidden: formData.isHidden,
      });
      toast.success("Snippet updated!");
    } else {
      addSnippet({
        title: formData.title,
        content: formData.content,
        tags: tagsArray,
        isHidden: formData.isHidden,
      });
      toast.success("Snippet added!");
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSnippet(id);
    toast.success("Snippet deleted");
    setIsDialogOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to logout");
    }
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 border-r min-h-screen p-4">
        <div className="mb-6 px-4">
          <h1 className="text-xl font-bold tracking-tight">Personal Store</h1>
        </div>
        <TagSidebar 
            uniqueTags={uniqueTags} 
            selectedTag={selectedTag} 
            showHidden={showHidden}
            onSelectTag={setSelectedTag} 
            onToggleHidden={setShowHidden}
        />
      </aside>

      {/* Main Content Area - Using Flex to adjust width when editor is open */}
      <div className="flex flex-1 min-w-0">
        <main className="flex-1 p-4 md:p-8 min-w-0 max-w-5xl mx-auto w-full">
          <header className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between md:hidden">
              <h1 className="text-xl font-bold tracking-tight">Personal Store</h1>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <TagSidebar 
                      uniqueTags={uniqueTags} 
                      selectedTag={selectedTag}
                      showHidden={showHidden} 
                      onSelectTag={(tag) => {
                          setSelectedTag(tag);
                          setShowHidden(false);
                      }}
                      onToggleHidden={(hidden) => {
                          setShowHidden(hidden);
                          setSelectedTag(null);
                      }} 
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search snippets..."
                  className="pl-9 h-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2">
                  <Button 
                      variant={isPrivacyMode ? "destructive" : "outline"}
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={togglePrivacyMode}
                      title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                  >
                      {isPrivacyMode ? <Shield className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                      variant={isSmartEditorOpen ? "secondary" : "outline"}
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setIsSmartEditorOpen(!isSmartEditorOpen)}
                      title="Toggle Smart Editor"
                  >
                      <Sparkles className={`h-4 w-4 ${isSmartEditorOpen ? "text-yellow-600" : "text-yellow-500"}`} />
                  </Button>
                  <Button 
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 hover:text-destructive hover:border-destructive/50"
                      onClick={handleLogout}
                      title="Logout"
                  >
                      <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={openAddDialog} size="sm" className="h-9 ml-auto md:ml-0">
                  <Plus className="h-4 w-4 mr-1" /> Add Snippet
                </Button>
              </div>
            </div>
            {(selectedTag || showHidden) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Viewing: 
                  <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md flex items-center gap-1">
                      {showHidden ? <><EyeOff className="h-3 w-3" /> Hidden Snippets</> : selectedTag}
                  </span>
                  <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs" 
                      onClick={() => {
                          setSelectedTag(null);
                          setShowHidden(false);
                      }}
                  >
                      Clear
                  </Button>
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 gap-3">
            {displayedSnippets.map((snippet) => (
              <Card
                key={snippet.id}
                className="group relative flex flex-row items-center hover:border-primary/50 transition-colors cursor-pointer p-3"
                onClick={() => openViewDialog(snippet)}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-medium leading-none truncate ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                      {snippet.title}
                    </h3>
                    {snippet.isHidden && (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`text-xs text-muted-foreground line-clamp-1 mb-2 ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300 select-none" : ""}`}>
                    {snippet.content}
                  </p>
                  <div className="flex gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tag);
                            setShowHidden(false); 
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {snippet.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{snippet.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleCopy(snippet.content, e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(snippet.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {displayedSnippets.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
                No snippets found.
              </div>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {selectedSnippet
                    ? isEditing
                      ? "Edit Snippet"
                      : selectedSnippet.title
                    : "New Snippet"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-2 -mr-2 pr-2">
                {isEditing ? (
                  <div className="grid gap-4">
                    <div className="grid gap-1.5">
                      <label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                        Title
                      </label>
                      <Input
                        id="title"
                        placeholder="Snippet Title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="tags" className="text-xs font-medium text-muted-foreground">
                        Tags (comma separated)
                      </label>
                      <Input
                        id="tags"
                        placeholder="tag1, tag2"
                        value={formData.tags}
                        onChange={(e) =>
                          setFormData({ ...formData, tags: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2 py-1">
                      <Checkbox 
                          id="hidden" 
                          checked={formData.isHidden}
                          onCheckedChange={(checked) => 
                              setFormData({ ...formData, isHidden: checked as boolean })
                          }
                      />
                      <Label htmlFor="hidden" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Hide from main list
                      </Label>
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="content" className="text-xs font-medium text-muted-foreground">
                        Content
                      </label>
                      <Textarea
                        id="content"
                        placeholder="Content goes here..."
                        className="min-h-[200px] font-mono text-sm"
                        value={formData.content}
                        onChange={(e) =>
                          setFormData({ ...formData, content: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {selectedSnippet?.isHidden && (
                          <div className="bg-secondary/50 text-xs px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground">
                              <EyeOff className="h-3 w-3" /> Hidden Snippet
                          </div>
                      )}
                    <div className={`bg-muted/30 rounded-md p-3 border ${isPrivacyMode ? "blur-md hover:blur-none transition-all duration-300 select-none hover:select-text" : ""}`}>
                      <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                        {selectedSnippet?.content}
                      </pre>
                    </div>
                    {selectedSnippet?.tags.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSnippet.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-secondary rounded-full text-xs text-secondary-foreground border cursor-pointer hover:bg-secondary/80"
                            onClick={() => {
                                setSelectedTag(tag);
                                setShowHidden(false);
                                setIsDialogOpen(false);
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 mt-auto border-t">
                {!isEditing && selectedSnippet ? (
                  <div className="flex w-full justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedSnippet.content)}
                    >
                      <Copy className="mr-2 h-3 w-3" /> Copy Content
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDelete(selectedSnippet.id, e)}
                      >
                        Delete
                      </Button>
                      <Button onClick={() => setIsEditing(true)} size="sm">
                        <Pencil className="mr-2 h-3 w-3" /> Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full justify-end gap-2">
                    {selectedSnippet && (
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    )}
                    <Button onClick={handleSave}>Save</Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>

        {/* Embedded Smart Editor */}
        {isSmartEditorOpen && (
          <div className="h-[calc(100vh)] sticky top-0 right-0 shrink-0 z-20 shadow-xl">
            <SmartEditor 
                isOpen={true}
                onClose={() => setIsSmartEditorOpen(false)} 
                snippets={snippets}
            />
          </div>
        )}
      </div>
    </div>
    </PrivacyContext.Provider>
  );
}
