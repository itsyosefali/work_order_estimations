frappe.ui.form.on("Quotation", {
	refresh: function(frm) {
		// Initialize quotation form
		if (frm.doc.docstatus === 0) {
			// Form is in draft mode
			frm.add_custom_button(__('Calculate Total'), function() {
				calculateQuotationTotal(frm);
			});
		}
		
		// Show WOE reference if exists
		if (frm.doc.custom_work_order_estimation_reference) {
			frm.add_custom_button(__('View WOE'), function() {
				frappe.set_route('Form', 'Work Order Estimation', frm.doc.custom_work_order_estimation_reference);
			}, __('View'));
		}
	},
	
	before_save: function(frm) {
		// Validate quotation before saving
		if (frm.doc.items && frm.doc.items.length > 0) {
			// Basic validation - ensure items have prices
			let hasInvalidItems = false;
			frm.doc.items.forEach(function(item) {
				if (!item.rate || item.rate <= 0) {
					hasInvalidItems = true;
				}
			});
			
			if (hasInvalidItems) {
				frappe.msgprint(__('Please ensure all items have valid rates'));
				frappe.validated = false;
			}
		}
	}
});

function calculateQuotationTotal(frm) {
	if (frm.doc.items && frm.doc.items.length > 0) {
		let total = 0;
		frm.doc.items.forEach(function(item) {
			if (item.qty && item.rate) {
				total += (item.qty * item.rate);
			}
		});
		
		frm.set_value('grand_total', total);
		frm.set_value('total', total);
		frm.refresh_field('grand_total');
		frm.refresh_field('total');
		
		frappe.show_alert(__('Total calculated: {0}', [format_currency(total)]));
	} else {
		frappe.msgprint(__('Please add items to calculate total'));
	}
}