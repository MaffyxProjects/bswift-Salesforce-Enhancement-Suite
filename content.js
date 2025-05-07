/**
 * Salesforce Enhancement Extension for Client IDs
 * Version 1.0.21 (Fix Notes Button Handling)
 *
 * Features:
 * - Case Grouping by Target End Date (with Full Day of Week)
 * - Banner rows with estimated time totals (Hours & Minutes)
 * - Status-based row highlighting (Modernized Professional Palette)
 * - Urgent Case Highlighting and Notes (Managed by UrgencyManager)
 * - Load All functionality for case lists
 * - SharePoint & Company Platform quick links
 * - Optimized scroll performance
 */
console.log('[SFX Ext Boot] content.js starting execution'); // Boot log

// --- Logging Setup ---
const LOG_LEVEL = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};
// SET TO DEBUG FOR DETAILED LOGGING DURING DEVELOPMENT
const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO; // Change to INFO or WARN for production
const logger = {
    error: (...args) => console.error('[SFX Ext Error]', ...args),
    warn: (...args) => { if (CURRENT_LOG_LEVEL >= LOG_LEVEL.WARN) console.warn('[SFX Ext Warn]', ...args); },
    info: (...args) => { if (CURRENT_LOG_LEVEL >= LOG_LEVEL.INFO) console.log('[SFX Ext Info]', ...args); },
    debug: (...args) => { if (CURRENT_LOG_LEVEL >= LOG_LEVEL.DEBUG) console.log('[SFX Ext Debug]', ...args); }
};
logger.debug("Logger initialized with level:", CURRENT_LOG_LEVEL);

// --- Constants ---
const SHAREPOINT_URLS = {
  audit: "https://yourcompany.sharepoint.com/sites/YourSite/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FYourSite%2FShared%20Documents%2FPath%2FAudits&viewid=your-view-id&q=",
  payroll: "https://yourcompany.sharepoint.com/sites/YourSite/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FYourSite%2FShared%20Documents%2FPath%2FPayroll&viewid=your-view-id&q="
};
const BUTTON_STYLES = `
  border: 1px solid #dddbda; border-radius: 4px; background-color: white;
  padding: 0; margin: 0 2px; width: 24px; height: 24px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  vertical-align: middle; transition: all 0.1s ease-in-out;
`;
const searchSvg = `<img src="https://yourcompany.sharepoint.com/favicon.ico" alt="SharePoint" style="width: 16px; height: 16px;"/>`; // Generic SP icon
const roleSvg = `<img src="https://platform.yourcompany.com/favicon.ico" alt="YourCompany Platform" style="width: 16px; height: 16px;"/>`; // Generic platform icon
logger.debug("Constants defined.");

// --- CSS Injection ---
const MODAL_COLOR_PICKER_CSS = `
/* Ensure base form-group styles exist or are compatible */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* --slds-spacing-x-small */
}
.form-group label {
  font-size: 0.75rem; /* 12px */
  font-weight: 500;
  color: #3e3e3c; /* SLDS label color */
  margin-bottom: 0;
}
/* Specific styles for the inline color picker group */
.form-group-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem; /* --slds-spacing-x-small */
}
.form-group-inline label {
    margin-bottom: 0;
    flex-shrink: 0;
}
/* Style the color input itself */
.form-group input[type="color"] { /* Target specifically within form-group */
    padding: 0;
    height: 32px; /* Match SLDS input height */
    width: 40px; /* Match popup width */
    vertical-align: middle;
    border: 1px solid #dddbda; /* SLDS border */
    border-radius: 0.25rem; /* --slds-border-radius-medium */
    cursor: pointer;
    background-color: white; /* Ensure background */
    box-sizing: border-box;
}
/* Style the inline clear button */
.inline-button {
    padding: 0 0.5rem; /* --slds-spacing-x-small */
    height: 24px; /* Smaller button */
    font-size: 0.75rem; /* 12px */
    border: 1px solid #dddbda; /* SLDS border */
    border-radius: 4px;
    background-color: #fff;
    color: #0176d3; /* Match popup secondary button text */
    cursor: pointer;
    margin-left: 5px;
    vertical-align: middle;
    flex-shrink: 0;
    transition: background-color 0.2s ease;
}
.inline-button:hover { background-color: #f3f2f2; /* SLDS hover */ }
/* Style the help text */
.form-group small {
    font-size: 0.75rem; /* 12px */
    color: #514f4d; /* SLDS help text color */
    flex-shrink: 0; /* Prevent shrinking */
    margin-left: 5px;
}
`;

// --- Global State ---
let isScrolling = false;
let scrollTimeout = null;
let currentTableObserver = null; // Store the active table observer instance
let currentScrollContainer = null; // Store the scroll container for easy access
let currentUrlObserver = null; // Store the URL observer instance
let currentSubtabObserver = null; // Store the subtab observer instance
logger.debug("Global state variables initialized.");

// --- Helper Functions ---
/** Injects CSS into the page head */
function injectCSS(cssContent, id) {
    if (document.getElementById(id)) {
        logger.debug(`CSS with id '${id}' already injected.`);
        return;
    }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssContent;
    document.head.appendChild(style);
    logger.debug(`Injected CSS with id '${id}'.`);
}


// --- Initialization ---
(async function() {
    logger.debug("IIFE Initializer starting...");
    try {
        logger.info('Initializing Salesforce Enhancement Suite...');

        // Inject Material Symbols font
        if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
            const fontLink = document.createElement('link');
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
            logger.debug("Material Symbols font link injected.");
        } else {
            logger.debug("Material Symbols font link already present.");
        }

        // Inject CSS for the color picker modal elements
        injectCSS(MODAL_COLOR_PICKER_CSS, 'sfx-modal-color-picker-styles');


        // Initialize Urgency Manager with dependencies
        logger.debug("Checking for UrgencyManager...");
        if (typeof UrgencyManager !== 'undefined') {
            logger.debug("UrgencyManager found, calling init().");
            UrgencyManager.init({
                logger: logger,
                getCaseDataFromRow: getCaseDataFromRow, // Pass the function reference
                getStatusRowColor: getStatusRowColor,   // Pass the function reference
                buttonStyles: BUTTON_STYLES,            // Pass the base button styles string
                getCaseDataFromDetailView: getCaseDataFromDetailView // <-- Pass detail view function
            });
        } else {
            // This error means urgencyManager.js didn't load or define UrgencyManager globally
            logger.error("UrgencyManager is not defined. Ensure urgencyManager.js is loaded before content.js in manifest.json and defines 'UrgencyManager'.");
        }

        // Wait for DOM ready if necessary
        if (document.readyState === 'loading') {
            logger.debug('Document state is loading, waiting for DOMContentLoaded event.');
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            logger.debug('DOMContentLoaded event fired.');
        } else {
             logger.debug(`Document readyState is '${document.readyState}'. Proceeding without waiting.`);
        }

        logger.info('Document ready, calling main initialize function.');
        await initialize(); // Setup observers and initial run

        logger.info("IIFE Initializer finished successfully.");

    } catch (err) {
        logger.error('Critical error during IIFE initialization:', err);
    }
})();

// --- Core Logic ---

