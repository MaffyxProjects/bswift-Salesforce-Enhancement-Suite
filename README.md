## bswift Salesforce Enhancement Suite - Documentation

This document provides documentation for the bswift Salesforce Enhancement Suite.

---

## Overview
The bswift Salesforce Enhancement Suite is designed to improve the user experience within Salesforce, particularly for case management. It adds several visual and functional enhancements to Salesforce case list views and detail pages, focusing on bswift client IDs and related tasks. The goal is to streamline workflows, improve data visibility, and provide quick access to relevant information and tools.

Before:
![Main View Before](https://github.com/MaffyxProjects/bswift-Salesforce-Enhancement-Suite/blob/main/2025-05-07%2011_06_37-Window.png?raw=true)

After:
![Main View After](https://github.com/MaffyxProjects/bswift-Salesforce-Enhancement-Suite/blob/main/2025-05-07%2010_46_44-Window.png?raw=true)

## How to Use

1.  **Installation:**
    Download the extension files from: [bswift Salesforce Enhancement Suite.zip](https://foxhunt.s3.us-west-2.amazonaws.com/bswift/SFtoSPExtension/bswift+Salesforce+Enhancement+Suite/bswift+Salesforce+Enhancement+Suite.zip).
    Then, install the extension in your Chromium-based browser (e.g., Google Chrome, Microsoft Edge) by enabling "Developer mode" in your browser's extensions page and using the "Load unpacked" option to select the downloaded and unzipped extension folder.

2.  **Salesforce Navigation:** Navigate to a Salesforce case list view or a case detail page. The extension primarily targets these areas.

3.  **Automatic Enhancements:**
    *   **List Views:** Upon loading a case list view, cases should automatically be grouped by "Target End Date" with summary banners showing total estimated time. Rows will be color-coded by their status. Action buttons (SharePoint search, bswift role search, Urgency, Notes/Status, Link) will appear next to the "Client ID" (bswift ID) in each row.
    *   **Detail Views:** On a case detail page, the same set of action buttons will appear next to the "bswift Client Id" field.

4.  **"Load & Group" Button (List Views):** If the list view is paginated (shows only a subset of cases), click the "Load & Group" button (usually located near other list view controls like "New", "Import"). This will attempt to scroll and load all cases in the current view, then apply all enhancements.

![Button Grouping](https://github.com/MaffyxProjects/bswift-Salesforce-Enhancement-Suite/blob/main/2025-05-07%2010_58_42-Window.png?raw=true)

5.  **Interacting with Action Buttons:**
    *   Click the **SharePoint icon** (![SharePoint](https://bswiftllc.sharepoint.com/_layouts/15/images/favicon.ico?rev=47)) to search for the client's Account Name in SharePoint Payroll documents.
    *   Click the **bswift icon** (![bswift](https://secure.bswift.com/images/ico/favicon.ico)) to copy the Client ID to your clipboard and open the bswift platform in a new tab.
    *   Click the **Urgent icon** (`priority_high` / `priority_high` ⚠️) to toggle the urgency status of the case. If marking as urgent, you'll be prompted for an optional urgent note.
    *   Click the **Notes/Status icon** (`edit_note` 📝 / `edit_note` (with note) 📝 / `warning` (with symbol) ⚠️) to open a modal. In this modal, you can:
        *   Mark/unmark the case as urgent and edit the urgent note.
        *   Add or edit a general note for the case.
        *   Select a status symbol (e.g., `check_circle` ✅, `warning` ⚠️) and customize its color.
        *   Add or edit a case-specific link URL.
        *   Use the "Clear All" button in the modal to remove all custom metadata (notes, urgency, symbol, link) for that specific case.
    *   Click the **Link icon** (`link_off` / `link` 🔗):
        *   If a link URL is already set for the case, clicking this button will open that URL in a new tab.
        *   If no link is set, it will open the Notes/Status modal, allowing you to add one.

![Popup](https://github.com/MaffyxProjects/bswift-Salesforce-Enhancement-Suite/blob/main/2025-05-07%2011_13_58-Window.png?raw=true)

7.  **Using the Popup (Extension Icon):**
    *   Click the extension icon in your browser toolbar to open the popup.
    *   Here, you can see a list of all cases for which you've saved metadata.
    *   Use the "Edit" or "Delete" buttons next to each entry to manage its data.
    *   Use the "Export" button to save all your stored notes and statuses to a JSON file.
    *   Use the "Import" button to load data from a previously exported JSON file (this will overwrite existing data).
    *   Use the "Clear" button to remove all data stored by the extension.
    *   Click the "Merge" button to open the Merge Data page for combining exported files.
    *   Expand the "Quick Guide" for a brief overview of icons and features.

## Features

*   **Case Grouping by Target End Date:**
    *   Automatically groups cases in list views by their "Target End Date".
    *   Displays the full day of the week for each date group (e.g., "Monday, January 1, 2024").
*   **Banner Rows with Time Totals:**
    *   Inserts banner rows for each date group in list views.
    *   Displays the total estimated time (in Hours & Minutes) for all cases within that group.
*   **Status-Based Row Highlighting:**
    *   Applies distinct background colors to case rows based on their status (e.g., 'In-Process', 'Assigned', 'On-Hold').
    *   Uses a modernized professional color palette for better visual distinction.
 
![Case management](https://github.com/MaffyxProjects/bswift-Salesforce-Enhancement-Suite/blob/main/2025-05-07%2011_00_28-Window.png?raw=true)

*   **Urgent Case Management (via `urgencyManager.js`):**
    *   **Mark as Urgent:** Allows users to toggle a case's urgency. Urgent cases are highlighted with a distinct red background in list views.
        Icon: `priority_high` (Normal) / `priority_high` (Urgent ⚠️)
    *   **Urgent Notes:** Users can add a specific note explaining the reason for urgency. This note is visible in the urgent button's tooltip.
    *   **General Notes:** Users can add general notes for any case. These notes are accessible via the notes button and are previewed in its tooltip.
    *   **Status Symbols & Custom Colors:**
        *   Assign a visual status symbol (e.g., Check, Warning, Flag, Workflow) to a case.
        *   Customize the color of the chosen status symbol using a color picker or predefined swatches.
        *   The notes button icon changes to reflect the selected symbol and color.
        Icon: `edit_note` (No data) / `edit_note` (Has note 📝) / Custom symbol (e.g., `warning` ⚠️)
    *   **Case-Specific Links:**
        *   Add a custom URL (e.g., to a specific document, external tool) to a case.
        *   A dedicated link button allows opening this URL directly or editing it via the notes modal.
        Icon: `link_off` (No link) / `link` (Link set 🔗)
    *   **Comprehensive Modal Editor:** A modal allows editing all these metadata points (urgency, urgent note, general note, status symbol, symbol color, link URL) in one place. Includes a "Clear All" button within the modal to reset data for the specific case.
    *   **Data Persistence:** All metadata is stored locally in the browser's storage, specific to the user's browser profile.
*   **"Load & Group" Functionality:**
    *   Adds a "Load & Group" button to case list views.
    *   Clicking this button automatically scrolls to load all cases in the current view and then applies the date grouping and other enhancements. A progress indicator is shown.
*   **Quick Links:**
    *   **SharePoint Search:** Adds a button next to the bswift Client ID to directly search for the client's Account Name in SharePoint (specifically in the Payroll documents section).
        Icon: !SharePoint
    *   **bswift Role Search:** Adds a button to copy the bswift Client ID and open the bswift platform.
        Icon: !bswift
*   **Popup Interface (Extension Icon):**
    *   **View Saved Data:** Lists all cases for which notes, urgency, or status symbols have been saved. Urgent cases are highlighted.
    *   **Edit Entries:** Allows editing the general note, status symbol, symbol color, urgency status, and case link URL for any listed case directly from the popup's edit modal.
    *   **Delete Entries:** Allows deleting all stored metadata for individual cases.
    *   **Export Data:** Users can export all their saved case metadata to a JSON file for backup or transfer. Data is grouped by Account Name in the export.
    *   **Import Data:** Users can import previously exported JSON data (or compatible formats), overwriting existing stored data. Includes validation of the imported file.
    *   **Clear All Data:** Provides an option to remove all stored case metadata from the browser.
    *   **Quick Guide:** An expandable section in the popup explains the icons and basic functionality of the extension.
*   **Merge Exported Data:**
    *   Access a dedicated "Merge Data" page via the popup's "Merge" button.
    *   Select two exported JSON files (e.g., your export and a teammate's).
    *   The tool compares the files, identifying unique entries, duplicates (auto-merged), and conflicts (different data for the same case).
    *   For conflicts, users can choose which version to keep (File 1 or File 2) or manually edit the entry to create a new merged version using a modal editor.
    *   The final merged dataset can be exported as a new JSON file or imported directly back into the extension's storage (overwriting existing data).
*   **Dynamic Refresh & Observation:** The extension attempts to automatically refresh enhancements when the Salesforce view changes (e.g., URL change, subtab switch, table sort/filter, or rows being added/removed).
*   **Optimized Performance:** Includes debouncing for scroll, mutation, and URL change events to improve performance and prevent excessive processing.

> **Icon Display:** The extension uses "Material Symbols Outlined" from Google Fonts for Urgency, Notes, Link, and other UI icons. An active internet connection is usually required for these to load correctly the first time they are used. If they appear as text (e.g., "priority_high"), it's likely a font loading issue.

## Troubleshooting

*   **Buttons or enhancements not appearing:**
    *   **Refresh the Page:** The first step is usually to refresh the Salesforce page (Ctrl+R or Cmd+R). Salesforce Lightning pages can be complex, and a refresh often helps the extension initialize correctly.
    *   **Correct View:** Ensure you are on a supported Salesforce view (standard case list views or case detail pages). Custom list views or heavily modified pages might not be fully compatible.
    *   **Console Errors:** Open the browser console (usually by pressing F12, then selecting the "Console" tab) and look for any error messages starting with "[SFX Ext Error]". These can provide clues about what might be going wrong.
*   **"Load & Group" button seems stuck or doesn't load everything:**
    *   This can occur with very large case lists or if there are network interruptions. Give it some time to complete. If it shows an error or seems unresponsive after a while, a page refresh might be necessary.
*   **Data (notes, urgency, etc.) not saving:**
    *   **Permissions:** Ensure the extension has the "storage" permission. This is set in `manifest.json` and should be granted automatically upon installation.
    *   **Console Errors:** Check the browser console for any storage-related errors.
    *   **Browser Storage Limits:** While unlikely for typical usage, extremely large amounts of notes could theoretically hit browser storage limits, though this is rare.
*   **Icons not displaying correctly (showing text like "priority_high"):**
    *   The extension uses "Material Symbols Outlined" from Google Fonts. An active internet connection is generally required for these to load the first time they are used or if they are not cached by your browser. If you see text instead of icons, it's likely a font loading issue. Ensure your internet connection is stable.
*   **Merge Page Issues:**
    *   **File Selection:** Ensure you are selecting valid JSON files that were previously exported by this extension (or have a compatible structure).
    *   **Processing Errors:** If an error occurs during file processing, check the browser console (F12 -> Console) on the merge page for more details.
    *   **Conflict Resolution:** Make sure to resolve all conflicts before exporting or importing the merged data for the most complete result.

## File Breakdown

The extension consists of the following core files:

*   `manifest.json`: The manifest file is the entry point of the extension. It defines metadata (name, version, description), permissions required (like `storage` for saving notes, `activeTab` and `scripting` for interacting with Salesforce pages), specifies the content scripts to be injected into Salesforce pages (`urgencyManager.js`, `content.js`), lists CSS files to be injected (`urgencyManager.css`), defines the popup page (`popup.html`), and declares web-accessible resources like `documentation.html` and `merge.html`.
*   `content.js`: This is the main content script injected into Salesforce pages. It is responsible for:
    *   Detecting the current Salesforce view (list vs. detail).
    *   Extracting case data from table rows and detail pages.
    *   Implementing case grouping by date and status-based row highlighting in list views.
    *   Adding the "Load & Group" button and managing its functionality.
    *   Creating and placing the SharePoint and bswift quick link buttons.
    *   Initializing and coordinating with `UrgencyManager.js` for the urgency, notes, status symbol, and link features.
    *   Observing DOM changes (e.g., table updates, sorting) and URL changes to trigger refreshes of the enhancements.
    *   Managing scroll events to optimize performance during table loading in list views.
    *   Injecting necessary CSS for some dynamic elements.
*   `urgencyManager.js`: This module specifically manages all metadata related to case urgency, notes, status symbols, custom colors, and case-specific links. Its responsibilities include:
    *   Storing and retrieving this metadata from `chrome.storage.local` using a defined key (`bswift_case_metadata`).
    *   Creating the HTML for the "Urgent", "Notes/Status", and "Link" buttons that appear on Salesforce pages.
    *   Providing the HTML structure and JavaScript logic for the metadata editing modal (setting urgency, notes, symbol, color, link).
    *   Applying visual styles to rows (e.g., urgent row highlight) and buttons (e.g., filled icons, custom colors for symbols) based on the stored metadata.
    *   Handling user interactions with these buttons and the modal (saving data, clearing fields).
    *   Defining available status symbols, their default colors, and predefined color swatches for the modal.
*   `urgencyManager.css`: Contains CSS styles specifically for the elements managed by `UrgencyManager.js`. This includes styles for the urgent row highlight, active button states (urgent, notes, link), and the detailed appearance of the metadata editing modal (layout, input fields, symbol pickers, color swatches, buttons).
*   `popup.html`: Defines the HTML structure for the extension's popup window. It lays out:
    *   A title and a container to list saved case metadata.
    *   Buttons for Export, Import, Clear All, and Merge data functionalities.
    *   An expandable "Quick Guide" section.
    *   A modal form for editing individual case entries.
*   `popup.js`: Contains the JavaScript logic for `popup.html`. It handles:
    *   Fetching and displaying saved case metadata.
    *   Implementing Export, Import, Clear All, and navigating to the Merge page.
    *   Managing the edit modal within the popup.
    *   Parsing composite keys for display.
    *   Sorting displayed cases.
*   `popup.css`: Provides styling for `popup.html`.
*   `merge.html`: Defines the HTML structure for the data merging page. It includes:
    *   File input fields for selecting two exported JSON files.
    *   A button to process and compare the files.
    *   Sections to display comparison results: unique entries, duplicates, and conflicts.
    *   A modal for resolving conflicts by choosing a version or manually editing.
    *   Buttons to export the final merged data or import it directly into the extension.
*   `merge.js`: Contains the JavaScript logic for `merge.html`. It handles:
    *   Reading and parsing the selected JSON files.
    *   Comparing the data from both files to identify unique items, duplicates, and conflicts.
    *   Displaying these results to the user.
    *   Managing the conflict resolution modal, allowing users to pick a version or edit.
    *   Generating the final merged dataset.
    *   Exporting the merged data to a new JSON file.
    *   Importing the merged data directly into the extension's storage.
*   `merge.css`: Provides styling for `merge.html`, ensuring a clear interface for the merging process.

---

bswift Salesforce Enhancement Suite - Streamlining Your Case Management
