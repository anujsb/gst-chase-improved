import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const filingStatusEnum = pgEnum("filing_status", [
  "pending",
  "in_progress",
  "reconciled",
  "filed",
]);

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "matched",       // Green
  "partial",       // Yellow
  "mismatch",      // Red
  "missing_in_2b", // Red – invoice in books, not in 2B
  "missing_in_books", // Red – in 2B, not in books
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "b2b",
  "b2ba", // amended
  "cdnr", // credit/debit note
  "impg", // import of goods
  "isd",  // input service distributor
]);

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name").notNull(),
  gstin:         text("gstin").notNull().unique(),
  tradeName:     text("trade_name"),
  email:         text("email"),
  whatsappNumber: text("whatsapp_number"),
  phone:         text("phone"),
  address:       text("address"),
  stateCode:     text("state_code"),          // 2-digit GST state code
  registrationType: text("registration_type").default("regular"), // regular/composition/sei
  notes:         text("notes"),
  isActive:      boolean("is_active").default(true),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// ─── Filing Periods ───────────────────────────────────────────────────────────

export const filingPeriods = pgTable("filing_periods", {
  id:            uuid("id").primaryKey().defaultRandom(),
  clientId:      uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  month:         integer("month").notNull(),           // 1–12
  year:          integer("year").notNull(),
  status:        filingStatusEnum("status").default("pending").notNull(),
  // GSTR-2B data
  gstr2bUploadedAt: timestamp("gstr2b_uploaded_at"),
  gstr2bFileName:   text("gstr2b_file_name"),
  gstr2bRawJson:    jsonb("gstr2b_raw_json"),           // full parsed JSON stored
  // Summary figures (computed after reconciliation)
  totalInvoicesInBooks:   integer("total_invoices_in_books").default(0),
  totalInvoicesIn2B:      integer("total_invoices_in_2b").default(0),
  matchedCount:           integer("matched_count").default(0),
  partialCount:           integer("partial_count").default(0),
  mismatchCount:          integer("mismatch_count").default(0),
  // ITC figures for GSTR-3B
  itcIgst:       numeric("itc_igst", { precision: 15, scale: 2 }).default("0"),
  itcCgst:       numeric("itc_cgst", { precision: 15, scale: 2 }).default("0"),
  itcSgst:       numeric("itc_sgst", { precision: 15, scale: 2 }).default("0"),
  itcCess:       numeric("itc_cess", { precision: 15, scale: 2 }).default("0"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// ─── Purchase Invoices (from client's books / OCR) ───────────────────────────

export const purchaseInvoices = pgTable("purchase_invoices", {
  id:              uuid("id").primaryKey().defaultRandom(),
  filingPeriodId:  uuid("filing_period_id").notNull().references(() => filingPeriods.id, { onDelete: "cascade" }),
  // Supplier details
  supplierGstin:   text("supplier_gstin").notNull(),
  supplierName:    text("supplier_name"),
  // Invoice details
  invoiceNumber:   text("invoice_number").notNull(),
  invoiceDate:     text("invoice_date").notNull(),       // stored as string DD/MM/YYYY
  invoiceType:     invoiceTypeEnum("invoice_type").default("b2b"),
  // Amounts
  taxableAmount:   numeric("taxable_amount", { precision: 15, scale: 2 }).notNull(),
  igst:            numeric("igst", { precision: 15, scale: 2 }).default("0"),
  cgst:            numeric("cgst", { precision: 15, scale: 2 }).default("0"),
  sgst:            numeric("sgst", { precision: 15, scale: 2 }).default("0"),
  cess:            numeric("cess", { precision: 15, scale: 2 }).default("0"),
  totalAmount:     numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  // ITC eligibility
  itcEligible:     boolean("itc_eligible").default(true),
  isRcm:           boolean("is_rcm").default(false),     // Reverse Charge Mechanism
  // Source tracking
  sourceFile:      text("source_file"),                  // original file name
  ocrConfidence:   numeric("ocr_confidence", { precision: 5, scale: 2 }), // 0–100
  extractedByAi:   boolean("extracted_by_ai").default(false),
  rawOcrData:      jsonb("raw_ocr_data"),                // Gemini's raw extraction
  // Reconciliation
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status"),
  reconciliationNotes:  text("reconciliation_notes"),
  matched2bId:     text("matched_2b_id"),                // ref to GSTR-2B invoice
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

// ─── GSTR-2B Invoices (from portal / uploaded JSON) ─────────────────────────

export const gstr2bInvoices = pgTable("gstr2b_invoices", {
  id:              uuid("id").primaryKey().defaultRandom(),
  filingPeriodId:  uuid("filing_period_id").notNull().references(() => filingPeriods.id, { onDelete: "cascade" }),
  // Supplier details
  supplierGstin:   text("supplier_gstin").notNull(),
  supplierName:    text("supplier_name"),
  supplierTradeName: text("supplier_trade_name"),
  // Invoice details
  invoiceNumber:   text("invoice_number").notNull(),
  invoiceDate:     text("invoice_date").notNull(),
  invoiceType:     invoiceTypeEnum("invoice_type").default("b2b"),
  // Amounts (from GSTR-2B JSON)
  taxableAmount:   numeric("taxable_amount", { precision: 15, scale: 2 }).notNull(),
  igst:            numeric("igst", { precision: 15, scale: 2 }).default("0"),
  cgst:            numeric("cgst", { precision: 15, scale: 2 }).default("0"),
  sgst:            numeric("sgst", { precision: 15, scale: 2 }).default("0"),
  cess:            numeric("cess", { precision: 15, scale: 2 }).default("0"),
  totalAmount:     numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  // ITC info from 2B
  itcAvailable:    text("itc_available"),                // "Y"/"N"/"T"(temporary)
  itcReason:       text("itc_reason"),                   // reason if not available
  isRcm:           boolean("is_rcm").default(false),
  // Source position in original JSON
  sourceSection:   text("source_section"),               // "b2b","cdnr","impg"
  // Reconciliation
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status"),
  matchedPurchaseId: uuid("matched_purchase_id"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

// ─── Uploaded Files ───────────────────────────────────────────────────────────

export const uploadedFiles = pgTable("uploaded_files", {
  id:             uuid("id").primaryKey().defaultRandom(),
  filingPeriodId: uuid("filing_period_id").notNull().references(() => filingPeriods.id, { onDelete: "cascade" }),
  fileName:       text("file_name").notNull(),
  fileType:       text("file_type").notNull(),            // MIME type
  fileSize:       integer("file_size"),                   // bytes
  fileUrl:        text("file_url"),                       // if stored in cloud
  purpose:        text("purpose").notNull(),              // "invoice"|"gstr2b"|"other"
  processedAt:    timestamp("processed_at"),
  processingError: text("processing_error"),
  extractedCount: integer("extracted_count").default(0), // invoices extracted from this file
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const clientRelations = relations(clients, ({ many }) => ({
  filingPeriods: many(filingPeriods),
}));

export const filingPeriodRelations = relations(filingPeriods, ({ one, many }) => ({
  client:          one(clients, { fields: [filingPeriods.clientId], references: [clients.id] }),
  purchaseInvoices: many(purchaseInvoices),
  gstr2bInvoices:  many(gstr2bInvoices),
  uploadedFiles:   many(uploadedFiles),
}));

export const purchaseInvoiceRelations = relations(purchaseInvoices, ({ one }) => ({
  filingPeriod: one(filingPeriods, { fields: [purchaseInvoices.filingPeriodId], references: [filingPeriods.id] }),
}));

export const gstr2bInvoiceRelations = relations(gstr2bInvoices, ({ one }) => ({
  filingPeriod: one(filingPeriods, { fields: [gstr2bInvoices.filingPeriodId], references: [filingPeriods.id] }),
}));

export const uploadedFileRelations = relations(uploadedFiles, ({ one }) => ({
  filingPeriod: one(filingPeriods, { fields: [uploadedFiles.filingPeriodId], references: [filingPeriods.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Client         = typeof clients.$inferSelect;
export type NewClient      = typeof clients.$inferInsert;
export type FilingPeriod   = typeof filingPeriods.$inferSelect;
export type NewFilingPeriod = typeof filingPeriods.$inferInsert;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type Gstr2bInvoice  = typeof gstr2bInvoices.$inferSelect;
export type UploadedFile   = typeof uploadedFiles.$inferSelect;