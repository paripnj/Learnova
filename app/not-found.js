"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home } from "lucide-react";
import DarkVeil from "@/components/ui-block/DarkVeil";

const PARTICLES_DATA = [
  { id: 1, left: 16, top: 22, delay: 0, duration: 10 },
  { id: 2, left: 64, top: 78, delay: 1.5, duration: 12 },
  { id: 3, left: 82, top: 18, delay: 3, duration: 14 },
  { id: 4, left: 34, top: 66, delay: 4.5, duration: 11 },
  { id: 5, left: 90, top: 48, delay: 6, duration: 13 },
];

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMousePosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    let mouseTimeout;
    const throttledMouseMove = (event) => {
      if (!mouseTimeout) {
        mouseTimeout = setTimeout(() => {
          handleMouseMove(event);
          mouseTimeout = null;
        }, 32);
      }
    };

    window.addEventListener("mousemove", throttledMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", throttledMouseMove);
      if (mouseTimeout) clearTimeout(mouseTimeout);
    };
  }, [handleMouseMove]);

  const mouseOrbStyle = useMemo(
    () => ({
      left: mousePosition.x - 192,
      top: mousePosition.y - 192,
      transition: "all 1.2s ease-out",
    }),
    [mousePosition.x, mousePosition.y]
  );

  return (
    <>
      <Navbar />
      <div className="fixed inset-0 -z-10 bg-slate-950">
        <DarkVeil />
        <div
          className="absolute h-96 w-96 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl pointer-events-none"
          style={mouseOrbStyle}
        />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES_DATA.map((particle) => (
            <div
              key={particle.id}
              className="absolute h-1.5 w-1.5 rounded-full bg-indigo-500/30 animate-float"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
        </div>
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-24 text-center">
        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl shadow-purple-500/5 space-y-8 transition-all duration-500 hover:border-purple-500/20">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-purple-400">
                404 - Page Not Found
              </span>
            </h1>
            <p className="text-slate-400 font-medium text-base sm:text-lg md:text-xl max-w-md mx-auto leading-relaxed">
              The page you're looking for doesn't exist or may have moved. Check the URL or head back to the homepage.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-600/25 transition-all duration-300 hover:scale-105 hover:shadow-indigo-600/40 hover:brightness-110 active:scale-95"
            >
              <Home className="h-5 w-5" />
              Go back home
            </Link>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(90deg); opacity: 0.8; }
        }
        .animate-float { animation: float ease-in-out infinite; }
      `}</style>
    </>
  );
}
