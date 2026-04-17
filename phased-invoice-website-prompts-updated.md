# Updated Phase-Wise AI Prompts for the Exact Automotive Estimate Invoice Layout

This prompt pack is tailored specifically to the attached invoice image and should be used to build a static web application that generates the same style of automotive estimate/invoice as a downloadable PDF, with all values configurable before export.[file:64]

The target output is not a generic invoice. It is a workshop/service-center style **automotive estimate invoice** with a fixed header area, customer/vehicle metadata rows, a parts table, a separate labour charges table, tax breakdown columns for CGST and SGST, section-wise totals, a gross amount area, a highlighted grand-total box, terms and conditions, and a bottom note/signature/stamp area.[file:64]

## Exact target layout

The output PDF must closely match the attached reference in structure and section order. The invoice in the image contains these major blocks: workshop branding and address at the top-left with logo, a centered dark title bar labeled “Eatimate”, left-right metadata rows below it, a parts/items table, a separate labour charges table, summary totals for each section, terms and conditions, a note about system-generated invoice, and a signature/stamp footer zone.[file:64]

## Mandatory configurable fields

Every field seen in the reference invoice should be configurable from the static web app before PDF generation. Based on the attached image, the editable fields should include at least the following.[file:64]

### Header and business details

- Workshop/company logo.[file:64]
- Workshop/business name.[file:64]
- Workshop address.[file:64]
- Contact number.[file:64]
- Email address.[file:64]
- Title bar text, defaulting to `Estimate` or matching the desired spelling/style of the invoice format.[file:64]

### Customer and vehicle metadata

- Registration number / Regd No.[file:64]
- Customer name.[file:64]
- Odometer / Odo meter.[file:64]
- Mobile number.[file:64]
- Customer GST number.[file:64]
- Estimate date.[file:64]
- Due date.[file:64]
- Invoice number.[file:64]
- Business GSTIN.[file:64]

### Parts/items section

The first main table in the image is for parts/material items. It includes row-wise and tax-wise fields that should remain editable and recalculated automatically.[file:64]

Editable columns required:

- Serial number.[file:64]
- Description.[file:64]
- SAC code.[file:64]
- Quantity.[file:64]
- Rate.[file:64]
- Taxable amount.[file:64]
- CGST rate percent.[file:64]
- CGST amount.[file:64]
- SGST rate percent.[file:64]
- SGST amount.[file:64]
- Discount percent.[file:64]
- Total amount including taxes.[file:64]

Section summary fields required:

- Parts net taxable amount.[file:64]
- Parts tax total.[file:64]
- Final parts invoice amount.[file:64]

### Labour charges section

The second table is a separate labour section titled “Labour Charges,” and it should be configurable independently from the parts section.[file:64]

Editable labour columns required:

- Serial number.[file:64]
- Description.[file:64]
- SAC code.[file:64]
- Quantity.[file:64]
- Rate.[file:64]
- Taxable amount.[file:64]
- CGST rate percent.[file:64]
- CGST amount.[file:64]
- SGST rate percent.[file:64]
- SGST amount.[file:64]
- Total amount including taxes.[file:64]

Section summary fields required:

- Labour taxable amount.[file:64]
- Total labour tax amount.[file:64]
- Final labour invoice amount.[file:64]

### Final totals and footer

- Gross amount.[file:64]
- Grand total box value.[file:64]
- Grand total text label.[file:64]
- Terms and conditions text block.[file:64]
- Bottom note text such as “This is a system generated invoice. No signature required.”[file:64]
- Signature label.[file:64]
- Signature image optional upload.[file:64]
- Stamp image optional upload.[file:64]

## Required behavior

The application should allow the user to create this exact invoice style with flexible data entry while preserving the same visual structure as the attached reference.[file:64]

The app must support:

- Adding, editing, deleting, and duplicating rows in the **parts** section.[file:64]
- Adding, editing, deleting, and duplicating rows in the **labour charges** section.[file:64]
- Loading part/service items from JSON catalogs with categories and subcategories.[file:64]
- Selecting any number of catalog items and inserting them into the correct section, especially parts or labour.[file:64]
- Editing imported items after adding them to the invoice, without mutating the master catalog.[file:64]
- Creating custom manual rows not present in the catalog JSON.[file:64]
- Automatically recalculating section totals and final totals on every change.[file:64]
- Generating a print-ready PDF that visually matches the reference layout as closely as practical in HTML/CSS.[file:64]

