const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const s4InvoiceService = await cds.connect.to("S4_INVOICE_API");

    this.on("postTestInvoice", async (req) => {
        const payload = {
            CompanyCode: "2610",
            DocumentDate: "/Date(1791504000000)/",
            PostingDate: "/Date(1791504000000)/",
            SupplierInvoiceIDByInvcgParty: "TEST KAMIL",
            InvoicingParty: "26402610",
            DocumentCurrency: "PLN",
            InvoiceGrossAmount: "1000.000",
            TaxIsCalculatedAutomatically: true,
            to_SupplierInvoiceItemGLAcct: {
                results: [
                    {
                        SupplierInvoiceItem: "0001",
                        GLAccount: "63008000",
                        CostCenter: "26101101",
                        TaxCode: "F4",
                        DebitCreditCode: "S",
                        DocumentCurrency: "PLN",
                        SupplierInvoiceItemAmount: "813.010"
                    }
                ]
            }
        };

        try {
            console.log("Sending test invoice to S/4HANA");
            console.log(
                "Invoice reference:",
                payload.SupplierInvoiceIDByInvcgParty
            );

            const result = await s4InvoiceService.send({
                method: "POST",
                path: "/A_SupplierInvoice",
                data: payload,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            });

            console.log(
                "S/4HANA response:",
                JSON.stringify(result, null, 2)
            );

            return {
                success: true,
                supplierInvoice:
                    result.SupplierInvoice ||
                    result.d?.SupplierInvoice ||
                    "",
                fiscalYear:
                    result.FiscalYear ||
                    result.d?.FiscalYear ||
                    "",
                message: "Supplier invoice created successfully."
            };
        } catch (error) {
            console.error("S/4HANA posting failed");
            console.error(error);

            const statusCode =
                error.statusCode ||
                error.response?.status ||
                502;

            const sapMessage =
                error.reason?.message ||
                error.response?.data?.error?.message?.value ||
                error.response?.data?.error?.message ||
                error.message ||
                "Unknown error returned by S/4HANA";

            return req.reject(
                statusCode,
                `S/4HANA posting failed: ${sapMessage}`
            );
        }
    });
});