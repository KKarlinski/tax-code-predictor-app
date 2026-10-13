@path: '/invoice'
service InvoiceService {
 
type PostingResult {
success : Boolean;
supplierInvoice : String;
fiscalYear : String;
message : String;
}
 
action postTestInvoice() returns PostingResult;
}