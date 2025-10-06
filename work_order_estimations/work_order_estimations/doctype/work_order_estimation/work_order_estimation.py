# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
import json

class WorkOrderEstimation(Document):
    def on_trash(self):
        if self.quotation_reference:
            try:
                quotation = frappe.get_doc("Quotation", self.quotation_reference)
                if quotation.custom_work_order_estimation_reference == self.name:
                    quotation.custom_work_order_estimation_reference = None
                    quotation.save()
                    frappe.db.commit()
                    frappe.msgprint(_("WOE reference cleared from Quotation {0}").format(self.quotation_reference))
                    
            except Exception as e:
                frappe.log_error(f"Error clearing WOE reference from quotation: {str(e)}")
    
    def validate(self):
        """Validate and calculate all fields"""
        self.calculate_totals_from_items()
        self.calculate_operations_cost()
        self.calculate_final_totals()
        self.update_status()
        self.validate_processes()
    
    def calculate_totals_from_items(self):
        """Calculate total paper cost from all items in child table"""
        self.total_paper_cost = 0
        
        if self.estimation_items:
            for item in self.estimation_items:
                if item.total_paper_cost:
                    self.total_paper_cost += item.total_paper_cost
    
    def calculate_operations_cost(self):
        """Calculate total operations cost from estimation processes"""
        self.total_cost_for_operations = 0
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    self.total_cost_for_operations += process.total_cost
    
    def calculate_final_totals(self):
        """Calculate final totals and per unit costs"""
        # Total cost (paper + operations)
        self.total_cost = (self.total_paper_cost or 0) + (self.total_cost_for_operations or 0)
        
        # Calculate total quantity from all items
        total_quantity = 0
        if self.estimation_items:
            for item in self.estimation_items:
                if item.quantity:
                    total_quantity += item.quantity
        
        # Cost per unit
        if total_quantity > 0:
            self.cost_per_unit = self.total_cost / total_quantity
        else:
            self.cost_per_unit = 0
        
        # Margin calculations
        if self.profit_margin and self.total_cost:
            profit_margin = float(self.profit_margin) if isinstance(self.profit_margin, str) else self.profit_margin
            self.margin_amount = self.total_cost * (profit_margin / 100)
        else:
            self.margin_amount = 0
        
        # Calculate sales price if not set
        if not self.sales_price and self.total_cost and self.margin_amount:
            self.sales_price = self.total_cost + self.margin_amount
    
    def validate_processes(self):
        """Validate that all processes have required fields"""
        if self.estimation_processes:
            for process in self.estimation_processes:
                if not process.process_type:
                    frappe.throw(_("Process Type is required for all processes"))
                if not process.workstation:
                    frappe.throw(_("Workstation is required for all processes"))
                if not process.rate:
                    frappe.throw(_("Rate is required for all processes"))
    
    def update_status(self):
        """Update status based on current state"""
        if not self.status:
            self.status = "Draft"
    
    @frappe.whitelist()
    def create_quotation(self):
        """Create Quotation from Work Order Estimation"""
        try:
            if self.status != "Estimation Done":
                frappe.throw(_("Only completed estimations can be converted to quotations."))
            
            # Create quotation
            quotation = frappe.new_doc("Quotation")
            quotation.party_name = self.client_name
            quotation.quotation_to = "Customer"
            quotation.transaction_date = frappe.utils.today()
            quotation.valid_till = self.delivery_date
            quotation.custom_work_order_estimation_reference = self.name
            
            # Add items from estimation items
            if self.estimation_items:
                for est_item in self.estimation_items:
                    if est_item.item and est_item.quantity:
                        quotation.append("items", {
                            "item_code": est_item.item,
                            "qty": est_item.quantity,
                            "rate": est_item.cost_per_piece or 0,
                            "description": f"Printing job: {self.project_name} - {est_item.paper_type}",
                        })
            
            quotation.insert()
            
            # Update status
            self.status = "Quotation Created"
            self.quotation_reference = quotation.name
            self.save()
            
            frappe.msgprint(_("Quotation {0} created successfully!").format(quotation.name))
            return quotation.name
            
        except Exception as e:
            error_msg = f"Quotation creation failed for {self.name}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            frappe.throw(_("Error creating quotation: {0}").format(str(e)))
    
    def get_cost_breakdown(self):
        """Get detailed cost breakdown for dashboard"""
        breakdown = {
            "paper_cost": self.total_paper_cost or 0,
            "process_cost": self.total_cost_for_operations or 0,
            "total_cost": self.total_cost or 0,
            "profit_margin": self.profit_margin or 0,
            "margin_amount": self.margin_amount or 0,
            "sales_price": self.sales_price or 0,
            "cost_per_unit": self.cost_per_unit or 0
        }
        
        return breakdown
    
    def update_quotation_with_woe_reference(self):
        """Update quotation with WOE reference when WOE is created"""
        if self.quotation_reference:
            try:
                # Get the quotation
                quotation = frappe.get_doc("Quotation", self.quotation_reference)
                
                # Update the quotation with WOE reference
                quotation.custom_work_order_estimation_reference = self.name
                
                # Save the quotation
                quotation.save()
                frappe.db.commit()
                
                frappe.msgprint(_("Quotation updated with WOE reference: {0}").format(self.name))
                
            except Exception as e:
                frappe.log_error(f"Error updating quotation with WOE reference: {str(e)}")

    @frappe.whitelist()
    def create_estimation_item_addons(self, addon_data):
        """Create estimation item addons via dialog"""
        try:
            # Parse addon data if it's a string
            if isinstance(addon_data, str):
                addon_data = json.loads(addon_data)
            
            # Validate that estimation items exist
            if not self.estimation_items:
                frappe.throw(_("Please add estimation items first before creating addons"))
            
            # Get item details for display name
            item_name = ""
            if addon_data.get("item"):
                try:
                    item = frappe.get_doc("Item", addon_data.get("item"))
                    item_name = item.item_name or item.name
                except:
                    item_name = addon_data.get("item")
            
            # Add new row to estimation_item_addons
            new_addon = self.append("estimation_item_addons", {
                "item": addon_data.get("item"),
                "item_name": item_name,
                "addon_type": addon_data.get("addon_type"),
                "wrapper_item": addon_data.get("wrapper_item"),
                "color_item": addon_data.get("color_item"),
                "handle_item": addon_data.get("handle_item")
            })
            
            # Save the document
            self.save()
            
            return {
                "status": "success",
                "message": _("Addon added successfully"),
                "addon_name": new_addon.name
            }
            
        except Exception as e:
            frappe.log_error(f"Error adding estimation item addon: {str(e)}")
            return {
                "status": "error",
                "message": _("Error adding addon: {0}").format(str(e))
            }

    @frappe.whitelist()
    def add_estimation_item(self, item_data):
        """Add a new estimation item via dialog"""
        try:
            # Parse item data if it's a string
            if isinstance(item_data, str):
                item_data = json.loads(item_data)
            
            # Add new row to estimation_items
            new_item = self.append("estimation_items", {
                "item": item_data.get("item"),
                "paper_type": item_data.get("paper_type"),
                "quantity": item_data.get("quantity"),
                "gsm": item_data.get("gsm"),
                "length_cm": item_data.get("length_cm"),
                "width_cm": item_data.get("width_cm"),
                "rate_per_kg": item_data.get("rate_per_kg"),
                "finish": item_data.get("finish"),
                "waste_percentage": item_data.get("waste_percentage", 5)
            })
            
            # Manually trigger calculations for the new item
            if new_item.gsm and new_item.length_cm and new_item.width_cm and new_item.quantity:
                # Calculate weight per piece (GSM * length * width / 10000) / 1000
                area_sqm = (new_item.length_cm * new_item.width_cm) / 10000
                new_item.weight_per_piece_kg = (new_item.gsm * area_sqm) / 1000
                
                # Calculate pieces per kg
                if new_item.weight_per_piece_kg > 0:
                    new_item.pieces_per_kg = 1 / new_item.weight_per_piece_kg
                
                # Calculate net weight needed
                new_item.net_weight_kg = new_item.weight_per_piece_kg * new_item.quantity
                
                # Calculate waste weight
                waste_percentage = new_item.waste_percentage or 0
                new_item.waste_kg = new_item.net_weight_kg * (waste_percentage / 100)
                
                # Calculate total weight including waste
                new_item.total_weight_kg = new_item.net_weight_kg + new_item.waste_kg
                
                # Calculate costs if rate is available
                if new_item.rate_per_kg and new_item.weight_per_piece_kg and new_item.total_weight_kg:
                    new_item.cost_per_piece = new_item.weight_per_piece_kg * new_item.rate_per_kg
                    new_item.total_paper_cost = new_item.total_weight_kg * new_item.rate_per_kg
            
            # Save the document to trigger parent calculations
            self.save()
            
            return {
                "status": "success",
                "message": _("Item added successfully"),
                "item_name": new_item.name
            }
            
        except Exception as e:
            frappe.log_error(f"Error adding estimation item: {str(e)}")
            return {
                "status": "error",
                "message": _("Error adding item: {0}").format(str(e))
            }