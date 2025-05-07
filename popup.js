// popup.js

// Use the same key as UrgencyManager
const CASE_METADATA_KEY = 'sfx_enhancement_case_metadata'; // Sanitized key
const NOTE_PREVIEW_LENGTH = 60; // Max characters for note preview in popup list
const EXTENSION_VERSION = '1.0.14'; // Or read dynamically if possible

// Copy STATUS_SYMBOLS from UrgencyManager for icon rendering
const STATUS_SYMBOLS = {
    none: { icon: 'disabled_by_default', label: 'None', color: '#888888' },
    check: { icon: 'check_circle', label: 'Check', color: '#28a745' },
    grid: { icon: 'grid_on', label: 'Spreadsheet', color: '#17a2b8' },
    bolt: { icon: 'bolt', label: 'Thunderbolt', color: '#ffc107' },
    warning: { icon: 'warning', label: 'Warning', color: '#fd7e14' },
    block: { icon: 'block', label: 'Blocked', color: '#dc3545' },
    info: { icon: 'info', label: 'Info', color: '#0d6efd' },
    flag: { icon: 'flag', label: 'Flag', color: '#6c757d' },
    workflow: { icon: 'account_tree', label: 'Workflow', color: '#20c997' }, // New workflow symbol
};

/**
 * Parses the composite key used by UrgencyManager.
 * @param {string} compositeKey - The key (e.g., "ID|||Account|||Subject").
 * @returns {object} An object with bswiftId, accountName, subject.
 */
function parseCompositeKey(compositeKey) {
    const parts = compositeKey.split('|||');
    return {
        bswiftId: parts[0] !== 'NO_BSWIFT_ID' ? parts[0] : '', // Assuming 'bswiftId' is a generic term for 'client identifier' in this context
        accountName: parts[1] !== 'NO_ACCOUNT' ? parts[1] : 'N/A',
        subject: parts[2] !== 'NO_SUBJECT' ? parts[2] : 'N/A',
    };
}

/**
 * Generates a preview snippet for the note.
 * @param {string} note - The full note text.
 * @returns {string} A truncated and cleaned preview string.
 */
function generateNotePreview(note) {
    if (!note) return '';
    let preview = note.trim();
    if (preview.length > NOTE_PREVIEW_LENGTH) {
        preview = preview.substring(0, NOTE_PREVIEW_LENGTH) + '...';
    }
    // Replace multiple whitespace/newlines with single space for display
    return preview.replace(/\s+/g, ' ');
}

/**
 * Fetches metadata from storage and updates the popup list.
 */
