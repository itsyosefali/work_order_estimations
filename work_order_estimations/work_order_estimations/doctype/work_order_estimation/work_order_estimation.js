// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Order Estimation', {
    refresh: function(frm) {
        // Show/hide the create addons button based on estimation items
        toggle_create_addons_button(frm);
        
        // Add click handler for the create addons button in Actions group
        if (frm.doc.estimation_items && frm.doc.estimation_items.length > 0) {
            frm.add_custom_button(__('Create Estimation Item Addons'), function() {
                show_addon_dialog(frm);
            }, __('Actions'));
        }
        
        // Add "Add Item" button to Actions group
        frm.add_custom_button(__('Add Item'), function() {
            show_add_item_dialog(frm);
        }, __('Actions'));
        
        // Add "Estimation Done" button if status is Draft
        if (frm.doc.status === 'Draft') {
            frm.add_custom_button(__('Mark as Estimation Done'), function() {
                mark_estimation_done(frm);
            }, __('Actions'));
        }
        
        // Add "Convert to Quotation" button if status is Estimation Done
        if (frm.doc.status === 'Estimation Done' && !frm.doc.quotation_reference) {
            frm.add_custom_button(__('Convert to Quotation'), function() {
                convert_to_quotation(frm);
            }, __('Actions'));
        }
        
        // Add "View Quotation" button if quotation is created
        if (frm.doc.quotation_reference) {
            frm.add_custom_button(__('View Quotation'), function() {
                frappe.set_route('Form', 'Quotation', frm.doc.quotation_reference);
            }, __('View'));
        }
    },
    
    estimation_items: function(frm) {
        // Toggle button visibility when estimation items change
        toggle_create_addons_button(frm);
    }
});

function toggle_create_addons_button(frm) {
    // Show button only if there are estimation items
    const has_items = frm.doc.estimation_items && frm.doc.estimation_items.length > 0;
    
    // Update button visibility (this will be handled by the custom button in refresh)
    if (has_items) {
        frm.set_df_property('create_addons_button', 'hidden', 0);
    } else {
        frm.set_df_property('create_addons_button', 'hidden', 1);
    }
}

function show_addon_dialog(frm) {
    // Get unique items from estimation items for the dropdown
    const estimation_items = frm.doc.estimation_items || [];
    const unique_items = [...new Set(estimation_items.map(item => item.item))];
    
    let dialog = new frappe.ui.Dialog({
        title: __('Create Estimation Item Addon'),
        fields: [
            {
                label: __('Item'),
                fieldname: 'item',
                fieldtype: 'Link',
                options: 'Item',
                reqd: 1,
                get_query: function() {
                    return {
                        filters: {
                            'name': ['in', unique_items]
                        }
                    };
                }
            },
            {
                label: __('Addon Type'),
                fieldname: 'addon_type',
                fieldtype: 'Select',
                options: 'Wrapper\nColor\nHandle\nAdd-on',
                reqd: 1,
                change: function() {
                    toggle_addon_fields(dialog);
                }
            },
            {
                label: __('Wrapper Item'),
                fieldname: 'wrapper_item',
                fieldtype: 'Link',
                options: 'Item',
                depends_on: 'eval:doc.addon_type=="Wrapper"'
            },
            {
                label: __('Color'),
                fieldname: 'color_item',
                fieldtype: 'Link',
                options: 'Color',
                depends_on: 'eval:doc.addon_type=="Color"'
            },
            {
                label: __('Handle Item'),
                fieldname: 'handle_item',
                fieldtype: 'Link',
                options: 'Item',
                depends_on: 'eval:doc.addon_type=="Handle"'
            },
            {
                label: __('Add-on Item'),
                fieldname: 'addon_item',
                fieldtype: 'Link',
                options: 'Item',
                depends_on: 'eval:doc.addon_type=="Add-on"'
            }
        ],
        primary_action_label: __('Add Addon'),
        primary_action: function(values) {
            if (validate_addon_data(values)) {
                create_addon(frm, values);
                dialog.hide();
            }
        }
    });
    
    dialog.show();
}

function toggle_addon_fields(dialog) {
    const addon_type = dialog.get_value('addon_type');
    
    // Hide all conditional fields first
    dialog.fields_dict.wrapper_item.df.depends_on = 'eval:false';
    dialog.fields_dict.color_item.df.depends_on = 'eval:false';
    dialog.fields_dict.handle_item.df.depends_on = 'eval:false';
    dialog.fields_dict.addon_item.df.depends_on = 'eval:false';
    
    // Show the appropriate field based on addon type
    if (addon_type === 'Wrapper') {
        dialog.fields_dict.wrapper_item.df.depends_on = 'eval:true';
    } else if (addon_type === 'Color') {
        dialog.fields_dict.color_item.df.depends_on = 'eval:true';
    } else if (addon_type === 'Handle') {
        dialog.fields_dict.handle_item.df.depends_on = 'eval:true';
    } else if (addon_type === 'Add-on') {
        dialog.fields_dict.addon_item.df.depends_on = 'eval:true';
    }
    
    dialog.refresh_fields();
}

