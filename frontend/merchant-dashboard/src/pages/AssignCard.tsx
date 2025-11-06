import React, { useState } from "react";
import {
  CreditCard,
  Smartphone,
  CheckCircle,
  Copy,
  Download,
  ArrowRight,
  AlertCircle,
  User,
} from "lucide-react";
import { apiService } from "../services/api";
import { Customer } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

type AssignmentStep = "input" | "verification" | "otp" | "success";

const AssignCard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<AssignmentStep>("input");
  const [cardSerial, setCardSerial] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [hashedCode, setHashedCode] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Authentication required. Please log in first.");
      return;
    }

    if (!cardSerial || !customerMobile) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsVerifying(true);
    try {
      // Verify customer mobile number
      const response = await apiService.verifyCustomerMobile(customerMobile);
      if (response.success && response.data) {
        setCustomer(response.data);

        // Check if fees are paid
        if (!response.data.fees_paid) {
          toast.error(
            "Customer fees are not paid. Please ask customer to pay fees first."
          );
          return;
        }

        // Send OTP to customer
        await apiService.sendCustomerOTP(customerMobile);
        setStep("otp");
        toast.success("Customer verified! OTP sent to customer mobile.");
      } else {
        toast.error("Customer not found or not registered");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify customer");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Authentication required. Please log in first.");
      return;
    }

    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.assignCard({
        card_serial: cardSerial,
        customer_mobile: customerMobile,
        otp: otp,
        hashed_code: "",
      });

      if (response.success && response.data) {
        setHashedCode(response.data.hashed_code);
        setStep("success");
        toast.success("Card assigned successfully!");
      } else {
        toast.error("Failed to assign card");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign card");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hashedCode);
      toast.success("Hashed code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const resetForm = () => {
    setStep("input");
    setCardSerial("");
    setCustomerMobile("");
    setOtp("");
    setHashedCode("");
    setCustomer(null);
  };

  const renderInputStep = () => (
    <div className="card max-w-md mx-auto relative">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
          <CreditCard className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("assignCard.title")}
        </h2>
        <p className="text-gray-600">
          {t("assignCard.selectCard")} {t("assignCard.selectCustomer")}
        </p>
      </div>

      <form onSubmit={handleInputSubmit} className="space-y-4">
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center z-10">
            <p className="text-gray-600 font-medium">
              Please log in to continue
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="cardSerial"
            className="block text-sm font-medium text-gray-700"
          >
            {t("assignCard.cardNumber")}
          </label>
          <input
            id="cardSerial"
            type="text"
            value={cardSerial}
            onChange={(e) => setCardSerial(e.target.value)}
            className="input-field mt-1"
            placeholder="Enter card serial number"
            required
          />
        </div>

        <div>
          <label
            htmlFor="customerMobile"
            className="block text-sm font-medium text-gray-700"
          >
            {t("assignCard.customerPhone")}
          </label>
          <input
            id="customerMobile"
            type="tel"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            className="input-field mt-1"
            placeholder="Enter customer mobile number"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          className="btn-primary w-full flex justify-center items-center"
        >
          {isVerifying ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              {t("assignCard.selectCustomer")}
              <ArrowRight className={`${isRTL ? "mr-2" : "ml-2"} h-4 w-4`} />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderOTPStep = () => (
    <div className="card max-w-md mx-auto relative">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
          <Smartphone className="h-6 w-6 text-warning-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("auth.login")}
        </h2>
        <p className="text-gray-600">{t("auth.loginSubtitle")}</p>
      </div>

      {customer && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <User className={`h-5 w-5 text-gray-400 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {customer.name}
              </p>
              <p className="text-sm text-gray-500">{customer.mobile_number}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleOTPSubmit} className="space-y-4">
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center z-10">
            <p className="text-gray-600 font-medium">
              Please log in to continue
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-gray-700"
          >
            {t("auth.password")}
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="input-field mt-1 text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code sent to {customerMobile}
          </p>
        </div>

        <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            type="button"
            onClick={() => setStep("input")}
            className="btn-secondary flex-1"
          >
            {t("common.back")}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex-1 flex justify-center items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>{t("assignCard.assignCard")}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("assignCard.cardAssignedSuccess")}
        </h2>
        <p className="text-gray-600">{t("assignCard.cardAssignedSuccess")}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hashed Code for Card Writing
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <code className="text-sm font-mono text-gray-900 break-all">
              {hashedCode}
            </code>
          </div>
        </div>

        <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            onClick={copyToClipboard}
            className="btn-secondary flex-1 flex items-center justify-center"
          >
            <Copy className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
            {t("common.copy")}
          </button>
          <button
            onClick={() => {
              // This would integrate with local card writing software
              toast.success("Write command sent to local software");
            }}
            className="btn-success flex-1 flex items-center justify-center"
          >
            <Download className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
            {t("common.write")}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle
              className={`h-5 w-5 text-blue-400 ${
                isRTL ? "ml-2" : "mr-2"
              } mt-0.5`}
            />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Important Instructions:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Scan the NFC card with your reader</li>
                <li>Write the hashed code to the card</li>
                <li>If card was already assigned, it will be rewritten</li>
                <li>Verify the write operation was successful</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle
              className={`h-5 w-5 text-green-400 ${
                isRTL ? "ml-2" : "mr-2"
              } mt-0.5`}
            />
            <div className="text-sm text-green-800">
              <p className="font-medium">Card Assignment Complete!</p>
              <p>
                Card {cardSerial} has been assigned to {customer?.name} (
                {customerMobile})
              </p>
            </div>
          </div>
        </div>

        <button onClick={resetForm} className="btn-primary w-full">
          {t("assignCard.assignCard")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("assignCard.title")}
        </h1>
        <p className="text-gray-600">
          {t("assignCard.selectCard")} {t("assignCard.selectCustomer")}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ You need to be logged in to assign cards. Please log in first.
            </p>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {["input", "otp", "success"].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName
                    ? "bg-primary-600 text-white"
                    : step === "success" ||
                      (step === "otp" && index < 2) ||
                      (step === "input" && index === 0)
                    ? "bg-primary-100 text-primary-600"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    step === "success" || (step === "otp" && index === 0)
                      ? "bg-primary-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === "input" && renderInputStep()}
      {step === "otp" && renderOTPStep()}
      {step === "success" && renderSuccessStep()}
    </div>
  );
};

export default AssignCard;
