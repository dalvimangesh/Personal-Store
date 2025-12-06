"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface PublicClipboard {
  name: string;
  content: string;
  updatedAt: string;
}

export default function PublicClipPage() {
  const params = useParams();
  const token = params.token as string;
  const [clipboard, setClipboard] = useState<PublicClipboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/quick-clip/${token}`);
        const data = await res.json();
        
        if (res.ok) {
            setClipboard(data.data);
        } else {
          setError(data.error || "Failed to load clipboard");
        }
      } catch (err) {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleCopy = async () => {
    if (!clipboard?.content) return;
    try {
      await navigator.clipboard.writeText(clipboard.content);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-10 gap-4 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">{error}</h2>
            <p className="text-muted-foreground text-sm">
              The clipboard might be expired, invalid, or no longer public.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col max-h-[calc(100vh-4rem)]">
        <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="flex-none px-4 sm:px-6">
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span className="truncate mr-2">{clipboard?.name || "Shared Clipboard"}</span>
              <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                    Read Only
                  </span>
                  <Button size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <Textarea 
                readOnly 
                value={clipboard?.content} 
                className="w-full h-full resize-none font-mono bg-muted/10 border-0 focus-visible:ring-0 p-4 sm:p-6 rounded-none focus:ring-0 shadow-none"
                style={{ outline: 'none', boxShadow: 'none' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

