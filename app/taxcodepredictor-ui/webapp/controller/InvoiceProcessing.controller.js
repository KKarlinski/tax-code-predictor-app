sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend(
        "com.taxpredictor.project1.controller.InvoiceProcessing",
        {
            onInit: function () {
                this._sPdfSource = null;
                this._oSelectedPdfFile = null;
            },

            setActiveProcessStep(iActiveStep) {
                for (let iStep = 1; iStep <= 5; iStep++) {
                    const oButton = this.byId(`processStep${iStep}Circle`);
                    const oText = this.byId(`processStep${iStep}Text`);
                    const oLeftLine = this.byId(`processStep${iStep}LeftLine`);
                    const oRightLine = this.byId(`processStep${iStep}RightLine`);

                    oText.removeStyleClass("processStepTextActive");
                    oText.removeStyleClass("processStepTextCompleted");

                    if (iStep < iActiveStep) {
                        oButton.setType("Accept");
                        oText.addStyleClass("processStepTextCompleted");
                    } else if (iStep === iActiveStep) {
                        oButton.setType("Emphasized");
                        oText.addStyleClass("processStepTextActive");
                    } else {
                        oButton.setType("Default");
                    }

                    if (oLeftLine && iStep > 1) {
                        oLeftLine.toggleStyleClass(
                            "processLineActive",
                            iStep <= iActiveStep
                        );
                    }

                    if (oRightLine && iStep < 5) {
                        oRightLine.toggleStyleClass(
                            "processLineActive",
                            iStep < iActiveStep
                        );
                    }
                }
            },
            onFileSelected: function (oEvent) {
                const aFiles = oEvent.getParameter("files");
                const oFile = aFiles && aFiles[0];

                if (!oFile) {
                    return;
                }

                const bIsPdf =
                    oFile.type === "application/pdf" ||
                    oFile.name.toLowerCase().endsWith(".pdf");

                if (!bIsPdf) {
                    MessageBox.error("Please select a PDF file.");
                    return;
                }

                /*
                * Zwolnij poprzedni Blob URL, jeżeli użytkownik
                * wcześniej wybrał inny dokument.
                */
                if (this._sPdfBlobUrl) {
                    URL.revokeObjectURL(this._sPdfBlobUrl);
                }

                this._oSelectedPdfFile = oFile;
                this._sPdfBlobUrl = URL.createObjectURL(oFile);

                this.byId("selectedFileName").setText(oFile.name);
                this.byId("selectedFileBox").setVisible(true);

                this.byId("uploadStatus")
                    .setText("Upload completed")
                    .setState("Success");

                this.byId("pdfPreviewStatus")
                    .setText("PDF loaded")
                    .setState("Success");

                const sIframeContent = `
<iframe
src="${this._sPdfBlobUrl}"
title="Invoice PDF Preview"
width="100%"
height="550"
style="
display: block;
width: 100%;
height: 550px;
border: none;
background-color: #ffffff;
">
</iframe>
`;

                const oHtmlPreview = this.byId("pdfHtmlPreview");

                oHtmlPreview.setContent(sIframeContent);
                oHtmlPreview.setVisible(true);

                this.byId("pdfPlaceholder").setVisible(false);
                this.byId("openPdfButton").setVisible(true);

                if (this.setActiveProcessStep) {
                    this.setActiveProcessStep(2);
                }

                MessageToast.show("PDF loaded: " + oFile.name);
            },

            onPdfLoaded: function () {
                this.byId("pdfPreviewStatus")
                    .setText("PDF displayed")
                    .setState("Success");
            },

            onPdfError: function () {
                this.byId("pdfPreviewStatus")
                    .setText("Preview unavailable")
                    .setState("Error");

                MessageBox.warning(
                    "The browser could not display the PDF inline. " +
                    "Verify browser PDF settings and embedded-content restrictions."
                );
            },

            onOpenPdf: function () {
                if (!this._sPdfBlobUrl) {
                    MessageToast.show("No PDF is currently loaded.");
                    return;
                }

                window.open(
                    this._sPdfBlobUrl,
                    "_blank",
                    "noopener,noreferrer"
                );
            },

            onRemoveFile: function () {
                this._resetPdfPreview();

                const oUploader = this.byId("invoiceUploader");

                if (oUploader) {
                    oUploader.clear();
                }

                MessageToast.show("PDF removed.");
            },

            _resetPdfPreview: function () {
                const oHtmlPreview = this.byId("pdfHtmlPreview");

                if (oHtmlPreview) {
                    oHtmlPreview.setVisible(false);
                    oHtmlPreview.setContent("");
                }

                this.byId("pdfPlaceholder").setVisible(true);
                this.byId("selectedFileBox").setVisible(false);
                this.byId("openPdfButton").setVisible(false);

                this.byId("selectedFileName")
                    .setText("No file selected");

                this.byId("uploadStatus")
                    .setText("No PDF selected")
                    .setState("None");

                this.byId("pdfPreviewStatus")
                    .setText("No PDF")
                    .setState("None");

                if (this._sPdfBlobUrl) {
                    URL.revokeObjectURL(this._sPdfBlobUrl);
                    this._sPdfBlobUrl = null;
                }

                this._oSelectedPdfFile = null;
            },

            onCompanyCodeChange: function (oEvent) {
                const sCompanyCode =
                    oEvent.getSource().getSelectedKey();

                this.byId("inpCompanyCodeHeader")
                    .setValue(sCompanyCode);

                if (this.setActiveProcessStep) {
                    this.setActiveProcessStep(3);
                }
            },

            onSubmitToSap: async function () {
                const oView = this.getView();

                oView.setBusy(true);

                try {
                    // 1. Pobranie tokenu CSRF od approutera/CAP
                    const oTokenResponse = await fetch("/invoice/$metadata", {
                        method: "GET",
                        headers: {
                            Accept: "application/xml",
                            "X-CSRF-Token": "Fetch"
                        },
                        credentials: "same-origin"
                    });

                    if (!oTokenResponse.ok) {
                        const sTokenErrorText = await oTokenResponse.text();

                        throw new Error(
                            sTokenErrorText ||
                            `Could not retrieve CSRF token. HTTP ${oTokenResponse.status}.`
                        );
                    }

                    const sCsrfToken =
                        oTokenResponse.headers.get("X-CSRF-Token") ||
                        oTokenResponse.headers.get("x-csrf-token");

                    if (!sCsrfToken) {
                        throw new Error(
                            "The server did not return an X-CSRF-Token."
                        );
                    }

                    // 2. Wysłanie właściwego żądania POST
                    const oResponse = await fetch(
                        "/invoice/postTestInvoice",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                "X-CSRF-Token": sCsrfToken
                            },
                            credentials: "same-origin",
                            body: JSON.stringify({})
                        }
                    );

                    // 3. Odczytujemy najpierw tekst, bo odpowiedź błędu
                    // nie zawsze jest JSON-em.
                    const sResponseText = await oResponse.text();

                    let oResult = {};

                    if (sResponseText) {
                        try {
                            oResult = JSON.parse(sResponseText);
                        } catch (oParseError) {
                            // Pozostawiamy pusty obiekt i wykorzystujemy tekst odpowiedzi.
                            oResult = {};
                        }
                    }

                    if (!oResponse.ok) {
                        const sErrorMessage =
                            oResult.error?.message?.value ||
                            oResult.error?.message ||
                            oResult.message ||
                            sResponseText ||
                            `Posting to SAP failed with HTTP ${oResponse.status}.`;

                        throw new Error(sErrorMessage);
                    }

                    const sInvoiceNumber =
                        oResult.supplierInvoice ||
                        oResult.SupplierInvoice ||
                        "unknown";

                    const sFiscalYear =
                        oResult.fiscalYear ||
                        oResult.FiscalYear ||
                        "";

                    const sSuccessMessage = sFiscalYear
                        ? `Invoice ${sInvoiceNumber}, fiscal year ${sFiscalYear}, was created successfully.`
                        : `Invoice ${sInvoiceNumber} was created successfully.`;

                    sap.m.MessageBox.success(sSuccessMessage);
                } catch (oError) {
                    console.error("Submit to SAP failed:", oError);

                    sap.m.MessageBox.error(
                        oError instanceof Error && oError.message
                            ? oError.message
                            : "Posting to SAP failed."
                    );
                } finally {
                    oView.setBusy(false);
                }
            },

            onSupplierValueHelp: function () {
                MessageToast.show("Supplier value help");
            },

            onGlAccountValueHelp: function () {
                MessageToast.show("G/L Account value help");
            },

            onCostCenterValueHelp: function () {
                MessageToast.show("Cost Center value help");
            }
        }
    );
});