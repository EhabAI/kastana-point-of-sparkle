import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import kastanaLogo from "@/assets/kastana-logo.png";
import posIllustration from "@/assets/pos-illustration.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Left Section - Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Login Card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-xl p-8 sm:p-10">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={kastanaLogo} 
                alt="Kastana POS" 
                className="w-[280px] sm:w-[320px] h-auto object-contain"
              />
            </div>

            {/* Slogan */}
            <p className="text-center text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6">
              Smart. Secure. Profitable.
            </p>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-8">
              Kastana POS System
            </h1>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  autoComplete="email"
                  className="h-11 px-4 rounded-lg border-border focus:border-primary transition-colors"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  autoComplete="current-password"
                  className="h-11 px-4 rounded-lg border-border focus:border-primary transition-colors"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 rounded-lg text-base font-medium mt-2 transition-all duration-200 hover:shadow-md" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Kastana POS. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - POS Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/50 p-12">
        <div className="relative w-full max-w-lg animate-fade-in">
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          
          {/* Illustration */}
          <img 
            src={posIllustration} 
            alt="POS System" 
            className="relative z-10 w-full h-auto object-contain drop-shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}