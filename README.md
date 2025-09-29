# CyberSec Firefox Extension (Hello World Base)

This is the initial scaffold of a Firefox WebExtension that simply shows **Hello World** in the popup.

## Structure

```
manifest.json            # Extension manifest (MV3 style - note: Firefox MV3 still evolving)
src/
	background.js          # Background script (simple console log)
	popup.html             # Popup UI
	popup.js               # Popup logic (sets Hello World text)
	popup.css              # Basic styling
assets/
	icon-48.png
	icon-96.png
```

## Load in Firefox (Temporary Add-on)

1. Open Firefox.
2. Go to: `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` file in this project root.
5. Click the extension icon in the toolbar; you should see the popup with "Hello World".

## Notes

Firefox MV3 support is still in progress. If you hit issues with the `background` section using `scripts`, you can convert to Manifest V2 by:

1. Changing `"manifest_version": 2` in `manifest.json`.
2. Replacing the background block with:
	 ```json
	 "background": { "scripts": ["src/background.js"], "persistent": false }
	 ```
3. Adjusting any API differences as needed.

For now this minimal setup should work for local experimentation.

## Next Ideas

- Add a content script to interact with pages.
- Add options page for user settings.
- Implement security-related scanning features.

---

Feel free to extend this base. PRs / iterations welcome.