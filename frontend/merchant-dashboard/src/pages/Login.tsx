import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Smartphone, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OTPPopup from "../components/OTPPopup";
import LanguageToggle from "../components/LanguageToggle";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const Login: React.FC = () => {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPPopup, setShowOTPPopup] = useState(false);

  const { sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(mobile, password);
      setShowOTPPopup(true);
      toast.success("OTP sent to your mobile number");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    try {
      await verifyOTP(mobile, otp);
      toast.success("Login successful!");
      setShowOTPPopup(false);
      navigate("/dashboard");
    } catch (error: any) {
      throw error;
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP(mobile, password);
      toast.success("OTP resent successfully");
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto flex justify-center">
              <img
                src="/ticket-logo-secondary.png"
                alt="Ticket Runners Logo"
                className="h-16 w-auto"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t("auth.loginTitle")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
            <div className="space-y-4">
              {/* Mobile Number Field */}
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("auth.mobileNumber")}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    style={{
                      paddingLeft: isRTL ? "1rem" : "2.5rem",
                      paddingRight: isRTL ? "2.5rem" : "1rem",
                    }}
                    placeholder="Enter your mobile number"
                  />
                  <Smartphone
                    className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${
                      isRTL ? "left-3" : "left-3"
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("auth.password")}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                    style={{
                      paddingLeft: isRTL ? "1rem" : "1rem",
                      paddingRight: isRTL ? "2.5rem" : "2.5rem",
                    }}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                      isRTL ? "left-3" : "right-3"
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    {t("common.continue")}
                    <ArrowRight
                      className={`h-4 w-4 ${
                        isRTL ? "mr-2 rotate-180" : "ml-2"
                      }`}
                    />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <OTPPopup
        isOpen={showOTPPopup}
        onClose={() => setShowOTPPopup(false)}
        onVerify={handleOTPVerify}
        onResend={handleResendOTP}
        mobile={mobile}
        isLoading={isLoading}
      />
    </>
  );
};

export default Login;
