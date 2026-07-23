"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, Package2, Lock, Mail, Loader2 } from "lucide-react";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: "admin@garment.com",
      password: "admin123",
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
      toast.error(error.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#020617",
        backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorations */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: "440px" }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "1rem",
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                marginBottom: "1.25rem",
                boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
              }}
            >
              <Package2 size={24} color="white" />
            </motion.div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.025em",
                marginBottom: "0.375rem",
              }}
            >
              GarmentOS
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
              Wholesale ERP · Madurai
            </p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1.25rem",
              padding: "2rem",
              backdropFilter: "blur(20px)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "white",
                marginBottom: "0.375rem",
              }}
            >
              Sign in to your account
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.8125rem", marginBottom: "1.75rem" }}>
              Enter your credentials to continue
            </p>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#cbd5e1",
                    marginBottom: "0.5rem",
                  }}
                >
                  Email address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#64748b"
                    style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                    })}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem 0.625rem 2.25rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: errors.email ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "0.5rem",
                      color: "white",
                      fontSize: "0.875rem",
                      outline: "none",
                      transition: "border-color 0.15s",
                    }}
                    placeholder="admin@garment.com"
                  />
                </div>
                {errors.email && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.375rem" }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "#cbd5e1",
                    marginBottom: "0.5rem",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color="#64748b"
                    style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password", { required: "Password is required" })}
                    style={{
                      width: "100%",
                      padding: "0.625rem 2.5rem 0.625rem 2.25rem",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: errors.password ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "0.5rem",
                      color: "white",
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                    placeholder="••••••••"
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
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.375rem" }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: loading
                    ? "rgba(59, 130, 246, 0.5)"
                    : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.15s",
                  boxShadow: loading ? "none" : "0 4px 14px rgba(59, 130, 246, 0.4)",
                  marginTop: "0.25rem",
                }}
              >
                {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Demo credentials */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "0.875rem",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "0.625rem",
              }}
            >
              <p style={{ color: "#93c5fd", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Demo Credentials
              </p>
              <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Email: admin@garment.com</p>
              <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Password: admin123</p>
            </div>
          </motion.div>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <p style={{ color: "#475569", fontSize: "0.75rem" }}>
              © 2026 GarmentOS · Madurai Wholesale ERP
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", fontWeight: 700, marginTop: "0.5rem", letterSpacing: "0.025em" }}>
              Designed and developed by <span style={{ color: "white" }}>AJITH</span>
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
        input:focus { border-color: rgba(59, 130, 246, 0.6) !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      `}</style>
    </div>
  );
}
