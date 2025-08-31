// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Order Estimation', {
    refresh: function(frm) {
        frm.add_custom_button(__('Refresh Calculations'), function() {
            frappe.call({
                method: 'work_order_estimations.api.refresh_calculations',
                args: {
                    doctype: frm.doctype,
                    docname: frm.docname
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frm.reload_doc();
                    }
                }
            });
        }, __('Actions'));
        
        // Only show Convert to Quotation button for Sent status
        if (frm.doc.status === 'Sent') {
            frm.add_custom_button(__('Convert to Quotation'), function() {
                frappe.call({
                    method: 'work_order_estimations.api.convert_to_quotation',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.docname
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frappe.msgprint(__('Quotation {0} created successfully!').format(r.message.quotation_name));
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Actions'));
        }
        
        // Show Generate PDF Report for all statuses except Draft
        if (frm.doc.status && frm.doc.status !== 'Draft') {
            frm.add_custom_button(__('Generate PDF Report'), function() {
                frappe.show_alert(__('Generating PDF...'), 3);
                frappe.call({
                    method: 'work_order_estimations.api.generate_pdf_report',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.docname
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            window.open(r.message.pdf_url, '_blank');
                        }
                    },
                    error: function(r) {
                        frappe.msgprint(__('Error generating PDF: ') + (r.responseJSON ? r.responseJSON.message : 'Unknown error'));
                    }
                });
            }, __('Actions'));
        }
        
        // Add Submit button for Draft status
        if (frm.doc.status === 'Draft' && !frm.doc.docstatus) {
            frm.add_custom_button(__('Submit'), function() {
                frappe.call({
                    method: 'work_order_estimations.api.submit_estimation',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.docname
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Actions'));
        }
        
        // Add Cancel button for Draft status
        if (frm.doc.status === 'Draft' && !frm.doc.docstatus) {
            frm.add_custom_button(__('Cancel Estimation'), function() {
                frappe.call({
                    method: 'work_order_estimations.api.cancel_estimation',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.docname
                        },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Actions'));
        }
        
        // Add test button for debugging (remove in production)
        frm.add_custom_button(__('Test API'), function() {
            frappe.call({
                method: 'work_order_estimations.api.test_api_connection',
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(r.message.message);
                    }
                }
            });
        }, __('Debug'));
    },

    // Auto-calculate when key fields change
    quantity: function(frm) {
        if (frm.doc.quantity && frm.doc.gsm && frm.doc.length_cm && frm.doc.width_cm) {
            calculatePaperMetrics(frm);
        }
    },

    gsm: function(frm) {
        if (frm.doc.quantity && frm.doc.gsm && frm.doc.length_cm && frm.doc.width_cm) {
            calculatePaperMetrics(frm);
        }
    },

    length_cm: function(frm) {
        if (frm.doc.quantity && frm.doc.gsm && frm.doc.length_cm && frm.doc.width_cm) {
            calculatePaperMetrics(frm);
        }
    },

    width_cm: function(frm) {
        if (frm.doc.quantity && frm.doc.gsm && frm.doc.length_cm && frm.doc.width_cm) {
            calculatePaperMetrics(frm);
        }
    },

    waste_percentage: function(frm) {
        if (frm.doc.net_weight_kg) {
            calculateWaste(frm);
        }
    },

    rate_per_kg: function(frm) {
        if (frm.doc.total_weight_kg) {
            calculatePaperCosts(frm);
        }
    },

    profit_margin: function(frm) {
        if (frm.doc.total_cost) {
            calculateMargin(frm);
        }
    },
    
    // Refresh buttons when status changes
    status: function(frm) {
        // Refresh the form to update buttons based on new status
        setTimeout(() => {
            frm.refresh();
        }, 500);
    },
    

    

});

// Helper function to calculate paper metrics
function calculatePaperMetrics(frm) {
    const qty = parseFloat(frm.doc.quantity) || 0;
    const gsm = parseFloat(frm.doc.gsm) || 0;
    const length = parseFloat(frm.doc.length_cm) || 0;
    const width = parseFloat(frm.doc.width_cm) || 0;

    if (qty && gsm && length && width) {
        // Weight per piece in kg
        const weightPerPiece = (length * width * gsm) / 100000;
        frm.set_value('weight_per_piece_kg', weightPerPiece);

        // Pieces per kg
        const piecesPerKg = weightPerPiece > 0 ? 1 / weightPerPiece : 0;
        frm.set_value('pieces_per_kg', piecesPerKg);

        // Net weight for production
        const netWeight = weightPerPiece * qty;
        frm.set_value('net_weight_kg', netWeight);

        // Calculate waste if percentage exists
        if (frm.doc.waste_percentage) {
            calculateWaste(frm);
        }

        // Calculate paper costs if rate exists
        if (frm.doc.rate_per_kg) {
            calculatePaperCosts(frm);
        }
    }
}

// Helper function to calculate waste
function calculateWaste(frm) {
    const netWeight = parseFloat(frm.doc.net_weight_kg) || 0;
    const wastePct = parseFloat(frm.doc.waste_percentage) || 0;

    if (netWeight && wastePct) {
        const wasteKg = netWeight * (wastePct / 100);
        frm.set_value('waste_kg', wasteKg);

        // Total weight including waste
        const totalWeight = netWeight + wasteKg;
        frm.set_value('total_weight_kg', totalWeight);

        // Recalculate paper costs
        if (frm.doc.rate_per_kg) {
            calculatePaperCosts(frm);
        }
    }
}

// Helper function to calculate paper costs
function calculatePaperCosts(frm) {
    const totalWeight = parseFloat(frm.doc.total_weight_kg) || 0;
    const ratePerKg = parseFloat(frm.doc.rate_per_kg) || 0;
    const qty = parseFloat(frm.doc.quantity) || 0;

    if (totalWeight && ratePerKg) {
        const totalPaperCost = totalWeight * ratePerKg;
        frm.set_value('total_paper_cost', totalPaperCost);

        if (qty > 0) {
            const costPerPiece = totalPaperCost / qty;
            frm.set_value('cost_per_piece', costPerPiece);
        }

        // Calculate total cost including processes
        calculateTotalCost(frm);
    }
}

// Helper function to calculate total cost
function calculateTotalCost(frm) {
    const totalPaperCost = parseFloat(frm.doc.total_paper_cost) || 0;
    let totalProcessCost = 0;

    // Sum up process costs
    if (frm.doc.estimation_processes) {
        frm.doc.estimation_processes.forEach(process => {
            if (process.total_cost) {
                totalProcessCost += parseFloat(process.total_cost) || 0;
            }
        });
    }

    const totalCost = totalPaperCost + totalProcessCost;
    frm.set_value('total_cost', totalCost);

    // Calculate cost per unit
    const qty = parseFloat(frm.doc.quantity) || 0;
    if (qty > 0) {
        const costPerUnit = totalCost / qty;
        frm.set_value('cost_per_unit', costPerUnit);
    }

    // Calculate margin if exists
    if (frm.doc.profit_margin) {
        calculateMargin(frm);
    }
}

// Helper function to calculate margin
function calculateMargin(frm) {
    const totalCost = parseFloat(frm.doc.total_cost) || 0;
    const profitMargin = parseFloat(frm.doc.profit_margin) || 0;

    if (totalCost && profitMargin) {
        const marginAmount = totalCost * (profitMargin / 100);
        frm.set_value('margin_amount', marginAmount);
    }
}

// Handle estimation processes changes
frappe.ui.form.on('Estimation Process', {
    total_cost: function(frm, cdt, cdn) {
        calculateTotalCost(frm);
    }
});


