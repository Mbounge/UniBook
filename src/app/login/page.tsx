// src/app/login/page.tsx

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, User, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock API function
const loginUser = async (credentials: { username: string; password: string }) => {
  await new Promise(res => setTimeout(res, 1000));
  if (credentials.username === "UNI" && credentials.password === "BOOK") {
    return { success: true };
  }
  throw new Error("Invalid username or password.");
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      toast({ title: "Welcome to UniBOOK!", description: "Successfully logged in." });
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Missing Information", description: "Please enter both username and password.", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to UniBOOK</h1>
            <p className="text-gray-600 mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <p className="text-sm text-blue-800 font-medium">Demo Credentials:</p>
          <p className="text-sm text-blue-700 mt-1">
            Username: <span className="font-mono font-bold">UNI</span> / Password: <span className="font-mono font-bold">BOOK</span>
          </p>
        </div>
      </div>
    </div>
  );
}