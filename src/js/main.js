import { createBoundActions } from "./actions/invoice-actions.js";
import { createStore } from "./core/store.js";
import { createPreviewRenderer } from "./render/preview-renderer.js";
import { createInitialState } from "./state/initial-state.js";
import {
  exportCatalogJson,
  exportInvoiceDraftJson,
  importCatalogJson,
  importInvoiceDraftJson
} from "./io/import-export.js";
import {
  setBusinessLogoFromFile,
  setSignatureFromFile,
  setStampFromFile
} from "./io/image-upload.js";
import {
  exportInvoicePreviewAsPdf,
  printInvoiceFallback
} from "./io/pdf-export.js";
import { validateInvoiceState } from "./state/validation.js";

export function createInvoiceApp({
  initialState = createInitialState(),
  previewRoot = document,
  onValidationChange = null
} = {}) {
  const store = createStore(initialState);
  const actions = createBoundActions(store);
  const previewRenderer = createPreviewRenderer(previewRoot);

  const rerender = (state) => {
    previewRenderer.render(state.preview.renderModel);
    if (typeof onValidationChange === "function") {
      onValidationChange(state.preview.validation);
    }
  };

  const unsubscribe = store.subscribe(rerender);
  rerender(store.getState());

  const io = {
    exportInvoiceDraft: () => exportInvoiceDraftJson(store),
    importInvoiceDraft: (input, options) => importInvoiceDraftJson(store, input, options),
    exportCatalog: (scope) => exportCatalogJson(store, scope),
    importCatalog: (input, options) => importCatalogJson(store, input, options),
    setBusinessLogoFromFile: (file, options) => setBusinessLogoFromFile(store, file, options),
    setSignatureFromFile: (file, options) => setSignatureFromFile(store, file, options),
    setStampFromFile: (file, options) => setStampFromFile(store, file, options),
    exportPdf: (options = {}) => exportInvoicePreviewAsPdf(store, options),
    printFallback: (options = {}) => {
      const validation = validateInvoiceState(store.getState());
      if (!validation.valid && options.blockOnValidationErrors !== false) {
        const error = new Error(
          `Cannot print invoice. ${validation.errors.length} required field issue(s) found.`
        );
        error.code = "VALIDATION_ERROR";
        error.details = validation;
        if (typeof options.onStateChange === "function") {
          options.onStateChange({
            status: "error",
            message: error.message,
            validation
          });
        }
        throw error;
      }
      return printInvoiceFallback(options);
    },
    validateInvoice: () => validateInvoiceState(store.getState())
  };

  return {
    store,
    actions,
    io,
    rerenderNow: () => rerender(store.getState()),
    destroy() {
      unsubscribe();
    }
  };
}
