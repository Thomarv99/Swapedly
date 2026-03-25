import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { ArrowLeftRight, Mail, Lock, Eye, EyeOff, Coins, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function WelcomePage() {
  const { login, loginPending, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>();

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await login(data);
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left – Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto">
          <Logo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your Swapedly account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 rounded-xl"
                  data-testid="login-email"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 rounded-xl"
                  data-testid="login-password"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" data-testid="remember-me" />
                <Label htmlFor="remember" className="text-sm font-normal">Remember me</Label>
              </div>
              <a href="#" className="text-sm text-primary hover:underline" data-testid="forgot-password">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full rounded-xl h-11" disabled={loginPending} data-testid="login-btn">
              {loginPending ? "Signing in..." : "Log In"}
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                Or, Login with
              </span>
            </div>

            <Button type="button" variant="outline" className="w-full rounded-xl h-11 gap-2" data-testid="google-login">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="register-link">
              Register here
            </Link>
          </p>
          <p className="mt-2 text-center">
            <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-primary" data-testid="browse-guest">
              Browse as Guest &rarr;
            </Link>
          </p>
          <div className="mt-8">
            <PerplexityAttribution />
          </div>
        </div>
      </div>

      {/* Right – Hero */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#5A45FF] via-[#7B68EE] to-[#FF4D6D] items-center justify-center p-12">
        {/* Abstract shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>

        {/* Glassmorphism card */}
        <Card className="relative bg-white/10 backdrop-blur-xl border-white/20 text-white max-w-md rounded-2xl shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                <Coins className="h-6 w-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Swap Bucks</h3>
                <p className="text-white/70 text-sm">Your trading currency</p>
              </div>
            </div>
            <p className="text-white/80 mb-6">
              Trade goods without spending real money. Earn Swap Bucks by listing items, referring friends, and completing tasks.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/10 rounded-xl p-3">
                <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <p className="text-xs text-white/70">List & Sell</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <Users className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <p className="text-xs text-white/70">Refer Friends</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <p className="text-xs text-white/70">Earn More</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
