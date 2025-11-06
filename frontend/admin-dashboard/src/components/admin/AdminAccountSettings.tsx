import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OtpInput } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import {
  User,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Shield,
  AlertTriangle,
  Key,
  CheckCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminAccountSettingsProps {}

const AdminAccountSettings: React.FC<AdminAccountSettingsProps> = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "Admin User",
    email: "admin@ticketrunners.com",
    phone: "+20 122 652 1747",
    username: "admin",
    role: "Super Admin",
    lastLogin: "2024-01-15T10:30:00Z",
    createdAt: "2023-06-01T00:00:00Z",
  });

  // Password Reset State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // OTP Verification State
  const [otpVerification, setOtpVerification] = useState({
    isVerifying: false,
    otpValue: "",
    isVerified: false,
    showOtpInput: false,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    emailNotifications: true,
    loginNotifications: true,
    sessionTimeout: 30,
  });

  // UI State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);

  // Handle personal information update
  const handlePersonalInfoUpdate = async () => {
    setIsUpdatingPersonal(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: t("admin.accountSettings.personalInfo.updated"),
      description: t("admin.accountSettings.personalInfo.updatedDesc"),
    });

    setIsUpdatingPersonal(false);
  };

  // Handle OTP verification request
  const handleOtpRequest = async () => {
    if (!passwordData.currentPassword) {
      toast({
        title: t("admin.accountSettings.password.currentPasswordRequired"),
        description: t(
          "admin.accountSettings.password.currentPasswordRequiredDesc"
        ),
        variant: "destructive",
      });
      return;
    }

    setOtpVerification((prev) => ({ ...prev, isVerifying: true }));

    // Simulate sending OTP
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setOtpVerification((prev) => ({
      ...prev,
      isVerifying: false,
      showOtpInput: true,
    }));

    toast({
      title: t("admin.accountSettings.password.otpSent"),
      description: t("admin.accountSettings.password.otpSentDesc"),
    });
  };

  // Handle OTP verification
  const handleOtpVerification = async () => {
    if (otpVerification.otpValue.length !== 6) {
      toast({
        title: t("admin.accountSettings.password.invalidOtp"),
        description: t("admin.accountSettings.password.invalidOtpDesc"),
        variant: "destructive",
      });
      return;
    }

    setOtpVerification((prev) => ({ ...prev, isVerifying: true }));

    // Simulate OTP verification
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo purposes, accept any 6-digit OTP
    if (otpVerification.otpValue.length === 6) {
      setOtpVerification((prev) => ({
        ...prev,
        isVerified: true,
        isVerifying: false,
        showOtpInput: false,
      }));

      toast({
        title: t("admin.accountSettings.password.otpVerified"),
        description: t("admin.accountSettings.password.otpVerifiedDesc"),
      });
    } else {
      setOtpVerification((prev) => ({
        ...prev,
        isVerifying: false,
        otpValue: "",
      }));

      toast({
        title: t("admin.accountSettings.password.otpInvalid"),
        description: t("admin.accountSettings.password.otpInvalidDesc"),
        variant: "destructive",
      });
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!otpVerification.isVerified) {
      toast({
        title: t("admin.accountSettings.password.otpRequired"),
        description: t("admin.accountSettings.password.otpRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t("admin.accountSettings.password.mismatch"),
        description: t("admin.accountSettings.password.mismatchDesc"),
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: t("admin.accountSettings.password.tooShort"),
        description: t("admin.accountSettings.password.tooShortDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Reset all password fields and OTP state
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpVerification({
      isVerifying: false,
      otpValue: "",
      isVerified: false,
      showOtpInput: false,
    });

    toast({
      title: t("admin.accountSettings.password.updated"),
      description: t("admin.accountSettings.password.updatedDesc"),
    });

    setIsUpdatingPassword(false);
  };

  // Handle security settings update
  const handleSecuritySettingsUpdate = async () => {
    setIsUpdatingSecurity(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: t("admin.accountSettings.security.updated"),
      description: t("admin.accountSettings.security.updatedDesc"),
    });

    setIsUpdatingSecurity(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      i18nInstance.language === "ar" ? "ar-EG" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="mb-8 rtl:text-right">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("admin.accountSettings.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("admin.accountSettings.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rtl:flex-row-reverse">
          <TabsTrigger value="personal" className="rtl:text-right">
            {t("admin.accountSettings.tabs.personal")}
          </TabsTrigger>
          <TabsTrigger value="security" className="rtl:text-right">
            {t("admin.accountSettings.tabs.security")}
          </TabsTrigger>
          <TabsTrigger value="password" className="rtl:text-right">
            {t("admin.accountSettings.tabs.password")}
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rtl:space-x-reverse">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="/admin-avatar.png" alt="Admin" />
                    <AvatarFallback className="text-2xl">
                      {personalInfo.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="rtl:text-right">
                  {personalInfo.fullName}
                </CardTitle>
                <CardDescription className="rtl:text-right">
                  {personalInfo.role}
                </CardDescription>
                <div className="flex justify-center rtl:justify-end">
                  <Badge variant="secondary" className="mt-2">
                    {t("admin.accountSettings.status.active")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 rtl:text-right">
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {personalInfo.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {personalInfo.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    @{personalInfo.username}
                  </span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between rtl:flex-row-reverse">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.accountSettings.personalInfo.lastLogin")}
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(personalInfo.lastLogin)}
                    </span>
                  </div>
                  <div className="flex justify-between rtl:flex-row-reverse">
                    <span className="text-sm text-muted-foreground">
                      {t("admin.accountSettings.personalInfo.createdAt")}
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(personalInfo.createdAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                  <User className="h-5 w-5" />
                  {t("admin.accountSettings.personalInfo.title")}
                </CardTitle>
                <CardDescription className="rtl:text-right">
                  {t("admin.accountSettings.personalInfo.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="rtl:text-right">
                      {t("admin.accountSettings.personalInfo.fullName")}
                    </Label>
                    <Input
                      id="fullName"
                      value={personalInfo.fullName}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          fullName: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.accountSettings.personalInfo.fullNamePlaceholder"
                      )}
                      className="rtl:text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="rtl:text-right">
                      {t("admin.accountSettings.personalInfo.username")}
                    </Label>
                    <Input
                      id="username"
                      value={personalInfo.username}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          username: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.accountSettings.personalInfo.usernamePlaceholder"
                      )}
                      className="rtl:text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="rtl:text-right">
                      {t("admin.accountSettings.personalInfo.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          email: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.accountSettings.personalInfo.emailPlaceholder"
                      )}
                      className="rtl:text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="rtl:text-right">
                      {t("admin.accountSettings.personalInfo.phone")}
                    </Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          phone: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.accountSettings.personalInfo.phonePlaceholder"
                      )}
                      className="rtl:text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-end rtl:flex-row-reverse">
                  <Button
                    onClick={handlePersonalInfoUpdate}
                    disabled={isUpdatingPersonal}
                    className="flex items-center gap-2 rtl:flex-row-reverse"
                  >
                    {isUpdatingPersonal ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isUpdatingPersonal
                      ? t("admin.accountSettings.personalInfo.updating")
                      : t("admin.accountSettings.personalInfo.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <Shield className="h-5 w-5" />
                {t("admin.accountSettings.security.title")}
              </CardTitle>
              <CardDescription className="rtl:text-right">
                {t("admin.accountSettings.security.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="space-y-1">
                    <Label className="rtl:text-right">
                      {t("admin.accountSettings.security.twoFactorAuth")}
                    </Label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t("admin.accountSettings.security.twoFactorAuthDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        twoFactorAuth: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="space-y-1">
                    <Label className="rtl:text-right">
                      {t("admin.accountSettings.security.emailNotifications")}
                    </Label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t(
                        "admin.accountSettings.security.emailNotificationsDesc"
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="space-y-1">
                    <Label className="rtl:text-right">
                      {t("admin.accountSettings.security.loginNotifications")}
                    </Label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t(
                        "admin.accountSettings.security.loginNotificationsDesc"
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.loginNotifications}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        loginNotifications: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.accountSettings.security.sessionTimeout")}
                  </Label>
                  <div className="flex items-center gap-4 rtl:flex-row-reverse">
                    <Input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          sessionTimeout: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-24 rtl:text-right"
                      min="5"
                      max="120"
                    />
                    <span className="text-sm text-muted-foreground">
                      {t("admin.accountSettings.security.minutes")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {t("admin.accountSettings.security.sessionTimeoutDesc")}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="rtl:text-right">
                  {t("admin.accountSettings.security.warning")}
                </AlertDescription>
              </Alert>

              <div className="flex justify-end rtl:flex-row-reverse">
                <Button
                  onClick={handleSecuritySettingsUpdate}
                  disabled={isUpdatingSecurity}
                  className="flex items-center gap-2 rtl:flex-row-reverse"
                >
                  {isUpdatingSecurity ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isUpdatingSecurity
                    ? t("admin.accountSettings.security.updating")
                    : t("admin.accountSettings.security.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Reset Tab */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                <Lock className="h-5 w-5" />
                {t("admin.accountSettings.password.title")}
              </CardTitle>
              <CardDescription className="rtl:text-right">
                {t("admin.accountSettings.password.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="rtl:text-right">
                    {t("admin.accountSettings.password.currentPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.accountSettings.password.currentPasswordPlaceholder"
                      )}
                      className="rtl:text-right pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent rtl:left-0 rtl:right-auto"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* OTP Verification Section */}
                {!otpVerification.isVerified && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <Key className="h-5 w-5 text-primary" />
                      <div>
                        <Label className="rtl:text-right">
                          {t("admin.accountSettings.password.otpVerification")}
                        </Label>
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {t(
                            "admin.accountSettings.password.otpVerificationDesc"
                          )}
                        </p>
                      </div>
                    </div>

                    {!otpVerification.showOtpInput ? (
                      <Button
                        onClick={handleOtpRequest}
                        disabled={
                          otpVerification.isVerifying ||
                          !passwordData.currentPassword
                        }
                        className="flex items-center gap-2 rtl:flex-row-reverse"
                      >
                        {otpVerification.isVerifying ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4" />
                        )}
                        {otpVerification.isVerifying
                          ? t("admin.accountSettings.password.sendingOtp")
                          : t("admin.accountSettings.password.sendOtp")}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="rtl:text-right">
                            {t("admin.accountSettings.password.enterOtp")}
                          </Label>
                          <OtpInput
                            value={otpVerification.otpValue}
                            onChange={(value) =>
                              setOtpVerification((prev) => ({
                                ...prev,
                                otpValue: value,
                              }))
                            }
                            length={6}
                            disabled={otpVerification.isVerifying}
                            language={i18nInstance.language}
                          />
                        </div>
                        <div className="flex gap-2 rtl:flex-row-reverse">
                          <Button
                            onClick={handleOtpVerification}
                            disabled={
                              otpVerification.isVerifying ||
                              otpVerification.otpValue.length !== 6
                            }
                            className="flex items-center gap-2 rtl:flex-row-reverse"
                          >
                            {otpVerification.isVerifying ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            {otpVerification.isVerifying
                              ? t("admin.accountSettings.password.verifyingOtp")
                              : t("admin.accountSettings.password.verifyOtp")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setOtpVerification((prev) => ({
                                ...prev,
                                showOtpInput: false,
                                otpValue: "",
                              }))
                            }
                            disabled={otpVerification.isVerifying}
                          >
                            {t("admin.accountSettings.password.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* OTP Verified Success Message */}
                {otpVerification.isVerified && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg rtl:flex-row-reverse">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300 rtl:text-right">
                      {t("admin.accountSettings.password.otpVerifiedSuccess")}
                    </span>
                  </div>
                )}

                {/* New Password Section - Only show when OTP is verified */}
                {otpVerification.isVerified && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="rtl:text-right">
                        {t("admin.accountSettings.password.newPassword")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder={t(
                            "admin.accountSettings.password.newPasswordPlaceholder"
                          )}
                          className="rtl:text-right pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent rtl:left-0 rtl:right-auto"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="rtl:text-right"
                      >
                        {t("admin.accountSettings.password.confirmPassword")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder={t(
                            "admin.accountSettings.password.confirmPasswordPlaceholder"
                          )}
                          className="rtl:text-right pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent rtl:left-0 rtl:right-auto"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Password Requirements Alert - Only show when OTP is verified */}
              {otpVerification.isVerified && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="rtl:text-right">
                    {t("admin.accountSettings.password.requirements")}
                  </AlertDescription>
                </Alert>
              )}

              {/* Update Password Button - Only show when OTP is verified */}
              {otpVerification.isVerified && (
                <div className="flex justify-end rtl:flex-row-reverse">
                  <Button
                    onClick={handlePasswordReset}
                    disabled={isUpdatingPassword}
                    className="flex items-center gap-2 rtl:flex-row-reverse"
                  >
                    {isUpdatingPassword ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {isUpdatingPassword
                      ? t("admin.accountSettings.password.updating")
                      : t("admin.accountSettings.password.update")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAccountSettings;