## Catalog model for this invoice

Because this invoice separates parts and labour, the JSON catalog should also support item typing so the app can route selected rows into the correct table.[file:64]

Each JSON catalog item should include:

- `id`
- `type` (`part` or `labour`)
- `name`
- `category`
- `subcategory`
- `description`
- `sacCode`
- `unit`
- `rate`
- `defaultQty`
- `cgstRate`
- `sgstRate`
- `discountPercent`
- `hsnSac`
- `isActive`
- `tags`

## Recommended JSON examples

### Parts/labour catalog JSON

```json
{
  "catalogName": "yare-automotive-catalog",
  "version": "1.0",
  "items": [
    {
      "id": "part-001",
      "type": "part",
      "name": "Shock absorber",
      "category": "Suspension",
      "subcategory": "Shock Absorber",
      "description": "Shock absorber",
      "sacCode": "8708",
      "unit": "pcs",
      "rate": 1077.12,
      "defaultQty": 2,
      "cgstRate": 9,
      "sgstRate": 9,
      "discountPercent": 0,
      "isActive": true,
      "tags": ["suspension", "front"]
    },
    {
      "id": "lab-001",
      "type": "labour",
      "name": "Shock absorber change",
      "category": "Workshop Labour",
      "subcategory": "Suspension Work",
      "description": "Shock absorber change",
      "sacCode": "998714",
      "unit": "job",
      "rate": 300.00,
      "defaultQty": 2,
      "cgstRate": 9,
      "sgstRate": 9,
      "discountPercent": 0,
      "isActive": true,
      "tags": ["labour", "suspension"]
    }
  ]
}
```

### Invoice line snapshot JSON

Once added to the invoice, each line should become an editable snapshot row so the user can change rate, quantity, tax, or description before exporting the PDF.[file:64]

```json
{
  "sourceItemId": "part-001",
  "type": "part",
  "name": "Shock absorber",
  "description": "Shock absorber",
  "sacCode": "8708",
  "qty": 2,
  "rate": 1077.12,
  "taxableAmount": 2154.24,
  "cgstRate": 9,
  "cgstAmount": 193.88,
  "sgstRate": 9,
  "sgstAmount": 193.88,
  "discountPercent": 0,
  "totalInclTax": 2542.00
}
```

## Updated full phases

## Phase 1 prompt — exact invoice analysis and requirement lock

```text
Act as a senior product analyst, invoice systems expert, and front-end architect.

Build requirements for a STATIC web application that generates the exact automotive estimate invoice layout shown in the provided reference image.

This is not a generic invoice. The output must specifically match this structure:
- Business logo and workshop details at top-left
- Dark header title bar with the invoice title
- Two-column metadata section with fields like Regd No, Name, Odo Meter, Mobile no, Customer GST No, Estimate Date, Due Date, Invoice No, GST IN
- First table for parts/items
- Separate second table for Labour Charges
- Summary totals for parts
- Summary totals for labour
- Gross amount row
- Dark grand-total box at bottom-right
- Terms and conditions area
- Bottom note for system-generated invoice
- Signature/stamp area

Deliver:
- Exact field inventory
- Fixed layout zones
- User-editable fields list
- Auto-calculated fields list
- Section-by-section functional requirements
- Risks in reproducing the layout in HTML/CSS/PDF
- Mobile editing strategy even though final PDF is portrait invoice format

Return a highly specific product requirement document focused only on this invoice style.
```

## Phase 2 prompt — exact information architecture for this invoice app

```text
Act as a senior UX architect.

Design the information architecture for a static app that creates only this automotive estimate invoice format.

Required sections in the app:
- Business profile settings
- Customer and vehicle details form
- Parts catalog manager
- Labour catalog manager
- Parts item picker
- Labour item picker
- Invoice editor
- Terms and footer settings
- Live invoice preview
- Export panel

Define:
- How users edit business data
- How users add vehicle/customer metadata
- How users choose parts vs labour rows
- How users manage catalog JSON files
- How users edit imported rows inside the invoice without affecting the catalog
- How users preview and export the final invoice PDF

Return an app flow specific to this single invoice type.
```

