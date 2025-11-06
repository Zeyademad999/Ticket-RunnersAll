import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/input-otp";
import { Footer } from "@/components/Footer";

const MOCK_OTP = "123456";

const OrganizerLogin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<
    "login" | "otp" | "forgotPassword" | "resetOtp" | "newPassword"
  >("login");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mobile && password) {
      setStep("otp");
    } else {
      setError(t("organizer.login.error.missingFields"));
    }
  };

  const handleOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp === MOCK_OTP) {
      localStorage.setItem("organizer_authenticated", "true");
      navigate("/dashboard");
    } else {
      setError(t("organizer.login.error.invalidOtp"));
    }
  };

  const handleForgotPassword = () => {
    setStep("forgotPassword");
    setError("");
    setSuccess("");
  };

  const handleSendResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mobile) {
      setStep("resetOtp");
      setSuccess(t("auth.otp_sent"));
    } else {
      setError(t("auth.phone_required"));
    }
  };

  const handleResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp === MOCK_OTP) {
      setStep("newPassword");
      setOtp("");
    } else {
      setError(t("organizer.login.error.invalidOtp"));
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError(t("auth.password_required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.errors.confirm_password_mismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("auth.errors.password_min"));
      return;
    }

    setSuccess(t("auth.password_reset_success"));
    setTimeout(() => {
      setStep("login");
      setMobile("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess("");
    }, 2000);
  };

  const handleBackToLogin = () => {
    setStep("login");
    setMobile("");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-dark"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/public/ticket-logo-secondary.png"
                alt="Ticket Runner Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === "forgotPassword" ||
              step === "resetOtp" ||
              step === "newPassword"
                ? t("auth.forgot_password")
                : t("organizer.login.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="tel"
                  placeholder={t("organizer.login.mobilePlaceholder")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <Input
                  type="password"
                  placeholder={t("organizer.login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <Button type="submit" className="w-full">
                  {t("organizer.login.loginButton")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("auth.forgot_password")}
                  </button>
                </div>
              </form>
            )}
            {step === "otp" && (
              <form onSubmit={handleOtp} className="space-y-4">
                <div className="text-center mb-4">
                  {t("organizer.login.otpTitle")}
                </div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  length={6}
                  autoFocus={true}
                  language={i18n.language}
                />
                {error && (
                  <div className="text-red-500 text-sm text-center">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full">
                  {t("organizer.login.verifyButton")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "forgotPassword" && (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div className="text-center mb-4 text-gray-600">
                  {t("auth.password_reset_description")}
                </div>
                <Input
                  type="tel"
                  placeholder={t("organizer.login.mobilePlaceholder")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <Button type="submit" className="w-full">
                  {t("auth.send_otp")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "resetOtp" && (
              <form onSubmit={handleResetOtp} className="space-y-4">
                <div className="text-center mb-4">
                  {t("organizer.login.otpTitle")}
                </div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  length={6}
                  autoFocus={true}
                  language={i18n.language}
                />
                {error && (
                  <div className="text-red-500 text-sm text-center">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-green-500 text-sm text-center">
                    {success}
                  </div>
                )}
                <Button type="submit" className="w-full">
                  {t("auth.verify_otp")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "newPassword" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-center mb-4 text-gray-600">
                  {t("auth.password_reset_description")}
                </div>
                <Input
                  type="password"
                  placeholder={t("auth.placeholders.new_password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <Input
                  type="password"
                  placeholder={t("auth.placeholders.confirm_new_password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && (
                  <div className="text-green-500 text-sm">{success}</div>
                )}
                <Button type="submit" className="w-full">
                  {t("auth.reset_password")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default OrganizerLogin;
