import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Snippet } from "@/types";
import { Sparkles, X, Copy, Bot, Loader2, Braces } from "lucide-react";
import { toast } from "sonner";

interface SmartEditorProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
}

export const SmartEditor = memo(function SmartEditor({ isOpen, onClose, snippets }: SmartEditorProps) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Snippet[]>([]);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showVariables, setShowVariables] = useState(false);
  const [hasShownVariables, setHasShownVariables] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract variables from text
  const variables = useMemo(() => {
    const matches = Array.from(text.matchAll(/{{\s*([^}\s]+)\s*}}/g));
    const uniqueVars = new Set<string>();
    matches.forEach(match => {
      const varName = match[1];
      if (varName) uniqueVars.add(varName);
    });
    return Array.from(uniqueVars);
  }, [text]);

  // Auto-show variables when they first appear
  useEffect(() => {
    if (variables.length > 0) {
      if (!hasShownVariables) {
        setShowVariables(true);
        setHasShownVariables(true);
      }
    } else {
      setHasShownVariables(false);
      setShowVariables(false);
    }
  }, [variables.length, hasShownVariables]);

  // Sync variableValues state when variables change
  useEffect(() => {
    setVariableValues(prev => {
      const next = { ...prev };
      let changed = false;
      
      // Remove values for variables that are no longer present
      Object.keys(next).forEach(key => {
        if (!variables.includes(key)) {
          delete next[key];
          changed = true;
        }
      });
      
      // Add empty values for new variables
      variables.forEach(v => {
        if (next[v] === undefined) {
          next[v] = "";
          changed = true;
        }
      });
      
      return changed ? next : prev;
    });
  }, [variables]);

  const getProcessedText = useCallback(() => {
    let processedText = text;
    Object.entries(variableValues).forEach(([variable, value]) => {
      if (value) {
        // Use a regex that handles potential special characters in variable name
        // and also handles variable whitespace inside the braces
        const escapedVar = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`{{\\s*${escapedVar}\\s*}}`, 'g');
        processedText = processedText.replace(regex, value);
      }
    });
    return processedText;
  }, [text, variableValues]);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorIndex(e.target.selectionStart);
  }, []);

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorIndex(e.currentTarget.selectionStart);
  }, []);

  const insertSnippet = useCallback((snippet: Snippet) => {
    if (!textareaRef.current || cursorIndex === null) return;

    const textBeforeCursor = text.slice(0, cursorIndex);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbolIndex === -1) return;

    const textAfterCursor = text.slice(cursorIndex);
    const newText = text.slice(0, lastAtSymbolIndex) + snippet.content + textAfterCursor;
    
    setText(newText);
    setSuggestions([]);
    textareaRef.current.focus();
  }, [text, cursorIndex]);

  const handleAskGemini = useCallback(async () => {
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
  }, [text]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="p-4 border-b flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Smart Editor
        </div>
        <div className="flex items-center gap-2">
          {variables.length > 0 && (
            <Button 
              variant={showVariables ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setShowVariables(!showVariables)}
              className="h-8 gap-2"
            >
              <Braces className="h-4 w-4" />
              <span className="hidden sm:inline">Variables</span>
              <span className="bg-primary/20 text-primary px-1.5 rounded-full text-[10px] font-bold">
                {variables.length}
              </span>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 lg:hidden">
            <X className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hidden lg:flex">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div className={`relative flex flex-col transition-all duration-300 ${
          (showGemini && showVariables && variables.length > 0) ? "h-1/3 border-b" :
          (showGemini || (showVariables && variables.length > 0)) ? "h-1/2 border-b" : 
          "h-full"
        }`}>
          <div className="flex-1 relative w-full min-h-0">
            <HighlightedTextarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onSelect={handleSelect}
              className="w-full h-full resize-none border-none focus-visible:ring-0 p-4 text-base leading-relaxed rounded-none font-sans"
              placeholder="Type @ to insert a snippet... Use {{variable}} for dynamic values."
            />
          </div>
          
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

        {showVariables && variables.length > 0 && (
          <div className={`flex flex-col bg-muted/5 relative animate-in slide-in-from-bottom-10 duration-300 ${
            showGemini ? 'h-1/3 border-b' : 'flex-1'
          } overflow-hidden`}>
            <div className="p-2 border-b flex items-center justify-between bg-muted/10 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2 px-2">
                <Braces className="h-3 w-3 text-primary" />
                Variable Values
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-muted/20" 
                onClick={() => setShowVariables(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {variables.map(variable => (
                  <div key={variable} className="space-y-1.5">
                    <Label htmlFor={`var-${variable}`} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      {variable}
                    </Label>
                    <Input
                      id={`var-${variable}`}
                      placeholder={`Value for ${variable}...`}
                      value={variableValues[variable] || ""}
                      onChange={(e) => setVariableValues(prev => ({
                        ...prev,
                        [variable]: e.target.value
                      }))}
                      className="h-8 text-sm bg-background"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showGemini && (
          <div className={`${(showVariables && variables.length > 0) ? 'h-1/3' : 'h-1/2'} flex flex-col bg-muted/5 relative animate-in slide-in-from-bottom-10 duration-300`}>
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
            {variables.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(text);
                  toast.success("Template copied!");
              }}>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Template
              </Button>
            )}
            <Button size="sm" variant="default" onClick={() => {
                const processed = getProcessedText();
                navigator.clipboard.writeText(processed);
                toast.success(variables.length > 0 ? "Copied with variable values!" : "Copied to clipboard!");
            }}>
                <Copy className="h-3 w-3 mr-2" />
                {variables.length > 0 ? "Copy Final" : "Copy All"}
            </Button>
          </div>
      </div>
    </div>
  );
});
