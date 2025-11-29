"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { SharedSnippet } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HighlightedTextarea } from "@/components/ui/highlighted-textarea";
import { Loader2, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SharedSnippetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [snippet, setSnippet] = useState<SharedSnippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use React.use() to unwrap params
  const { id } = use(params);

  useEffect(() => {
    const fetchSnippet = async () => {
      try {
        const res = await fetch(`/api/shared-snippets/${id}`);
        
        if (res.status === 401) {
          // Not authenticated
          router.push(`/login?callbackUrl=/share/${id}`);
          return;
        }

        if (res.status === 403) {
           setError("You do not have permission to view this snippet.");
           setLoading(false);
           return;
        }
        
        if (res.status === 404) {
            setError("Snippet not found.");
            setLoading(false);
            return;
        }

        const data = await res.json();
        if (data.success) {
          setSnippet(data.data);
        } else {
          setError(data.error || "Failed to load snippet");
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchSnippet();
  }, [id, router]);

  const handleCopy = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet.content);
      toast.success("Content copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Error</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/')}>Go to Home</Button>
      </div>
    );
  }

  if (!snippet) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{snippet.title}</h1>
            <div className="flex gap-2 mt-2">
              {snippet.tags.map((tag) => (
                <span key={tag} className="bg-secondary px-2 py-1 rounded text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Button onClick={handleCopy} variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copy Content
          </Button>
        </div>

        <Card className="min-h-[400px] p-4 bg-card">
          <HighlightedTextarea
             value={snippet.content}
             readOnly
             className="min-h-[400px] w-full resize-none border-none shadow-none focus-visible:ring-0 p-0 font-mono text-sm leading-relaxed bg-transparent"
           />
        </Card>
        
        <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Shared via Personal Store</span>
            {snippet.author && <span>Shared by user</span>}
        </div>
      </div>
    </div>
  );
}

