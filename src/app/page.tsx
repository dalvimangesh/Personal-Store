"use client";

import { useState, useMemo, createContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Search, Copy, Trash2, Menu, Tag, EyeOff, Eye, Shield, Sparkles, LogOut, Clipboard, Link2, StickyNote, Globe, User, Github, ListTodo, Flame, SquareKanban, Activity, Footprints, Inbox, Info, GripVertical, ChevronLeft, ChevronRight, Bot, Quote } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
import { StepsStore } from "@/components/StepsStore";
import { AiChat } from "@/components/AiChat";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { FeaturesList } from "@/components/FeaturesList";
import { SecretCreator } from "@/components/SecretCreator";
import { MotivationalQuote } from "@/components/MotivationalQuote";
import { ModeToggle } from "@/components/ModeToggle";

// Privacy Context
const PrivacyContext = createContext<{
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
});

const STORE_ITEMS = [
    { id: 'ai-chat', label: 'Agent Store', icon: Bot },
    { id: 'quick-clip', label: 'Clipboard Store', icon: Clipboard },
    { id: 'todo', label: 'Todo Store', icon: ListTodo },
    { id: 'tracker', label: 'Tracking Store', icon: SquareKanban },
    { id: 'habit', label: 'Habit Store', icon: Activity },
    { id: 'steps', label: 'Steps Store', icon: Footprints },
    { id: 'link-share', label: 'Link Store', icon: Link2 },
    { id: 'dropzone', label: 'Drop Store', icon: Inbox },
    { id: 'public-store', label: 'Public Store', icon: Globe },
    { id: 'secret-store', label: 'Secret Store', icon: Flame },
    { id: 'trash', label: 'Trash Store', icon: Trash2 },
    { id: 'snippets', label: 'Snippet Store', icon: StickyNote },
] as const;

type ViewType = 'snippets' | 'quick-clip' | 'link-share' | 'dropzone' | 'trash' | 'public-store' | 'about' | 'todo' | 'secret-store' | 'tracker' | 'habit' | 'steps' | 'ai-chat';

interface TagSidebarProps {
  uniqueTags: string[];
  selectedTag: string | null;
  showHidden: boolean;
  currentView: ViewType;
  isPrivacyMode: boolean;
  isCollapsed?: boolean;
  visibleStores: Record<string, boolean>;
  orderedStores: string[];
  onSelectTag: (tag: string | null) => void;
  onToggleHidden: (show: boolean) => void;
  onViewChange: (view: ViewType) => void;
}

interface SidebarControlsProps {
  isSidebarCollapsed: boolean;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  isSmartEditorOpen: boolean;
  setIsSmartEditorOpen: (open: boolean) => void;
  setIsEditorOpen: (open: boolean) => void;
  handleLogout: () => void;
}

