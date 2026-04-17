import {
  clamp,
  createId,
  deepClone,
  moveItem,
  safeText,
  toNumber
} from "../core/utils.js";
import {
  createInvoiceRowFromCatalogItem,
  filterCatalogItems,
  isCatalogItemValid,
  normalizeCatalogItem
} from "../catalog/catalog-normalize.js";

const SECTION_KEYS = {
  parts: "parts",
  labour: "labour"
};

function nowIso() {
  return new Date().toISOString();
}

function assertSection(section) {
  const normalized = section === "labour" ? "labour" : "parts";
  return SECTION_KEYS[normalized];
}

function normalizeRowValues(section, values = {}) {
  const isLabour = section === "labour";
  return {
    description: safeText(values.description),
    sacCode: safeText(values.sacCode),
    qty: Math.max(0, toNumber(values.qty, 1)),
    rate: Math.max(0, toNumber(values.rate, 0)),
    taxableAmountOverrideEnabled: values.taxableAmountOverrideEnabled === true,
    taxableAmountOverride:
      values.taxableAmountOverride == null
        ? null
        : Math.max(0, toNumber(values.taxableAmountOverride, 0)),
    cgstRate: clamp(toNumber(values.cgstRate, 9), 0, 100),
    sgstRate: clamp(toNumber(values.sgstRate, 9), 0, 100),
    discountPercent: isLabour ? 0 : clamp(toNumber(values.discountPercent, 0), 0, 100)
  };
}

function createManualInvoiceRow(section, seed = {}) {
  const values = normalizeRowValues(section, seed);
  return {
    rowId: createId("row"),
    source: {
      kind: "manual",
      catalogItemId: null
    },
    snapshot: deepClone(values),
    values,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function getCatalogTypeForSection(section) {
  return section === "labour" ? "labour" : "part";
}

export function setBusinessField(store, field, value) {
  store.update((draft) => {
    draft.business[field] = value;
  });
}

export function patchBusiness(store, patch) {
  store.update((draft) => {
    Object.assign(draft.business, patch);
  });
}

export function setBusinessImage(store, imagePayload) {
  store.update((draft) => {
    draft.business.logoImage = deepClone(imagePayload);
  });
}

export function setCustomerVehicleField(store, field, value) {
  store.update((draft) => {
    draft.customerVehicle[field] = value;
  });
}

export function patchCustomerVehicle(store, patch) {
  store.update((draft) => {
    Object.assign(draft.customerVehicle, patch);
  });
}

export function setFooterField(store, field, value) {
  store.update((draft) => {
    draft.footerSettings[field] = value;
  });
}

export function setFooterImage(store, field, imagePayload) {
  store.update((draft) => {
    draft.footerSettings[field] = deepClone(imagePayload);
  });
}

export function setRoundOffConfig(store, configPatch) {
  store.update((draft) => {
    if (typeof configPatch.enabled === "boolean") {
      draft.invoiceTotals.roundOffEnabled = configPatch.enabled;
    }
    if (configPatch.mode) {
      draft.invoiceTotals.roundOffMode = configPatch.mode;
    }
    if (Number.isInteger(configPatch.decimals)) {
      draft.invoiceTotals.roundOffDecimals = configPatch.decimals;
    }
  });
}

export function setTableVisualConfig(store, patch = {}) {
  store.update((draft) => {
    if (patch.maxRows?.parts != null) {
      draft.invoiceRows.maxRows.parts = Math.max(0, Number(patch.maxRows.parts) || 0);
    }
    if (patch.maxRows?.labour != null) {
      draft.invoiceRows.maxRows.labour = Math.max(0, Number(patch.maxRows.labour) || 0);
    }
    if (typeof patch.allowBlankRows === "boolean") {
      draft.invoiceRows.allowBlankRows = patch.allowBlankRows;
    }
  });
}

export function addCatalogItem(store, section, rawItem) {
  const sectionKey = assertSection(section);
  const type = getCatalogTypeForSection(sectionKey);
  const normalized = normalizeCatalogItem(type, rawItem);

  if (!isCatalogItemValid(normalized)) {
    throw new Error("Invalid catalog item payload.");
  }

  store.update((draft) => {
    draft.catalogs[sectionKey].push(normalized);
  });
  return normalized;
}

export function updateCatalogItem(store, section, itemId, patch = {}) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    const idx = draft.catalogs[sectionKey].findIndex((item) => item.id === itemId);
    if (idx === -1) {
      return;
    }
    const existing = draft.catalogs[sectionKey][idx];
    const merged = normalizeCatalogItem(existing.type, {
      ...existing,
      ...patch,
      defaults: {
        ...existing.defaults,
        ...(patch.defaults ?? {})
      }
    });
    merged.audit.createdAt = existing.audit?.createdAt ?? merged.audit.createdAt;
    merged.audit.updatedAt = nowIso();
    draft.catalogs[sectionKey][idx] = merged;
  });
}

export function deleteCatalogItem(store, section, itemId) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    draft.catalogs[sectionKey] = draft.catalogs[sectionKey].filter(
      (item) => item.id !== itemId
    );
  });
}

export function toggleCatalogItemActive(store, section, itemId, isActive) {
  updateCatalogItem(store, section, itemId, {
    status: { isActive: !!isActive }
  });
}

export function replaceCatalogSection(store, section, items) {
  const sectionKey = assertSection(section);
  const type = getCatalogTypeForSection(sectionKey);
  const normalized = items
    .map((item) => normalizeCatalogItem(type, item))
    .filter((item) => isCatalogItemValid(item));

  store.update((draft) => {
    draft.catalogs[sectionKey] = normalized;
  });
}

