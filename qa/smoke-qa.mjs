import assert from "node:assert/strict";
import { createStore } from "../src/js/core/store.js";
import { createInitialState } from "../src/js/state/initial-state.js";
import {
  addCatalogItem,
  addManualRow,
  addRowsFromCatalog,
  patchBusiness,
  patchCustomerVehicle,
  updateInvoiceRow
} from "../src/js/actions/invoice-actions.js";
import { validateInvoiceState } from "../src/js/state/validation.js";
import {
  exportInvoiceDraftJson,
  importInvoiceDraftJson
} from "../src/js/io/import-export.js";

function runCalculationAndStateSmoke() {
  const store = createStore(createInitialState());

  patchBusiness(store, {
    businessName: "YARE Automotives",
    contactNo: "7978738373",
    gstIn: "21BRWPM4747A1ZR"
  });
  patchCustomerVehicle(store, {
    regdNo: "OD02BS7671",
    customerName: "ZEN Plus Pvt Ltd",
    mobileNo: "7749081451",
    estimateDate: "2026-04-16",
    dueDate: "2026-04-16",
    invoiceNo: "YA-26/27-00000000"
  });

  addManualRow(store, "parts", {
    description: "Shock absorber",
    sacCode: "8708",
    qty: 2,
    rate: 1077.12,
    cgstRate: 9,
    sgstRate: 9,
    discountPercent: 0
  });
  addManualRow(store, "labour", {
    description: "Service regeneration",
    sacCode: "998714",
    qty: 1,
    rate: 1500,
    cgstRate: 9,
    sgstRate: 9
  });

  const state = store.getState();
  assert.equal(state.invoiceTotals.partsSummary.taxableTotal, 2154.24);
  assert.equal(state.invoiceTotals.partsSummary.totalTax, 387.76);
  assert.equal(state.invoiceTotals.partsSummary.finalSectionInvoiceAmount, 2542.0);
  assert.equal(state.invoiceTotals.labourSummary.taxableTotal, 1500.0);
  assert.equal(state.invoiceTotals.labourSummary.totalTax, 270.0);
  assert.equal(state.invoiceTotals.labourSummary.finalSectionInvoiceAmount, 1770.0);
  assert.equal(state.invoiceTotals.grossAmount, 4312.0);
  assert.equal(state.invoiceTotals.grandTotal, 4312.0);
}

function runCatalogIsolationSmoke() {
  const store = createStore(createInitialState());
  const catalogItem = addCatalogItem(store, "parts", {
    id: "part-1",
    name: "Hand brake cable",
    description: "Hand brake cable",
    category: "Brakes",
    subcategory: "Cables",
    sacCode: "8708",
    defaults: { qty: 1, rate: 1059.32, cgstRate: 9, sgstRate: 9, discountPercent: 0 }
  });

  const inserted = addRowsFromCatalog(store, "parts", [catalogItem.id]);
  assert.equal(inserted.length, 1);
  const rowId = inserted[0].rowId;
  updateInvoiceRow(store, "parts", rowId, { rate: 9999.99, description: "Edited in invoice" });

  const state = store.getState();
  const row = state.invoiceRows.parts.find((r) => r.rowId === rowId);
  const source = state.catalogs.parts.find((c) => c.id === catalogItem.id);
  assert.equal(row.values.rate, 9999.99);
  assert.equal(source.defaults.rate, 1059.32);
  assert.equal(source.name, "Hand brake cable");
}

function runValidationAndOverflowSmoke() {
  const store = createStore(createInitialState());
  for (let i = 0; i < 15; i += 1) {
    addManualRow(store, "parts", {
      description: i === 0 ? "x".repeat(120) : "",
      sacCode: "8708",
      qty: 1,
      rate: 10
    });
  }
  const state = store.getState();
  const validation = validateInvoiceState(state);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length >= 1);
  assert.ok(validation.warnings.some((w) => w.code === "TABLE_OVERFLOW"));
  assert.ok(validation.warnings.some((w) => w.code === "DESCRIPTION_LONG"));
  assert.ok(validation.warnings.some((w) => w.code === "ROW_DESCRIPTION_BLANK"));
}

function runImportMergeSafetySmoke() {
  const store = createStore(createInitialState());
  const partialDraft = {
    data: {
      app: { displayTitle: "Eatimate" },
      business: { businessName: "Partial Import Co." },
      invoiceRows: {
        parts: []
      }
    }
  };
  importInvoiceDraftJson(store, partialDraft, { mode: "replace" });
  const state = store.getState();
  assert.equal(state.business.businessName, "Partial Import Co.");
  assert.ok(Array.isArray(state.invoiceRows.labour));
  assert.equal(typeof state.invoiceRows.maxRows.parts, "number");

  const exported = exportInvoiceDraftJson(store);
  const parsed = JSON.parse(exported);
  assert.equal(parsed.schemaVersion, "1.0.0");
  assert.ok(parsed.data.preview.validation);
}

runCalculationAndStateSmoke();
runCatalogIsolationSmoke();
runValidationAndOverflowSmoke();
runImportMergeSafetySmoke();

console.log("QA smoke checks passed.");
