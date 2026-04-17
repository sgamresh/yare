import { createId, safeText, toNumber } from "../core/utils.js";

function nowIso() {
  return new Date().toISOString();
}

export function normalizeCatalogType(type) {
  return type === "labour" ? "labour" : "part";
}

export function normalizeCatalogItem(type, item = {}) {
  const normalizedType = normalizeCatalogType(type);
  const defaults = item.defaults ?? {};

  return {
    id: safeText(item.id) || createId(normalizedType),
    type: normalizedType,
    name: safeText(item.name),
    description: safeText(item.description),
    category: safeText(item.category) || "General",
    subcategory: safeText(item.subcategory) || "General",
    sacCode: safeText(item.sacCode),
    defaults: {
      qty: Math.max(0, toNumber(defaults.qty, 1)),
      rate: Math.max(0, toNumber(defaults.rate, 0)),
      discountPercent: Math.max(0, toNumber(defaults.discountPercent, 0)),
      cgstRate: Math.max(0, toNumber(defaults.cgstRate, 0)),
      sgstRate: Math.max(0, toNumber(defaults.sgstRate, 0))
    },
    status: {
      isActive:
        item.status?.isActive === false || item.isActive === false ? false : true
    },
    audit: {
      createdAt: item.audit?.createdAt || nowIso(),
      updatedAt: nowIso()
    }
  };
}

export function isCatalogItemValid(item) {
  return (
    !!item &&
    (item.type === "part" || item.type === "labour") &&
    safeText(item.name).length > 0 &&
    safeText(item.sacCode).length > 0 &&
    safeText(item.category).length > 0 &&
    safeText(item.subcategory).length > 0
  );
}

export function createInvoiceRowFromCatalogItem(section, item, idFactory) {
  const rowId = idFactory(section);
  const values = {
    description: safeText(item.name || item.description),
    sacCode: safeText(item.sacCode),
    qty: Math.max(0, toNumber(item.defaults?.qty, 1)),
    rate: Math.max(0, toNumber(item.defaults?.rate, 0)),
    taxableAmountOverrideEnabled: false,
    taxableAmountOverride: null,
    cgstRate: Math.max(0, toNumber(item.defaults?.cgstRate, 0)),
    sgstRate: Math.max(0, toNumber(item.defaults?.sgstRate, 0)),
    discountPercent: section === "parts" ? Math.max(0, toNumber(item.defaults?.discountPercent, 0)) : 0
  };

  return {
    rowId,
    source: {
      kind: "catalog",
      catalogItemId: item.id
    },
    snapshot: { ...values },
    values: { ...values },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function filterCatalogItems(items, filters = {}) {
  const query = safeText(filters.query).toLowerCase();
  const category = safeText(filters.category);
  const subcategory = safeText(filters.subcategory);
  const activeOnly = filters.activeOnly !== false;

  return items.filter((item) => {
    if (activeOnly && item.status?.isActive === false) {
      return false;
    }
    if (category && item.category !== category) {
      return false;
    }
    if (subcategory && item.subcategory !== subcategory) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      item.name,
      item.description,
      item.sacCode,
      item.category,
      item.subcategory
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
