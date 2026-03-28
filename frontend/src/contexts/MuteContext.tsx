import React, { createContext, useContext, useState, useEffect } from 'react';
import { VolumeManager } from 'react-native-volume-manager';

interface MuteContextType {
    isGlobalMuted: boolean;
    setIsGlobalMuted: (muted: boolean) => void;
    toggleGlobalMute: () => void;
}

const MuteContext = createContext<MuteContextType | undefined>(undefined);

export const MuteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isGlobalMuted, setIsGlobalMuted] = useState(true);

    const toggleGlobalMute = () => {
        setIsGlobalMuted(prev => !prev);
    };

    // Listener de volumen físico (TikTok Style)
    useEffect(() => {
        let lastVolume = 0;
        
        // Obtenemos volumen inicial
        VolumeManager.getVolume().then(initial => {
            lastVolume = initial.volume;
        });

        const subscription = VolumeManager.addVolumeListener((result) => {
            // Si el nuevo volumen es mayor al anterior, desmutear automáticamente
            if (result.volume > lastVolume) {
                setIsGlobalMuted(false);
            }
            lastVolume = result.volume;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <MuteContext.Provider value={{ isGlobalMuted, setIsGlobalMuted, toggleGlobalMute }}>
            {children}
        </MuteContext.Provider>
    );
};

export const useMute = () => {
    const context = useContext(MuteContext);
    if (!context) {
        throw new Error('useMute must be used within a MuteProvider');
    }
    return context;
};
