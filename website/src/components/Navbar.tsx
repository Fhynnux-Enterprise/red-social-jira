"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Inicio" },
    { href: "/chunchi-city-app", label: "Chunchi City App" },
    { href: "/contacto", label: "Contacto" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/chunchi-city-app")) return pathname.startsWith("/chunchi-city-app");
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Image
              src="https://suobziwlikwzfevmappo.supabase.co/storage/v1/object/public/public-assets/fynnux-corte-512x512.png"
              alt="FynnuX Logo"
              width={32}
              height={32}
              className="object-contain dark:brightness-95"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              FynnuX
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide uppercase">
              Enterprise
            </span>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* DOWNLOAD / SUPPORT BUTTON */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="/contacto"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
          >
            Soporte
          </a>
          <Link
            href="/#descargar"
            className="relative overflow-hidden group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-300 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95"
          >
            <span className="relative z-10">Descargar App</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        {/* MOBILE MENU TRIGGER */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          aria-label="Alternar menú"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE NAV DROPDOWN */}
      {isOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 space-y-2 animate-fade-in shadow-xl">
          {navLinks.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-xl transition ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-3">
            <Link
              href="/#descargar"
              onClick={() => setIsOpen(false)}
              className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
            >
              Descargar App
            </Link>
            <Link
              href="/contacto"
              onClick={() => setIsOpen(false)}
              className="w-full text-center border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
            >
              Contacto de Soporte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
