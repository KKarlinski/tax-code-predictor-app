/*global QUnit*/

sap.ui.define([
	"com/capgemini/invoice/taxcode/taxcodepredictor/controller/InvoiceProcessing.controller"
], function (Controller) {
	"use strict";

	QUnit.module("InvoiceProcessing Controller");

	QUnit.test("I should test the InvoiceProcessing controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