function debounce(func, wait) {
    let timeout;
    // logger.debug(`Debounce created for function: ${func.name || 'anonymous'}`); // Can be noisy
    return function executedFunction(...args) {
        const context = this;
        // logger.debug(`Debounced function '${func.name || 'anonymous'}' called. Clearing previous timeout.`); // Can be noisy
        const later = () => {
            timeout = null;
            // logger.debug(`Executing debounced function '${func.name || 'anonymous'}' after wait.`); // Can be noisy
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function waitForElement(selector, timeout = 10000) {
    logger.debug(`waitForElement called for selector: "${selector}" with timeout: ${timeout}ms`);
    return new Promise((resolve) => { // Removed reject for graceful handling
        const startTime = Date.now();
        const intervalTime = 250;
        let attempts = 0;

        const check = () => {
            attempts++;
            const element = document.querySelector(selector);
            if (element) {
                logger.debug(`Element "${selector}" found after ${Date.now() - startTime}ms and ${attempts} attempts.`);
                resolve(element);
            } else if (Date.now() - startTime < timeout) {
                // logger.debug(`Element "${selector}" not found yet, attempt ${attempts}. Retrying in ${intervalTime}ms.`); // Can be very noisy
                setTimeout(check, intervalTime);
            } else {
                logger.warn(`Element "${selector}" not found after ${timeout}ms and ${attempts} attempts. Resolving with null.`);
                resolve(null); // Resolve with null instead of rejecting
            }
        };
        check();
    });
}

function getViewType(url) {
    logger.debug(`getViewType called with URL: ${url}`);
    if (!url) {
        logger.warn("getViewType called with null or empty URL.");
        return 'unknown';
    }
    if (url.includes('/lightning/o/Case/list') || url.includes('/o/Case/list')) {
         if (url.includes('filterName=My_Payroll_Files_View')) { // Genericized filter name
             logger.debug('Detected view type: list-payroll');
             return 'list-payroll';
         }
         logger.debug('Detected view type: list');
         return 'list';
    }
    if (url.includes('/lightning/r/Case/') && url.includes('/view')) {
        logger.debug('Detected view type: detail');
        return 'detail';
    }
    logger.debug('Detected view type: unknown');
    return 'unknown';
}

// --- Load All Functionality ---

function addLoadAllButton() {
    logger.debug('addLoadAllButton() called.');
    try {
        const listHeaderSelector = '.slds-page-header.slds-page-header_object-home';
        const buttonGroupSelector = '.slds-button-group[role="group"]';
        const loadAllButtonSelector = '.load-all-button';

        logger.debug(`Searching for list header: "${listHeaderSelector}"`);
        const listHeader = document.querySelector(listHeaderSelector);
        if (!listHeader) {
            logger.warn('List header not found. Cannot add Load All button.');
            return;
        }
        logger.debug("List header found.");

        // Try finding the button group more flexibly - sometimes it's not directly inside the header
        let buttonGroup = listHeader.querySelector(buttonGroupSelector);
        if (!buttonGroup) {
            logger.debug(`Button group not in header, searching near header...`);
            // Look for a button group that is a sibling or near sibling of the header actions
            const headerActions = listHeader.querySelector('.forceActionsContainer');
            if (headerActions && headerActions.parentElement) {
                buttonGroup = headerActions.parentElement.querySelector(buttonGroupSelector);
            }
            // If still not found, try searching the whole document (less ideal)
            if (!buttonGroup) {
                 logger.debug(`Button group not near header actions, searching document...`);
                 buttonGroup = document.querySelector(buttonGroupSelector);
            }
        }

        if (!buttonGroup) {
            logger.warn('Button group container not found anywhere suitable. Cannot add Load All button.');
            return;
        }
        logger.debug("Button group found.");

        if (buttonGroup.querySelector(loadAllButtonSelector)) {
            logger.debug('Load All button already exists in the button group.');
            return;
        }

        logger.debug('Creating Load All button element.');
        const loadAllButton = document.createElement('button');
        loadAllButton.className = 'slds-button slds-button_neutral load-all-button';
        loadAllButton.title = 'Load all cases and group by date';
        loadAllButton.style.cssText = `margin-left: var(--lwc-spacingXSmall, 0.5rem);`;
        loadAllButton.innerHTML = `<svg class="slds-button__icon slds-button__icon_left" focusable="false" data-key="rows" aria-hidden="true" viewBox="0 0 52 52" part="icon"><path d="M48.5 10h-45C2.7 10 2 10.7 2 11.5v1C2 13.3 2.7 14 3.5 14h45c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5zM48.5 24h-45C2.7 24 2 24.7 2 25.5v1C2 27.3 2.7 28 3.5 28h45c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5zM48.5 38h-45C2.7 38 2 38.7 2 39.5v1C2 41.3 2.7 42 3.5 42h45c.8 0 1.5-.7 1.5-1.5v-1c0-.8-.7-1.5-1.5-1.5z"></path></svg><span>Load & Group</span>`;

        loadAllButton.addEventListener('click', async () => {
            logger.info('Load & Group button clicked.');
            loadAllButton.disabled = true; loadAllButton.style.cursor = 'wait';
            const span = loadAllButton.querySelector('span'); if(span) span.textContent = 'Loading...';
            try {
                await loadAllRowsWithProgress();
            } catch (error) {
                logger.error('Error during Load All process triggered by button click:', error);
                alert('Error loading all cases. Please check the console.');
                if(span) span.textContent = 'Error';
            } finally {
                // Re-enable button after a short delay
                setTimeout(() => {
                    if (loadAllButton) { // Check if button still exists
                         loadAllButton.disabled = false;
                         loadAllButton.style.cursor = 'pointer';
                         if(span) span.textContent = 'Load & Group';
                         logger.debug("Load & Group button re-enabled.");
                    }
                }, 1000);
            }
        });

        buttonGroup.appendChild(loadAllButton);
        logger.info('Load All button added successfully to button group.');

    } catch (err) {
        logger.error('Error occurred within addLoadAllButton function:', err);
    }
}

async function loadAllRowsWithProgress() {
    logger.info('loadAllRowsWithProgress() started.');
    const scrollContainer = findScrollContainer(); // Use helper function
    if (!scrollContainer) {
        logger.error('Load All failed: Could not find a scrollable container.');
        alert('Error: Could not find the table\'s scroll container to load all items.');
        return;
    }
    logger.debug("Scroll container found for Load All.");

    // --- Temporarily disable observer during load all ---
    const wasObserving = disconnectTableObserver(); // Returns true if observer was active and disconnected

    const indicatorId = 'load-all-indicator';
    let loadingIndicator = document.getElementById(indicatorId);
    if (!loadingIndicator) {
        logger.debug("Creating loading indicator element.");
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = indicatorId;
        loadingIndicator.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: rgba(0, 0, 0, 0.7); color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: background-color 0.5s ease;`;
        document.body.appendChild(loadingIndicator);
    } else {
        logger.debug("Reusing existing loading indicator element.");
    }
    // Ensure indicator content is reset
    loadingIndicator.innerHTML = `<div class="slds-spinner_container" style="position: relative; display: inline-block; width: 1rem; height: 1rem;"><div role="status" class="slds-spinner slds-spinner_brand slds-spinner_x-small"><span class="slds-assistive-text">Loading...</span><div class="slds-spinner__dot-a"></div><div class="slds-spinner__dot-b"></div></div></div><span></span>`;
    const indicatorText = loadingIndicator.querySelector('span');
    indicatorText.textContent = 'Loading cases...';
    loadingIndicator.style.display = 'flex';
    loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)'; // Reset background
    logger.debug("Loading indicator prepared and shown.");

    let lastScrollHeight = 0, currentScrollHeight = scrollContainer.scrollHeight;
    let attempts = 0, stableCount = 0;
    const maxAttempts = 50, stableThreshold = 3, scrollDelay = 600;

    logger.debug(`Starting scroll loop. Initial scrollHeight: ${currentScrollHeight}px`);
    while (attempts < maxAttempts) {
        lastScrollHeight = currentScrollHeight;
        scrollContainer.scrollTop = scrollContainer.scrollHeight; // Scroll to bottom
        attempts++;
        indicatorText.textContent = `Loading cases... (Scroll ${attempts})`;
        logger.debug(`Scrolling attempt ${attempts}: Set scrollTop to ${scrollContainer.scrollHeight}. Waiting ${scrollDelay}ms...`);

        await new Promise(resolve => setTimeout(resolve, scrollDelay)); // Delay for content load

        currentScrollHeight = scrollContainer.scrollHeight;
        logger.debug(`After delay, current scrollHeight: ${currentScrollHeight}px`);

        if (currentScrollHeight === lastScrollHeight) {
            stableCount++;
            logger.debug(`Scroll height stable (${stableCount}/${stableThreshold}) at ${currentScrollHeight}px`);
            if (stableCount >= stableThreshold) {
                logger.info(`Scroll height deemed stable after ${attempts} attempts. Assuming all rows loaded.`);
                break; // Exit loop
            }
        } else {
            stableCount = 0; // Reset stable count if height changed
            logger.debug(`Scroll height changed: ${lastScrollHeight}px -> ${currentScrollHeight}px. Resetting stable count.`);
        }

        if (attempts === maxAttempts) {
            logger.warn(`Reached max scroll attempts (${maxAttempts}). Grouping might be incomplete.`);
            alert('Reached maximum scroll attempts. Some cases might not be loaded or grouped.');
        }
    }
    logger.debug("Scroll loop finished.");

    try {
        logger.debug("Attempting final processing after scrolling.");
        indicatorText.textContent = 'Processing rows...';
        const tableSelector = '.slds-table.forceRecordLayout.slds-table--header-fixed';
        logger.debug(`Waiting for table element: "${tableSelector}"`);
        const table = await waitForElement(tableSelector, 5000);
        if (table) {
            logger.debug("Table found. Refreshing groups and adding buttons.");
            // Group first, then add buttons (which includes urgency check)
            await refreshTableGroups(table); // This calls groupRowsByDate and addButtonsToBswiftIds
            logger.info('All rows loaded and processed successfully.');
            indicatorText.textContent = '✓ All Loaded & Grouped';
            loadingIndicator.style.background = 'rgba(75, 181, 67, 0.8)'; // Green success
        } else {
            // This should ideally not happen if scrolling worked, but handle it.
            logger.error('Load All Error: Table element not found after loading rows.');
            throw new Error('Table element not found after loading.');
        }
    } catch (processingError) {
         logger.error('Error during final processing after Load All scroll:', processingError);
         indicatorText.textContent = 'Error during processing!';
         loadingIndicator.style.background = 'rgba(217, 54, 36, 0.8)'; // Red error
         alert('Error processing rows after loading. Check console for details.');
    } finally {
        logger.debug("Load All 'finally' block executing.");
        // --- Reconnect observer if it was active before ---
        if (wasObserving) {
            logger.debug("Attempting to reconnect table observer.");
            reconnectTableObserver();
        } else {
            logger.debug("Table observer was not active before Load All, no need to reconnect.");
        }
        // Hide indicator after a delay
        setTimeout(() => {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
                logger.debug("Loading indicator hidden.");
            }
        }, 3000);
        logger.info('loadAllRowsWithProgress() finished.');
    }
}


// --- Data Extraction & Formatting ---

function formatDate(dateStr) {
    // logger.debug(`formatDate called with: "${dateStr}"`); // Can be noisy
    if (!dateStr || typeof dateStr !== 'string') {
        // logger.debug("formatDate returning null due to invalid input."); // Can be noisy
        return null;
    }
    try {
        // Handle potential variations like "4/25/2025, 3:00 PM"
        const datePart = dateStr.split(',')[0].trim();
        if (!datePart) {
             logger.warn(`formatDate: Could not extract date part from "${dateStr}".`);
             return null;
        }

        // Attempt parsing with common US format M/D/YYYY
        const parts = datePart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (parts) {
            const year = parseInt(parts[3], 10);
            const month = parseInt(parts[1], 10); // Month is 1-indexed in input
            const day = parseInt(parts[2], 10);

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                 const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                 // logger.debug(`formatDate successful (M/D/YYYY): "${dateStr}" -> "${formatted}"`); // Can be noisy
                 return formatted;
            }
        }

        // Fallback to Date constructor (less reliable for ambiguous formats)
        const parsedDate = new Date(datePart);
        if (isNaN(parsedDate.getTime())) {
             logger.warn(`formatDate: Could not parse date part "${datePart}" into a valid Date object.`);
             return null;
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        logger.debug(`formatDate successful (fallback): "${dateStr}" -> "${formatted}"`); // Can be noisy
        return formatted;

    } catch (err) {
        logger.warn(`Error during formatDate for input "${dateStr}":`, err);
        return null;
    }
}

/**
 * Formats total minutes into a string like "Xh Ym".
 * @param {number} totalMinutes - The total number of minutes.
 * @returns {string} Formatted time string (e.g., "2h 30m", "1h", "45m", "0m").
 */
function formatTimeDisplay(totalMinutes) {
    // logger.debug(`formatTimeDisplay called with: ${totalMinutes} minutes`); // Can be noisy
    if (isNaN(totalMinutes) || totalMinutes < 0) {
        // logger.debug("formatTimeDisplay returning '0m' due to invalid input."); // Can be noisy
        return '0m';
    }
    if (totalMinutes === 0) return '0m';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60); // Round remaining minutes

    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}h`;
    }
    if (minutes > 0) {
        if (formatted.length > 0) formatted += ' '; // Add space if hours are present
        formatted += `${minutes}m`;
    }

    // logger.debug(`formatTimeDisplay successful: ${totalMinutes} minutes -> "${formatted}"`); // Can be noisy
    return formatted;
}

/**
 * Extracts case data from a table row.
 * Assumes 'Estimated Time' is in MINUTES.
 * @param {HTMLTableRowElement} row - The table row element.
 * @returns {object | null} An object containing case data or null if extraction fails.
 */
function getCaseDataFromRow(row) {
    // logger.debug("getCaseDataFromRow called for row:", row); // Very noisy
    if (!row || row.nodeName !== 'TR') {
        logger.warn("getCaseDataFromRow called with invalid row element:", row);
        return null; // Return null for invalid input
    }
    const data = {
        caseId: '', accountName: '', bswiftId: '', subject: '',
        targetEndDate: null, status: '', estimatedTimeMinutes: 0, // Renamed for clarity
        rowElement: row // Keep a reference to the row element itself
    };
    try {
        // Selectors for specific cells/elements within the row (adjust if needed)
        const caseIdLink = row.querySelector('th[scope="row"] a[data-recordid]');
        const bswiftIdEl = row.querySelector('td:nth-child(4) .uiOutputTextArea'); // Client ID
        const accountNameEl = row.querySelector('td:nth-child(5) a.forceOutputLookup'); // Account Name
        const subjectEl = row.querySelector('td:nth-child(6) a.forceOutputLookup'); // Subject
        const targetEndDateEl = row.querySelector('td:nth-child(7) .uiOutputDateTime'); // Target End Date
        const statusEl = row.querySelector('td:nth-child(8) .slds-truncate'); // Status
        const estimatedTimeEl = row.querySelector('td:nth-child(9) .uiOutputNumber'); // Estimated Time (in minutes)

        // Extract data using optional chaining and nullish coalescing for safety
        data.caseId = caseIdLink?.dataset?.recordid || '';
        data.bswiftId = bswiftIdEl?.textContent?.trim() || '';
        data.accountName = accountNameEl?.textContent?.trim() || 'N/A';
        data.subject = subjectEl?.textContent?.trim() || 'N/A';
        data.status = statusEl?.textContent?.trim() || 'Unknown';

        const rawDate = targetEndDateEl?.textContent?.trim();
        if (rawDate) {
            data.targetEndDate = formatDate(rawDate);
            // logger.debug(`Parsed Target End Date: Raw='${rawDate}', Formatted='${data.targetEndDate}'`); // Noisy but useful
        } else {
            // logger.debug("No Target End Date found in cell."); // Noisy
        }

        // --- MODIFICATION: Assume time is in minutes ---
        const rawTime = estimatedTimeEl?.textContent?.trim();
        if (rawTime) {
            const timeText = rawTime.replace(/,/g, ''); // Remove commas
            const parsedTime = parseFloat(timeText);
            if (!isNaN(parsedTime)) {
                data.estimatedTimeMinutes = parsedTime; // Store as minutes
                // logger.debug(`Parsed Estimated Time: Raw='${rawTime}', Parsed=${data.estimatedTimeMinutes} minutes`); // Noisy
            } else {
                logger.warn(`Could not parse Estimated Time text "${timeText}" into a number for row:`, row.innerText.substring(0, 100));
                data.estimatedTimeMinutes = 0; // Default to 0 if parsing fails
            }
        } else {
            // logger.debug("No Estimated Time found in cell."); // Noisy
            data.estimatedTimeMinutes = 0; // Default to 0 if element/text not found
        }
        // --- END MODIFICATION ---

        // logger.debug("Extracted data:", data); // Can be very noisy
    } catch (err) {
        // Log error with context
        const rowHtmlStart = row.outerHTML.substring(0, 150);
        logger.warn(`Error extracting data from a row (HTML start: ${rowHtmlStart}...):`, err);
        // Return partially extracted data or null? Returning partial data might be okay.
    }
    // No need to check/set rowElement again, it's set initially.
    return data;
}

/**
 * Extracts case data from the detail view page.
 * Uses waitForElement to ensure fields are loaded.
 * @returns {Promise<object | null>} A promise resolving to an object with case data or null.
 */
async function getCaseDataFromDetailView() {
    logger.debug("getCaseDataFromDetailView called.");
    const data = {
        caseId: '', accountName: '', bswiftId: '', subject: '',
        targetEndDate: null, status: '', estimatedTimeMinutes: 0,
        rowElement: null // No row element in detail view
    };

    try {
        // Extract Case ID from URL
        const urlMatch = window.location.pathname.match(/\/Case\/([a-zA-Z0-9]{15,18})\//);
        data.caseId = urlMatch ? urlMatch[1] : '';
        if (!data.caseId) logger.warn("Could not extract Case ID from URL:", window.location.pathname);

        // Helper to find field value by label text, waiting for the field to appear
        // NOTE: This is used for fields in the main body (Account Name, bswift ID, Status, etc.)
        // Subject is handled separately below as it's in the header.
        const findFieldValueByLabel = async (label, timeout = 7000) => { // Slightly increased default timeout
            logger.debug(`findFieldValueByLabel: Searching for label: "${label}"`);
            // Wait for the specific label span itself
            const labelSelector = `span.test-id__field-label`;
            logger.debug(`Waiting for any label span: "${labelSelector}"`); // Wait for any label first
            await waitForElement(labelSelector, timeout); // Wait for *any* label to increase chances page is ready

            // Now find the specific label element
            const labelEl = Array.from(document.querySelectorAll(labelSelector))
                               .find(el => el.textContent.trim() === label);

            if (!labelEl) {
                logger.warn(`findFieldValueByLabel: Label element with text "${label}" not found after waiting.`);
                return null;
            }
            logger.debug(`findFieldValueByLabel: Label element for "${label}" found.`);

            // Navigate up to the common ancestor component that holds both label and value
            const fieldWrapper = labelEl.closest('record_flexipage-record-field');
            if (!fieldWrapper) {
                logger.warn(`findFieldValueByLabel: Could not find parent 'record_flexipage-record-field' for label "${label}".`);
                return null;
            }
            logger.debug(`findFieldValueByLabel: Parent 'record_flexipage-record-field' found for "${label}".`);

            // Find the value container relative to the label's container
            const valueContainer = fieldWrapper.querySelector('dd .test-id__field-value');
            if (!valueContainer) {
                 logger.warn(`findFieldValueByLabel: Value container ('dd .test-id__field-value') not found for label "${label}" within:`, fieldWrapper.innerHTML.substring(0, 200));
                 return null;
            }

            // --- Refined Value Extraction ---
            let extractedValue = null;

            // 1. Try specific lookup link structure first (like Account Name/ID field)
            // Target the anchor tag directly within records-hoverable-link
            const lookupLink = valueContainer.querySelector('records-hoverable-link a'); // Selector for Account Name/ID
            if (lookupLink) {
                // Get text content, trim whitespace which might include newlines from nested spans
                extractedValue = lookupLink.textContent?.trim();
                logger.debug(`findFieldValueByLabel: Extracted value for "${label}" via lookup link: "${extractedValue}"`);
            }

            // 2. Fallback to other common structures if lookup link not found or empty
            if (extractedValue === null || extractedValue === '') {
                logger.debug(`findFieldValueByLabel: Lookup link not found/empty for "${label}", trying fallbacks...`);
                const recordIdLink = valueContainer.querySelector('a[data-recordid]'); // More generic link
                const textValue = valueContainer.querySelector('lightning-formatted-text'); // Standard text, bswift ID
                const outputFieldValue = valueContainer.querySelector('lightning-output-field'); // Sometimes used
                const urlValue = valueContainer.querySelector('lightning-formatted-url a'); // URL fields
                 extractedValue = recordIdLink?.textContent?.trim() || textValue?.textContent?.trim() || outputFieldValue?.textContent?.trim() || urlValue?.textContent?.trim() || null;
                 if (extractedValue !== null) logger.debug(`findFieldValueByLabel: Extracted value for "${label}" via fallback selectors: "${extractedValue}"`);
            }

            // 3. Final fallback to raw text content (use cautiously)
            if (extractedValue === null || extractedValue === '') {
                logger.debug(`findFieldValueByLabel: Fallback selectors failed for "${label}", trying raw textContent...`);
                extractedValue = valueContainer.textContent?.trim() || null;
                if (extractedValue !== null) logger.warn(`findFieldValueByLabel: Extracted value for "${label}" via raw textContent fallback (might contain extra text). Value: "${extractedValue}"`);
            }
            // --- End Refined Value Extraction ---

            logger.debug(`findFieldValueByLabel: Final extracted value for "${label}": ${extractedValue === null ? 'null' : `"${extractedValue}"`}`);
            return extractedValue;
        };

        // --- Extract Subject from Header ---
        // Use the more specific selector based on the new HTML
        const subjectSelector = 'slot[name="primaryField"] lightning-formatted-text'; // This selector seems correct based on the provided HTML
        logger.debug(`Attempting to extract Subject from header using selector: "${subjectSelector}"`);
        const subjectElement = await waitForElement(subjectSelector, 7000); // Wait for subject element
        if (subjectElement) {
            data.subject = subjectElement.textContent?.trim() || 'N/A';
            logger.debug(`Extracted Subject from header: "${data.subject}"`);
        } else {
            logger.warn(`Could not find Subject element in header using selector: "${subjectSelector}". Defaulting to 'N/A'.`);
            data.subject = 'N/A'; // Default if not found
        }
        // --- End Subject Extraction ---

        // Extract fields using the helper - wait for each critical field
        data.bswiftId = await findFieldValueByLabel('Client ID Field') || ''; // Genericized label "Client ID Field" - replace with actual generic label if known
        // Try finding Account Name using either "Account ID" or "Account Name" label
        data.accountName = await findFieldValueByLabel('Account ID'); // Try "Account ID" first
        if (!data.accountName || data.accountName === 'N/A') {
            logger.debug("Account Name not found using 'Account ID' label, trying 'Account Name' label...");
            data.accountName = await findFieldValueByLabel('Account Name') || 'N/A'; // Fallback to "Account Name"
        }
        logger.debug(`Final Account Name extracted: "${data.accountName}"`);
        data.status = await findFieldValueByLabel('Status') || 'Unknown';
        // Non-critical fields can have shorter timeouts or no wait if less important
        // const rawDate = await findFieldValueByLabel('Target End Date', 2000);
        // if (rawDate) data.targetEndDate = formatDate(rawDate);

        logger.debug("Extracted data from detail view:", data);
        if (!data.bswiftId || !data.accountName || data.accountName === 'N/A' || !data.subject || data.subject === 'N/A') { // Added !data.accountName and !data.subject checks
            logger.warn("One or more critical fields (bswiftId, Account Name, Subject) could not be extracted from detail view.");
        }
        return data;
    } catch (err) {
        logger.error("Error extracting data from detail view:", err);
        return null;
    }
}

// --- Grouping and Styling ---

function getStatusRowColor(status) {
    // logger.debug(`getStatusRowColor called with status: "${status}"`); // Noisy
    const alpha = 0.5;
    const lowerStatus = status?.toLowerCase() || 'unknown'; // Handle null/undefined status

    switch (lowerStatus) {
        case 'in-process': return `hsla(208, 65%, 93%, ${alpha})`;
        case 'assigned': return `hsla(48, 75%, 94%, ${alpha})`;
        case 'on-hold': return `hsla(30, 65%, 94%, ${alpha})`;
        case 'pre-processing': return `hsla(265, 35%, 95%, ${alpha})`;
        case 'completed': return `hsla(140, 45%, 95%, ${alpha})`;
        case 'workflow': return `hsla(160, 60%, 94%, ${alpha})`; // Added color for workflow status
        default: return `hsla(210, 15%, 96.5%, 0.45)`; // Default includes 'unknown'
    }
}

function getGroupBackgroundColor(index) {
    // Consistent light gray, index not currently used but kept for potential future variation
    // logger.debug(`getGroupBackgroundColor called for index: ${index}`); // Noisy
    return `hsl(210, 15%, 97%)`;
}

function groupRowsByDate(table) {
    logger.debug('groupRowsByDate() called.');
    if (!table) { logger.error('groupRowsByDate: No table element provided.'); return; }
    const tbody = table.querySelector('tbody');
    if (!tbody) { logger.error('groupRowsByDate: No tbody found within the table.'); return; }
    logger.debug('Table and tbody found.');

    try {
        logger.debug("Removing existing date group banners.");
        tbody.querySelectorAll('.date-group-banner').forEach(el => el.remove());

        logger.debug("Resetting background colors and removing urgency classes from data rows.");
        const rows = Array.from(tbody.querySelectorAll('tr:not(.date-group-banner)'));
        rows.forEach(row => {
            row.style.backgroundColor = ''; // Reset background
            // Ensure urgency class is removed before re-applying status color
            if (typeof UrgencyManager !== 'undefined') {
                row.classList.remove(UrgencyManager.URGENT_ROW_CLASS);
            } else {
                // If UrgencyManager isn't loaded, we might have stale classes
                row.classList.remove('urgent-row'); // Attempt removal by known class name
            }
        });
        logger.debug(`Found ${rows.length} data rows to process.`);
        if (rows.length === 0) { logger.warn('groupRowsByDate: No data rows found to group.'); return; }

        logger.debug("Extracting data from rows...");
        const rowData = rows.map(getCaseDataFromRow).filter(data => data !== null); // Filter out nulls if getCaseDataFromRow failed
        logger.debug(`Successfully extracted data for ${rowData.length} rows.`);

        logger.debug("Grouping rows by target end date...");
        const groups = new Map();
        rowData.forEach(data => {
            const key = data.targetEndDate || 'No Date'; // Group null dates together
            if (!groups.has(key)) groups.set(key, { rows: [], totalMinutes: 0 }); // Store total time in minutes
            groups.get(key).rows.push(data);
            // --- MODIFICATION: Add estimated time in minutes ---
            if (typeof data.estimatedTimeMinutes === 'number' && !isNaN(data.estimatedTimeMinutes)) {
                groups.get(key).totalMinutes += data.estimatedTimeMinutes;
            } else {
                 logger.warn('Invalid estimatedTimeMinutes encountered during grouping:', data.estimatedTimeMinutes, 'for row:', data.rowElement?.innerText.substring(0, 100));
            }
            // --- END MODIFICATION ---
        });
        logger.debug(`Created ${groups.size} date groups.`);

        logger.debug("Sorting group keys (dates)...");
        const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
            if (a === 'No Date') return 1; // Put 'No Date' last
            if (b === 'No Date') return -1;
            // Safely compare dates
            const dateA = new Date(a + 'T00:00:00'); // Add time to avoid timezone issues
            const dateB = new Date(b + 'T00:00:00');
            if (isNaN(dateA.getTime())) return 1; // Invalid dates last
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB; // Sort by date ascending
        });

        logger.debug("Rebuilding table body with grouped rows and banners...");
        let groupIndex = 0;
        const fragment = document.createDocumentFragment();
        const colCount = table.querySelector('thead tr')?.cells?.length || 13; // Get column count dynamically, default to 13 based on HTML
        logger.debug(`Determined column count for banners: ${colCount}`);

        sortedKeys.forEach(dateKey => {
            const group = groups.get(dateKey);
            if (!group || group.rows.length === 0) {
                logger.warn(`Skipping empty group for key: ${dateKey}`);
                return;
            }
            // --- MODIFICATION: Use totalMinutes ---
            const groupTotalMinutes = group.totalMinutes; // Get final calculated time in minutes
            logger.debug(`Processing group: ${dateKey} (${group.rows.length} rows, Total Time: ${groupTotalMinutes} minutes)`);

            // Create Banner Row
            const bannerRow = document.createElement('tr');
            bannerRow.className = 'date-group-banner';
            const bannerCell = document.createElement('td');
            bannerCell.colSpan = colCount;
            bannerCell.style.cssText = `
                background-color: ${getGroupBackgroundColor(groupIndex)}; font-weight: 600;
                padding: 8px 12px; border-top: 2px solid #e5e7eb;
                border-bottom: 1px solid #e5e7eb;
                font-size: 1.05em; color: #374151;
                text-align: left; position: sticky; top: 0; z-index: 1; /* Make banner sticky */
            `;
            // --- MODIFICATION START: Add FULL weekday to formatted date ---
            const formattedDate = dateKey === 'No Date'
                ? 'No Target Date'
                : new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
            // --- MODIFICATION END ---
            const formattedTime = formatTimeDisplay(groupTotalMinutes); // Display total hours & minutes
            bannerCell.textContent = `Target Date: ${formattedDate}  |  Total Est. Time: ${formattedTime}`;
            bannerRow.appendChild(bannerCell);
            fragment.appendChild(bannerRow);
            // --- END MODIFICATION ---

            // Add Data Rows for the group
            group.rows.forEach(data => {
                if (data.rowElement) {
                    // Apply status color FIRST
                    data.rowElement.style.backgroundColor = getStatusRowColor(data.status);
                    // Urgency class was removed earlier, will be reapplied by addButtonsToBswiftIds if needed
                    fragment.appendChild(data.rowElement);
                } else {
                    // This indicates an issue in getCaseDataFromRow or the mapping
                    logger.warn('Row element missing for data during grouping append:', data.subject || data.bswiftId || 'Unknown Row');
                }
            });
            groupIndex++;
        });

        tbody.innerHTML = ''; // Clear existing content efficiently
        tbody.appendChild(fragment); // Append the sorted and grouped rows

        logger.info(`Grouping complete. ${groups.size} groups processed and appended.`);
    } catch (err) {
        logger.error('Error occurred within groupRowsByDate function:', err);
    }
}

async function refreshTableGroups(table) {
    logger.debug('refreshTableGroups() called.');
    if (!table) {
        logger.warn('refreshTableGroups: called without a table element. Aborting.');
        return;
    }
    logger.debug('Table element provided.');
    try {
        logger.debug('Calling groupRowsByDate...');
        groupRowsByDate(table); // Group rows and apply base status colors

        logger.debug('Calling addButtonsToBswiftIds after grouping...');
        // After grouping, ensure buttons and urgency states are correct for Client IDs
        // This will re-apply urgency highlights over status colors where needed
        await addButtonsToBswiftIds();

        logger.info('Table groups refreshed and buttons/urgency updated.');
    } catch (err) {
        logger.error('Error occurred within refreshTableGroups function:', err);
    }
}


// --- Button Creation & Placement ---

function createButtons(bswiftId, accountName = '') {
    logger.debug(`createButtons received accountName: "${accountName}"`); // Log received accountName
    logger.debug(`createButtons called for bswiftId: "${bswiftId}", accountName: "${accountName}"`);
    const buttonContainer = document.createElement('span');
    buttonContainer.className = 'bswift-button-container';
    // Apply styles for inline display and spacing
    buttonContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        white-space: nowrap;
        vertical-align: middle; /* Align with text */
    `;

    // --- Default SharePoint search to Payroll using Account Name ---
    const spCaseType = 'payroll';
    const spSearchTerm = accountName;
    const spSearchTarget = 'Account Name';
    logger.debug(`SharePoint button configured for Payroll search using Account Name: "${spSearchTerm}"`);

    // --- SharePoint Search Button ---
    const searchButton = document.createElement('button');
    searchButton.className = 'search-button slds-button';
    searchButton.title = `Search ${spSearchTerm || '...'} in SharePoint (Payroll)`; // Updated title
    searchButton.style = BUTTON_STYLES;
    searchButton.innerHTML = searchSvg;
    searchButton.onclick = (e) => {
        e.stopPropagation(); // Prevent potential row clicks
        logger.debug(`SharePoint button clicked. SearchTerm: "${spSearchTerm}"`); // Use spSearchTerm
        if (!spSearchTerm) { // Use spSearchTerm
            logger.warn("SharePoint button clicked, but no search term available.");
            alert(`No ${spSearchTarget} found to search`);
            return;
        }
        const searchUrl = `${SHAREPOINT_URLS[spCaseType]}${encodeURIComponent(spSearchTerm)}`; // Use payroll URL and account name
        logger.info(`Opening SharePoint Payroll URL: ${searchUrl}`);
        window.open(searchUrl, '_blank');
    };
    logger.debug("SharePoint button created.");

    // --- bswift Role Button ---
    const roleButton = document.createElement('button');
    roleButton.className = 'platform-link-button slds-button';
    roleButton.title = `Copy ID ${bswiftId || '...'} & Open YourCompany Platform`;
    roleButton.style = BUTTON_STYLES;
    roleButton.innerHTML = roleSvg;
    roleButton.onclick = async (e) => {
        e.stopPropagation();
        logger.debug(`YourCompany Platform button clicked. Client ID: "${bswiftId}"`);
        if (!bswiftId) {
            logger.warn("YourCompany Platform button clicked, but no Client ID available.");
            alert('No Client ID found to copy');
            return;
        }
        try {
            await navigator.clipboard.writeText(bswiftId);
            logger.info(`Copied bswift ID "${bswiftId}" to clipboard. Opening bswift...`);
            window.open('https://secure.bswift.com/welcome.aspx', '_blank');
        } catch (err) {
            logger.error('Clipboard API error:', err);
            alert('Failed to copy Client ID automatically. Please copy it manually.');
        }
    };
    logger.debug("YourCompany Platform button created.");

    // --- Urgency & Notes Buttons (Use UrgencyManager) ---
    let urgentButton = null;
    let notesButton = null; // <-- Add variable for notes button
    let linkButton = null; // <-- Add variable for link button
    if (typeof UrgencyManager !== 'undefined') {
        logger.debug("Calling UrgencyManager button creation functions.");
        urgentButton = UrgencyManager.createUrgentButtonElement(); // Create urgent button
        notesButton = UrgencyManager.createNotesButtonElement();   // <-- Create notes button
        linkButton = UrgencyManager.createLinkButtonElement();     // <-- Create link button
        if (urgentButton) logger.debug("Urgent button created by UrgencyManager.");
        else logger.warn("UrgencyManager.createUrgentButtonElement() returned null.");
        if (notesButton) logger.debug("Notes button created by UrgencyManager."); // <-- Log notes button creation
        else logger.warn("UrgencyManager.createNotesButtonElement() returned null.");
        if (linkButton) logger.debug("Link button created by UrgencyManager."); // <-- Log link button creation
        else logger.warn("UrgencyManager.createLinkButtonElement() returned null.");
    } else {
        logger.warn("UrgencyManager not available, cannot create urgent/notes/link buttons.");
    }

    // Append buttons that were successfully created
    buttonContainer.appendChild(searchButton);
    buttonContainer.appendChild(roleButton);
    if (urgentButton) {
        buttonContainer.appendChild(urgentButton);
        logger.debug("Urgent button appended to container.");
    }
    if (notesButton) { // <-- Append notes button if created
        buttonContainer.appendChild(notesButton);
        logger.debug("Notes button appended to container.");
    }
    if (linkButton) { // <-- Append link button if created
        buttonContainer.appendChild(linkButton);
        logger.debug("Link button appended to container.");
    }

    logger.debug("Button container populated.");
    // Return all buttons including the new ones (which might be null)
    return { buttonContainer, searchButton, roleButton, urgentButton, notesButton, linkButton }; // <-- Include linkButton
}

async function addButtonsToBswiftIds() {
    logger.debug(`addButtonsToBswiftIds() called.`);
    try {
        const tableSelector = '.slds-table.forceRecordLayout';
        logger.debug(`Waiting for table element: "${tableSelector}"`);
        const table = await waitForElement(tableSelector, 10000);
        if (!table) {
            logger.error('addButtonsToBswiftIds: List view table not found. Cannot add buttons.');
            return;
        }
        logger.debug("Table found.");

        const rowSelector = 'tbody tr:not(.date-group-banner)';
        logger.debug(`Querying for rows: "${rowSelector}"`);
        const rows = table.querySelectorAll(rowSelector);
        logger.info(`Processing ${rows.length} rows for button addition/update.`);
        let buttonsAddedCount = 0;
        let buttonsUpdatedCount = 0;
        let rowsSkippedCount = 0;

        // Use for...of to allow await inside the loop for UrgencyManager
        const bswiftIdCellSelector = 'td:nth-child(4)';
        const bswiftIdContainerSelector = '.uiOutputTextArea'; // The span containing the ID text
        const buttonContainerSelector = '.bswift-button-container'; // Our button container class
        for (const row of rows) {
            // logger.debug("Processing row:", row.innerText.substring(0, 50)); // Less noisy row identifier
            const bswiftIdCell = row.querySelector(bswiftIdCellSelector);

            if (bswiftIdCell) {
                // logger.debug("bswift ID cell (td:nth-child(4)) found for row."); // Noisy

                const bswiftIdContainer = bswiftIdCell.querySelector(bswiftIdContainerSelector);
                const existingButtonContainer = bswiftIdCell.querySelector(buttonContainerSelector);

                // Initialize button element variables for this row
                let urgentButtonElement = null;
                let notesButtonElement = null; // <-- Initialize notes button variable
                let linkButtonElement = null; // <-- Initialize link button variable

                if (bswiftIdContainer && !existingButtonContainer) {
                    // --- Create and Add NEW Buttons ---
                    // logger.debug("No existing button container found. Creating and adding buttons..."); // Noisy
                    const caseData = getCaseDataFromRow(row); // Get data once
                    if (!caseData || !caseData.bswiftId) { // Also check if bswiftId was extracted
                        logger.warn("Failed to get case data or bswiftId for row, skipping button creation.", row.innerText.substring(0, 100));
                        rowsSkippedCount++;
                        continue; // Skip this row if data extraction failed
                    }

                    // *** Ensure createButtons returns notesButton ***
                    const { buttonContainer, urgentButton, notesButton, linkButton } = createButtons(caseData.bswiftId, caseData.accountName); // <-- Get linkButton
                    urgentButtonElement = urgentButton; // Store the created urgent button
                    notesButtonElement = notesButton;   // <-- Store the created notes button
                    linkButtonElement = linkButton;     // <-- Store the created link button

                    // Insert the button container directly after the bswift ID text span
                    bswiftIdContainer.parentNode.insertBefore(buttonContainer, bswiftIdContainer.nextSibling);
                    // Optionally adjust styles if needed (e.g., on bswiftIdContainer)
                    bswiftIdContainer.style.verticalAlign = 'middle'; // Try to align text with buttons

                    buttonsAddedCount++;
                    // logger.debug("Buttons added to row."); // Noisy

                } else if (existingButtonContainer) {
                    // --- Find EXISTING Buttons ---
                    // logger.debug("Existing button container found."); // Noisy
                    if (typeof UrgencyManager !== 'undefined') {
                        urgentButtonElement = existingButtonContainer.querySelector(`.${UrgencyManager.URGENT_BUTTON_CLASS}`);
                        notesButtonElement = existingButtonContainer.querySelector(`.${UrgencyManager.NOTES_BUTTON_CLASS}`);
                        linkButtonElement = existingButtonContainer.querySelector(`.${UrgencyManager.LINK_BUTTON_CLASS}`); // <-- Find the link button too!

                        if (urgentButtonElement && notesButtonElement && linkButtonElement) { // <-- Check ALL THREE buttons were found
                            // logger.debug("Found existing urgent, notes, and link button elements."); // Noisy
                            buttonsUpdatedCount++;
                        } else {
                            // Log if either is missing
                            logger.warn(`Existing button container found, but urgent (${!!urgentButtonElement}), notes (${!!notesButtonElement}), OR link (${!!linkButtonElement}) button element is missing inside it.`, existingButtonContainer);
                            // Ensure null if querySelector failed
                            if (!urgentButtonElement) urgentButtonElement = null;
                            if (!notesButtonElement) notesButtonElement = null;
                            if (!linkButtonElement) linkButtonElement = null; // <-- Ensure linkButtonElement is null if missing
                        }
                    } else {
                         logger.warn("Existing button container found, but UrgencyManager is not available to find buttons.");
                         urgentButtonElement = null; // Ensure null if UM not available
                         notesButtonElement = null;  // Ensure null if UM not available
                         linkButtonElement = null;   // Ensure null if UM not available
                    }
                } else if (!bswiftIdContainer) {
                     logger.warn(`Could not find the bswift ID container ('${bswiftIdContainerSelector}') within the cell. Cannot add buttons.`, bswiftIdCell.innerHTML);
                     rowsSkippedCount++;
                } else {
                    // This case (bswiftIdContainer exists AND existingButtonContainer exists) is handled above
                }

                // Apply initial urgency state if the buttons exist and UrgencyManager is available
                if (urgentButtonElement && notesButtonElement && linkButtonElement && typeof UrgencyManager !== 'undefined') { // <-- Check ALL THREE exist before calling
                    // logger.debug("Calling UrgencyManager.applyInitialStateForRow for row."); // Noisy
                    try {
                        // Pass ALL THREE buttons to applyInitialStateForRow
                        await UrgencyManager.applyInitialStateForRow(row, urgentButtonElement, notesButtonElement, linkButtonElement); // <-- Pass linkButtonElement
                    } catch (applyStateError) {
                         logger.error("Error calling UrgencyManager.applyInitialStateForRow:", applyStateError, row);
                    }
                } else if (typeof UrgencyManager !== 'undefined' && (urgentButtonElement || notesButtonElement || linkButtonElement)) { // <-- Update check
                    // Optional: Add a warning if only one button was found but UM exists
                    logger.warn(`applyInitialStateForRow skipped for row because one or more buttons were missing. Urgent: ${!!urgentButtonElement}, Notes: ${!!notesButtonElement}, Link: ${!!linkButtonElement}`, row);
                } else if (typeof UrgencyManager === 'undefined') {
                    // Logged once per row if UM is missing
                    // if (!existingButtonContainer) logger.warn("UrgencyManager not loaded, cannot add or check button state for new buttons."); // Can be noisy
                    // else logger.warn("UrgencyManager not loaded, cannot check button state for existing buttons."); // Can be noisy
                }

            } else {
                 logger.warn(`Could not find bswift ID cell ('${bswiftIdCellSelector}') for row, skipping button addition:`, row.innerText.substring(0, 100));
                 rowsSkippedCount++;
            }
        } // End row loop

        logger.info(`Finished processing rows. Added: ${buttonsAddedCount}, Updated: ${buttonsUpdatedCount}, Skipped: ${rowsSkippedCount}`);
    } catch (err) {
        logger.error('Error occurred within addButtonsToBswiftIds function:', err);
    }
}

/** Adds buttons to the bswift Client ID field on the Case Detail page. */
async function addButtonsToDetailView() {
    logger.debug("addButtonsToDetailView() called for Client ID field.");
    const fieldContainerSelector = 'flexipage-field[data-field-id="RecordClient_Id_formula_cField2"]';
    const valueSelector = 'span.test-id__field-value'; // The span to append buttons after
    const controlSelector = 'div.slds-form-element__control'; // The div containing the value span
    const buttonContainerClass = 'bswift-button-container'; // Use the class name directly

    try {
        logger.debug(`Waiting for bswift ID field container: "${fieldContainerSelector}"`);
        const fieldContainer = await waitForElement(fieldContainerSelector, 20000);
        if (!fieldContainer) {
            logger.error("addButtonsToDetailView: Client ID field container not found.");
            return;
        }
        logger.debug("Client ID field container found.");

        // Find the control div and the value span within it
        const controlDiv = fieldContainer.querySelector(controlSelector);
        if (!controlDiv) {
            logger.error("addButtonsToDetailView: Control div not found within Client ID container.");
            return;
        }
        logger.debug("Control div found.");
        const valueSpan = controlDiv.querySelector(valueSelector);
        if (!valueSpan) {
            logger.error("addButtonsToDetailView: Client ID value span not found within control div.");
            return;
        }
        logger.debug("bswift ID value span found.");

        // Check if buttons already exist
        let existingButtonContainer = fieldContainer.querySelector(`.${buttonContainerClass}`);
        if (existingButtonContainer) {
            logger.debug("Buttons already exist in detail view field. Applying state.");
            // Find existing buttons and apply state (important for refreshes)
            if (typeof UrgencyManager !== 'undefined') {
                const urgentButton = existingButtonContainer.querySelector(`.${UrgencyManager.URGENT_BUTTON_CLASS}`);
                const notesButton = existingButtonContainer.querySelector(`.${UrgencyManager.NOTES_BUTTON_CLASS}`);
                const linkButton = existingButtonContainer.querySelector(`.${UrgencyManager.LINK_BUTTON_CLASS}`);
                const caseData = await getCaseDataFromDetailView(); // Re-fetch data for composite key
                if (caseData && UrgencyManager.createTaskCompositeKey && urgentButton && notesButton && linkButton) { // Check if function exists
                    const compositeKey = UrgencyManager.createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
                    if (compositeKey) {
                        await UrgencyManager.applyInitialStateForDetail(urgentButton, notesButton, linkButton, compositeKey, caseData); // Pass caseData too
                    } else {
                         logger.warn("Could not generate composite key to reapply state in detail view.");
                    }
                } else {
                    logger.warn("Could not find all existing buttons, case data, or UrgencyManager functions to reapply state in detail view.");
                }
            }
            return; // Exit if buttons exist
        }

        logger.debug("Extracting case data for detail view buttons...");
        const caseData = await getCaseDataFromDetailView();
        logger.debug("Case data extracted for detail view (addButtonsToDetailView):", caseData); // Log extracted data here too
        if (!caseData || !caseData.bswiftId || !caseData.accountName || !caseData.subject) { // Ensure critical data is present
            logger.error("addButtonsToDetailView: Failed to get critical case data (ID, Account, Subject) for detail view. Cannot add buttons.");
            return;
        }

        logger.debug("Creating buttons for detail view...");
        logger.debug(`Passing accountName to createButtons (detail view): "${caseData.accountName}"`); // Log accountName being passed
        // createButtons now creates all 5 buttons
        const { buttonContainer, urgentButton, notesButton, linkButton } = createButtons(caseData.bswiftId, caseData.accountName);

        // Apply flex styles to the control div for alignment
        controlDiv.style.display = 'flex';
        controlDiv.style.justifyContent = 'space-between'; // Pushes value and buttons apart
        controlDiv.style.alignItems = 'center'; // Vertically aligns items

        // Remove margin-left from button container as space-between handles spacing
        buttonContainer.style.marginLeft = '0';
        controlDiv.appendChild(buttonContainer); // Append buttons INSIDE the control div
        logger.info("Buttons added to detail view Client ID field.");

        // Apply initial state using the composite key and pass caseData
        if (typeof UrgencyManager !== 'undefined' && UrgencyManager.createTaskCompositeKey && urgentButton && notesButton && linkButton) { // Check if function exists
            const compositeKey = UrgencyManager.createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
            if (compositeKey) {
                await UrgencyManager.applyInitialStateForDetail(urgentButton, notesButton, linkButton, compositeKey, caseData); // Pass caseData too
            } else {
                 logger.warn("Could not generate composite key to apply initial state in detail view.");
            }
        }

    } catch (err) {
        logger.error("Error in addButtonsToDetailView:", err);
    }
}

// --- Observers and Refresh Logic ---

function findScrollContainer() {
    logger.debug("findScrollContainer() called.");
    // Prioritize the container specific to the list view grid - often contains uiScroller
    const gridScrollerSelector = '.slds-table--header-fixed_container .uiScroller';
    const gridScroller = document.querySelector(gridScrollerSelector);
    if (gridScroller && gridScroller.scrollHeight > gridScroller.clientHeight + 5) { // Check if actually scrollable
        logger.debug(`Found scrollable container via primary selector: "${gridScrollerSelector}"`);
        return gridScroller;
    } else if (gridScroller) {
         logger.debug(`Found element via primary selector "${gridScrollerSelector}", but it's not significantly scrollable (scrollHeight: ${gridScroller.scrollHeight}, clientHeight: ${gridScroller.clientHeight}). Trying fallbacks.`);
    } else {
         logger.debug(`Primary scroll container selector "${gridScrollerSelector}" not found. Trying fallbacks.`);
    }

    // Fallback selectors
    const selectorsToTry = [
        '.oneConsoleLayout .uiScroller.scrollable.scroller-wrapper', // More specific console selector
        '#brandBand_1 .uiScroller.scroller-wrapper', // Older selector
        '.oneConsoleLayout .uiScroller', // Console view specific
        '.uiScroller.scroller-wrapper.scroll-bidirectional.native', // Another common pattern
        '.slds-scrollable_y', // General SLDS scrollable area
        'div.uiScroller[data-widgetid*="scrollable"]' // More specific uiScroller
    ];
    for (const selector of selectorsToTry) {
        const container = document.querySelector(selector);
        // Check if element exists and is scrollable (height difference)
        if (container && container.scrollHeight > container.clientHeight + 5) { // Added threshold
            logger.debug(`Found scrollable container with fallback selector: "${selector}"`);
            return container;
        } else if (container) {
             logger.debug(`Found element via fallback selector "${selector}", but it's not significantly scrollable. Continuing search.`);
        }
    }
    logger.warn('findScrollContainer: Could not find a suitable scrollable container after checking all selectors.');
    return null;
}

// Debounced function to handle actions after scrolling stops
const handleScrollEnd = debounce(async () => {
    logger.debug("handleScrollEnd (debounced) executing.");
    if (!isScrolling) {
        logger.debug("handleScrollEnd: 'isScrolling' is false, returning.");
        return;
    }
    isScrolling = false; // Mark scrolling as ended
    logger.debug("handleScrollEnd: 'isScrolling' set to false. Reconnecting observer and refreshing table.");

    reconnectTableObserver(); // Reconnect observer first

    // Refresh table content *after* reconnecting
    const table = document.querySelector('.slds-table.forceRecordLayout');
    if (table) {
        logger.debug("handleScrollEnd: Table found, calling refreshTableGroups.");
        await refreshTableGroups(table); // This now includes button/urgency updates
    } else {
        logger.warn('handleScrollEnd: Table not found after scroll end. Cannot refresh.');
    }
}, 750); // Debounce time

// Function called directly by the scroll event listener
function handleScroll() {
    // logger.debug("handleScroll event fired."); // Very noisy
    if (!isScrolling) {
        isScrolling = true; // Mark scrolling as started
        logger.debug('Scroll started. Disconnecting table observer.');
        disconnectTableObserver(); // Disconnect immediately on scroll start
    } else {
        // logger.debug("Scroll event fired while already scrolling."); // Noisy
    }
    // Always reset the debounce timer on scroll
    handleScrollEnd();
}

function disconnectTableObserver() {
    logger.debug("disconnectTableObserver() called.");
    if (currentTableObserver) {
        try {
            currentTableObserver.disconnect();
            logger.info('Table observer disconnected.');
            // Don't nullify currentTableObserver here, keep the instance for potential reconnection
            return true; // Indicate successful disconnection
        } catch (error) {
            logger.warn('Error disconnecting table observer (might already be disconnected or element gone):', error);
            // If error occurs, maybe nullify it
            // currentTableObserver = null;
        }
    } else {
        logger.debug("No active table observer to disconnect.");
    }
    return false; // Indicate observer was not active or failed to disconnect
}

function reconnectTableObserver() {
    logger.debug("reconnectTableObserver() called.");
    if (currentTableObserver && currentScrollContainer) {
        logger.debug("Found existing observer instance and scroll container.");
        // Re-find the table within the container in case the DOM was heavily modified
        const table = currentScrollContainer.querySelector('.slds-table.forceRecordLayout');
        if (table) {
             const tbody = table.querySelector('tbody');
             const thead = table.querySelector('thead');
             if (!tbody) {
                 logger.warn("reconnectTableObserver: Cannot find tbody within table to observe.");
                 // Optionally disconnect fully if tbody is gone?
                 // currentTableObserver.disconnect(); currentTableObserver = null;
                 return;
             }
             try {
                 logger.debug("Observing tbody for childList changes.");
                 currentTableObserver.observe(tbody, { childList: true, subtree: false });
                 if (thead) {
                     logger.debug("Observing thead for attribute changes (sorting).");
                     currentTableObserver.observe(thead, { attributes: true, subtree: true, attributeFilter: ['aria-sort'] });
                 } else {
                     logger.debug("reconnectTableObserver: thead not found, skipping sort observation.");
                 }
                 logger.info('Table observer reconnected.');
             } catch (error) {
                 logger.error('Error reconnecting table observer (element might be gone):', error);
                 // If reconnection fails, maybe fully disconnect and nullify
                 try { currentTableObserver.disconnect(); } catch (e) { /* ignore */ }
                 currentTableObserver = null;
             }
        } else {
             logger.warn('reconnectTableObserver: Could not find table within scroll container. Observer not reconnected.');
             // Nullify observer if table is gone
             currentTableObserver = null;
        }
    } else {
        if (!currentTableObserver) logger.debug("reconnectTableObserver: No observer instance exists.");
        if (!currentScrollContainer) logger.debug("reconnectTableObserver: No scroll container reference exists.");
    }
}

function setupTableObserver(table, scrollContainer) {
    logger.debug("setupTableObserver() called.");
    if (!table || !scrollContainer) {
        logger.error('setupTableObserver: Cannot setup observer without both table and scroll container elements.');
        return null;
    }
    logger.debug("Table and scroll container provided.");

    // Ensure any previous observer is fully disconnected and state reset
    disconnectTableObserver();
    currentTableObserver = null;
    currentScrollContainer = null; // Reset container ref as well

    // Debounce mutation handling to avoid rapid refreshes from minor changes
    const debouncedMutationRefresh = debounce(async (mutations) => {
        logger.debug(`Table MutationObserver callback triggered with ${mutations.length} mutations.`);
        if (isScrolling) {
            logger.debug('Mutation detected during scroll, ignoring refresh.');
            return; // Don't refresh if user is actively scrolling
        }

        // Check if mutations indicate a meaningful change (rows added/removed or sort changed)
        const isRowChange = mutations.some(m =>
            m.target.nodeName === 'TBODY' && m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
        );
        const isSortChange = mutations.some(m =>
            m.type === 'attributes' && m.attributeName === 'aria-sort'
        );

        if (isRowChange || isSortChange) {
            logger.info(`Meaningful table mutation detected (Rows changed: ${isRowChange}, Sort changed: ${isSortChange}). Refreshing groups and buttons.`);
            // Re-find the table element in case it was replaced
            const currentTable = document.querySelector('.slds-table.forceRecordLayout');
            if (currentTable) {
                await refreshTableGroups(currentTable);
            } else {
                logger.warn("MutationObserver: Table element not found when trying to refresh.");
            }
        } else {
            logger.debug('Table mutation detected, but deemed minor (e.g., internal attribute change). Skipping refresh.');
        }
    }, 1500); // Debounce time for mutation handling

    const observer = new MutationObserver(debouncedMutationRefresh);
    const tbody = table.querySelector('tbody');
    const thead = table.querySelector('thead');

    if (!tbody) {
        logger.error("setupTableObserver: Cannot find tbody within the table. Observer not fully set up.");
        // Proceed without tbody observation? Or return null? Returning null seems safer.
        return null;
    }

    logger.debug("Observing tbody for childList changes.");
    observer.observe(tbody, { childList: true, subtree: false }); // Observe only direct children add/remove

    if (thead) {
        logger.debug("Observing thead for attribute changes (sorting).");
        observer.observe(thead, { attributes: true, subtree: true, attributeFilter: ['aria-sort'] });
    } else {
        logger.debug("setupTableObserver: thead not found, skipping sort observation.");
    }

    logger.info('New table observer created and attached.');
    currentTableObserver = observer; // Store the new observer instance
    currentScrollContainer = scrollContainer; // Store the associated container

    // Setup scroll listener on the identified container
    // Remove any potentially stale listener first
    logger.debug("Removing any existing scroll listener from container.");
    scrollContainer.removeEventListener('scroll', handleScroll);
    logger.debug("Adding new scroll listener to container.");
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    logger.info('Scroll listener added to container.');

    return observer; // Return the observer instance
}

function setupUrlChangeDetection() {
    logger.debug("setupUrlChangeDetection() called.");
    // Disconnect previous observer if it exists
    if (currentUrlObserver) {
        logger.debug("Disconnecting previous URL observer.");
        try { currentUrlObserver.disconnect(); } catch(e) { logger.warn("Minor error disconnecting previous URL observer", e); }
        currentUrlObserver = null;
    }

    let lastUrl = window.location.href;
    logger.debug(`Initial URL for detection: ${lastUrl}`);

    // Debounced function to handle the actual refresh logic
    const debouncedUrlCheckAndRefresh = debounce(async () => {
        const currentUrl = window.location.href;
        logger.debug(`Debounced URL check running. Current: ${currentUrl}, Last: ${lastUrl}`);
        if (currentUrl !== lastUrl) {
            logger.info(`URL change confirmed: ${lastUrl} -> ${currentUrl}. Triggering forceRefresh.`);
            lastUrl = currentUrl;
            await forceRefresh(); // Trigger a full refresh on URL change
        } else {
            logger.debug('URL is the same as last check, no refresh needed.');
        }
    }, 750); // Debounce URL checks

    // Use MutationObserver on body subtree for broader detection (catches many SPA navigations)
    try {
        const observer = new MutationObserver((mutationsList) => {
             // We don't need to inspect mutations, just trigger the debounced check
             // logger.debug(`Body MutationObserver triggered (${mutationsList.length} mutations). Calling debounced check.`); // Very Noisy
             debouncedUrlCheckAndRefresh();
        });
        // Observe attributes as well, as sometimes URL changes might correlate with body attributes
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        currentUrlObserver = observer; // Store the new observer
        logger.debug("Body MutationObserver set up for URL change detection.");
    } catch (error) {
        logger.error("Failed to set up Body MutationObserver for URL changes:", error);
    }


    // Also listen for hash changes, still relevant in some Lightning scenarios
    window.removeEventListener('hashchange', debouncedUrlCheckAndRefresh); // Remove previous listener if any
    window.addEventListener('hashchange', debouncedUrlCheckAndRefresh);
    logger.debug("hashchange event listener added for URL change detection.");

    logger.info('URL change detection setup complete (MutationObserver + hashchange).');
}

function setupSubtabObserver() {
    logger.debug("setupSubtabObserver() called.");
    // Disconnect previous observer if it exists
    if (currentSubtabObserver) {
        logger.debug("Disconnecting previous subtab observer.");
        try { currentSubtabObserver.disconnect(); } catch(e) { logger.warn("Minor error disconnecting previous subtab observer", e); }
        currentSubtabObserver = null;
    }

    // Debounced function to handle the actual refresh logic after a tab change
    const handleSubtabChange = debounce(async () => {
        logger.info("Subtab change detected (debounced). Triggering forceRefresh.");
        await forceRefresh(); // Trigger a full refresh
    }, 850); // Slightly longer debounce for tab switches

    // Find the container for the main workspace tabs
    const tabBarContainerSelector = 'div.tabBarContainer';
    const tabBarContainer = document.querySelector(tabBarContainerSelector);
    if (!tabBarContainer) {
        logger.warn(`setupSubtabObserver: Could not find tab bar container ('${tabBarContainerSelector}'). Subtab detection inactive.`);
        return;
    }
    logger.debug("Tab bar container found.");

    // Observe the container for changes to the 'aria-selected' or 'class' attributes of descendant tabs
    try {
        const observer = new MutationObserver((mutationsList) => {
            // Check if any mutation involves the 'aria-selected' or 'class' attribute of a tab item
            const isTabSwitch = mutationsList.some(mutation =>
                mutation.type === 'attributes' &&
                (mutation.attributeName === 'aria-selected' || mutation.attributeName === 'class') &&
                mutation.target.closest('li.oneConsoleTabItem') // Ensure the change happened on a tab item
            );
            if (isTabSwitch) {
                logger.debug("Subtab attribute mutation detected. Calling debounced handler.");
                handleSubtabChange();
            }
        });
        observer.observe(tabBarContainer, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'class'] });
        currentSubtabObserver = observer; // Store the new observer
        logger.info("Subtab observer attached to tab bar container.");
    } catch (error) { logger.error("Failed to set up Subtab MutationObserver:", error); }
}

