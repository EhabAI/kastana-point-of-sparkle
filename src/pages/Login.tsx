import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import kastanaLogo from "@/assets/kastana-logo.png";
import cashierIllustration from "@/assets/cashier-illustration.png";
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('kastana-theme') === 'dark');
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('kastana-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('kastana-theme', 'light');
    }
  }, [isDark]);
  const {
    signIn,
    user,
    role,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Check for logout reason flag
  useEffect(() => {
    const logoutReason = sessionStorage.getItem("logout_reason");
    if (logoutReason === "RESTAURANT_INACTIVE") {
      sessionStorage.removeItem("logout_reason");
      toast({
        title: "Session Ended",
        description: "This restaurant has been deactivated by system administration.",
        variant: "destructive"
      });
    }
  }, [toast]);
  useEffect(() => {
    if (!loading && user && role) {
      if (role === "system_admin") {
        navigate("/system-admin", {
          replace: true
        });
      } else if (role === "owner") {
        navigate("/admin", {
          replace: true
        });
      } else if (role === "cashier") {
        navigate("/pos", {
          replace: true
        });
      } else if (role === "kitchen") {
        navigate("/kds", {
          replace: true
        });
      }
    }
  }, [user, role, loading, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({
      email,
      password
    });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Login Failed",
        description: error.message === "Invalid login credentials" ? "Invalid email or password. Please try again." : error.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div dir="ltr" className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4 sm:p-6 lg:p-8">
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <button onClick={() => setIsDark(!isDark)} className="flex items-center justify-center h-10 w-10 p-2 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 shadow-sm" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun className="h-5 w-5 text-gray-200" /> : <Moon className="h-5 w-5 text-gray-800" />}
        </button>
      </div>

      {/* Decorative background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main Card Container */}
      <div className="relative w-full max-w-5xl bg-card rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row">
          {/* Left Section - Logo & Login Form */}
          <div className="w-full lg:w-1/2 p-8 sm:p-10 lg:p-12">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-3">
              <img alt="Kastana" className="h-20 w-auto object-contain" src="/lovable-uploads/894da989-3544-48dc-ba9d-c4e6b45565cf.png" />
              <div>
                <h1 className="font-bold text-foreground tracking-tight text-5xl">Kastana</h1>
                <p className="text-base text-muted-foreground">POS System</p>
              </div>
            </div>
            
            {/* Slogan */}
            <p className="text-sm tracking-[0.25em] uppercase font-medium text-primary/80 mb-10">
              Smart. Secure. Profitable.
            </p>

            {/* Login Form */}
            <div className="max-w-sm">
              <h2 className="text-2xl font-bold text-foreground mb-8">Login</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="h-12 pl-12 pr-4 rounded-xl border-border bg-muted/30 focus:bg-background transition-colors" />
                </div>
                
                {/* Password Input */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-600/70" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="h-12 pl-12 pr-12 rounded-xl border-border bg-muted/30 focus:bg-background transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">Remember me</span>
                  <Switch checked={rememberMe} onCheckedChange={setRememberMe} />
                </div>

                {/* Sign In Button */}
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold transition-all duration-200 hover:shadow-lg" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </> : "Sign In"}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Section - Illustration (Hidden on mobile) */}
          <div className="hidden lg:flex lg:w-1/2 items-end justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 relative overflow-hidden">
            {/* Decorative curved shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/4 -translate-x-1/4" />
            
            {/* Illustration */}
            <img src={cashierIllustration} alt="Cashier at POS" className="relative z-10 w-full max-w-md h-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Attribution Footer */}
      <footer className="mt-6 text-center">
        <a href="https://www.kastana.net/home" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
          © 2025 Done by Kastana
        </a>
      </footer>
    </div>;
}