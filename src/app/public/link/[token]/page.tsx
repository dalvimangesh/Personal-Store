"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Copy, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/ModeToggle";

interface LinkItem {
  label: string;
  value: string;
}

interface PublicCategory {
  name: string;
  items: LinkItem[];
  updatedAt: string;
}

export default function PublicLinkPage() {
  const params = useParams();
  const token = params.token as string;
  const [category, setCategory] = useState<PublicCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/link-share/${token}`);
        const data = await res.json();
        
        if (res.ok) {
          setCategory(data.data);
        } else {
          setError(data.error || "Failed to load link");
        }
      } catch (err) {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
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
              The link might be expired, invalid, or no longer public.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
        <ModeToggle />
      </div>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {category?.name || "Shared Links"}
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">
                Read Only
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {category?.items.map((item, index) => {
              const isUrl = item.value.startsWith("http");
              return (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 sm:p-0 border sm:border-0 rounded-lg bg-muted/10 sm:bg-transparent w-full">
                  <Input
                    readOnly
                    value={item.label}
                    className="w-full sm:w-1/4 sm:min-w-[100px] font-medium bg-background sm:bg-transparent"
                  />
                  <div className="flex gap-2 w-full sm:flex-1">
                    <div className="relative flex-1">
                      <Input 
                        readOnly 
                        value={item.value} 
                        className={`flex-1 font-mono text-sm bg-background sm:bg-transparent ${isUrl ? 'text-blue-500 underline decoration-blue-500/30' : ''}`}
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                       {isUrl && (
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => window.open(item.value, '_blank')}
                          >
                              <ExternalLink className="h-4 w-4" />
                          </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(item.value)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {category?.items.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No links in this category.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

