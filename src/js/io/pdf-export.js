import { safeText } from "../core/utils.js";
import { validateInvoiceState } from "../state/validation.js";

const DEFAULT_JSPDF_CDN =
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
const DEFAULT_HTML2CANVAS_CDN =
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

const scriptLoadPromises = new Map();

function resolveElement(elementOrSelector) {
  if (!elementOrSelector) {
    return null;
  }
  if (typeof elementOrSelector === "string") {
    return document.querySelector(elementOrSelector);
  }
  return elementOrSelector;
}

function emitState(onStateChange, payload) {
  if (typeof onStateChange === "function") {
    onStateChange(payload);
  }
}

function setUiState({
  status,
  message,
  loadingElement,
  errorElement,
  triggerElement
}) {
  const loadingEl = resolveElement(loadingElement);
  const errorEl = resolveElement(errorElement);
  const triggerEl = resolveElement(triggerElement);

  if (loadingEl) {
    loadingEl.textContent = status === "loading" ? message || "Generating PDF..." : "";
    loadingEl.style.display = status === "loading" ? "" : "none";
  }

  if (errorEl) {
    errorEl.textContent = status === "error" ? message || "PDF export failed." : "";
    errorEl.style.display = status === "error" ? "" : "none";
  }

  if (triggerEl) {
    triggerEl.disabled = status === "loading";
    triggerEl.setAttribute("aria-busy", status === "loading" ? "true" : "false");
  }
}

function sanitizeFileSegment(input) {
  const cleaned = safeText(input)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "invoice";
}

export function buildInvoicePdfFileName(invoiceNo) {
  const invoicePart = sanitizeFileSegment(invoiceNo || "no-invoice-number");
  return `${invoicePart}-estimate.pdf`;
}

function loadScriptOnce(src) {
  if (scriptLoadPromises.has(src)) {
    return scriptLoadPromises.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = Array.from(document.getElementsByTagName("script")).find(
      (node) => node.src === src
    );
    if (existing) {
      if (
        existing.dataset.loaded === "true" ||
        existing.readyState === "complete" ||
        existing.readyState === "loaded"
      ) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => {
      reject(new Error(`Failed to load script: ${src}`));
    });
    document.head.appendChild(script);
  });

  scriptLoadPromises.set(src, promise);
  return promise;
}

async function resolvePdfDependencies({
  useCdnFallback = true,
  jsPdfCdn = DEFAULT_JSPDF_CDN,
  html2canvasCdn = DEFAULT_HTML2CANVAS_CDN
} = {}) {
  let jsPdfCtor = window.jspdf?.jsPDF || window.jsPDF;
  let html2canvasFn = window.html2canvas;

  if (jsPdfCtor && html2canvasFn) {
    return { jsPdfCtor, html2canvasFn };
  }

  if (!useCdnFallback) {
    throw new Error(
      "jsPDF and html2canvas are not available. Load libraries first or enable CDN fallback."
    );
  }

  await loadScriptOnce(jsPdfCdn);
  await loadScriptOnce(html2canvasCdn);

  jsPdfCtor = window.jspdf?.jsPDF || window.jsPDF;
  html2canvasFn = window.html2canvas;

  if (!jsPdfCtor || !html2canvasFn) {
    throw new Error("Could not initialize jsPDF/html2canvas.");
  }

  return { jsPdfCtor, html2canvasFn };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFonts(timeoutMs = 6000) {
  if (!document.fonts?.ready) {
    return;
  }
  await Promise.race([document.fonts.ready, delay(timeoutMs)]);
}

async function waitForImages(root, timeoutMs = 6000) {
  const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  if (images.length === 0) {
    return;
  }

  await Promise.race([
    Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    ),
    delay(timeoutMs)
  ]);
}

function withCaptureStyles(targetElement) {
  const original = {
    transform: targetElement.style.transform,
    marginBottom: targetElement.style.marginBottom,
    boxShadow: targetElement.style.boxShadow
  };

  targetElement.style.transform = "none";
  targetElement.style.marginBottom = "0";
  targetElement.style.boxShadow = "none";

  return () => {
    targetElement.style.transform = original.transform;
    targetElement.style.marginBottom = original.marginBottom;
    targetElement.style.boxShadow = original.boxShadow;
  };
}

function splitCanvasIntoPages(canvas, pageWidthPt, pageHeightPt) {
  const pages = [];
  const pageHeightPx = Math.floor((pageHeightPt * canvas.width) / pageWidthPt);
  let renderedHeightPx = 0;

  while (renderedHeightPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    const context = pageCanvas.getContext("2d");
    context.drawImage(
      canvas,
      0,
      renderedHeightPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    );

    const sliceHeightPt = (sliceHeightPx * pageWidthPt) / canvas.width;
    pages.push({
      dataUrl: pageCanvas.toDataURL("image/png", 1.0),
      widthPt: pageWidthPt,
      heightPt: sliceHeightPt
    });

    renderedHeightPx += sliceHeightPx;
  }

  return pages;
}

