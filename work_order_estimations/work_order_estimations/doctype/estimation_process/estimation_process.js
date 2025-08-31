// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Estimation Process', {
    workstation: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.workstation) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Workstation',
                    filters: { name: row.workstation },
                    fieldname: 'workstation_type'
                },
                callback: function(r) {
                    if (r.message && r.message.workstation_type) {
                        frappe.model.set_value(cdt, cdn, 'workstation_type', r.message.workstation_type);
                    }
                }
            });
        }
    },
    
    rate: function(frm, cdt, cdn) {
        calculate_total_cost(frm, cdt, cdn);
    },
    
    qty: function(frm, cdt, cdn) {
        calculate_total_cost(frm, cdt, cdn);
    }
});

function calculate_total_cost(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.rate && row.qty) {
        let total_cost = flt(row.rate) * flt(row.qty);
        frappe.model.set_value(cdt, cdn, 'total_cost', total_cost);
    }
}