export function mergeCatalogSection(store, section, items) {
  const sectionKey = assertSection(section);
  const type = getCatalogTypeForSection(sectionKey);
  const incoming = items
    .map((item) => normalizeCatalogItem(type, item))
    .filter((item) => isCatalogItemValid(item));

  store.update((draft) => {
    const current = draft.catalogs[sectionKey];
    const byId = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => byId.set(item.id, item));
    draft.catalogs[sectionKey] = Array.from(byId.values());
  });
}

export function getFilteredCatalogItems(store, section, filters) {
  const sectionKey = assertSection(section);
  const state = store.getState();
  return filterCatalogItems(state.catalogs[sectionKey], filters);
}

export function addManualRow(store, section, seed = {}) {
  const sectionKey = assertSection(section);
  const row = createManualInvoiceRow(sectionKey, seed);
  store.update((draft) => {
    draft.invoiceRows[sectionKey].push(row);
  });
  return row;
}

export function addRowsFromCatalog(store, section, itemIds, overrideById = {}) {
  const sectionKey = assertSection(section);
  const requestedIds = Array.isArray(itemIds) ? itemIds : [itemIds];
  const expectedType = getCatalogTypeForSection(sectionKey);
  const insertedRows = [];

  store.update((draft) => {
    const byId = new Map(draft.catalogs[sectionKey].map((item) => [item.id, item]));

    requestedIds.forEach((itemId) => {
      const item = byId.get(itemId);
      if (!item || item.status?.isActive === false || item.type !== expectedType) {
        return;
      }
      const row = createInvoiceRowFromCatalogItem(sectionKey, item, (prefix) =>
        createId(prefix)
      );
      const overrides = normalizeRowValues(sectionKey, {
        ...row.values,
        ...(overrideById[itemId] ?? {})
      });
      row.values = overrides;
      row.snapshot = deepClone(overrides);
      insertedRows.push(row);
      draft.invoiceRows[sectionKey].push(row);
    });
  });

  return insertedRows;
}

export function updateInvoiceRow(store, section, rowId, patch = {}) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    const row = draft.invoiceRows[sectionKey].find((x) => x.rowId === rowId);
    if (!row) {
      return;
    }
    row.values = normalizeRowValues(sectionKey, {
      ...row.values,
      ...patch
    });
    row.updatedAt = nowIso();
  });
}

export function deleteInvoiceRow(store, section, rowId) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    draft.invoiceRows[sectionKey] = draft.invoiceRows[sectionKey].filter(
      (row) => row.rowId !== rowId
    );
  });
}

export function duplicateInvoiceRow(store, section, rowId) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    const list = draft.invoiceRows[sectionKey];
    const index = list.findIndex((row) => row.rowId === rowId);
    if (index < 0) {
      return;
    }
    const source = list[index];
    const copy = {
      ...deepClone(source),
      rowId: createId("row"),
      source: {
        ...source.source,
        duplicatedFromRowId: rowId
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    list.splice(index + 1, 0, copy);
  });
}

export function reorderInvoiceRows(store, section, fromIndex, toIndex) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    const list = draft.invoiceRows[sectionKey];
    if (list.length === 0) {
      return;
    }
    const target = clamp(Number(toIndex), 0, list.length - 1);
    draft.invoiceRows[sectionKey] = moveItem(list, Number(fromIndex), target);
  });
}

export function clearInvoiceRows(store, section) {
  const sectionKey = assertSection(section);
  store.update((draft) => {
    draft.invoiceRows[sectionKey] = [];
  });
}

export function createBoundActions(store) {
  return {
    setBusinessField: (field, value) => setBusinessField(store, field, value),
    patchBusiness: (patch) => patchBusiness(store, patch),
    setBusinessImage: (imagePayload) => setBusinessImage(store, imagePayload),

    setCustomerVehicleField: (field, value) =>
      setCustomerVehicleField(store, field, value),
    patchCustomerVehicle: (patch) => patchCustomerVehicle(store, patch),

    setFooterField: (field, value) => setFooterField(store, field, value),
    setFooterImage: (field, imagePayload) => setFooterImage(store, field, imagePayload),

    setRoundOffConfig: (configPatch) => setRoundOffConfig(store, configPatch),
    setTableVisualConfig: (patch) => setTableVisualConfig(store, patch),

    addCatalogItem: (section, item) => addCatalogItem(store, section, item),
    updateCatalogItem: (section, itemId, patch) =>
      updateCatalogItem(store, section, itemId, patch),
    deleteCatalogItem: (section, itemId) => deleteCatalogItem(store, section, itemId),
    toggleCatalogItemActive: (section, itemId, isActive) =>
      toggleCatalogItemActive(store, section, itemId, isActive),
    replaceCatalogSection: (section, items) => replaceCatalogSection(store, section, items),
    mergeCatalogSection: (section, items) => mergeCatalogSection(store, section, items),
    getFilteredCatalogItems: (section, filters) =>
      getFilteredCatalogItems(store, section, filters),

    addManualRow: (section, seed) => addManualRow(store, section, seed),
    addRowsFromCatalog: (section, itemIds, overrideById) =>
      addRowsFromCatalog(store, section, itemIds, overrideById),
    updateInvoiceRow: (section, rowId, patch) =>
      updateInvoiceRow(store, section, rowId, patch),
    deleteInvoiceRow: (section, rowId) => deleteInvoiceRow(store, section, rowId),
    duplicateInvoiceRow: (section, rowId) => duplicateInvoiceRow(store, section, rowId),
    reorderInvoiceRows: (section, fromIndex, toIndex) =>
      reorderInvoiceRows(store, section, fromIndex, toIndex),
    clearInvoiceRows: (section) => clearInvoiceRows(store, section)
  };
}
