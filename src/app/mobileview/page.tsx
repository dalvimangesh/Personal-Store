"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  Clipboard, 
  Link2, 
  Inbox, 
  Globe, 
  StickyNote, 
  ListTodo, 
  Flame, 
  SquareKanban, 
  Activity, 
  Footprints,
  Trash2,
  Sparkles,
  Search,
  User as UserIcon,
  GripVertical,
  Settings2,
  Check
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { SmartEditor } from "@/components/SmartEditor";
import { useState, useEffect, useMemo } from "react";
import { useSnippets } from "@/hooks/useSnippets";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

const INITIAL_FEATURES = [
  {
    id: "snippets",
    icon: <StickyNote className="h-6 w-6 text-blue-500" />,
    title: "Snippets",
    color: "bg-blue-500/10 text-blue-500",
    desc: "Code & Text"
  },
  {
    id: "clipboard",
    icon: <Clipboard className="h-6 w-6 text-purple-500" />,
    title: "Clipboard",
    color: "bg-purple-500/10 text-purple-500",
    desc: "History"
  },
  {
    id: "todos",
    icon: <ListTodo className="h-6 w-6 text-green-500" />,
    title: "Tasks",
    color: "bg-green-500/10 text-green-500",
    desc: "To-Do List"
  },
  {
    id: "links",
    icon: <Link2 className="h-6 w-6 text-orange-500" />,
    title: "Links",
    color: "bg-orange-500/10 text-orange-500",
    desc: "Bookmarks"
  },
  {
    id: "drop",
    icon: <Inbox className="h-6 w-6 text-pink-500" />,
    title: "Drop",
    color: "bg-pink-500/10 text-pink-500",
    desc: "File Drop"
  },
  {
    id: "public",
    icon: <Globe className="h-6 w-6 text-cyan-500" />,
    title: "Public",
    color: "bg-cyan-500/10 text-cyan-500",
    desc: "Shared"
  },
  {
    id: "secrets",
    icon: <Flame className="h-6 w-6 text-red-500" />,
    title: "Secrets",
    color: "bg-red-500/10 text-red-500",
    desc: "Secure Links"
  },
  {
    id: "tracker",
    icon: <SquareKanban className="h-6 w-6 text-indigo-500" />,
    title: "Tracker",
    color: "bg-indigo-500/10 text-indigo-500",
    desc: "Kanban"
  },
  {
    id: "habits",
    icon: <Activity className="h-6 w-6 text-emerald-500" />,
    title: "Habits",
    color: "bg-emerald-500/10 text-emerald-500",
    desc: "Routine"
  },
  {
    id: "steps",
    icon: <Footprints className="h-6 w-6 text-slate-500" />,
    title: "Steps",
    color: "bg-slate-500/10 text-slate-500",
    desc: "Processes"
  },
  {
    id: "trash",
    icon: <Trash2 className="h-6 w-6 text-muted-foreground" />,
    title: "Trash",
    color: "bg-muted/50 text-muted-foreground",
    desc: "Deleted"
  },
  {
    id: "ai",
    icon: <Sparkles className="h-6 w-6 text-yellow-500" />,
    title: "AI Editor",
    color: "bg-yellow-500/10 text-yellow-500",
    desc: "Gemini"
  }
];

function SortableFeatureCard({ feature, isEditMode }: { feature: typeof INITIAL_FEATURES[0], isEditMode: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: feature.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all active:scale-95 h-full w-full relative">
      {isEditMode && (
        <div className="absolute top-2 right-2 text-muted-foreground/40">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className={`p-3 rounded-full ${feature.color}`}>
        {feature.icon}
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-sm">{feature.title}</h3>
        <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
      </div>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn("h-full", isDragging && "opacity-50")} {...(isEditMode ? { ...attributes, ...listeners } : {})}>
      {isEditMode ? (
        <div className="h-full cursor-grab active:cursor-grabbing">
          {content}
        </div>
      ) : (
        <Link href={`/mobileview/${feature.id}`} className="h-full block">
          {content}
        </Link>
      )}
    </div>
  );
}

export default function MobileHomePage() {
  const [search, setSearch] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderedFeatures, setOrderedFeatures] = useState(INITIAL_FEATURES);
  
  // Use snippets hook for Smart Editor auto-complete
  const { snippets } = useSnippets();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const savedOrder = localStorage.getItem("mobileFeatureOrder");
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        const newOrderedFeatures = parsedOrder.map((id: string) => 
          INITIAL_FEATURES.find(f => f.id === id)
        ).filter(Boolean);
        
        // Add any new features that weren't in the saved order
        const missingFeatures = INITIAL_FEATURES.filter(f => !parsedOrder.includes(f.id));
        setOrderedFeatures([...newOrderedFeatures, ...missingFeatures]);
      } catch (e) {
        console.error("Failed to parse saved order", e);
      }
    }

    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUsername(data.user.username);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedFeatures((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem("mobileFeatureOrder", JSON.stringify(newOrder.map(f => f.id)));
        return newOrder;
      });
    }
  };

  const filteredFeatures = useMemo(() => 
    orderedFeatures.filter(f => 
      f.title.toLowerCase().includes(search.toLowerCase()) || 
      f.desc.toLowerCase().includes(search.toLowerCase())
    ),
    [orderedFeatures, search]
  );

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="px-4 py-3 border-b flex items-center justify-between bg-background/95 backdrop-blur shrink-0 z-10 sticky top-0">
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
           <span className="font-bold text-lg tracking-tight">Personal Store</span>
        </div>
        <div className="flex items-center gap-1">
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => setIsEditMode(!isEditMode)} 
             className={cn(isEditMode ? "text-primary bg-primary/10" : "text-muted-foreground")}
           >
             {isEditMode ? <Check className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
           </Button>
           <Button variant="ghost" size="icon" onClick={() => setIsSmartEditorOpen(true)} className="text-yellow-500">
             <Sparkles className="h-5 w-5" />
           </Button>
           <ModeToggle />
           <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(true)}>
             <UserIcon className="h-5 w-5" />
           </Button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-muted/50 border-none" 
            placeholder="Search apps..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={filteredFeatures.map(f => f.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3">
              {filteredFeatures.map((feature) => (
                <SortableFeatureCard 
                  key={feature.id} 
                  feature={feature} 
                  isEditMode={isEditMode} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        <div className="mt-6 text-center text-xs text-muted-foreground/40">
           v1.0.0 • {isEditMode ? "Editing Layout" : "Mobile View"}
        </div>
      </div>

      <UserProfileDialog 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
        username={username}
        onUpdate={setUsername}
      />
      
      {/* Smart Editor Full Screen Overlay */}
      {isSmartEditorOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-5">
           <SmartEditor 
              isOpen={true} 
              onClose={() => setIsSmartEditorOpen(false)} 
              snippets={snippets} 
           />
        </div>
      )}
    </div>
  );
}
