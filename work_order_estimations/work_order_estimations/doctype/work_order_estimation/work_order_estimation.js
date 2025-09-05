// Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Order Estimation', {
    refresh: function(frm) {
        // Add all action buttons
        addActionButtons(frm);
        
        // Add custom dashboard
        addCustomDashboard(frm);
        
        // Add document flow tracking
        addDocumentFlowTracking(frm);
        
        if (frm.doc.estimation_processes && frm.doc.estimation_processes.length > 0) {
            setTimeout(() => {
                calculateAllProcessTotals(frm);
                recalculateOperationsCost(frm);
            }, 1000);
        }
        
        setInterval(() => {
            updateDashboard(frm);
        }, 3000);
        
        // Make fields read-only when status is "Estimation Done"
        setFieldsReadOnly(frm);
    },
    
    client_name: function(frm) {
        // Auto-fetch client details if needed
        if (frm.doc.client_name) {
            updateDashboard(frm);
        }
    },
    
    profit_margin: function(frm) {
        // Refresh calculations when margin changes
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    estimation_processes_add: function(frm, cdt, cdn) {
        // Recalculate operations cost when processes are added
        setTimeout(() => {
            recalculateOperationsCost(frm);
        }, 500);
    },
    
    estimation_processes_remove: function(frm, cdt, cdn) {
        // Recalculate operations cost when processes are removed
        setTimeout(() => {
            recalculateOperationsCost(frm);
        }, 500);
    },
    
    estimation_processes: function(frm) {
        // Recalculate operations cost when estimation processes change
        setTimeout(() => {
            calculateAllProcessTotals(frm);
            recalculateOperationsCost(frm);
        }, 500);
    },

    estimation_items_add: function(frm, cdt, cdn) {
        // Refresh calculations when items are added
        setTimeout(() => {
            frm.reload_doc();
        }, 500);
    },

    estimation_items_remove: function(frm, cdt, cdn) {
        // Refresh calculations when items are removed
        setTimeout(() => {
            frm.reload_doc();
        }, 500);
    }
});

// Handle changes in estimation process child table
frappe.ui.form.on("Estimation Process", {
    total_cost: function(frm, cdt, cdn) {
        // Recalculate operations cost when process total_cost changes
        setTimeout(() => {
            recalculateOperationsCost(frm);
        }, 500);
    },
    
    rate: function(frm, cdt, cdn) {
        // Calculate total_cost for this row and recalculate operations cost
        calculateProcessTotalCost(frm, cdt, cdn);
        setTimeout(() => {
            recalculateOperationsCost(frm);
        }, 500);
    },
    
    qty: function(frm, cdt, cdn) {
        // Calculate total_cost for this row and recalculate operations cost
        calculateProcessTotalCost(frm, cdt, cdn);
        setTimeout(() => {
            recalculateOperationsCost(frm);
        }, 500);
    }
});

// Handle changes in estimation items child table
frappe.ui.form.on("Work Order Estimation Item", {
    item: function(frm, cdt, cdn) {
        // Auto-fetch item details if needed
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    paper_type: function(frm, cdt, cdn) {
        // Auto-fetch paper type details if needed
        let row = locals[cdt][cdn];
        if (row.paper_type) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Item',
                    fieldname: 'valuation_rate',
                    filters: {'name': row.paper_type}
                },
                callback: function(r) {
                    if (r.message && r.message.valuation_rate) {
                        frappe.model.set_value(cdt, cdn, 'rate_per_kg', r.message.valuation_rate);
                        calculateItemMetrics(frm, cdt, cdn);
                    }
                }
            });
        }
    },
    
    quantity: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    gsm: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    length_cm: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    width_cm: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    rate_per_kg: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    },
    
    waste_percentage: function(frm, cdt, cdn) {
        calculateItemMetrics(frm, cdt, cdn);
    }
});