function updateCasesList() {
  const listElement = document.getElementById('caseMetadataList'); // Use new ID
  if (!listElement) {
      console.error("Popup Error: List element #caseMetadataList not found.");
      return;
  }
  listElement.innerHTML = '<div class="no-cases">Loading...</div>'; // Initial loading state

  chrome.storage.local.get([CASE_METADATA_KEY], (result) => {
    try {
      const allMetadata = result[CASE_METADATA_KEY] || {};
      console.log('Retrieved case metadata:', allMetadata);

      const metadataEntries = Object.entries(allMetadata);

      if (metadataEntries.length === 0) {
        listElement.innerHTML = '<div class="no-cases">No notes or statuses saved yet.</div>';
        return;
      }

      // Map entries to a displayable format, parsing the key
      const casesArray = metadataEntries.map(([compositeKey, data]) => {
          const { bswiftId, accountName, subject } = parseCompositeKey(compositeKey);
          return {
              compositeKey, // Keep the original key if needed later
              bswiftId,
              accountName,
              subject,
              ...data // Spread the metadata (isUrgent, generalNote, statusSymbol, etc.)
          };
      });

      // Sort: Urgent cases first, then by Account Name, then Subject
      const sortedCases = casesArray.sort((a, b) => {
        // Urgent cases come first
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;

        // Then sort by Account Name (case-insensitive)
        const accountCompare = a.accountName.toLowerCase().localeCompare(b.accountName.toLowerCase());
        if (accountCompare !== 0) return accountCompare;

        // Finally, sort by Subject (case-insensitive)
        return a.subject.toLowerCase().localeCompare(b.subject.toLowerCase());
      });

      // Clear existing list content efficiently
      listElement.innerHTML = '';

      // Use DocumentFragment for efficient batch append
      const fragment = document.createDocumentFragment();

      sortedCases.forEach(caseData => {
        const symbolKey = caseData.statusSymbol || 'none';
        const symbolInfo = STATUS_SYMBOLS[symbolKey] || STATUS_SYMBOLS['none'];
        const displayColor = (symbolKey !== 'none' && caseData.statusColor) ? caseData.statusColor : symbolInfo.color;
        const notePreview = generateNotePreview(caseData.generalNote);

        const itemDiv = document.createElement('div');
        itemDiv.className = `case-item ${caseData.isUrgent ? 'is-urgent' : ''}`;

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'case-header';
        const accountDiv = document.createElement('div');
        accountDiv.className = 'case-account';
        accountDiv.title = caseData.accountName;
        accountDiv.textContent = caseData.accountName;
        headerDiv.appendChild(accountDiv);
        if (symbolKey !== 'none') {
          const symbolDiv = document.createElement('div');
          symbolDiv.className = 'case-symbol';
          symbolDiv.title = `Status: ${symbolInfo.label}`;
          const symbolSpan = document.createElement('span');
          symbolSpan.className = 'material-symbols-outlined';
          symbolSpan.style.color = displayColor;
          symbolSpan.textContent = symbolInfo.icon;
          symbolDiv.appendChild(symbolSpan);
          headerDiv.appendChild(symbolDiv);
        }
        itemDiv.appendChild(headerDiv);

        // Subject
        const subjectDiv = document.createElement('div');
        subjectDiv.className = 'case-subject';
        subjectDiv.title = caseData.subject;
        subjectDiv.textContent = caseData.subject;
        itemDiv.appendChild(subjectDiv);

        // Note Preview
        if (notePreview) {
          const previewDiv = document.createElement('div');
          previewDiv.className = 'case-note-preview';
          previewDiv.title = caseData.generalNote || '';
          previewDiv.textContent = notePreview;
          itemDiv.appendChild(previewDiv);
        }

        // Link (If you add this back visually)
        if (caseData.caseLinkUrl) {
            const linkDiv = document.createElement('div');
            linkDiv.className = 'case-link';
            linkDiv.title = `Open Link: ${caseData.caseLinkUrl}`;
            const linkAnchor = document.createElement('a');
            linkAnchor.href = caseData.caseLinkUrl;
            linkAnchor.target = '_blank';
            linkAnchor.className = 'case-link-anchor'; // You might need to style this class
            linkAnchor.innerHTML = `<span class="material-symbols-outlined link-icon">link</span> <span>Open Link</span>`;
            linkDiv.appendChild(linkAnchor);
            itemDiv.appendChild(linkDiv);
        }

        // Actions (Using innerHTML here for simplicity of button structure)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'case-actions';
        actionsDiv.innerHTML = `
          <button class="case-action-button edit edit-case-btn" data-composite-key="${caseData.compositeKey}" title="Edit this entry">
            <span class="material-symbols-outlined">edit</span> Edit
          </button>
          <button class="case-action-button delete delete-case-btn" data-composite-key="${caseData.compositeKey}" title="Delete this entry">
            <span class="material-symbols-outlined">delete</span> Delete
          </button>`;
        itemDiv.appendChild(actionsDiv);

        // Footer
        const footerDiv = document.createElement('div');
        footerDiv.className = 'case-footer';
        const idDiv = document.createElement('div');
        idDiv.className = 'case-id';
        idDiv.textContent = caseData.bswiftId ? `ID: ${caseData.bswiftId}` : '';
        footerDiv.appendChild(idDiv);
        itemDiv.appendChild(footerDiv);

        fragment.appendChild(itemDiv);
      });

      // Append all items at once
      listElement.appendChild(fragment);

    } catch (error) {
      console.error('Error processing case metadata:', error);
      listElement.innerHTML = '<div class="no-cases">Error loading data.</div>';
    }
  });
}

/**
 * Populates the status dropdown in the edit modal.
 */
function populateStatusDropdown() {
    // Target the custom list (ul) instead of select
    const listElement = document.getElementById('statusDropdownList');
    if (!listElement) return;
    listElement.innerHTML = ''; // Clear existing options

    Object.entries(STATUS_SYMBOLS).forEach(([key, { label, icon }]) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('role', 'option');
        listItem.dataset.value = key; // Store the value in a data attribute

        // Create icon span
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined';
        iconSpan.textContent = (key !== 'none' && icon) ? icon : ''; // Show icon if not 'none'

        listItem.appendChild(iconSpan);
        listItem.appendChild(document.createTextNode(` ${label}`)); // Add label text

        listElement.appendChild(listItem);
    });
}
/**
 * Updates the icon preview span next to the status dropdown.
 * @param {string} symbolKey - The key of the selected status symbol (e.g., 'check', 'none').
 */
