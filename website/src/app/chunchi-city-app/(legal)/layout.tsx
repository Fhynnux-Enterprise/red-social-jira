"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TERMS_SECTIONS = [
  { id: "intro", title: "1. Introducción y Aceptación" },
  { id: "accounts", title: "2. Registro y Seguridad" },
  { id: "feed", title: "3. Publicaciones y Contenido" },
  { id: "jobs", title: "4. Bolsa de Empleo" },
  { id: "store", title: "5. Tienda y Comercio Local" },
  { id: "moderation", title: "6. Moderación y Sanciones" },
  { id: "privacy-link", title: "7. Privacidad de Datos" },
  { id: "liability", title: "8. Límites de Responsabilidad" },
  { id: "contact-legal", title: "9. Contacto" },
];

const PRIVACY_SECTIONS = [
  { id: "collect", title: "1. Información que Recopilamos" },
  { id: "use", title: "2. Cómo Usamos la Información" },
  { id: "storage", title: "3. Almacenamiento y Seguridad" },
  { id: "sharing", title: "4. Divulgación de Datos" },
  { id: "rights", title: "5. Tus Derechos y Eliminación" },
  { id: "updates", title: "6. Cambios en esta Política" },
  { id: "lopdp", title: "7. Ley de Protección de Datos (Ecuador)" },
];

export default function ChunchiCityLegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine active document from path
  const isPrivacy = pathname.includes("politica-privacidad");
  const activeTab = isPrivacy ? "privacy" : "terms";
  const sectionsList = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  useEffect(() => {
    setActiveSection(isPrivacy ? "collect" : "intro");
  }, [isPrivacy]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 220;

      for (const section of sectionsList) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionsList]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(id);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      
      {/* Back Button to Chunchi City App Landing */}
      <div className="bg-zinc-100 dark:bg-zinc-900/60 border-b border-zinc-200/50 dark:border-zinc-800/40 py-3 px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            href="/chunchi-city-app"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la presentación de la App
          </Link>
        </div>
      </div>

      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden bg-zinc-900 dark:bg-zinc-950 text-white py-16 px-6 border-b border-zinc-800 transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-400/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
            Chunchi City App
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Centro de Documentación Legal
          </h1>
          <p className="mt-2 text-zinc-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Revisa los términos regulatorios y nuestras políticas de protección de datos para garantizar una convivencia segura.
          </p>
        </div>
      </section>

      {/* ── STICKY TAB NAVIGATION BAR ── */}
      <div className="sticky top-16 z-40 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Real Route Link Pills */}
          <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex relative w-full sm:max-w-md shadow-inner border border-zinc-200/50 dark:border-zinc-800/30">
            <Link
              href="/chunchi-city-app/terminos-condiciones"
              className={`flex-1 text-center py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${
                activeTab === "terms"
                  ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-850 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/chunchi-city-app/politica-privacidad"
              className={`flex-1 text-center py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${
                activeTab === "privacy"
                  ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-850 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              Política de Privacidad
            </Link>
          </div>

          {/* Mobile Index Trigger Button */}
          <div className="md:hidden w-full sm:w-auto flex justify-end">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-850 transition"
            >
              <span>Ver Secciones</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
        </div>
      </div>

      {/* Mobile Index Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <aside 
            className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-zinc-900 p-6 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Índice de Secciones
              </h3>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sectionsList.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`text-left text-sm py-2.5 px-3 rounded-xl transition font-medium ${
                  activeSection === sec.id
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                }`}
              >
                {sec.title}
              </button>
            ))}
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT & SIDEBAR ── */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-12">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 sticky top-36 self-start">
          <div className="border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 bg-white dark:bg-zinc-900/40 shadow-sm backdrop-blur-sm">
            <h3 className="font-bold text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
              Índice de Secciones
            </h3>
            <div className="flex flex-col gap-2">
              {sectionsList.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`text-left text-sm py-2.5 px-3 rounded-xl transition-all font-medium border-l-2 ${
                    activeSection === sec.id
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Child Pages Content Container */}
        <main className="lg:col-span-3">
          {children}
        </main>
      </div>

    </div>
  );
}
