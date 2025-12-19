"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Flame, Timer, Trash2, Loader2, ShieldCheck } from "lucide-react";

export function SecretCreator({ isPrivacyMode = false }: { isPrivacyMode?: boolean }) {
  const [content, setContent] = useState("");
  const [expiration, setExpiration] = useState("0"); // 0 means never (or logic handled by backend default)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!content.trim()) {
        toast.error("Please enter some content for the secret.");
        return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            content,
            maxViews: 1, // For now, hardcode to 1 for the "Burn After Reading" vibe
            expirationInMinutes: expiration === "0" ? undefined : parseInt(expiration)
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      const link = `${window.location.origin}/secret/${data.id}`;
      setGeneratedLink(link);
      toast.success("Secret link created!");
      setContent(""); // Clear sensitive data
    } catch (error) {
      console.error(error);
      toast.error("Failed to create secret link");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard");
    }
  };

  if (generatedLink) {
      return (
        <div className="flex flex-col h-full gap-6 w-full pb-10">
            <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                  Secret link ready. Share it securely.
                </p>
            </div>
            
            <div className="flex flex-col items-center justify-center flex-1 gap-6 p-4">
                <div className="flex flex-col items-center gap-4 w-full max-w-md text-center">
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                        <ShieldCheck className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold">Link Generated</h3>
                    <p className="text-muted-foreground">
                        This link will show the secret exactly once, then self-destruct.
                    </p>
                </div>

                <div className="w-full max-w-md space-y-2">
                    <div className="flex items-center gap-2">
                        <Input 
                            readOnly 
                            value={generatedLink} 
                            className="font-mono text-sm bg-background"
                        />
                        <Button onClick={copyLink} size="icon" className="shrink-0">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setGeneratedLink(null)}
                    >
                        Create Another Secret
                    </Button>
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="flex flex-col h-full gap-6 w-full pb-10">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
            Create a secure, one-time link. The message is deleted after viewing.
        </p>
      </div>

      <div className="flex flex-col bg-card p-4 rounded-lg border shadow-sm gap-4 flex-1 min-h-0">
        <Textarea
            placeholder="Paste your password, API key, or secret message here..."
            className={`flex-1 font-mono resize-none min-h-[200px] border-none focus-visible:ring-0 p-0 text-base ${isPrivacyMode ? "blur-sm hover:blur-none transition-all duration-300" : ""}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
        />
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <Select value={expiration} onValueChange={setExpiration}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Expiration" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="60">1 Hour</SelectItem>
                        <SelectItem value="1440">24 Hours</SelectItem>
                        <SelectItem value="10080">7 Days</SelectItem>
                        <SelectItem value="0">Never (until viewed)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                {content && (
                    <span className="text-xs text-muted-foreground hidden sm:inline-block">
                        {content.length} chars
                    </span>
                )}
                <Button 
                    onClick={handleCreate}
                    disabled={isLoading || !content.trim()}
                    className="w-full sm:w-auto"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                        </>
                    ) : (
                        <>
                            <Flame className="mr-2 h-4 w-4 text-orange-500" /> Generate Secret Link
                        </>
                    )}
                </Button>
            </div>
        </div>
      </div>
      
      <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground px-1">
          <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
              <div>
                  <div className="font-medium text-foreground">Encrypted</div>
                  Stored securely until fetched.
              </div>
          </div>
          <div className="flex items-start gap-2">
              <Flame className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
              <div>
                  <div className="font-medium text-foreground">One-Time View</div>
                  Deleted immediately after viewing.
              </div>
          </div>
          <div className="flex items-start gap-2">
              <Copy className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                  <div className="font-medium text-foreground">No Accounts</div>
                  Recipients don't need to sign up.
              </div>
          </div>
      </div>
    </div>
  );
}
