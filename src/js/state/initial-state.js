export function createInitialState() {
  return {
    schemaVersion: "1.0.0",
    app: {
      templateId: "yare-automotive-estimate-v1",
      invoiceType: "ESTIMATE",
      displayTitle: "Eatimate",
      createdAt: new Date().toISOString(),
      dirty: false
    },
    business: {
      logoImage: { dataUrl: "", mimeType: "", fileName: "" },
      businessName: "",
      addressLine1: "",
      addressLine2: "",
      cityState: "",
      contactNo: "",
      email: "",
      gstIn: ""
    },
    customerVehicle: {
      regdNo: "",
      customerName: "",
      odoMeter: "",
      mobileNo: "",
      customerGstNo: "",
      estimateDate: "",
      dueDate: "",
      invoiceNo: "",
      gstIn: ""
    },
    catalogs: {
      parts: [],
      labour: []
    },
    invoiceRows: {
      parts: [],
      labour: [],
      maxRows: {
        parts: 12,
        labour: 10
      },
      allowBlankRows: true
    },
    invoiceTotals: {
      partsSummary: {
        taxableTotal: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalTax: 0,
        finalSectionInvoiceAmount: 0
      },
      labourSummary: {
        taxableTotal: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalTax: 0,
        finalSectionInvoiceAmount: 0
      },
      grossAmount: 0,
      roundOffEnabled: false,
      roundOffMode: "nearest",
      roundOffDecimals: 0,
      roundOffAmount: 0,
      grandTotal: 0
    },
    footerSettings: {
      termsText:
        "1. Payment is due within 5 days of the invoice date. Accepted payment methods include Bank transfer, UPI Mode and also Cash Transactions. Disputes must be reported within 5 days.",
      footerNote: "* Note: This is a system generated invoice. No signature required.",
      signatureImage: { dataUrl: "", mimeType: "", fileName: "" },
      stampImage: { dataUrl: "", mimeType: "", fileName: "" }
    },
    preview: {
      renderVersion: 0,
      lastComputedAt: "",
      renderModel: {},
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        issues: []
      }
    },
    exportMeta: {
      pageSize: "A4",
      orientation: "portrait",
      timezone: "Asia/Calcutta",
      includeBackgroundGraphics: true
    }
  };
}
