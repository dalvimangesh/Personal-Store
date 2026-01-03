"use client";

import { useState, useMemo, createContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Search, Copy, Trash2, Menu, Tag, EyeOff, Eye, Shield, Sparkles, LogOut, Clipboard, Link2, StickyNote, Globe, User, Github, ListTodo, Flame, SquareKanban, Activity } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSnippets } from "@/hooks/useSnippets";
import { useSharedSnippets } from "@/hooks/useSharedSnippets";
import { Snippet, SharedSnippet } from "@/types";
import { SmartEditor } from "@/components/SmartEditor";
import { QuickClipboardEditor } from "@/components/QuickClipboardEditor";
import { LinkShareEditor } from "@/components/LinkShareEditor";
import { SnippetEditor } from "@/components/SnippetEditor";
import { SharedSnippetEditor } from "@/components/SharedSnippetEditor";
import { DropzoneManager } from "@/components/DropzoneManager";
import { TrashStore } from "@/components/TrashStore";
import { TodoStore } from "@/components/TodoStore";
import { HabitStore } from "@/components/HabitStore";
import { TrackerStore } from "@/components/TrackerStore";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Inbox, Info } from "lucide-react";
import { FeaturesList } from "@/components/FeaturesList";
import { SecretCreator } from "@/components/SecretCreator";
import { ModeToggle } from "@/components/ModeToggle";

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
  currentView: 'snippets' | 'quick-clip' | 'link-share' | 'dropzone' | 'trash' | 'public-store' | 'about' | 'todo' | 'secret-store' | 'tracker' | 'habit';
  isPrivacyMode: boolean;
  onSelectTag: (tag: string | null) => void;
  onToggleHidden: (show: boolean) => void;
  onViewChange: (view: 'snippets' | 'quick-clip' | 'link-share' | 'dropzone' | 'trash' | 'public-store' | 'about' | 'todo' | 'secret-store' | 'tracker' | 'habit') => void;
}

