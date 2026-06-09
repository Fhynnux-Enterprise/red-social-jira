"use client";

import React from "react";
import Link from "next/link";

export default function ChunchiCityTermsPage() {
  return (
    <div className="space-y-16 animate-fade-in">
      
      {/* Section 1 */}
      <section id="intro" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1.5 1.5 0 011.06.44l4.914 4.914a1.5 1.5 0 01.44 1.06V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            1. Introducción y Aceptación
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma digital y la aplicación móvil oficial de tu localidad (como <strong>Chunchi City App</strong>), desarrollada y operada por <strong>FynnuX Enterprise</strong>.
          </p>
          <p>
            Al descargar, registrarte, instalar o utilizar de cualquier forma la aplicación, aceptas plenamente y te comprometes a cumplir con estos términos. Si no estás de acuerdo con alguno de los términos expuestos, deberás abstenerte de utilizar la plataforma y eliminarla de tu dispositivo.
          </p>
        </div>
      </section>

      {/* Section 2 */}
      <section id="accounts" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            2. Registro y Seguridad de la Cuenta
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Para acceder a la mayoría de funciones de la red social local (publicar contenido, comprar/vender en la tienda, postular a empleos o chatear), el usuario debe registrarse proporcionando datos verídicos como nombre, apellido, correo electrónico y contraseña.
          </p>
          
          <h3 className="font-bold text-zinc-950 dark:text-white mt-4 text-lg">Edad Mínima Requerida</h3>
          <p>
            Para registrarte y utilizar esta aplicación, debes tener al menos <strong>13 años</strong> de edad. Al crear una cuenta, declaras y garantizas que cumples con esta edad mínima. El uso de la aplicación por cualquier persona menor de 13 años no está autorizado y constituye una violación de estos términos.
          </p>

          <h3 className="font-bold text-zinc-950 dark:text-white mt-4 text-lg">Inicios de sesión mediante Google (OAuth)</h3>
          <p>
            La plataforma ofrece autenticación a través de Google. Al utilizar este método, autorizas la vinculación de tu perfil y aceptas que tus datos básicos (como tu foto de perfil, correo y nombre) sean importados para facilitar el inicio de sesión. Eres el único responsable de mantener la seguridad y confidencialidad de tu dispositivo y tus cuentas de acceso.
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section id="feed" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            3. Publicaciones y Contenido
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Nuestra plataforma fomenta la interacción comunitaria. Los usuarios pueden compartir textos, imágenes, audios y opiniones en el muro (Feed).
          </p>
          <h3 className="font-bold text-zinc-950 dark:text-white mt-4 text-lg">Reglas de Propiedad e Infracciones</h3>
          <p>
            Mantienes la propiedad intelectual de los contenidos que publiques. Sin embargo, al publicarlos, otorgas a la aplicación una licencia global, no exclusiva e irrevocable para mostrar y distribuir dicho contenido localmente en la plataforma.
          </p>
          <p>
            Queda estrictamente prohibido publicar contenido de carácter violento, pornográfico, difamatorio, discursos de odio, spam publicitario no autorizado o cualquier elemento que infrinja los derechos de autor de terceros.
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section id="jobs" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            4. Bolsa de Empleo (Ofertas y Servicios)
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            La sección de Empleos sirve de puente digital entre los reclutadores y los profesionales de la localidad:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Ofertas de Trabajo (Empresas/Negocios):</strong> Quienes publiquen vacantes deben detallar salarios, horarios y tareas reales. Quedan prohibidas las estafas laborales o captación ilegal de datos.
            </li>
            <li>
              <strong>Servicios Profesionales:</strong> Los usuarios independientes pueden ofrecer sus habilidades locales (carpintería, clases, plomería, etc.). Es responsabilidad del prestador contar con las licencias correspondientes.
            </li>
          </ul>
          <p className="mt-2 text-zinc-500 dark:text-zinc-555 text-sm italic">
            FynnuX Enterprise no interviene en las entrevistas, selecciones ni contratos resultantes, y no es responsable de la veracidad de las postulaciones.
          </p>
        </div>
      </section>

      {/* Section 5 */}
      <section id="store" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            5. Tienda y Comercio Local
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            La aplicación integra una tienda local que permite a los usuarios publicar productos físicos o servicios comerciales para su comercialización local:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Está prohibida la venta de sustancias ilícitas, armas, medicamentos bajo prescripción médica, piratería o cualquier artículo cuya venta local esté penalizada.
            </li>
            <li>
              Los acuerdos de pago, entregas y garantías se gestionan de forma privada entre el comprador y el vendedor (generalmente mediante el chat o enlaces de contacto externos).
            </li>
          </ul>
          <p className="mt-2 text-zinc-500 dark:text-zinc-555 text-sm italic">
            La plataforma no actúa como pasarela de pago ni asume responsabilidad por estafas, artículos defectuosos o transacciones fallidas.
          </p>
        </div>
      </section>

      {/* Section 6 */}
      <section id="moderation" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            6. Moderación y Sanciones (Sistema de Baneos)
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Para salvaguardar la armonía comunitaria, la aplicación cuenta con administradores y un botón de reporte para que los propios usuarios denuncien conductas indebidas y contenido objetable.
          </p>
          <p>
            <strong>Baneos y Suspensión de Cuentas:</strong> El equipo de administración se reserva el derecho de auditar reportes y, ante infracciones graves o reincidentes, suspender la cuenta del usuario de forma temporal o permanente.
          </p>
          <p>
            El equipo de administración se compromete a revisar los reportes y eliminar el contenido objetable o bloquear al usuario infractor en un plazo no mayor a 24 horas desde la recepción del reporte.
          </p>
          <p>
            Un usuario con la cuenta suspendida (Baneado) no podrá iniciar sesión y visualizará una pantalla de penalización detallando los motivos y el tiempo de duración de la sanción.
          </p>
        </div>
      </section>

      {/* Section 7 */}
      <section id="privacy-link" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            7. Privacidad de Datos
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Toda la información personal recopilada se maneja de acuerdo con la legislación local e internacional de protección de datos.
          </p>
          <p>
            Para obtener un detalle pormenorizado sobre cómo almacenamos, procesamos y eliminamos tus datos, por favor consulta la sección de{" "}
            <Link 
              href="/chunchi-city-app/politica-privacidad"
              className="text-emerald-600 dark:text-emerald-455 hover:underline font-bold"
            >
              Política de Privacidad
            </Link>.
          </p>
        </div>
      </section>

      {/* Section 8 */}
      <section id="liability" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            8. Límites de Responsabilidad y Modificaciones
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            <strong>FynnuX Enterprise</strong> provee el servicio "tal cual" y no asume garantías explícitas o implícitas sobre la disponibilidad del servidor local, la ausencia de interrupciones o la conducta de otros usuarios.
          </p>
          <p>
            Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigencia inmediatamente después de su publicación en este portal. El uso continuado de la aplicación tras dichos cambios constituye tu aceptación.
          </p>
          <p>
            <strong>Ley Aplicable y Jurisdicción:</strong> Estos Términos y Condiciones se rigen e interpretan bajo las leyes de la República del Ecuador. Cualquier disputa o reclamo relacionado con el uso de la aplicación móvil se someterá a la jurisdicción exclusiva de los tribunales de justicia ecuatorianos correspondientes.
          </p>
        </div>
      </section>

      {/* Section 9 */}
      <section id="contact-legal" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-zinc-500/10 text-zinc-650 dark:text-zinc-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            9. Contacto
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Para cualquier duda, aclaración legal, soporte técnico o consulta relacionada con estos Términos y Condiciones, los usuarios pueden ponerse en contacto con nuestro equipo de atención escribiendo al correo electrónico: <a href="mailto:soporte@fynnux.app" className="text-emerald-600 dark:text-emerald-450 hover:underline font-bold">soporte@fynnux.app</a>.
          </p>
        </div>
      </section>

    </div>
  );
}
