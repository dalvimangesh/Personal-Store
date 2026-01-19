"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Bot, User, Send, Loader2, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "snippet" | "clipboard" | "link" | "unknown";
  data?: any;
  status?: "pending" | "success" | "error" | "cancelled";
  error?: string;
}

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("ai_chat_history");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse chat history", e);
        setMessages([{
            id: "welcome",
            role: "assistant",
            content: "Hi! I can help you save things to your store. Just paste a snippet, some text, or a link, and I'll organize it for you.",
        }]);
      }
    } else {
        setMessages([{
            id: "welcome",
            role: "assistant",
            content: "Hi! I can help you save things to your store. Just paste a snippet, some text, or a link, and I'll organize it for you.",
        }]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem("ai_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Small timeout to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const handleClearHistory = () => {
      setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hi! I can help you save things to your store. Just paste a snippet, some text, or a link, and I'll organize it for you.",
      }]);
      localStorage.removeItem("ai_chat_history");
      toast.success("Chat history cleared");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 0. Fetch existing link categories to give context to AI
      let existingLinkCategories: string[] = [];
      try {
        const linkRes = await fetch("/api/link-share");
        if (linkRes.ok) {
            const linkData = await linkRes.json();
            const aiFolder = linkData.data.folders?.find((f: any) => f.name === "AI Links");
            if (aiFolder && linkData.data.categories) {
                existingLinkCategories = linkData.data.categories
                    .filter((c: any) => c.folderId === aiFolder._id)
                    .map((c: any) => c.name);
            }
        }
      } catch (e) {
          console.error("Failed to fetch link categories for context", e);
      }

      // 1. Analyze text
      const analyzeRes = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            text: userMessage.content,
            existingCategories: existingLinkCategories 
        }),
      });

      if (!analyzeRes.ok) {
          const errorData = await analyzeRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to analyze text");
      }

      const analyzeData = await analyzeRes.json();
      const result = analyzeData.result;

      if (!result) throw new Error("No result from AI");

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        role: "assistant",
        content: result.reasoning || `I think this is a ${result.type}.`,
        type: result.type,
        data: result.data,
        status: "pending",
      };

      setMessages((prev) => [...prev, aiMessage]);

      // 2. Execute Action based on type
      if (result.type === "snippet") {
        await createSnippet(result.data, aiMessageId);
      } else if (result.type === "clipboard") {
        await createClipboard(result.data, aiMessageId);
      } else if (result.type === "link") {
        await createLink(result.data, aiMessageId);
      } else {
        updateMessageStatus(aiMessageId, "error", "I couldn't classify this content.");
      }

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Error: ${errorMessage}`,
          status: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessageStatus = (id: string, status: Message["status"], contentSuffix?: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === id) {
          return {
            ...msg,
            status,
            content: contentSuffix ? `${msg.content} ${contentSuffix}` : msg.content,
          };
        }
        return msg;
      })
    );
  };

  const createSnippet = async (data: any, messageId: string) => {
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title || "New Snippet",
          content: data.content,
          tags: data.tags || [],
          isHidden: false,
          isHiding: false,
        }),
      });

      if (res.ok) {
        updateMessageStatus(messageId, "success", "Saved to Snippet Store!");
        toast.success("Snippet saved!");
      } else {
        throw new Error("Failed to save snippet");
      }
    } catch (e) {
        console.error(e);
      updateMessageStatus(messageId, "error", "Failed to save snippet.");
    }
  };

  const createClipboard = async (data: any, messageId: string) => {
    try {
      // Fetch existing
      const getRes = await fetch("/api/quick-clip");
      if (!getRes.ok) throw new Error("Failed to fetch clipboard store");
      const getData = await getRes.json();
      
      let clipboards = getData.data.clipboards || [];
      if (!clipboards || clipboards.length === 0) {
           clipboards = [{ name: "Main", content: "", isOwner: true, sharedWith: [] }];
      }

      // Append new
      const newClipboard = {
        name: data.title || "AI Clip",
        content: data.content,
        isOwner: true,
        sharedWith: [],
      };
      
      const ownedClipboards = [...clipboards.filter((c: any) => c.isOwner !== false), newClipboard];

      // Save
      const saveRes = await fetch("/api/quick-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipboards: ownedClipboards }),
      });

      if (saveRes.ok) {
        updateMessageStatus(messageId, "success", "Saved to Clipboard Store!");
        toast.success("Clipboard saved!");
      } else {
        throw new Error("Failed to save clipboard");
      }
    } catch (e) {
        console.error(e);
      updateMessageStatus(messageId, "error", "Failed to save clipboard.");
    }
  };

  const generateMongoId = () => {
    const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
      return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
  };

  const createLink = async (data: any, messageId: string) => {
    try {
       // Fetch existing
       const getRes = await fetch("/api/link-share");
       if (!getRes.ok) throw new Error("Failed to fetch link store");
       const getData = await getRes.json();
       
       let categories = getData.data.categories || [];
       let folders = getData.data.folders || [];

       // 1. Find or Create "AI Links" folder
       let aiFolder = folders.find((f: any) => f.name === "AI Links");
       if (!aiFolder) {
           const newFolderId = generateMongoId();
           aiFolder = { _id: newFolderId, name: "AI Links" }; 
           folders.push(aiFolder);
       }
       
       const aiFolderId = aiFolder._id;

       // 2. Determine Category
       // AI suggests a category name. We need to find if it exists INSIDE "AI Links" folder.
       const suggestedCategoryName = data.category || "General";
       
       let targetCategoryIndex = categories.findIndex((c: any) => 
            c.isOwner && 
            c.folderId === aiFolderId && 
            c.name.toLowerCase() === suggestedCategoryName.toLowerCase()
       );

       if (targetCategoryIndex === -1) {
           // Create new category inside AI Links folder
           categories.push({
               name: suggestedCategoryName,
               items: [],
               isOwner: true,
               sharedWith: [],
               folderId: aiFolderId
           });
           targetCategoryIndex = categories.length - 1;
       }

       // 3. Add Item
       const newItem = {
           label: data.title || data.url,
           value: data.url,
       };

       categories[targetCategoryIndex].items.push(newItem);

       // Save
       const saveRes = await fetch("/api/link-share", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ categories, folders }),
       });

       if (saveRes.ok) {
         updateMessageStatus(messageId, "success", `Saved to Link Store (Folder: AI Links, Category: ${suggestedCategoryName})!`);
         toast.success("Link saved!");
       } else {
         const errorData = await saveRes.json().catch(() => ({}));
         throw new Error(errorData.error || "Failed to save link");
       }
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Failed to save link";
        updateMessageStatus(messageId, "error", `Failed to save link: ${errorMessage}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50 border-none">
      <div className="p-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-medium flex items-center justify-between shrink-0 z-10 border-b">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
                <div className="text-sm font-semibold">AI Assistant</div>
            </div>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={handleClearHistory}
            title="Clear History"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
            <div className="space-y-3">
            {messages.map((msg) => (
                <div
                key={msg.id}
                className={`flex gap-3 ${
                    msg.role === "assistant" ? "justify-start" : "justify-end"
                }`}
                >
                {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-1 border border-border/50">
                    <Bot className="h-3 w-3 text-muted-foreground" />
                    </div>
                )}
                
                <div className={`max-w-[85%] space-y-1`}>
                    <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap border ${
                        msg.role === "assistant"
                        ? "bg-muted/50 border-border/50 text-foreground rounded-tl-none"
                        : "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-800/50 text-foreground rounded-tr-none"
                    }`}
                    >
                    {msg.content}
                    </div>
                    
                    {msg.status && msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-top-1 px-1">
                        {msg.status === "pending" && (
                            <>
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                <span>Processing...</span>
                            </>
                        )}
                        {msg.status === "success" && (
                            <>
                                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                                <span className="text-green-600 dark:text-green-400">Success</span>
                            </>
                        )}
                        {msg.status === "error" && (
                            <>
                                <XCircle className="h-2.5 w-2.5 text-red-500" />
                                <span className="text-red-500">Failed</span>
                            </>
                        )}
                    </div>
                    )}
                </div>

                {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0 mt-1 border border-blue-100/50 dark:border-blue-800/50">
                    <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                )}
                </div>
            ))}
            <div ref={messagesEndRef} />
            </div>
        </div>
      </div>

      <div className="p-3 border-t bg-background shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading) handleSendMessage();
                }
            }}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 min-h-[40px] max-h-[160px] resize-none py-2"
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} size="icon" className="h-10 w-10 shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
