document.addEventListener('DOMContentLoaded', async function () {
    // Initialize settings
    await window.settingsManager.initSettingsPanel();

    // Apply theme from settings
    const settings = await window.settingsManager.getSettings();
    window.settingsManager.applyTheme(settings.theme);

    // Setup settings toggle
    document.getElementById('settings-icon').addEventListener('click', () => {
        window.settingsManager.toggleSettingsPanel();
    });

    // Setup settings close button
    document.getElementById('close-settings').addEventListener('click', () => {
        window.settingsManager.toggleSettingsPanel();
    });

    // Tab switching functionality
    const currentTabBtn = document.getElementById('current-tab-btn');
    const allTabsBtn = document.getElementById('all-tabs-btn');
    const currentTabView = document.getElementById('current-tab-view');
    const allTabsView = document.getElementById('all-tabs-view');

    currentTabBtn.addEventListener('click', () => {
        currentTabBtn.classList.add('active');
        allTabsBtn.classList.remove('active');
        currentTabView.classList.add('active');
        allTabsView.classList.remove('active');
    });

    allTabsBtn.addEventListener('click', () => {
        allTabsBtn.classList.add('active');
        currentTabBtn.classList.remove('active');
        allTabsView.classList.add('active');
        currentTabView.classList.remove('active');
        loadAllTabs();
    });

    // Load current tab's permissions
    let currentTab = await browser.tabs.query({ active: true, currentWindow: true });
    currentTab = currentTab[0];

    if (currentTab) {
        document.getElementById('current-tab-url').textContent = formatUrl(currentTab.url);
        await loadCurrentTabPermissions(currentTab.id);
    }

    // Message listener for permission updates
    browser.runtime.onMessage.addListener((message) => {
        if (message.type === "permissionsUpdated" && message.tabId === currentTab.id) {
            updatePermissionsDisplay(message.permissions);
        }
    });

    // Function to load current tab permissions
    async function loadCurrentTabPermissions(tabId) {
        try {
            const response = await browser.runtime.sendMessage({
                type: "getPermissions",
                tabId: tabId
            });

            if (response && response.tabPermissions) {
                updatePermissionsDisplay(response.tabPermissions);
            } else {
                document.getElementById('permissions-list').innerHTML =
                    `<div class="permission-card">No permission data available</div>`;
            }
        } catch (error) {
            console.error("Error loading permissions:", error);
            document.getElementById('permissions-list').innerHTML =
                `<div class="permission-card">Error loading permissions</div>`;
        }
    }

    // Update permissions display
    async function updatePermissionsDisplay(tabPermissionData) {
        const permissionsList = document.getElementById('permissions-list');
        permissionsList.innerHTML = '';

        if (!tabPermissionData || !tabPermissionData.permissions) {
            permissionsList.innerHTML =
                `<div class="permission-card">No permission data available</div>`;
            return;
        }

        // Get settings for advanced mode
        const settings = await window.settingsManager.getSettings();
        const isAdvancedMode = settings.advancedMode;

        const permTypes = [
            { name: "camera", icon: "📷", title: "Camera" },
            { name: "microphone", icon: "🎤", title: "Microphone" },
            { name: "geolocation", icon: "📍", title: "Location" },
            { name: "notifications", icon: "🔔", title: "Notifications" },
            { name: "storage", icon: "💾", title: "Storage" },
            { name: "cookies", icon: "🍪", title: "Cookies" }
        ];

        for (const permType of permTypes) {
            const permState = tabPermissionData.permissions[permType.name] || "unknown";
            const isAllowed = permState === "allowed";

            let permCardHtml = `
                <div class="permission-card">
                    <div class="permission-info">
                        <div class="permission-icon">${permType.icon}</div>
                        <div class="permission-details">
                            <span class="permission-name">${permType.title}</span>
                            <span class="permission-status">${formatPermissionState(permState)}</span>
                        </div>
                    </div>
                    <label class="permission-toggle">
                        <input type="checkbox" data-permission="${permType.name}" ${isAllowed ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            `;

            // Add additional details if in advanced mode
            if (isAdvancedMode) {
                const defaultPerm = settings.defaultPermissions[permType.name];
                permCardHtml = permCardHtml.replace('</div>\n                </div>',
                    `</div>\n                    <div class="permission-default">(Default: ${formatPermissionState(defaultPerm)})</div>\n                </div>`);
            }

            permissionsList.innerHTML += permCardHtml;
        }

        // Add event listeners to toggles
        const toggles = permissionsList.querySelectorAll('input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const permType = e.target.dataset.permission;
                const newState = e.target.checked ? "allowed" : "blocked";

                try {
                    const response = await browser.runtime.sendMessage({
                        type: "updatePermission",
                        tabId: currentTab.id,
                        permissionType: permType,
                        newState: newState
                    });

                    if (!response || !response.success) {
                        // Revert toggle if update failed
                        e.target.checked = !e.target.checked;
                        console.error("Failed to update permission");
                    } else {
                        // Show notification if enabled
                        const settings = await window.settingsManager.getSettings();
                        if (settings.showNotifications) {
                            // In a real extension, you might use browser.notifications here
                            console.log(`Permission updated: ${permType} is now ${newState}`);
                        }
                    }
                } catch (error) {
                    console.error("Error updating permission:", error);
                    // Revert toggle
                    e.target.checked = !e.target.checked;
                }
            });
        });
    }

    // Load all tabs and their permissions
    async function loadAllTabs() {
        const allTabsList = document.getElementById('all-tabs-list');
        allTabsList.innerHTML = '<div class="loading">Loading all tabs...</div>';

        try {
            // Get all tabs
            const tabs = await browser.tabs.query({});

            // Get permissions for all tabs
            const response = await browser.runtime.sendMessage({
                type: "getAllTabsPermissions"
            });

            const tabPermissions = response.tabPermissions || {};

            // Get settings for advanced mode
            const settings = await window.settingsManager.getSettings();
            const isAdvancedMode = settings.advancedMode;
            const autoBlockDomains = settings.autoBlockDomains || [];

            // Clear loading message
            allTabsList.innerHTML = '';

            if (tabs.length === 0) {
                allTabsList.innerHTML = '<div class="permission-card">No open tabs</div>';
                return;
            }

            // Create tab items
            tabs.forEach(tab => {
                const tabPermissionData = tabPermissions[tab.id] || { permissions: {} };
                const permTypes = [
                    { name: "camera", icon: "📷", title: "Camera" },
                    { name: "microphone", icon: "🎤", title: "Microphone" },
                    { name: "geolocation", icon: "📍", title: "Location" },
                    { name: "notifications", icon: "🔔", title: "Notifications" },
                    { name: "storage", icon: "💾", title: "Storage" },
                    { name: "cookies", icon: "🍪", title: "Cookies" }
                ];

                let badgesHtml = '';
                let detailsHtml = '';

                // Check if domain is in auto-block list
                let isAutoBlocked = false;
                if (tab.url) {
                    try {
                        const domain = new URL(tab.url).hostname;
                        isAutoBlocked = autoBlockDomains.some(blockedDomain =>
                            domain.includes(blockedDomain));
                    } catch (e) {
                        // Invalid URL, ignore
                    }
                }

                // Add auto-block badge if applicable
                if (isAutoBlocked && isAdvancedMode) {
                    badgesHtml += `
                        <div class="permission-badge blocked">
                            🚫 Auto-blocked
                        </div>
                    `;
                }

                permTypes.forEach(permType => {
                    const permState = tabPermissionData.permissions[permType.name] || "unknown";
                    let badgeClass = "";

                    if (permState === "allowed") {
                        badgeClass = "allowed";
                    } else if (permState === "blocked") {
                        badgeClass = "blocked";
                    }

                    badgesHtml += `
                        <div class="permission-badge ${badgeClass}">
                            ${permType.icon} ${formatPermissionState(permState)}
                        </div>
                    `;

                    // Add additional details in advanced mode
                    let advancedInfo = '';
                    if (isAdvancedMode) {
                        const defaultPerm = settings.defaultPermissions[permType.name];
                        advancedInfo = `<div class="permission-default">(Default: ${formatPermissionState(defaultPerm)})</div>`;
                    }

                    detailsHtml += `
                        <div class="permission-card">
                            <div class="permission-info">
                                <div class="permission-icon">${permType.icon}</div>
                                <div class="permission-details">
                                    <span class="permission-name">${permType.title}</span>
                                    <span class="permission-status">${formatPermissionState(permState)}</span>
                                    ${advancedInfo}
                                </div>
                            </div>
                            <label class="permission-toggle">
                                <input type="checkbox" data-tab-id="${tab.id}" data-permission="${permType.name}" 
                                    ${permState === "allowed" ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    `;
                });

                const tabItemHtml = `
                    <div class="tab-item ${isAutoBlocked ? 'auto-blocked' : ''}">
                        <div class="tab-header">
                            <span class="tab-title" title="${tab.title || tab.url}">${tab.title || formatUrl(tab.url)}</span>
                            <button class="expand-btn" data-tab-id="${tab.id}">▼</button>
                        </div>
                        <div class="tab-permissions">
                            ${badgesHtml}
                        </div>
                        <div class="tab-details" id="tab-details-${tab.id}">
                            ${detailsHtml}
                        </div>
                    </div>
                `;

                allTabsList.innerHTML += tabItemHtml;
            });

            // Add event listeners to expand buttons
            const expandBtns = allTabsList.querySelectorAll('.expand-btn');
            expandBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabId = e.target.dataset.tabId;
                    const detailsElem = document.getElementById(`tab-details-${tabId}`);
                    const isExpanded = detailsElem.classList.contains('expanded');

                    if (isExpanded) {
                        detailsElem.classList.remove('expanded');
                        e.target.textContent = '▼';
                    } else {
                        detailsElem.classList.add('expanded');
                        e.target.textContent = '▲';
                    }
                });
            });

            // Add event listeners to toggles in detailed view
            const detailToggles = allTabsList.querySelectorAll('.tab-details input[type="checkbox"]');
            detailToggles.forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const tabId = parseInt(e.target.dataset.tabId);
                    const permType = e.target.dataset.permission;
                    const newState = e.target.checked ? "allowed" : "blocked";

                    try {
                        const response = await browser.runtime.sendMessage({
                            type: "updatePermission",
                            tabId: tabId,
                            permissionType: permType,
                            newState: newState
                        });

                        if (!response || !response.success) {
                            // Revert toggle if update failed
                            e.target.checked = !e.target.checked;
                            console.error("Failed to update permission");
                        } else {
                            // Show notification if enabled
                            const settings = await window.settingsManager.getSettings();
                            if (settings.showNotifications) {
                                // In a real extension, you might use browser.notifications here
                                console.log(`Permission updated: ${permType} is now ${newState} for tab ${tabId}`);
                            }

                            // Reload all tabs to refresh the UI
                            await loadAllTabs();
                        }
                    } catch (error) {
                        console.error("Error updating permission:", error);
                        // Revert toggle
                        e.target.checked = !e.target.checked;
                    }
                });
            });

        } catch (error) {
            console.error("Error loading all tabs:", error);
            allTabsList.innerHTML = '<div class="permission-card">Error loading tabs</div>';
        }
    }

    // Helper functions
    function formatUrl(url) {
        try {
            if (!url) return "Unknown URL";

            if (url.startsWith("about:") || url.startsWith("moz-extension:")) {
                return url;
            }

            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch (e) {
            return url;
        }
    }

    function formatPermissionState(state) {
        switch (state) {
            case "allowed":
                return "Allowed";
            case "blocked":
                return "Blocked";
            case "prompt":
                return "Ask";
            default:
                return "Unknown";
        }
    }
});