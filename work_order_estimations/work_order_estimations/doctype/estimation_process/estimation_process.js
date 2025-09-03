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
    },
    
    total_cost: function(frm, cdt, cdn) {
        // Update parent's total operations cost when total_cost changes
        update_parent_operations_cost(frm);
    }
});

// Handle child table row events
frappe.ui.form.on('Work Order Estimation', {
    estimation_processes_add: function(frm, cdt, cdn) {
        // Recalculate operations cost when processes are added
        setTimeout(() => {
            update_parent_operations_cost(frm);
        }, 500);
    },
    
    estimation_processes_remove: function(frm, cdt, cdn) {
        // Recalculate operations cost when processes are removed
        setTimeout(() => {
            update_parent_operations_cost(frm);
        }, 500);
    }
});

function calculate_total_cost(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.rate && row.qty) {
        let total_cost = flt(row.rate) * flt(row.qty);
        frappe.model.set_value(cdt, cdn, 'total_cost', total_cost);
        
        // Update parent's total operations cost
        update_parent_operations_cost(frm);
    }
}

function update_parent_operations_cost(frm) {
    let total_operations_cost = 0;
    
    if (frm.doc.estimation_processes) {
        frm.doc.estimation_processes.forEach(function(process) {
            if (process.total_cost) {
                total_operations_cost += flt(process.total_cost);
            }
        });
    }
    
    // Update the parent field
    frm.set_value('total_cost_for_operations', total_operations_cost);
    
    // Update total cost (paper + operations)
    let total_paper_cost = flt(frm.doc.total_paper_cost) || 0;
    let total_cost = total_paper_cost + total_operations_cost;
    frm.set_value('total_cost', total_cost);
    
    // Update cost per unit
    let quantity = flt(frm.doc.quantity) || 0;
    if (quantity > 0) {
        frm.set_value('cost_per_unit', total_cost / quantity);
    }
    
    // Refresh fields
    frm.refresh_field('total_cost_for_operations');
    frm.refresh_field('total_cost');
    frm.refresh_field('cost_per_unit');
}
