import { calculateRowAmounts } from "../calculation/invoice-calculations.js";
import { formatCurrencyInr, safeText } from "../core/utils.js";
import { DEFAULT_CATALOG_PAYLOAD } from "./sample-data.js";

function downloadTextFile(fileName, content, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file?.name || "file"}.`));
    reader.readAsText(file);
  });
}

function toInputNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function escapeHtml(value) {
  return safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setInputValue(input, value) {
  const normalized = value == null ? "" : String(value);
  if (input.type === "checkbox") {
    input.checked = Boolean(value);
    return;
  }
  if (input.value !== normalized) {
    input.value = normalized;
  }
}

function sectionLabel(section) {
  return section === "labour" ? "Labour" : "Parts";
}

function sectionType(section) {
  return section === "labour" ? "labour" : "parts";
}

function buildCatalogRows(section, state, selectedIds, query) {
  const normalizedQuery = safeText(query).trim().toLowerCase();
  const items = state.catalogs[section].filter((item) => {
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      item.name,
      item.description,
      item.category,
      item.subcategory,
      item.sacCode
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="6" class="empty-cell">No ${escapeHtml(sectionLabel(section).toLowerCase())} catalog items match the current search.</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const checked = selectedIds.has(item.id) ? "checked" : "";
      const active = item.status?.isActive === false ? "Inactive" : "Active";
      return `
        <tr>
          <td>
            <input type="checkbox" data-catalog-select="${escapeHtml(section)}" value="${escapeHtml(item.id)}" ${checked}>
          </td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.sacCode)}</td>
          <td class="num">${escapeHtml(item.defaults?.qty ?? 1)}</td>
          <td class="num">${escapeHtml(active)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildRowEditorTable(section, rows) {
  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="${section === "parts" ? 13 : 12}" class="empty-cell">
          No ${escapeHtml(sectionLabel(section).toLowerCase())} rows added yet.
        </td>
      </tr>
    `;
  }

  return rows
    .map((row, index) => {
      const values = row.values;
      const computed = calculateRowAmounts(values, sectionType(section));
      return `
        <tr data-row-id="${escapeHtml(row.rowId)}">
          <td class="num">${index + 1}</td>
          <td><input data-row-field="${escapeHtml(section)}.description" value="${escapeHtml(values.description)}"></td>
          <td><input data-row-field="${escapeHtml(section)}.sacCode" value="${escapeHtml(values.sacCode)}"></td>
          <td><input data-row-field="${escapeHtml(section)}.qty" type="number" min="0" step="0.01" value="${escapeHtml(values.qty)}"></td>
          <td><input data-row-field="${escapeHtml(section)}.rate" type="number" min="0" step="0.01" value="${escapeHtml(values.rate)}"></td>
          <td class="stack-cell">
            <label class="mini-toggle">
              <input data-row-field="${escapeHtml(section)}.taxableAmountOverrideEnabled" type="checkbox" ${values.taxableAmountOverrideEnabled ? "checked" : ""}>
              <span>Override</span>
            </label>
            <input data-row-field="${escapeHtml(section)}.taxableAmountOverride" type="number" min="0" step="0.01" value="${escapeHtml(values.taxableAmountOverride ?? "")}" ${values.taxableAmountOverrideEnabled ? "" : "disabled"}>
          </td>
          <td><input data-row-field="${escapeHtml(section)}.cgstRate" type="number" min="0" step="0.01" value="${escapeHtml(values.cgstRate)}"></td>
          <td><input data-row-field="${escapeHtml(section)}.sgstRate" type="number" min="0" step="0.01" value="${escapeHtml(values.sgstRate)}"></td>
          ${
            section === "parts"
              ? `<td><input data-row-field="${escapeHtml(section)}.discountPercent" type="number" min="0" step="0.01" value="${escapeHtml(values.discountPercent)}"></td>`
              : ""
          }
          <td class="num">${formatCurrencyInr(computed.taxableAmount)}</td>
          <td class="num">${formatCurrencyInr(computed.totalTax)}</td>
          <td class="num">${formatCurrencyInr(computed.totalAmountInclTaxes)}</td>
          <td class="row-actions">
            <button type="button" class="ghost-button" data-row-action="${escapeHtml(section)}.move-up">Up</button>
            <button type="button" class="ghost-button" data-row-action="${escapeHtml(section)}.move-down">Down</button>
            <button type="button" class="ghost-button" data-row-action="${escapeHtml(section)}.duplicate">Duplicate</button>
            <button type="button" class="ghost-button danger-button" data-row-action="${escapeHtml(section)}.delete">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function syncBoundInputs(root, state) {
  root.querySelectorAll("[data-bind]").forEach((input) => {
    const path = input.dataset.bind;
    const [scope, field] = path.split(".");
    let value = "";
    if (scope === "business") {
      value = state.business[field];
    } else if (scope === "customerVehicle") {
      value = state.customerVehicle[field];
    } else if (scope === "footerSettings") {
      value = state.footerSettings[field];
    } else if (scope === "app") {
      value = state.app[field];
    }
    setInputValue(input, value);
  });

  setInputValue(root.querySelector("#roundoff-enabled"), state.invoiceTotals.roundOffEnabled);
  setInputValue(root.querySelector("#roundoff-mode"), state.invoiceTotals.roundOffMode);
  setInputValue(root.querySelector("#roundoff-decimals"), state.invoiceTotals.roundOffDecimals);
  setInputValue(root.querySelector("#parts-max-rows"), state.invoiceRows.maxRows.parts);
  setInputValue(root.querySelector("#labour-max-rows"), state.invoiceRows.maxRows.labour);
  setInputValue(root.querySelector("#allow-blank-rows"), state.invoiceRows.allowBlankRows);
}

function updateValidation(root, validation) {
  const status = root.querySelector("#validation-status");
  const errors = root.querySelector("#validation-errors");
  const warnings = root.querySelector("#validation-warnings");

  status.textContent = validation.valid
    ? "Ready for export"
    : `${validation.errors.length} required field issue(s) need attention`;

  errors.innerHTML = validation.errors.length
    ? validation.errors.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join("")
    : "<li>No blocking validation errors.</li>";

  warnings.innerHTML = validation.warnings.length
    ? validation.warnings.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join("")
    : "<li>No layout warnings.</li>";
}

function updateTotalsSummary(root, state) {
  root.querySelector("#summary-parts-total").textContent = formatCurrencyInr(
    state.invoiceTotals.partsSummary.finalSectionInvoiceAmount
  );
  root.querySelector("#summary-labour-total").textContent = formatCurrencyInr(
    state.invoiceTotals.labourSummary.finalSectionInvoiceAmount
  );
  root.querySelector("#summary-grand-total").textContent = formatCurrencyInr(
    state.invoiceTotals.grandTotal,
    0
  );
}

export function mountAppUi(app, root = document) {
  const q = (selector) => root.querySelector(selector);
  const selectedCatalogIds = {
    parts: new Set(),
    labour: new Set()
  };
  const catalogQuery = {
    parts: "",
    labour: ""
  };

  const hiddenInputs = {
    logo: q("#file-logo"),
    signature: q("#file-signature"),
    stamp: q("#file-stamp"),
    importDraft: q("#file-import-draft"),
    importCatalog: q("#file-import-catalog")
  };

  function setPathValue(path, value, inputType = "text") {
    const [scope, field] = path.split(".");
    if (scope === "business") {
      app.actions.setBusinessField(field, value);
      return;
    }
    if (scope === "customerVehicle") {
      app.actions.setCustomerVehicleField(field, value);
      return;
    }
    if (scope === "footerSettings") {
      app.actions.setFooterField(field, value);
      return;
    }
    if (scope === "app" && field === "displayTitle") {
      app.store.update((draft) => {
        draft.app.displayTitle = inputType === "checkbox" ? Boolean(value) : value;
      });
    }
  }

  function rerenderPanels(state) {
    syncBoundInputs(root, state);
    q("#parts-catalog-rows").innerHTML = buildCatalogRows(
      "parts",
      state,
      selectedCatalogIds.parts,
      catalogQuery.parts
    );
    q("#labour-catalog-rows").innerHTML = buildCatalogRows(
      "labour",
      state,
      selectedCatalogIds.labour,
      catalogQuery.labour
    );
    q("#parts-editor-rows").innerHTML = buildRowEditorTable(
      "parts",
      state.invoiceRows.parts
    );
    q("#labour-editor-rows").innerHTML = buildRowEditorTable(
      "labour",
      state.invoiceRows.labour
    );
    updateValidation(root, state.preview.validation);
    updateTotalsSummary(root, state);
  }

  app.store.subscribe(rerenderPanels);
  rerenderPanels(app.store.getState());

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.dataset.bind) {
      const value = target.type === "checkbox" ? target.checked : target.value;
      setPathValue(target.dataset.bind, value, target.type);
      return;
    }

    if (target.matches("[data-catalog-query]")) {
      const section = target.dataset.catalogQuery;
      catalogQuery[section] = target.value;
      rerenderPanels(app.store.getState());
      return;
    }

    if (target.matches("[data-row-field]")) {
      const rowElement = target.closest("[data-row-id]");
      if (!rowElement) {
        return;
      }
      const rowId = rowElement.dataset.rowId;
      const [section, field] = target.dataset.rowField.split(".");
      const patch = {};
      if (target.type === "checkbox") {
        patch[field] = target.checked;
      } else if (["qty", "rate", "taxableAmountOverride", "cgstRate", "sgstRate", "discountPercent"].includes(field)) {
        patch[field] = target.value === "" ? null : toInputNumber(target.value, 0);
      } else {
        patch[field] = target.value;
      }
      app.actions.updateInvoiceRow(section, rowId, patch);
    }
  });

  root.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.matches("[data-catalog-select]")) {
      const section = target.dataset.catalogSelect;
      if (target.checked) {
        selectedCatalogIds[section].add(target.value);
      } else {
        selectedCatalogIds[section].delete(target.value);
      }
      return;
    }

    if (target.id === "roundoff-enabled" || target.id === "roundoff-mode" || target.id === "roundoff-decimals") {
      app.actions.setRoundOffConfig({
        enabled: q("#roundoff-enabled").checked,
        mode: q("#roundoff-mode").value,
        decimals: toInputNumber(q("#roundoff-decimals").value, 0)
      });
      return;
    }

    if (target.id === "parts-max-rows" || target.id === "labour-max-rows" || target.id === "allow-blank-rows") {
      app.actions.setTableVisualConfig({
        maxRows: {
          parts: toInputNumber(q("#parts-max-rows").value, 0),
          labour: toInputNumber(q("#labour-max-rows").value, 0)
        },
        allowBlankRows: q("#allow-blank-rows").checked
      });
      return;
    }

    try {
      if (target === hiddenInputs.logo && target.files?.[0]) {
        await app.io.setBusinessLogoFromFile(target.files[0]);
      }
      if (target === hiddenInputs.signature && target.files?.[0]) {
        await app.io.setSignatureFromFile(target.files[0]);
      }
      if (target === hiddenInputs.stamp && target.files?.[0]) {
        await app.io.setStampFromFile(target.files[0]);
      }
      if (target === hiddenInputs.importDraft && target.files?.[0]) {
        const content = await readFileAsText(target.files[0]);
        app.io.importInvoiceDraft(content, { mode: "replace" });
      }
      if (target === hiddenInputs.importCatalog && target.files?.[0]) {
        const content = await readFileAsText(target.files[0]);
        app.io.importCatalog(content, { mode: "merge" });
      }
    } catch (error) {
      q("#action-error").textContent = error.message;
    } finally {
      target.value = "";
    }
  });

  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button");
    if (!button) {
      return;
    }

    q("#action-error").textContent = "";

    if (button.dataset.openFile) {
      hiddenInputs[button.dataset.openFile]?.click();
      return;
    }

    if (button.dataset.addManual) {
      const section = button.dataset.addManual;
      app.actions.addManualRow(section, {
        description: section === "labour" ? "Workshop labour" : "Spare part",
        sacCode: section === "labour" ? "998714" : "8708",
        qty: 1,
        rate: 0,
        cgstRate: 9,
        sgstRate: 9,
        discountPercent: 0
      });
      return;
    }

    if (button.dataset.catalogAdd) {
      const section = button.dataset.catalogAdd;
      const ids = Array.from(selectedCatalogIds[section]);
      if (ids.length > 0) {
        app.actions.addRowsFromCatalog(section, ids);
      }
      return;
    }

    if (button.dataset.catalogClear) {
      selectedCatalogIds[button.dataset.catalogClear].clear();
      rerenderPanels(app.store.getState());
      return;
    }

    if (button.id === "load-sample-catalog") {
      app.io.importCatalog(DEFAULT_CATALOG_PAYLOAD, { mode: "replace" });
      return;
    }

    if (button.id === "export-draft") {
      downloadTextFile("invoice-draft.json", app.io.exportInvoiceDraft());
      return;
    }

    if (button.id === "export-catalog") {
      downloadTextFile("invoice-catalog.json", app.io.exportCatalog("all"));
      return;
    }

    if (button.id === "export-pdf") {
      try {
        await app.io.exportPdf({
          target: "#invoice-preview",
          loadingElement: "#action-loading",
          errorElement: "#action-error",
          triggerElement: "#export-pdf"
        });
      } catch (error) {
        q("#action-error").textContent = error.message;
      }
      return;
    }

    if (button.id === "print-invoice") {
      try {
        await app.io.printFallback({
          loadingElement: "#action-loading",
          errorElement: "#action-error",
          triggerElement: "#print-invoice"
        });
      } catch (error) {
        q("#action-error").textContent = error.message;
      }
      return;
    }

    if (button.id === "reset-to-sample") {
      window.location.reload();
      return;
    }

    if (button.dataset.rowAction) {
      const rowElement = button.closest("[data-row-id]");
      if (!rowElement) {
        return;
      }
      const rowId = rowElement.dataset.rowId;
      const [section, action] = button.dataset.rowAction.split(".");
      const state = app.store.getState();
      const rows = state.invoiceRows[section];
      const currentIndex = rows.findIndex((row) => row.rowId === rowId);

      if (action === "duplicate") {
        app.actions.duplicateInvoiceRow(section, rowId);
      } else if (action === "delete") {
        app.actions.deleteInvoiceRow(section, rowId);
      } else if (action === "move-up" && currentIndex > 0) {
        app.actions.reorderInvoiceRows(section, currentIndex, currentIndex - 1);
      } else if (action === "move-down" && currentIndex >= 0 && currentIndex < rows.length - 1) {
        app.actions.reorderInvoiceRows(section, currentIndex, currentIndex + 1);
      }
    }
  });
}