## Phase 3 prompt — UI/UX design for this exact invoice generator

```text
Act as a senior product designer and print-focused UI expert.

Design a static web-app UI for creating the exact automotive estimate invoice shown in the reference image.

Requirements:
- Editing UI should be modern, clean, and easy to use.
- Final invoice preview should visually match the reference closely.
- The PDF output should preserve dense tabular structure.
- Forms should be organized into sections matching the final invoice.
- The editor should clearly separate parts from labour.
- Terms, gross amount, and footer controls should be easy to update.

Create:
- Desktop-first split layout with form and preview
- Mobile-friendly stacked editing UI
- Parts table editor UI
- Labour table editor UI
- Summary/totals editing and review UI
- Footer note and signature/stamp upload UI
- Validation states and empty states

Return detailed UI specs tailored to this invoice only.
```

## Phase 4 prompt — technical architecture for this single-invoice product

```text
Act as a senior front-end architect.

Design the technical architecture for a modular static web app that generates one exact automotive estimate invoice format.

Requirements:
- Plain HTML, CSS, and JavaScript only
- Single invoice layout target
- Separate modules for business data, customer data, parts rows, labour rows, calculations, rendering, JSON import/export, and PDF generation
- Parts and labour should be stored separately in state
- Catalog data should be separate from invoice rows
- Invoice rows should be snapshot copies
- Final renderer should assemble one exact print layout

Return:
- Folder structure
- File responsibilities
- State shape
- Data flow
- Rendering flow
- Export flow
```

## Phase 5 prompt — exact data model for this invoice

```text
Act as a senior JavaScript engineer and invoice-domain expert.

Define the final data model for this exact automotive estimate invoice.

Include:
- Business header data
- Customer/vehicle metadata
- Parts rows array
- Labour rows array
- Parts summary totals
- Labour summary totals
- Gross amount
- Grand total
- Terms and conditions text
- Footer note
- Signature image
- Stamp image
- PDF/export metadata

For parts rows and labour rows define fields for:
- serial number
- description
- sac code
- qty
- rate
- taxable amount
- cgst rate
- cgst amount
- sgst rate
- sgst amount
- discount percent where applicable
- total amount including taxes

Return the final JS object model and one realistic sample payload.
```

## Phase 6 prompt — JSON catalog system for parts and labour

```text
Act as a senior front-end architect.

Build the JSON catalog architecture for this automotive invoice app.

Requirements:
- Support separate item types: part and labour
- Support category and subcategory
- Allow adding, editing, deleting, activating, and exporting items
- Allow import/export of catalog JSON files
- Allow separate filtering for parts and labour
- Default selected part items should go into the parts table
- Default selected labour items should go into the labour table
- Users may override any imported values inside the invoice before PDF export

Return:
- Catalog schema
- CRUD logic
- Filtering rules
- UI flow for item picking
- Edge cases
```

## Phase 7 prompt — parts and labour row editing engine

```text
Act as a senior JavaScript engineer.

Build the invoice row editing engine for this app.

Requirements:
- Users can add rows manually to parts or labour
- Users can import rows from JSON catalog into parts or labour
- Users can edit any row fields before export
- Users can delete rows
- Users can duplicate rows
- Users can reorder rows
- Blank rows should be allowed up to a configurable table length for visual alignment if needed in the final PDF layout
- Summary totals should auto-update instantly

Important:
- The final invoice preview must preserve the tabular feel of the reference invoice
- Editing invoice rows must not change master catalog items

Return modular JavaScript logic.
```

## Phase 8 prompt — invoice calculation engine for this format

```text
Act as a senior JavaScript engineer.

Implement the exact calculation logic for this automotive estimate invoice format.

Calculate separately for parts and labour:
- taxable totals
- total CGST
- total SGST
- total tax
- final section invoice amount

Then calculate:
- gross amount
- grand total
- optional round-off if enabled

Rules:
- Quantity × rate should derive taxable amount unless overridden intentionally
- CGST and SGST amounts should derive from taxable amount and rates
- Total amount including taxes should be calculated row-wise
- Section totals should sum row totals
- Gross amount should combine final parts invoice amount and final labour invoice amount

Return pure functions and formula notes.
```

