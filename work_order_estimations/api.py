# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe import _

@frappe.whitelist()
def refresh_calculations(doctype, docname):
    """Refresh all calculations for Work Order Estimation"""
    try:
        doc = frappe.get_doc(doctype, docname)
        doc.calculate_paper_metrics()
        doc.calculate_costs()
        doc.save()
        frappe.msgprint(_("Calculations refreshed successfully!"))
        return {"success": True, "message": "Calculations refreshed successfully!"}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Calculation refresh failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error refreshing calculations. Please try again."))

@frappe.whitelist()
def convert_to_quotation(doctype, docname):
    """Convert Work Order Estimation to Quotation"""
    try:
        doc = frappe.get_doc(doctype, docname)
        quotation_name = doc.create_quotation()
        return {"success": True, "quotation_name": quotation_name}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Quotation conversion failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error converting to quotation. Please try again."))

@frappe.whitelist()
def create_sales_order_from_quotation(doctype, docname, quotation_name):
    """Create Sales Order from Quotation"""
    try:
        doc = frappe.get_doc(doctype, docname)
        sales_order_name = doc.create_sales_order_from_quotation(quotation_name)
        return {"success": True, "sales_order_name": sales_order_name}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Sales Order creation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error creating sales order. Please try again."))

@frappe.whitelist()
def create_work_order_from_sales_order(doctype, docname, sales_order_name):
    """Create Work Order from Sales Order"""
    try:
        doc = frappe.get_doc(doctype, docname)
        work_order_name = doc.create_work_order_from_sales_order(sales_order_name)
        return {"success": True, "work_order_name": work_order_name}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Work Order creation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error creating work order. Please try again."))

@frappe.whitelist()
def create_stock_entries_from_work_order(doctype, docname, work_order_name):
    """Create Stock Entries from Work Order"""
    try:
        doc = frappe.get_doc(doctype, docname)
        stock_entries = doc.create_stock_entries_from_work_order(work_order_name)
        return {"success": True, "stock_entries": stock_entries}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Stock Entry creation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error creating stock entries. Please try again."))

@frappe.whitelist()
def generate_pdf_report(doctype, docname):
    """Generate PDF report for Work Order Estimation"""
    try:
        doc = frappe.get_doc(doctype, docname)
        pdf_url = doc.generate_pdf_report()
        return {"success": True, "pdf_url": pdf_url}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"PDF generation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error generating PDF report. Please try again."))

@frappe.whitelist()
def submit_estimation(doctype, docname):
    """Submit Work Order Estimation (change status to Sent)"""
    try:
        doc = frappe.get_doc(doctype, docname)
        doc.status = "Sent"
        doc.save()
        frappe.msgprint(_("Estimation submitted successfully!"))
        return {"success": True, "message": "Estimation submitted successfully!"}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Estimation submission failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error submitting estimation. Please try again."))

@frappe.whitelist()
def cancel_estimation(doctype, docname):
    """Cancel Work Order Estimation (change status to Cancelled)"""
    try:
        doc = frappe.get_doc(doctype, docname)
        doc.status = "Cancelled"
        doc.save()
        frappe.msgprint(_("Estimation cancelled successfully!"))
        return {"success": True, "message": "Estimation cancelled successfully!"}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Estimation cancellation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error cancelling estimation. Please try again."))

@frappe.whitelist()
def get_cost_breakdown(doctype, docname):
    """Get detailed cost breakdown for dashboard"""
    try:
        doc = frappe.get_doc(doctype, docname)
        breakdown = doc.get_cost_breakdown()
        return {"success": True, "breakdown": breakdown}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Cost breakdown retrieval failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error getting cost breakdown. Please try again."))

@frappe.whitelist()
def auto_fetch_rate_from_item(doctype, docname):
    """Auto-fetch rate per kg from Item Master"""
    try:
        doc = frappe.get_doc(doctype, docname)
        if doc.paper_type:
            item = frappe.get_doc("Item", doc.paper_type)
            if item.valuation_rate:
                doc.rate_per_kg = item.valuation_rate
                doc.save()
                frappe.msgprint(_("Rate per kg updated from Item Master: {0}").format(item.valuation_rate))
                return {"success": True, "rate": item.valuation_rate}
            else:
                frappe.msgprint(_("No valuation rate found for item {0}").format(doc.paper_type))
                return {"success": False, "message": "No valuation rate found"}
        else:
            frappe.msgprint(_("Please select a paper type first"))
            return {"success": False, "message": "No paper type selected"}
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Rate auto-fetch failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error auto-fetching rate. Please try again."))

