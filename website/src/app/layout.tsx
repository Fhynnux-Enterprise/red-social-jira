import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FynnuX Enterprise",
  description: "Proyecto personal de desarrollo de software y tecnología. Creamos soluciones digitales modernas, aplicaciones a medida y plataformas innovadoras.",
  icons: {
    icon: "https://suobziwlikwzfevmappo.supabase.co/storage/v1/object/public/public-assets/fynnux-corte-512x512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        
        {/* FOOTER */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-12 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 flex flex-col gap-4">
               <div className="flex items-center gap-3">
                <img
                  src="https://suobziwlikwzfevmappo.supabase.co/storage/v1/object/public/public-assets/fynnux-corte-512x512.png"
                  alt="FynnuX Logo"
                  className="w-8 h-8 object-contain dark:brightness-95"
                />
                <span className="font-bold text-lg text-zinc-900 dark:text-white">
                  FynnuX Enterprise
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                Desarrollo de software independiente y soluciones tecnológicas. Creamos aplicaciones modernas, sistemas a medida y proyectos digitales innovadores.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                Desarrollado con dedicación desde Ecuador
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                Enlaces rápidos
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <a href="/" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                    Inicio
                  </a>
                </li>
                <li>
                  <a href="/chunchi-city-app" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a href="/contacto" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                    Contacto y Soporte
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                Contacto
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <a href="mailto:soporte@fynnux.app" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                    soporte@fynnux.app
                  </a>
                </li>
                <li className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
                  © {new Date().getFullYear()} FynnuX Enterprise. Todos los derechos reservados.
                </li>
                <li className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Chunchi, Chimborazo, Ecuador
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
