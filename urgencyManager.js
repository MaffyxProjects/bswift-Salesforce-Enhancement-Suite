// urgencyManager.js

/**
 * @file Manages metadata (urgency, notes, status symbols, custom colors, link URL) for Salesforce cases.
 * Handles storage, button creation, modal editing, styling, and user interaction.
 * Relies on dependencies injected via the `init` method from the main content script.
 *
 * IMPORTANT: This module requires the "storage" permission in manifest.json to function correctly.
 */

const UrgencyManager = (() => {
    // --- Constants ---
    const CASE_METADATA_KEY = 'sfx_enhancement_case_metadata'; // Key for storing extended data
    const URGENT_BUTTON_CLASS = 'urgent-button';
    const NOTES_BUTTON_CLASS = 'notes-button';
    const LINK_BUTTON_CLASS = 'link-button'; // New class for the link button
    const URGENT_ROW_CLASS = 'urgent-row';
    const URGENT_COLOR = 'hsla(0, 85%, 94%, 0.7)'; // Light red highlight for urgent rows
    const DEFAULT_COLOR_PICKER_VALUE = '#cccccc'; // Default grey for color picker when disabled
    const NOTE_PREVIEW_LENGTH = 300; // Max characters for note preview in tooltip

    // --- Icons ---
    // Material Symbols Outlined icons (ensure font is loaded by content.js)
    const urgentIcon = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">priority_high</span>`;
    const urgentIconFilled = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">priority_high</span>`;
    const notesIcon = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">edit_note</span>`;
    const notesIconFilled = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">edit_note</span>`;
    const linkIcon = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">link</span>`; // Link icon
    const linkOffIcon = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: inherit;">link_off</span>`; // Link off icon

    // Status Symbols Definition (Default Colors)
    const STATUS_SYMBOLS = {
        none: { icon: 'disabled_by_default', label: 'None', color: '#888888' }, // Default color for 'none' (grey)
        check: { icon: 'check_circle', label: 'Check', color: '#28a745' }, // Green
        grid: { icon: 'grid_on', label: 'Spreadsheet', color: '#17a2b8' }, // Teal/Blue
        bolt: { icon: 'bolt', label: 'Thunderbolt', color: '#ffc107' }, // Yellow
        warning: { icon: 'warning', label: 'Warning', color: '#fd7e14' }, // Orange
        block: { icon: 'block', label: 'Blocked', color: '#dc3545' }, // Red
        info: { icon: 'info', label: 'Info', color: '#0d6efd' }, // Blue
        flag: { icon: 'flag', label: 'Flag', color: '#6c757d' }, // Grey
        // Add more symbols here as needed
        workflow: { icon: 'account_tree', label: 'Workflow', color: '#20c997' }, // Add workflow symbol here too

    };

    // Predefined Color Swatches
    const PREDEFINED_COLORS = [
        '#5dade2', '#aed6f1', // Blues (Light, Lighter)
        '#58d68d', '#a9dfbf', // Greens (Medium, Light)
        '#f7dc6f', '#f5b041', // Yellows/Oranges (Light Yellow, Orange)
        '#ec7063', '#f1948a', // Reds/Pinks (Medium Red, Light Pink/Red)
        '#af7ac5', '#d7bde2', // Purples (Medium, Light)
        '#48c9b0', // Teal
        '#abb2b9', '#d5dbdb', // Grays (Medium, Light)
    ];

    // --- CSS ---
    // CSS is now injected via manifest.json using urgencyManager.css

    // --- Module State ---
    let isInitialized = false;
    let logger = console;
    let getCaseDataFromRowFunc = null;
    let getStatusRowColorFunc = null;
    let getCaseDataFromDetailViewFunc = null; // <-- Add state for detail view data function
    let buttonBaseStyles = '';
    let currentModalKey = null;

    // --- Private Helper Functions ---

    /** Injects CSS styles and the modal HTML structure into the page. */
    function _injectInfrastructure() {
        // CSS is now injected via manifest.json
        const modalId = 'caseMetadataModal';
        if (!document.getElementById(modalId)) {
             logger.debug('UrgencyManager: Injecting modal HTML...');
             try {
                const modalHtml = `
                <div id="caseMetadataModal" class="modal">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h2 id="modalTitle">Edit Case Notes & Status</h2>
                      <span class="modal-close-button" id="modalCloseBtn" title="Close">&times;</span>
                    </div>
                    <div class="modal-body">
                      <input type="hidden" id="modalCompositeKey">

                      <div class="modal-field urgency-field">
                        <label for="modalIsUrgent">
                          <input type="checkbox" id="modalIsUrgent">
                          <span class="checkbox-label">Mark as Urgent</span>
                        </label>
                      </div>

                      <div class="modal-field">
                        <label for="modalUrgentNote">Urgent Note:</label>
                        <textarea id="modalUrgentNote" rows="3" placeholder="Reason for urgency (optional)"></textarea>
                      </div>

                      <div class="modal-field">
                        <label for="modalGeneralNote">General Note:</label>
                        <textarea id="modalGeneralNote" rows="4" placeholder="Add general notes about this case..."></textarea>
                      </div>

                       <div class="modal-field">
                        <label for="modalCaseLinkUrl">Link URL:</label>
                        <input type="url" id="modalCaseLinkUrl" placeholder="https://example.com/optional-link">
                      </div>

                      <div class="modal-field">
                        <label>Status Symbol:</label>
                        <div id="modalStatusSymbolOptions" class="modal-symbol-options-container">
                          <!-- Symbol options populated by JS -->
                        </div>
                      </div>

                      <div class="modal-field color-picker-field">
                        <label for="modalStatusColor">Symbol Color:</label>
                        <input type="color" id="modalStatusColor" value="${DEFAULT_COLOR_PICKER_VALUE}" disabled>
                        <div id="modalColorSwatches" class="modal-color-swatches-container">
                           <!-- Swatches populated by JS -->
                        </div>
                      </div>

                    </div>
                    <div class="modal-footer">
                      <button id="modalClearBtn" class="modal-button modal-button-clear">Clear All</button> <!-- Added Clear All button -->
                      <button id="modalCancelBtn" class="modal-button modal-button-cancel">Cancel</button>
                      <button id="modalSaveBtn" class="modal-button modal-button-save">Save Changes</button>
                    </div>
                  </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                _setupModalEventListeners();
                _populateSymbolOptions();
                _populateColorSwatches();
                logger.debug('UrgencyManager: Modal HTML injected and listeners attached.');
             } catch (error) { logger.error('UrgencyManager: Failed to inject modal HTML:', error); }
        } else { logger.debug('UrgencyManager: Modal HTML already present.'); }
    }

    /** Sets up event listeners for the modal elements, including symbol changes. */
    function _setupModalEventListeners() {
        const modal = document.getElementById('caseMetadataModal');
        const closeBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const saveBtn = document.getElementById('modalSaveBtn');
        const clearBtn = document.getElementById('modalClearBtn'); // Get Clear button
        const symbolOptionsContainer = document.getElementById('modalStatusSymbolOptions');
        const linkUrlInput = document.getElementById('modalCaseLinkUrl'); // Get link input
        const colorPicker = document.getElementById('modalStatusColor');
        // Add linkUrlInput to the check
        if (!modal || !closeBtn || !cancelBtn || !saveBtn || !clearBtn || !symbolOptionsContainer || !linkUrlInput || !colorPicker) { // Added clearBtn check
            logger.error("UrgencyManager: Could not find all modal elements (incl. buttons, symbol container, color picker, link input) for listeners.");
            return;
        }

        clearBtn.onclick = _handleModalClear; // Add listener for Clear button
        closeBtn.onclick = closeNotesModal;
        cancelBtn.onclick = closeNotesModal;
        saveBtn.onclick = _handleModalSave;
        modal.onclick = (event) => { if (event.target === modal) closeNotesModal(); };
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('visible')) closeNotesModal(); });

        // Listener for symbol radio button changes to enable/disable/reset color picker
        symbolOptionsContainer.addEventListener('change', (event) => {
            if (event.target.type === 'radio' && event.target.name === 'statusSymbol') {
                const selectedSymbolKey = event.target.value;
                logger.debug(`Symbol changed to: ${selectedSymbolKey}`);
                if (selectedSymbolKey === 'none') {
                    colorPicker.value = DEFAULT_COLOR_PICKER_VALUE;
                    colorPicker.disabled = true;
                } else {
                    const defaultColor = STATUS_SYMBOLS[selectedSymbolKey]?.color || '#000000';
                    colorPicker.value = defaultColor;
                    colorPicker.disabled = false;
                }
            }
        });
    }

    /** Populates the radio button options for status symbols in the modal. */
    function _populateSymbolOptions() {
        const container = document.getElementById('modalStatusSymbolOptions');
        if (!container) { logger.error("UrgencyManager: Cannot find modal symbol options container."); return; }

        let optionsHtml = '';
        for (const key in STATUS_SYMBOLS) {
            const symbol = STATUS_SYMBOLS[key];
            optionsHtml += `
                <div class="modal-symbol-option">
                    <input type="radio" id="symbol_${key}" name="statusSymbol" value="${key}">
                    <label for="symbol_${key}">
                        <span class="material-symbols-outlined" style="color: ${symbol.color};">${symbol.icon}</span>
                        <span class="symbol-label">${symbol.label}</span>
                    </label>
                </div>
            `;
        }
        container.innerHTML = optionsHtml;
        logger.debug("UrgencyManager: Populated symbol options in modal.");
    }

    /** Populates the color swatch buttons in the modal. */
    function _populateColorSwatches() {
        const container = document.getElementById('modalColorSwatches');
        const colorPicker = document.getElementById('modalStatusColor');
        if (!container || !colorPicker) { logger.error("UrgencyManager: Cannot find color swatch container or color picker."); return; }

        let swatchesHtml = '';
        PREDEFINED_COLORS.forEach(color => {
            swatchesHtml += `<button type="button" class="modal-color-swatch" style="background-color: ${color};" data-color="${color}" title="Set color to ${color}"></button>`;
        });
        container.innerHTML = swatchesHtml;

        container.addEventListener('click', (event) => {
            const swatch = event.target.closest('.modal-color-swatch');
            if (swatch && !colorPicker.disabled) {
                const color = swatch.dataset.color;
                if (color) { logger.debug(`Color swatch clicked: ${color}`); colorPicker.value = color; }
            } else if (swatch && colorPicker.disabled) { logger.debug("Color swatch clicked, but picker is disabled."); }
        });
        logger.debug("UrgencyManager: Populated color swatches and added listener.");
    }


    /** Retrieves the case metadata object from chrome.storage.local. */
    async function _getCaseMetadata() {
        // logger.debug('UrgencyManager: Fetching case metadata from storage...');
        return new Promise((resolve, reject) => {
            if (!chrome.storage || !chrome.storage.local) { const errorMsg = "UrgencyManager: chrome.storage.local API not available."; logger.error(errorMsg); reject(new Error(errorMsg)); return; }
            chrome.storage.local.get([CASE_METADATA_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = `UrgencyManager: Error getting metadata: ${chrome.runtime.lastError.message}`; logger.error(errorMsg, chrome.runtime.lastError);
                    if (chrome.runtime.lastError.message?.includes("storage permission")) { logger.error("UrgencyManager: CHECK 'storage' PERMISSION IN manifest.json"); }
                    reject(chrome.runtime.lastError);
                } else { resolve(result[CASE_METADATA_KEY] || {}); }
            });
        });
    }

    /** Saves the metadata for a specific task in chrome.storage.local. */
    async function _setCaseMetadata(compositeKey, data) {
        logger.debug(`UrgencyManager: Setting metadata for key "${compositeKey}"`, data);
        if (!compositeKey) { const errorMsg = "UrgencyManager: Cannot set metadata without key."; logger.error(errorMsg); return Promise.reject(new Error(errorMsg)); }

        try {
            const allMetadata = await _getCaseMetadata();
            if (data.statusSymbol === 'none') { delete data.statusColor; }
            // Add caseLinkUrl check to isDefault
            const isDefault = !data.isUrgent
                              && !data.urgentNote
                              && !data.generalNote
                              && (!data.statusSymbol || data.statusSymbol === 'none')
                              && !data.statusColor
                              && !data.caseLinkUrl; // Check if link URL is also empty/default


            if (isDefault) {
                if (allMetadata[compositeKey]) { delete allMetadata[compositeKey]; logger.debug(`UrgencyManager: Removed default metadata entry for key "${compositeKey}".`); }
                else { logger.debug(`UrgencyManager: No metadata entry found to remove for key "${compositeKey}".`); }
            } else { allMetadata[compositeKey] = data; logger.debug(`UrgencyManager: Added/updated metadata entry for key "${compositeKey}".`); }

            return new Promise((resolve, reject) => {
                 if (!chrome.storage || !chrome.storage.local) { const errorMsg = "UrgencyManager: chrome.storage.local API not available for saving."; logger.error(errorMsg); reject(new Error(errorMsg)); return; }
                chrome.storage.local.set({ [CASE_METADATA_KEY]: allMetadata }, () => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = `UrgencyManager: Error saving metadata: ${chrome.runtime.lastError.message}`; logger.error(errorMsg, chrome.runtime.lastError);
                        if (chrome.runtime.lastError.message?.includes("storage permission")) { logger.error("UrgencyManager: CHECK 'storage' PERMISSION IN manifest.json"); }
                        reject(chrome.runtime.lastError);
                    } else { logger.info(`UrgencyManager: Metadata successfully updated in storage for task key "${compositeKey}".`); resolve(); }
                });
            });
        } catch (error) { logger.error(`UrgencyManager: Error during _setCaseMetadata process for key "${compositeKey}":`, error); return Promise.reject(error); }
    }

    /** Creates a unique, deterministic key for a task based on available data. */
    function _createTaskCompositeKey(bswiftId, accountName, subject) {
        const idPart = String(bswiftId || '').trim() || 'NO_BSWIFT_ID';
        const accountPart = String(accountName || '').trim() || 'NO_ACCOUNT_NAME'; // Made slightly more descriptive
        const subjectPart = String(subject || '').trim() || 'NO_SUBJECT';
        return `${idPart}|||${accountPart}|||${subjectPart}`;
    }

    /**
     * (Public version of internal helper)
     * Creates a unique, deterministic key for a task based on available data.
     */
    function createTaskCompositeKey(bswiftId, accountName, subject) {
        const idPart = String(bswiftId || '').trim() || 'NO_BSWIFT_ID';
        const accountPart = String(accountName || '').trim() || 'NO_ACCOUNT_NAME';
        const subjectPart = String(subject || '').trim() || 'NO_SUBJECT';
        return `${idPart}|||${accountPart}|||${subjectPart}`;
    }
    /** Checks if the manager is initialized and dependencies are met. */
    function _checkInitialized(functionName) {
        if (!isInitialized) { logger.error(`UrgencyManager: Cannot execute '${functionName}', not initialized.`); return false; }
        // Check core dependencies needed by most functions
        if (typeof getCaseDataFromRowFunc !== 'function' || typeof getStatusRowColorFunc !== 'function') {
            logger.error(`UrgencyManager: Cannot execute '${functionName}', critical list view dependencies missing.`);
            return false;
        }
        // Check detail view dependency only if needed (e.g., in click handlers)
        if (functionName.startsWith('handle') && typeof getCaseDataFromDetailViewFunc !== 'function') {
            // Check if we are actually in detail view before erroring
            const isDetailView = window.location.href.includes('/lightning/r/Case/') && window.location.href.includes('/view');
            if (isDetailView) {
                logger.error(`UrgencyManager: Cannot execute '${functionName}' in detail view, getCaseDataFromDetailViewFunc dependency missing.`);
                return false;
            }
        }
        return true;
    }

    /** Handles the save action from the modal. */
    async function _handleModalSave() {
        logger.debug("UrgencyManager: Modal Save button clicked.");
        if (!_checkInitialized('_handleModalSave')) return;

        const keyInput = document.getElementById('modalCompositeKey');
        const key = keyInput ? keyInput.value : null;
        if (!key) { logger.error("UrgencyManager: Composite key missing from modal."); alert("Error: Could not identify case."); return; }

        const isUrgentCheckbox = document.getElementById('modalIsUrgent');
        const urgentNoteTextarea = document.getElementById('modalUrgentNote');
        const generalNoteTextarea = document.getElementById('modalGeneralNote');
        const selectedSymbolElement = document.querySelector('input[name="statusSymbol"]:checked');
        const linkUrlInput = document.getElementById('modalCaseLinkUrl'); // Get link input
        const colorPicker = document.getElementById('modalStatusColor');

        if (!isUrgentCheckbox || !urgentNoteTextarea || !generalNoteTextarea || !linkUrlInput || !colorPicker) { logger.error("UrgencyManager: Modal form elements not found during save."); alert("Error: Modal form incomplete."); return; }

        const isUrgent = isUrgentCheckbox.checked;
        const urgentNote = urgentNoteTextarea.value.trim();
        const generalNote = generalNoteTextarea.value.trim();
        const statusSymbol = selectedSymbolElement ? selectedSymbolElement.value : 'none';
        const statusColor = (statusSymbol !== 'none' && !colorPicker.disabled) ? colorPicker.value : undefined;
        const caseLinkUrl = linkUrlInput ? linkUrlInput.value.trim() : ''; // Get link URL

        const newData = { isUrgent, urgentNote, generalNote, statusSymbol, statusColor, caseLinkUrl }; // Add link URL to data

        const saveButton = document.getElementById('modalSaveBtn');
        const cancelButton = document.getElementById('modalCancelBtn');
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Saving...'; }
        if (cancelButton) cancelButton.disabled = true;

        try {
            await _setCaseMetadata(key, newData);
            logger.info(`UrgencyManager: Successfully saved metadata for key "${key}" from modal.`);

            // --- UI Update Logic ---
            const isDetailView = window.location.href.includes('/lightning/r/Case/') && window.location.href.includes('/view');

            if (isDetailView) {
                logger.debug("Attempting UI update on Detail View.");
                // Find the buttons within the detail view field container
                const fieldContainer = document.querySelector('flexipage-field[data-field-id="RecordClient_Id_formula_cField2"]');
                if (fieldContainer) {
                    const urgentButton = fieldContainer.querySelector(`.${URGENT_BUTTON_CLASS}`);
                    const notesButton = fieldContainer.querySelector(`.${NOTES_BUTTON_CLASS}`);
                    const linkButton = fieldContainer.querySelector(`.${LINK_BUTTON_CLASS}`);
                    if (urgentButton && notesButton && linkButton) {
                        applyDetailStyles(urgentButton, notesButton, linkButton, newData);
                        logger.debug(`UrgencyManager: Updated button UI on detail view for key "${key}".`);
                    } else {
                        logger.warn(`UrgencyManager: Could not find all buttons on detail view field for key "${key}" to update UI.`);
                    }
                } else {
                     logger.warn(`UrgencyManager: Could not find bswift ID field container on detail view to update UI.`);
                }
            } else {
                logger.debug("Attempting UI update on List View.");
                const table = document.querySelector('.slds-table.forceRecordLayout');
                let targetRow = null;
                if (table) {
                    const rows = table.querySelectorAll('tbody tr:not(.date-group-banner)');
                    for (const row of rows) {
                        try {
                            const caseData = getCaseDataFromRowFunc(row);
                            // Use the public key creator for consistency
                            if (caseData && createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject) === key) {
                                targetRow = row;
                                break;
                            }
                        } catch (rowError) { logger.warn(`UrgencyManager: Error getting data from row during UI update search for key "${key}":`, rowError, row); }
                    }
                }

                if (targetRow) {
                    const urgentButton = targetRow.querySelector(`.${URGENT_BUTTON_CLASS}`);
                    const notesButton = targetRow.querySelector(`.${NOTES_BUTTON_CLASS}`);
                    const linkButton = targetRow.querySelector(`.${LINK_BUTTON_CLASS}`); // Find link button
                    if (urgentButton && notesButton && linkButton) {
                        applyRowStyles(targetRow, urgentButton, notesButton, linkButton, newData);
                        logger.debug(`UrgencyManager: Updated UI for row with key "${key}" after modal save.`);
                    } else {
                        logger.warn(`UrgencyManager: Could not find all buttons (urgent, notes, link) on row for key "${key}" to update UI.`, targetRow.innerHTML.substring(0, 200));
                    }
                } else {
                    logger.warn(`UrgencyManager: Could not find row matching key "${key}" to update UI.`);
                }
            }

            closeNotesModal();
        } catch (error) {
            logger.error(`UrgencyManager: Failed to save metadata for key "${key}" from modal:`, error);
            const errorDetail = (error instanceof Error && error.message?.includes("storage")) ? "Storage error. Check permissions or refresh." : "Unexpected error.";
            alert(`Error saving changes. ${errorDetail}`);
        } finally {
             if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Save Changes'; }
             if (cancelButton) cancelButton.disabled = false;
        }
    }

    /** Handles the clear action from the modal. Resets all fields. */
    function _handleModalClear() {
        logger.debug("UrgencyManager: Modal Clear button clicked.");
        if (!_checkInitialized('_handleModalClear')) return;

        const isUrgentCheckbox = document.getElementById('modalIsUrgent');
        const urgentNoteTextarea = document.getElementById('modalUrgentNote');
        const generalNoteTextarea = document.getElementById('modalGeneralNote');
        const linkUrlInput = document.getElementById('modalCaseLinkUrl');
        const colorPicker = document.getElementById('modalStatusColor');
        const noneSymbolRadio = document.getElementById('symbol_none');

        if (!isUrgentCheckbox || !urgentNoteTextarea || !generalNoteTextarea || !linkUrlInput || !colorPicker || !noneSymbolRadio) {
            logger.error("UrgencyManager: Modal form elements not found during clear.");
            alert("Error: Could not clear form elements.");
            return;
        }

        // Reset fields to default values
        isUrgentCheckbox.checked = false;
        urgentNoteTextarea.value = '';
        generalNoteTextarea.value = '';
        linkUrlInput.value = '';
        noneSymbolRadio.checked = true; // Select 'None' symbol
        colorPicker.value = DEFAULT_COLOR_PICKER_VALUE; // Reset color picker
        colorPicker.disabled = true; // Disable color picker
        logger.info("UrgencyManager: Modal fields cleared.");
    }

    // --- Public Methods ---

    /** Initializes the UrgencyManager. */
    function init(dependencies) {
        if (isInitialized) { (dependencies.logger || console).warn("UrgencyManager: init() called multiple times."); return; }
        console.log('[SFX Ext Debug] UrgencyManager: init() called.');

        logger = dependencies.logger || console;
        getCaseDataFromRowFunc = dependencies.getCaseDataFromRow;
        getStatusRowColorFunc = dependencies.getStatusRowColor;
        getCaseDataFromDetailViewFunc = dependencies.getCaseDataFromDetailView; // <-- Store detail view function
        buttonBaseStyles = dependencies.buttonStyles || '';

        if (typeof getCaseDataFromRowFunc !== 'function' || typeof getStatusRowColorFunc !== 'function') {
            logger.error("UrgencyManager: Init failed. Missing list view dependencies (getCaseDataFromRow, getStatusRowColor).");
            isInitialized = false;
            return;
        }
        // Detail view function is optional for basic init, but checked later by handlers if needed
        if (typeof getCaseDataFromDetailViewFunc !== 'function') {
             logger.warn("UrgencyManager: Detail view dependency (getCaseDataFromDetailView) not provided. Detail page features might not work fully.");
        }

        try { _injectInfrastructure(); } catch (infraError) { logger.error("UrgencyManager: Infrastructure injection error:", infraError); isInitialized = false; return; }

        logger.info("UrgencyManager initialized successfully. REMINDER: Ensure 'storage' permission in manifest.json.");
        isInitialized = true;
    }

    /** Creates the HTMLButtonElement for the urgent toggle button. */
    function createUrgentButtonElement() {
        if (!_checkInitialized('createUrgentButtonElement')) return null;
        const urgentButton = document.createElement('button');
        urgentButton.className = `${URGENT_BUTTON_CLASS} slds-button`; urgentButton.title = 'Mark as Urgent';
        urgentButton.style.cssText = buttonBaseStyles; urgentButton.innerHTML = urgentIcon; urgentButton.type = 'button';
        urgentButton.addEventListener('click', handleUrgentButtonClick);
        return urgentButton;
    }

    /** Creates the HTMLButtonElement for the notes/status button. */
    function createNotesButtonElement() {
        if (!_checkInitialized('createNotesButtonElement')) return null;
        const notesButton = document.createElement('button');
        notesButton.className = `${NOTES_BUTTON_CLASS} slds-button`; notesButton.title = 'Edit Notes & Status';
        notesButton.style.cssText = buttonBaseStyles; notesButton.innerHTML = notesIcon; notesButton.type = 'button';
        notesButton.addEventListener('click', handleNotesButtonClick);
        return notesButton;
    }

    /** Creates the HTMLButtonElement for the link button. */
    function createLinkButtonElement() {
        if (!_checkInitialized('createLinkButtonElement')) return null;
        const linkButton = document.createElement('button');
        linkButton.className = `${LINK_BUTTON_CLASS} slds-button`;
        linkButton.title = 'No Link Set'; // Initial title
        linkButton.style.cssText = buttonBaseStyles;
        linkButton.innerHTML = linkOffIcon; // Initial icon
        linkButton.type = 'button';
        linkButton.addEventListener('click', handleLinkButtonClick);
        return linkButton;
    }

    /** Applies styling to a row and its buttons based on stored metadata. */
    function applyRowStyles(row, urgentButton, notesButton, linkButton, metadata) { // Added linkButton parameter
        if (!_checkInitialized('applyRowStyles')) return;
        if (!row || !(row instanceof HTMLTableRowElement)) { logger.warn("UrgencyManager: applyRowStyles invalid 'row'.", {row}); return; }
        if (!urgentButton || !(urgentButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyRowStyles invalid 'urgentButton'.", {urgentButton}); return; }
        if (notesButton && !(notesButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyRowStyles invalid 'notesButton'.", {notesButton}); notesButton = null; }
        if (!linkButton || !(linkButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyRowStyles invalid 'linkButton'.", {linkButton}); return; } // Check linkButton

        const data = metadata || {};
        const isUrgent = !!data.isUrgent;
        const urgentNote = data.urgentNote || '';
        const hasGeneralNote = !!data.generalNote;
        const statusSymbolKey = data.statusSymbol && data.statusSymbol !== 'none' ? data.statusSymbol : 'none';
        const hasSymbol = statusSymbolKey !== 'none';
        const hasNotesOrSymbol = hasGeneralNote || hasSymbol;
        const symbolData = STATUS_SYMBOLS[statusSymbolKey] || STATUS_SYMBOLS['none'];
        const displayColor = (hasSymbol && data.statusColor) ? data.statusColor : symbolData.color;
        const caseLinkUrl = data.caseLinkUrl || ''; // Get link URL

        try {
            // 1. Urgency Row Styling
            if (isUrgent) { row.classList.add(URGENT_ROW_CLASS); row.style.backgroundColor = URGENT_COLOR; }
            else {
                row.classList.remove(URGENT_ROW_CLASS);
                try { const caseData = getCaseDataFromRowFunc(row); row.style.backgroundColor = (caseData && caseData.status) ? getStatusRowColorFunc(caseData.status) : ''; }
                catch (caseDataError) { logger.warn("UrgencyManager: Error getting status color during style reset:", caseDataError); row.style.backgroundColor = ''; }
            }

            // 2. Urgent Button Styling
            if (isUrgent) { urgentButton.classList.add('active'); urgentButton.innerHTML = urgentIconFilled; urgentButton.title = `URGENT${urgentNote ? ': ' + urgentNote : ''}\n(Click to toggle urgency)`; }
            else { urgentButton.classList.remove('active'); urgentButton.innerHTML = urgentIcon; urgentButton.title = 'Mark as Urgent'; }

            // 3. Notes Button Styling (if exists)
            if (notesButton) {
                if (hasNotesOrSymbol) {
                    notesButton.classList.add('active');
                    let notesTitleParts = []; // Use array to build tooltip parts

                    // Part 1: Symbol Status
                    if (hasSymbol) {
                        notesButton.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: ${displayColor};">${symbolData.icon}</span>`;
                        notesTitleParts.push(`Status: ${symbolData.label}`);
                    } else {
                        // No symbol, but has general note (because hasNotesOrSymbol is true)
                        notesButton.innerHTML = notesIconFilled;
                    }

                    // Part 2: General Note Content (if exists)
                    if (hasGeneralNote) {
                        let notePreview = data.generalNote.trim();
                        if (notePreview.length > NOTE_PREVIEW_LENGTH) {
                            notePreview = notePreview.substring(0, NOTE_PREVIEW_LENGTH) + '...';
                        }
                        // Replace multiple newlines/whitespace with single spaces for better tooltip display
                        notePreview = notePreview.replace(/\s+/g, ' ');
                        notesTitleParts.push(`Note: ${notePreview}`); // Add the note preview
                    }

                    // Part 3: Action Text
                    notesTitleParts.push('(Click to edit notes & status)');

                    // Join parts with newline
                    notesButton.title = notesTitleParts.join('\n');

                } else {
                    // No notes and no symbol
                    notesButton.classList.remove('active');
                    notesButton.innerHTML = notesIcon;
                    notesButton.title = 'Edit Notes & Status';
                }
            }

            // 4. Link Button Styling
            if (caseLinkUrl) {
                linkButton.classList.add('active');
                linkButton.innerHTML = linkIcon;
                linkButton.title = `Open Link: ${caseLinkUrl}`;
            } else {
                linkButton.classList.remove('active');
                linkButton.innerHTML = linkOffIcon;
                linkButton.title = 'No Link Set (Click to add/edit via Notes)';
            }
        } catch (error) { logger.error("UrgencyManager: Error applying row styles:", error, {row: row?.outerHTML.substring(0,100), metadata}); }
    }

    /**
     * Applies styling ONLY to the buttons based on metadata (for Detail View).
     * Does not handle row highlighting.
     */
    function applyDetailStyles(urgentButton, notesButton, linkButton, metadata) {
        if (!_checkInitialized('applyDetailStyles')) return;
        if (!urgentButton || !(urgentButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyDetailStyles invalid 'urgentButton'.", {urgentButton}); return; }
        if (notesButton && !(notesButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyDetailStyles invalid 'notesButton'.", {notesButton}); notesButton = null; }
        if (!linkButton || !(linkButton instanceof HTMLButtonElement)) { logger.warn("UrgencyManager: applyDetailStyles invalid 'linkButton'.", {linkButton}); return; }

        const data = metadata || {};
        const isUrgent = !!data.isUrgent;
        const urgentNote = data.urgentNote || '';
        const hasGeneralNote = !!data.generalNote;
        const statusSymbolKey = data.statusSymbol && data.statusSymbol !== 'none' ? data.statusSymbol : 'none';
        const hasSymbol = statusSymbolKey !== 'none';
        const hasNotesOrSymbol = hasGeneralNote || hasSymbol;
        const symbolData = STATUS_SYMBOLS[statusSymbolKey] || STATUS_SYMBOLS['none'];
        const displayColor = (hasSymbol && data.statusColor) ? data.statusColor : symbolData.color;
        const caseLinkUrl = data.caseLinkUrl || '';

        logger.debug("applyDetailStyles called with metadata:", data); // <-- Add this log
        try {
            // 1. Urgent Button Styling
            if (isUrgent) { urgentButton.classList.add('active'); urgentButton.innerHTML = urgentIconFilled; urgentButton.title = `URGENT${urgentNote ? ': ' + urgentNote : ''}\n(Click to toggle urgency)`; }
            else { urgentButton.classList.remove('active'); urgentButton.innerHTML = urgentIcon; urgentButton.title = 'Mark as Urgent'; }

            // 2. Notes Button Styling (if exists)
            if (notesButton) {
                if (hasNotesOrSymbol) {
                    notesButton.classList.add('active');
                    let notesTitleParts = [];
                    if (hasSymbol) {
                        notesButton.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; line-height: 1; display: flex; align-items: center; justify-content: center; color: ${displayColor};">${symbolData.icon}</span>`;
                        notesTitleParts.push(`Status: ${symbolData.label}`);
                    } else {
                        notesButton.innerHTML = notesIconFilled;
                    }
                    if (hasGeneralNote) {
                        let notePreview = data.generalNote.trim().replace(/\s+/g, ' ');
                        if (notePreview.length > NOTE_PREVIEW_LENGTH) notePreview = notePreview.substring(0, NOTE_PREVIEW_LENGTH) + '...';
                        notesTitleParts.push(`Note: ${notePreview}`);
                    }
                    notesTitleParts.push('(Click to edit notes & status)');
                    notesButton.title = notesTitleParts.join('\n');
                } else {
                    notesButton.classList.remove('active');
                    notesButton.innerHTML = notesIcon;
                    notesButton.title = 'Edit Notes & Status';
                }
            }

            // 3. Link Button Styling
            if (caseLinkUrl) {
                linkButton.classList.add('active'); linkButton.innerHTML = linkIcon; linkButton.title = `Open Link: ${caseLinkUrl}`;
            } else {
                linkButton.classList.remove('active'); linkButton.innerHTML = linkOffIcon; linkButton.title = 'No Link Set (Click to add/edit via Notes)';
            }
        } catch (error) {
            logger.error("UrgencyManager: Error applying detail button styles:", error, {metadata});
        }
    }

    /** Handles the click event for the urgent toggle button (simple toggle). */
    async function handleUrgentButtonClick(event) {
        logger.debug("UrgencyManager: handleUrgentButtonClick() called.");
        event.stopPropagation(); event.preventDefault();
        const button = event.currentTarget;
        const row = button.closest('tr'); // Will be null if not in a table row (detail view)
        if (!_checkInitialized('handleUrgentButtonClick')) { alert('Error: Urgency feature not ready or dependencies missing.'); return; }

        let caseData, compositeKey;
        try {
            const isDetailView = !row;
            if (isDetailView) {
                 // Fetch data directly from the detail page using the function passed via init
                 if (typeof getCaseDataFromDetailViewFunc === 'function') {
                     caseData = await getCaseDataFromDetailViewFunc(); // Use the stored function
                     if (!caseData || !caseData.bswiftId || !caseData.accountName || !caseData.subject) throw new Error("Failed to get critical case data (ID, Account, Subject) from detail view");
                     compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
                 } else {
                     throw new Error("Detail view data function not available.");
                 }
            } else {
                caseData = getCaseDataFromRowFunc(row); if (!caseData) throw new Error("Failed to get case data from row");
                compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
            }
            if (!compositeKey) throw new Error("Failed to generate composite key");
        } catch (error) { logger.error('UrgencyManager: Error getting data/key in urgent click:', error, {row: row?.innerText.substring(0,100)}); alert(`Error reading case data: ${error.message}`); return; }

        // Find sibling buttons (needed for UI update) - works for both list and detail
        const notesButton = button.parentElement.querySelector(`.${NOTES_BUTTON_CLASS}`);
        const linkButton = button.parentElement.querySelector(`.${LINK_BUTTON_CLASS}`);
        if (!notesButton || !linkButton) { logger.error('UrgencyManager: CRITICAL - Could not find notes or link button siblings during urgent click.', button.parentElement); }

        button.disabled = true;
        let currentData = {};
        try {
            const allMetadata = await _getCaseMetadata();
            currentData = allMetadata[compositeKey] || {};
            const newUrgencyState = !currentData.isUrgent;
            const updatedData = { ...currentData, isUrgent: newUrgencyState, urgentNote: currentData.urgentNote || '' };

            if (newUrgencyState) {
                const taskIdentifier = `"${caseData.subject || 'N/A'}" (Account: ${caseData.accountName || 'N/A'} / Client ID: ${caseData.bswiftId || 'No ID'})`;
                const note = prompt(`Marking task ${taskIdentifier} as urgent.\n\nAdd/edit urgent note (optional):`, updatedData.urgentNote);
                if (note === null) { logger.info('UrgencyManager: Urgency marking cancelled.'); button.disabled = false; return; }
                updatedData.urgentNote = note.trim();
            }

            await _setCaseMetadata(compositeKey, updatedData);
            // Adapt styling application
            if (row) {
                applyRowStyles(row, button, notesButton, linkButton, updatedData); // List view
            } else {
                applyDetailStyles(button, notesButton, linkButton, updatedData); // Detail view
            }
            logger.info(`UrgencyManager: Urgency toggled to ${newUrgencyState} for key "${compositeKey}".`);
        } catch (error) {
            logger.error(`UrgencyManager: Failed urgency toggle for key "${compositeKey}":`, error);
            const errorDetail = (error instanceof Error && error.message?.includes("storage")) ? "Storage error." : "Unexpected error.";
            alert(`Error toggling urgency. ${errorDetail}`);
            logger.warn("UrgencyManager: Attempting to revert UI styles after error.");
            if (row) { applyRowStyles(row, button, notesButton, linkButton, currentData); } else { applyDetailStyles(button, notesButton, linkButton, currentData); }
        } finally { if (button) button.disabled = false; }
    }

    /** Handles the click event for the Notes button (opens the modal). */
    async function handleNotesButtonClick(event) {
        logger.debug("UrgencyManager: handleNotesButtonClick() called.");
        event.stopPropagation(); event.preventDefault();
        const button = event.currentTarget;
        const row = button.closest('tr');
        if (!_checkInitialized('handleNotesButtonClick')) { alert('Error: Notes feature not ready or dependencies missing.'); return; }

        let caseData, compositeKey;
        try {
            const isDetailView = !row;
            if (isDetailView) {
                if (typeof getCaseDataFromDetailViewFunc === 'function') {
                    caseData = await getCaseDataFromDetailViewFunc();
                    if (!caseData || !caseData.bswiftId || !caseData.accountName || !caseData.subject) throw new Error("Failed to get critical case data (ID, Account, Subject) from detail view for notes");
                    compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
                } else { throw new Error("Detail view data function not available."); }
            } else {
                caseData = getCaseDataFromRowFunc(row); if (!caseData) throw new Error("Failed to get case data from row for notes");
                compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
            }
            if (!compositeKey) throw new Error("Failed to generate composite key for notes");
        } catch (error) { logger.error('UrgencyManager: Error getting data/key in notes click:', error, {row: row?.innerText.substring(0,100)}); alert(`Error reading case data for notes: ${error.message}`); return; }

        button.disabled = true;
        try {
            const allMetadata = await _getCaseMetadata();
            const currentData = allMetadata[compositeKey] || {};
            openNotesModal(compositeKey, currentData, caseData);
        } catch (error) {
            logger.error(`UrgencyManager: Error fetching metadata before opening modal for key "${compositeKey}":`, error);
            const errorDetail = (error instanceof Error && error.message?.includes("storage")) ? "Storage error." : "Unexpected error.";
            alert(`Error preparing notes editor. ${errorDetail}`);
        } finally { if (button) button.disabled = false; }
    }

    /** Handles the click event for the Link button (opens link or modal). */
    async function handleLinkButtonClick(event) {
        logger.debug("UrgencyManager: handleLinkButtonClick() called.");
        event.stopPropagation(); event.preventDefault();
        const button = event.currentTarget;
        const row = button.closest('tr');
        if (!_checkInitialized('handleLinkButtonClick')) { alert('Error: Link feature not ready or dependencies missing.'); return; }

        let caseData, compositeKey;
        try {
            const isDetailView = !row;
            if (isDetailView) {
                 if (typeof getCaseDataFromDetailViewFunc === 'function') {
                    caseData = await getCaseDataFromDetailViewFunc();
                    if (!caseData || !caseData.bswiftId || !caseData.accountName || !caseData.subject) throw new Error("Failed to get critical case data (ID, Account, Subject) from detail view for link");
                    compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
                 } else { throw new Error("Detail view data function not available."); }
            } else {
                caseData = getCaseDataFromRowFunc(row); if (!caseData) throw new Error("Failed to get case data from row for link");
                compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject);
            }
            if (!compositeKey) throw new Error("Failed to generate composite key for link");
        } catch (error) { logger.error('UrgencyManager: Error getting data/key in link click:', error, {row: row?.innerText.substring(0,100)}); alert(`Error reading case data for link: ${error.message}`); return; }

        button.disabled = true;
        try {
            const allMetadata = await _getCaseMetadata();
            const currentData = allMetadata[compositeKey] || {};
            const linkUrl = currentData.caseLinkUrl || '';
            if (linkUrl) { logger.info(`Opening link: ${linkUrl}`); window.open(linkUrl, '_blank'); }
            else { logger.debug("No link set, opening modal to add/edit."); openNotesModal(compositeKey, currentData, caseData); } // Open modal if no link
        } catch (error) {
            logger.error(`UrgencyManager: Error handling link click for key "${compositeKey}":`, error); alert(`Error handling link: ${error.message}`);
        } finally { if (button) button.disabled = false; }
    }

    /** Opens and populates the notes modal with data for the given case key. */
    function openNotesModal(compositeKey, currentData, caseData) {
        logger.debug(`UrgencyManager: Opening modal for key "${compositeKey}"`, {currentData, caseData});
        if (!_checkInitialized('openNotesModal')) return;

        const modal = document.getElementById('caseMetadataModal');
        const titleElement = document.getElementById('modalTitle');
        const keyInput = document.getElementById('modalCompositeKey');
        const isUrgentCheckbox = document.getElementById('modalIsUrgent');
        const urgentNoteTextarea = document.getElementById('modalUrgentNote');
        const generalNoteTextarea = document.getElementById('modalGeneralNote');
        const linkUrlInput = document.getElementById('modalCaseLinkUrl'); // Get link input
        const colorPicker = document.getElementById('modalStatusColor');

        if (!modal || !titleElement || !keyInput || !isUrgentCheckbox || !urgentNoteTextarea || !generalNoteTextarea || !linkUrlInput || !colorPicker) { // Add linkUrlInput check
            logger.error("UrgencyManager: Essential modal elements not found! Cannot open modal."); alert("Error: Could not load notes editor."); return;
        }

        currentModalKey = compositeKey;

        // Populate basic fields
        keyInput.value = compositeKey;
        isUrgentCheckbox.checked = !!currentData.isUrgent;
        urgentNoteTextarea.value = currentData.urgentNote || '';
        generalNoteTextarea.value = currentData.generalNote || '';
        linkUrlInput.value = currentData.caseLinkUrl || ''; // Populate link URL

        // Set symbol radio button
        const symbolToSelect = currentData.statusSymbol || 'none';
        try {
            document.querySelectorAll('input[name="statusSymbol"]').forEach(radio => radio.checked = false);
            const symbolRadio = document.getElementById(`symbol_${symbolToSelect}`);
            if (symbolRadio) { symbolRadio.checked = true; }
            else { logger.warn(`UrgencyManager: Symbol key "${symbolToSelect}" not found. Defaulting to 'none'.`); document.getElementById('symbol_none').checked = true; }
        } catch (radioError) { logger.error("UrgencyManager: Error setting symbol radio:", radioError); }

        // Set Color Picker State based on selected symbol and stored data
        if (symbolToSelect === 'none') {
            colorPicker.value = DEFAULT_COLOR_PICKER_VALUE;
            colorPicker.disabled = true;
        } else {
            const initialColor = currentData.statusColor || STATUS_SYMBOLS[symbolToSelect]?.color || '#000000';
            colorPicker.value = initialColor;
            colorPicker.disabled = false;
        }

        // Update modal title
        if (caseData) {
             const account = (caseData.accountName || 'N/A').substring(0, 30) + (caseData.accountName?.length > 30 ? '...' : '');
             const subject = (caseData.subject || 'N/A').substring(0, 40) + (caseData.subject?.length > 40 ? '...' : '');
             titleElement.textContent = `Notes: ${account} - ${subject}`; // Title for the modal
             titleElement.title = `Account: ${caseData.accountName || 'N/A'}\nSubject: ${caseData.subject || 'N/A'}\nID: ${caseData.bswiftId || 'N/A'}`;
        } else { titleElement.textContent = 'Edit Case Notes & Status'; titleElement.title = ''; }

        modal.classList.add('visible');
    }

    /** Closes the notes modal. */
    function closeNotesModal() {
        logger.debug("UrgencyManager: Closing modal.");
        const modal = document.getElementById('caseMetadataModal');
        if (modal) { modal.classList.remove('visible'); }
        currentModalKey = null;
    }

    /** Checks storage and applies initial state (styles) for a given row and its buttons. */
    async function applyInitialStateForRow(row, urgentButton, notesButton, linkButton) { // Added linkButton
        if (!_checkInitialized('applyInitialStateForRow')) return;
        if (!row || !(row instanceof HTMLTableRowElement) || !urgentButton || !(urgentButton instanceof HTMLButtonElement) || (notesButton !== null && !(notesButton instanceof HTMLButtonElement)) || !linkButton || !(linkButton instanceof HTMLButtonElement)) { // Added linkButton check
            logger.warn("UrgencyManager: applyInitialStateForRow invalid elements.", { row: !!row, urgentButton: !!urgentButton, notesButton: notesButton === null || !!notesButton, linkButton: !!linkButton });
            return;
        }

        let caseData, compositeKey;
        try {
            caseData = getCaseDataFromRowFunc(row); if (!caseData) throw new Error("Failed to get case data");
            compositeKey = createTaskCompositeKey(caseData.bswiftId, caseData.accountName, caseData.subject); if (!compositeKey) throw new Error("Failed to generate key");
        } catch (error) { logger.error("UrgencyManager: Error getting data/key in applyInitialState:", error, {row: row?.innerText.substring(0,100)}); applyRowStyles(row, urgentButton, notesButton, linkButton, null); return; } // Pass linkButton even on error
        try {
            const allMetadata = await _getCaseMetadata();
            const metadata = allMetadata[compositeKey];
            applyRowStyles(row, urgentButton, notesButton, linkButton, metadata); // Pass linkButton
        } catch (error) {
            logger.error(`UrgencyManager: Error applying initial state for key "${compositeKey}":`, error, {row: row?.innerText.substring(0,100)});
            if (error instanceof Error && error.message?.includes("storage")) { logger.warn("UrgencyManager: Storage access issue during initial state check."); }
            applyRowStyles(row, urgentButton, notesButton, linkButton, null); // Pass linkButton even on error for reset
        }
    }

    /** Checks storage and applies initial state for buttons on the detail page. */
    async function applyInitialStateForDetail(urgentButton, notesButton, linkButton, compositeKey, caseData) { // Added caseData param
        if (!_checkInitialized('applyInitialStateForDetail')) return;
        if (!urgentButton || !(urgentButton instanceof HTMLButtonElement) || (notesButton !== null && !(notesButton instanceof HTMLButtonElement)) || !linkButton || !(linkButton instanceof HTMLButtonElement)) {
            logger.warn("UrgencyManager: applyInitialStateForDetail invalid button elements.");
            return;
        }
        if (!compositeKey) { logger.error("UrgencyManager: applyInitialStateForDetail requires a compositeKey."); return; }
        // caseData is now passed, useful for handlers later if needed, but not directly for styling

        // Attach caseData to buttons for easier access in click handlers (optional, but can simplify handlers)
        // if (caseData) {
        //     urgentButton.dataset.caseData = JSON.stringify(caseData);
        //     if (notesButton) notesButton.dataset.caseData = JSON.stringify(caseData);
        //     linkButton.dataset.caseData = JSON.stringify(caseData);
        // }

        try {
            const allMetadata = await _getCaseMetadata();
            const metadata = allMetadata[compositeKey];
            applyDetailStyles(urgentButton, notesButton, linkButton, metadata); // Use detail styling function
        } catch (error) {
            logger.error(`UrgencyManager: Error applying initial state for detail view key "${compositeKey}":`, error);
            if (error instanceof Error && error.message?.includes("storage")) { logger.warn("UrgencyManager: Storage access issue during initial state check."); }
            applyDetailStyles(urgentButton, notesButton, linkButton, null); // Reset styles on error
        }
    }

    // --- Expose Public Interface ---
    return {
        init, createUrgentButtonElement, createNotesButtonElement, createLinkButtonElement,
        applyInitialStateForRow, applyInitialStateForDetail, // Expose new detail initializer
        createTaskCompositeKey, // Expose key creation helper
        URGENT_BUTTON_CLASS, NOTES_BUTTON_CLASS, LINK_BUTTON_CLASS, // Expose new class
        URGENT_ROW_CLASS
    };
})();
