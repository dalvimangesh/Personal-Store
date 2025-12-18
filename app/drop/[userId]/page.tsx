"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle, ShieldCheck, LogIn, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PublicDropPage() {
  const params = useParams();
  const token = params.userId as string; // Reusing the param name but it's now potentially a token
  
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'unauthorized' | 'expired'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkToken = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/public/drop/check/${token}`);
        if (res.status === 410) {
           setStatus('expired');
           setErrorMessage("This drop link has already been used.");
        } else if (res.status === 404) {
           setStatus('expired');
           setErrorMessage("This drop link is invalid.");
        }
      } catch (e) {
         // ignore network errors, let post handle it
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, [token]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setStatus('sending');
    try {
      const res = await fetch(`/api/public/drop/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401) {
          setStatus('unauthorized');
          toast.error("Please login to send a message");
          return;
      }

      if (res.status === 410) {
          setStatus('expired');
          setErrorMessage("This link has expired or already been used.");
          return;
      }

      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send');
      }

      setStatus('success');
      setContent("");
      toast.success("Message sent securely!");
    } catch (error: any) {
      if (status !== 'unauthorized' && status !== 'expired') {
          setStatus('error');
          setErrorMessage(error.message || "Failed to send message.");
          toast.error(error.message || "Failed to send message.");
      }
    }
  };

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              {errorMessage || "This drop link has already been used or is invalid."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'unauthorized') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
             <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <LogIn className="h-6 w-6" />
                    </div>
                    <CardTitle>Authentication Required</CardTitle>
                    <CardDescription>
                        You must be logged in to send a secure message to this user.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center flex-col gap-3">
                    <Button asChild className="w-full">
                        <Link href={`/login?redirect=/drop/${token}`}>Login to Continue</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Don't have an account? <Link href="/register" className="underline">Sign up</Link>
                    </p>
                </CardFooter>
             </Card>
        </div>
      );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-green-500/20 bg-green-500/5">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Message Sent!</CardTitle>
            <CardDescription>
              Your message has been securely dropped. This link is now invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
           <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Secure Dropzone</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Send a private note. This link works only once.
        </p>
      </div>

      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          <CardDescription>
            Type your message below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Type your secret message here..."
            className="min-h-[200px] resize-none text-base"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={status === 'sending'}
          />
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> One-time secure link
          </p>
          <Button 
            onClick={handleSubmit} 
            disabled={!content.trim() || status === 'sending'}
            className="min-w-[120px]"
          >
            {status === 'sending' ? (
              "Sending..."
            ) : (
              <>Send Message <Send className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