async function captureWholeElementAsPages(html2canvasFn, targetElement, options) {
  const canvas = await html2canvasFn(targetElement, {
    scale: options.scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: options.imageTimeoutMs,
    windowWidth: Math.max(targetElement.scrollWidth, targetElement.clientWidth),
    windowHeight: Math.max(targetElement.scrollHeight, targetElement.clientHeight),
    scrollX: 0,
    scrollY: 0
  });

  return splitCanvasIntoPages(canvas, options.pageWidthPt, options.pageHeightPt);
}

async function capturePagedDom(html2canvasFn, targetElement, options) {
  const totalWidthPx = Math.max(targetElement.scrollWidth, targetElement.clientWidth);
  const totalHeightPx = Math.max(targetElement.scrollHeight, targetElement.clientHeight);
  const pageHeightPx = Math.floor((options.pageHeightPt * totalWidthPx) / options.pageWidthPt);
  const pageBreaks = buildRowAwareBreaks(targetElement, pageHeightPx, totalHeightPx);
  const pages = [];

  for (let i = 0; i < pageBreaks.length; i += 1) {
    const startY = pageBreaks[i].startY;
    const endY = pageBreaks[i].endY;
    const sliceHeightPx = endY - startY;
    const stage = document.createElement("div");
    stage.style.position = "fixed";
    stage.style.left = "-100000px";
    stage.style.top = "0";
    stage.style.width = `${totalWidthPx}px`;
    stage.style.height = `${sliceHeightPx}px`;
    stage.style.overflow = "hidden";
    stage.style.background = "#ffffff";
    stage.style.pointerEvents = "none";
    stage.style.zIndex = "-1";

    const clone = targetElement.cloneNode(true);
    clone.style.transform = "none";
    clone.style.marginBottom = "0";
    clone.style.boxShadow = "none";
    clone.style.position = "relative";
    clone.style.top = `-${startY}px`;
    clone.style.width = `${totalWidthPx}px`;

    stage.appendChild(clone);
    document.body.appendChild(stage);
    try {
      await waitForImages(stage, options.imageTimeoutMs);

      const canvas = await html2canvasFn(stage, {
        scale: options.scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: options.imageTimeoutMs,
        windowWidth: totalWidthPx,
        windowHeight: sliceHeightPx,
        scrollX: 0,
        scrollY: 0
      });

      const sliceHeightPt = (sliceHeightPx * options.pageWidthPt) / totalWidthPx;
      pages.push({
        dataUrl: canvas.toDataURL("image/png", 1.0),
        widthPt: options.pageWidthPt,
        heightPt: sliceHeightPt
      });
    } finally {
      if (stage.parentNode) {
        stage.parentNode.removeChild(stage);
      }
    }
    emitState(options.onStateChange, {
      status: "loading",
      message: `Rendering page ${pages.length}...`,
      progress: Math.min(0.95, endY / totalHeightPx)
    });
  }

  return pages;
}

function collectRowTopOffsets(targetElement) {
  const targetRect = targetElement.getBoundingClientRect();
  const rows = Array.from(targetElement.querySelectorAll("tr"));
  const offsets = rows
    .map((row) => Math.floor(row.getBoundingClientRect().top - targetRect.top))
    .filter((offset) => Number.isFinite(offset) && offset > 0);
  return Array.from(new Set(offsets)).sort((a, b) => a - b);
}

function findBestBreak(rowOffsets, startY, hardLimitY, minPageRatio = 0.66) {
  const minimumBreak = startY + Math.floor((hardLimitY - startY) * minPageRatio);
  const candidates = rowOffsets.filter(
    (offset) => offset > minimumBreak && offset <= hardLimitY
  );
  if (candidates.length === 0) {
    return hardLimitY;
  }
  return candidates[candidates.length - 1];
}

function buildRowAwareBreaks(targetElement, nominalPageHeightPx, totalHeightPx) {
  const breaks = [];
  const rowOffsets = collectRowTopOffsets(targetElement);
  let startY = 0;

  while (startY < totalHeightPx) {
    const hardLimitY = Math.min(totalHeightPx, startY + nominalPageHeightPx);
    const endY =
      hardLimitY >= totalHeightPx
        ? totalHeightPx
        : findBestBreak(rowOffsets, startY, hardLimitY);

    breaks.push({ startY, endY });
    if (endY <= startY) {
      // Safety valve to avoid infinite loops on degenerate geometry.
      breaks[breaks.length - 1].endY = hardLimitY;
      startY = hardLimitY;
      continue;
    }
    startY = endY;
  }

  return breaks;
}

