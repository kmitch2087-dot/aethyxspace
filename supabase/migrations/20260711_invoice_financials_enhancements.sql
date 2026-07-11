-- Save-as-draft + hide/unhide for admin invoices, invoice-linked document entries with
-- an inline pay prompt, and income/expense typing on financial_records for logging
-- business costs (e.g. the Claude subscription) alongside client revenue.
ALTER TABLE client_invoices ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE client_documents ADD COLUMN linked_invoice_id uuid REFERENCES client_invoices(id) ON DELETE CASCADE;
ALTER TABLE financial_records ADD COLUMN entry_type text NOT NULL DEFAULT 'income';
