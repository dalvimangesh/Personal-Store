import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Snippet } from "@/types";
import { Sparkles, X, Copy } from "lucide-react";

interface SmartEditorProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: Snippet[];
}

export function SmartEditor({ isOpen, onClose, snippets }: SmartEditorProps) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Snippet[]>([]);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
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

  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-[600px] border-l flex flex-col bg-background h-full transition-all duration-300 ease-in-out border-t lg:border-t-0 lg:border-l shadow-2xl lg:shadow-none fixed bottom-0 left-0 right-0 h-[50vh] lg:h-full lg:static z-50">
      <div className="p-4 border-b flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Smart Editor
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 relative flex flex-col">
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
      
      <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
              {text.length} chars
          </div>
          <Button size="sm" variant="default" onClick={() => {
              navigator.clipboard.writeText(text);
          }}>
              <Copy className="h-3 w-3 mr-2" />
              Copy All
          </Button>
      </div>
    </div>
  );
}