function updateSelectedStatusIconPreview(symbolKey) {
    const previewDiv = document.getElementById('statusIconPreview');
    if (!previewDiv) return;
    const hiddenInput = document.getElementById('editStatusSymbolValue');

    const symbolInfo = STATUS_SYMBOLS[symbolKey] || STATUS_SYMBOLS['none'];

    // Clear previous content
    previewDiv.innerHTML = '';

    // Create icon span
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    if (symbolKey === 'none' || !symbolInfo.icon) {
        iconSpan.textContent = ''; // No icon for 'none'
    } else {
        iconSpan.textContent = symbolInfo.icon; // Set the icon name
    }
    previewDiv.appendChild(iconSpan);

    // Add label text to the preview button
    const labelText = document.createTextNode(` ${symbolInfo.label || 'None'}`);
    previewDiv.appendChild(labelText);

    // Update the hidden input value
    if (hiddenInput) {
        hiddenInput.value = symbolKey;
    }
}
/**
 * Opens the edit modal and populates it with data for the given composite key.
 * @param {string} compositeKey - The key of the case entry to edit.
 */
function openEditModal(compositeKey) {
    const modal = document.getElementById('editModal');
    const keyInput = document.getElementById('editModalCompositeKey');
    const noteInput = document.getElementById('editNote');
    // We now use the hidden input and the preview div
    const statusHiddenInput = document.getElementById('editStatusSymbolValue');
    const colorInput = document.getElementById('editStatusColor');
    const urgentCheckbox = document.getElementById('editIsUrgent');
    const linkInput = document.getElementById('editCaseLinkUrl');

    if (!modal || !keyInput || !noteInput || !statusHiddenInput || !colorInput || !urgentCheckbox || !linkInput) {
        console.error("Edit Modal Error: One or more modal elements not found.");
        alert("Could not open the edit form. Please check the console.");
        return;
    }

    chrome.storage.local.get([CASE_METADATA_KEY], (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error fetching data for edit:', chrome.runtime.lastError);
            alert(`Error fetching data: ${chrome.runtime.lastError.message}`);
            return;
        }

        const allMetadata = result[CASE_METADATA_KEY] || {};
        const caseData = allMetadata[compositeKey];

        if (!caseData) {
            console.error(`Edit Error: No data found for key ${compositeKey}`);
            alert("Could not find the data for the selected item.");
            return;
        }

        // Populate the form
        keyInput.value = compositeKey;
        noteInput.value = caseData.generalNote || '';
        const initialStatus = caseData.statusSymbol || 'none';
        statusHiddenInput.value = initialStatus; // Set hidden input
        // Set color picker value. If no custom color, default to black or white for visibility.
        colorInput.value = caseData.statusColor || '#000000';
        urgentCheckbox.checked = caseData.isUrgent || false;
        linkInput.value = caseData.caseLinkUrl || '';

        // Update the icon preview initially
        updateSelectedStatusIconPreview(initialStatus);

        // Show the modal
        modal.style.display = 'flex'; // Use flex to enable centering styles
    });
}

/**
 * Handles saving changes from the edit modal.
 */
function handleSaveChanges() {
    const compositeKey = document.getElementById('editModalCompositeKey').value;
    if (!compositeKey) {
        console.error("Save Error: No composite key found in modal.");
        alert("Error saving: Could not identify the item being edited.");
        return;
    }

    const updatedData = {
        generalNote: document.getElementById('editNote').value.trim(),
        statusSymbol: document.getElementById('editStatusSymbolValue').value, // Read from hidden input
        statusColor: document.getElementById('editStatusColor').value, // Always save the color picker value
        isUrgent: document.getElementById('editIsUrgent').checked,
        caseLinkUrl: document.getElementById('editCaseLinkUrl').value.trim()
    };

    // If status is 'none', clear the custom color as it's irrelevant
    if (updatedData.statusSymbol === 'none') {
        updatedData.statusColor = ''; // Or null, depending on preference
    }

    // Save the updated data (implementation similar to handleDeleteCase)
    saveUpdatedMetadata(compositeKey, updatedData);

    // Close the modal
    closeEditModal();
}

