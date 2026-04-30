"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const LOGIN_TEXT = {
  en: {
    eyebrow: "Admin Access",
    title: "Admin login",
    subtitle: "Use the single administrator account configured for this system.",
    email: "Email",
    password: "Password",
    emailPlaceholder: "admin@example.com",
    passwordPlaceholder: "Enter password",
    submit: "Login",
    submitting: "Logging in...",
    hint: "There is no signup page for this system.",
  },
  bn: {
    eyebrow: "অ্যাডমিন এক্সেস",
    title: "অ্যাডমিন লগইন",
    subtitle: "এই সিস্টেমে কনফিগার করা একক অ্যাডমিন অ্যাকাউন্ট দিয়ে প্রবেশ করুন।",
    email: "ইমেইল",
    password: "পাসওয়ার্ড",
    emailPlaceholder: "admin@example.com",
    passwordPlaceholder: "পাসওয়ার্ড লিখুন",
    submit: "লগইন",
    submitting: "লগইন হচ্ছে...",
    hint: "এই সিস্টেমে কোনো সাইনআপ পেজ নেই।",
  },
};

export default function AdminLoginForm() {
  const searchParams = useSearchParams();
  const { language } = usePurchaseLanguage();
  const copy = LOGIN_TEXT[language === "bn" ? "bn" : "en"];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed.");
      }

      const nextPath = searchParams.get("next");
      const destination = nextPath && nextPath.startsWith("/") ? nextPath : "/";
      window.location.replace(destination);
    } catch (error) {
      setErrorMessage(error.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="auth-copy">
          <span className="auth-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{copy.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.emailPlaceholder}
              autoComplete="username"
              required
            />
          </label>

          <label className="auth-field">
            <span>{copy.password}</span>
            <div className="auth-password-field">
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                aria-pressed={isPasswordVisible}
              >
                {isPasswordVisible ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3 4.5 19.5 21M10.6 10.6a2 2 0 1 0 2.8 2.8M9.9 5.6A10.9 10.9 0 0 1 12 5.4c5.4 0 9.3 4.4 10.5 6.1-.6.8-1.8 2.2-3.5 3.5M6.6 8.1A17.4 17.4 0 0 0 1.5 11.5C2.7 13.2 6.6 17.6 12 17.6c1.5 0 2.9-.3 4.2-.8"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M1.5 12s3.9-6.1 10.5-6.1S22.5 12 22.5 12 18.6 18.1 12 18.1 1.5 12 1.5 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button type="submit" className="auth-submit-button" disabled={isSubmitting}>
            {isSubmitting ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="auth-hint">{copy.hint}</p>
      </div>
    </section>
  );
}
