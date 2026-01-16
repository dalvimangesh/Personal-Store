"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartEditor } from "@/components/SmartEditor";
import { MobileSnippetStore } from "@/components/mobile/snippet-store";
import { MobileSharedSnippetStore } from "@/components/mobile/shared-snippet-store";
import { MobileTodoStore } from "@/components/mobile/todo-store";
import { MobileHabitStore } from "@/components/mobile/habit-store";
import { MobileLinkStore } from "@/components/mobile/link-store";
import { MobileStepsStore } from "@/components/mobile/steps-store";
import { MobileTrackerStore } from "@/components/mobile/tracker-store";
import { MobileTrashStore } from "@/components/mobile/trash-store";
import { MobileClipboardStore } from "@/components/mobile/clipboard-store";
import { MobileDropStore } from "@/components/mobile/drop-store";
import { MobileSecretStore } from "@/components/mobile/secret-store";
import { useSnippets } from "@/hooks/useSnippets";

export function MobileFeatureContent({ feature }: { feature: string }) {
  const { snippets } = useSnippets(); // For AI editor

  const renderContent = () => {
    switch (feature) {
      case "snippets":
        return <MobileSnippetStore />;
      case "clipboard":
        return <MobileClipboardStore />;
      case "todos":
        return <MobileTodoStore />;
      case "links":
        return <MobileLinkStore />;
      case "drop":
        return <MobileDropStore />;
      case "public":
        return <MobileSharedSnippetStore />;
      case "secrets":
        return <MobileSecretStore />;
      case "tracker":
        return <MobileTrackerStore />;
      case "habits":
        return <MobileHabitStore />;
      case "steps":
        return <MobileStepsStore />;
      case "trash":
        return <MobileTrashStore />;
      case "ai":
        return (
          <div className="h-full relative">
             <SmartEditor 
                isOpen={true} 
                onClose={() => {}} // No close action for full page
                snippets={snippets} 
             />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Feature not found
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (feature) {
      case "snippets": return "Snippets";
      case "clipboard": return "Clipboard";
      case "todos": return "Tasks";
      case "links": return "Links";
      case "drop": return "Drop";
      case "public": return "Public";
      case "secrets": return "Secrets";
      case "tracker": return "Tracker";
      case "habits": return "Habits";
      case "steps": return "Steps";
      case "trash": return "Trash";
      case "ai": return "Smart Editor";
      default: return "App";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur shrink-0 z-10">
        <Link href="/mobileview">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-semibold text-lg">{getTitle()}</h1>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
}
