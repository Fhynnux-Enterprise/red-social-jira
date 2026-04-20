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

    // Formatear la hora (ej: 4:05 pm)
    const hours = lastActive.getHours();
    const minutes = lastActive.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const timeString = `${displayHours}:${displayMinutes} ${ampm}`;

    // Verificar si es hoy o ayer
    const isToday = lastActive.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = lastActive.toDateString() === yesterday.toDateString();

    if (isToday) {
        return { isOnline: false, text: `Últ. vez hoy a las ${timeString}` };
    } else if (isYesterday) {
        return { isOnline: false, text: `Últ. vez ayer a las ${timeString}` };
    } else {
        const day = lastActive.getDate().toString().padStart(2, '0');
        const month = (lastActive.getMonth() + 1).toString().padStart(2, '0');
        const year = lastActive.getFullYear();
        return { isOnline: false, text: `Últ. vez el ${day}/${month}/${year} a las ${timeString}` };
    }
};
