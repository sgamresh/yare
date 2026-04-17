import { clamp, roundCurrency, toNumber } from "../core/utils.js";

function isTaxableOverrideEnabled(values) {
  return (
    values?.taxableAmountOverrideEnabled === true &&
    Number.isFinite(Number(values?.taxableAmountOverride))
  );
}

function toSectionDiscountPercent(values, sectionType) {
  const discountPercent = clamp(toNumber(values?.discountPercent, 0), 0, 100);
  if (sectionType === "labour" && values?.discountPercent == null) {
    return 0;
  }
  return discountPercent;
}

export function calculateRowAmounts(values, sectionType = "parts") {
  const qty = Math.max(0, toNumber(values?.qty, 0));
  const rate = Math.max(0, toNumber(values?.rate, 0));
  const cgstRate = clamp(toNumber(values?.cgstRate, 0), 0, 100);
  const sgstRate = clamp(toNumber(values?.sgstRate, 0), 0, 100);
  const discountPercent = toSectionDiscountPercent(values, sectionType);

  const grossTaxable = roundCurrency(qty * rate);
  const discountAmount = roundCurrency((grossTaxable * discountPercent) / 100);
  const derivedTaxableAmount = roundCurrency(grossTaxable - discountAmount);

  const taxableAmount = isTaxableOverrideEnabled(values)
    ? roundCurrency(Math.max(0, toNumber(values.taxableAmountOverride, 0)))
    : derivedTaxableAmount;

  const cgstAmount = roundCurrency((taxableAmount * cgstRate) / 100);
  const sgstAmount = roundCurrency((taxableAmount * sgstRate) / 100);
  const totalTax = roundCurrency(cgstAmount + sgstAmount);
  const totalAmountInclTaxes = roundCurrency(taxableAmount + totalTax);

  return {
    qty,
    rate,
    discountPercent,
    discountAmount,
    grossTaxable,
    taxableAmount,
    taxableAmountDerivedFromQtyRate: !isTaxableOverrideEnabled(values),
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    totalTax,
    totalAmountInclTaxes
  };
}

export function calculateSectionTotals(rows, sectionType = "parts") {
  let taxableTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;
  let finalSectionInvoiceAmount = 0;

  const calculatedRows = rows.map((row, index) => {
    const amounts = calculateRowAmounts(row.values ?? row, sectionType);
    taxableTotal = roundCurrency(taxableTotal + amounts.taxableAmount);
    totalCgst = roundCurrency(totalCgst + amounts.cgstAmount);
    totalSgst = roundCurrency(totalSgst + amounts.sgstAmount);
    totalTax = roundCurrency(totalTax + amounts.totalTax);
    finalSectionInvoiceAmount = roundCurrency(
      finalSectionInvoiceAmount + amounts.totalAmountInclTaxes
    );

    return {
      rowId: row.rowId ?? null,
      serialNo: index + 1,
      description: row.values?.description ?? row.description ?? "",
      sacCode: row.values?.sacCode ?? row.sacCode ?? "",
      ...amounts
    };
  });

  return {
    rows: calculatedRows,
    taxableTotal,
    totalCgst,
    totalSgst,
    totalTax,
    finalSectionInvoiceAmount
  };
}

function applyRoundOff(grossAmount, config) {
  if (!config?.enabled) {
    return {
      roundOffAmount: 0,
      grandTotal: roundCurrency(grossAmount)
    };
  }

  const decimals = Number.isInteger(config.decimals) ? config.decimals : 0;
  const factor = 10 ** decimals;
  let roundedTarget = roundCurrency(grossAmount);

  if (config.mode === "up") {
    roundedTarget = Math.ceil(roundedTarget * factor) / factor;
  } else if (config.mode === "down") {
    roundedTarget = Math.floor(roundedTarget * factor) / factor;
  } else {
    roundedTarget = Math.round(roundedTarget * factor) / factor;
  }

  const roundOffAmount = roundCurrency(roundedTarget - grossAmount);
  return {
    roundOffAmount,
    grandTotal: roundCurrency(grossAmount + roundOffAmount)
  };
}

export function calculateInvoiceTotals({
  partsRows = [],
  labourRows = [],
  roundOff = { enabled: false, mode: "nearest", decimals: 0 }
}) {
  const parts = calculateSectionTotals(partsRows, "parts");
  const labour = calculateSectionTotals(labourRows, "labour");

  const grossAmount = roundCurrency(
    parts.finalSectionInvoiceAmount + labour.finalSectionInvoiceAmount
  );
  const { roundOffAmount, grandTotal } = applyRoundOff(grossAmount, roundOff);

  return {
    parts,
    labour,
    grossAmount,
    roundOffEnabled: !!roundOff?.enabled,
    roundOffAmount,
    grandTotal
  };
}

export function createBlankRenderRows(calculatedRows, maxRows, allowBlankRows = true) {
  if (!allowBlankRows) {
    return [...calculatedRows];
  }

  const rowCount = calculatedRows.length;
  const blankCount = Math.max(0, maxRows - rowCount);
  const blanks = Array.from({ length: blankCount }, (_, i) => ({
    rowId: `blank-${i + 1}`,
    serialNo: rowCount + i + 1,
    description: "",
    sacCode: "",
    qty: "",
    rate: "",
    taxableAmount: "",
    cgstRate: "",
    cgstAmount: "",
    sgstRate: "",
    sgstAmount: "",
    discountPercent: "",
    totalAmountInclTaxes: "",
    isBlank: true
  }));

  return [...calculatedRows, ...blanks];
}
