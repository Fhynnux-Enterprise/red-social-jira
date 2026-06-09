"use client";

import React from "react";
import Link from "next/link";

export default function ChunchiCityPrivacyPage() {
  return (
    <div className="space-y-16 animate-fade-in">
      
      {/* Section 1 */}
      <section id="collect" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            1. Información que Recopilamos
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Para proporcionar las funciones comunitarias de la app, recopilamos la siguiente información técnica y personal:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Datos de Cuenta:</strong> Nombre completo, correo electrónico, foto de perfil, contraseña encriptada (con hash) y <strong>fecha de nacimiento</strong> (utilizada exclusivamente para verificar que cumples con la edad mínima de 13 años requerida para el uso seguro de la plataforma).
            </li>
            <li>
              <strong>Datos de Google OAuth:</strong> Nombre, correo y URL de avatar provistos por Google si eliges iniciar sesión con esta plataforma.
            </li>
            <li>
              <strong>Contenido del Usuario:</strong> Publicaciones del feed (incluyendo texto, audios e imágenes subidas), ofertas de empleo, postulaciones y productos cargados en la tienda.
            </li>
            <li>
              <strong>Tokens de Notificación:</strong> Guardamos de forma segura un token identificador único de tu dispositivo para enviar notificaciones push.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section id="use" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            2. Cómo Usamos la Información
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Utilizamos tu información personal exclusivamente para el correcto funcionamiento de los servicios contratados y ofrecidos en la app:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Mostrar tu perfil (nombre y avatar) al lado de las publicaciones que realices en el feed, la tienda o empleos.</li>
            <li>Facilitar la mensajería interna entre compradores, vendedores y postulantes de trabajo.</li>
            <li>Enviar notificaciones push automáticas cuando recibes interacciones (likes, comentarios, novedades de baneo).</li>
            <li>Garantizar la seguridad e identificar reportes malintencionados o cuentas infractoras.</li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section id="storage" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            3. Almacenamiento y Seguridad
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Toda la información personal del usuario se almacena en bases de datos gestionadas de manera segura mediante proveedores líderes (como <strong>Supabase</strong>, alojada en servidores seguros de AWS).
          </p>
          <p>
            Implementamos protocolos de encriptación de datos en tránsito y en reposo (SSL/TLS). Sin embargo, ningún sistema de transmisión en Internet es 100% seguro. Te recomendamos crear contraseñas robustas y no compartirlas.
          </p>
        </div>
      </section>

      {/* Section 4 */}
      <section id="sharing" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 10.742l5.053 2.526m0 0l5.053-2.526m-5.053 2.526V20m0-16V4m0 0a2 2 0 10-4 0v1.5a2 2 0 104 0V4z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            4. Divulgación de Datos
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            <strong>FynnuX Enterprise no vende, alquila ni comercializa tus datos personales con terceros para fines publicitarios.</strong>
          </p>
          <p>
            Tus datos solo podrán ser revelados en los siguientes escenarios:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A solicitud expresa de autoridades judiciales competentes en cumplimiento de un requerimiento legal o de investigación.</li>
            <li>Para proteger la integridad de los usuarios, prevenir fraudes, o evitar abusos contra los términos de uso del servicio.</li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section id="rights" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h10M4 7h16" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            5. Tus Derechos y Eliminación de Cuentas
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Tienes derecho a acceder, rectificar o eliminar los datos que has cargado en la aplicación:
          </p>
          <p>
            <strong>Eliminación Permanente de la Cuenta:</strong> En cualquier momento puedes solicitar la baja y el borrado absoluto de tu cuenta y todos tus datos asociados (incluyendo fotos de perfil, mensajes privados y posts en el feed).
          </p>
          <p>
            Dispones de dos métodos para realizar esta acción:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Eliminación Autónoma:</strong> Puedes eliminar tu cuenta de forma autónoma, inmediata y definitiva directamente desde el menú de <strong>Configuración / Ajustes</strong> dentro de la aplicación móvil (accesible a través del botón de tres puntos ubicado en la cabecera principal).
            </li>
            <li>
              <strong>Solicitud por Correo:</strong> Si deseas solicitarlo manualmente, puedes enviarnos un correo indicando tu nombre de usuario y correo registrado a{" "}
              <a href="mailto:soporte@fynnux.app" className="text-emerald-600 dark:text-emerald-455 hover:underline font-bold">
                soporte@fynnux.app
              </a>, o bien llenar el formulario en nuestra página de{" "}
              <Link href="/contacto" className="text-emerald-600 dark:text-emerald-455 hover:underline font-bold">
                Contacto
              </Link>.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 6 */}
      <section id="updates" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            6. Cambios en esta Política de Privacidad
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            Es posible que actualicemos esta política para adaptarla a nuevas tecnologías o marcos legales locales. Te informaremos de cambios importantes notificándolo mediante la misma aplicación o publicando las actualizaciones en este portal con la correspondiente fecha de revisión.
          </p>
        </div>
      </section>

      {/* Section 7 */}
      <section id="lopdp" className="scroll-mt-36">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-450 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            7. Ley de Protección de Datos Personales (LOPDP)
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none text-zinc-650 dark:text-zinc-400 space-y-4 text-base leading-relaxed">
          <p>
            El tratamiento, almacenamiento y protección de tus datos personales dentro de <strong>Chunchi City App</strong> se rigen en estricto cumplimiento con la <strong>Ley Orgánica de Protección de Datos Personales (LOPDP)</strong> de la República del Ecuador. Garantizamos el ejercicio pleno de tus derechos de acceso, rectificación, eliminación y oposición sobre tu información en todo momento.
          </p>
        </div>
      </section>

    </div>
  );
}
