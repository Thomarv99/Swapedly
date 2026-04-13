import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { User, Mail, Lock, Gift, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  username: string;
  email: string;
  password: string;
  referralCode?: string;
  terms: boolean;
};

export default function SignUpPage() {
  const { register: registerUser, registerPending, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const password = watch("password", "");

  if (isAuthenticated) {
    navigate("/welcome-tour");
    return null;
  }

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        referralCode: data.referralCode || undefined,
      });
      navigate("/welcome-tour");
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    }
  };

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  return (
    <div className="min-h-screen flex">
      {/* Left – Form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto">
          <Logo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-muted-foreground">Join thousands of swappers today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Choose a username"
                  className="pl-10 rounded-xl"
                  data-testid="signup-username"
                  {...register("username", { required: "Username is required", minLength: { value: 3, message: "Min 3 characters" } })}
                />
              </div>
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 rounded-xl"
                  data-testid="signup-email"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a strong password"
                  className="pl-10 rounded-xl"
                  data-testid="signup-password"
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Min 8 characters" } })}
                />
              </div>
              <div className="flex gap-3 text-xs mt-1">
                <span className={hasMinLength ? "text-green-600" : "text-muted-foreground"}>✓ 8+ chars</span>
                <span className={hasUppercase ? "text-green-600" : "text-muted-foreground"}>✓ Uppercase</span>
                <span className={hasNumber ? "text-green-600" : "text-muted-foreground"}>✓ Number</span>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral">Referral Code (optional)</Label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="referral"
                  placeholder="Enter referral code"
                  className="pl-10 rounded-xl"
                  data-testid="signup-referral"
                  {...register("referralCode")}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" data-testid="terms-checkbox" {...register("terms", { required: true })} />
              <Label htmlFor="terms" className="text-sm font-normal leading-snug">
                I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </Label>
            </div>
            {errors.terms && <p className="text-xs text-destructive">You must agree to the terms</p>}

            <Button type="submit" className="w-full rounded-xl h-11 bg-foreground text-background hover:bg-foreground/90" disabled={registerPending} data-testid="signup-btn">
              {registerPending ? "Creating account..." : "Create account"}
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                Or sign up with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">

              <Button type="button" variant="outline" className="rounded-xl h-11 gap-2" data-testid="apple-signup">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/" className="text-primary font-medium hover:underline" data-testid="signin-link">
              Sign in
            </Link>
          </p>
          <div className="mt-8">
            <PerplexityAttribution />
          </div>
        </div>
      </div>

      {/* Right – Testimonial */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-slate-900 to-slate-700 items-end justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200')] bg-cover bg-center opacity-20" />
        <Card className="relative bg-white/10 backdrop-blur-xl border-white/20 text-white max-w-md rounded-2xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-white/90 text-lg mb-4">
              &ldquo;Swapedly changed how I think about trading. I&apos;ve saved hundreds of dollars swapping items I no longer needed.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                SM
              </div>
              <div>
                <p className="font-medium">Sarah Mitchell</p>
                <p className="text-sm text-white/60">Member since 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
