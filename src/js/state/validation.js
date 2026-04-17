import { safeText } from "../core/utils.js";

function makeIssue(level, code, message, path = "") {
  return { level, code, message, path };
}

function isBlank(value) {
  return safeText(value).trim().length === 0;
}

function validateRequiredFields(state, issues) {
  const required = [
    ["business.businessName", state.business.businessName, "Business name is required."],
    ["business.contactNo", state.business.contactNo, "Business contact is required."],
    ["business.gstIn", state.business.gstIn, "Business GSTIN is required."],
    ["customerVehicle.regdNo", state.customerVehicle.regdNo, "Regd No is required."],
    ["customerVehicle.customerName", state.customerVehicle.customerName, "Customer name is required."],
    ["customerVehicle.mobileNo", state.customerVehicle.mobileNo, "Customer mobile no is required."],
    ["customerVehicle.estimateDate", state.customerVehicle.estimateDate, "Estimate date is required."],
    ["customerVehicle.dueDate", state.customerVehicle.dueDate, "Due date is required."],
    ["customerVehicle.invoiceNo", state.customerVehicle.invoiceNo, "Invoice no is required."]
  ];

  required.forEach(([path, value, message]) => {
    if (isBlank(value)) {
      issues.push(makeIssue("error", "REQUIRED_FIELD_MISSING", message, path));
    }
  });
}

function validateRowSet(state, sectionKey, issues) {
  const rows = state.invoiceRows[sectionKey];
  const maxRows = state.invoiceRows.maxRows[sectionKey];
  if (rows.length > maxRows) {
    issues.push(
      makeIssue(
        "warning",
        "TABLE_OVERFLOW",
        `${sectionKey} rows exceed configured visual table length (${rows.length}/${maxRows}).`,
        `invoiceRows.${sectionKey}`
      )
    );
  }

  rows.forEach((row, index) => {
    const path = `invoiceRows.${sectionKey}[${index}]`;
    const description = safeText(row.values?.description);
    if (isBlank(description)) {
      issues.push(
        makeIssue(
          "warning",
          "ROW_DESCRIPTION_BLANK",
          `${sectionKey} row ${index + 1} has an empty description.`,
          `${path}.values.description`
        )
      );
    }
    if (description.length > 64) {
      issues.push(
        makeIssue(
          "warning",
          "DESCRIPTION_LONG",
          `${sectionKey} row ${index + 1} description is very long and may increase row height in PDF.`,
          `${path}.values.description`
        )
      );
    }
  });
}

export function validateInvoiceState(state) {
  const issues = [];
  validateRequiredFields(state, issues);
  validateRowSet(state, "parts", issues);
  validateRowSet(state, "labour", issues);

  return {
    valid: issues.every((issue) => issue.level !== "error"),
    errors: issues.filter((issue) => issue.level === "error"),
    warnings: issues.filter((issue) => issue.level === "warning"),
    issues
  };
}
