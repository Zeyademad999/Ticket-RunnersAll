import { createContext, useContext, useState } from "react";
import { toast } from "@/components/ui/use-toast"; // or from "sonner" if used
import { parseISO, isAfter, compareAsc } from "date-fns";
import { useTranslation } from "react-i18next";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}
interface BookedEvent {
  title: string;
  date: string;
  time: string;
}

type AuthContextType = {
  isLoginOpen: boolean;
  isSignupOpen: boolean;
  openLogin: () => void;
  openSignup: () => void;
  closeLogin: () => void;
  closeSignup: () => void;
  switchToSignup: () => void;
  switchToLogin: () => void;
  login: (token: string) => void;
  logout: () => void;
  user: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const { t } = useTranslation();

  const login = (token: string) => {
    localStorage.setItem("accessToken", token);
    setUser(token);
    checkNextUpcomingEvent();
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const switchToSignup = () => {
    setIsLoginOpen(false);
    setTimeout(() => setIsSignupOpen(true), 100); // allow modal transition
  };

  const switchToLogin = () => {
    setIsSignupOpen(false);
    setTimeout(() => setIsLoginOpen(true), 100);
  };

  const openLogin = () => setIsLoginOpen(true);
  const openSignup = () => setIsSignupOpen(true);
  const closeLogin = () => setIsLoginOpen(false);
  const closeSignup = () => setIsSignupOpen(false);

  const checkNextUpcomingEvent = () => {
    const events = JSON.parse(localStorage.getItem("bookedEvents") || "[]");
    const now = new Date();

    const upcoming = (events as BookedEvent[])
      .map((event) => ({
        ...event,
        eventDate: parseISO(event.date),
      }))
      .filter((event) => isAfter(event.eventDate, now))
      .sort((a, b) => compareAsc(a.eventDate, b.eventDate));

    const next = upcoming[0];

    if (next) {
      toast({
        title: t("notifications.nextEventTitle"),
        description: t("notifications.nextEventDescription", {
          title: next.title,
          date: next.date,
          time: next.time,
        }),
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoginOpen,
        isSignupOpen,
        openLogin,
        openSignup,
        closeLogin,
        closeSignup,
        switchToLogin,
        switchToSignup,
        login,
        logout,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
