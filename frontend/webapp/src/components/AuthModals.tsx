import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth, User } from "@/Contexts/AuthContext";
import { ProfileCompletionModal } from "./ui/profileCompletionModal";
import { CardExpiredModal } from "./ExpiredCardModals";
import { SignupForm } from "./SignupForm";
import { ValidationService, PASSWORD_RULES } from "@/lib/validation";
import { secureStorage } from "@/lib/secureStorage";
import { BookingsService } from "@/lib/api/services/bookings";
import { isBefore, parseISO } from "date-fns";

import ReCAPTCHA from "react-google-recaptcha";
import { OtpInput } from "@/components/ui/input-otp";

interface AuthModalsProps {
  onLoginSuccess?: () => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({ onLoginSuccess }) => {
  const {
    isLoginOpen,
    isSignupOpen,
    closeLogin,
    closeSignup,
    login,
    loginWithCredentials,
    verifyLoginOtp,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    confirmPasswordReset,
  } = useAuth();

  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Helper function for RTL-compatible error messages
  const ErrorMessage = ({ message }: { message: string }) => (
    <p
      className="text-sm text-red-500"
      dir={i18n.dir()}
      style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
    >
      {message}
    </p>
  );
  const [isSignup, setIsSignup] = useState(false);
  const [showCardExpiredModal, setShowCardExpiredModal] = useState(false);
  const [cardStatus, setCardStatus] = useState<"expired" | "missing">("expired");

  // Add state for login identifier
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginIdentifierError, setLoginIdentifierError] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState("");
  
