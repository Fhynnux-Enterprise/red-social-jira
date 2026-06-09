"use client";

import React from "react";
import Link from "next/link";

export default function HomePage() {
  const brandPillars = [
    {
      title: "Desarrollo de Software Integral",
      description: "Creamos soluciones tecnológicas a medida, desde aplicaciones web interactivas hasta sistemas robustos, adaptándonos a los retos del desarrollo de software moderno.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      title: "Arquitectura & Tecnología",
      description: "Experimentamos e implementamos tecnologías de vanguardia como Next.js, React Native (Expo) y TypeScript para entregar experiencias de usuario rápidas y estables.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: "Innovación & Experimentación",
      description: "FynnuX Enterprise es una marca personal de desarrollo de software enfocada en la innovación constante, el refinamiento técnico y la creación de tecnología útil.",
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* ── HERO SECTION: FYNNUX ENTERPRISE ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-zinc-50 dark:from-emerald-950/15 dark:via-zinc-950 dark:to-zinc-950 py-28 md:py-36 border-b border-zinc-100 dark:border-zinc-900 transition-colors">
        
        {/* Background Decorative Glows */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-teal-400/15 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10 space-y-8">
          
          <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
            Proyecto & Marca Personal de Desarrollo
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-none text-zinc-900 dark:text-white">
            FynnuX <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">Enterprise</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl mx-auto">
            Un espacio independiente dedicado al desarrollo de software general, la innovación tecnológica y la creación de soluciones digitales robustas para todo tipo de proyectos.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              href="/chunchi-city-app"
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] duration-200"
            >
              Chunchi City App
            </Link>
            <Link
              href="/contacto"
              className="border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold px-8 py-4 rounded-2xl transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              Ponerse en Contacto
            </Link>
          </div>

          {/* Core Technologies Badges */}
          <div className="pt-16 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 block mb-4">
              Stack Tecnológico de Experimentación
            </span>
            <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">Next.js (React)</span>
              <span className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">React Native / Expo</span>
              <span className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">TypeScript</span>
              <span className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">Supabase & Postgres</span>
              <span className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">Tailwind CSS</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── PILARS SECTION ── */}
      <section className="py-24 bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              Nuestros Pilares
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white">
              ¿Qué impulsa este proyecto?
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base">
              FynnuX Enterprise no es una corporación, es un compromiso personal con el código limpio, el aprendizaje constante y el desarrollo de software y tecnología de calidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {brandPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-900 p-8 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 group flex flex-col items-center text-center"
              >
                <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl shadow-sm inline-flex group-hover:bg-emerald-500/10 group-hover:scale-110 transition-all duration-300 mb-6 flex items-center justify-center">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <section className="py-20 bg-zinc-900 text-white relative overflow-hidden transition-colors">
        
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            ¿Quieres colaborar o conocer más sobre FynnuX?
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Si eres desarrollador, tienes ideas de proyectos o simplemente deseas charlar sobre tecnología, no dudes en escribirnos.
          </p>
          <div className="pt-4">
            <Link
              href="/contacto"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition duration-200 inline-block"
            >
              Enviar un Mensaje
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
