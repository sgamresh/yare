import {
  calculateInvoiceTotals,
  createBlankRenderRows
} from "../calculation/invoice-calculations.js";
import { deepClone } from "../core/utils.js";
import { validateInvoiceState } from "./validation.js";

function buildRenderModel(state, totals) {
  const partsRealCount = totals.parts.rows.length;
  const labourRealCount = totals.labour.rows.length;
  const partsMax = state.invoiceRows.maxRows.parts;
  const labourMax = state.invoiceRows.maxRows.labour;

  const partsRenderRows = createBlankRenderRows(
    totals.parts.rows,
    partsMax,
    state.invoiceRows.allowBlankRows
  );
  const labourRenderRows = createBlankRenderRows(
    totals.labour.rows,
    labourMax,
    state.invoiceRows.allowBlankRows
  );

  return {
    title: state.app.displayTitle,
    business: deepClone(state.business),
    customerVehicle: deepClone(state.customerVehicle),
    partsRows: partsRenderRows,
    labourRows: labourRenderRows,
    partsSummary: {
      taxableTotal: totals.parts.taxableTotal,
      totalTax: totals.parts.totalTax,
      finalSectionInvoiceAmount: totals.parts.finalSectionInvoiceAmount
    },
    labourSummary: {
      taxableTotal: totals.labour.taxableTotal,
      totalTax: totals.labour.totalTax,
      finalSectionInvoiceAmount: totals.labour.finalSectionInvoiceAmount
    },
    tableStatus: {
      parts: {
        rowCount: partsRealCount,
        maxRows: partsMax,
        overflowCount: Math.max(0, partsRealCount - partsMax)
      },
      labour: {
        rowCount: labourRealCount,
        maxRows: labourMax,
        overflowCount: Math.max(0, labourRealCount - labourMax)
      }
    },
    grossAmount: totals.grossAmount,
    grandTotal: totals.grandTotal,
    footerSettings: deepClone(state.footerSettings)
  };
}

export function syncComputedState(state) {
  const roundOffConfig = {
    enabled: state.invoiceTotals.roundOffEnabled,
    mode: state.invoiceTotals.roundOffMode,
    decimals: state.invoiceTotals.roundOffDecimals
  };

  const totals = calculateInvoiceTotals({
    partsRows: state.invoiceRows.parts,
    labourRows: state.invoiceRows.labour,
    roundOff: roundOffConfig
  });

  state.invoiceTotals.partsSummary = {
    taxableTotal: totals.parts.taxableTotal,
    totalCgst: totals.parts.totalCgst,
    totalSgst: totals.parts.totalSgst,
    totalTax: totals.parts.totalTax,
    finalSectionInvoiceAmount: totals.parts.finalSectionInvoiceAmount
  };
  state.invoiceTotals.labourSummary = {
    taxableTotal: totals.labour.taxableTotal,
    totalCgst: totals.labour.totalCgst,
    totalSgst: totals.labour.totalSgst,
    totalTax: totals.labour.totalTax,
    finalSectionInvoiceAmount: totals.labour.finalSectionInvoiceAmount
  };
  state.invoiceTotals.grossAmount = totals.grossAmount;
  state.invoiceTotals.roundOffAmount = totals.roundOffAmount;
  state.invoiceTotals.grandTotal = totals.grandTotal;

  const validation = validateInvoiceState(state);
  state.preview.validation = validation;
  state.preview.renderModel = buildRenderModel(state, totals);
  state.preview.renderVersion += 1;
  state.preview.lastComputedAt = new Date().toISOString();
  return state;
}
