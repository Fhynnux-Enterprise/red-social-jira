let activeConversationId: string | null = null;

export const ActiveChatTracker = {
    setActiveConversationId: (id: string | null) => {
        activeConversationId = id;
    },
    getActiveConversationId: () => {
        return activeConversationId;
    }
};
