"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Copy, Trash2, Pencil, Menu, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Define TagSidebar outside main component to avoid re-render issues
// Pass props instead of closing over state
interface TagSidebarProps {
  uniqueTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

const TagSidebar = ({ uniqueTags, selectedTag, onSelectTag }: TagSidebarProps) => (
  <div className="space-y-4">
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
        Tags
      </h2>
      <div className="space-y-1">
        <Button
          variant={selectedTag === null ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onSelectTag(null)}
        >
          <Tag className="mr-2 h-4 w-4" />
          All Snippets
        </Button>
        {uniqueTags.map((tag) => (
          <Button
            key={tag}
            variant={selectedTag === tag ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSelectTag(tag)}
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
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract unique tags from all snippets
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [snippets]);

  // Filter snippets by search query AND selected tag
  const displayedSnippets = snippets.filter((snippet) => {
    const matchesTag = selectedTag ? snippet.tags.includes(selectedTag) : true;
    // Search filtering is already handled in useSnippets, but we apply tag filtering here
    // or we can rely on useSnippets for search and filter by tag here.
    // Note: useSnippets already returns filteredSnippets based on searchQuery.
    // So we just need to filter by tag.
    return matchesTag;
  });

  const handleCopy = async (content: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied!");
    } catch (err) {
      // Error handling is good practice even if not strictly required
      console.error(err);
      toast.error("Failed to copy");
    }
  };

  const openAddDialog = () => {
    setSelectedSnippet(null);
    setFormData({ title: "", content: "", tags: "" });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openViewDialog = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setFormData({
      title: snippet.title,
      content: snippet.content,
      tags: snippet.tags.join(", "),
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
      });
      toast.success("Snippet updated!");
    } else {
      addSnippet({
        title: formData.title,
        content: formData.content,
        tags: tagsArray,
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r min-h-screen p-4">
        <div className="mb-6 px-4">
          <h1 className="text-xl font-bold tracking-tight">Personal Store</h1>
        </div>
        <TagSidebar 
            uniqueTags={uniqueTags} 
            selectedTag={selectedTag} 
            onSelectTag={setSelectedTag} 
        />
      </aside>

      {/* Mobile & Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
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
                    onSelectTag={(tag) => {
                        setSelectedTag(tag);
                        // Close sheet? SheetTrigger handles open state, but closing programmatically needs state
                        // For simplicity, user can tap outside or close button
                    }} 
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search snippets..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={openAddDialog} size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-1" /> Add Snippet
            </Button>
          </div>
          {selectedTag && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 Filtering by: <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md">{selectedTag}</span>
                 <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedTag(null)}>Clear</Button>
             </div>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedSnippets.map((snippet) => (
            <Card
              key={snippet.id}
              className="group relative flex flex-col hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openViewDialog(snippet)}
            >
              <CardHeader className="p-3 pb-1 space-y-0">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm font-medium leading-tight line-clamp-1">
                    {snippet.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {snippet.content}
                </p>
              </CardContent>
              <CardFooter className="p-3 pt-0 flex justify-between items-center mt-auto">
                <div className="flex gap-1 overflow-hidden">
                  {snippet.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-sm border px-1 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(tag);
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {snippet.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{snippet.tags.length - 2}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleCopy(snippet.content, e)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={(e) => handleDelete(snippet.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardFooter>
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
                    <label
                      htmlFor="title"
                      className="text-xs font-medium text-muted-foreground"
                    >
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
                    <label
                      htmlFor="tags"
                      className="text-xs font-medium text-muted-foreground"
                    >
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
                  <div className="grid gap-1.5">
                    <label
                      htmlFor="content"
                      className="text-xs font-medium text-muted-foreground"
                    >
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
                  <div className="bg-muted/30 rounded-md p-3 border">
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
    </div>
  );
}
