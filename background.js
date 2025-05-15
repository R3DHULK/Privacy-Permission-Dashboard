// Store permissions data for each tab
let tabPermissions = {};

// Permission types to track
const permissionTypes = [
    { name: "camera", icon: "camera.svg" },
    { name: "microphone", icon: "mic.svg" },
    { name: "geolocation", icon: "location.svg" },
    { name: "notifications", icon: "notification.svg" },
    { name: "storage", icon: "storage.svg" },
    { name: "cookies", icon: "cookie.svg" }
];

// Initialize when extension is installed
browser.runtime.onInstalled.addListener(() => {
    console.log("Privacy Permission Dashboard installed");
    updateAllTabsPermissions();
});

// Update permissions when a tab is updated
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        updateTabPermissions(tabId, tab.url);
    }
});

// Remove permissions data when a tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
    if (tabPermissions[tabId]) {
        delete tabPermissions[tabId];
    }
});

// Update permissions for all tabs
async function updateAllTabsPermissions() {
    const tabs = await browser.tabs.query({});
    tabs.forEach(tab => {
        updateTabPermissions(tab.id, tab.url);
    });
}

// Update permissions for a specific tab
async function updateTabPermissions(tabId, url) {
    try {
        if (!url || url.startsWith("about:") || url.startsWith("moz-extension:")) {
            // Skip internal Firefox pages
            tabPermissions[tabId] = {
                url: url,
                permissions: {}
            };
            return;
        }

        // Initialize permissions object for this tab
        if (!tabPermissions[tabId]) {
            tabPermissions[tabId] = {
                url: url,
                permissions: {}
            };
        } else {
            tabPermissions[tabId].url = url;
        }

        // Get permission states for the site
        const origin = new URL(url).origin;

        // Query for each permission type
        for (const permType of permissionTypes) {
            let permissionState = "unknown";

            try {
                // Different APIs are used for different permission types
                if (permType.name === "camera" || permType.name === "microphone") {
                    const result = await browser.permissions.contains({
                        permissions: ["browserSettings"]
                    });

                    // This is a simplification - in a real extension we would query 
                    // the actual media permission state
                    permissionState = "prompt"; // Default state is prompt
                }
                else if (permType.name === "geolocation") {
                    const result = await browser.permissions.contains({
                        permissions: ["privacy"]
                    });
                    permissionState = "prompt";
                }
                else if (permType.name === "notifications" || permType.name === "storage") {
                    // For simplification, use a default state
                    permissionState = "prompt";
                }
                else if (permType.name === "cookies") {
                    // Check if cookies are allowed for this site
                    permissionState = "allowed"; // Default assumption
                }
            } catch (error) {
                console.error(`Error checking ${permType.name} permission:`, error);
                permissionState = "unknown";
            }

            tabPermissions[tabId].permissions[permType.name] = permissionState;
        }

        // Send updated permissions to popup if it's open
        browser.runtime.sendMessage({
            type: "permissionsUpdated",
            tabId: tabId,
            permissions: tabPermissions[tabId]
        }).catch(err => {
            // It's normal for this to fail if the popup isn't open
            if (!err.message.includes("Could not establish connection")) {
                console.error("Error sending permissions update:", err);
            }
        });

    } catch (error) {
        console.error("Error updating tab permissions:", error);
    }
}

// Listen for permission change requests from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getPermissions") {
        // Return permissions for requested tab
        sendResponse({
            tabPermissions: tabPermissions[message.tabId] || { permissions: {} }
        });
        return true;
    }

    if (message.type === "updatePermission") {
        updatePermissionState(
            message.tabId,
            message.permissionType,
            message.newState
        ).then(result => {
            sendResponse({ success: result });
        }).catch(error => {
            console.error("Error updating permission:", error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    if (message.type === "getAllTabsPermissions") {
        sendResponse({ tabPermissions: tabPermissions });
        return true;
    }
});

// Function to update a permission state
async function updatePermissionState(tabId, permissionType, newState) {
    try {
        const tab = await browser.tabs.get(tabId);
        const url = tab.url;
        const origin = new URL(url).origin;

        // In a real extension, we would use the appropriate APIs to change the permission
        // This is a simplified version that just updates our stored state

        if (tabPermissions[tabId] && tabPermissions[tabId].permissions) {
            tabPermissions[tabId].permissions[permissionType] = newState;

            // Here we would execute the actual permission change via browser APIs
            // This would differ based on permission type

            return true;
        }
        return false;
    } catch (error) {
        console.error("Error updating permission state:", error);
        return false;
    }
}