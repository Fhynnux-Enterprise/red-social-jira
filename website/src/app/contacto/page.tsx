"use client";

import React, { useState } from "react";

const FAQS = [
  {
    question: "¿Cómo recupero mi contraseña en la aplicación?",
    answer: "En la pantalla de inicio de sesión de la aplicación móvil, presiona '¿Olvidaste tu contraseña?'. Ingresa tu correo electrónico registrado y te enviaremos un código de seguridad de 8 dígitos para validar tu identidad. Luego, podrás establecer una nueva contraseña de forma segura.",
  },
  {
    question: "¿Qué debo hacer si mi cuenta fue inhabilitada o suspendida?",
    answer: "Si al intentar ingresar a la app visualizas una pantalla de suspensión de cuenta, significa que infringiste alguna norma de convivencia, muro local o tienda. Si consideras que se trató de un error, puedes escribirnos mediante este formulario seleccionando el asunto 'Reporte de Usuario / Baneo' indicando tu correo de registro para auditar tu caso.",
  },
  {
    question: "¿Tiene algún costo publicar ofertas de empleo o productos?",
    answer: "No, publicar vacantes en la Bolsa de Empleo y ofrecer artículos en la Tienda Local es completamente gratuito para toda la comunidad de Chunchi. FynnuX Enterprise no cobra comisiones por transacciones ni publicaciones.",
  },
  {
    question: "¿Cómo se gestionan las compras y ventas en la tienda?",
    answer: "La aplicación funciona como un escaparate digital comunitario. El acuerdo final de pago (efectivo, transferencia, etc.) y la entrega física del producto se coordinan directamente entre el comprador y el vendedor mediante el chat de la app o enlaces externos.",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    asunto: "soporte",
    mensaje: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.correo || !formData.mensaje) return;
    
    // Simulate API request
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 selection:bg-emerald-500 selection:text-white py-16 px-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* LEFT COLUMN: TEXT, CONTACT CHANNELS & FAQ */}
        <div className="lg:col-span-7 space-y-12">
          
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
              Soporte y Atención
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
              Ponte en contacto con nosotros
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg max-w-xl leading-relaxed">
              ¿Tienes sugerencias, necesitas ayuda técnica o quieres reportar un problema? Completa el formulario de la derecha o revisa nuestras preguntas frecuentes.
            </p>
          </div>

          {/* Contact Direct Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border border-zinc-200/60 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl">
              <div className="p-3 bg-emerald-500/10 rounded-xl inline-block mb-4 text-emerald-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">Correo Directo</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Escríbenos directamente a:</p>
              <a href="mailto:soporte@fynnux.app" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline block mt-2">
                soporte@fynnux.app
              </a>
            </div>

            <div className="border border-zinc-200/60 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 p-6 rounded-2xl">
              <div className="p-3 bg-emerald-500/10 rounded-xl inline-block mb-4 text-emerald-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-zinc-950 dark:text-white text-base">Área Legal</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Para dudas de privacidad y T&C:</p>
              <a href="mailto:legal@fynnux.com" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline block mt-2">
                legal@fynnux.com
              </a>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Preguntas Frecuentes (FAQ)
            </h2>
            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div 
                    key={index}
                    className="border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/20 rounded-xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition"
                    >
                      <span>{faq.question}</span>
                      <svg 
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-900">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE CONTACT FORM */}
        <div className="lg:col-span-5 self-start">
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            
            {submitted ? (
              <div className="text-center py-12 space-y-6 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto scale-110">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">¡Mensaje Enviado!</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Muchas gracias por escribirnos, <strong>{formData.nombre}</strong>. Hemos recibido tu solicitud correctamente. Nuestro equipo técnico la procesará y te responderemos al correo <strong>{formData.correo}</strong> a la brevedad.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ nombre: "", correo: "", asunto: "soporte", mensaje: "" });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Formulario de Soporte
                </h3>
                
                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="correo" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="correo"
                    required
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="asunto" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Asunto de la Consulta
                  </label>
                  <select
                    id="asunto"
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                  >
                    <option value="soporte">Soporte Técnico de la App</option>
                    <option value="baneo">Reporte de Usuario / Baneo</option>
                    <option value="tienda">Duda sobre la Tienda Local</option>
                    <option value="legal">Consultas Legales / Privacidad</option>
                    <option value="otro">Otro Asunto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="mensaje" className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Detalles del Mensaje
                  </label>
                  <textarea
                    id="mensaje"
                    required
                    rows={4}
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    placeholder="Describe detalladamente cómo podemos ayudarte..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-95 duration-200"
                >
                  Enviar Formulario
                </button>

              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
