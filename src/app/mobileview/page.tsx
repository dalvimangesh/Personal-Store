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
  Settings,
  User as UserIcon,
  Bot
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { SmartEditor } from "@/components/SmartEditor";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useSnippets } from "@/hooks/useSnippets";

const features = [
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
    desc: "AI-Powered"
  },
  {
    id: "agent",
    icon: <Bot className="h-6 w-6 text-indigo-500" />,
    title: "Agent Store",
    color: "bg-indigo-500/10 text-indigo-500",
    desc: "AI Assistant"
  }
];

export default function MobileHomePage() {
  const [search, setSearch] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);
  
  // Use snippets hook for Smart Editor auto-complete
  const { snippets } = useSnippets();

  useEffect(() => {
    // Load visible features from localStorage
    const saved = localStorage.getItem("mobile_visible_features");
    if (saved) {
      try {
        setVisibleFeatures(JSON.parse(saved));
      } catch (e) {
        setVisibleFeatures(features.map(f => f.id));
      }
    } else {
      setVisibleFeatures(features.map(f => f.id));
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

  const toggleFeature = (id: string) => {
    setVisibleFeatures(prev => {
      const next = prev.includes(id) 
        ? prev.filter(f => f !== id) 
        : [...prev, id];
      localStorage.setItem("mobile_visible_features", JSON.stringify(next));
      return next;
    });
  };

  const filteredFeatures = features.filter(f => 
    visibleFeatures.includes(f.id) && (
      f.title.toLowerCase().includes(search.toLowerCase()) || 
      f.desc.toLowerCase().includes(search.toLowerCase())
    )
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
           <Button variant="ghost" size="icon" onClick={() => setIsSmartEditorOpen(true)} className="text-yellow-500">
             <Sparkles className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
             <Settings className="h-5 w-5 text-muted-foreground" />
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
        <div className="grid grid-cols-2 gap-3">
          {filteredFeatures.map((feature) => (
            <Link 
              href={`/mobileview/${feature.id}`} 
              key={feature.id}
              className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all active:scale-95"
            >
              <div className={`p-3 rounded-full ${feature.color}`}>
                {feature.icon}
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-6 text-center text-xs text-muted-foreground/40">
           v1.0.0 • Mobile View
        </div>
      </div>

      <UserProfileDialog 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
        username={username}
        onUpdate={setUsername}
      />

      {/* Feature Visibility Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Home</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs text-muted-foreground mb-2">Toggle the apps you want to see on your home screen.</p>
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature) => (
                <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${feature.color} scale-75`}>
                      {feature.icon}
                    </div>
                    <div>
                      <Label htmlFor={`feat-${feature.id}`} className="font-medium cursor-pointer text-sm">{feature.title}</Label>
                      <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                  <Checkbox 
                    id={`feat-${feature.id}`}
                    checked={visibleFeatures.includes(feature.id)}
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