/**
 * Handles the deletion of a specific case entry.
 * @param {string} compositeKey - The key of the case entry to delete.
 */
function handleDeleteCase(compositeKey) {
    if (!compositeKey) {
        console.error("Delete Error: No composite key provided.");
        return;
    }

    // Extract details for the confirmation message BEFORE deleting
    const parsedDetails = parseCompositeKey(compositeKey);
    const confirmMessage = `Are you sure you want to delete the note/status for this case?\n\nAccount: ${parsedDetails.accountName}\nSubject: ${parsedDetails.subject}\n\nThis cannot be undone!`;

    if (confirm(confirmMessage)) {
        saveUpdatedMetadata(compositeKey, null); // Pass null to indicate deletion
    }
}

/**
 * Saves updated metadata for a specific key, or deletes it if updatedData is null.
 * @param {string} compositeKey The key to update/delete.
 * @param {object | null} updatedData The new data object, or null to delete.
 */
function saveUpdatedMetadata(compositeKey, updatedData) {
    chrome.storage.local.get([CASE_METADATA_KEY], (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error fetching data before save/delete:', chrome.runtime.lastError);
            alert(`Error accessing storage: ${chrome.runtime.lastError.message}`);
            return;
        }

        const allMetadata = result[CASE_METADATA_KEY] || {};

        if (updatedData === null) { // Deletion request
            if (allMetadata[compositeKey]) {
                delete allMetadata[compositeKey];
                console.log(`Deleted entry with key: ${compositeKey}`);
            } else {
                console.warn(`Attempted to delete non-existent key: ${compositeKey}`);
                // No need to save if nothing changed
                updateCasesList(); // Still refresh UI just in case
                return;
            }
        } else { // Update request
            // Merge existing data with updates (important if UrgencyManager adds other fields)
            allMetadata[compositeKey] = { ...(allMetadata[compositeKey] || {}), ...updatedData };
            console.log(`Updated entry with key: ${compositeKey}`);
        }

        // Save the modified metadata back to storage
        chrome.storage.local.set({ [CASE_METADATA_KEY]: allMetadata }, () => {
            if (chrome.runtime.lastError) {
                const action = updatedData === null ? 'deleting' : 'saving';
                console.error(`Error ${action} data:`, chrome.runtime.lastError);
                alert(`Error ${action} entry: ${chrome.runtime.lastError.message}`);
            } else {
                updateCasesList(); // Refresh the popup list on success
            }
        });
    });
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Validates the structure and content of imported JSON data.
 * Also flattens the data if valid.
 * @param {object} parsedJson - The parsed JSON object from the import file.
 * @returns {{isValid: boolean, error?: string, flattenedData?: object}} Result object.
 */
