import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Snippet } from "@/types";
import { Sparkles, X, Copy, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SmartEditorProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
}

export function SmartEditor({ isOpen, onClose, snippets }: SmartEditorProps) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Snippet[]>([]);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (cursorIndex === null) {
      setSuggestions([]);
      return;
    }

    const textBeforeCursor = text.slice(0, cursorIndex);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      
      if (query.includes('\n')) {
        setSuggestions([]);
        return;
      }

      if (query.length >= 0) {
        const matches = snippets
          .filter(s => !s.isHidden && s.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
        setSuggestions(matches);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [text, cursorIndex, snippets]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorIndex(e.target.selectionStart);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorIndex(e.currentTarget.selectionStart);
  };

  const insertSnippet = (snippet: Snippet) => {
    if (!textareaRef.current || cursorIndex === null) return;

    const textBeforeCursor = text.slice(0, cursorIndex);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbolIndex === -1) return;

    const textAfterCursor = text.slice(cursorIndex);
    const newText = text.slice(0, lastAtSymbolIndex) + snippet.content + textAfterCursor;
    
    setText(newText);
    setSuggestions([]);
    textareaRef.current.focus();
  };

  const handleAskGemini = async () => {
    if (!text.trim()) return;
    
    setIsGeminiLoading(true);
    setShowGemini(true);
    setGeminiResponse("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch");
      }

      const data = await res.json();
      setGeminiResponse(data.result);
    } catch (error: any) {
      console.error(error);
      setGeminiResponse(error.message || "Error fetching response from Gemini. Please try again.");
    } finally {
      setIsGeminiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-[600px] border-l flex flex-col bg-background transition-all duration-300 ease-in-out border-t lg:border-t-0 lg:border-l shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:shadow-none fixed bottom-0 left-0 right-0 h-[85vh] lg:h-full lg:static z-50 rounded-t-xl lg:rounded-none">
      <div className="p-4 border-b flex items-center justify-between bg-muted/10 rounded-t-xl lg:rounded-none">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Smart Editor
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 lg:hidden">
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hidden lg:flex">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div className={`relative flex flex-col transition-all duration-300 ${showGemini ? "h-1/2 border-b" : "h-full"}`}>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onSelect={handleSelect}
            className="flex-1 resize-none border-none focus-visible:ring-0 p-4 text-base leading-relaxed rounded-none"
            placeholder="Type @ to insert a snippet..."
          />
          
          {/* Suggestions Popup */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-50">
              <div className="bg-popover text-popover-foreground rounded-md border shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                  Suggested Snippets
                </div>
                <div className="p-1 max-h-[200px] overflow-y-auto">
                  {suggestions.map(snippet => (
                    <Button
                      key={snippet.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-3 text-left flex flex-col items-start gap-1 hover:bg-muted"
                      onClick={() => insertSnippet(snippet)}
                    >
                      <span className="font-medium text-sm">{snippet.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 w-full font-normal opacity-70">
                        {snippet.content}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {showGemini && (
          <div className="h-1/2 flex flex-col bg-muted/5 relative animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-2 border-b flex items-center justify-between bg-muted/10 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2 px-2">
                <Bot className="h-3 w-3 text-blue-500" />
                Gemini Response
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-muted/20" 
                  onClick={() => {
                    navigator.clipboard.writeText(geminiResponse);
                    toast.success("Copied Gemini response!");
                  }}
                  title="Copy response"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-muted/20" 
                  onClick={() => setShowGemini(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {isGeminiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Generating response...</span>
              </div>
            ) : (
              <Textarea 
                value={geminiResponse} 
                onChange={(e) => setGeminiResponse(e.target.value)}
                className="flex-1 resize-none border-none focus-visible:ring-0 p-4 text-base leading-relaxed bg-transparent font-mono text-sm" 
                placeholder="Gemini response will appear here..."
              />
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
              {text.length} chars
          </div>
          <div className="flex items-center gap-2">
            <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAskGemini}
                disabled={isGeminiLoading || !text.trim()}
            >
                <Sparkles className="h-3 w-3 mr-2 text-blue-500" />
                Ask Gemini
            </Button>
            <Button size="sm" variant="default" onClick={() => {
                navigator.clipboard.writeText(text);
            }}>
                <Copy className="h-3 w-3 mr-2" />
                Copy All
            </Button>
          </div>
      </div>
    </div>
  );
}
