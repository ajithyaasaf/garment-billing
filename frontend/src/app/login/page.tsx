"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowRight, ShieldCheck, Shirt } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", data);
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Invalid credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        width: "100%",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dynamic Ambient Glow Background */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79, 70, 229, 0.18) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 80%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-5%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(147, 51, 234, 0.12) 0%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: "420px" }}
        >
          {/* Header & Logo */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "3.25rem",
                height: "3.25rem",
                borderRadius: "0.875rem",
                background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                marginBottom: "1rem",
                boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)",
              }}
            >
              <Shirt size={24} color="#ffffff" />
            </motion.div>

            <h1
              style={{
                fontSize: "1.625rem",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                margin: "0 0 0.375rem 0",
              }}
            >
              GarmentOS
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>
              Wholesale & Retail Business ERP
            </p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "1rem",
              padding: "2rem 1.75rem",
              backdropFilter: "blur(16px)",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  margin: "0 0 0.25rem 0",
                }}
              >
                Sign in to your account
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: 0 }}>
                Enter your credentials to access your billing workspace
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#cbd5e1",
                    marginBottom: "0.375rem",
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#64748b"
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email", {
                      required: "Email address is required",
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email" },
                    })}
                    style={{
                      width: "100%",
                      padding: "0.6875rem 0.875rem 0.6875rem 2.375rem",
                      background: "rgba(2, 6, 23, 0.6)",
                      border: errors.email ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "0.5rem",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                    placeholder="name@business.com"
                  />
                </div>
                {errors.email && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.35rem", margin: "0.35rem 0 0 0" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: "#cbd5e1",
                    }}
                  >
                    Password
                  </label>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color="#64748b"
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password", { required: "Password is required" })}
                    style={{
                      width: "100%",
                      padding: "0.6875rem 2.5rem 0.6875rem 2.375rem",
                      background: "rgba(2, 6, 23, 0.6)",
                      border: errors.password ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "0.5rem",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.35rem", margin: "0.35rem 0 0 0" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Options */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "#94a3b8" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: "#4f46e5",
                      width: "0.95rem",
                      height: "0.95rem",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                    }}
                  />
                  Remember session
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: loading
                    ? "rgba(79, 70, 229, 0.6)"
                    : "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.15s ease",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(79, 70, 229, 0.35)",
                  marginTop: "0.5rem",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Secure Trust Badge Footer */}
          <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                color: "#64748b",
                fontSize: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <ShieldCheck size={14} style={{ color: "#10b981" }} />
              256-Bit Encrypted Business Workspace
            </div>
            <p style={{ color: "#475569", fontSize: "0.75rem", margin: 0 }}>
              © {new Date().getFullYear()} GarmentOS Business ERP System
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #475569; }
        input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
