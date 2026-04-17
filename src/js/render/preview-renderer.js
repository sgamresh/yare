import { escapeHtml, formatCurrencyInr, safeText, toNumber } from "../core/utils.js";

function setText(root, id, value) {
  const el = root.querySelector(`#${id}`);
  if (el) {
    el.textContent = safeText(value);
  }
}

function setHtml(root, id, html) {
  const el = root.querySelector(`#${id}`);
  if (el) {
    el.innerHTML = html;
  }
}

function setImage(root, id, imagePayload, fallbackAlt = "") {
  const el = root.querySelector(`#${id}`);
  if (!el) {
    return;
  }
  const src = imagePayload?.dataUrl || "";
  el.alt = fallbackAlt;
  if (src) {
    el.src = src;
    el.style.visibility = "visible";
  } else {
    el.removeAttribute("src");
    el.style.visibility = "hidden";
  }
}

function fmtMoney(value, decimals = 2) {
  return formatCurrencyInr(toNumber(value, 0), decimals);
}

function rowCell(value, className = "", title = "") {
  const cls = className ? ` class="${className}"` : "";
  const ttl = title ? ` title="${escapeHtml(title)}"` : "";
  return `<td${cls}${ttl}>${escapeHtml(value)}</td>`;
}

function displayOrDash(value) {
  const text = safeText(value).trim();
  return text.length > 0 ? text : "-";
}

function buildRowsHtml(rows) {
  return rows
    .map((row) => {
      if (row.isBlank) {
        return `
          <tr data-row-id="${escapeHtml(row.rowId)}" class="is-blank">
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
            ${rowCell("")}
          </tr>
        `;
      }

      return `
        <tr data-row-id="${escapeHtml(row.rowId || "")}">
          ${rowCell(row.serialNo, "num")}
          ${rowCell(row.description, "", safeText(row.description))}
          ${rowCell(row.sacCode)}
          ${rowCell(row.qty, "num")}
          ${rowCell(fmtMoney(row.rate), "num")}
          ${rowCell(fmtMoney(row.taxableAmount), "num")}
          ${rowCell(row.cgstRate, "num")}
          ${rowCell(fmtMoney(row.cgstAmount), "num")}
          ${rowCell(row.sgstRate, "num")}
          ${rowCell(fmtMoney(row.sgstAmount), "num")}
          ${rowCell(row.discountPercent ?? 0, "num")}
          ${rowCell(fmtMoney(row.totalAmountInclTaxes), "num")}
        </tr>
      `;
    })
    .join("");
}

function renderBusiness(root, model) {
  const line2 = [safeText(model.business.addressLine2).trim(), safeText(model.business.cityState).trim()]
    .filter(Boolean)
    .join(", ");
  setText(root, "pvBusinessName", model.business.businessName);
  setText(root, "pvAddress1", model.business.addressLine1);
  setText(root, "pvAddress2", line2);
  setText(root, "pvContact", model.business.contactNo);
  setText(root, "pvEmail", model.business.email);
  setImage(root, "preview-logo", model.business.logoImage, "Business Logo");
}

function renderMeta(root, model) {
  const meta = model.customerVehicle;
  setText(root, "pvRegdNo", displayOrDash(meta.regdNo));
  setText(root, "pvEstimateDate", displayOrDash(meta.estimateDate));
  setText(root, "pvCustomerName", displayOrDash(meta.customerName));
  setText(root, "pvDueDate", displayOrDash(meta.dueDate));
  setText(root, "pvOdoMeter", displayOrDash(meta.odoMeter));
  setText(root, "pvInvoiceNo", displayOrDash(meta.invoiceNo));
  setText(root, "pvMobile", displayOrDash(meta.mobileNo));
  setText(root, "pvMetaGstin", displayOrDash(meta.gstIn || model.business.gstIn));
  setText(root, "pvCustomerGst", displayOrDash(meta.customerGstNo));
}

function renderTables(root, model) {
  setHtml(root, "preview-parts-rows", buildRowsHtml(model.partsRows));
  setHtml(root, "preview-labour-rows", buildRowsHtml(model.labourRows));
}

function renderTotals(root, model) {
  setText(root, "pvPartsTaxableTotal", fmtMoney(model.partsSummary.taxableTotal));
  setText(root, "pvPartsTaxTotal", fmtMoney(model.partsSummary.totalTax));
  setText(
    root,
    "pvFinalPartsAmount",
    fmtMoney(model.partsSummary.finalSectionInvoiceAmount)
  );

  setText(root, "pvLabourTaxableTotal", fmtMoney(model.labourSummary.taxableTotal));
  setText(root, "pvLabourTaxTotal", fmtMoney(model.labourSummary.totalTax));
  setText(
    root,
    "pvFinalLabourAmount",
    fmtMoney(model.labourSummary.finalSectionInvoiceAmount)
  );

  setText(root, "pvGrossAmount", fmtMoney(model.grossAmount));
  setText(root, "pvGrandTotal", fmtMoney(model.grandTotal, 0));
}

function renderFooter(root, model) {
  setText(root, "pvTermsText", model.footerSettings.termsText);
  setText(root, "pvFooterNote", model.footerSettings.footerNote);
  setImage(root, "preview-signature", model.footerSettings.signatureImage, "Signature");
  setImage(root, "preview-stamp", model.footerSettings.stampImage, "Stamp");
}

export function createPreviewRenderer(rootElement = document) {
  return {
    render(model) {
      if (!model) {
        return;
      }
      renderBusiness(rootElement, model);
      renderMeta(rootElement, model);
      renderTables(rootElement, model);
      renderTotals(rootElement, model);
      renderFooter(rootElement, model);
    }
  };
}
