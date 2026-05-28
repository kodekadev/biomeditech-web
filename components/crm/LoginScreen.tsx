"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import * as api from "@/lib/api";
import { isValidEmail } from "@/lib/utils";

export function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? "Ingresa un correo válido (ej: usuario@empresa.cl)"
    : null;
  const passwordError = emailTouched && password.length > 0 && password.length < 6
    ? "La contraseña debe tener al menos 6 caracteres"
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (!email || !isValidEmail(email)) { setError("Ingresa un correo válido"); return; }
    if (!password) { setError("Ingresa tu contraseña"); return; }
    setLoading(true);
    setError("");
    const result = await api.login(email, password);
    setLoading(false);
    if (!result) { setError("No se pudo conectar con el servidor"); return; }
    if ("error" in result) { setError(result.error); return; }
    api.saveUser(result.user.email, result.user.rol);
    onLogin(result.token);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" className="login-logo" />
        <h1>Sistema CRM</h1>
        <p>Ingresa tus credenciales para continuar</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); setError(""); }}
              placeholder="correo@biomeditech.cl"
              maxLength={100}
              autoFocus
              style={{ borderColor: emailError ? "#ef4444" : undefined }}
            />
            {emailError && <span className="field-error">{emailError}</span>}
          </label>
          <label style={{ position: "relative" }}>
            Contraseña
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                maxLength={50}
                style={{ width: "100%", paddingRight: 40, borderColor: passwordError ? "#ef4444" : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center" }}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <span className="field-error">{passwordError}</span>}
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            <Lock size={16} /> {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
