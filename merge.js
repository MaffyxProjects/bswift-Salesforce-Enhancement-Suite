// merge.js

document.addEventListener('DOMContentLoaded', () => {
  const file1Input = document.getElementById('file1');
  const file2Input = document.getElementById('file2');
  const file1NameDisplay = document.getElementById('file1Name');
  const file2NameDisplay = document.getElementById('file2Name');
  const processFilesBtn = document.getElementById('processFilesBtn');
  const comparisonResultsDiv = document.getElementById('comparisonResults');
  const exportMergedBtn = document.getElementById('exportMergedBtn');
  const importToExtensionBtn = document.getElementById('importToExtensionBtn');

  // Result list elements
  const uniqueFile1List = document.getElementById('uniqueFile1List');
  const uniqueFile2List = document.getElementById('uniqueFile2List');
  const duplicatesList = document.getElementById('duplicatesList');
  const conflictsList = document.getElementById('conflictsList');
    const removedEntriesSection = document.getElementById('removedEntriesSection');
    const removedEntriesList = document.getElementById('removedEntriesList');

  // Summary count elements
  const file1CountEl = document.getElementById('file1Count');
  const file2CountEl = document.getElementById('file2Count');
  const totalUniqueCountEl = document.getElementById('totalUniqueCount');
  const conflictCountEl = document.getElementById('conflictCount');
  const uniqueFile1CountEl = document.getElementById('uniqueFile1Count');
  const uniqueFile2CountEl = document.getElementById('uniqueFile2Count');
  const duplicatesCountEl = document.getElementById('duplicatesCount');
  const conflictsListCountEl = document.getElementById('conflictsListCount');
    const removedEntriesCountEl = document.getElementById('removedEntriesCount');

  // Conflict Modal Elements
  const conflictModal = document.getElementById('editConflictModal');
  const conflictModalTitle = document.getElementById('conflictModalTitle');
  const conflictModalKeyInput = document.getElementById('conflictModalKey');
  const conflictCaseInfoSpan = document.getElementById('conflictCaseInfo');
    const conflictDataDisplayDiv = document.querySelector('#editConflictModal .conflict-data-display'); // Target the container
    const conflictUrgentNoteTextarea = document.getElementById('conflictUrgentNote');
  const conflictNoteTextarea = document.getElementById('conflictNote');
  const conflictIsUrgentCheckbox = document.getElementById('conflictIsUrgent');
  const conflictStatusSymbolSelect = document.getElementById('conflictStatusSymbol');
  const conflictStatusColorInput = document.getElementById('conflictStatusColor');
  const conflictCaseLinkUrlInput = document.getElementById('conflictCaseLinkUrl');
  const saveConflictBtn = document.getElementById('saveConflictBtn');
  const cancelConflictBtn = document.getElementById('cancelConflictBtn');

  let file1Data = null;
  let file2Data = null;
  let mergedData = {}; // Store final merged data
  let resolvedConflicts = {}; // Store user's choices for conflicts
    let removedItemsData = {}; // Store data of removed items: { [key]: { type: 'unique'/'conflict', originalData1: {}, originalData2: {} (if conflict), sourceFile: 'file1'/'file2' } }

  // Populate status symbols in conflict modal (simplified for now)
  if (typeof STATUS_SYMBOLS !== 'undefined' && conflictStatusSymbolSelect) {
      Object.entries(STATUS_SYMBOLS).forEach(([key, { label }]) => {
          const option = document.createElement('option');
          option.value = key;
          option.textContent = label;
          conflictStatusSymbolSelect.appendChild(option);
      });
  }

  file1Input.addEventListener('change', (e) => {
      file1NameDisplay.textContent = e.target.files[0] ? e.target.files[0].name : 'No file selected';
  });
  file2Input.addEventListener('change', (e) => {
      file2NameDisplay.textContent = e.target.files[0] ? e.target.files[0].name : 'No file selected';
  });

  processFilesBtn.addEventListener('click', async () => {
      if (!file1Input.files[0] || !file2Input.files[0]) {
          alert('Please select two files to process.');
          return;
      }

      processFilesBtn.disabled = true;
      processFilesBtn.querySelector('span:last-child').textContent = 'Processing...';

      try {
          const data1Promise = readFileAsJson(file1Input.files[0]);
          const data2Promise = readFileAsJson(file2Input.files[0]);
          const [rawFile1, rawFile2] = await Promise.all([data1Promise, data2Promise]);

          file1Data = validateAndFlattenImportData(rawFile1).flattenedData || {};
          file2Data = validateAndFlattenImportData(rawFile2).flattenedData || {};

          compareAndDisplayResults();
          comparisonResultsDiv.style.display = 'block';
          exportMergedBtn.style.display = 'inline-flex';
          importToExtensionBtn.style.display = 'inline-flex';

      } catch (error) {
          console.error('Error processing files:', error);
          alert(`Error processing files: ${error.message}`);
          comparisonResultsDiv.style.display = 'none';
          exportMergedBtn.style.display = 'none';
          importToExtensionBtn.style.display = 'none';
      } finally {
          processFilesBtn.disabled = false;
          processFilesBtn.querySelector('span:last-child').textContent = 'Process & Compare Files';
      }
  });

  function readFileAsJson(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  resolve(JSON.parse(event.target.result));
              } catch (e) {
                  reject(new Error(`Error parsing JSON from ${file.name}: ${e.message}`));
              }
          };
          reader.onerror = (err) => reject(new Error(`Error reading file ${file.name}: ${err}`));
          reader.readAsText(file);
      });
  }

  function compareAndDisplayResults() {
      mergedData = {};
      resolvedConflicts = {};
        removedItemsData = {};
      clearResultLists();

      const allKeys = new Set([...Object.keys(file1Data), ...Object.keys(file2Data)]);
      let uniqueTo1 = 0, uniqueTo2 = 0, duplicates = 0, conflicts = 0;

      allKeys.forEach(key => {
          const data1 = file1Data[key];
          const data2 = file2Data[key];

          if (data1 && !data2) { // Unique to File 1
              uniqueTo1++;
              mergedData[key] = data1;
                renderItem(uniqueFile1List, key, data1, 'File 1', 'uniqueFile1');
          } else if (!data1 && data2) { // Unique to File 2
              uniqueTo2++;
              mergedData[key] = data2;
                renderItem(uniqueFile2List, key, data2, 'File 2', 'uniqueFile2');
          } else if (data1 && data2) { // Present in both
              if (isEqual(data1, data2)) { // Duplicate
                  duplicates++;
                  mergedData[key] = data1; // Take either one
                  renderItem(duplicatesList, key, data1, 'Duplicate (Auto-merged)');
              } else { // Conflict
                  conflicts++;
                  renderConflictItem(conflictsList, key, data1, data2);
                  // For now, conflicts are not added to mergedData until resolved
              }
          }
      });

      updateSummaryCounts(Object.keys(file1Data).length, Object.keys(file2Data).length, uniqueTo1, uniqueTo2, duplicates, conflicts);
        removedEntriesSection.style.display = 'none'; // Hide removed section initially
  }

  function isEqual(obj1, obj2) {
      // Simple JSON string comparison for deep equality.
      // For more complex objects, a proper deep equal function might be needed.
      return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

    function renderItem(listElement, key, data, sourceText, originalSourceType) {
      const { accountName, subject, bswiftId } = parseCompositeKey(key);
      const item = document.createElement('div');
      item.className = 'case-item'; // Re-use popup.css styling
      item.innerHTML = `
          <div class="case-header">
              <div class="case-account" title="${accountName}">${accountName}</div>
              ${data.statusSymbol && data.statusSymbol !== 'none' && typeof STATUS_SYMBOLS !== 'undefined' && STATUS_SYMBOLS[data.statusSymbol] ? `<div class="case-symbol" title="Status: ${STATUS_SYMBOLS[data.statusSymbol]?.label || ''}"><span class="material-symbols-outlined" style="color: ${data.statusColor || STATUS_SYMBOLS[data.statusSymbol]?.color || '#888'}">${STATUS_SYMBOLS[data.statusSymbol]?.icon || ''}</span></div>` : ''}
          </div>
          <div class="case-subject" title="${subject}">${subject}</div>
          ${data.generalNote ? `<div class="case-note-preview" title="${data.generalNote}">${generateNotePreview(data.generalNote)}</div>` : ''}
            <div class="case-footer">
                <div class="case-id">${bswiftId ? `ID: ${bswiftId}` : ''}</div>
                <div><em>Source: ${sourceText}</em></div>
            </div>
            <div class="item-actions">
                <button class="action-button remove-item-btn" data-key="${key}" data-source-type="${originalSourceType}">Remove</button>
            </div>
      `;
      listElement.appendChild(item);
        item.querySelector('.remove-item-btn').addEventListener('click', handleRemoveItemClick);
  }

  function renderConflictItem(listElement, key, data1, data2) {
      const { accountName, subject, bswiftId } = parseCompositeKey(key);
      const item = document.createElement('div');
      item.className = 'conflict-item';
      item.dataset.key = key;

      item.innerHTML = `
          <div class="conflict-item-header">
              <strong>Account:</strong> ${accountName} <br>
              <strong>Subject:</strong> ${subject} ${bswiftId ? `(ID: ${bswiftId})` : ''}
          </div>
          <div class="conflict-details">
              <p><strong>Data in File 1:</strong> ${dataSummary(data1)}</p>
              <p><strong>Data in File 2:</strong> ${dataSummary(data2)}</p>
          </div>
          <div class="conflict-actions">
              <button class="action-button choose-btn" data-source="file1">Use File 1</button>
              <button class="action-button choose-btn" data-source="file2">Use File 2</button>
              <button class="action-button edit-conflict-btn">Edit Manually</button>
                <button class="action-button remove-item-btn" data-key="${key}" data-source-type="conflict">Remove</button>
          </div>
          <div class="resolution-status" style="font-style: italic; font-size: 11px; margin-top: 5px; color: green; display: none;"></div>
      `;
      listElement.appendChild(item);

      item.querySelector('[data-source="file1"]').addEventListener('click', () => resolveConflict(key, data1, item));
      item.querySelector('[data-source="file2"]').addEventListener('click', () => resolveConflict(key, data2, item));
      item.querySelector('.edit-conflict-btn').addEventListener('click', () => openConflictEditModal(key, data1, data2));
        item.querySelector('.remove-item-btn').addEventListener('click', handleRemoveItemClick);
  }

  function dataSummary(data) {
      if (!data) return "N/A";
      let summary = [];
      if (data.generalNote) summary.push(`Note: "${generateNotePreview(data.generalNote)}"`);
      if (data.isUrgent) summary.push("Urgent");
        if (data.urgentNote) summary.push(`Urgent Note: "${generateNotePreview(data.urgentNote)}"`);
      if (data.statusSymbol && data.statusSymbol !== 'none' && typeof STATUS_SYMBOLS !== 'undefined' && STATUS_SYMBOLS[data.statusSymbol]) summary.push(`Symbol: ${STATUS_SYMBOLS[data.statusSymbol]?.label}`);
      if (data.caseLinkUrl) summary.push("Has Link");
      return summary.length > 0 ? summary.join(', ') : "No distinct data";
  }

  function resolveConflict(key, chosenData, conflictItemElement) {
      mergedData[key] = chosenData;
      resolvedConflicts[key] = chosenData; // Mark as resolved
      conflictItemElement.style.backgroundColor = '#d4edda'; // Light green to indicate resolution
      conflictItemElement.querySelector('.conflict-actions').style.display = 'none';
      const statusEl = conflictItemElement.querySelector('.resolution-status');
      statusEl.textContent = `Resolved. Using data from ${file1Data[key] === chosenData ? 'File 1' : 'File 2'}.`;
      statusEl.style.display = 'block';
      updateTotalUniqueCount();
  }

  function openConflictEditModal(key, data1, data2) {
      conflictModalKeyInput.value = key;
      const { accountName, subject, bswiftId } = parseCompositeKey(key);
      conflictCaseInfoSpan.textContent = `${accountName} - ${subject} ${bswiftId ? `(ID: ${bswiftId})` : ''}`;

        // Clear previous comparison and pre-fill "Edit Merged Version" section
        conflictDataDisplayDiv.querySelectorAll('.conflict-field-comparison').forEach(el => el.remove());

        const fieldsToCompare = [
            { key: 'isUrgent', label: 'Is Urgent', type: 'boolean' },
            { key: 'urgentNote', label: 'Urgent Note', type: 'text' },
            { key: 'generalNote', label: 'General Note', type: 'text' },
            { key: 'statusSymbol', label: 'Status Symbol', type: 'symbol' },
            { key: 'statusColor', label: 'Status Color', type: 'color' },
            { key: 'caseLinkUrl', label: 'Case Link URL', type: 'url' }
        ];

        fieldsToCompare.forEach(field => {
            const val1 = data1[field.key];
            const val2 = data2[field.key];
            const different = !isEqualIndividual(val1, val2, field.key);

            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'conflict-field-comparison';
            fieldDiv.innerHTML = `
                <span class="field-label">${field.label}:</span>
                <div class="file-value ${different && field.key !== 'statusColor' ? 'different' : ''}"><strong>File 1:</strong> ${formatFieldValue(val1, field.type, data1.statusColor)}</div>
                <div class="file-value ${different && field.key !== 'statusColor' ? 'different' : ''}"><strong>File 2:</strong> ${formatFieldValue(val2, field.type, data2.statusColor)}</div>
            `;
            // Insert before the <hr>
            const hrElement = conflictDataDisplayDiv.querySelector('hr');
            if (hrElement) {
                conflictDataDisplayDiv.insertBefore(fieldDiv, hrElement);
            } else {
                conflictDataDisplayDiv.appendChild(fieldDiv);
            }
        });

        // Pre-fill "Edit Merged Version" section (defaulting to File 1 for simplicity, user can change)
      conflictNoteTextarea.value = data1.generalNote || '';
        conflictUrgentNoteTextarea.value = data1.urgentNote || '';
      conflictIsUrgentCheckbox.checked = data1.isUrgent || false;
      conflictStatusSymbolSelect.value = data1.statusSymbol || 'none';
        // Only set color if symbol is not 'none' and color exists, otherwise default
        if (data1.statusSymbol && data1.statusSymbol !== 'none' && data1.statusColor) {
            conflictStatusColorInput.value = data1.statusColor;
        } else if (data1.statusSymbol && data1.statusSymbol !== 'none') {
            // If symbol exists but no custom color, use symbol's default color
            conflictStatusColorInput.value = STATUS_SYMBOLS[data1.statusSymbol]?.color || '#000000';
        }
        else {
            conflictStatusColorInput.value = '#000000'; // Default for 'none' or missing
        }
      conflictCaseLinkUrlInput.value = data1.caseLinkUrl || '';

      conflictModal.style.display = 'flex';
  }

  saveConflictBtn.addEventListener('click', () => {
      const key = conflictModalKeyInput.value;
      const editedData = {
          generalNote: conflictNoteTextarea.value.trim(),
            urgentNote: conflictUrgentNoteTextarea.value.trim(),
          isUrgent: conflictIsUrgentCheckbox.checked,
          statusSymbol: conflictStatusSymbolSelect.value,
          statusColor: conflictStatusColorInput.value,
          caseLinkUrl: conflictCaseLinkUrlInput.value.trim()
      };
      if (editedData.statusSymbol === 'none') editedData.statusColor = '';

      const conflictItemElement = conflictsList.querySelector(`.conflict-item[data-key="${key}"]`);
      resolveConflict(key, editedData, conflictItemElement);
      conflictItemElement.querySelector('.resolution-status').textContent = 'Resolved with manual edits.';
      closeConflictEditModal();
  });

    function isEqualIndividual(val1, val2, key) {
        // Handle undefined vs empty string as same for notes/links
        if (['generalNote', 'urgentNote', 'caseLinkUrl'].includes(key)) {
            const v1 = val1 || '';
            const v2 = val2 || '';
            return v1 === v2;
        }
        // Handle statusColor: if symbol is 'none', color doesn't matter
        if (key === 'statusColor') {
            // This needs context of the symbol. For now, direct compare.
            // A better approach would be to compare only if symbol is not 'none'.
            // However, the modal prefill logic handles this.
            return (val1 || '') === (val2 || '');
        }
        return JSON.stringify(val1) === JSON.stringify(val2);
    }

    function formatFieldValue(value, type, associatedColor) {
        if (value === undefined || value === null) return '<em>N/A</em>';
        switch (type) {
            case 'boolean':
                return value ? 'Yes' : 'No';
            case 'symbol':
                return STATUS_SYMBOLS[value]?.label || value;
            case 'color':
                return `<span style="display:inline-block; width:1em; height:1em; background-color:${value}; border:1px solid #ccc; margin-right: 5px; vertical-align: middle;"></span> ${value}`;
            case 'text':
                return value ? `<pre>${value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` : '<em>Empty</em>';
            default:
                return value.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }

  cancelConflictBtn.addEventListener('click', closeConflictEditModal);
  conflictModal.addEventListener('click', (e) => { if (e.target === conflictModal) closeConflictEditModal(); });

  function closeConflictEditModal() {
      conflictModal.style.display = 'none';
  }

  function clearResultLists() {
        [uniqueFile1List, uniqueFile2List, duplicatesList, conflictsList, removedEntriesList].forEach(list => list.innerHTML = '');
  }

  function updateSummaryCounts(f1Count, f2Count, u1Count, u2Count, dupeCount, confCount) {
      file1CountEl.textContent = f1Count;
      file2CountEl.textContent = f2Count;
      uniqueFile1CountEl.textContent = u1Count;
      uniqueFile2CountEl.textContent = u2Count;
      duplicatesCountEl.textContent = dupeCount;
      conflictsListCountEl.textContent = confCount; // This is the count of items in the conflict list
      conflictCountEl.textContent = confCount; // This is the summary "Conflicts Found"
        removedEntriesCountEl.textContent = Object.keys(removedItemsData).length;
      updateTotalUniqueCount();

        removedEntriesSection.style.display = Object.keys(removedItemsData).length > 0 ? 'block' : 'none';
    }

    function handleRemoveItemClick(event) {
        const key = event.target.dataset.key;
        const sourceType = event.target.dataset.sourceType; // 'uniqueFile1', 'uniqueFile2', 'conflict'
        const itemElement = event.target.closest('.case-item, .conflict-item');

        if (!key || !itemElement) return;

        let removedDataEntry = { key };

        if (sourceType === 'uniqueFile1') {
            removedDataEntry.type = 'unique';
            removedDataEntry.originalData = { ...file1Data[key] };
            removedDataEntry.sourceFile = 'file1';
            uniqueFile1CountEl.textContent = parseInt(uniqueFile1CountEl.textContent) - 1;
        } else if (sourceType === 'uniqueFile2') {
            removedDataEntry.type = 'unique';
            removedDataEntry.originalData = { ...file2Data[key] };
            removedDataEntry.sourceFile = 'file2';
            uniqueFile2CountEl.textContent = parseInt(uniqueFile2CountEl.textContent) - 1;
        } else if (sourceType === 'conflict') {
            removedDataEntry.type = 'conflict';
            removedDataEntry.originalData1 = { ...file1Data[key] };
            removedDataEntry.originalData2 = { ...file2Data[key] };
            conflictsListCountEl.textContent = parseInt(conflictsListCountEl.textContent) - 1;
            conflictCountEl.textContent = parseInt(conflictCountEl.textContent) - 1;
            delete resolvedConflicts[key]; // If it was resolved, unresolve it
        }

        removedItemsData[key] = removedDataEntry;
        delete mergedData[key]; // Remove from final merge set

        itemElement.remove();
        renderRemovedItem(removedEntriesList, removedDataEntry);
        updateSummaryCounts(
            parseInt(file1CountEl.textContent), parseInt(file2CountEl.textContent),
            parseInt(uniqueFile1CountEl.textContent), parseInt(uniqueFile2CountEl.textContent),
            parseInt(duplicatesCountEl.textContent), parseInt(conflictCountEl.textContent)
        );
    }

    function renderRemovedItem(listElement, removedEntry) {
        const { key, type, originalData, originalData1, originalData2, sourceFile } = removedEntry;
        const displayData = type === 'unique' ? originalData : originalData1; // Show file1 data for conflicts as representative
        const { accountName, subject, bswiftId } = parseCompositeKey(key);

        const item = document.createElement('div');
        item.className = 'case-item removed-item'; // Add 'removed-item' for potential specific styling
        item.innerHTML = `
            <div class="case-header">
                <div class="case-account" title="${accountName}">${accountName}</div>
                ${displayData.statusSymbol && displayData.statusSymbol !== 'none' && typeof STATUS_SYMBOLS !== 'undefined' && STATUS_SYMBOLS[displayData.statusSymbol] ? `<div class="case-symbol" title="Status: ${STATUS_SYMBOLS[displayData.statusSymbol]?.label || ''}"><span class="material-symbols-outlined" style="color: ${displayData.statusColor || STATUS_SYMBOLS[displayData.statusSymbol]?.color || '#888'}">${STATUS_SYMBOLS[displayData.statusSymbol]?.icon || ''}</span></div>` : ''}
            </div>
            <div class="case-subject" title="${subject}">${subject}</div>
            ${displayData.generalNote ? `<div class="case-note-preview" title="${displayData.generalNote}">${generateNotePreview(displayData.generalNote)}</div>` : ''}
            <div class="case-footer">
                <div class="case-id">${bswiftId ? `ID: ${bswiftId}` : ''}</div>
                <div><em>Originally: ${type === 'conflict' ? 'Conflict' : `Unique to ${sourceFile}`}</em></div>
            </div>
            <div class="item-actions">
                <button class="action-button add-back-item-btn" data-key="${key}">Add Back</button>
            </div>
        `;
        listElement.appendChild(item);
        item.querySelector('.add-back-item-btn').addEventListener('click', handleAddBackItemClick);
    }

    function handleAddBackItemClick(event) {
        const key = event.target.dataset.key;
        const removedEntry = removedItemsData[key];
        const itemElement = event.target.closest('.case-item');

        if (!key || !removedEntry || !itemElement) return;

        // Re-render the item in its original list
        if (removedEntry.type === 'unique') {
            const targetList = removedEntry.sourceFile === 'file1' ? uniqueFile1List : uniqueFile2List;
            renderItem(targetList, key, removedEntry.originalData, `File ${removedEntry.sourceFile.slice(-1)}`, `uniqueFile${removedEntry.sourceFile.slice(-1)}`);
            mergedData[key] = removedEntry.originalData;
            if (removedEntry.sourceFile === 'file1') uniqueFile1CountEl.textContent = parseInt(uniqueFile1CountEl.textContent) + 1;
            else uniqueFile2CountEl.textContent = parseInt(uniqueFile2CountEl.textContent) + 1;
        } else if (removedEntry.type === 'conflict') {
            renderConflictItem(conflictsList, key, removedEntry.originalData1, removedEntry.originalData2);
            // Conflicts are not added to mergedData until resolved, so no change to mergedData here
            conflictsListCountEl.textContent = parseInt(conflictsListCountEl.textContent) + 1;
            conflictCountEl.textContent = parseInt(conflictCountEl.textContent) + 1;
        }

        delete removedItemsData[key];
        itemElement.remove();
        updateSummaryCounts(
            parseInt(file1CountEl.textContent), parseInt(file2CountEl.textContent),
            parseInt(uniqueFile1CountEl.textContent), parseInt(uniqueFile2CountEl.textContent),
            parseInt(duplicatesCountEl.textContent), parseInt(conflictCountEl.textContent)
        );
  }

  function updateTotalUniqueCount() {
      // Total unique = unique to file1 + unique to file2 + duplicates (count as 1) + resolved conflicts
      const resolvedConflictCount = Object.keys(resolvedConflicts).length;
      const autoMergedDuplicatesCount = parseInt(duplicatesCountEl.textContent);
      const total = parseInt(uniqueFile1CountEl.textContent) + parseInt(uniqueFile2CountEl.textContent) + autoMergedDuplicatesCount + resolvedConflictCount;
      totalUniqueCountEl.textContent = total;
  }

  exportMergedBtn.addEventListener('click', () => {
      const unresolvedConflicts = parseInt(conflictsListCountEl.textContent) - Object.keys(resolvedConflicts).length;
      if (unresolvedConflicts > 0) {
          if (!confirm(`${unresolvedConflicts} conflict(s) are still unresolved. Exporting now will exclude them. Continue?`)) {
              return;
          }
      }

      // Reconstruct the grouped format for export
      const groupedCases = Object.entries(mergedData).reduce((acc, [compositeKey, caseData]) => {
          const { accountName } = parseCompositeKey(compositeKey);
          const displayAccount = accountName || 'No Account Name';
          if (!acc[displayAccount]) acc[displayAccount] = {};
          acc[displayAccount][compositeKey] = caseData;
          return acc;
      }, {});

      const sortedGroupedCases = Object.keys(groupedCases)
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          .reduce((acc, key) => { acc[key] = groupedCases[key]; return acc; }, {});

        // Calculate summary metrics for the merged data
        let totalEntries = 0;
        let urgentCount = 0;
        const statusSymbolCounts = {};
        let generalNoteCount = 0;
        let urgentNoteCount = 0;
        let caseLinkCount = 0;

        Object.values(mergedData).forEach(data => { // Iterate over the flat mergedData
            totalEntries++;
            if (data.isUrgent) urgentCount++;
            if (data.generalNote && data.generalNote.trim() !== '') generalNoteCount++;
            if (data.urgentNote && data.urgentNote.trim() !== '') urgentNoteCount++;
            if (data.caseLinkUrl && data.caseLinkUrl.trim() !== '') caseLinkCount++;
            if (data.statusSymbol && data.statusSymbol !== 'none') {
                statusSymbolCounts[data.statusSymbol] = (statusSymbolCounts[data.statusSymbol] || 0) + 1;
            }
        });

        const summaryMetrics = { totalEntries, urgentCount, nonUrgentCount: totalEntries - urgentCount, statusSymbolCounts, generalNoteCount, urgentNoteCount, caseLinkCount };

      const exportDataWrapper = {
          version: "Merged-Data-v" + (typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.0'), // Generic version
          exportDate: new Date().toISOString(),
          sourceFiles: {
              file1: file1Input.files[0]?.name || 'N/A',
              file2: file2Input.files[0]?.name || 'N/A',
          },
            summaryMetrics: summaryMetrics, // Add the new metrics object
          data: sortedGroupedCases
      };

      const dataStr = JSON.stringify(exportDataWrapper, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-case-notes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Merged data exported. Contains ${Object.keys(mergedData).length} entries.`);
  });

  importToExtensionBtn.addEventListener('click', async () => {
      const unresolvedConflicts = parseInt(conflictsListCountEl.textContent) - Object.keys(resolvedConflicts).length;
      if (unresolvedConflicts > 0) {
          if (!confirm(`${unresolvedConflicts} conflict(s) are still unresolved. Importing now will exclude them from being stored in the extension. Continue?`)) {
              return;
          }
      }
      if (Object.keys(mergedData).length === 0) {
          alert("No data to import. Process files and resolve conflicts first.");
          return;
      }

      if (confirm(`This will OVERWRITE ALL existing notes and statuses in your extension with the ${Object.keys(mergedData).length} merged entries. Are you sure?`)) {
          try {
              // Ensure CASE_METADATA_KEY is defined (should be from popup.js if included)
              const storageKey = typeof CASE_METADATA_KEY !== 'undefined' ? CASE_METADATA_KEY : 'sfx_enhancement_case_metadata'; // Fallback just in case
              if (!storageKey) { // Check if it's truly undefined or empty
                  alert("Critical error: Storage key not defined. Cannot import.");
                  return;
              }
              await chrome.storage.local.set({ [CASE_METADATA_KEY]: mergedData });
              alert("Merged data successfully imported into the extension!");
          } catch (error) {
              console.error("Error importing merged data to extension:", error);
              alert(`Failed to import to extension: ${error.message}`);
          }
      }
  });

});

// Helper from popup.js (ensure popup.js is loaded or copy these functions)
// For simplicity, assuming popup.js is included in merge.html for these helpers.
// If not, you'd copy parseCompositeKey, generateNotePreview, STATUS_SYMBOLS, CASE_METADATA_KEY, validateAndFlattenImportData here.
// Make sure these functions are globally accessible if popup.js is included via <script>
// or pass them explicitly if using modules.
