"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { 
  Clipboard, 
  Link2, 
  Inbox, 
  Sparkles, 
  StickyNote, 
  ListTodo, 
  Flame,
  ShieldCheck,
  Zap,
  ArrowRight,
  Globe,
  SquareKanban,
  Activity,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardTitle, CardDescription, CardFooter, CardHeader, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/ModeToggle";

const features = [
  {
    icon: <StickyNote className="h-5 w-5 text-blue-500" />,
    title: "Snippet Store",
    description: "Organize code, text, and prompts with tags and privacy."
  },
  {
    icon: <Clipboard className="h-5 w-5 text-purple-500" />,
    title: "Clipboard Store",
    description: "Quick access to your clipboard history across devices."
  },
  {
    icon: <ListTodo className="h-5 w-5 text-green-500" />,
    title: "Todo Store",
    description: "Manage tasks with priority levels and deadlines."
  },
  {
    icon: <Link2 className="h-5 w-5 text-orange-500" />,
    title: "Link Store",
    description: "Save and manage important links in one place."
  },
  {
    icon: <Inbox className="h-5 w-5 text-pink-500" />,
    title: "Drop Store",
    description: "Generate one-time links for others to drop content."
  },
  {
    icon: <Globe className="h-5 w-5 text-cyan-500" />,
    title: "Public Store",
    description: "Share snippets with the world or specific users."
  },
  {
    icon: <Flame className="h-5 w-5 text-red-500" />,
    title: "Secret Store",
    description: "Self-destructing links for sharing sensitive info."
  },
  {
    icon: <SquareKanban className="h-5 w-5 text-indigo-500" />,
    title: "Tracking Store",
    description: "Track progress with boards, columns, and cards."
  },
  {
    icon: <Activity className="h-5 w-5 text-emerald-500" />,
    title: "Habit Store",
    description: "Build and maintain positive daily routines."
  },
  {
    icon: <Trash2 className="h-5 w-5 text-muted-foreground" />,
    title: "Trash Store",
    description: "A safety net for your deleted items."
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin 
        ? { username, password, rememberMe }
        : { username, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      toast.success(isLogin ? "Logged in successfully" : "Account created successfully");
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center p-1">
            <Image 
              src="/logo.svg" 
              alt="Personal Store Logo" 
              width={24} 
              height={24} 
              className="invert dark:invert-0"
            />
          </div>
          <span className="text-xl font-bold tracking-tight">Personal Store</span>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col items-center justify-center px-6 py-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl w-full">
          
          {/* Left: Content */}
          <div className="space-y-6 animate-in fade-in slide-in-from-left duration-1000">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                <span>Your Digital Vault, Simplified</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                Store everything in <span className="text-primary">one place.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                A modern workspace for your snippets, links, tasks, and secrets. 
                Private by default, powerful by design.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto lg:overflow-visible pr-2 no-scrollbar">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all group shrink-0">
                  <div className="shrink-0">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-xs">{feature.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2" />
          </div>

          {/* Right: Login Form */}
          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right duration-1000 py-4">
            <Card className="w-full max-w-md border-2 shadow-2xl bg-card/80 backdrop-blur-md">
              <CardHeader className="space-y-1 py-4 px-6">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {isLogin ? "Welcome back" : "Get started"}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLogin
                    ? "Enter your credentials to access your vault"
                    : "Create your secure account in seconds"}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        placeholder="johndoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="h-10"
                        autoCapitalize="none"
                        autoCorrect="off"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10"
                      disabled={loading}
                    />
                  </div>
                  
                  {isLogin && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          disabled={loading}
                        />
                        <Label
                          htmlFor="remember"
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Remember me
                        </Label>
                      </div>
                      <Button variant="link" size="sm" className="px-0 h-auto text-xs font-normal">
                        Forgot password?
                      </Button>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-10 text-sm font-semibold" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary-foreground/50 border-t-primary-foreground rounded-full animate-spin" />
                        Please wait...
                      </div>
                    ) : isLogin ? (
                      <div className="flex items-center gap-2">
                        Sign In <ArrowRight className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Create Account <Zap className="h-4 w-4 fill-current" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3 text-center border-t py-4 px-6 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                      {isLogin ? "New to Personal Store? " : "Already have an account? "}
                      <button 
                          className="font-semibold text-primary hover:underline underline-offset-4"
                          onClick={() => setIsLogin(!isLogin)}
                          disabled={loading}
                      >
                          {isLogin ? "Create an account" : "Log in to your vault"}
                      </button>
                  </p>
                  <div className="flex items-center gap-2 justify-center text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Secure Encrypted Storage</span>
                  </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer / Trust Section */}
      <footer className="py-4 border-t shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2025 Personal Store. Built for privacy.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground">Privacy Policy</a>
            <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground">Terms of Service</a>
            <a href="https://github.com/dalvimangesh/Personal-Store" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              Github
            </a>
          </div>
        </div>
      </footer>

      {/* Background Ornaments */}
      <div className="fixed top-0 left-0 -z-10 h-full w-full overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>
    </div>
  );
}

