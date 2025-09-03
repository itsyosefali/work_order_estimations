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
    },
    
    client_name: function(frm) {
        // Auto-fetch client details if needed
        if (frm.doc.client_name) {
            updateDashboard(frm);
        }
    },
    
    paper_type: function(frm) {
        // Auto-fetch rate from Item Master
        if (frm.doc.paper_type) {
            frappe.call({
                method: 'work_order_estimations.api.auto_fetch_rate_from_item',
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
        }
    },
    
    quantity: function(frm) {
        // Refresh calculations when quantity changes
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    gsm: function(frm) {
        // Refresh calculations when GSM changes
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    length_cm: function(frm) {
        // Refresh calculations when dimensions change
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    width_cm: function(frm) {
        // Refresh calculations when dimensions change
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    rate_per_kg: function(frm) {
        // Refresh calculations when rate changes
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    profit_margin: function(frm) {
        // Refresh calculations when margin changes
        setTimeout(() => {
            updateDashboard(frm);
        }, 500);
    },
    
    default_bom: function(frm) {
        // Handle BOM selection and update costs
        if (frm.doc.default_bom) {
            updateBOMDetails(frm);
        }
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

function addActionButtons(frm) {
    // Clear existing buttons
    frm.page.clear_actions();
    
    // Refresh Calculations button (always visible)
    frm.add_custom_button(__('🔄 Refresh Calculations'), function() {
        frappe.call({
            method: 'work_order_estimations.api.refresh_calculations',
            args: {
                doctype: frm.doctype,
                docname: frm.docname
            },
            callback: function(r) {
                if (r.message && r.message.success) {
                    frappe.msgprint(__('Calculations refreshed successfully!'));
                    frm.reload_doc();
                }
            }
        });
    }, __('Actions'));
    
    // Populate BOM from Default button (when paper_type is selected but no BOM)
    if (frm.doc.paper_type && !frm.doc.default_bom) {
        frm.add_custom_button(__('🔗 Populate BOM from Default'), function() {
            frappe.call({
                method: 'work_order_estimations.api.populate_bom_from_default',
                args: {
                    doctype: frm.doctype,
                    docname: frm.docname
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(__('BOM populated from default successfully!'));
                        frm.reload_doc();
                    }
                }
            });
        }, __('Breakdown'));
    }
    
    // Update BOM Costs button (only when BOM is selected)
    if (frm.doc.default_bom) {
        frm.add_custom_button(__('📊 Update BOM Costs'), function() {
            frappe.call({
                method: 'work_order_estimations.api.update_bom_costs',
                args: {
                    doctype: frm.doctype,
                    docname: frm.docname
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(__('BOM costs updated successfully!'));
                        frm.reload_doc();
                    }
                }
            });
        }, __('Breakdown'));
    }
    
    // Calculation buttons in Breakdown section
    if (frm.doc.estimation_processes && frm.doc.estimation_processes.length > 0) {
        frm.add_custom_button(__('🔄 Recalculate Operations Cost'), function() {
            frappe.call({
                method: 'work_order_estimations.api.recalculate_operations_cost',
                args: {
                    doctype: frm.doctype,
                    docname: frm.docname
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(__('Operations cost recalculated successfully!'));
                        frm.reload_doc();
                    }
                }
            });
        }, __('Breakdown'));
        
        // Manual Calculate All Process Totals button
        frm.add_custom_button(__('🧮 Calculate All Process Totals'), function() {
            calculateAllProcessTotals(frm);
            recalculateOperationsCost(frm);
            frappe.msgprint(__('All process totals calculated and operations cost updated!'));
        }, __('Breakdown'));
    }
    
    // Weight Calculation Breakdown button (for debugging)
    if (frm.doc.gsm && frm.doc.length_cm && frm.doc.width_cm) {
        frm.add_custom_button(__('🧮 Weight Calculation Breakdown'), function() {
            frappe.call({
                method: 'work_order_estimations.api.get_weight_calculation_breakdown',
                args: {
                    doctype: frm.doctype,
                    docname: frm.docname
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        let breakdown = r.message.breakdown;
                        let message = `
                            <h4>Weight Calculation Breakdown</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td><strong>Area (cm²):</strong></td><td>${breakdown.area_cm2}</td></tr>
                                <tr><td><strong>Area (m²):</strong></td><td>${breakdown.area_m2}</td></tr>
                                <tr><td><strong>Weight (g):</strong></td><td>${breakdown.weight_g}</td></tr>
                                <tr><td><strong>Weight (kg):</strong></td><td>${breakdown.weight_kg}</td></tr>
                                <tr><td><strong>Calculated Weight (kg):</strong></td><td>${breakdown.calculated_weight_kg}</td></tr>
                                <tr><td><strong>Difference:</strong></td><td>${breakdown.difference}</td></tr>
                            </table>
                        `;
                        frappe.msgprint({
                            title: __('Weight Calculation Breakdown'),
                            message: message,
                            indicator: 'blue'
                        });
                    }
                }
            });
        }, __('Breakdown'));
    }
    
    // Estimation Done button (only for From Quotation status)
    if (frm.doc.status === 'From Quotation') {
        frm.add_custom_button(__('✅ Estimation Done'), function() {
            frappe.confirm(
                __('Are you sure you want to mark this estimation as done? This will update the quotation with calculated costs.'),
                function() {
                    frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: frm.doctype,
                            name: frm.docname,
                            fieldname: 'status',
                            value: 'Estimation Done'
                        },
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(__('Estimation marked as done! Quotation has been updated with calculated costs.'));
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Create Sales Order button (only for Converted to Quotation status)
    if (frm.doc.status === 'Converted to Quotation' && frm.doc.quotation_reference) {
        frm.add_custom_button(__('📝 Create Sales Order'), function() {
            frappe.confirm(
                __('Are you sure you want to create a Sales Order from the quotation?'),
                function() {
                    frappe.call({
                        method: 'work_order_estimations.api.create_sales_order_from_quotation',
                        args: {
                            doctype: frm.doctype,
                            docname: frm.docname,
                            quotation_name: frm.doc.quotation_reference
                        },
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.msgprint(__('Sales Order {0} created successfully!').format(r.message.sales_order_name));
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Create Work Order button (only for Sales Order Created status)
    if (frm.doc.status === 'Sales Order Created' && frm.doc.sales_order_reference) {
        frm.add_custom_button(__('⚙️ Create Work Order'), function() {
            frappe.confirm(
                __('Are you sure you want to create a Work Order for production?'),
                function() {
                    frappe.call({
                        method: 'work_order_estimations.api.create_work_order_from_sales_order',
                        args: {
                            doctype: frm.doctype,
                            docname: frm.docname,
                            sales_order_name: frm.doc.sales_order_reference
                        },
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.msgprint(__('Work Order {0} created successfully!').format(r.message.work_order_name));
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Create Stock Entries button (only for Work Order Created status)
    if (frm.doc.status === 'Work Order Created' && frm.doc.work_order_reference) {
        frm.add_custom_button(__('📦 Create Stock Entries'), function() {
            frappe.confirm(
                __('Are you sure you want to create Stock Entries for the completed Work Order?'),
                function() {
                    frappe.call({
                        method: 'work_order_estimations.api.create_stock_entries_from_work_order',
                        args: {
                            doctype: frm.doctype,
                            docname: frm.docname,
                            work_order_name: frm.doc.work_order_reference
                        },
                        callback: function(r) {
                            if (r.message && r.message.success) {
                                frappe.msgprint(__('Stock Entries created successfully!'));
                                frm.reload_doc();
                            }
                        }
                    });
                }
            );
        }, __('Actions'));
    }
    
    // Generate PDF Report button (for all statuses except Draft)
    if (frm.doc.status && frm.doc.status !== 'Draft') {
        frm.add_custom_button(__('📄 Generate PDF Report'), function() {
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
    
    // Create Sample BOM button (for all statuses)
    frm.add_custom_button(__('🏗️ Create Sample BOM'), function() {
        frappe.confirm(
            __('Do you want to create a sample BOM for the selected paper type?'),
            function() {
                frappe.call({
                    method: 'work_order_estimations.api.create_sample_bom',
                    args: {
                        doctype: frm.doctype,
                        docname: frm.docname
                    },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            frappe.msgprint(__('Sample BOM created successfully!'));
                        }
                    }
                });
            }
        );
    }, __('Breakdown'));
    
    // Submit button (for Draft status)
    if (frm.doc.status === 'Draft' && !frm.doc.docstatus) {
        frm.add_custom_button(__('📤 Submit'), function() {
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
    
    // Cancel button (for Draft status)
    if (frm.doc.status === 'Draft' && !frm.doc.docstatus) {
        frm.add_custom_button(__('❌ Cancel Estimation'), function() {
            frappe.confirm(
                __('Are you sure you want to cancel this estimation?'),
                function() {
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
                }
            );
        }, __('Actions'));
    }
}

function addCustomDashboard(frm) {
    // Add custom dashboard section
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
                    <div class="stat-label">Quantity</div>
                    <div class="stat-value" id="dashboard-quantity">${frm.doc.quantity || 0}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Weight</div>
                    <div class="stat-value" id="dashboard-weight">${frm.doc.total_weight_kg ? frm.doc.total_weight_kg.toFixed(3) : 0} kg</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Cost</div>
                    <div class="stat-value" id="dashboard-cost">${frm.doc.total_cost ? frappe.format_currency(frm.doc.total_cost) : '0'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Profit Margin</div>
                    <div class="stat-value" id="dashboard-margin">${frm.doc.profit_margin || 25}%</div>
                </div>
            </div>
            
            <div class="cost-breakdown" id="cost-breakdown-section" style="display: none;">
                <h4>💰 Cost Breakdown</h4>
                <div class="cost-item">
                    <span>Paper Cost:</span>
                    <span id="paper-cost-display">0</span>
                </div>
                <div class="cost-item">
                    <span>Operations Cost:</span>
                    <span id="operations-cost-display">0</span>
                </div>
                <div class="cost-item total">
                    <span>Total Cost:</span>
                    <span id="total-cost-display">0</span>
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
        .status-sent { background: #007bff; color: white; }
        .status-converted-to-quotation { background: #28a745; color: white; }
        .status-sales-order-created { background: #17a2b8; color: white; }
        .status-work-order-created { background: #ffc107; color: black; }
        .status-production-completed { background: #28a745; color: white; }
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
                <div class="flow-item ${frm.doc.status === 'From Quotation' ? 'active' : ''}">
                    <div class="flow-icon">📋</div>
                    <div class="flow-text">From Quotation</div>
                    ${frm.doc.quotation_reference ? `<div class="flow-ref">${frm.doc.quotation_reference}</div>` : ''}
                </div>
                <div class="flow-item ${frm.doc.status === 'Draft' ? 'active' : ''}">
                    <div class="flow-icon">📝</div>
                    <div class="flow-text">Estimation Created</div>
                </div>
                <div class="flow-item ${frm.doc.status === 'Sent' ? 'active' : ''}">
                    <div class="flow-icon">📤</div>
                    <div class="flow-text">Sent to Client</div>
                </div>
                <div class="flow-item ${frm.doc.status === 'Converted to Quotation' ? 'active' : ''}">
                    <div class="flow-icon">📋</div>
                    <div class="flow-text">Quotation Created</div>
                    ${frm.doc.quotation_reference ? `<div class="flow-ref">${frm.doc.quotation_reference}</div>` : ''}
                </div>
                <div class="flow-item ${frm.doc.status === 'Sales Order Created' ? 'active' : ''}">
                    <div class="flow-icon">📝</div>
                    <div class="flow-text">Sales Order Created</div>
                    ${frm.doc.sales_order_reference ? `<div class="flow-ref">${frm.doc.sales_order_reference}</div>` : ''}
                </div>
                <div class="flow-item ${frm.doc.status === 'Work Order Created' ? 'active' : ''}">
                    <div class="flow-icon">⚙️</div>
                    <div class="flow-text">Work Order Created</div>
                    ${frm.doc.work_order_reference ? `<div class="flow-ref">${frm.doc.work_order_reference}</div>` : ''}
                </div>
                <div class="flow-item ${frm.doc.status === 'Production Completed' ? 'active' : ''}">
                    <div class="flow-icon">✅</div>
                    <div class="flow-text">Production Completed</div>
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
        // Update dashboard values
        if (document.getElementById('dashboard-quantity')) {
            document.getElementById('dashboard-quantity').textContent = frm.doc.quantity || 0;
        }
        if (document.getElementById('dashboard-weight')) {
            document.getElementById('dashboard-weight').textContent = 
                (frm.doc.total_weight_kg ? frm.doc.total_weight_kg.toFixed(3) : 0) + ' kg';
        }
        if (document.getElementById('dashboard-cost')) {
            document.getElementById('dashboard-cost').textContent = 
                frm.doc.total_cost ? frappe.format_currency(frm.doc.total_cost) : '0';
        }
        if (document.getElementById('dashboard-margin')) {
            document.getElementById('dashboard-margin').textContent = (frm.doc.profit_margin || 25) + '%';
        }
        
        // Update cost breakdown
        if (document.getElementById('cost-breakdown-section')) {
            let totalCost = frm.doc.total_cost || 0;
            let paperCost = frm.doc.total_paper_cost || 0;
            let operationsCost = frm.doc.total_cost_for_operations || 0;
            
            if (totalCost > 0) {
                document.getElementById('cost-breakdown-section').style.display = 'block';
                document.getElementById('paper-cost-display').textContent = frappe.format_currency(paperCost);
                document.getElementById('operations-cost-display').textContent = frappe.format_currency(operationsCost);
                document.getElementById('total-cost-display').textContent = frappe.format_currency(totalCost);
            } else {
                document.getElementById('cost-breakdown-section').style.display = 'none';
            }
        }
        
        // Update HTML field dashboard values
        updateHTMLFieldDashboard(frm);
        
        // Update status badges
        let statusElements = document.querySelectorAll('.status-badge');
        statusElements.forEach(function(element) {
            element.className = 'status-badge status-' + (frm.doc.status ? frm.doc.status.toLowerCase().replace(/\s+/g, '-') : 'draft');
            element.textContent = frm.doc.status || 'Draft';
        });
        
        // Update flow tracking
        updateFlowTracking(frm);
        
    } catch (error) {
        console.log('Dashboard update error:', error);
    }
}

function updateHTMLFieldDashboard(frm) {
    try {
        // Update HTML field dashboard values
        if (document.getElementById('dashboard-quantity')) {
            document.getElementById('dashboard-quantity').textContent = frm.doc.quantity || 0;
        }
        if (document.getElementById('dashboard-weight')) {
            document.getElementById('dashboard-weight').textContent = (frm.doc.total_weight_kg || 0) + ' kg';
        }
        if (document.getElementById('dashboard-total-cost')) {
            document.getElementById('dashboard-total-cost').textContent = frm.doc.total_cost || 0;
        }
        if (document.getElementById('dashboard-margin')) {
            document.getElementById('dashboard-margin').textContent = (frm.doc.profit_margin || 25) + '%';
        }
        if (document.getElementById('dashboard-paper-cost')) {
            document.getElementById('dashboard-paper-cost').textContent = frm.doc.total_paper_cost || 0;
        }
        if (document.getElementById('dashboard-operations-cost')) {
            document.getElementById('dashboard-operations-cost').textContent = frm.doc.total_cost_for_operations || 0;
        }
        if (document.getElementById('dashboard-total-cost-breakdown')) {
            document.getElementById('dashboard-total-cost-breakdown').textContent = frm.doc.total_cost || 0;
        }
        if (document.getElementById('dashboard-status')) {
            document.getElementById('dashboard-status').textContent = 'Status: ' + (frm.doc.status || 'Draft');
        }
    } catch (error) {
        console.log('HTML Field Dashboard update error:', error);
    }
}

function updateFlowTracking(frm) {
    try {
        let flowItems = document.querySelectorAll('.flow-item');
        flowItems.forEach(function(item, index) {
            let statuses = ['From Quotation', 'Draft', 'Sent', 'Converted to Quotation', 'Sales Order Created', 'Work Order Created', 'Production Completed'];
            let currentStatus = frm.doc.status || 'From Quotation';
            let currentIndex = statuses.indexOf(currentStatus);
            
            if (index <= currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    } catch (error) {
        console.log('Flow tracking update error:', error);
    }
}



function updateBOMDetails(frm) {
    // Update BOM details and calculations
    if (frm.doc.default_bom) {
        frappe.call({
            method: 'work_order_estimations.api.get_bom_details',
            args: {
                bom_no: frm.doc.default_bom
            },
            callback: function(r) {
                if (r.message && r.message.success) {
                    let bomData = r.message.bom_data;
                    
                    // Update BOM-related fields
                    if (bomData.total_cost && bomData.quantity) {
                        let bomCostPerUnit = bomData.total_cost / bomData.quantity;
                        frm.set_value('total_cost', bomCostPerUnit * frm.doc.quantity);
                        frm.set_value('cost_per_unit', bomCostPerUnit);
                        frm.refresh_field('total_cost');
                        frm.refresh_field('cost_per_unit');
                    }
                    
                    frappe.msgprint(__('BOM details updated successfully!'));
                }
            }
        });
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
    
    // Update cost per unit
    let quantity = parseFloat(frm.doc.quantity) || 0;
    if (quantity > 0) {
        frm.set_value('cost_per_unit', totalCost / quantity);
    }
    
    // Refresh fields
    frm.refresh_field('total_cost_for_operations');
    frm.refresh_field('total_cost');
    frm.refresh_field('cost_per_unit');
    
    // Update dashboard after cost recalculation
    updateDashboard(frm);
}


