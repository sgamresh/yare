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

export const SAMPLE_CATALOG_CSV = [
  "type,id,name,description,category,subcategory,sacCode,qty,rate,discountPercent,cgstRate,sgstRate,isActive",
  "part,part-001,Shock absorber front,Shock absorber front,Suspension,Front assembly,8708,2,1077.12,0,9,9,true",
  "part,part-002,Hand brake cable,Hand brake cable,Braking,Cable,8708,1,1059.32,0,9,9,true",
  "labour,lab-001,Shock absorber change,Shock absorber change,Workshop Labour,Suspension work,998714,2,300,0,9,9,true",
  "labour,lab-002,Wheel alignment,Wheel alignment,Workshop Labour,Alignment,998714,1,900,0,9,9,true"
].join("\n");

export async function applySampleData(app) {
  const { actions, store } = app;

  store.update((draft) => {
    draft.app.displayTitle = "Estimate";
  });

  actions.patchBusiness({
    businessName: "Yare Automotive",
    addressLine1: "Back Side of Gill Complex",
    addressLine2: "Manguli",
    cityState: "Cuttack, Odisha",
    contactNo: "7978738373",
    email: "yareautomotives@gmail.com",
    gstIn: "21BRWPM4747A1ZR"
  });

  actions.patchCustomerVehicle({
    regdNo: "",
    customerName: "",
    odoMeter: "",
    mobileNo: "",
    customerGstNo: "",
    estimateDate: "",
    dueDate: "",
    invoiceNo: "",
    gstIn: ""
  });

  actions.clearInvoiceRows("parts");
  actions.clearInvoiceRows("labour");
  actions.replaceCatalogSection("parts", []);
  actions.replaceCatalogSection("labour", []);

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
