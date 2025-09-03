frappe.ui.form.on("Quotation", {
	refresh: function(frm) {
		// Initialize quotation form
		if (frm.doc.docstatus === 0) {
			// Form is in draft mode
			frm.add_custom_button(__('Calculate Total'), function() {
				calculateQuotationTotal(frm);
			});
			
			// Add button to create Work Order Estimations
			if (frm.doc.items && frm.doc.items.length > 0) {
				frm.add_custom_button(__('Create WOE'), function() {
					createWorkOrderEstimations(frm);
				}, __('Create'));
			}
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
		
		frappe.show_alert(__('Total calculated:  {0}', [format_currency(total)]));
	} else {
		frappe.msgprint(__('Please add items to calculate total'));
	}
}

function createWorkOrderEstimations(frm) {
	if (!frm.doc.items || frm.doc.items.length === 0) {
		frappe.msgprint(__('Please add items to create Work Order Estimations'));
		return;
	}
	
	// Check if items have required fields for WOE
	let itemsWithoutSpecs = [];
	let itemsWithSpecs = [];
	
	frm.doc.items.forEach(function(item) {
		if (!item.item_code) {
			itemsWithoutSpecs.push('Unknown Item');
		} else {
			// Check if item has required specifications
			let hasSpecs = validateItemSpecifications(item);
			if (!hasSpecs) {
				itemsWithoutSpecs.push(item.item_code);
			} else {
				itemsWithSpecs.push(item);
			}
		}
	});
	
	if (itemsWithoutSpecs.length > 0) {
		frappe.msgprint({
			title: __('Missing Specifications'),
			message: __('The following items are missing required specifications (GSM, Length, Width) for WOE creation: {0}', [itemsWithoutSpecs.join(', ')]),
			indicator: 'red'
		});
		return;
	}
	
	if (itemsWithSpecs.length === 0) {
		frappe.msgprint(__('No items with valid specifications found for WOE creation'));
		return;
	}
	
	// Confirm creation
	frappe.confirm(
		__('This will create {0} Work Order Estimation(s) from items with valid specifications. Continue?', [itemsWithSpecs.length]),
		function() {
			// Create WOE for each valid item
			createWOEForItems(frm, itemsWithSpecs);
		}
	);
}

function validateItemSpecifications(item) {
	// Check if item has required specifications for WOE
	return item.gsm && item.gsm > 0 && 
		   item.length && item.length > 0 && 
		   item.width && item.width > 0;
}

function createWOEForItems(frm, validItems) {
	let promises = [];
	let createdWOEs = [];
	
	validItems.forEach(function(item, index) {
		if (item.item_code && item.qty) {
			let promise = createSingleWOE(frm, item, index + 1);
			promises.push(promise);
		}
	});
	
	// Show progress
	frappe.show_progress(__('Creating Work Order Estimations'), promises.length, 0);
	
	Promise.all(promises).then(function(results) {
		results.forEach(function(result) {
			if (result.success) {
				createdWOEs.push(result.woe_name);
			}
		});
		
		frappe.hide_progress();
		
		if (createdWOEs.length > 0) {
			frappe.msgprint({
				title: __('Success'),
				message: __('Created {0} Work Order Estimation(s): {1}', [
					createdWOEs.length, 
					createdWOEs.join(', ')
				]),
				indicator: 'green'
			});
			
			// Refresh the form
			frm.refresh();
		}
	}).catch(function(error) {
		frappe.hide_progress();
		frappe.msgprint({
			title: __('Error'),
			message: __('Error creating Work Order Estimations: {0}', [error.message || error]),
			indicator: 'red'
		});
	});
}

function createSingleWOE(frm, item, index) {
	return new Promise(function(resolve, reject) {
		// Get item details first
		frappe.call({
			method: 'frappe.client.get',
			args: {
				doctype: 'Item',
				name: item.item_code
			},
			callback: function(r) {
				if (r.exc) {
					reject(r.exc);
					return;
				}
				
				let itemDoc = r.message;
				let woeData = {
					doctype: 'Work Order Estimation',
					client_name: frm.doc.party_name,
					project_name: frm.doc.title || frm.doc.party_name,
					delivery_date: frm.doc.valid_till || frappe.datetime.add_days(frappe.datetime.get_today(), 30),
					urgency_level: 'Medium',
					sales_price: item.amount || 0,
					quantity: item.qty,
					gsm: item.gsm || itemDoc.gsm || 0,
					length_cm: item.length || itemDoc.length || 0,
					width_cm: item.width || itemDoc.width || 0,
					finish: 'Uncoated',
					waste_percentage: 10,
					paper_type: item.item_code,
					rate_per_kg: item.rate || 0,
					quotation_reference: frm.doc.name,
					status: 'From Quotation'
				};
				
				// Create the WOE
				frappe.call({
					method: 'frappe.client.insert',
					args: {
						doc: woeData
					},
					callback: function(r) {
						if (r.exc) {
							reject(r.exc);
						} else {
							resolve({
								success: true,
								woe_name: r.message.name
							});
						}
					}
				});
			}
		});
	});
}

// Add custom field validation for quotation items
frappe.ui.form.on("Quotation Item", {
	gsm: function(frm, cdt, cdn) {
		let item = locals[cdt][cdn];
		if (item.gsm && item.gsm <= 0) {
			frappe.msgprint(__('GSM must be greater than 0'));
			frappe.model.set_value(cdt, cdn, 'gsm', '');
		}
	},
	
	length: function(frm, cdt, cdn) {
		let item = locals[cdt][cdn];
		if (item.length && item.length <= 0) {
			frappe.msgprint(__('Length must be greater than 0'));
			frappe.model.set_value(cdt, cdn, 'length', '');
		}
	},
	
	width: function(frm, cdt, cdn) {
		let item = locals[cdt][cdn];
		if (item.width && item.width <= 0) {
			frappe.msgprint(__('Width must be greater than 0'));
			frappe.model.set_value(cdt, cdn, 'width', '');
		}
	}
});