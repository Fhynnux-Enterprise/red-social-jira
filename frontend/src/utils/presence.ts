export const getUserOnlineStatus = (lastActiveAt: string | Date | undefined | null) => {
    if (!lastActiveAt) {
        return { isOnline: false, text: 'Desconectado' };
    }

    const lastActive = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    // Si pasaron menos de 5 minutos, consideramos "En línea"
    if (diffMinutes < 5) {
        return { isOnline: true, text: 'En línea' };
    }

    // Si pasó más tiempo, formateamos relativamente
    if (diffMinutes < 60) {
        return { isOnline: false, text: `Últ. vez hace (${diffMinutes}) m` };
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return { isOnline: false, text: `Últ. vez hace (${diffHours}) h` };
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
        return { isOnline: false, text: 'Últ. vez ayer' };
    }

    return { isOnline: false, text: `Últ. vez hace ${diffDays} días` };
};
