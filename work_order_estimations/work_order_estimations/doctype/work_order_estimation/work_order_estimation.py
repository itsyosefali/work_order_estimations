# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class WorkOrderEstimation(Document):
    def validate(self):
        """Validate and calculate all fields"""
        self.calculate_paper_metrics()
        self.calculate_costs()
        self.update_status()
    
    def calculate_paper_metrics(self):
        """Calculate paper weight and consumption metrics"""
        if self.quantity and self.gsm and self.length_cm and self.width_cm:
            # Weight per piece in kg: (length_cm * width_cm * gsm) / 100000
            self.weight_per_piece_kg = (self.length_cm * self.width_cm * self.gsm) / 100000
            
            # Pieces per kg
            if self.weight_per_piece_kg > 0:
                self.pieces_per_kg = 1 / self.weight_per_piece_kg
            else:
                self.pieces_per_kg = 0
            
            # Net weight for production
            self.net_weight_kg = self.weight_per_piece_kg * self.quantity
            
            # Waste weight
            if self.waste_percentage:
                self.waste_kg = self.net_weight_kg * (self.waste_percentage / 100)
            else:
                self.waste_kg = 0
            
            # Total weight including waste
            self.total_weight_kg = self.net_weight_kg + self.waste_kg
    
    def calculate_costs(self):
        """Calculate all cost-related fields"""
        # Paper costs
        if self.total_weight_kg and self.rate_per_kg:
            self.total_paper_cost = self.total_weight_kg * self.rate_per_kg
            
            if self.quantity > 0:
                self.cost_per_piece = self.total_paper_cost / self.quantity
            else:
                self.cost_per_piece = 0
        else:
            self.total_paper_cost = 0
            self.cost_per_piece = 0
        
        # Process costs
        total_process_cost = 0
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    total_process_cost += process.total_cost
        
        # Total cost
        self.total_cost = self.total_paper_cost + total_process_cost
        
        # Cost per unit
        if self.quantity > 0:
            self.cost_per_unit = self.total_cost / self.quantity
        else:
            self.cost_per_unit = 0
        
        # Margin calculations
        if self.profit_margin and self.total_cost:
            self.margin_amount = self.total_cost * (self.profit_margin / 100)
        else:
            self.margin_amount = 0
    
    def update_status(self):
        """Update status based on current state"""
        if not self.status:
            self.status = "Draft"
    
    def on_submit(self):
        """Actions when document is submitted"""
        self.status = "Sent"
        self.save()
    
    def on_cancel(self):
        """Actions when document is cancelled"""
        self.status = "Cancelled"
        self.save()
    
    @frappe.whitelist()
    def refresh_calculations(self):
        """Refresh all calculations - called from client script"""
        self.calculate_paper_metrics()
        self.calculate_costs()
        self.save()
        frappe.msgprint(_("Calculations refreshed successfully!"))
    
    @frappe.whitelist()
    def convert_to_quotation(self):
        """Convert estimation to quotation"""
        if self.status != "Sent":
            frappe.throw(_("Only sent estimations can be converted to quotations."))
        
        # Create quotation
        quotation = frappe.new_doc("Quotation")
        quotation.party_name = self.client_name
        quotation.quotation_to = "Customer"
        quotation.transaction_date = frappe.utils.today()
        quotation.valid_till = self.delivery_date
        
        # Add items
        quotation.append("items", {
            "item_code": self.paper_type,
            "qty": self.quantity,
            "rate": self.sales_price or self.cost_per_unit,
            "description": f"Printing job: {self.project_name}"
        })
        
        # Set custom field reference
        if hasattr(quotation, 'work_order_estimation'):
            quotation.work_order_estimation = self.name
        
        quotation.insert()
        
        # Update status
        self.status = "Converted to Quotation"
        self.save()
        
        frappe.msgprint(_("Quotation {0} created successfully!").format(quotation.name))
        return quotation.name
    
    @frappe.whitelist()
    def generate_pdf_report(self):
        """Generate PDF report for the estimation"""
        # This will use the print format
        return frappe.get_print("Work Order Estimation", self.name)