## Phase 9 prompt — exact HTML shell and invoice preview layout

```text
Act as a senior front-end engineer.

Build the complete HTML structure for a static web app that edits and previews this exact automotive estimate invoice format.

Requirements:
- Main editing area
- Separate sections for business, customer/vehicle metadata, parts, labour, footer settings, and export controls
- Live invoice preview pane
- Invoice preview must mirror the reference layout closely, including:
  - header logo area
  - title bar
  - metadata rows
  - parts table
  - labour table
  - section summaries
  - gross amount row
  - dark grand total box
  - terms and conditions area
  - footer note
  - signature/stamp zone

Return semantic HTML with clear IDs/classes.
```

## Phase 10 prompt — print-focused CSS for exact visual match

```text
Act as a senior UI engineer and print-layout specialist.

Write the CSS for the static invoice app and the final invoice preview so the generated print/PDF visually matches the provided reference automotive estimate invoice as closely as possible.

Requirements:
- Dense tabular layout
- Strong borders like the reference
- Compact typography
- Dark section header bar
- Proper alignment of numeric columns
- Fixed-feel invoice proportions suitable for A4 portrait
- Footer grand total highlight box
- Professional print output
- Screen editor styles and separate print styles

Include styles for:
- editor UI
- invoice preview
- tables and merged cells
- summary blocks
- terms section
- stamp/signature area
- print media rules

Return production-ready CSS.
```

## Phase 11 prompt — state management and rendering logic

```text
Act as a senior JavaScript engineer.

Write the state and rendering logic for this automotive invoice generator.

Implement:
- business state
- customer/vehicle state
- parts rows state
- labour rows state
- catalog state
- preview render state
- invoice totals state
- footer settings state
- import/export actions
- row CRUD actions
- preview rerender on change

Rules:
- keep calculations pure
- keep rendering separate
- keep catalog items separate from invoice rows
- support image upload for logo, signature, and stamp

Return modular JS.
```

## Phase 12 prompt — PDF generation for this exact invoice layout

```text
Act as a senior JavaScript engineer.

Implement browser-side PDF generation for this automotive estimate invoice layout.

Requirements:
- Export the current invoice preview as PDF
- Preserve borders, tables, dark header bars, summary rows, and footer areas
- Support A4 portrait
- Support long tables if row count grows
- Prefer jsPDF + html2canvas or an equivalent browser-safe approach
- Use invoice number in file naming
- Add loading and error states
- Include print fallback

Return production-ready PDF export logic.
```

## Phase 13 prompt — QA and layout hardening for this invoice

```text
Act as a senior QA architect and print-layout reviewer.

Review the full static automotive invoice generator and harden it.

Test:
- exact field rendering
- table overflow
- long descriptions
- many parts rows
- many labour rows
- missing GST/customer fields
- blank cells
- image uploads for logo and stamp
- alignment in print and PDF
- numeric column alignment
- total calculations
- mobile editing experience
- keyboard accessibility

Return:
- issue list
- fixes required
- final production checklist
```

## Phase 14 prompt — final code assembly for this invoice generator

```text
Act as a senior front-end engineer.

Using all prior planning, build the complete end-to-end static web app for generating the exact automotive estimate invoice shown in the reference image.

Requirements:
- HTML, CSS, and JavaScript only
- modular codebase
- exact invoice-specific layout
- configurable business and customer details
- configurable parts rows
- configurable labour rows
- JSON catalog support for parts and labour
- editable invoice rows before export
- live preview matching the invoice design
- browser PDF generation
- print support
- import/export JSON support
- optional logo/signature/stamp upload
- production-quality code with no placeholders

Return the entire project file-by-file.
```

## Key implementation note

The most important architecture rule for this invoice is to keep **parts** and **labour** as separate editable sections in both the UI and state model, because the attached reference invoice treats them as distinct billing blocks with separate totals before combining them into the gross amount and grand total.[file:64]

## How to use this markdown

Use each phase prompt one by one with your coding AI. Approve each result, then move to the next phase. This version is tailored only for the attached automotive estimate invoice layout and should replace the earlier generic invoice prompt pack when building your final app.[file:64]
