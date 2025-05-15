
// Default settings
const defaultSettings = {
    defaultPermissions: {
        camera: "prompt",
        microphone: "prompt",
        geolocation: "prompt",
        notifications: "prompt",
        storage: "allowed",
        cookies: "allowed"
    },
    autoBlockDomains: [],
    showNotifications: true,
    theme: "dark", // dark, light, system
    advancedMode: false
};

// Get settings from storage or use defaults
async function getSettings() {
    try {
        const result = await browser.storage.local.get('privacyDashboardSettings');
        return result.privacyDashboardSettings || defaultSettings;
    } catch (error) {
        console.error("Error getting settings:", error);
        return defaultSettings;
    }
}

// Save settings to storage
async function saveSettings(settings) {
    try {
        await browser.storage.local.set({ 'privacyDashboardSettings': settings });
        return true;
    } catch (error) {
        console.error("Error saving settings:", error);
        return false;
    }
}

// Apply settings to UI
function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'light') {
        root.style.setProperty('--text-primary', 'rgba(20, 20, 30, 0.9)');
        root.style.setProperty('--text-secondary', 'rgba(20, 20, 30, 0.7)');
        root.style.setProperty('--bg-primary', 'rgba(240, 240, 245, 0.8)');
        root.style.setProperty('--bg-secondary', 'rgba(220, 220, 230, 0.6)');
        root.style.setProperty('--bg-card', 'rgba(210, 210, 220, 0.5)');
    } else {
        // Restore default dark theme
        root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.9)');
        root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--bg-primary', 'rgba(15, 15, 25, 0.8)');
        root.style.setProperty('--bg-secondary', 'rgba(30, 30, 40, 0.6)');
        root.style.setProperty('--bg-card', 'rgba(40, 40, 60, 0.5)');
    }
}

// Initialize settings panel
async function initSettingsPanel() {
    const settings = await getSettings();
    const settingsPanel = document.getElementById('settings-panel');

    // Fill in current settings
    document.getElementById('notification-toggle').checked = settings.showNotifications;
    document.getElementById('advanced-mode-toggle').checked = settings.advancedMode;
    document.getElementById('theme-selector').value = settings.theme;

    // Set default permission preferences
    Object.keys(settings.defaultPermissions).forEach(permType => {
        const selectElement = document.getElementById(`default-${permType}`);
        if (selectElement) {
            selectElement.value = settings.defaultPermissions[permType];
        }
    });

    // Fill in auto-block domains
    const domainList = document.getElementById('auto-block-domains');
    domainList.innerHTML = '';

    settings.autoBlockDomains.forEach(domain => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.innerHTML = `
            <span>${domain}</span>
            <button class="remove-domain" data-domain="${domain}">×</button>
        `;
        domainList.appendChild(domainItem);
    });

    // Add event listeners to all domain remove buttons
    const removeButtons = domainList.querySelectorAll('.remove-domain');
    removeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const domainToRemove = e.target.dataset.domain;
            const updatedSettings = await getSettings();
            updatedSettings.autoBlockDomains = updatedSettings.autoBlockDomains.filter(
                domain => domain !== domainToRemove
            );
            await saveSettings(updatedSettings);
            initSettingsPanel(); // Refresh the panel
        });
    });

    // Add domain form
    const addDomainForm = document.getElementById('add-domain-form');
    addDomainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const domainInput = document.getElementById('new-domain');
        const newDomain = domainInput.value.trim();

        if (newDomain) {
            const updatedSettings = await getSettings();
            if (!updatedSettings.autoBlockDomains.includes(newDomain)) {
                updatedSettings.autoBlockDomains.push(newDomain);
                await saveSettings(updatedSettings);
                domainInput.value = '';
                initSettingsPanel(); // Refresh the panel
            }
        }
    });

    // Event listeners for settings changes
    document.getElementById('notification-toggle').addEventListener('change', async (e) => {
        const updatedSettings = await getSettings();
        updatedSettings.showNotifications = e.target.checked;
        await saveSettings(updatedSettings);
    });

    document.getElementById('advanced-mode-toggle').addEventListener('change', async (e) => {
        const updatedSettings = await getSettings();
        updatedSettings.advancedMode = e.target.checked;
        await saveSettings(updatedSettings);
    });

    document.getElementById('theme-selector').addEventListener('change', async (e) => {
        const updatedSettings = await getSettings();
        updatedSettings.theme = e.target.value;
        await saveSettings(updatedSettings);
        applyTheme(updatedSettings.theme);
    });

    // Default permission settings
    const permissionSelects = document.querySelectorAll('.default-permission-select');
    permissionSelects.forEach(select => {
        select.addEventListener('change', async (e) => {
            const permType = e.target.dataset.permission;
            const updatedSettings = await getSettings();
            updatedSettings.defaultPermissions[permType] = e.target.value;
            await saveSettings(updatedSettings);
        });
    });

    // Reset settings button
    document.getElementById('reset-settings').addEventListener('click', async () => {
        if (confirm("Are you sure you want to reset all settings to default?")) {
            await saveSettings(defaultSettings);
            applyTheme(defaultSettings.theme);
            initSettingsPanel(); // Refresh the panel
        }
    });
}

// Toggle settings panel visibility
function toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settings-panel');
    const isVisible = settingsPanel.classList.contains('visible');

    if (isVisible) {
        settingsPanel.classList.remove('visible');
    } else {
        settingsPanel.classList.add('visible');
    }
}

// Export functions for use in other files
window.settingsManager = {
    getSettings,
    saveSettings,
    applyTheme,
    initSettingsPanel,
    toggleSettingsPanel
};