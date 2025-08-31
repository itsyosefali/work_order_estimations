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
        frappe.log_error(f"Error refreshing calculations for {doctype} {docname}: {str(e)}")
        frappe.throw(_("Error refreshing calculations. Please try again."))

@frappe.whitelist()
def convert_to_quotation(doctype, docname):
    """Convert Work Order Estimation to Quotation"""
    try:
        doc = frappe.get_doc(doctype, docname)
        
        if doc.status != "Sent":
            frappe.throw(_("Only sent estimations can be converted to quotations."))
        
        # Create quotation
        quotation = frappe.new_doc("Quotation")
        quotation.party_name = doc.client_name
        quotation.quotation_to = "Customer"
        quotation.transaction_date = frappe.utils.today()
        quotation.valid_till = doc.delivery_date
        
        # Add items
        quantity = float(doc.quantity) if isinstance(doc.quantity, str) else doc.quantity
        sales_price = float(doc.sales_price) if isinstance(doc.sales_price, str) else doc.sales_price
        
        quotation.append("items", {
            "item_code": doc.paper_type,
            "qty": quantity,
            "rate": sales_price or doc.cost_per_unit,
            "description": f"Printing job: {doc.project_name}"
        })
        
        # Set custom field reference if it exists
        if hasattr(quotation, 'work_order_estimation'):
            quotation.work_order_estimation = doc.name
        
        quotation.insert()
        
        # Update status
        doc.status = "Converted to Quotation"
        doc.save()
        
        frappe.msgprint(_("Quotation {0} created successfully!").format(quotation.name))
        return {"success": True, "quotation_name": quotation.name}
        
    except Exception as e:
        frappe.log_error(f"Error converting to quotation for {doctype} {docname}: {str(e)}")
        frappe.throw(_("Error converting to quotation. Please try again."))

@frappe.whitelist()
def generate_pdf_report(doctype, docname):
    """Generate PDF report for Work Order Estimation"""
    try:
        # This will use the print format
        pdf_url = frappe.get_url_to_print(doctype, docname)
        return {"success": True, "pdf_url": pdf_url}
    except Exception as e:
        frappe.log_error(f"Error generating PDF for {doctype} {docname}: {str(e)}")
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
        frappe.log_error(f"Error submitting estimation {doctype} {docname}: {str(e)}")
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
        frappe.log_error(f"Error cancelling estimation {doctype} {docname}: {str(e)}")
        frappe.throw(_("Error cancelling estimation. Please try again."))

@frappe.whitelist()
def test_api_connection():
    """Test method to verify API is working"""
    return {"success": True, "message": "Work Order Estimations API is working correctly!"}