@frappe.whitelist()
def create_sample_bom(doctype, docname):
    """Create a sample BOM for the paper type if none exists"""
    try:
        doc = frappe.get_doc(doctype, docname)
        if not doc.paper_type:
            frappe.throw(_("Please select a paper type first"))
        
        # Check if BOM already exists
        existing_bom = doc.get_bom_for_paper_type()
        if existing_bom:
            frappe.msgprint(_("BOM already exists for {0}: {1}").format(doc.paper_type, existing_bom.name))
            return {"success": True, "bom_name": existing_bom.name, "message": "BOM already exists"}
        
        # Create sample BOM
        bom = frappe.new_doc("BOM")
        bom.item = doc.paper_type
        bom.item_name = doc.paper_type
        bom.bom_type = "Manufacturing"
        bom.is_active = 1
        bom.is_default = 1
        
        # Add raw paper as component
        bom.append("items", {
            "item_code": doc.paper_type,
            "qty": 1.0,
            "rate": doc.rate_per_kg or 0,
            "uom": "Kg"
        })
        
        # Add operations from estimation processes
        if doc.estimation_processes:
            for process in doc.estimation_processes:
                bom.append("operations", {
                    "operation": process.process_type,
                    "workstation": process.workstation,
                    "time_in_mins": 60,
                    "description": process.details
                })
        
        bom.insert()
        
        frappe.msgprint(_("Sample BOM {0} created successfully for {1}").format(bom.name, doc.paper_type))
        return {"success": True, "bom_name": bom.name, "message": "Sample BOM created"}
        
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Sample BOM creation failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error creating sample BOM. Please try again."))

@frappe.whitelist()
def get_document_flow_summary(doctype, docname):
    """Get summary of all linked documents in the flow"""
    try:
        doc = frappe.get_doc(doctype, docname)
        summary = {
            "estimation": {
                "name": doc.name,
                "status": doc.status,
                "project": doc.project_name,
                "client": doc.client_name
            },
            "quotation": None,
            "sales_order": None,
            "work_order": None,
            "stock_entries": []
        }
        
        # Get quotation details
        if doc.quotation_reference:
            try:
                quotation = frappe.get_doc("Quotation", doc.quotation_reference)
                summary["quotation"] = {
                    "name": quotation.name,
                    "status": quotation.status,
                    "total": quotation.total
                }
            except:
                pass
        
        # Get sales order details
        if doc.sales_order_reference:
            try:
                sales_order = frappe.get_doc("Sales Order", doc.sales_order_reference)
                summary["sales_order"] = {
                    "name": sales_order.name,
                    "status": sales_order.status,
                    "total": sales_order.total
                }
            except:
                pass
        
        # Get work order details
        if doc.work_order_reference:
            try:
                work_order = frappe.get_doc("Work Order", doc.work_order_reference)
                summary["work_order"] = {
                    "name": work_order.name,
                    "status": work_order.status,
                    "qty": work_order.qty
                }
            except:
                pass
        
        # Get stock entries
        if doc.work_order_reference:
            try:
                stock_entries = frappe.get_all("Stock Entry", 
                    filters={"work_order": doc.work_order_reference},
                    fields=["name", "stock_entry_type", "total_amount"]
                )
                summary["stock_entries"] = stock_entries
            except:
                pass
        
        return {"success": True, "summary": summary}
        
    except Exception as e:
        # Log error with shorter message to avoid truncation
        error_msg = f"Document flow summary failed for {doctype} {docname}: {str(e)[:100]}"
        frappe.log_error(error_msg, "Work Order Estimation API Error")
        frappe.throw(_("Error getting document flow summary. Please try again."))

@frappe.whitelist()
def test_api_connection():
    """Test method to verify API is working"""
    return {"success": True, "message": "Work Order Estimations API is working correctly!"}