function validateAndFlattenImportData(parsedJson) {
    if (typeof parsedJson !== 'object' || parsedJson === null) {
        return { isValid: false, error: 'Invalid file format. Expected a JSON object.' };
    }

    // Check for metadata structure (added in enhanced export)
    if (!parsedJson.hasOwnProperty('version') || !parsedJson.hasOwnProperty('exportDate') || !parsedJson.hasOwnProperty('data')) {
        // Allow import of old format for backward compatibility (optional)
        console.warn("Importing older format (no metadata wrapper). Validation will be less strict.");
        // Treat the entire parsedJson as the 'data' part for validation
        parsedJson = { data: parsedJson }; // Wrap it for the validator logic below
        // return { isValid: false, error: 'Invalid file structure. Missing required metadata (version, exportDate, data).' };
    }

    const groupedData = parsedJson.data;
    if (typeof groupedData !== 'object' || groupedData === null) {
        return { isValid: false, error: 'Invalid file structure. "data" property must be an object.' };
    }

    const flattenedData = {};
    let entryCount = 0;
    const expectedKeys = ['isUrgent', 'generalNote', 'statusSymbol', 'statusColor', 'caseLinkUrl']; // Add any other keys managed by the extension

    try {
        for (const accountName in groupedData) {
            if (typeof groupedData[accountName] !== 'object' || groupedData[accountName] === null) {
                return { isValid: false, error: `Invalid data structure for account "${accountName}". Expected an object.` };
            }
            const accountCases = groupedData[accountName];
            for (const compositeKey in accountCases) {
                entryCount++;
                // 1. Validate composite key format
                if (typeof compositeKey !== 'string' || !compositeKey.includes('|||')) {
                    return { isValid: false, error: `Invalid composite key format found: "${compositeKey}". Expected "ID|||Account|||Subject".` };
                }

                // 2. Validate case data structure
                const caseData = accountCases[compositeKey];
                if (typeof caseData !== 'object' || caseData === null) {
                    return { isValid: false, error: `Invalid case data for key "${compositeKey}". Expected an object.` };
                }

                // 3. Validate expected fields (optional but recommended)
                for (const key of expectedKeys) {
                    if (!caseData.hasOwnProperty(key)) {
                        // Allow missing keys but maybe log a warning? Or enforce?
                        // For robustness, let's allow missing keys but ensure they default correctly later if needed.
                        console.warn(`Case data for key "${compositeKey}" is missing expected field "${key}".`);
                    }
                }
                // Add more specific type checks if necessary (e.g., isUrgent is boolean)

                flattenedData[compositeKey] = caseData;
            }
        }
    } catch (validationError) {
        return { isValid: false, error: `An error occurred during validation: ${validationError.message}` };
    }

    return { isValid: true, flattenedData: flattenedData, entryCount: entryCount };
}
// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const quickGuideHeader = document.getElementById('quickGuideHeader');
  const quickGuideContent = document.getElementById('quickGuideContent');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const clearBtn = document.getElementById('clearBtn');
  const fileInput = document.getElementById('fileInput');
  const listElement = document.getElementById('caseMetadataList'); // Get list element for delegation
  const saveEditBtn = document.getElementById('saveEditBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  // Custom Dropdown Elements
  const statusPreviewButton = document.getElementById('statusIconPreview');
  const statusDropdownList = document.getElementById('statusDropdownList');
  const statusHiddenInput = document.getElementById('editStatusSymbolValue');
  const clearStatusColorBtn = document.getElementById('clearStatusColorBtn');
  const modal = document.getElementById('editModal');
  const colorSwatchContainer = document.getElementById('colorSwatchContainer'); // Get swatch container
  const mergeDataBtn = document.getElementById('mergeDataBtn');
  // Initialize list on popup open
  const documentationLink = document.getElementById('documentationLink');
  updateCasesList();
  populateStatusDropdown(); // Populate status options once

  // Quick Guide toggle
  if (quickGuideHeader && quickGuideContent) {
    quickGuideHeader.addEventListener('click', () => {
      const isExpanded = quickGuideContent.classList.toggle('expanded');
      quickGuideHeader.classList.toggle('expanded', isExpanded);
      quickGuideHeader.querySelector('.material-symbols-outlined').textContent = isExpanded ? 'expand_less' : 'expand_more';
    });
     // Ensure icon matches initial state (closed)
     quickGuideHeader.querySelector('.material-symbols-outlined').textContent = 'expand_more';
  } else {
      console.warn("Popup elements for Quick Guide not found.");
  }

  // Export button
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.querySelector('span').textContent = 'Exporting...';
      try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get([CASE_METADATA_KEY], (res) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(res);
            });
        });

        const allMetadata = result[CASE_METADATA_KEY] || {};
        const caseCount = Object.keys(allMetadata).length;
        if (caseCount === 0) {
            alert('No case notes or statuses found to export.');
            return;
        }

        // Calculate summary metrics
        let totalEntries = 0;
        let urgentCount = 0;
        const statusSymbolCounts = {};
        let generalNoteCount = 0;
        let urgentNoteCount = 0;
        let caseLinkCount = 0;

        Object.values(allMetadata).forEach(data => {
            totalEntries++;
            if (data.isUrgent) urgentCount++;
            if (data.generalNote && data.generalNote.trim() !== '') generalNoteCount++;
            if (data.urgentNote && data.urgentNote.trim() !== '') urgentNoteCount++; // Assuming 'urgentNote' is a field in your data
            if (data.caseLinkUrl && data.caseLinkUrl.trim() !== '') caseLinkCount++;
            if (data.statusSymbol && data.statusSymbol !== 'none') {
                statusSymbolCounts[data.statusSymbol] = (statusSymbolCounts[data.statusSymbol] || 0) + 1;
            } else if (!data.statusSymbol || data.statusSymbol === 'none') {
                // Optionally count 'none' or unassigned symbols if desired
                // statusSymbolCounts['none'] = (statusSymbolCounts['none'] || 0) + 1;
            }
        });


        const groupedCases = Object.entries(allMetadata).reduce((acc, [compositeKey, caseData]) => {
            const { accountName } = parseCompositeKey(compositeKey);
            const displayAccount = accountName || 'No Account Name';
            if (!acc[displayAccount]) acc[displayAccount] = {};
            acc[displayAccount][compositeKey] = caseData;
            return acc;
        }, {});

        const sortedGroupedCases = Object.keys(groupedCases)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .reduce((acc, key) => { acc[key] = groupedCases[key]; return acc; }, {});

        const summaryMetrics = {
            totalEntries,
            urgentCount,
            nonUrgentCount: totalEntries - urgentCount,
            statusSymbolCounts,
            generalNoteCount,
            urgentNoteCount,
            caseLinkCount
        };
        // Create a wrapper object with metadata
        const exportData = {
            version: EXTENSION_VERSION,
            exportDate: new Date().toISOString(),
            summaryMetrics: summaryMetrics, // Add the new metrics object
            data: sortedGroupedCases
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' }); // Specify charset
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `case-notes-export-${new Date().toISOString().split('T')[0]}.json`; // Sanitized filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`Export successful (${caseCount} entries).`);
        alert(`Export successful (${caseCount} entries).`);
      } catch (error) {
          console.error('Export error:', error);
          alert(`Export failed: ${error.message}`);
      } finally {
          exportBtn.disabled = false;
          const exportSpan = exportBtn.querySelector('span');
          if (exportSpan) exportSpan.textContent = 'Export';
      }
    });
  } else {
      console.warn("Popup element #exportBtn or its span not found.");
  }

  // Import button
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.value = null; // Reset file input to allow re-importing the same file
      fileInput.click();
    });
  } else {
      console.warn("Popup elements #importBtn or #fileInput not found.");
  }

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      importBtn.disabled = true;
      const importSpan = importBtn.querySelector('span');
      if (importSpan) importSpan.textContent = 'Importing...';
      const file = e.target.files[0];
      if (!file) {
          importBtn.disabled = false;
          if (importSpan) importSpan.textContent = 'Import';
          return; // No file selected
      }
      const originalImportText = importSpan ? importSpan.textContent : 'Import'; // Store original text if possible

      // Basic file type check
      if (!file.type.match('application/json') && !file.name.toLowerCase().endsWith('.json')) {
          alert('Import failed: Please select a valid JSON file (.json).');
          importBtn.disabled = false;
          importBtn.querySelector('span').textContent = 'Import';
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedData = JSON.parse(event.target.result);

          // Validate and flatten the imported data
          const validationResult = validateAndFlattenImportData(importedData);

          if (!validationResult.isValid) {
              throw new Error(validationResult.error || 'Imported data validation failed.');
          }

          const { flattenedData, entryCount: caseCount } = validationResult;

          if (caseCount === 0) {
            alert('No valid case data found in the import file.');
            return;
          }

          if (confirm(`Import ${caseCount} case note entr${caseCount === 1 ? 'y' : 'ies'}?\n\nWARNING: This will OVERWRITE ALL existing notes and statuses stored by this extension.\n\nProceed?`)) {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ [CASE_METADATA_KEY]: flattenedData }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
            updateCasesList(); // Refresh the list in the popup
            alert(`Import successful! ${caseCount} entr${caseCount === 1 ? 'y' : 'ies'} loaded.`);
            console.log(`Import successful (${caseCount} entries).`);
          }
        } catch (error) {
          console.error('Import error:', error);
          alert(`Error importing file: ${error.message}. Please ensure it's a valid JSON export.`);
        } finally {
            importBtn.disabled = false;
            if (importSpan) importSpan.textContent = 'Import';
        }
      };
      reader.onerror = (err) => {
          console.error("File reading error:", err);
          alert("Error reading the selected file.");
          importBtn.disabled = false;
          if (importSpan) importSpan.textContent = 'Import';
      };
      reader.readAsText(file);
    });
  } else {
      console.warn("Popup element #fileInput not found.");
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear ALL stored case notes and statuses?\n\nThis cannot be undone!')) {
        clearBtn.disabled = true;
        const clearSpan = clearBtn.querySelector('span');
        if (clearSpan) clearSpan.textContent = 'Clearing...';
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.remove(CASE_METADATA_KEY, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });
            updateCasesList(); // Refresh the list
            alert('Stored case notes and statuses cleared.');
            console.log("Case metadata cleared from local storage.");
        } catch (error) {
            console.error('Error clearing case metadata:', error);
            alert(`Error clearing data: ${error.message}`);
        } finally {
            clearBtn.disabled = false;
            if (clearSpan) clearSpan.textContent = 'Clear';
        }
      }
    });
  } else {
      console.warn("Popup element #clearBtn not found.");
  }

  // Event delegation for delete buttons within the list
  if (listElement) {
    listElement.addEventListener('click', (event) => {
      // Find the closest delete button ancestor
      const targetButton = event.target.closest('button'); // Find the clicked button

      if (!targetButton) return; // Exit if click wasn't on a button

      if (targetButton.classList.contains('delete-case-btn')) {
        const compositeKey = targetButton.dataset.compositeKey; // Use targetButton here
        handleDeleteCase(compositeKey);
      } else if (targetButton.classList.contains('edit-case-btn')) {
        const compositeKey = targetButton.dataset.compositeKey;
        openEditModal(compositeKey);
      }
    });
  } else {
      console.warn("Popup element #caseMetadataList not found for event delegation.");
  }

  // Modal Save button
  if (saveEditBtn) {
      saveEditBtn.addEventListener('click', handleSaveChanges);
  } else {
      console.warn("Popup element #saveEditBtn not found.");
  }

  // Modal Cancel button
  if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', closeEditModal);
  } else {
      console.warn("Popup element #cancelEditBtn not found.");
  }

  // --- Custom Dropdown Logic ---
  if (statusPreviewButton && statusDropdownList && statusHiddenInput) {
      // Toggle dropdown list visibility
      statusPreviewButton.addEventListener('click', () => {
          const isVisible = statusDropdownList.classList.toggle('visible');
          statusPreviewButton.setAttribute('aria-expanded', isVisible);
      });
      statusPreviewButton.addEventListener('keydown', (event) => { // Allow opening with Enter/Space
          if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const isVisible = statusDropdownList.classList.toggle('visible');
              statusPreviewButton.setAttribute('aria-expanded', isVisible);
          }
      });

      // Handle option selection from the custom list
      statusDropdownList.addEventListener('click', (event) => {
          const selectedItem = event.target.closest('li[data-value]');
          if (selectedItem) {
              const newValue = selectedItem.dataset.value;
              updateSelectedStatusIconPreview(newValue); // Updates preview button and hidden input
              statusDropdownList.classList.remove('visible'); // Hide list
              statusPreviewButton.setAttribute('aria-expanded', 'false');
              statusPreviewButton.focus(); // Return focus to the button
          }
      });
  } else {
      console.warn("Custom status dropdown elements not found (#statusIconPreview, #statusDropdownList, #editStatusSymbolValue).");
  }
  // --- End Custom Dropdown Logic ---

  // Modal Clear Color button
  if (clearStatusColorBtn) {
      clearStatusColorBtn.addEventListener('click', () => {
          document.getElementById('editStatusColor').value = '#000000'; // Reset to black or another default
      });
  }

  // Color Swatch click handler (using event delegation)
  if (colorSwatchContainer) {
      colorSwatchContainer.addEventListener('click', (event) => {
          const swatch = event.target.closest('.color-swatch');
          if (swatch && swatch.dataset.color) {
              const colorInput = document.getElementById('editStatusColor');
              if (colorInput) {
                  colorInput.value = swatch.dataset.color;
                  // Optional: Trigger input event if needed by other listeners
                  // colorInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
          }
      });
  }
  // Optional: Close modal if clicking outside the modal content
  if (modal) {
      modal.addEventListener('click', (event) => {
          // Close modal if backdrop is clicked
          if (event.target === modal) {
              closeEditModal();
          }
          // Close custom dropdown if click is outside the preview button AND the list
          if (statusPreviewButton && statusDropdownList && !statusPreviewButton.contains(event.target) && !statusDropdownList.contains(event.target)) {
              statusDropdownList.classList.remove('visible');
              statusPreviewButton.setAttribute('aria-expanded', 'false');
          }
      });
  }

  // Merge Data button
  if (mergeDataBtn) {
    mergeDataBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('merge.html') });
    });
  } else {
    console.warn("Popup element #mergeDataBtn not found.");
  }
  // Documentation Link
  if (documentationLink) {
    documentationLink.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default anchor behavior
      chrome.tabs.create({ url: chrome.runtime.getURL('documentation.html') });
    });
  }
});