  // Add state for login OTP step
  const [showLoginOtp, setShowLoginOtp] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpError, setLoginOtpError] = useState("");

  // Add state for captcha
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const recaptchaSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  // Add state for forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [forgotPasswordOtpSent, setForgotPasswordOtpSent] = useState(false);
  const [forgotPasswordOtpVerified, setForgotPasswordOtpVerified] =
    useState(false);
  const [forgotPasswordOtpError, setForgotPasswordOtpError] = useState("");
  const [showForgotPasswordOtpModal, setShowForgotPasswordOtpModal] =
    useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<
    Record<string, string>
  >({});

  const checkCardExpiration = async () => {
    // DISABLED - Don't check card expiration during login
    // This function is kept for potential future use but is not called
    return;
    
    try {
      // Wait longer to ensure login is completely done
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user is authenticated before making the API call
      const refreshToken = await secureStorage.getItem("refreshToken");
      
      if (!refreshToken) {
        // User is not authenticated, skip card check silently
        return;
      }

      // Fetch the user's NFC card details
      // Note: This endpoint may not exist yet, so we'll gracefully handle errors
      const cardDetails = await BookingsService.getCustomerCardDetails();

      // Check if user has an NFC card
      if (!cardDetails?.nfc_card) {
        // No card at all - show upgrade message
        setCardStatus("missing");
        setShowCardExpiredModal(true);
        // Show toast notification as well
        toast({
          title: t("cardExpired.missingTitle", "NFC Card Required"),
          description: t("cardExpired.missingToast", "Consider upgrading to an NFC card for premium features."),
          variant: "default",
        });
      } else if (cardDetails.nfc_card.card_expiry_date) {
        const now = new Date();
        const expiry = parseISO(cardDetails.nfc_card.card_expiry_date);
        const isExpired = isBefore(expiry, now);

        if (isExpired) {
          setCardStatus("expired");
          setShowCardExpiredModal(true);
          // Show toast notification as well
          toast({
            title: t("cardExpired.title"),
            description: t("cardExpired.toastMessage", "Your card has expired. Please renew to continue using premium features."),
            variant: "default",
          });
        }
      }
    } catch (error: any) {
      // Silently handle errors - card check is optional
      // Don't show errors for 401 (auth), 404 (no card/endpoint), or network issues
      // This prevents showing the modal when the user doesn't have a card or the endpoint doesn't exist
      if (error?.status && error.status !== 404 && error.status !== 401) {
        // Only log unexpected errors (not auth or not found)
      console.log("Could not check card expiration:", error);
      }
    }
  };

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  useEffect(() => {
    setIsSignup(isSignupOpen);
  }, [isSignupOpen, isLoginOpen]);

  useEffect(() => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    });
    // Reset login fields when switching between login/signup
    setLoginIdentifier("");
    setLoginPassword("");
    setLoginIdentifierError("");
    setLoginPasswordError("");
    setShowLoginOtp(false);
    setLoginOtpCode("");
    setLoginOtpError("");
  }, [isSignup]);

  // Reset forgot password state when modal closes
  useEffect(() => {
    if (!isLoginOpen && !isSignupOpen) {
      setShowForgotPassword(false);
      setForgotPasswordPhone("");
      setForgotPasswordOtp("");
      setForgotPasswordOtpSent(false);
      setForgotPasswordOtpVerified(false);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotPasswordErrors({});
      // Reset login fields when modal closes
      setLoginIdentifier("");
      setLoginPassword("");
      setLoginIdentifierError("");
      setLoginPasswordError("");
      setShowLoginOtp(false);
      setLoginOtpCode("");
      setLoginOtpError("");
    }
  }, [isLoginOpen, isSignupOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.email) newErrors.email = t("auth.errors.email_required");
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = t("auth.errors.email_invalid");

    if (!form.password) newErrors.password = t("auth.errors.password_required");
    else {
      const passwordValidation = ValidationService.validatePassword(
        form.password,
        PASSWORD_RULES
      );
      if (!passwordValidation.isValid) {
        newErrors.password =
          passwordValidation.errors[0] || t("auth.errors.password_invalid");
      }
    }

    if (isSignup) {
      if (!form.firstName)
        newErrors.firstName = t("auth.errors.first_name_required");
      else if (form.firstName.length < 3)
        newErrors.firstName = t("auth.errors.first_name_min");

      if (!form.lastName)
        newErrors.lastName = t("auth.errors.last_name_required");
      else if (form.lastName.length < 3)
        newErrors.lastName = t("auth.errors.last_name_min");

      if (!form.phone) newErrors.phone = t("auth.errors.phone_required");
      else if (!/^\+?\d{10,15}$/.test(form.phone))
        newErrors.phone = t("auth.errors.phone_invalid");

      if (!form.confirmPassword)
        newErrors.confirmPassword = t("auth.errors.confirm_password_required");
      else if (form.password !== form.confirmPassword)
        newErrors.confirmPassword = t("auth.errors.confirm_password_mismatch");
    }

    return Object.keys(newErrors).length === 0;
  };

  // Validate forgot password form
  const validateForgotPassword = () => {
    const newErrors: Record<string, string> = {};

    if (!forgotPasswordPhone) {
      newErrors.phone = t("auth.errors.phone_required");
    } else if (!/^\+?\d{10,15}$/.test(forgotPasswordPhone)) {
      newErrors.phone = t("auth.errors.phone_invalid");
    }

    if (forgotPasswordOtpVerified) {
      if (!newPassword) {
        newErrors.newPassword = t("auth.errors.password_required");
      } else {
        const passwordValidation = ValidationService.validatePassword(
          newPassword,
          PASSWORD_RULES
        );
        if (!passwordValidation.isValid) {
          newErrors.newPassword =
            passwordValidation.errors[0] || t("auth.errors.password_invalid");
        }
      }

      if (!confirmNewPassword) {
        newErrors.confirmNewPassword = t(
          "auth.errors.confirm_password_required"
        );
      } else if (newPassword !== confirmNewPassword) {
        newErrors.confirmNewPassword = t(
          "auth.errors.confirm_password_mismatch"
        );
      }
    }

    setForgotPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update validation for login (not signup)
  const validateLogin = () => {
    // Reset previous errors
    setLoginIdentifierError("");
    setLoginPasswordError("");

    if (!loginIdentifier) {
      setLoginIdentifierError(t("auth.errors.email_or_phone_required"));
      return false;
    }
    const isEmail = /\S+@\S+\.\S+/.test(loginIdentifier);
    const isPhone = /^\+?\d{10,15}$/.test(loginIdentifier);
    if (!isEmail && !isPhone) {
      setLoginIdentifierError(t("auth.errors.email_or_phone_invalid"));
      return false;
    }
    if (!loginPassword) {
      setLoginPasswordError(t("auth.errors.password_required"));
      return false;
    }
    return true;
  };

  // Forgot password functions
  const sendForgotPasswordOtp = async () => {
    if (!forgotPasswordPhone || !/^\+?\d{10,15}$/.test(forgotPasswordPhone)) {
      setForgotPasswordErrors((prev) => ({
        ...prev,
        phone: t("auth.errors.phone_invalid"),
      }));
      return;
    }

    try {
      await requestPasswordResetOtp(forgotPasswordPhone);
      setForgotPasswordOtpSent(true);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(true);
    } catch (error) {
      console.error("Failed to send password reset OTP:", error);
      // Error is already handled in AuthContext
    }
  };

  const verifyForgotPasswordOtp = async () => {
    if (!forgotPasswordOtp || forgotPasswordOtp.length !== 6) {
      setForgotPasswordOtpError(t("auth.errors.otp_invalid"));
      return;
    }

    try {
      const response = await verifyPasswordResetOtp(
        forgotPasswordPhone,
        forgotPasswordOtp
      );
      setForgotPasswordOtpVerified(true);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(false);

      // Store the password reset token securely for the next step
      console.log("Password reset token received:", {
        tokenLength: response.password_reset_token?.length,
        tokenPreview: response.password_reset_token?.substring(0, 50) + "...",
        isEncrypted: false,
        fullToken: response.password_reset_token, // Log full token for debugging
      });

      // Store token directly in localStorage without secure storage wrapper
      // to avoid JSON metadata overhead that increases token length
      // Ensure the token is properly encoded
      const tokenToStore = response.password_reset_token.trim();
      localStorage.setItem("passwordResetToken", tokenToStore);
      await secureStorage.setItem(
        "passwordResetExpires",
        response.expires_in_seconds.toString(),
        { encrypt: true }
      );
    } catch (error) {
      console.error("Failed to verify password reset OTP:", error);
      // Error is already handled in AuthContext
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!validateForgotPassword()) return;

    if (!forgotPasswordOtpVerified) {
      if (!forgotPasswordOtpSent) {
        await sendForgotPasswordOtp();
      } else {
        setShowForgotPasswordOtpModal(true);
      }
      return;
    }

    try {
      const passwordResetToken = localStorage.getItem("passwordResetToken");

      console.log("Password reset token retrieved:", {
        tokenLength: passwordResetToken?.length,
        tokenPreview: passwordResetToken?.substring(0, 50) + "...",
        isTooLong: passwordResetToken && passwordResetToken.length > 500,
        fullToken: passwordResetToken, // Log full token for debugging
      });

      if (!passwordResetToken) {
        toast({
          title: t("auth.password_reset_error"),
          description: t("auth.password_reset_token_missing"),
          variant: "destructive",
        });
        return;
      }

      // Validate token format
      const trimmedToken = passwordResetToken.trim();
      if (trimmedToken !== passwordResetToken) {
        console.warn("Token had whitespace, trimmed it");
      }

      // Check if token has expired
      try {
        const expiresInSeconds = await secureStorage.getItem(
          "passwordResetExpires"
        );
        if (expiresInSeconds) {
          const expiresAt = new Date(
            Date.now() + parseInt(expiresInSeconds) * 1000
          );
          const now = new Date();
          if (now > expiresAt) {
            toast({
              title: t("auth.password_reset_error"),
              description: t("auth.password_reset_token_expired"),
              variant: "destructive",
            });
            // Clear expired tokens
            localStorage.removeItem("passwordResetToken");
            secureStorage.removeItem("passwordResetExpires");
            return;
          }
        }
      } catch (error) {
        console.warn("Could not check token expiration:", error);
      }

      // Additional check: Parse the token to check embedded timestamps
      try {
        const tokenParts = trimmedToken.split(".");
        if (tokenParts.length >= 2) {
          const decodedToken = atob(tokenParts[0]);
          const tokenData = decodedToken.split("|");
          if (tokenData.length >= 4) {
            const currentTime = Math.floor(Date.now() / 1000);
            const tokenTime1 = parseInt(tokenData[2]);
            const tokenTime2 = parseInt(tokenData[3]);

            console.log("Token embedded timestamp check:", {
              currentTime,
              tokenTime1,
              tokenTime2,
              isExpired1: currentTime > tokenTime1,
              isExpired2: currentTime > tokenTime2,
              timeDiff1: currentTime - tokenTime1,
              timeDiff2: currentTime - tokenTime2,
            });

            // If the first timestamp is expired, the token is likely invalid
            if (currentTime > tokenTime1) {
              toast({
                title: t("auth.password_reset_error"),
                description:
                  "Password reset token has expired. Please request a new one.",
                variant: "destructive",
              });
              // Clear expired tokens
              localStorage.removeItem("passwordResetToken");
              secureStorage.removeItem("passwordResetExpires");

              // Reset the forgot password flow to allow requesting a new token
              setForgotPasswordOtpSent(false);
              setForgotPasswordOtpVerified(false);
              setForgotPasswordOtpError("");
              setShowForgotPasswordOtpModal(false);
              setNewPassword("");
              setConfirmNewPassword("");
              setForgotPasswordErrors({});
              return;
            }
          }
        }
      } catch (error) {
        console.warn("Could not parse token timestamps:", error);
      }

      await confirmPasswordReset(trimmedToken, newPassword, confirmNewPassword);

      // Clear stored tokens
      localStorage.removeItem("passwordResetToken");
      secureStorage.removeItem("passwordResetExpires");

      // Reset form and go back to login
      setShowForgotPassword(false);
      setForgotPasswordPhone("");
      setForgotPasswordOtp("");
      setForgotPasswordOtpSent(false);
      setForgotPasswordOtpVerified(false);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotPasswordErrors({});
    } catch (error) {
      console.error("Failed to reset password:", error);
      // Error is already handled in AuthContext
    }
  };

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSuccessfulSignup = async (signupId: string) => {
    // Store the signup ID securely for the next step in the signup process
    await secureStorage.setItem("signup_id", signupId, { encrypt: true });
    closeSignup();
    setShowProfileModal(true); // trigger profile modal
  };

  const handleSubmit = async () => {
    if (!captchaToken) {
      setCaptchaError(t("auth.errors.captcha_required"));
      return;
    }
    setCaptchaError("");

    if (isSignup) {
      if (!validate()) return;
      // Replace with actual backend call
      const newUser: User = {
        id: "user-" + Date.now(),
        first_name: form.firstName,
        last_name: form.lastName,
        mobile_number: form.phone,
        email: form.email,
        profile_image_id: "",
        type: "regular",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy fields for backward compatibility
        name: `${form.firstName} ${form.lastName}`,
        isVip: false,
      };
      login(newUser);
      toast({
        title: t("auth.sign_up"),
        description: `${t("auth.welcome")}, ${form.email}`,
      });
      handleSuccessfulSignup("user-" + Date.now());
    } else {
      if (!validateLogin()) return;

      try {
        // Use the real API call from AuthContext
        await loginWithCredentials(loginIdentifier, loginPassword);

        // Login successful - reset form state and close modal immediately
        setLoginIdentifier("");
        setLoginPassword("");
        setLoginIdentifierError("");
        setLoginPasswordError("");
        closeLogin();
        onLoginSuccess?.();
      } catch (error: any) {
        // Check if OTP is required (password login sends OTP)
        if (error.otpRequired) {
          // Show OTP input form
          setShowLoginOtp(true);
          toast({
            title: t("auth.otpSent"),
            description: error.message || t("auth.otpSentDescription"),
          });
        } else {
        // Error is already handled in AuthContext
        console.error("Login failed:", error);
        }
      }
    }
  };

  const handleClose = () => {
    setIsSignup(false);
    setShowForgotPassword(false);
    setLoginIdentifier("");
    setLoginPassword("");
    setLoginIdentifierError("");
    setLoginPasswordError("");
    closeLogin();
    closeSignup();
  };

  // Render forgot password form
  const renderForgotPasswordForm = () => (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleForgotPasswordSubmit();
      }}
    >
      <div className="space-y-1">
        <div className="relative">
          <Input
            type="text"
            value={forgotPasswordPhone}
            placeholder={t("auth.placeholders.phone", t("auth.phone_number"))}
            onChange={(e) => setForgotPasswordPhone(e.target.value)}
            autoComplete="off"
            disabled={forgotPasswordOtpVerified}
            className={`${i18n.dir() === "rtl" ? "pl-24" : "pr-24"}`}
          />
          {!forgotPasswordOtpVerified && (
            <Button
              type="button"
              size="sm"
              onClick={sendForgotPasswordOtp}
              className={`absolute top-1/2 h-7 px-3 ${
                i18n.dir() === "rtl" ? "left-2" : "right-2"
              }`}
              style={{ minWidth: 70, transform: "translateY(-50%)" }}
            >
              {forgotPasswordOtpSent
                ? t("auth.resend_otp")
                : t("auth.send_otp")}
            </Button>
          )}
        </div>
        {forgotPasswordErrors.phone && (
          <ErrorMessage message={forgotPasswordErrors.phone} />
        )}
      </div>

      {forgotPasswordOtpVerified && (
        <>
          <div className="space-y-1">
            <Input
              type="password"
              value={newPassword}
              placeholder={t("auth.placeholders.new_password", "New Password")}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {forgotPasswordErrors.newPassword && (
              <ErrorMessage message={forgotPasswordErrors.newPassword} />
            )}
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              value={confirmNewPassword}
              placeholder={t(
                "auth.placeholders.confirm_new_password",
                "Confirm New Password"
              )}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {forgotPasswordErrors.confirmNewPassword && (
              <ErrorMessage message={forgotPasswordErrors.confirmNewPassword} />
            )}
          </div>
        </>
      )}

      <Button className="w-full mt-4" type="submit">
        {forgotPasswordOtpVerified
          ? t("auth.reset_password")
          : t("auth.continue")}
      </Button>
    </form>
  );

  return (
    <>
      <Dialog open={isLoginOpen || isSignupOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {showForgotPassword
                ? t("auth.forgot_password")
                : isSignup
                ? t("auth.sign_up")
                : t("auth.sign_in")}
            </DialogTitle>
          </DialogHeader>

          {showForgotPassword ? (
            renderForgotPasswordForm()
          ) : isSignup ? (
            <SignupForm
              onClose={closeSignup}
              onSwitchToLogin={() => setIsSignup(false)}
              onSignupSuccess={handleSuccessfulSignup}
            />
          ) : showLoginOtp ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginOtpError("");
                
                if (!loginOtpCode.trim()) {
                  setLoginOtpError(t("auth.enterOtp", "Please enter the OTP code"));
                  return;
                }

                try {
                  await verifyLoginOtp(loginIdentifier, loginOtpCode.trim());
                  // Login successful - reset form state and close modal immediately
                  setLoginOtpCode("");
                  setLoginOtpError("");
                  setShowLoginOtp(false);
                  closeLogin();
                  onLoginSuccess?.();
                } catch (error: any) {
                  setLoginOtpError(error.message || t("auth.otpLoginErrorMessage", "Failed to verify OTP"));
                }
              }}
            >
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {t("auth.otpSentDescription", "We've sent a verification code to")} {loginIdentifier}
                </p>
                <OtpInput
                  value={loginOtpCode}
                  onChange={(value) => setLoginOtpCode(value)}
                  length={6}
                />
                {loginOtpError && (
                  <ErrorMessage message={loginOtpError} />
                )}
              </div>

              <Button className="w-full mt-4" type="submit">
                {t("auth.verify", "Verify OTP")}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowLoginOtp(false);
                  setLoginOtpCode("");
                  setLoginOtpError("");
                }}
              >
                {t("auth.back", "Back")}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="space-y-1">
                <Input
                  type="text"
                  value={loginIdentifier}
                  placeholder={t(
                    "auth.placeholders.email_or_phone",
                    "Email or Mobile Number"
                  )}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoComplete="off"
                />
                {loginIdentifierError && (
                  <ErrorMessage message={loginIdentifierError} />
                )}
              </div>
              <div className="space-y-1">
                <Input
                  type="password"
                  value={loginPassword}
                  placeholder={t("auth.placeholders.password", "Password")}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {loginPasswordError && (
                  <ErrorMessage message={loginPasswordError} />
                )}
              </div>

              <ReCAPTCHA
                sitekey={recaptchaSiteKey}
                onChange={(token: any) => setCaptchaToken(token || "")}
                className="my-2"
              />
              {captchaError && <ErrorMessage message={captchaError} />}

              <Button className="w-full mt-4" type="submit">
                {t("auth.continue")}
              </Button>
            </form>
          )}

          <div className="text-sm text-center mt-2">
            {showForgotPassword ? (
              <>
                {t("auth.remember_password")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setShowForgotPassword(false)}
                >
                  {t("auth.back_to_signin")}
                </button>
              </>
            ) : isSignup ? (
              <>
                {t("auth.already_account")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setIsSignup(false)}
                >
                  {t("auth.sign_in")}
                </button>
              </>
            ) : (
              <>
                {t("auth.no_account")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setIsSignup(true)}
                >
                  {t("auth.sign_up")}
                </button>
                <br />
                <button
                  className="underline text-primary mt-1"
                  onClick={() => setShowForgotPassword(true)}
                >
                  {t("auth.forgot_password")}
                </button>
              </>
            )}
          </div>
        </DialogContent>

        <ProfileCompletionModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
        <CardExpiredModal
          open={showCardExpiredModal}
          onClose={() => setShowCardExpiredModal(false)}
          cardStatus={cardStatus}
        />
      </Dialog>

      {/* Forgot Password OTP Modal - Separate Dialog */}
      <Dialog
        open={showForgotPasswordOtpModal}
        onOpenChange={setShowForgotPasswordOtpModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t("auth.enter_otp")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {t("auth.otp_sent")} {forgotPasswordPhone}
            </div>

            <OtpInput
              value={forgotPasswordOtp}
              onChange={setForgotPasswordOtp}
              autoFocus
            />

            {forgotPasswordOtpError && (
              <ErrorMessage message={forgotPasswordOtpError} />
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={verifyForgotPasswordOtp}>
                {t("auth.verify_otp")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgotPasswordOtpModal(false)}
              >
                {t("auth.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
