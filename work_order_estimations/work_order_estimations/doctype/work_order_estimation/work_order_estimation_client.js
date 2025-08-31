// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Order Estimation', {
    setup: function(frm) {
        // Set field properties for better UX
        frm.set_df_property('quantity', 'description', 'Enter the number of pieces to be produced');
        frm.set_df_property('gsm', 'description', 'Grams per square meter - paper weight');
        frm.set_df_property('length_cm', 'description', 'Length in centimeters');
        frm.set_df_property('width_cm', 'description', 'Width in centimeters');
        frm.set_df_property('waste_percentage', 'description', 'Expected waste percentage (e.g., 10 for 10%)');
        frm.set_df_property('rate_per_kg', 'description', 'Cost per kilogram of paper');
        frm.set_df_property('profit_margin', 'description', 'Profit margin percentage (e.g., 25 for 25%)');
    },

    validate: function(frm) {
        // Simple client-side validations
        const errors = [];
        
        if (frm.doc.quantity && frm.doc.quantity <= 0) {
            errors.push('Quantity must be greater than 0');
        }
        
        if (frm.doc.gsm && frm.doc.gsm <= 0) {
            errors.push('GSM must be greater than 0');
        }
        
        if (frm.doc.length_cm && frm.doc.length_cm <= 0) {
            errors.push('Length must be greater than 0');
        }
        
        if (frm.doc.width_cm && frm.doc.width_cm <= 0) {
            errors.push('Width must be greater than 0');
        }
        
        if (frm.doc.waste_percentage && (frm.doc.waste_percentage < 0 || frm.doc.waste_percentage > 100)) {
            errors.push('Waste percentage must be between 0 and 100');
        }
        
        if (frm.doc.profit_margin && (frm.doc.profit_margin < 0 || frm.doc.profit_margin > 100)) {
            errors.push('Profit margin must be between 0 and 100');
        }
        
        if (errors.length > 0) {
            frappe.throw(errors.join('<br>'));
            return false;
        }
    }
});

// Add field formatting for better readability
frappe.ui.form.on('Work Order Estimation', {
    after_save: function(frm) {
        // Format numeric fields for display
        formatNumericFields(frm);
    }
});

function formatNumericFields(frm) {
    // Format weight fields to 4 decimal places
    const weightFields = ['weight_per_piece_kg', 'net_weight_kg', 'waste_kg', 'total_weight_kg'];
    weightFields.forEach(field => {
        if (frm.doc[field]) {
            frm.set_value(field, parseFloat(frm.doc[field]).toFixed(4));
        }
    });
    
    // Format cost fields to 2 decimal places
    const costFields = ['cost_per_piece', 'total_paper_cost', 'cost_per_unit', 'total_cost', 'margin_amount'];
    costFields.forEach(field => {
        if (frm.doc[field]) {
            frm.set_value(field, parseFloat(frm.doc[field]).toFixed(2));
        }
    });
    
    // Format pieces per kg to 2 decimal places
    if (frm.doc.pieces_per_kg) {
        frm.set_value('pieces_per_kg', parseFloat(frm.doc.pieces_per_kg).toFixed(2));
    }
}
