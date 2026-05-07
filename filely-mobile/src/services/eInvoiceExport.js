/**
 * UAE FTA e-invoicing (Phase 2, mandatory from July 2026 for companies with
 * annual revenue > AED 3M).
 *
 * Format: PEPPOL BIS Billing 3.0 (UBL 2.1 XML) — UAE-extended profile.
 * This builder emits one <Invoice> per tx. Actual submission requires an
 * accredited service provider; we emit valid XML the user can hand off.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function xmlEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[ch]);
}

function invoiceXml(tx, { supplierTRN, supplierName, buyerTRN, buyerName }) {
  const id = tx.id || `INV-${Date.now()}`;
  const issue = (tx.date || new Date().toISOString().slice(0, 10));
  const totalInclVat = Number(tx.amount || 0).toFixed(2);
  const vat = Number(tx.vat || 0).toFixed(2);
  const taxable = (Number(tx.amount || 0) - Number(tx.vat || 0)).toFixed(2);
  const merchant = tx.merchant || 'Unknown';
  const category = tx.category || 'other';

  return `  <cac:InvoiceLine-group>
    <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
      <cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>
      <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
      <cbc:ID>${xmlEsc(id)}</cbc:ID>
      <cbc:IssueDate>${xmlEsc(issue)}</cbc:IssueDate>
      <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
      <cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>
      <cbc:TaxCurrencyCode>AED</cbc:TaxCurrencyCode>
      <cac:AccountingSupplierParty>
        <cac:Party>
          <cac:PartyName><cbc:Name>${xmlEsc(supplierName || merchant)}</cbc:Name></cac:PartyName>
          <cac:PartyTaxScheme>
            <cbc:CompanyID>${xmlEsc(supplierTRN || tx.trn || '')}</cbc:CompanyID>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:PartyTaxScheme>
        </cac:Party>
      </cac:AccountingSupplierParty>
      <cac:AccountingCustomerParty>
        <cac:Party>
          <cac:PartyName><cbc:Name>${xmlEsc(buyerName || '')}</cbc:Name></cac:PartyName>
          <cac:PartyTaxScheme>
            <cbc:CompanyID>${xmlEsc(buyerTRN || '')}</cbc:CompanyID>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:PartyTaxScheme>
        </cac:Party>
      </cac:AccountingCustomerParty>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="AED">${vat}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="AED">${taxable}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="AED">${vat}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>5.00</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="AED">${taxable}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="AED">${taxable}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="AED">${totalInclVat}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="AED">${totalInclVat}</cbc:PayableAmount>
      </cac:LegalMonetaryTotal>
      <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="AED">${taxable}</cbc:LineExtensionAmount>
        <cac:Item>
          <cbc:Name>${xmlEsc(category)}</cbc:Name>
          <cac:ClassifiedTaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>5.00</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price><cbc:PriceAmount currencyID="AED">${taxable}</cbc:PriceAmount></cac:Price>
      </cac:InvoiceLine>
    </Invoice>
  </cac:InvoiceLine-group>`;
}

/** Export a bundle of tx as one zip-like XML wrapper. */
export async function exportPeppolBatch(transactions, opts = {}) {
  const inner = transactions.map(t => invoiceXml(t, opts)).join('\n');
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceBundle generator="Filey" generated="${new Date().toISOString()}" count="${transactions.length}">
${inner}
</InvoiceBundle>`;
  const fname = opts.filename || `filey-einvoice-${Date.now()}.xml`;
  const path = `${FileSystem.cacheDirectory}${fname}`;
  await FileSystem.writeAsStringAsync(path, doc, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/xml', dialogTitle: 'Export e-invoice XML' });
  }
  return path;
}
