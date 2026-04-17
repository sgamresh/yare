import { createInvoiceApp } from "./main.js";
import { mountAppUi } from "./ui/app-ui.js";
import { applySampleData } from "./ui/sample-data.js";

async function bootstrap() {
  const previewRoot = document.querySelector("#invoice-preview");
  const app = createInvoiceApp({ previewRoot });
  mountAppUi(app, document);
  await applySampleData(app);
}

bootstrap().catch((error) => {
  const status = document.querySelector("#boot-error");
  if (status) {
    status.textContent = error.message;
    status.hidden = false;
  }
  throw error;
});
