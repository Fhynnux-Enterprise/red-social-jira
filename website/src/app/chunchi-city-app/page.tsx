"use client";

import React from "react";
import Link from "next/link";

export default function ChunchiCityAppLandingPage() {
  const appFeatures = [
    {
      title: "Muro Comunitario (Feed)",
      description: "Comparte publicaciones, fotos y audios con todos los habitantes del cantón. Infórmate de eventos locales en tiempo real.",
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      title: "Tienda y Comercio Local",
      description: "Publica tus productos, servicios o emprendimientos locales. Chatea directamente con los compradores de tu zona.",
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      title: "Bolsa de Empleo",
      description: "Encuentra oportunidades de trabajo publicadas por comercios locales, o publica ofertas de empleo para tu negocio.",
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Seguridad y Moderación",
      description: "Sistema robusto de reportes y baneo de cuentas infractoras para garantizar un entorno familiar y de confianza vecinal.",
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* ── HERO & APP PRESENTATION ── */}
      <section className="relative overflow-hidden py-20 px-6 border-b border-zinc-200/50 dark:border-zinc-900 bg-white dark:bg-zinc-950 transition-colors duration-300">
        
        {/* Background blobs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          
          {/* Text Presentation Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              📱 Aplicación de Red Social Local
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-zinc-900 dark:text-white">
              Chunchi <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">City App</span>
            </h1>
            
            <p className="text-lg text-zinc-650 dark:text-zinc-400 leading-relaxed max-w-xl">
              La plataforma móvil oficial diseñada para conectar a la gente del cantón Chunchi. Comparte publicaciones, postula a empleos locales y apoya el comercio de tus vecinos en un entorno seguro y de confianza.
            </p>

            {/* Badges and Call to Action */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              
              {/* Play Store Badge */}
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-5 py-3.5 transition hover:scale-[1.02] shadow-lg w-52 text-white"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 3.25a.75.75 0 00-.75.75v16c0 .414.336.75.75.75h.582l9.914-8.75-9.914-8.75H5z M16.037 12l-9.787 8.636 9.878-4.939c.642-.321.642-1.073 0-1.394L16.037 12z" />
                </svg>
                <div className="text-left leading-none">
                  <span className="text-[9px] text-zinc-400 font-medium block uppercase">Disponible en</span>
                  <span className="text-xs font-bold">Google Play</span>
                </div>
              </a>

              {/* App Store Badge */}
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-5 py-3.5 transition hover:scale-[1.02] shadow-lg w-52 text-white"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45" />
                </svg>
                <div className="text-left leading-none">
                  <span className="text-[9px] text-zinc-400 font-medium block uppercase">Descargar en el</span>
                  <span className="text-xs font-bold">App Store</span>
                </div>
              </a>

            </div>

          </div>

          {/* Interactive Smartphone Mockup */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full filter blur-xl scale-75 animate-pulse" />
            
            {/* Phone Container */}
            <div className="relative border-4 border-zinc-800 dark:border-zinc-700 rounded-[2.5rem] bg-zinc-950 p-3 shadow-2xl w-72 md:w-80 aspect-[9/18] overflow-hidden group hover:scale-105 transition-transform duration-500">
              
              {/* Camera Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-full z-20 flex items-center justify-center">
                <div className="w-3 h-3 bg-zinc-900 rounded-full mr-2" />
                <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
              </div>

              {/* Screen Content */}
              <div className="h-full w-full bg-zinc-900 rounded-[2rem] overflow-hidden relative flex flex-col p-4 pt-10 text-white font-sans select-none">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
                  <div className="flex items-center gap-1.5">
                    <img
                      src="https://suobziwlikwzfevmappo.supabase.co/storage/v1/object/public/public-assets/fynnux-corte-512x512.png"
                      alt="Logo"
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-xs font-bold tracking-tight">Chunchi City</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">🔔</div>
                </div>

                {/* Simulated Feed */}
                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                  <div className="bg-zinc-800/40 border border-zinc-800 p-2.5 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-[9px]">FC</div>
                      <div>
                        <span className="text-[9px] font-bold block leading-none">Familia Chuncheña</span>
                        <span className="text-[7px] text-zinc-500">Hace 5 min</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-zinc-300">
                      ¡Vecinos! Los invitamos a la feria gastronómica este sábado en el parque central de Chunchi. ¡Habrá ricas empanadas! 🍲
                    </p>
                    <div className="flex gap-2 text-[7px] text-zinc-400">
                      <span>❤️ 15 likes</span>
                      <span>💬 4 comentarios</span>
                    </div>
                  </div>

                  <div className="bg-zinc-800/40 border border-emerald-500/20 p-2.5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">EMPLEO</span>
                    </div>
                    <p className="text-[9px] font-bold leading-none">Ayudante de Cocina</p>
                    <p className="text-[7px] text-zinc-400">Localidad: Chunchi Centro | Medio Tiempo</p>
                    <div className="w-full bg-emerald-600 text-center py-1 text-[8px] font-bold rounded-lg">
                      Ver Oferta
                    </div>
                  </div>
                </div>

                {/* Simulated Bottom Nav */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between px-2 text-zinc-500 text-[10px]">
                  <span className="text-emerald-400">🏠</span>
                  <span>💼</span>
                  <span>🛍️</span>
                  <span>💬</span>
                  <span>👤</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── CORE FEATURES OF THE APP ── */}
      <section className="py-20 bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              Funcionalidades Clave
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              ¿Qué puedes hacer en la aplicación?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {appFeatures.map((feat, idx) => (
              <div 
                key={idx}
                className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-900 p-6 rounded-2xl shadow-sm flex flex-col items-center text-center"
              >
                <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm text-emerald-500 mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-zinc-655 dark:text-zinc-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ELEGANT LEGAL DOCUMENTATION SELECTION SECTION ── */}
      <section className="py-20 bg-zinc-100 dark:bg-zinc-900/35 border-t border-zinc-200/60 dark:border-zinc-900 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              Legal e Información
            </span>
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              Documentación Legal de la App
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Consulta las normativas legales, términos de convivencia comunitaria y cómo gestionamos tus datos personales dentro de Chunchi City App.
            </p>
          </div>

          {/* Cards for Subsections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            
            {/* Terms Card */}
            <Link 
              href="/chunchi-city-app/terminos-condiciones"
              className="group border border-zinc-200/70 dark:border-zinc-800/80 hover:border-emerald-500/40 bg-white dark:bg-zinc-900 p-8 rounded-3xl text-left shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between aspect-[1.5/1]"
            >
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl inline-block group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1.5 1.5 0 011.06.44l4.914 4.914a1.5 1.5 0 01.44 1.06V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-lg text-zinc-950 dark:text-white leading-tight">
                    Términos y Condiciones
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                    Reglas de conducta, normas de la tienda, baneo de cuentas y uso de la bolsa de empleo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-6 group-hover:translate-x-1.5 transition-transform">
                <span>Leer Términos</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Privacy Card */}
            <Link 
              href="/chunchi-city-app/politica-privacidad"
              className="group border border-zinc-200/70 dark:border-zinc-800/80 hover:border-emerald-500/40 bg-white dark:bg-zinc-900 p-8 rounded-3xl text-left shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between aspect-[1.5/1]"
            >
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl inline-block group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-lg text-zinc-950 dark:text-white leading-tight">
                    Política de Privacidad
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                    Detalles sobre el tratamiento de tus datos personales, Google OAuth y derechos de eliminación.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-6 group-hover:translate-x-1.5 transition-transform">
                <span>Leer Políticas</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

          </div>

        </div>
      </section>

    </div>
  );
}
