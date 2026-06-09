/**
 * session.manager.ts
 *
 * Módulo singleton para gestionar la expiración de sesión.
 * Desacopla el errorLink de Apollo del ciclo de vida de React,
 * evitando la condición de carrera donde el 401 se dispara
 * antes de que el AuthProvider haya montado su handler.
 *
 * Caso borde cubierto: si `notifySessionExpired` se llama antes de que
 * `registerSessionExpiredHandler` sea invocado, el evento queda en cola
 * (`isExpiredPending = true`) y se despacha en cuanto el handler se registra.
 */

export type SessionExpiredReason = 'expired' | 'password_changed';

type SessionExpiredCallback = (reason: SessionExpiredReason) => void;

let _onSessionExpired: SessionExpiredCallback | null = null;

/** Motivo del evento pendiente si expiró antes de que hubiera handler. */
let _pendingReason: SessionExpiredReason | null = null;

/**
 * Registra el callback que se llamará cuando la sesión expire.
 * Debe ser llamado desde el AuthProvider al montar.
 * Si ya había una expiración pendiente, la ejecuta de inmediato.
 */
export function registerSessionExpiredHandler(callback: SessionExpiredCallback) {
    _onSessionExpired = callback;

    // Caso borde: el 401 o cambio de contraseña llegó antes de que el AuthProvider estuviera listo.
    if (_pendingReason) {
        const reason = _pendingReason;
        _pendingReason = null;
        callback(reason);
    }
}

/**
 * Elimina el callback registrado.
 * Debe ser llamado desde el AuthProvider al desmontar.
 */
export function unregisterSessionExpiredHandler() {
    _onSessionExpired = null;
    // No reseteamos _pendingReason intencionalmente:
    // si hay un evento pendiente y el provider se desmonta/remonta,
    // el próximo registerSessionExpiredHandler lo procesará igual.
}

/**
 * Notifica que la sesión expiró.
 * Llamado desde el errorLink de Apollo, el interceptor de Axios o cambio de contraseña.
 * Es idempotente si se almacena la última razón.
 */
export function notifySessionExpired(reason: SessionExpiredReason = 'expired') {
    if (_onSessionExpired) {
        _onSessionExpired(reason);
    } else {
        // El AuthProvider todavía no montó su handler — guardamos el evento con su razón.
        console.warn('[SessionManager] session_expired fired before handler was registered. Queuing reason:', reason);
        _pendingReason = reason;
    }
}