function validate_addon_data(values) {
    if (!values.item) {
        frappe.msgprint(__('Please select an item'));
        return false;
    }
    
    if (!values.addon_type) {
        frappe.msgprint(__('Please select an addon type'));
        return false;
    }
    
    // Validate based on addon type
    if (values.addon_type === 'Wrapper' && !values.wrapper_item) {
        frappe.msgprint(__('Please select a wrapper item'));
        return false;
    } else if (values.addon_type === 'Color' && !values.color_item) {
        frappe.msgprint(__('Please select a color'));
        return false;
    } else if (values.addon_type === 'Handle' && !values.handle_item) {
        frappe.msgprint(__('Please select a handle item'));
        return false;
    } else if (values.addon_type === 'Add-on' && !values.addon_item) {
        frappe.msgprint(__('Please select an add-on item'));
        return false;
    }
    
    return true;
}

function show_add_item_dialog(frm) {
    let dialog = new frappe.ui.Dialog({
        title: __('Add Estimation Item'),
        fields: [
            {
                label: __('Item'),
                fieldname: 'item',
                fieldtype: 'Link',
                options: 'Item',
                reqd: 1
            },
            {
                label: __('Paper Type'),
                fieldname: 'paper_type',
                fieldtype: 'Link',
                options: 'Item',
                reqd: 1
            },
            {
                label: __('Quantity (Pieces)'),
                fieldname: 'quantity',
                fieldtype: 'Int',
                reqd: 1
            },
            {
                label: __('GSM'),
                fieldname: 'gsm',
                fieldtype: 'Int',
                reqd: 1
            },
            {
                label: __('Length (cm)'),
                fieldname: 'length_cm',
                fieldtype: 'Float',
                reqd: 1
            },
            {
                label: __('Width (cm)'),
                fieldname: 'width_cm',
                fieldtype: 'Float',
                reqd: 1
            },
            {
                label: __('Rate per KG'),
                fieldname: 'rate_per_kg',
                fieldtype: 'Currency',
                reqd: 1
            },
            {
                label: __('Finish'),
                fieldname: 'finish',
                fieldtype: 'Select',
                options: 'Matte\nGlossy\nSatin\nUncoated'
            },
            {
                label: __('Waste Percentage (%)'),
                fieldname: 'waste_percentage',
                fieldtype: 'Percent',
                default: 5
            }
        ],
        primary_action_label: __('Add Item'),
        primary_action: function(values) {
            add_estimation_item(frm, values);
            dialog.hide();
        }
    });
    
    dialog.show();
}

function add_estimation_item(frm, values) {
    frappe.call({
        method: 'add_estimation_item',
        doc: frm.doc,
        args: {
            item_data: values
        },
        callback: function(r) {
            if (r.message && r.message.status === 'success') {
                frappe.msgprint(__('Item added successfully'));
                frm.reload_doc();
            } else {
                frappe.msgprint(__('Error adding item: {0}').format(r.message.message || 'Unknown error'));
            }
        }
    });
}

function create_addon(frm, values) {
    frappe.call({
        method: 'create_estimation_item_addons',
        doc: frm.doc,
        args: {
            addon_data: values
        },
        callback: function(r) {
            if (r.message && r.message.status === 'success') {
                frappe.msgprint(__('Addon added successfully'));
                frm.reload_doc();
            } else {
                frappe.msgprint(__('Error adding addon: {0}').format(r.message.message || 'Unknown error'));
            }
        }
    });
}

function mark_estimation_done(frm) {
    frappe.confirm(
        __('Are you sure you want to mark this estimation as done?'),
        function() {
            frappe.call({
                method: 'mark_estimation_done',
                doc: frm.doc,
                callback: function(r) {
                    if (r.message && r.message.status === 'success') {
                        frappe.msgprint(__('Estimation marked as done successfully'));
                        frm.reload_doc();
                    } else {
                        frappe.msgprint(__('Error marking estimation as done: {0}').format(r.message.message || 'Unknown error'));
                    }
                }
            });
        }
    );
}

function convert_to_quotation(frm) {
    frappe.confirm(
        __('Are you sure you want to convert this estimation to a quotation?'),
        function() {
            frappe.call({
                method: 'create_quotation',
                doc: frm.doc,
                callback: function(r) {
                    if (r) {
                        frappe.msgprint(__('Quotation {0} created successfully!').format(r.message));
                        frm.reload_doc();
                        // Open the created quotation
                        frappe.set_route('Form', 'Quotation', r.message);
                    }
                },
                error: function(r) {
                    frappe.msgprint(__('Error creating quotation'));
                }
            });
        }
    );
}