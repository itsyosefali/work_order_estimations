// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Estimation Process', {
    refresh: function(frm) {
        // Auto-calculate total cost when rate or quantity changes
        frm.add_custom_button(__('Calculate Cost'), function() {
            calculate_process_cost(frm);
        });
    },
    
    rate: function(frm, cdt, cdn) {
        calculate_process_cost(frm, cdt, cdn);
    },
    
    qty: function(frm, cdt, cdn) {
        calculate_process_cost(frm, cdt, cdn);
    }
});

function calculate_process_cost(frm, cdt, cdn) {
    if (cdt && cdn) {
        let row = locals[cdt][cdn];
        if (row.rate && row.qty) {
            row.total_cost = row.rate * row.qty;
            frm.refresh_field('estimation_processes');
        }
    }
}
