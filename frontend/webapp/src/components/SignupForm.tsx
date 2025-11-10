import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/lib/api/services/auth";
import {
  SignupStartRequest,
  SendMobileOtpRequest,
  VerifyMobileOtpRequest,
  SetPasswordRequest,
  UploadProfileImageRequest,
  SaveOptionalInfoRequest,
  CompleteSignupRequest,
} from "@/lib/api/types";
import { toast } from "sonner";
import { ValidationService, PASSWORD_RULES } from "@/lib/validation";
import { setSecureToken, setSecureUserData } from "@/lib/secureStorage";

interface SignupFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: (signupId: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onClose,
  onSwitchToLogin,
  onSignupSuccess,
}) => {
  const [formData, setFormData] = useState<SignupStartRequest>({
    first_name: "",
    last_name: "",
    mobile_number: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [signupId, setSignupId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    | "signup"
    | "mobile-otp"
    | "password"
    | "profile-image"
    | "optional-info"
    | "completing"
  >("signup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [optionalInfo, setOptionalInfo] = useState({
    blood_type: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
  });
  const [isSavingOptional, setIsSavingOptional] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await AuthService.signupStart(formData);
      const signupIdValue = response.signup_id || response.mobile_number || formData.mobile_number;
      setSignupId(signupIdValue);

      // Backend sends OTP automatically during registration
      // Set otpSent to true so the OTP form is shown
      setOtpSent(true);
      toast.success(response.message || "OTP sent to your mobile number!");
      setCurrentStep("mobile-otp");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to start signup process");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMobileOtp = async (signupId: string) => {
    setIsSendingOtp(true);
    try {
      const otpData: SendMobileOtpRequest = {
        signup_id: parseInt(signupId),
        mobile_number: formData.mobile_number,
        otp_code: otpCode || "123456", // For testing, in real app this would be empty initially
      };

      await AuthService.sendMobileOtp(otpData);
      setOtpSent(true);
      toast.success("OTP sent to your mobile number!");
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };


  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast.error("Please enter the OTP code");
      return;
    }

    setIsLoading(true);
    try {
      if (currentStep === "mobile-otp") {
        const verifyData: VerifyMobileOtpRequest = {
          signup_id: parseInt(signupId!),
          mobile_number: formData.mobile_number,
          otp_code: otpCode.trim(),
        };

        const response = await AuthService.verifyMobileOtp(verifyData);

        if (response.mobile_verified) {
          toast.success("Mobile number verified successfully!");
          // Skip email OTP step, go directly to password
          setCurrentStep("password");
          setOtpCode(""); // Clear OTP code
        } else {
          toast.error("Invalid OTP code. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error.message || "Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordValidation = ValidationService.validatePassword(
      password,
      PASSWORD_RULES
    );
    if (!passwordValidation.isValid) {
      toast.error(
        passwordValidation.errors[0] || "Password does not meet requirements"
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSettingPassword(true);
    try {
      const passwordData: SetPasswordRequest = {
        signup_id: parseInt(signupId!),
        password: password.trim(),
        password_confirmation: confirmPassword.trim(),
        mobile_number: formData.mobile_number, // Add mobile_number for backend
      };

      const response = await AuthService.setPassword(passwordData);

      // Backend completes registration and returns tokens
      if (response.access && response.refresh) {
        // Store tokens
        await setSecureToken(response.access, response.refresh);
        await setSecureUserData(response.user);
        
        toast.success("Registration completed successfully!");
        onSignupSuccess(signupId!);
        onClose();
      } else if (response.password_set) {
        toast.success("Password set successfully!");
        setCurrentStep("profile-image");
      } else {
        toast.error("Failed to set password. Please try again.");
      }
    } catch (error: any) {
      console.error("Password setting error:", error);
      toast.error(error.message || "Failed to set password. Please try again.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
        return;
      }

      // Validate file size (5MB = 5 * 1024 * 1024 bytes)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage || !signupId) {
      toast.error("Please select an image to upload");
      return;
    }

    setIsUploadingImage(true);
    try {
      const imageData: UploadProfileImageRequest = {
        signup_id: parseInt(signupId),
        file: profileImage,
      };

      const response = await AuthService.uploadProfileImage(imageData);

      if (response.uploaded) {
        toast.success("Profile image uploaded successfully!");
        setCurrentStep("optional-info");
      } else {
        toast.error("Failed to upload profile image. Please try again.");
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast.error(
        error.message || "Failed to upload profile image. Please try again."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const skipImageUpload = () => {
    setCurrentStep("optional-info");
  };

  const handleOptionalInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setOptionalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOptionalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSavingOptional(true);
    try {
      const optionalData: SaveOptionalInfoRequest = {
        signup_id: parseInt(signupId!),
        blood_type: optionalInfo.blood_type,
        emergency_contact_name: optionalInfo.emergency_contact_name,
        emergency_contact_mobile: optionalInfo.emergency_contact_mobile,
      };

      const response = await AuthService.saveOptionalInfo(optionalData);

      if (response.optional_saved) {
        toast.success("Optional information saved successfully!");
        await completeSignupProcess();
      } else {
        toast.error("Failed to save optional information. Please try again.");
      }
    } catch (error: any) {
      console.error("Optional info save error:", error);
      toast.error(
        error.message ||
          "Failed to save optional information. Please try again."
      );
    } finally {
      setIsSavingOptional(false);
    }
  };

  const skipOptionalInfo = async () => {
    await completeSignupProcess();
  };

  const completeSignupProcess = async () => {
    setIsCompletingSignup(true);
    setCurrentStep("completing");

    try {
      const completeData: CompleteSignupRequest = {
        signup_id: parseInt(signupId!),
      };

      const response = await AuthService.completeSignup(completeData);

      if (response.customer && response.access_token) {
        // Store the access token securely
        await setSecureToken(response.access_token);
        await setSecureUserData(JSON.stringify(response.customer));

        toast.success("Account created and activated successfully!");
        onSignupSuccess(signupId!);
        onClose();
      } else {
        toast.error("Failed to complete signup. Please try again.");
      }
    } catch (error: any) {
      console.error("Signup completion error:", error);

      // Handle specific database errors
      if (error.message && error.message.includes("Column not found")) {
        toast.error(
          "Account created but there was a database issue. Please try logging in manually."
        );
        // Still call onSignupSuccess since the account was likely created
        onSignupSuccess(signupId!);
        onClose();
      } else if (error.message && error.message.includes("SQLSTATE")) {
        toast.error(
          "Account created but there was a database issue. Please try logging in manually."
        );
        // Still call onSignupSuccess since the account was likely created
        onSignupSuccess(signupId!);
        onClose();
      } else {
        toast.error(
          error.message || "Failed to complete signup. Please try again."
        );
      }
    } finally {
      setIsCompletingSignup(false);
    }
  };

  if (currentStep === "completing" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Completing Signup</h2>
        <p className="text-sm text-gray-600">
          Please wait while we finalize your account...
        </p>

        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (currentStep === "optional-info" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Optional Information</h2>
        <p className="text-sm text-gray-600">
          Add medical and emergency contact information (optional)
        </p>

        <form onSubmit={handleOptionalInfoSubmit} className="space-y-4">
          <div>
            <Label htmlFor="blood_type">Blood Type</Label>
            <select
              id="blood_type"
              name="blood_type"
              value={optionalInfo.blood_type}
              onChange={handleOptionalInfoChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select blood type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <Label htmlFor="emergency_contact_name">
              Emergency Contact Name
            </Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              type="text"
              value={optionalInfo.emergency_contact_name}
              onChange={handleOptionalInfoChange}
              placeholder="Enter emergency contact name"
            />
          </div>

          <div>
            <Label htmlFor="emergency_contact_mobile">
              Emergency Contact Mobile
            </Label>
            <Input
              id="emergency_contact_mobile"
              name="emergency_contact_mobile"
              type="tel"
              value={optionalInfo.emergency_contact_mobile}
              onChange={handleOptionalInfoChange}
              placeholder="Enter emergency contact mobile number"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSavingOptional}
              className="flex-1"
            >
              {isSavingOptional ? "Saving..." : "Save & Create Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={skipOptionalInfo}
              disabled={isSavingOptional}
              className="flex-1"
            >
              Skip for Now
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            Back to Login
          </button>
        </p>
      </div>
    );
  }

  if (currentStep === "profile-image" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Upload Profile Image</h2>
        <p className="text-sm text-gray-600">
          Add a profile picture to personalize your account (optional)
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="profile-image">Profile Image</Label>
            <Input
              id="profile-image"
              name="profile-image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports JPEG, PNG, WebP (max 5MB)
            </p>
          </div>

          {profileImagePreview && (
            <div className="flex justify-center">
              <img
                src={profileImagePreview}
                alt="Profile preview"
                className="w-32 h-32 object-cover rounded-full border-2 border-gray-200"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImageUpload}
              disabled={!profileImage || isUploadingImage}
              className="flex-1"
            >
              {isUploadingImage ? "Uploading..." : "Upload & Create Account"}
            </Button>
            <Button
              variant="outline"
              onClick={skipImageUpload}
              disabled={isUploadingImage}
              className="flex-1"
            >
              Skip for Now
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            Back to Login
          </button>
        </p>
      </div>
    );
  }

  if (currentStep === "password" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Set Your Password</h2>
        <p className="text-sm text-gray-600">
          Create a secure password for your account
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
              required
              minLength={8}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={isSettingPassword} className="w-full">
            {isSettingPassword ? "Setting Password..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            Back to Login
          </button>
        </p>
      </div>
    );
  }

  if (otpSent && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Verify Mobile Number</h2>
        <p className="text-sm text-gray-600">
          We've sent a verification code to {formData.mobile_number}
        </p>

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div>
            <Label htmlFor="otp_code">Enter OTP Code</Label>
            <Input
              id="otp_code"
              name="otp_code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || isSendingOtp}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => sendMobileOtp(signupId)}
            disabled={isSendingOtp}
            className="text-sm"
          >
            {isSendingOtp ? "Sending..." : "Resend OTP"}
          </Button>
        </div>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            Back to Login
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Sign Up</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="mobile_number">Mobile Number</Label>
          <Input
            id="mobile_number"
            name="mobile_number"
            type="tel"
            value={formData.mobile_number}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </div>
  );
};
