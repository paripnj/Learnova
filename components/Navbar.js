"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  BookOpen,
  ChevronDown,
  User,
  Activity,
  LogOut,
  Settings,
  Sparkles,
  Home,
  Mail,
  Bell,
  UserCheck,
  Sun,
  Moon,
  Keyboard,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import Image from "next/image";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Hook Integration: Connects actual hooks & destructured operations
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const { user, userProfile, signOut, isAuthenticated } = useAuthContext();

  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light") return false;
      if (saved === "dark") return true;
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect system preference on mount so initial render matches user's OS
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const update = (e) => setPrefersDark(e.matches);
      if (mq.addEventListener) mq.addEventListener("change", update);
      else mq.addListener && mq.addListener(update);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", update);
        else mq.removeListener && mq.removeListener(update);
      };
    } catch (e) {
      // ignore
    }
  }, []);

  const scrollProgressValue = Number.isFinite(scrollProgress) ? scrollProgress : 0;

  // Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 100, 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((event) => {
    if (
      dropdownRef.current &&
      event.target &&
      !dropdownRef.current.contains(event.target)
    ) {
      setIsDropdownOpen(false);
      setIsNotificationOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // ESC Key Support
  useEffect(() => {
    const close = () => {
      setIsDropdownOpen(false);
      setIsNotificationOpen(false);
      setIsMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("learnova:escape", close);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("learnova:escape", close);
    };
  }, []);

  // Prevent body scroll
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMenuOpen]);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    setIsNotificationOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
    await signOut();
  };

  // Helpers
  const getUserInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    if (userProfile?.fullName) return userProfile.fullName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  const getUserPhoto = () => user?.photoURL || null;

  const getUserRole = () => {
    if (!userProfile?.role) return "User";
    return userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1);
  };

  const getDashboardLink = () => {
    if (!userProfile?.role) return "/profile";
    switch (userProfile.role) {
      case "student": return "/student/dashboard";
      case "teacher": return "/teacher/dashboard";
      case "institute": return "/institute/dashboard";
      case "admin": return "/admin/dashboard";
      default: return "/profile";
    }
  };

  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/activity", label: "Activities", icon: Activity },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  const userMenuItems = [
    { href: "/profile", icon: User, label: "Profile", key: "profile" },
    { href: getDashboardLink(), icon: Activity, label: "Dashboard", key: "dashboard" },
    { href: "/settings", icon: Settings, label: "Settings", key: "settings" },
  ].filter((item) => !(item.key === "dashboard" && item.href === "/profile"));

  const handleImageError = (e) => {
    const img = e.target;
    const fallback = img.parentElement?.querySelector(".fallback-avatar");
    if (img && fallback) {
      img.style.display = "none";
      fallback.style.display = "flex";
    }
  };

  return (
    <>
      <div
        className="fixed w-full top-0 z-[60] h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none transition-opacity duration-300"
        style={{ opacity: scrollProgressValue > 0 ? 0 : 1 }}
      />

      {/* Main Navbar */}
      <nav
        className={`fixed z-[70] transition-all duration-500 ease-out left-1/2 -translate-x-1/2 flex items-center ${scrollProgressValue > 0
          ? "top-0 w-full max-w-full rounded-none h-16 border-b shadow-sm"
          : "top-6 w-[90%] max-w-6xl rounded-full h-16 border shadow-2xl"
          }`}
        style={{
          backgroundColor: !mounted
            ? "rgba(255, 255, 255, 0.8)"
            : theme === "dark"
              ? scrollProgressValue > 0 ? "rgba(15, 23, 42, 0.85)" : "rgba(15, 23, 42, 0.65)"
              : scrollProgressValue > 0 ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: !mounted
            ? "rgba(0, 0, 0, 0.05)"
            : theme === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
        }}
      >
        <div className="w-full px-5 sm:px-8 relative h-full flex items-center">
          <div className="flex justify-between items-center w-full h-full">
            <Link href="/" className="flex items-center space-x-3 group" onClick={() => setIsMenuOpen(false)}>
              <div className={`bg-gradient-to-br from-accent to-blue-500 rounded-xl flex items-center justify-center transition-all duration-300 ${scrollProgressValue > 0 ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <BookOpen className={`text-white transition-all duration-300 ${scrollProgressValue > 0 ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <div className="flex flex-col justify-center">
                <span className={`font-bold tracking-tight text-gray-950 dark:text-white leading-none transition-all duration-300 ${scrollProgressValue > 0 ? 'text-lg' : 'text-xl'}`}>
                  Learnova
                </span>
                <span className={`text-accent dark:text-blue-400 uppercase tracking-widest font-bold transition-all duration-300 ${scrollProgressValue > 0 ? 'text-[8px] mt-0.5' : 'text-[10px] mt-1'}`}>
                  Premium
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center space-x-1 bg-gray-900/5 dark:bg-white/5 p-1.5 rounded-full border border-gray-200/50 dark:border-white/10 backdrop-blur-md">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-5 py-1.5 rounded-full text-sm transition-all duration-300 ${isActive
                        ? "bg-white dark:bg-gray-800 text-gray-950 dark:text-white font-semibold shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 font-medium"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop Controls */}
            <div className="hidden sm:flex items-center space-x-3">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-gray-200/50 dark:hover:border-white/10"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}

              {isAuthenticated ? (
                <div className="flex items-center space-x-2 pl-3 border-l border-gray-200/50 dark:border-white/10">
                  <Button asChild className="hidden lg:flex relative bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-600 text-white font-medium shadow-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 rounded-full px-5 h-9 group overflow-hidden">
                    <Link href="/attendance">
                      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center text-sm">
                        Attendance
                        <Sparkles className="ml-2 h-3.5 w-3.5 transition-all duration-300 group-hover:scale-110" />
                      </span>
                    </Link>
                  </Button>

                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                      className="relative p-2.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-gray-900/5 dark:hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-gray-200/50 dark:hover:border-white/10"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 bg-red-500 text-[10px] font-bold text-white rounded-full h-4 w-4 flex items-center justify-center animate-pulse border-2 border-white dark:border-gray-900">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl z-[52] overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">
                            Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                No notifications right now
                              </p>
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!n.read ? "bg-accent/5 dark:bg-accent/10" : ""
                                  }`}
                              >
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  {n.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                  {n.time}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 p-1 pr-3 rounded-full border border-gray-200/50 dark:border-white/10 hover:bg-gray-900/5 dark:hover:bg-white/5 transition-all duration-300"
                    >
                      <div className="relative w-8 h-8">
                        {getUserPhoto() ? (
                          <Image
                            src={getUserPhoto()}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent via-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {getUserInitials(getUserDisplayName())}
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-3 min-w-[240px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl py-2 z-[52]">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 mb-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {getUserDisplayName()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {getUserRole()}
                          </p>
                        </div>
                        {userMenuItems.map((item) => (
                          <Link
                            key={item.key}
                            href={item.href}
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <item.icon className="h-4 w-4 mr-3 text-gray-400 dark:text-gray-500" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-5 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ml-2 pl-3 border-l border-gray-200/50 dark:border-white/10">
                  <Button asChild className="relative bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-600 text-white font-medium shadow-lg hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 rounded-full px-6 h-10 group overflow-hidden">
                    <Link href="/auth">
                      <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center text-sm">
                        Login / Signup
                        <Sparkles className="ml-2 h-4 w-4 transition-all duration-300 group-hover:scale-110" />
                      </span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Toggle Controls */}
            <div className="sm:hidden flex items-center gap-2">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full text-gray-600 dark:text-gray-300 bg-gray-900/5 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 transition-colors"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 h-auto rounded-full text-gray-800 dark:text-gray-100 bg-gray-900/5 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 hover:bg-gray-900/10 dark:hover:bg-white/10 transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] md:hidden transition-opacity duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Dropdown Drawer */}
      <div
        className={`fixed z-[68] left-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out md:hidden flex flex-col ${scrollProgressValue > 0 ? "w-full top-16" : "w-[90%] max-w-6xl top-[5.5rem]"
          }`}
      >
        <div
          className="grid transition-all duration-500 ease-in-out"
          style={{
            gridTemplateRows: isMenuOpen ? "1fr" : "0fr",
            opacity: isMenuOpen ? 1 : 0,
          }}
        >
          <div
            className={`overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-gray-200/50 dark:border-white/10 shadow-2xl flex flex-col ${scrollProgressValue > 0 ? "rounded-b-3xl border-b border-x" : "rounded-3xl border mt-2"
              }`}
          >
            <div className="min-h-0 overflow-y-auto max-h-[calc(100vh-8rem)] overscroll-contain flex flex-col">
              {isAuthenticated && (
                <div className="p-5 pb-2">
                  <div className="flex items-center space-x-4 mb-5 p-4 rounded-3xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/50">
                    <div className="w-12 h-12 relative shrink-0">
                      {getUserPhoto() ? (
                        <Image
                          src={getUserPhoto()}
                          alt="Profile"
                          width={48}
                          height={48}
                          className="rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-gray-700"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent via-blue-500 to-purple-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-700 shadow-sm">
                          <span className="text-base font-bold text-white">
                            {getUserInitials(getUserDisplayName())}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                        {getUserDisplayName()}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs truncate mb-1">
                        {user?.email || ""}
                      </p>
                      <div className="inline-flex items-center px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/10 rounded-full border border-yellow-200 dark:border-yellow-500/20">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5" />
                        <span className="text-[9px] text-yellow-700 dark:text-yellow-500 font-bold uppercase tracking-wider">
                          {getUserRole()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <Link
                      href="/attendance"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <UserCheck className="h-5 w-5 text-accent mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Attendance</span>
                    </Link>
                    <Link
                      href="/notices"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <Bell className="h-5 w-5 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Notices</span>
                    </Link>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-3">
                    Navigation
                  </h4>
                  <div className="space-y-1">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl group transition-colors"
                      >
                        <item.icon className="h-5 w-5 mr-4 text-gray-400 dark:text-gray-500 group-hover:text-accent transition-colors" />
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {isAuthenticated && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-3">
                      Account
                    </h4>
                    <div className="space-y-1">
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl group transition-colors"
                        >
                          <item.icon className="h-5 w-5 mr-4 text-gray-400 dark:text-gray-500 group-hover:text-accent transition-colors" />
                          <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 mt-auto border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30">
                {isAuthenticated ? (
                  <Button
                    className="w-full bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-gray-200 dark:border-gray-700 font-semibold shadow-sm transition-all rounded-2xl py-6"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-600 text-white font-semibold shadow-lg transition-all rounded-2xl py-6">
                    <Link href="/auth?mode=signup" onClick={() => setIsMenuOpen(false)}>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Get Started
                    </Link>
                  </Button>
                )}

                <div className="text-center space-y-3 pt-4">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("learnova:open-shortcuts"));
                    }}
                    className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors text-xs font-medium cursor-pointer bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <Keyboard className="h-3.5 w-3.5 text-accent" />
                    <span>Keyboard Shortcuts</span>
                  </button>
                  <p className="text-gray-400 dark:text-gray-600 text-[10px] font-medium">
                    © {new Date().getFullYear()} Learnova. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}