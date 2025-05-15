# Installing Privacy Permission Dashboard

There are two ways to install this extension:

## Method 1: Temporary Installation (for testing)

1. Download or clone this repository to your computer
2. Open Firefox
3. Type `about:debugging` in the address bar and press Enter
4. Click on "This Firefox" in the left sidebar
5. Click on "Load Temporary Add-on..."
6. Navigate to the directory where you saved the extension
7. Select any file in the extension (e.g., manifest.json) and click "Open"

The extension will now be installed temporarily and will remain active until you restart Firefox.

## Method 2: Permanent Installation

1. Zip the entire extension directory
2. Rename the zip file to have a `.xpi` extension
3. Open Firefox
4. Type `about:addons` in the address bar and press Enter
5. Click the gear icon and select "Install Add-on From File..."
6. Navigate to the .xpi file and select it

Note: Since this extension is not signed by Mozilla, you may need to set `xpinstall.signatures.required` to `false` in `about:config` to install it permanently.

## After Installation

1. The extension icon will appear in your toolbar (if not, you can click the Extensions button and pin it)
2. Click the icon to open the Privacy Permission Dashboard
3. You'll see permissions for your current tab by default
4. Click "All Tabs" to see permissions for all open tabs

## Troubleshooting

If you encounter any issues:

1. Check the Firefox Browser Console (`Ctrl+Shift+J` or `Cmd+Shift+J` on Mac) for error messages
2. Make sure you've granted the extension the necessary permissions
3. Try reinstalling the extension

For more help, refer to the README.md file or submit an issue on the GitHub repository.