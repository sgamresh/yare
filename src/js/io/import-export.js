import { deepClone } from "../core/utils.js";
import { createInitialState } from "../state/initial-state.js";
import {
  mergeCatalogSection,
  replaceCatalogSection
} from "../actions/invoice-actions.js";

const DRAFT_SCHEMA_VERSION = "1.0.0";
const CATALOG_SCHEMA_VERSION = "1.0.0";

function parseJson(input) {
  if (typeof input === "string") {
    return JSON.parse(input);
  }
  return deepClone(input);
}

function arrayOrFallback(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function objectOrFallback(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

export function exportInvoiceDraftJson(store) {
  const state = store.getState();
  return JSON.stringify(
    {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: state
    },
    null,
    2
  );
}

export function importInvoiceDraftJson(store, input, { mode = "replace" } = {}) {
  const payload = parseJson(input);
  if (!payload || !payload.data) {
    throw new Error("Invalid invoice draft file.");
  }

  if (mode !== "replace") {
    throw new Error("Invoice import currently supports replace mode only.");
  }

  const base = createInitialState();
  const incoming = objectOrFallback(payload.data, {});
  const incomingCatalogs = objectOrFallback(incoming.catalogs, {});
  const incomingInvoiceRows = objectOrFallback(incoming.invoiceRows, {});
  const incomingInvoiceTotals = objectOrFallback(incoming.invoiceTotals, {});
  const incomingFooterSettings = objectOrFallback(incoming.footerSettings, {});
  const incomingPreview = objectOrFallback(incoming.preview, {});
  const incomingExportMeta = objectOrFallback(incoming.exportMeta, {});

  const nextState = {
    ...base,
    ...incoming,
    app: {
      ...base.app,
      ...objectOrFallback(incoming.app, {}),
      dirty: false
    },
    business: {
      ...base.business,
      ...objectOrFallback(incoming.business, {})
    },
    customerVehicle: {
      ...base.customerVehicle,
      ...objectOrFallback(incoming.customerVehicle, {})
    },
    catalogs: {
      parts: arrayOrFallback(incomingCatalogs.parts, base.catalogs.parts),
      labour: arrayOrFallback(incomingCatalogs.labour, base.catalogs.labour)
    },
    invoiceRows: {
      ...base.invoiceRows,
      ...incomingInvoiceRows,
      parts: arrayOrFallback(incomingInvoiceRows.parts, base.invoiceRows.parts),
      labour: arrayOrFallback(incomingInvoiceRows.labour, base.invoiceRows.labour),
      maxRows: {
        ...base.invoiceRows.maxRows,
        ...objectOrFallback(incomingInvoiceRows.maxRows, {})
      }
    },
    invoiceTotals: {
      ...base.invoiceTotals,
      ...incomingInvoiceTotals,
      partsSummary: {
        ...base.invoiceTotals.partsSummary,
        ...objectOrFallback(incomingInvoiceTotals.partsSummary, {})
      },
      labourSummary: {
        ...base.invoiceTotals.labourSummary,
        ...objectOrFallback(incomingInvoiceTotals.labourSummary, {})
      }
    },
    footerSettings: {
      ...base.footerSettings,
      ...incomingFooterSettings,
      signatureImage: {
        ...base.footerSettings.signatureImage,
        ...objectOrFallback(incomingFooterSettings.signatureImage, {})
      },
      stampImage: {
        ...base.footerSettings.stampImage,
        ...objectOrFallback(incomingFooterSettings.stampImage, {})
      }
    },
    preview: {
      ...base.preview,
      ...incomingPreview,
      renderModel: {},
      validation: {
        ...base.preview.validation
      }
    },
    exportMeta: {
      ...base.exportMeta,
      ...incomingExportMeta
    }
  };

  store.replaceState(nextState);
  return store.getState();
}

export function exportCatalogJson(store, scope = "all") {
  const state = store.getState();
  const catalogs = {
    parts: [],
    labour: []
  };
  if (scope === "all" || scope === "parts") {
    catalogs.parts = state.catalogs.parts;
  }
  if (scope === "all" || scope === "labour") {
    catalogs.labour = state.catalogs.labour;
  }

  return JSON.stringify(
    {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      catalogs
    },
    null,
    2
  );
}

export function importCatalogJson(store, input, { mode = "merge" } = {}) {
  const payload = parseJson(input);
  const parts = payload?.catalogs?.parts ?? [];
  const labour = payload?.catalogs?.labour ?? [];

  if (!Array.isArray(parts) || !Array.isArray(labour)) {
    throw new Error("Invalid catalog JSON structure.");
  }
  if (mode !== "replace" && mode !== "merge") {
    throw new Error("Catalog import mode must be either 'replace' or 'merge'.");
  }

  if (mode === "replace") {
    replaceCatalogSection(store, "parts", parts);
    replaceCatalogSection(store, "labour", labour);
  } else {
    mergeCatalogSection(store, "parts", parts);
    mergeCatalogSection(store, "labour", labour);
  }
  return store.getState().catalogs;
}
