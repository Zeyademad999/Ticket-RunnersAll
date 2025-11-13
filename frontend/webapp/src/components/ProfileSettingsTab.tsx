import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/input-otp";
import { TabsContent } from "@/components/ui/tabs";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useMobileVerification } from "@/hooks/useMobileVerification";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { Loader2 } from "lucide-react";
import { BookingsService } from "@/lib/api/services/bookings";
import { getSecureToken } from "@/lib/secureStorage";
import { apiClient } from "@/lib/api/config";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettingsTabProps {
  t: (key: string, defaultValue?: string) => string;
  userInfo: {
    name: string;
    profileImage?: string;
  };
  profileImage: string;
  setProfileImage: (img: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  phoneVerified: boolean;
  setPhoneVerified: (v: boolean) => void;
  handleSendPhoneOtp: () => void;
  email: string;
  setEmail: (email: string) => void;
  emailVerified: boolean;
  setEmailVerified: (v: boolean) => void;
  handleSendEmailOtp: () => void;
  bloodType: string;
  setBloodType: (v: string) => void;
  emergencyContact: string;
  setEmergencyContact: (v: string) => void;
  emergencyContactName: string;
  setEmergencyContactName: (v: string) => void;
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  passwordOtpVerified: boolean;
  setPasswordOtpVerified: (v: boolean) => void;
  passwordOtpError: string;
  handleSendPasswordOtp: () => void;
  handleVerifyPasswordOtp: () => void;
  handleSettingsSave: () => void;
  notifyEmail: boolean;
  setNotifyEmail: (v: boolean) => void;
  notifySMS: boolean;
  setNotifySMS: (v: boolean) => void;
  notificationWarning: string;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = (
  props
) => {
  const {
    t,
    userInfo,
    profileImage,
    setProfileImage,
    phone,
    setPhone,
    phoneVerified,
    setPhoneVerified,
    handleSendPhoneOtp,
    email,
    setEmail,
    emailVerified,
    setEmailVerified,
    handleSendEmailOtp,
    bloodType,
    setBloodType,
    emergencyContact,
    setEmergencyContact,
    emergencyContactName,
    setEmergencyContactName,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    passwordOtpVerified,
    passwordOtpError,
    handleSendPasswordOtp,
    handleVerifyPasswordOtp,
    handleSettingsSave,
    notifyEmail,
    setNotifyEmail,
    notifySMS,
    setNotifySMS,
    notificationWarning,
  } = props;

  const { updateProfile, loading } = useProfileUpdate();
  const { toast } = useToast();
  const { verifyMobile, loading: verifyLoading } = useMobileVerification();
  const { verifyEmail, loading: emailVerifyLoading } = useEmailVerification();

  // Local state for OTP modals and values
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [showPasswordOtpModal, setShowPasswordOtpModal] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [passwordOtp, setPasswordOtp] = useState("");

  // Ensure at least one notification method is checked
  const handleNotifyEmailChange = (checked: boolean) => {
    if (!checked && !notifySMS) return; // Prevent unchecking last
    props.setNotifyEmail(checked);
  };
  const handleNotifySMSChange = (checked: boolean) => {
    if (!checked && !notifyEmail) return; // Prevent unchecking last
    props.setNotifySMS(checked);
  };

  // Handle individual field updates
  const handlePhoneUpdate = async () => {
    if (phone && phoneVerified) {
      await updateProfile("mobile_number", phone);
    }
  };

  const handleEmailUpdate = async () => {
    if (email && emailVerified) {
      await updateProfile("email", email);
    }
  };

  const handleBloodTypeUpdate = async () => {
    if (bloodType) {
      try {
        const success = await updateProfile("blood_type", bloodType);
        if (success) {
          // Profile updated successfully
        }
      } catch (error) {
        console.error("Failed to update blood type:", error);
      }
    }
  };

  const handleEmergencyContactNameUpdate = async () => {
    if (emergencyContactName) {
      await updateProfile("emergency_contact_name", emergencyContactName);
    }
  };

  const handleEmergencyContactUpdate = async () => {
    if (emergencyContact) {
      await updateProfile("emergency_contact_mobile", emergencyContact);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword && passwordOtpVerified) {
      await updateProfile("password", newPassword);
    }
  };

  return (
    <TabsContent value="settings" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("profilepage.settingsTab.tab")}
          </CardTitle>
          <CardDescription className="mb-2">
            {t("profilepage.settingsTab.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t("profilepage.settingsTab.fullName")}
              </Label>
              <Input id="fullName" disabled defaultValue={userInfo.name} />
            </div>
            {/* Phone Verification */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                {t("profilepage.settingsTab.phone")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneVerified(false);
                  }}
                  placeholder={t(
                    "profilepage.settingsTab.phonePlaceholder",
                    "Phone Number"
                  )}
                />
                {!phoneVerified ? (
                  <>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => {
                        handleSendPhoneOtp();
                        setShowPhoneOtpModal(true);
                      }}
                    >
                      {t("auth.verify", "Verify")}
                    </Button>
                    <Dialog
                      open={showPhoneOtpModal}
                      onOpenChange={setShowPhoneOtpModal}
                    >
                      <DialogContent>
                        <DialogHeader>
                          {t(
                            "profilepage.settingsTab.phoneOtpTitle",
                            "Enter OTP"
                          )}
                        </DialogHeader>
                        <OtpInput
                          value={phoneOtp}
                          onChange={setPhoneOtp}
                          autoFocus
                        />
                        <Button
                          className="w-full mt-2"
                          onClick={async () => {
                            if (phoneOtp.length === 6 && phone) {
                              const success = await verifyMobile(
                                phone,
                                phoneOtp
                              );
                              if (success) {
                                setShowPhoneOtpModal(false);
                                setPhoneVerified(true);
                                setPhoneOtp("");
                              }
                            }
                          }}
                          disabled={phoneOtp.length !== 6 || verifyLoading}
                        >
                          {verifyLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {t("auth.verifying", "Verifying...")}
                            </>
                          ) : (
                            t("auth.verifyOtp", "Verify OTP")
                          )}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs font-semibold">
                      {t("auth.verified", "Verified")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePhoneUpdate}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("profilepage.settingsTab.update", "Update")
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {/* Email Verification */}
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("profilepage.settingsTab.email")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailVerified(false);
                  }}
                  placeholder={t(
                    "profilepage.settingsTab.emailPlaceholder",
                    "Email Address"
                  )}
                />
                {!emailVerified ? (
                  <>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => {
                        handleSendEmailOtp();
                        setShowEmailOtpModal(true);
                      }}
                    >
                      {t("auth.verify", "Verify")}
                    </Button>
                    <Dialog
                      open={showEmailOtpModal}
                      onOpenChange={setShowEmailOtpModal}
                    >
                      <DialogContent>
                        <DialogHeader>
                          {t(
                            "profilepage.settingsTab.emailOtpTitle",
                            "Enter OTP"
                          )}
                        </DialogHeader>
                        <OtpInput
                          value={emailOtp}
                          onChange={setEmailOtp}
                          autoFocus
                        />
                        <Button
                          className="w-full mt-2"
                          onClick={async () => {
                            if (emailOtp.length === 6 && email) {
                              const success = await verifyEmail(
                                email,
                                emailOtp
                              );
                              if (success) {
                                setShowEmailOtpModal(false);
                                setEmailVerified(true);
                                setEmailOtp("");
                              }
                            }
                          }}
                          disabled={emailOtp.length !== 6 || emailVerifyLoading}
                        >
                          {emailVerifyLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {t("auth.verifying", "Verifying...")}
                            </>
                          ) : (
                            t("auth.verifyOtp", "Verify OTP")
                          )}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs font-semibold">
                      {t("auth.verified", "Verified")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEmailUpdate}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("profilepage.settingsTab.update", "Update")
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileImage">
                {t("profilepage.settingsTab.profileImage")}
              </Label>
              <div className="flex items-center space-x-2">
                {profileImage && (
                  <img
                    src={userInfo.profileImage}
                    alt="Profile Preview"
                    className="w-24 h-24 rounded-full object-cover border"
                  />
                )}
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file type
                      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: "Invalid File Type",
                          description: "Please select a valid image file (JPEG, PNG, or WebP)",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Validate file size (5MB)
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast({
                          title: "File Too Large",
                          description: "Image size must be less than 5MB",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Create preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Image = reader.result as string;
                        setProfileImage(base64Image);
                      };
                      reader.readAsDataURL(file);

                      // Upload to backend using BookingsService
                      try {
                        const formData = new FormData();
                        formData.append("profile_image", file);
                        const token = await getSecureToken();
                        const response = await apiClient.put("/users/profile/", formData, {
                          headers: {
                            "Content-Type": "multipart/form-data",
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                        });
                        if (response.data) {
                          toast({
                            title: "Profile Image Updated",
                            description: "Your profile image has been updated successfully",
                          });
                        }
                      } catch (error: any) {
                        console.error("Error uploading profile image:", error);
                        toast({
                          title: "Upload Failed",
                          description: error.message || "Failed to upload profile image. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                />
              </div>
              <p
                className="text-sm text-muted-foreground mt-2"
                dir={t("common.textDirection")}
                style={{
                  textAlign:
                    t("common.textDirection") === "rtl" ? "right" : "left",
                }}
              >
                {t("profilepage.settingsTab.profileImageDisabled")}
              </p>
            </div>
            {/* Blood Type */}
            <div className="space-y-2">
              <Label htmlFor="bloodType">
                {t("profilepage.settingsTab.bloodType")}
              </Label>
              <div className="flex items-center gap-2">
                <select
                  id="bloodType"
                  className="flex-1 rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                >
                  <option value="">
                    {t("profilepage.settingsTab.selectOption")}
                  </option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBloodTypeUpdate}
                  disabled={loading || !bloodType}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
            {/* Emergency Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">
                {t("profilepage.settingsTab.emergencyContactName")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.emergencyContactNamePlaceholder",
                    "Contact Name"
                  )}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmergencyContactNameUpdate}
                  disabled={loading || !emergencyContactName}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
            {/* Emergency Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">
                {t("profilepage.settingsTab.emergencyContact")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emergencyContact"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.emergencyContactPlaceholder",
                    "Contact Number"
                  )}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmergencyContactUpdate}
                  disabled={loading || !emergencyContact}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
          </div>
          {/* Password Change Section */}
          <div className="space-y-2 pt-4">
            <Label>{t("profilepage.settingsTab.changePassword")}</Label>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.oldPasswordPlaceholder",
                    "Current Password"
                  )}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    props.setPasswordOtpVerified(false);
                  }}
                  placeholder={t(
                    "profilepage.settingsTab.newPasswordPlaceholder",
                    "New Password"
                  )}
                />
              </div>
              <div className="flex items-end">
                {/* For change password verification: */}
                {!passwordOtpVerified ? (
                  <>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => {
                        setShowPasswordOtpModal(true);
                      }}
                      disabled={!oldPassword || !newPassword}
                    >
                      {t("auth.verify", "Send OTP")}
                    </Button>
                    <Dialog
                      open={showPasswordOtpModal}
                      onOpenChange={setShowPasswordOtpModal}
                    >
                      <DialogContent>
                        <DialogHeader>
                          {t(
                            "profilepage.settingsTab.passwordOtpTitle",
                            "Enter OTP"
                          )}
                        </DialogHeader>
                        <OtpInput
                          value={passwordOtp}
                          onChange={setPasswordOtp}
                          autoFocus
                        />
                        <Button
                          className="w-full mt-2"
                          onClick={() => {
                            if (passwordOtp.length === 6) {
                              // Mock verification - in real app, verify with API
                              setShowPasswordOtpModal(false);
                              setPasswordOtpVerified(true);
                              setPasswordOtpError("");
                            } else {
                              setPasswordOtpError(
                                "Please enter a valid 6-digit OTP"
                              );
                            }
                          }}
                          disabled={passwordOtp.length !== 6}
                        >
                          {t("auth.verifyOtp", "Verify OTP")}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs font-semibold">
                      {t("auth.verified", "Verified")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePasswordUpdate}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("profilepage.settingsTab.update", "Update")
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {passwordOtpError && (
              <p className="text-sm text-red-500">{passwordOtpError}</p>
            )}
          </div>
          {/* Notification Preferences */}
          <div className="space-y-2 pt-4">
            <Label>
              {t("profilepage.settingsTab.notificationPreferences")}
            </Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={props.notifyEmail}
                  onChange={(e) => handleNotifyEmailChange(e.target.checked)}
                  disabled={!props.notifySMS && Boolean(props.notifyEmail)}
                />
                <span>{t("profilepage.settingsTab.notifyEmail")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={props.notifySMS}
                  onChange={(e) => handleNotifySMSChange(e.target.checked)}
                  disabled={!props.notifyEmail && Boolean(props.notifySMS)}
                />
                <span>{t("profilepage.settingsTab.notifySMS")}</span>
              </label>
              {notificationWarning && (
                <span className="text-xs text-red-500 font-medium">
                  {notificationWarning}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="gradient"
              onClick={handleSettingsSave}
              disabled={newPassword && !passwordOtpVerified}
            >
              {t("profilepage.settingsTab.saveChanges", "Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
