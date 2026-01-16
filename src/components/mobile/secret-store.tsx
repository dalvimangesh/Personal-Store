"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Flame, Timer, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function MobileSecretStore() {
  const [content, setContent] = useState("");
  const [expiration, setExpiration] = useState("0");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!content.trim()) {
        toast.error("Please enter some content.");
        return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            content,
            maxViews: 1,
            expirationInMinutes: expiration === "0" ? undefined : parseInt(expiration)
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const link = `${window.location.origin}/secret/${data.id}`;
      setGeneratedLink(link);
      toast.success("Secret link created!");
      setContent("");
    } catch (error) {
      toast.error("Failed to create secret link");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied");
    }
  };

  if (generatedLink) {
      return (
        <div className="flex flex-col h-full bg-background p-4">
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full animate-in zoom-in duration-300">
                    <ShieldCheck className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Link Ready</h3>
                    <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                        This link will show the secret exactly once, then self-destruct.
                    </p>
                </div>

                <Card className="w-full p-2 flex items-center gap-2 bg-muted/50 border-dashed">
                    <Input 
                        readOnly 
                        value={generatedLink} 
                        className="font-mono text-xs h-9 border-none bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <Button onClick={copyLink} size="sm" className="shrink-0 h-8">
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                </Card>

                <Button 
                    variant="ghost" 
                    className="mt-4"
                    onClick={() => setGeneratedLink(null)}
                >
                    Create Another Secret
                </Button>
            </div>
        </div>
      )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Secret Message
              </label>
              <Textarea
                  placeholder="Paste password, API key, or private message..."
                  className="font-mono resize-none min-h-[200px] text-base p-4 bg-card"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
              />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Expiration</label>
              <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger className="w-full">
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

          <Button 
              onClick={handleCreate}
              disabled={isLoading || !content.trim()}
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
              {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                  <Flame className="mr-2 h-5 w-5 fill-white text-white" />
              )}
              Burn After Reading
          </Button>

          <div className="grid grid-cols-1 gap-3 pt-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div className="text-xs">
                      <span className="font-semibold block mb-0.5">Encrypted</span>
                      Stored securely until fetched.
                  </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <div className="text-xs">
                      <span className="font-semibold block mb-0.5">One-Time View</span>
                      Deleted immediately after viewing.
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
