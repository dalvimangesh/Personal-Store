"use client";

import { useState } from "react";
import { useSnippets } from "@/hooks/useSnippets";
import { SnippetEditor } from "@/components/SnippetEditor";
import { Snippet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, StickyNote, Tag, Copy, Edit2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export function MobileSnippetStore() {
  const { snippets, searchQuery, setSearchQuery, addSnippet, updateSnippet, deleteSnippet, isLoading } = useSnippets();
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleSave = async (data: { title: string; content: string; tags: string[]; isHidden: boolean; isHiding: boolean }) => {
    if (selectedSnippet) {
      await updateSnippet(selectedSnippet.id, data);
    } else {
      await addSnippet(data);
    }
    setIsEditorOpen(false);
    setSelectedSnippet(null);
  };

  const handleEdit = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedSnippet(null);
    setIsEditorOpen(true);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Content copied");
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>;

  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         snippet.content.toLowerCase().includes(searchQuery.toLowerCase());
    const isActuallyHidden = snippet.isHidden || snippet.isHiding;
    return matchesSearch && !isActuallyHidden;
  });

  if (isEditorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <SnippetEditor 
          snippet={selectedSnippet}
          onSave={handleSave}
          onCancel={() => {
            setIsEditorOpen(false);
            setSelectedSnippet(null);
          }}
          onDelete={async (id) => {
            if (confirm("Delete this snippet?")) {
              await deleteSnippet(id);
              setIsEditorOpen(false);
              setSelectedSnippet(null);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 h-9" 
            placeholder="Search snippets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="icon" onClick={handleCreate} className="h-9 w-9 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{searchQuery ? "No matching snippets found" : "No snippets found"}</p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <Card 
              key={snippet.id} 
              className="p-3 flex flex-col gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <StickyNote className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0" onClick={() => handleEdit(snippet)}>
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{snippet.title}</h3>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(snippet.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {snippet.content}
                    </p>
                </div>
              </div>

              {snippet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {snippet.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t mt-1">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => copyContent(snippet.content)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleEdit(snippet)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