const SidebarControls = ({ 
    isSidebarCollapsed, 
    isPrivacyMode, 
    togglePrivacyMode, 
    isSmartEditorOpen, 
    setIsSmartEditorOpen, 
    setIsEditorOpen, 
    handleLogout 
}: SidebarControlsProps) => (
    <div className={`space-y-1 ${isSidebarCollapsed ? "py-1" : "px-2 py-1"}`}>
        <div className={`flex ${isSidebarCollapsed ? "flex-col gap-1 items-center" : "flex-row items-center justify-between bg-muted/40 p-0.5 rounded-lg border gap-0.5"}`}>
            <div className="flex justify-center">
                <ModeToggle />
            </div>
            
            {!isSidebarCollapsed && <div className="h-4 w-[1px] bg-border mx-0.5" />}

            <Button
                variant={isPrivacyMode ? "destructive" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={togglePrivacyMode}
                title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
            >
                {isPrivacyMode ? <Shield className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <Button
                variant={isSmartEditorOpen ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                    setIsSmartEditorOpen(!isSmartEditorOpen);
                    if (!isSmartEditorOpen) setIsEditorOpen(false);
                }}
                title="Toggle Smart Editor"
            >
                <Sparkles className={`h-4 w-4 ${isSmartEditorOpen ? "text-yellow-600" : "text-yellow-500"}`} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                title="Logout"
            >
                <LogOut className="h-4 w-4" />
            </Button>
        </div>
    </div>
);

const TagSidebar = ({ uniqueTags, selectedTag, showHidden, currentView, isPrivacyMode, isCollapsed, visibleStores, orderedStores, onSelectTag, onToggleHidden, onViewChange }: TagSidebarProps) => (
  <div className="space-y-4">
    <div className={isCollapsed ? "py-2" : "px-3 py-2"}>
      {!isCollapsed && (
        <div className="flex items-center justify-between mb-2 px-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Menu
            </h2>
        </div>
      )}
      <div className="space-y-1">
        {orderedStores.map((storeId) => {
             const store = STORE_ITEMS.find(s => s.id === storeId);
             if (!store || !visibleStores[storeId]) return null;

             if (storeId === 'snippets') {
                return (
                    <div key="snippets-group">
                        <Button
                            variant={currentView === 'snippets' && selectedTag === null && !showHidden ? "secondary" : "ghost"}
                            className={`w-full ${isCollapsed ? "justify-center px-0" : "justify-start"}`}
                            onClick={() => {
                                onViewChange('snippets');
                                onSelectTag(null);
                                onToggleHidden(false);
                            }}
                            title={isCollapsed ? "Snippet Store" : undefined}
                        >
                            <StickyNote className={`${isCollapsed ? "" : "mr-2"} h-4 w-4`} />
                            {!isCollapsed && "Snippet Store"}
                        </Button>

                        {!isCollapsed && (
                          <div className="space-y-1 pl-4">
                              {/* Hidden Snippets button moved to main content area */}
                          </div>
                        )}
                    </div>
                );
             }

             return (
                <Button
                    key={store.id}
                    variant={currentView === store.id ? "secondary" : "ghost"}
                    className={`w-full ${isCollapsed ? "justify-center px-0" : "justify-start"}`}
                    onClick={() => onViewChange(store.id as ViewType)}
                    title={isCollapsed ? store.label : undefined}
                >
                    <store.icon className={`${isCollapsed ? "" : "mr-2"} h-4 w-4`} />
                    {!isCollapsed && store.label}
                </Button>
             );
        })}
      </div>
    </div>
  </div>
);

function SortableStoreItem({ id, visible, onToggle }: { id: string; visible: boolean; onToggle: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const store = STORE_ITEMS.find(s => s.id === id);
  if (!store) return null;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 border p-3 rounded-lg bg-card shadow-sm select-none group">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground touch-none">
            <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
             <Checkbox 
                id={`sort-store-${id}`} 
                checked={visible}
                onCheckedChange={onToggle}
            />
            <Label htmlFor={`sort-store-${id}`} className="flex items-center gap-2 cursor-pointer truncate font-medium">
                <store.icon className="h-4 w-4 text-muted-foreground" />
                {store.label}
            </Label>
        </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    snippets,
    // searchQuery,
    setSearchQuery,
    addSnippet,
    updateSnippet,
    deleteSnippet,
  } = useSnippets();

  const {
    snippets: sharedSnippets,
    // searchQuery: sharedSearchQuery,
    setSearchQuery: setSharedSearchQuery,
    addSnippet: addSharedSnippet,
    updateSnippet: updateSharedSnippet,
    deleteSnippet: deleteSharedSnippet,
  } = useSharedSnippets();

  const [currentView, setCurrentView] = useState<ViewType>('snippets');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [visibleStores, setVisibleStores] = useState<Record<string, boolean>>(() => {
    const initial = STORE_ITEMS.reduce((acc, store) => {
        acc[store.id] = true;
        return acc;
    }, {} as Record<string, boolean>);
    return initial;
  });

  const [orderedStores, setOrderedStores] = useState<string[]>(STORE_ITEMS.map(s => s.id));

  useEffect(() => {
    const savedView = localStorage.getItem("lastView");
    if (savedView) {
      if (savedView === 'terminal') {
          setCurrentView('steps');
      } else {
          setCurrentView(savedView as ViewType);
      }
    }
    const savedVisibility = localStorage.getItem("visibleStores");
    if (savedVisibility) {
        try {
            const parsedVisibility = JSON.parse(savedVisibility);
            const mergedVisibility = { ...parsedVisibility };
            // Ensure new stores are visible by default
            STORE_ITEMS.forEach(store => {
                if (mergedVisibility[store.id] === undefined) {
                    mergedVisibility[store.id] = true;
                }
            });
            setVisibleStores(mergedVisibility);
        } catch (e) {
            console.error("Failed to parse visible stores", e);
        }
    }
    const savedOrder = localStorage.getItem("orderedStores");
    if (savedOrder) {
        try {
            const parsedOrder = JSON.parse(savedOrder);
            // Ensure all current stores are present and no old ones remain
            const currentIds = new Set(STORE_ITEMS.map(s => s.id));
            const validOrder = parsedOrder.filter((id: string) => currentIds.has(id as any));
            const missingIds = STORE_ITEMS.filter(s => !validOrder.includes(s.id)).map(s => s.id);
            setOrderedStores([...validOrder, ...missingIds]);
        } catch (e) {
            console.error("Failed to parse ordered stores", e);
        }
    }
    const savedSidebarCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedSidebarCollapsed) {
        setIsSidebarCollapsed(savedSidebarCollapsed === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lastView", currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const toggleStoreVisibility = (id: string) => {
      const newVisibility = { ...visibleStores, [id]: !visibleStores[id] };
      setVisibleStores(newVisibility);
      localStorage.setItem("visibleStores", JSON.stringify(newVisibility));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedStores((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("orderedStores", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

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
  const [showQuote, setShowQuote] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("showHiddenMaster");
    if (saved !== null) {
      setShowHiddenMaster(saved === "true");
    }
    const savedQuote = localStorage.getItem("showQuote");
    if (savedQuote !== null) {
      setShowQuote(savedQuote === "true");
    }
  }, []);

  const toggleHiddenMaster = () => {
    const newVal = !showHiddenMaster;
    setShowHiddenMaster(newVal);
    localStorage.setItem("showHiddenMaster", String(newVal));
  };

  const toggleQuote = () => {
    const newVal = !showQuote;
    setShowQuote(newVal);
    localStorage.setItem("showQuote", String(newVal));
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
  const handleViewChange = (view: ViewType) => {
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
    <div className="h-screen overflow-hidden bg-background flex">
      <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? "w-16 px-2 py-4" : "w-64 p-4"} border-r h-full sticky top-0 transition-all duration-300 ease-in-out z-40 group/sidebar`}>
        {/* Toggle Button on Edge */}
        <Button
            variant="outline"
            size="icon"
            className="absolute -right-3 top-12 h-6 w-6 rounded-full border bg-background shadow-md z-50 opacity-0 group-hover/sidebar:opacity-100 transition-opacity flex items-center justify-center"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isSidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        <div className={`mb-4 shrink-0 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2 px-4"}`}>
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center p-1 shrink-0">
            <Image 
              src="/logo.svg" 
              alt="Personal Store Logo" 
              width={24} 
              height={24} 
              className="invert dark:invert-0"
            />
          </div>
          {!isSidebarCollapsed && <h1 className="text-xl font-bold tracking-tight truncate">Personal Store</h1>}
        </div>

        <div className="px-2 pb-2">
            <SidebarControls 
                isSidebarCollapsed={isSidebarCollapsed}
                isPrivacyMode={isPrivacyMode}
                togglePrivacyMode={togglePrivacyMode}
                isSmartEditorOpen={isSmartEditorOpen}
                setIsSmartEditorOpen={setIsSmartEditorOpen}
                setIsEditorOpen={setIsEditorOpen}
                handleLogout={handleLogout}
            />
        </div>
        
        <div className="flex-1 overflow-y-auto">
            <TagSidebar 
                uniqueTags={uniqueTags} 
                selectedTag={selectedTag} 
                showHidden={showHidden}
                currentView={currentView}
                isPrivacyMode={isPrivacyMode}
                isCollapsed={isSidebarCollapsed}
                visibleStores={visibleStores}
                orderedStores={orderedStores}
                onSelectTag={setSelectedTag} 
                onToggleHidden={(hidden) => {
                    setShowHidden(hidden);
                    if (hidden) setSelectedTag(null);
                }}
                onViewChange={handleViewChange}
            />
            <div className={`mt-4 ${isSidebarCollapsed ? "py-2" : "px-3 py-2"}`}>
                 <Button
                    variant={currentView === 'about' ? "secondary" : "ghost"}
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
                    onClick={() => handleViewChange('about')}
                    title={isSidebarCollapsed ? "About This Store" : undefined}
                >
                    <Info className={`${isSidebarCollapsed ? "" : "mr-2"} h-4 w-4`} />
                    {!isSidebarCollapsed && "This Store"}
                </Button>
            </div>
        </div>

        <div className="mt-auto border-t pt-4 space-y-2 shrink-0">
            {username && (
                <UserProfileDialog username={username} onUpdate={setUsername}>
                     <Button variant="ghost" className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start gap-2"}`}>
                        <User className="h-4 w-4 shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">{username}</span>}
                    </Button>
                </UserProfileDialog>
            )}
        </div>
      </aside>

      {/* Main Content Area - Using Flex to adjust width when editor is open */}
      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        {showQuote && <MotivationalQuote />}
        <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className={`flex-1 p-0 md:p-0 min-w-0 w-full flex flex-col ${['dropzone', 'quick-clip', 'tracker', 'ai-chat'].includes(currentView) ? 'overflow-hidden h-full' : 'overflow-y-auto h-full relative'}`}>
          <header className="flex flex-col gap-4 mb-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 pt-4 px-4 md:px-8 border-b-0 pb-0">
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
                    <div className="mb-4 border-b pb-4">
                        <SidebarControls 
                            isSidebarCollapsed={false}
                            isPrivacyMode={isPrivacyMode}
                            togglePrivacyMode={togglePrivacyMode}
                            isSmartEditorOpen={isSmartEditorOpen}
                            setIsSmartEditorOpen={setIsSmartEditorOpen}
                            setIsEditorOpen={setIsEditorOpen}
                            handleLogout={handleLogout}
                        />
                    </div>
                    <div className="flex-1">
                        <TagSidebar 
                        uniqueTags={uniqueTags} 
                        selectedTag={selectedTag}
                        showHidden={showHidden}
                        currentView={currentView}
                        isPrivacyMode={isPrivacyMode}
                        visibleStores={visibleStores}
                        orderedStores={orderedStores}
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
              {currentView !== 'quick-clip' && currentView !== 'about' && currentView !== 'secret-store' && currentView !== 'tracker' && currentView !== 'habit' && currentView !== 'ai-chat' && (
              <div className="relative flex-1 w-full mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={
                      currentView === 'public-store' ? "Search public snippets..." : 
                      currentView === 'dropzone' ? "Search drops..." :
                      currentView === 'link-share' ? "Search links..." :
                      currentView === 'trash' ? "Search trash..." :
                      currentView === 'todo' ? "Search todos..." :
                      currentView === 'steps' ? "Search steps..." :
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
              <div className={`flex items-center gap-2 w-full md:w-auto justify-between ${(currentView === 'quick-clip' || currentView === 'about' || currentView === 'secret-store' || currentView === 'ai-chat') ? 'md:justify-end md:ml-auto' : 'md:justify-start'}`}>
                {/* Controls moved to sidebar */}
                {currentView === 'public-store' ? (
                    <Button onClick={() => openSharedEditor(null)} size="sm" className="h-9 ml-auto md:ml-0 mb-4">
                        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Public</span><span className="sm:hidden">Add</span>
                    </Button>
                ) : (currentView === 'todo' || currentView === 'secret-store' || currentView === 'tracker' || currentView === 'habit' || currentView === 'steps' || currentView === 'ai-chat' || currentView === 'quick-clip' || currentView === 'link-share') ? null : (
                    <Button onClick={() => openEditor(null)} size="sm" className="h-9 ml-auto md:ml-0 mb-4">
                        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Snippet</span><span className="sm:hidden">Add</span>
                    </Button>
                )}
              </div>
            </div>
            {(selectedTag || showHidden) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4">
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
            <div className="flex-1 h-full min-h-[500px] px-4 md:px-8 pb-4">
                <QuickClipboardEditor isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'ai-chat' ? (
            <div className="flex-1 w-full relative min-h-0 overflow-hidden -mt-4">
                <AiChat />
            </div>
          ) : currentView === 'tracker' ? (
            <div className="flex-1 w-full px-4 md:px-8 pb-4">
                <TrackerStore isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'todo' ? (
            <div className="flex-1 h-full min-h-[500px] w-full px-4 md:px-8 pb-4">
                <TodoStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'habit' ? (
            <div className="flex-1 h-full min-h-[500px] w-full px-4 md:px-8 pb-4">
                <HabitStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
            </div>
          ) : currentView === 'steps' ? (
            <div className="flex-1 h-full min-h-[500px] w-full px-4 md:px-8 pb-4">
                <StepsStore searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} />
            </div>
          ) : currentView === 'link-share' ? (
             <div className="flex-1 h-full min-h-[500px] w-full px-4 md:px-8 pb-4">
                <LinkShareEditor searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} showHiddenMaster={showHiddenMaster} />
             </div>
          ) : currentView === 'dropzone' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden px-4 md:px-8 pb-4">
                <DropzoneManager searchQuery={genericSearchQuery} isPrivacyMode={isPrivacyMode} />
             </div>
          ) : currentView === 'secret-store' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden overflow-y-auto px-4 md:px-8 pb-4">
                <SecretCreator isPrivacyMode={isPrivacyMode} />
             </div>
          ) : currentView === 'trash' ? (
             <div className="flex-1 h-full w-full relative min-h-0 overflow-hidden overflow-y-auto px-4 md:px-8 pb-4">
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
                            <div className="border rounded-xl p-8 bg-card shadow-sm space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Visible Stores</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Select which stores you want to see in your menu. Drag to reorder.
                                    </p>
                                    
                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={orderedStores}
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {orderedStores.map((storeId) => (
                                                    <SortableStoreItem 
                                                        key={storeId}
                                                        id={storeId}
                                                        visible={visibleStores[storeId]}
                                                        onToggle={() => toggleStoreVisibility(storeId)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                                
                                <div className="border-t pt-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium">Master Visibility Toggle</p>
                                        <p className="text-sm text-muted-foreground">
                                            Show or hide items across all stores that you&apos;ve marked as &quot;hidden&quot;.
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

                                <div className="border-t pt-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium">Daily Quote</p>
                                        <p className="text-sm text-muted-foreground">
                                            Show or hide the daily motivational quote at the top of the screen.
                                        </p>
                                    </div>
                                    <Button 
                                        variant={showQuote ? "default" : "outline"}
                                        onClick={toggleQuote}
                                        className="gap-2"
                                    >
                                        <Quote className="h-4 w-4" />
                                        {showQuote ? "Showing Quote" : "Quote Hidden"}
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
            <div className="grid grid-cols-1 gap-3 pb-20 px-4 md:px-8">
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
            <div className="flex flex-col gap-4 pb-20 px-4 md:px-8">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={selectedTag === null && !showHidden ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs border"
                        onClick={() => {
                            setSelectedTag(null);
                            setShowHidden(false);
                        }}
                    >
                        All
                    </Button>
                    <Button
                        variant={showHidden ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs border text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            setShowHidden(!showHidden);
                            if (!showHidden) setSelectedTag(null);
                        }}
                    >
                        <EyeOff className="mr-1 h-3 w-3" />
                        Hidden
                    </Button>
                    {!showHidden && uniqueTags.length > 0 && uniqueTags.map((tag) => (
                        <Button
                            key={tag}
                            variant={selectedTag === tag ? "secondary" : "outline"}
                            size="sm"
                            className={`h-7 text-xs ${isPrivacyMode ? "text-transparent select-none bg-muted" : ""} ${selectedTag === tag ? "border-primary" : ""}`}
                            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                        >
                            <Tag className={`mr-1 h-3 w-3 ${isPrivacyMode ? "text-muted-foreground" : ""}`} />
                            <span className={isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300 text-foreground" : ""}>
                                {tag}
                            </span>
                        </Button>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-3">
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
    </div>
    </PrivacyContext.Provider>
  );
}