const TagSidebar = ({ uniqueTags, selectedTag, showHidden, currentView, isPrivacyMode, onSelectTag, onToggleHidden, onViewChange }: TagSidebarProps) => (
  <div className="space-y-4">
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
        Menu
      </h2>
      <div className="space-y-1">
        <Button
            variant={currentView === 'quick-clip' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('quick-clip')}
        >
            <Clipboard className="mr-2 h-4 w-4" />
            Clipboard Store
        </Button>
        <Button
            variant={currentView === 'todo' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('todo')}
        >
            <ListTodo className="mr-2 h-4 w-4" />
            Todo Store
        </Button>
        <Button
            variant={currentView === 'tracker' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('tracker')}
        >
            <SquareKanban className="mr-2 h-4 w-4" />
            Tracking Store
        </Button>
        <Button
            variant={currentView === 'habit' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('habit')}
        >
            <Activity className="mr-2 h-4 w-4" />
            Habit Store
        </Button>
        <Button
            variant={currentView === 'link-share' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('link-share')}
        >
            <Link2 className="mr-2 h-4 w-4" />
            Link Store
        </Button>
        <Button
            variant={currentView === 'dropzone' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('dropzone')}
        >
            <Inbox className="mr-2 h-4 w-4" />
            Drop Store
        </Button>
        <Button
            variant={currentView === 'public-store' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('public-store')}
        >
            <Globe className="mr-2 h-4 w-4" />
            Public Store
        </Button>
        <Button
            variant={currentView === 'secret-store' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange('secret-store')}
        >
            <Flame className="mr-2 h-4 w-4" />
            Secret Store
        </Button>
        <Button
            variant={currentView === 'trash' ? "secondary" : "ghost"}
            className="w-full justify-start text-black hover:text-black dark:text-white dark:hover:text-white"
            onClick={() => onViewChange('trash')}
        >
            <Trash2 className="mr-2 h-4 w-4" />
            Trash Store
        </Button>

        <Button
          variant={currentView === 'snippets' && selectedTag === null && !showHidden ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => {
              onViewChange('snippets');
              onSelectTag(null);
              onToggleHidden(false);
          }}
        >
          <StickyNote className="mr-2 h-4 w-4" />
          Snippet Store
        </Button>

        <div className="space-y-1 pl-4">
            <Button
                variant={currentView === 'snippets' && showHidden ? "secondary" : "ghost"}
                className="w-full justify-start text-muted-foreground hover:text-foreground h-8"
                onClick={() => {
                    onViewChange('snippets');
                    onToggleHidden(true);
                }}
            >
                <EyeOff className="mr-2 h-4 w-4" />
                Hidden Snippets
            </Button>
            
            {uniqueTags.map((tag) => (
              <Button
                key={tag}
                variant={currentView === 'snippets' && selectedTag === tag ? "secondary" : "ghost"}
                className={`w-full justify-start h-8 group ${isPrivacyMode ? "text-transparent select-none" : ""}`}
                onClick={() => {
                    onViewChange('snippets');
                    onSelectTag(tag);
                    onToggleHidden(false);
                }}
              >
                <Tag className={`mr-2 h-4 w-4 ${isPrivacyMode ? "text-muted-foreground" : ""}`} />
                <span className={isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300 text-foreground" : ""}>
                    {tag}
                </span>
              </Button>
            ))}
        </div>
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

  const {
    snippets: sharedSnippets,
    searchQuery: sharedSearchQuery,
    setSearchQuery: setSharedSearchQuery,
    addSnippet: addSharedSnippet,
    updateSnippet: updateSharedSnippet,
    deleteSnippet: deleteSharedSnippet,
  } = useSharedSnippets();

  const [currentView, setCurrentView] = useState<'snippets' | 'quick-clip' | 'link-share' | 'dropzone' | 'trash' | 'public-store' | 'about' | 'todo' | 'secret-store' | 'tracker' | 'habit'>('snippets');
  
  useEffect(() => {
    const savedView = localStorage.getItem("lastView") as any;
    if (savedView) {
      setCurrentView(savedView);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lastView", currentView);
  }, [currentView]);

  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [selectedSharedSnippet, setSelectedSharedSnippet] = useState<SharedSnippet | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);
  
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // Privacy Mode State
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const togglePrivacyMode = () => setIsPrivacyMode(!isPrivacyMode);

  // Master Hide/Show State
  const [showHiddenMaster, setShowHiddenMaster] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("showHiddenMaster");
    if (saved !== null) {
      setShowHiddenMaster(saved === "true");
    }
  }, []);

  const toggleHiddenMaster = () => {
    const newVal = !showHiddenMaster;
    setShowHiddenMaster(newVal);
    localStorage.setItem("showHiddenMaster", String(newVal));
  };

  const [genericSearchQuery, setGenericSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUsername(data.user.username);
        }
      })
      .catch((err) => console.error("Failed to fetch user", err));
  }, []);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    snippets.forEach((s) => {
        const isSoftVisible = showHiddenMaster || !s.isHiding;
        if (!s.isHidden && isSoftVisible) {
             s.tags.forEach((t) => tags.add(t))
        }
    });
    return Array.from(tags).sort();
  }, [snippets, showHiddenMaster]);

  const displayedSnippets = snippets.filter((snippet) => {
    // If showHiddenMaster is false, don't show snippets marked as isHiding
    if (!showHiddenMaster && snippet.isHiding) {
        return false;
    }

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

  const openEditor = (snippet: Snippet | null = null) => {
    setSelectedSnippet(snippet);
    setIsEditorOpen(true);
    setIsSmartEditorOpen(false);
    if (currentView !== 'snippets') {
        setCurrentView('snippets');
    }
  };

  const openSharedEditor = (snippet: SharedSnippet | null = null) => {
    setSelectedSharedSnippet(snippet);
    setIsEditorOpen(true);
    setIsSmartEditorOpen(false);
    if (currentView !== 'public-store') {
        setCurrentView('public-store');
    }
  };

  const handleSaveSnippet = (data: { title: string; content: string; tags: string[]; isHidden: boolean; isHiding: boolean }) => {
    if (selectedSnippet) {
      updateSnippet(selectedSnippet.id, {
        title: data.title,
        content: data.content,
        tags: data.tags,
        isHidden: data.isHidden,
        isHiding: data.isHiding,
      });
      toast.success("Snippet updated!");
    } else {
      addSnippet({
        title: data.title,
        content: data.content,
        tags: data.tags,
        isHidden: data.isHidden,
        isHiding: data.isHiding,
      });
      toast.success("Snippet added!");
    }
    setIsEditorOpen(false);
  };

  const handleSaveSharedSnippet = (data: { title: string; content: string; tags: string[]; allowedUsers: string[] }) => {
    if (selectedSharedSnippet) {
      updateSharedSnippet(selectedSharedSnippet.id, {
        title: data.title,
        content: data.content,
        tags: data.tags,
        allowedUsers: data.allowedUsers,
      });
      toast.success("Shared snippet updated!");
    } else {
      addSharedSnippet({
        title: data.title,
        content: data.content,
        tags: data.tags,
        allowedUsers: data.allowedUsers,
      });
      toast.success("Shared snippet added!");
    }
    setIsEditorOpen(false);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteSnippet(id);
    toast.success("Snippet deleted");
    if (isEditorOpen) setIsEditorOpen(false);
  };

  const handleDeleteShared = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteSharedSnippet(id);
    toast.success("Shared snippet deleted");
    if (isEditorOpen) setIsEditorOpen(false);
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

  // Helper to switch views
  const handleViewChange = (view: 'snippets' | 'quick-clip' | 'link-share' | 'dropzone' | 'trash' | 'public-store' | 'about' | 'todo' | 'secret-store' | 'tracker' | 'habit') => {
      setCurrentView(view);
      // Reset search when switching views (optional, but often good UX)
      // setGenericSearchQuery(""); 
      if (view !== 'snippets' && view !== 'public-store') {
          setIsEditorOpen(false);
      }
      if (view !== 'snippets') {
        setSelectedTag(null);
        setShowHidden(false);
      }
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-64 border-r h-screen p-4 sticky top-0">
        <div className="mb-6 px-4 shrink-0 flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center p-1">
            <Image 
              src="/logo.svg" 
              alt="Personal Store Logo" 
              width={24} 
              height={24} 
              className="invert dark:invert-0"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Personal Store</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
            <TagSidebar 
                uniqueTags={uniqueTags} 
                selectedTag={selectedTag} 
                showHidden={showHidden}
                currentView={currentView}
                isPrivacyMode={isPrivacyMode}
                onSelectTag={setSelectedTag} 
                onToggleHidden={(hidden) => {
                    setShowHidden(hidden);
                    if (hidden) setSelectedTag(null);
                }}
                onViewChange={handleViewChange}
            />
            <div className="px-3 py-2 mt-4">
                 <Button
                    variant={currentView === 'about' ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleViewChange('about')}
                >
                    <Info className="mr-2 h-4 w-4" />
                    This Store
                </Button>
            </div>
        </div>
        {username && (
            <div className="mt-auto border-t pt-4 px-2 space-y-2 shrink-0">
                <UserProfileDialog username={username} onUpdate={setUsername}>
                     <Button variant="ghost" className="w-full justify-start gap-2">
                        <User className="h-4 w-4" />
                        <span className="truncate">{username}</span>
                    </Button>
                </UserProfileDialog>
            </div>
        )}
      </aside>

      {/* Main Content Area - Using Flex to adjust width when editor is open */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <main className={`flex-1 p-4 md:p-8 min-w-0 w-full flex flex-col ${currentView === 'dropzone' ? 'overflow-hidden h-[100dvh]' : 'overflow-y-auto h-screen relative'}`}>
          <header className="flex flex-col gap-4 mb-6 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 pt-2">
            <div className="flex items-center justify-between md:hidden">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center p-1">
                  <Image 
                    src="/logo.svg" 
                    alt="Personal Store Logo" 
                    width={24} 
                    height={24} 
                    className="invert dark:invert-0"
                  />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Personal Store</h1>
              </div>
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
                  <div className="py-4 flex flex-col h-full">
                    <div className="flex-1">
                        <TagSidebar 
                        uniqueTags={uniqueTags} 
                        selectedTag={selectedTag}
                        showHidden={showHidden}
                        currentView={currentView}
                        isPrivacyMode={isPrivacyMode}
                        onSelectTag={(tag) => {
                            setSelectedTag(tag);
                            setShowHidden(false);
                        }}
                        onToggleHidden={(hidden) => {
                            setShowHidden(hidden);
                            if (hidden) setSelectedTag(null);
                        }}
                        onViewChange={handleViewChange}
                        />
                        <div className="px-3 py-2 mt-4">
                             <Button
                                variant={currentView === 'about' ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => handleViewChange('about')}
                            >
                                <Info className="mr-2 h-4 w-4" />
                                About
                            </Button>
                        </div>
                    </div>
                    {username && (
                        <div className="mt-auto border-t pt-4 space-y-2">
                             <UserProfileDialog username={username} onUpdate={setUsername}>
                                 <Button variant="ghost" className="w-full justify-start gap-2">
                                    <User className="h-4 w-4" />
                                    <span className="truncate">{username}</span>
                                </Button>
                            </UserProfileDialog>
                        </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
              {currentView !== 'quick-clip' && currentView !== 'about' && currentView !== 'secret-store' && currentView !== 'tracker' && currentView !== 'habit' && (
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={
                      currentView === 'public-store' ? "Search public snippets..." : 
                      currentView === 'dropzone' ? "Search drops..." :
                      currentView === 'link-share' ? "Search links..." :
                      currentView === 'trash' ? "Search trash..." :
                      currentView === 'todo' ? "Search todos..." :
                      "Search snippets..."
                  }
                  className="pl-9 h-9 w-full"
                  value={genericSearchQuery}
                  onChange={(e) => {
                      const val = e.target.value;
                      setGenericSearchQuery(val); // Update global search query
                      setSearchQuery(val); // Update snippet search query
                      setSharedSearchQuery(val); // Update public store search query
                  }}
                />
              </div>
              )}
              <div className={`flex items-center gap-2 w-full md:w-auto justify-between ${(currentView === 'quick-clip' || currentView === 'about' || currentView === 'secret-store') ? 'md:justify-end md:ml-auto' : 'md:justify-start'}`}>
                <div className="flex items-center gap-2">
                  <ModeToggle />
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
                      onClick={() => {
                        setIsSmartEditorOpen(!isSmartEditorOpen);
                        if (!isSmartEditorOpen) setIsEditorOpen(false);
                      }}
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
                {currentView === 'public-store' ? (
                    <Button onClick={() => openSharedEditor(null)} size="sm" className="h-9 ml-auto md:ml-0">
                        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Public</span><span className="sm:hidden">Add</span>
                    </Button>
                ) : (currentView === 'todo' || currentView === 'secret-store' || currentView === 'tracker' || currentView === 'habit') ? null : (
                    <Button onClick={() => openEditor(null)} size="sm" className="h-9 ml-auto md:ml-0">
                        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Snippet</span><span className="sm:hidden">Add</span>
                    </Button>
                )}
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

          {currentView === 'quick-clip' ? (
            <div className="flex-1 h-full min-h-[500px]">
                <QuickClipboardEditor isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'tracker' ? (
            <div className="flex-1 w-full">
                <TrackerStore isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'todo' ? (
            <div className="flex-1 h-full min-h-[500px] w-full">
                <TodoStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'habit' ? (
            <div className="flex-1 h-full min-h-[500px] w-full">
                <HabitStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'link-share' ? (
             <div className="flex-1 h-full min-h-[500px] w-full">
                <LinkShareEditor searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
             </div>
          ) : currentView === 'dropzone' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden">
                <DropzoneManager searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} />
             </div>
          ) : currentView === 'secret-store' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden overflow-y-auto">
                <SecretCreator isPrivacyMode={isPrivacyMode} />
             </div>
          ) : currentView === 'trash' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden overflow-y-auto">
                <TrashStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} />
             </div>
          ) : currentView === 'about' ? (
            <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center p-2">
                                <Image 
                                    src="/logo.svg" 
                                    alt="Personal Store Logo" 
                                    width={48} 
                                    height={48} 
                                    className="invert dark:invert-0"
                                />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">Personal Store</h1>
                        </div>
                        <p className="text-xl text-muted-foreground">
                            A modern workspace for your snippets, links, tasks, and secrets. 
                            Private by default, powerful by design.
                        </p>
                    </div>

                    <div className="grid gap-8">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">Store Settings</h2>
                            <div className="border rounded-xl p-8 bg-card shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium">Master Visibility Toggle</p>
                                        <p className="text-sm text-muted-foreground">
                                            Show or hide items across all stores that you've marked as "hidden".
                                        </p>
                                    </div>
                                    <Button 
                                        variant={showHiddenMaster ? "default" : "outline"}
                                        onClick={toggleHiddenMaster}
                                        className="gap-2"
                                    >
                                        {showHiddenMaster ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        {showHiddenMaster ? "Showing Hidden" : "Hiding Hidden"}
                                    </Button>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">Stores & Features</h2>
                            <div className="border rounded-xl p-8 bg-card shadow-sm">
                                <FeaturesList />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">Contribute</h2>
                            <p className="text-muted-foreground">
                                Personal Store is open source. Contributions, bug reports, and feature requests are welcome.
                            </p>
                            <a 
                                href="https://github.com/dalvimangesh/Personal-Store" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block"
                            >
                                <Button className="gap-2">
                                    <Github className="h-4 w-4" />
                                    View on GitHub
                                </Button>
                            </a>
                        </section>
                    </div>
                </div>
             </div>
          ) : currentView === 'public-store' ? (
            <div className="grid grid-cols-1 gap-3 pb-20">
            {sharedSnippets.map((snippet) => (
              <Card
                key={snippet.id}
                className={`group relative flex flex-row items-center hover:border-primary/50 transition-colors cursor-pointer p-3 ${selectedSharedSnippet?.id === snippet.id && isEditorOpen ? 'border-primary bg-secondary/20' : ''}`}
                onClick={() => openSharedEditor(snippet)}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-medium leading-none truncate ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                      {snippet.title}
                    </h3>
                     {snippet.allowedUsers.length === 0 ? (
                         <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-1.5 rounded-full">Public</span>
                     ) : (
                         <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-1.5 rounded-full">Restricted</span>
                     )}
                  </div>
                  <p className={`text-xs text-muted-foreground line-clamp-1 mb-2 ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300 select-none" : ""}`}>
                    {snippet.content}
                  </p>
                  <div className="flex gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground"
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

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleCopy(snippet.content, e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteShared(snippet.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {sharedSnippets.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
                No public snippets found.
              </div>
            )}
          </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-20">
            {displayedSnippets.map((snippet) => (
              <Card
                key={snippet.id}
                className={`group relative flex flex-row items-center hover:border-primary/50 transition-colors cursor-pointer p-3 ${selectedSnippet?.id === snippet.id && isEditorOpen ? 'border-primary bg-secondary/20' : ''}`}
                onClick={() => openEditor(snippet)}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-medium leading-none truncate ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}>
                      {snippet.title}
                    </h3>
                    {snippet.isHidden && (
                        <span title="Secretly Hidden">
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                        </span>
                    )}
                    {snippet.isHiding && (
                        <span title="Soft Hidden">
                            <EyeOff className="h-3 w-3 text-red-500/50" />
                        </span>
                    )}
                  </div>
                  <p className={`text-xs text-muted-foreground line-clamp-1 mb-2 ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300 select-none" : ""}`}>
                    {snippet.content}
                  </p>
                  <div className="flex gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80 ${isPrivacyMode ? "blur-sm group-hover:blur-none transition-all duration-300" : ""}`}
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

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleCopy(snippet.content, e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
          )}
        </main>

        {/* Snippet Editor Sidebar */}
        {isEditorOpen && currentView === 'snippets' && (
             <div className="border-l bg-background h-screen sticky top-0 w-full md:w-[50%] shadow-xl z-30 transition-all duration-300 ease-in-out flex flex-col">
                <SnippetEditor 
                    key={selectedSnippet?.id || 'new'}
                    snippet={selectedSnippet}
                    onSave={handleSaveSnippet}
                    onCancel={() => setIsEditorOpen(false)}
                    onDelete={selectedSnippet ? (id) => handleDelete(id) : undefined}
                />
             </div>
        )}
        {isEditorOpen && currentView === 'public-store' && (
             <div className="border-l bg-background h-screen sticky top-0 w-full md:w-[50%] shadow-xl z-30 transition-all duration-300 ease-in-out flex flex-col">
                <SharedSnippetEditor 
                    key={selectedSharedSnippet?.id || 'new-shared'}
                    snippet={selectedSharedSnippet}
                    onSave={handleSaveSharedSnippet}
                    onCancel={() => setIsEditorOpen(false)}
                    onDelete={selectedSharedSnippet ? (id) => handleDeleteShared(id) : undefined}
                />
             </div>
        )}

        {/* Embedded Smart Editor */}
        {isSmartEditorOpen && (
          <div className="border-l bg-background h-screen sticky top-0 w-full md:w-[50%] shadow-xl z-30 transition-all duration-300 ease-in-out flex flex-col">
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
