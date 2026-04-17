export const DEFAULT_CATALOG_PAYLOAD = {
  schemaVersion: "1.0.0",
  exportedAt: "2026-04-17T00:00:00.000Z",
  catalogs: {
    parts: [
      {
        id: "part-shock-absorber-front",
        type: "part",
        name: "Shock absorber front",
        description: "Shock absorber front",
        category: "Suspension",
        subcategory: "Front assembly",
        sacCode: "8708",
        defaults: {
          qty: 2,
          rate: 1077.12,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      },
      {
        id: "part-hand-brake-cable",
        type: "part",
        name: "Hand brake cable",
        description: "Hand brake cable",
        category: "Braking",
        subcategory: "Cable",
        sacCode: "8708",
        defaults: {
          qty: 1,
          rate: 1059.32,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      },
      {
        id: "part-link-rod",
        type: "part",
        name: "Link rod set",
        description: "Link rod set",
        category: "Suspension",
        subcategory: "Linkage",
        sacCode: "8708",
        defaults: {
          qty: 1,
          rate: 1680,
          discountPercent: 5,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      },
      {
        id: "part-bush-kit",
        type: "part",
        name: "Suspension bush kit",
        description: "Suspension bush kit",
        category: "Suspension",
        subcategory: "Bushes",
        sacCode: "8708",
        defaults: {
          qty: 1,
          rate: 850,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      }
    ],
    labour: [
      {
        id: "lab-shock-change",
        type: "labour",
        name: "Shock absorber change",
        description: "Shock absorber change",
        category: "Workshop Labour",
        subcategory: "Suspension work",
        sacCode: "998714",
        defaults: {
          qty: 2,
          rate: 300,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      },
      {
        id: "lab-wheel-alignment",
        type: "labour",
        name: "Wheel alignment",
        description: "Wheel alignment",
        category: "Workshop Labour",
        subcategory: "Alignment",
        sacCode: "998714",
        defaults: {
          qty: 1,
          rate: 900,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      },
      {
        id: "lab-road-test",
        type: "labour",
        name: "Road test and quality check",
        description: "Road test and quality check",
        category: "Workshop Labour",
        subcategory: "Inspection",
        sacCode: "998714",
        defaults: {
          qty: 1,
          rate: 450,
          discountPercent: 0,
          cgstRate: 9,
          sgstRate: 9
        },
        status: { isActive: true }
      }
    ]
  }
};

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to convert blob to data URL."));
    reader.readAsDataURL(blob);
  });
}

async function loadBundledLogoDataUrl() {
  const response = await fetch("./logo.jpeg");
  if (!response.ok) {
    throw new Error("Bundled logo could not be loaded.");
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

export async function applySampleData(app) {
  const { actions, store } = app;

  store.update((draft) => {
    draft.app.displayTitle = "Eatimate";
  });

  actions.patchBusiness({
    businessName: "Yare Automotive Workshop",
    addressLine1: "Plot 24, Service Road, Rasulgarh",
    addressLine2: "Near Palasuni Flyover",
    cityState: "Bhubaneswar, Odisha 751010",
    contactNo: "7978738373",
    email: "support@yareauto.in",
    gstIn: "21BRWPM4747A1ZR"
  });

  actions.patchCustomerVehicle({
    regdNo: "OD02BS7671",
    customerName: "ZEN Plus Pvt Ltd",
    odoMeter: "82,410 km",
    mobileNo: "7749081451",
    customerGstNo: "21AAACZ5498Q1Z3",
    estimateDate: "2026-04-17",
    dueDate: "2026-04-20",
    invoiceNo: "YA-26/27-00000081",
    gstIn: "21BRWPM4747A1ZR"
  });

  actions.setFooterField(
    "termsText",
    [
      "1. Payment is due within 5 days of the estimate date.",
      "2. Rates are valid for 5 days and subject to parts availability.",
      "3. Any additional work found during dismantling will be shared for approval."
    ].join("\n")
  );
  actions.setFooterField(
    "footerNote",
    "* Note: This is a system generated invoice. No signature required."
  );
  actions.setTableVisualConfig({
    maxRows: { parts: 8, labour: 5 },
    allowBlankRows: true
  });

  actions.replaceCatalogSection("parts", DEFAULT_CATALOG_PAYLOAD.catalogs.parts);
  actions.replaceCatalogSection("labour", DEFAULT_CATALOG_PAYLOAD.catalogs.labour);
  actions.clearInvoiceRows("parts");
  actions.clearInvoiceRows("labour");

  actions.addRowsFromCatalog("parts", [
    "part-shock-absorber-front",
    "part-hand-brake-cable",
    "part-link-rod"
  ]);
  actions.addRowsFromCatalog("labour", [
    "lab-shock-change",
    "lab-wheel-alignment"
  ]);

  actions.addManualRow("labour", {
    description: "Road test and suspension quality check",
    sacCode: "998714",
    qty: 1,
    rate: 450,
    cgstRate: 9,
    sgstRate: 9
  });

  try {
    const dataUrl = await loadBundledLogoDataUrl();
    actions.setBusinessImage({
      dataUrl,
      mimeType: "image/jpeg",
      fileName: "logo.jpeg"
    });
  } catch (_error) {
    // Ignore missing bundled logo and keep uploads optional.
  }
}
