"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, ShieldAlert, Copy, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SecretPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Unwrap params in Next.js 15+
  const [status, setStatus] = useState<'idle' | 'loading' | 'revealed' | 'error' | 'burned'>('idle');
  const [content, setContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReveal = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/secrets/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || "Failed to retrieve secret");
        return;
      }

      setContent(data.content);
      setStatus('revealed');
    } catch (error) {
      setStatus('error');
      setErrorMsg("An unexpected error occurred");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Secret copied to clipboard");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full space-y-8">
            <div className="text-center space-y-2">
                <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
                    <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                        <span className="font-bold">P</span>
                    </div>
                    Personal Store
                </Link>
            </div>

            <Card className="shadow-xl overflow-hidden">
                {status === 'idle' && (
                    <div className="p-8 text-center space-y-6">
                        <div className="mx-auto bg-muted p-4 rounded-full w-fit">
                            <Lock className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Secure Message</h1>
                            <p className="text-muted-foreground">
                                You have received a secure, one-time message. 
                                Once revealed, it will be permanently deleted.
                            </p>
                        </div>
                        <Button 
                            size="lg" 
                            onClick={handleReveal}
                            className="w-full text-lg h-12"
                        >
                            Reveal Secret
                        </Button>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="p-12 text-center space-y-4">
                        <div className="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        <p className="text-muted-foreground">Decrypting message...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-8 text-center space-y-6">
                        <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
                            <Flame className="h-12 w-12 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-destructive">Message Gone</h1>
                            <p className="text-muted-foreground text-lg">
                                {errorMsg === "Secret expired" ? "This secret has expired." : 
                                 errorMsg === "Secret not found or already viewed" ? "This secret has already been viewed and destroyed." : 
                                 errorMsg}
                            </p>
                        </div>
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                Create Your Own Secret
                            </Button>
                        </Link>
                    </div>
                )}

                {status === 'revealed' && (
                    <div className="flex flex-col">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-100 dark:border-green-900/50 flex items-center gap-3">
                             <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                             <span className="font-medium text-green-700 dark:text-green-400 text-sm">
                                Secret revealed. Copy it now before closing.
                             </span>
                        </div>
                        <div className="relative bg-muted/30 min-h-[200px]">
                            <div className="absolute top-2 right-2 z-10">
                                <Button size="sm" variant="ghost" onClick={handleCopy}>
                                    <Copy className="h-4 w-4 mr-1" /> Copy
                                </Button>
                            </div>
                            <pre className="p-6 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[400px]">
                                {content}
                            </pre>
                        </div>
                        <div className="p-6 bg-background border-t space-y-4">
                            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                <Flame className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                <p>
                                    This message has been destroyed from the server. 
                                    If you refresh this page, it will be gone.
                                </p>
                            </div>
                            <div className="pt-2">
                                <Link href="/">
                                    <Button className="w-full group" variant="outline">
                                        Send a Secret <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="text-center text-sm text-muted-foreground">
                Powered by <span className="font-semibold text-foreground">Personal Store</span>
            </div>
        </div>
    </div>
  );
}
