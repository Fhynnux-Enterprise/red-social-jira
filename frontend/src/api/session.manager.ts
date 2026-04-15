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

type SessionExpiredCallback = () => void;

let _onSessionExpired: SessionExpiredCallback | null = null;

/** Bandera de evento pendiente: true si expiró antes de que hubiera handler. */
let _isExpiredPending = false;

/**
 * Registra el callback que se llamará cuando la sesión expire.
 * Debe ser llamado desde el AuthProvider al montar.
 * Si ya había una expiración pendiente, la ejecuta de inmediato.
 */
export function registerSessionExpiredHandler(callback: SessionExpiredCallback) {
    _onSessionExpired = callback;

    // Caso borde: el 401 llegó antes de que el AuthProvider estuviera listo.
    if (_isExpiredPending) {
        _isExpiredPending = false;
        callback();
    }
}

/**
 * Elimina el callback registrado.
 * Debe ser llamado desde el AuthProvider al desmontar.
 */
export function unregisterSessionExpiredHandler() {
    _onSessionExpired = null;
    // No reseteamos _isExpiredPending intencionalmente:
    // si hay un 401 pendiente y el provider se desmonta/remonta (HMR, etc.),
    // el próximo registerSessionExpiredHandler lo procesará igual.
}

/**
 * Notifica que la sesión expiró.
 * Llamado desde el errorLink de Apollo o el interceptor de Axios.
 * Es idempotente: múltiples llamadas antes de que haya handler
 * solo dejan _isExpiredPending = true una vez.
 */
export function notifySessionExpired() {
    if (_onSessionExpired) {
        _onSessionExpired();
    } else {
        // El AuthProvider todavía no montó su handler — guardamos el evento.
        console.warn('[SessionManager] session_expired fired before handler was registered. Queuing...');
        _isExpiredPending = true;
    }
}