function addActionButtons(frm) {
    // Clear existing buttons
    frm.page.clear_actions();
    
    // Add Estimation Item Dialog button
    frm.add_custom_button(__('➕ Add Estimation Item'), function() {
        showAddEstimationItemDialog(frm);
    }, __('Items'));
    
    // Refresh Calculations button (always visible)
    frm.add_custom_button(__('🔄 Refresh Calculations'), function() {
        frm.reload_doc();
        frappe.msgprint(__('Calculations refreshed successfully!'));
    }, __('Actions'));
    
    // Calculation buttons in Breakdown section
    if (frm.doc.estimation_processes && frm.doc.estimation_processes.length > 0) {
        frm.add_custom_button(__('🔄 Recalculate Operations Cost'), function() {
            calculateAllProcessTotals(frm);
            recalculateOperationsCost(frm);
            frappe.msgprint(__('Operations cost recalculated successfully!'));
        }, __('Breakdown'));
        
        // Manual Calculate All Process Totals button
        frm.add_custom_button(__('🧮 Calculate All Process Totals'), function() {
            calculateAllProcessTotals(frm);
            recalculateOperationsCost(frm);
            frappe.msgprint(__('All process totals calculated and operations cost updated!'));
        }, __('Breakdown'));
    }
    
    // Complete Estimation button (for Draft status)
    if (frm.doc.status === 'Draft') {
        frm.add_custom_button(__('✅ Complete Estimation'), function() {
            frappe.confirm(
                __('Are you sure you want to mark this estimation as done? This will make all fields read-only.'),
                function() {
                    frm.set_value('status', 'Estimation Done');
                    frm.save().then(() => {
                        frappe.msgprint(__('Estimation completed successfully!'));
                        frm.reload_doc();
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Create Quotation button (only for Estimation Done status)
    if (frm.doc.status === 'Estimation Done') {
        frm.add_custom_button(__('📋 Create Quotation'), function() {
            frappe.confirm(
                __('Are you sure you want to create a quotation from this estimation?'),
                function() {
                    frappe.call({
                        method: 'create_quotation',
                        doc: frm.doc,
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(__('Quotation {0} created successfully!').format(r.message));
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Reset to Draft button (for Estimation Done status)
    if (frm.doc.status === 'Estimation Done' && !frm.doc.quotation_reference) {
        frm.add_custom_button(__('🔄 Reset to Draft'), function() {
            frappe.confirm(
                __('Are you sure you want to reset this estimation to draft? This will make fields editable again.'),
                function() {
                    frm.set_value('status', 'Draft');
                    frm.save().then(() => {
                        frappe.msgprint(__('Estimation reset to draft successfully!'));
                        frm.reload_doc();
                    });
                }
            );
        }, __('Actions'));
    }
}

function showAddEstimationItemDialog(frm) {
    let dialog = new frappe.ui.Dialog({
        title: __('Add Estimation Item'),
        fields: [
            {
                label: __('Item'),
                fieldname: 'item',
                fieldtype: 'Link',
                options: 'Item',
                reqd: 1,
                description: __('Select the item to be produced')
            },
            {
                fieldtype: 'Column Break'
            },
            {
                label: __('Paper Type'),
                fieldname: 'paper_type',
                fieldtype: 'Link',
                options: 'Item',
                reqd: 1,
                description: __('Select paper type from Item Master')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Quantity (Pieces)'),
                fieldname: 'quantity',
                fieldtype: 'Int',
                reqd: 1,
                default: 1000,
                description: __('Number of pieces to be produced')
            },
            {
                fieldtype: 'Column Break'
            },
            {
                label: __('GSM (Grams per Square Meter)'),
                fieldname: 'gsm',
                fieldtype: 'Int',
                reqd: 1,
                default: 80,
                description: __('Paper weight in grams per square meter')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Length (cm)'),
                fieldname: 'length_cm',
                fieldtype: 'Float',
                reqd: 1,
                default: 21.0,
                description: __('Length of paper in centimeters')
            },
            {
                fieldtype: 'Column Break'
            },
            {
                label: __('Width (cm)'),
                fieldname: 'width_cm',
                fieldtype: 'Float',
                reqd: 1,
                default: 29.7,
                description: __('Width of paper in centimeters')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Rate per KG'),
                fieldname: 'rate_per_kg',
                fieldtype: 'Currency',
                reqd: 1,
                description: __('Cost per kilogram of paper')
            },
            {
                fieldtype: 'Column Break'
            },
            {
                label: __('Finish'),
                fieldname: 'finish',
                fieldtype: 'Select',
                options: 'Matte\nGlossy\nSatin\nUncoated',
                default: 'Uncoated',
                description: __('Type of finish applied to paper')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Waste Percentage (%)'),
                fieldname: 'waste_percentage',
                fieldtype: 'Percent',
                default: 5,
                description: __('Percentage of paper waste during production')
            }
        ],
        primary_action_label: __('Add Item'),
        primary_action(values) {
            // Validate required fields
            if (!values.item || !values.paper_type || !values.quantity || !values.gsm || 
                !values.length_cm || !values.width_cm || !values.rate_per_kg) {
                frappe.msgprint(__('Please fill all required fields'));
                return;
            }
            
            // Add item to child table
            frappe.call({
                method: 'add_estimation_item',
                doc: frm.doc,
                args: {
                    item_data: values
                },
                callback: function(r) {
                    if (r.message && r.message.status === 'success') {
                        frappe.msgprint(r.message.message);
                        frm.reload_doc();
                        dialog.hide();
                    } else if (r.message && r.message.status === 'error') {
                        frappe.msgprint(r.message.message);
                    }
                }
            });
        }
    });
    
    // Auto-fetch rate when paper type is selected
    dialog.fields_dict.paper_type.df.onchange = function() {
        let paper_type = dialog.get_value('paper_type');
        if (paper_type) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Item',
                    fieldname: 'valuation_rate',
                    filters: {'name': paper_type}
                },
                callback: function(r) {
                    if (r.message && r.message.valuation_rate) {
                        dialog.set_value('rate_per_kg', r.message.valuation_rate);
                    }
                }
            });
        }
    };
    
    dialog.show();
}

function addCustomDashboard(frm) {
    // Add custom dashboard section
    let totalItems = frm.doc.estimation_items ? frm.doc.estimation_items.length : 0;
    let dashboard_html = `
        <div class="work-order-estimation-dashboard">
            <div class="dashboard-header">
                <h3>📊 Estimation Dashboard</h3>
                <div class="status-badge status-${frm.doc.status ? frm.doc.status.toLowerCase().replace(/\s+/g, '-') : 'draft'}">
                    ${frm.doc.status || 'Draft'}
                </div>
            </div>
            
            <div class="dashboard-stats">
                <div class="stat-item">
                    <div class="stat-label">Items</div>
                    <div class="stat-value" id="dashboard-items">${totalItems}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Paper Cost</div>
                    <div class="stat-value" id="dashboard-paper-cost">${frm.doc.total_paper_cost ? format_currency(frm.doc.total_paper_cost) : '0'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Cost</div>
                    <div class="stat-value" id="dashboard-cost">${frm.doc.total_cost ? format_currency(frm.doc.total_cost) : '0'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Profit Margin</div>
                    <div class="stat-value" id="dashboard-margin">${frm.doc.profit_margin || 25}%</div>
                </div>
            </div>
            
            <div class="cost-breakdown" id="cost-breakdown-section" style="display: ${((frm.doc.total_paper_cost || 0) + (frm.doc.total_cost_for_operations || 0)) > 0 ? 'block' : 'none'};">
                <h4>💰 Cost Analysis</h4>
                <div class="cost-item">
                    <span>Paper Cost:</span>
                    <span id="paper-cost-display">${frm.doc.total_paper_cost ? format_currency(frm.doc.total_paper_cost) : '0'}</span>
                </div>
                <div class="cost-item">
                    <span>Operations Cost:</span>
                    <span id="operations-cost-display">${frm.doc.total_cost_for_operations ? format_currency(frm.doc.total_cost_for_operations) : '0'}</span>
                </div>
                <div class="cost-item subtotal">
                    <span>Subtotal:</span>
                    <span id="subtotal-display">${format_currency((frm.doc.total_paper_cost || 0) + (frm.doc.total_cost_for_operations || 0))}</span>
                </div>
                <div class="cost-item">
                    <span>Profit Margin (${frm.doc.profit_margin || 25}%):</span>
                    <span id="margin-display">${frm.doc.margin_amount ? format_currency(frm.doc.margin_amount) : '0'}</span>
                </div>
                <div class="cost-item total">
                    <span>Total with Margin:</span>
                    <span id="total-with-margin-display">${format_currency((frm.doc.total_cost || 0) + (frm.doc.margin_amount || 0))}</span>
                </div>
            </div>
        </div>
        
        <style>
        .work-order-estimation-dashboard {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .dashboard-header h3 {
            margin: 0;
            color: #495057;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-draft { background: #6c757d; color: white; }
        .status-estimation-done { background: #007bff; color: white; }
        .status-quotation-created { background: #28a745; color: white; }
        .status-cancelled { background: #dc3545; color: white; }
        
        .dashboard-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #212529;
        }
        
        .cost-breakdown {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        .cost-breakdown h4 {
            margin: 0 0 15px 0;
            color: #495057;
        }
        .cost-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f4;
        }
        .cost-item.subtotal {
            border-top: 1px solid #28a745;
            font-weight: 600;
            color: #495057;
        }
        .cost-item.total {
            border-top: 2px solid #28a745;
            border-bottom: none;
            font-weight: 700;
            color: #28a745;
        }
        </style>
    `;
    
    // Add dashboard to the form
    if (!frm.get_field('custom_dashboard')) {
        frm.add_custom_html(dashboard_html);
    }
    
    // Update dashboard values
    updateDashboard(frm);
}

function addDocumentFlowTracking(frm) {
    // Add document flow tracking section
    let flow_html = `
        <div class="document-flow-tracking">
            <h4>📋 Document Flow</h4>
            <div class="flow-items">
                <div class="flow-item ${frm.doc.status === 'Draft' ? 'active' : ''}">
                    <div class="flow-icon">📝</div>
                    <div class="flow-text">Draft</div>
                </div>
                <div class="flow-item ${frm.doc.status === 'Estimation Done' ? 'active' : ''}">
                    <div class="flow-icon">✅</div>
                    <div class="flow-text">Estimation Done</div>
                </div>
                <div class="flow-item ${frm.doc.status === 'Quotation Created' ? 'active' : ''}">
                    <div class="flow-icon">📋</div>
                    <div class="flow-text">Quotation Created</div>
                    ${frm.doc.quotation_reference ? `<div class="flow-ref">${frm.doc.quotation_reference}</div>` : ''}
                </div>
            </div>
        </div>
        
        <style>
        .document-flow-tracking {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .document-flow-tracking h4 {
            margin: 0 0 20px 0;
            color: #495057;
        }
        .flow-items {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        .flow-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            border-radius: 6px;
            background: white;
            border: 2px solid #e9ecef;
            min-width: 120px;
            text-align: center;
        }
        .flow-item.active {
            border-color: #28a745;
            background: #d4edda;
        }
        .flow-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .flow-text {
            font-size: 12px;
            color: #495057;
            text-align: center;
            line-height: 1.2;
        }
        .flow-ref {
            font-size: 10px;
            color: #28a745;
            font-weight: 600;
            margin-top: 5px;
        }
        </style>
    `;
    
    // Add flow tracking to the form
    if (!frm.get_field('custom_dashboard')) {
        frm.add_custom_html(flow_html);
    }
}

function updateDashboard(frm) {
    try {
        let totalItems = frm.doc.estimation_items ? frm.doc.estimation_items.length : 0;
        
        // Update dashboard values
        if (document.getElementById('dashboard-items')) {
            document.getElementById('dashboard-items').textContent = totalItems;
        }
        if (document.getElementById('dashboard-paper-cost')) {
            document.getElementById('dashboard-paper-cost').textContent = 
                frm.doc.total_paper_cost ? format_currency(frm.doc.total_paper_cost) : '0';
        }
        if (document.getElementById('dashboard-cost')) {
            document.getElementById('dashboard-cost').textContent = 
                frm.doc.total_cost ? format_currency(frm.doc.total_cost) : '0';
        }
        if (document.getElementById('dashboard-margin')) {
            document.getElementById('dashboard-margin').textContent = (frm.doc.profit_margin || 25) + '%';
        }
        
        // Update cost breakdown
        if (document.getElementById('cost-breakdown-section')) {
            let paperCost = frm.doc.total_paper_cost || 0;
            let operationsCost = frm.doc.total_cost_for_operations || 0;
            let subtotal = paperCost + operationsCost;
            let marginAmount = frm.doc.margin_amount || 0;
            let totalWithMargin = subtotal + marginAmount;
            
            if (subtotal > 0) {
                document.getElementById('cost-breakdown-section').style.display = 'block';
                document.getElementById('paper-cost-display').textContent = format_currency(paperCost);
                document.getElementById('operations-cost-display').textContent = format_currency(operationsCost);
                document.getElementById('subtotal-display').textContent = format_currency(subtotal);
                document.getElementById('margin-display').textContent = format_currency(marginAmount);
                document.getElementById('total-with-margin-display').textContent = format_currency(totalWithMargin);
            } else {
                document.getElementById('cost-breakdown-section').style.display = 'none';
            }
        }
        
        // Update status badges
        let statusElements = document.querySelectorAll('.status-badge');
        statusElements.forEach(function(element) {
            element.className = 'status-badge status-' + (frm.doc.status ? frm.doc.status.toLowerCase().replace(/\s+/g, '-') : 'draft');
            element.textContent = frm.doc.status || 'Draft';
        });
        
    } catch (error) {
        console.log('Dashboard update error:', error);
    }
}

function calculateProcessTotalCost(frm, cdt, cdn) {
    // Calculate total_cost for a specific estimation process row
    let row = locals[cdt][cdn];
    if (row.rate && row.qty) {
        let total_cost = parseFloat(row.rate) * parseFloat(row.qty);
        frappe.model.set_value(cdt, cdn, 'total_cost', total_cost);
    }
}

function calculateAllProcessTotals(frm) {
    // Calculate total_cost for all estimation process rows
    if (frm.doc.estimation_processes) {
        frm.doc.estimation_processes.forEach(function(process, index) {
            if (process.rate && process.qty) {
                let total_cost = parseFloat(process.rate) * parseFloat(process.qty);
                frappe.model.set_value('Estimation Process', process.name, 'total_cost', total_cost);
            }
        });
    }
}

function recalculateOperationsCost(frm) {
    // Recalculate operations cost from estimation processes
    let totalOperationsCost = 0;
    
    if (frm.doc.estimation_processes) {
        frm.doc.estimation_processes.forEach(function(process) {
            if (process.total_cost) {
                totalOperationsCost += parseFloat(process.total_cost) || 0;
            }
        });
    }
    
    // Update the total_cost_for_operations field
    frm.set_value('total_cost_for_operations', totalOperationsCost);
    
    // Update total cost (paper + operations)
    let totalPaperCost = parseFloat(frm.doc.total_paper_cost) || 0;
    let totalCost = totalPaperCost + totalOperationsCost;
    
    frm.set_value('total_cost', totalCost);
    
    // Calculate total quantity from all items
    let totalQuantity = 0;
    if (frm.doc.estimation_items) {
        frm.doc.estimation_items.forEach(function(item) {
            if (item.quantity) {
                totalQuantity += parseFloat(item.quantity) || 0;
            }
        });
    }
    
    // Update cost per unit
    if (totalQuantity > 0) {
        frm.set_value('cost_per_unit', totalCost / totalQuantity);
    }
    
    // Refresh fields
    frm.refresh_field('total_cost_for_operations');
    frm.refresh_field('total_cost');
    frm.refresh_field('cost_per_unit');
    
    // Update dashboard after cost recalculation
    updateDashboard(frm);
}

function calculateItemMetrics(frm, cdt, cdn) {
    // Calculate paper metrics for a specific estimation item row
    let row = locals[cdt][cdn];
    
    if (!row.gsm || !row.length_cm || !row.width_cm || !row.quantity) {
        return;
    }
    
    // Calculate weight per piece (GSM * length * width / 10000) / 1000
    let area_sqm = (row.length_cm * row.width_cm) / 10000;  // Convert cm² to m²
    let weight_per_piece_kg = (row.gsm * area_sqm) / 1000;  // Convert grams to kg
    
    frappe.model.set_value(cdt, cdn, 'weight_per_piece_kg', weight_per_piece_kg);
    
    // Calculate pieces per kg
    if (weight_per_piece_kg > 0) {
        frappe.model.set_value(cdt, cdn, 'pieces_per_kg', 1 / weight_per_piece_kg);
    }
    
    // Calculate net weight needed
    let net_weight_kg = weight_per_piece_kg * row.quantity;
    frappe.model.set_value(cdt, cdn, 'net_weight_kg', net_weight_kg);
    
    // Calculate waste weight
    let waste_percentage = row.waste_percentage || 0;
    let waste_kg = net_weight_kg * (waste_percentage / 100);
    frappe.model.set_value(cdt, cdn, 'waste_kg', waste_kg);
    
    // Calculate total weight including waste
    let total_weight_kg = net_weight_kg + waste_kg;
    frappe.model.set_value(cdt, cdn, 'total_weight_kg', total_weight_kg);
    
    // Calculate costs if rate is available
    if (row.rate_per_kg && weight_per_piece_kg && total_weight_kg) {
        // Calculate cost per piece
        let cost_per_piece = weight_per_piece_kg * row.rate_per_kg;
        frappe.model.set_value(cdt, cdn, 'cost_per_piece', cost_per_piece);
        
        // Calculate total paper cost
        let total_paper_cost = total_weight_kg * row.rate_per_kg;
        frappe.model.set_value(cdt, cdn, 'total_paper_cost', total_paper_cost);
    }
    
    // Refresh the form to update totals
    setTimeout(() => {
        frm.save();
    }, 1000);
}

function setFieldsReadOnly(frm) {
    // Make fields read-only when status is "Estimation Done" or "Quotation Created"
    let isReadOnly = (frm.doc.status === 'Estimation Done' || frm.doc.status === 'Quotation Created');
    
    if (isReadOnly) {
        // Make main fields read-only
        frm.set_df_property('client_name', 'read_only', 1);
        frm.set_df_property('project_name', 'read_only', 1);
        frm.set_df_property('delivery_date', 'read_only', 1);
        frm.set_df_property('urgency_level', 'read_only', 1);
        frm.set_df_property('sales_price', 'read_only', 1);
        frm.set_df_property('profit_margin', 'read_only', 1);
        frm.set_df_property('notes', 'read_only', 1);
        
        // Make child tables read-only
        frm.set_df_property('estimation_items', 'read_only', 1);
        frm.set_df_property('estimation_processes', 'read_only', 1);
        
        // Hide Add Item button when read-only
        frm.remove_custom_button('Add Estimation Item', 'Items');
        
    } else {
        // Make fields editable when status is Draft
        frm.set_df_property('client_name', 'read_only', 0);
        frm.set_df_property('project_name', 'read_only', 0);
        frm.set_df_property('delivery_date', 'read_only', 0);
        frm.set_df_property('urgency_level', 'read_only', 0);
        frm.set_df_property('sales_price', 'read_only', 0);
        frm.set_df_property('profit_margin', 'read_only', 0);
        frm.set_df_property('notes', 'read_only', 0);
        
        // Make child tables editable
        frm.set_df_property('estimation_items', 'read_only', 0);
        frm.set_df_property('estimation_processes', 'read_only', 0);
    }
}