function createValidationError(message, details) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

function addPagesToPdf(pdf, pages) {
  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }
    pdf.addImage(page.dataUrl, "PNG", 0, 0, page.widthPt, page.heightPt, undefined, "FAST");
  });
}

export async function printInvoiceFallback({
  onStateChange,
  loadingElement,
  errorElement,
  triggerElement
} = {}) {
  try {
    setUiState({
      status: "loading",
      message: "Opening print dialog...",
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "fallback-print",
      message: "Opening print fallback."
    });
    await delay(80);
    window.print();
    setUiState({
      status: "success",
      message: "",
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "success",
      mode: "print"
    });
    return { ok: true, mode: "print" };
  } catch (error) {
    setUiState({
      status: "error",
      message: error.message,
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "error",
      error
    });
    throw error;
  }
}

export async function exportInvoicePreviewAsPdf(
  store,
  {
    target = "#invoice-preview",
    fileName,
    invoiceNo,
    scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
    imageTimeoutMs = 8000,
    useCdnFallback = true,
    allowPrintFallback = true,
    loadingElement = null,
    errorElement = null,
    triggerElement = null,
    onStateChange = null,
    forcePagedCapture = false,
    blockOnValidationErrors = true
  } = {}
) {
  const targetElement = resolveElement(target);
  if (!targetElement) {
    throw new Error("Invoice preview element not found for PDF export.");
  }

  const state = store.getState();
  const validation = validateInvoiceState(state);
  if (!validation.valid && blockOnValidationErrors) {
    const error = createValidationError(
      `Cannot export PDF. ${validation.errors.length} required field issue(s) found.`,
      validation
    );
    setUiState({
      status: "error",
      message: error.message,
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "error",
      message: error.message,
      validation
    });
    throw error;
  }

  const resolvedInvoiceNo = invoiceNo || state.customerVehicle.invoiceNo;
  const resolvedFileName = fileName || buildInvoicePdfFileName(resolvedInvoiceNo);

  setUiState({
    status: "loading",
    message: "Generating PDF...",
    loadingElement,
    errorElement,
    triggerElement
  });
  emitState(onStateChange, {
    status: "loading",
    message: "Preparing export...",
    validation
  });

  try {
    const { jsPdfCtor, html2canvasFn } = await resolvePdfDependencies({
      useCdnFallback
    });

    await waitForFonts();
    await waitForImages(targetElement, imageTimeoutMs);

    const pdf = new jsPdfCtor({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true
    });

    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();

    const restoreStyles = withCaptureStyles(targetElement);
    let pages = [];
    try {
      const width = Math.max(targetElement.scrollWidth, targetElement.clientWidth);
      const height = Math.max(targetElement.scrollHeight, targetElement.clientHeight);
      const estimatedPixels = width * height * scale * scale;
      const nominalPageHeightPx = Math.floor((pageHeightPt * width) / pageWidthPt);
      const spansMultiplePages = height > nominalPageHeightPx;
      const preferPagedCapture =
        forcePagedCapture || spansMultiplePages || estimatedPixels > 32_000_000;

      emitState(onStateChange, {
        status: "loading",
        message: preferPagedCapture
          ? "Rendering large invoice pages..."
          : "Rendering invoice..."
      });

      if (preferPagedCapture) {
        pages = await capturePagedDom(html2canvasFn, targetElement, {
          scale,
          imageTimeoutMs,
          pageWidthPt,
          pageHeightPt,
          onStateChange
        });
      } else {
        pages = await captureWholeElementAsPages(html2canvasFn, targetElement, {
          scale,
          imageTimeoutMs,
          pageWidthPt,
          pageHeightPt
        });
      }
    } finally {
      restoreStyles();
    }

    addPagesToPdf(pdf, pages);
    pdf.save(resolvedFileName);

    setUiState({
      status: "success",
      message: "",
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "success",
      message: "PDF generated successfully.",
      fileName: resolvedFileName,
      pageCount: pages.length,
      mode: "pdf"
    });

    return {
      ok: true,
      fileName: resolvedFileName,
      pageCount: pages.length,
      mode: "pdf"
    };
  } catch (error) {
    setUiState({
      status: "error",
      message: error.message || "PDF export failed.",
      loadingElement,
      errorElement,
      triggerElement
    });
    emitState(onStateChange, {
      status: "error",
      message: error.message || "PDF export failed.",
      error
    });

    if (allowPrintFallback && error.code !== "VALIDATION_ERROR") {
      return printInvoiceFallback({
        onStateChange,
        loadingElement,
        errorElement,
        triggerElement
      });
    }

    throw error;
  }
}
