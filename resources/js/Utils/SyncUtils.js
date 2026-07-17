// Utils/SyncUtils.js

export const handleSyncError = async (response) => {
    const data = await response.json().catch(() => ({}));

    switch (response.status) {
        case 403:
            return "Shift out of sync. Please re-login.";
        case 422:
            return "Sync data invalid. Please check your entries.";
        case 500:
            return data.error || "Server error occurred during sync.";
        default:
            return "Sync failed. Check your internet connection.";
    }
};