// *** UPDATED forceRefresh function ***
async function forceRefresh() {
    logger.info('forceRefresh() triggered.');
    // 1. Clean up existing observers and listeners
    logger.debug("Disconnecting table observer.");
    disconnectTableObserver(); // Disconnects but keeps instance if possible
    if (currentScrollContainer) {
        logger.debug("Removing scroll listener from current scroll container.");
        currentScrollContainer.removeEventListener('scroll', handleScroll);
    } else {
        logger.debug("No current scroll container to remove listener from.");
    }

    // 2. Reset global state variables related to observers/scroll
    currentScrollContainer = null; // Always reset container ref
    isScrolling = false;
    logger.debug("Observer/scroll state reset.");

    // 3. Determine view type and execute logic
    try {
        const currentUrl = window.location.href;
        const viewType = getViewType(currentUrl);
        logger.info(`Refreshing view. URL: ${currentUrl}, Detected View Type: ${viewType}`);

        if (viewType.startsWith('list')) {
            logger.debug("View type is list, proceeding with list view setup.");

            // Wait for the table AND at least one row in the tbody as a better ready indicator
            const listReadyIndicatorSelector = '.slds-table.forceRecordLayout tbody tr';
            logger.debug(`Waiting for list view ready indicator: "${listReadyIndicatorSelector}"`);
            const firstRow = await waitForElement(listReadyIndicatorSelector, 15000);
            if (!firstRow) {
                 logger.error("forceRefresh: List view table content (first row) not found. Aborting list setup.");
                 return;
            }
            logger.debug("List view ready indicator (first row) found.");
            const table = firstRow.closest('.slds-table.forceRecordLayout'); // Get the table containing the row
            if (!table) {
                 logger.error("forceRefresh: Could not find parent table for the first row. Aborting list setup.");
                 return;
            }
             logger.debug("Parent table found via first row.");

            addLoadAllButton(); // Attempt to add the button (safe to call even if it exists)

            // Retry finding scroll container
            let scrollContainer = null;
            let findAttempts = 0;
            const maxFindAttempts = 5;
            const findRetryDelay = 500; // ms

            while (!scrollContainer && findAttempts < maxFindAttempts) {
                findAttempts++;
                logger.debug(`Searching for scroll container (Attempt ${findAttempts}/${maxFindAttempts}).`);
                scrollContainer = findScrollContainer(); // findScrollContainer has its own logging
                if (!scrollContainer && findAttempts < maxFindAttempts) {
                    logger.debug(`Scroll container not found or not scrollable yet. Retrying in ${findRetryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, findRetryDelay));
                }
            }

            if (table && scrollContainer) {
                 logger.info("Table and scroll container found. Performing initial group/button processing and setting up observer.");
                 // Initial setup: Group first, then add buttons/urgency
                 await refreshTableGroups(table);
                 // Setup observer AND scroll listener *after* initial setup
                 setupTableObserver(table, scrollContainer); // setupTableObserver handles logging
            } else {
                 if (!table) logger.error('forceRefresh: Table element not found within list view after waiting. Cannot process rows or set up observer.');
                 if (!scrollContainer) logger.error(`forceRefresh: Scroll container not found for list view after ${findAttempts} attempts. Cannot set up scroll handling or observer.`);
            }
        } else if (viewType === 'detail') {
            logger.info('Detail view detected. Adding buttons to detail view.');
            await addButtonsToDetailView(); // <-- Call the detail view function
        } else {
            logger.info(`View type "${viewType}" is not a target list or detail view. Skipping actions.`);
        }
        logger.info("forceRefresh() completed.");
    } catch (err) {
        logger.error('Error occurred within forceRefresh function:', err);
    }
}
// *** END UPDATED forceRefresh function ***

async function initialize() {
    logger.info('=== Main Initialize Function Start ===');
    // Clean up any potential remnants from previous loads/errors
    logger.debug("Performing pre-initialization cleanup...");
    if (currentUrlObserver) {
        try { currentUrlObserver.disconnect(); logger.debug("Disconnected existing URL observer."); } catch (e) { /* ignore */ }
        currentUrlObserver = null;
    }
    if (currentSubtabObserver) { // Disconnect subtab observer too
        try { currentSubtabObserver.disconnect(); logger.debug("Disconnected existing subtab observer."); } catch (e) { /* ignore */ }
        currentSubtabObserver = null;
    }
    disconnectTableObserver(); // Disconnects table observer
    if (currentScrollContainer) {
        currentScrollContainer.removeEventListener('scroll', handleScroll); // Remove scroll listener
        logger.debug("Removed existing scroll listener.");
    }
    // Reset state fully
    currentTableObserver = null;
    currentScrollContainer = null;
    isScrolling = false;
    logger.debug("Pre-initialization cleanup complete.");

    // Setup URL change detection first - this will trigger forceRefresh on subsequent changes
    setupUrlChangeDetection();

    // Setup Subtab change detection
    setupSubtabObserver();

    // Perform initial refresh based on the current URL/state *now*
    logger.debug("Performing initial forceRefresh on load.");
    await forceRefresh();

    logger.info('=== Main Initialize Function Complete ===');
}


// --- Preserved Tracking Functions (Placeholders - Not Implemented) ---
// Kept for potential future use, currently do nothing functional.
async function getCaseForClientId(clientId) { logger.debug('getCaseForClientId called - Not Implemented'); return null; }
async function addTrackedCase(bswiftId, subject, accountName = '') { logger.debug('addTrackedCase called - Not Implemented'); }
async function removeTrackedCase(bswiftId, subject, accountName) { logger.debug('removeTrackedCase called - Not Implemented'); }
async function cleanupTrackedCases() { logger.debug('cleanupTrackedCases called - Not Implemented'); }
async function isRowTracked(bswiftId) { logger.debug('isRowTracked called - Not Implemented'); return false; }
function updateTrackButtonState(button, isTracked) { logger.debug('updateTrackButtonState called - Not Implemented'); }
async function handleTrackButtonClick(e, bswiftId) { logger.debug('handleTrackButtonClick called - Not Implemented'); e.stopPropagation(); alert('Case tracking is not currently implemented.'); }
// --- End Preserved Functions ---

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Determine sender identity for clarity
    const senderId = sender.tab ? `content script (${sender.tab.url})` : `extension process (e.g., popup, background)`;
    logger.debug(`Message received from: ${senderId}`, request);

    if (request.action === "getCurrentViewData") {
        logger.debug("Handling 'getCurrentViewData' message.");
        try {
            const data = {
                viewType: getViewType(window.location.href),
                url: window.location.href,
                // Add other relevant data from the current view if necessary
                isTableVisible: !!document.querySelector('.slds-table.forceRecordLayout')
            };
            logger.debug("Sending success response for 'getCurrentViewData'.", data);
            sendResponse({ status: "success", data: data });
        } catch (error) {
             logger.error("Error handling 'getCurrentViewData' message:", error);
             sendResponse({ status: "error", message: error.message });
        }
        return true; // Indicates an asynchronous response might be sent
    }

    // Add other message handlers here...
    // else if (request.action === "someOtherAction") { ... }

    logger.debug(`Message action "${request.action}" not handled by this listener.`);
    // Return false if not handling the message or not sending an async response
    return false;
});

logger.info("content.js execution finished initial synchronous run.");
