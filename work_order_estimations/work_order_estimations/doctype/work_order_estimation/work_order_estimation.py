# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
import json

class WorkOrderEstimation(Document):
    def on_trash(self):
        if self.quotation_reference and self.paper_type:
            try:
                quotation = frappe.get_doc("Quotation", self.quotation_reference)
                for item in quotation.items:
                    if item.item_code == self.paper_type and item.custom_work_order_estimation_references == self.name:
                        item.custom_work_order_estimation_references = None
                        item.custom_total_cost_from_woe = 0
                        item.custom_rate_from_woe = 0
                        break
                quotation.save()
                frappe.db.commit()
                frappe.msgprint(_("WOE reference cleared from Quotation {0}").format(self.quotation_reference))
                
            except Exception as e:
                frappe.log_error(f"Error clearing WOE reference from quotation: {str(e)}")
    def validate(self):
        """Validate and calculate all fields"""
        self.validate_required_specifications()
        self.calculate_paper_metrics()
        self.validate_weight_calculations()  # Add weight validation
        self.calculate_costs()
        self.update_status()
        self.validate_processes()
        self.validate_bom_requirement()
    
    def on_change(self):
        """Handle field changes"""
        if self.has_value_changed('default_bom'):
            self.update_costs_from_bom()
        if self.has_value_changed('paper_type'):
            self.auto_populate_bom_from_default()
        if self.has_value_changed('status'):
            self.update_quotation_item_on_status_change()
    
    def auto_populate_bom_from_default(self):
        """Auto-populate BOM field from item's default_bom"""
        if self.paper_type and not self.default_bom:
            try:
                item = frappe.get_doc("Item", self.paper_type)
                if item.default_bom:
                    self.default_bom = item.default_bom
                    frappe.msgprint(_("BOM automatically populated from item's default BOM: {0}").format(item.default_bom))
            except Exception as e:
                frappe.log_error(f"Error auto-populating BOM for item {self.paper_type}: {str(e)}")
    
    def recalculate_operations_cost(self):
        """Recalculate total operations cost from estimation processes"""
        self.total_cost_for_operations = 0
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    self.total_cost_for_operations += process.total_cost
        
        # Update total cost
        self.total_cost = self.total_paper_cost + self.total_cost_for_operations
        
        # Update cost per unit
        quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
        if quantity > 0:
            self.cost_per_unit = self.total_cost / quantity
        else:
            self.cost_per_unit = 0
    
    def validate_required_specifications(self):
        """Validate that required specifications are provided"""
        if not self.gsm or self.gsm <= 0:
            frappe.throw(_("GSM (Grams per Square Meter) is required and must be greater than 0"))
        if not self.length_cm or self.length_cm <= 0:
            frappe.throw(_("Length (cm) is required and must be greater than 0"))
        if not self.width_cm or self.width_cm <= 0:
            frappe.throw(_("Width (cm) is required and must be greater than 0"))
        if not self.quantity or self.quantity <= 0:
            frappe.throw(_("Quantity is required and must be greater than 0"))
    
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
    
    def validate_bom_requirement(self):
        """Validate BOM requirement based on status"""
        if self.status in ['Work Order Created', 'Production Completed'] and not self.default_bom:
            frappe.throw(_("BOM is required when status is {0}").format(self.status))
    
    def update_costs_from_bom(self):
        """Update costs based on BOM if available"""
        if self.default_bom:
            try:
                bom = frappe.get_doc("BOM", self.default_bom)
                if bom.total_cost and bom.quantity:
                    bom_cost_per_unit = bom.total_cost / bom.quantity
                    # Update costs if they're not already set
                    if not self.total_cost or self.total_cost == 0:
                        self.total_cost = bom_cost_per_unit * self.quantity
                        self.cost_per_unit = bom_cost_per_unit
                        frappe.msgprint(_("Costs updated from BOM {0}").format(self.default_bom))
            except Exception as e:
                frappe.log_error(f"Error updating costs from BOM {self.default_bom}: {str(e)}")
    
    def validate_weight_calculations(self):
        """Validate that weight calculations are mathematically correct"""
        if self.gsm and self.length_cm and self.weight_per_piece_kg:
            # Verify the calculation
            area_m2 = (self.length_cm * self.width_cm) / 10000
            expected_weight_g = self.gsm * area_m2
            expected_weight_kg = expected_weight_g / 1000
            
            # Allow for small floating point precision differences
            tolerance = 0.000001
            if abs(self.weight_per_piece_kg - expected_weight_kg) > tolerance:
                frappe.msgprint(
                    _("Warning: Weight calculation may be incorrect. Expected: {0} kg, Calculated: {1} kg").format(
                        expected_weight_kg, self.weight_per_piece_kg
                    ),
                    indicator="yellow"
                )
    
    def get_weight_calculation_breakdown(self):
        """Get detailed breakdown of weight calculations for debugging"""
        if self.gsm and self.length_cm and self.width_cm:
            area_cm2 = self.length_cm * self.width_cm
            area_m2 = area_cm2 / 10000
            weight_g = self.gsm * area_m2
            weight_kg = weight_g / 1000
            
            return {
                "area_cm2": area_cm2,
                "area_m2": area_m2,
                "weight_g": weight_g,
                "weight_kg": weight_kg,
                "calculated_weight_kg": self.weight_per_piece_kg,
                "difference": abs(weight_kg - self.weight_per_piece_kg)
            }
        return None

    
    def calculate_paper_metrics(self):
        """Calculate paper weight and consumption metrics"""
        if self.quantity and self.gsm and self.length_cm and self.width_cm:
            # Convert string values to float for calculations
            quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
            gsm = float(self.gsm) if isinstance(self.gsm, str) else self.gsm
            length_cm = float(self.length_cm) if isinstance(self.length_cm, str) else self.length_cm
            width_cm = float(self.width_cm) if isinstance(self.width_cm, str) else self.width_cm
            
            # CORRECTED: Weight per piece calculation
            # Convert cm to m: 1 m = 100 cm, so 1 m² = 10,000 cm²
            # Area in m² = (length_cm * width_cm) / 10,000
            # Weight in g = gsm * area_m²
            # Weight in kg = weight_g / 1000
            
            area_m2 = (length_cm * width_cm) / 10000  # Convert cm² to m²
            weight_g = gsm * area_m2  # Weight in grams
            self.weight_per_piece_kg = weight_g / 1000  # Convert to kg
            
            # Pieces per kg
            if self.weight_per_piece_kg > 0:
                self.pieces_per_kg = 1 / self.weight_per_piece_kg
            else:
                self.pieces_per_kg = 0
            
            # Net weight for production
            self.net_weight_kg = self.weight_per_piece_kg * quantity
            
            # Waste weight
            if self.waste_percentage:
                waste_percentage = float(self.waste_percentage) if isinstance(self.waste_percentage, str) else self.waste_percentage
                self.waste_kg = self.net_weight_kg * (waste_percentage / 100)
            else:
                self.waste_kg = 0
            
            # Total weight including waste
            self.total_weight_kg = self.net_weight_kg + self.waste_kg
    
    def calculate_costs(self):
        """Calculate all cost-related fields"""
        # Auto-fetch rate per kg from Item Master if not set
        if not self.rate_per_kg and self.paper_type:
            try:
                item = frappe.get_doc("Item", self.paper_type)
                if item.valuation_rate:
                    self.rate_per_kg = item.valuation_rate
            except:
                pass
        
        # Paper costs
        if self.total_weight_kg and self.rate_per_kg:
            rate_per_kg = float(self.rate_per_kg) if isinstance(self.rate_per_kg, str) else self.rate_per_kg
            self.total_paper_cost = self.total_weight_kg * rate_per_kg
            
            quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
            if quantity > 0:
                self.cost_per_piece = self.total_paper_cost / quantity
            else:
                self.cost_per_piece = 0
        else:
            self.total_paper_cost = 0
            self.cost_per_piece = 0
        
        # Calculate total operations cost from estimation processes
        self.total_cost_for_operations = 0
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    self.total_cost_for_operations += process.total_cost
        
        # Total cost (paper + operations)
        self.total_cost = self.total_paper_cost + self.total_cost_for_operations
        
        # Cost per unit
        quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
        if quantity > 0:
            self.cost_per_unit = self.total_cost / quantity
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
    
    def update_status(self):
        """Update status based on current state"""
        if not self.status:
            if self.quotation_reference:
                self.status = "From Quotation"
                # Update quotation item with WOE reference when first created
                self.update_quotation_item_with_woe_reference()
            else:
                self.status = "Draft"
    
    def on_submit(self):
        """Actions when document is submitted"""
        self.status = "Sent"
        self.save()
    
    def on_cancel(self):
        """Actions when document is cancelled"""
        self.status = "Cancelled"
        self.save()
    
    def create_quotation(self):
        """Create Quotation from Work Order Estimation"""
        try:
            if self.status != "Sent":
                frappe.throw(_("Only sent estimations can be converted to quotations."))
            
            # Create quotation
            quotation = frappe.new_doc("Quotation")
            quotation.party_name = self.client_name
            quotation.quotation_to = "Customer"
            quotation.transaction_date = frappe.utils.today()
            quotation.valid_till = self.delivery_date
            quotation.work_order_estimation = self.name
            
            # Add items
            quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
            sales_price = float(self.sales_price) if isinstance(self.sales_price, str) else self.sales_price
            
            quotation.append("items", {
                "item_code": self.paper_type,
                "qty": quantity,
                "rate": sales_price or self.cost_per_unit,
                "description": f"Printing job: {self.project_name}",
                "work_order_estimation": self.name
            })
            
            quotation.insert()
            
            # Update status
            self.status = "Converted to Quotation"
            self.quotation_reference = quotation.name
            self.save()
            
            frappe.msgprint(_("Quotation {0} created successfully!").format(quotation.name))
            return quotation.name
            
        except Exception as e:
            # Log error with shorter message to avoid truncation
            error_msg = f"Quotation creation failed for {self.name}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            frappe.throw(_("Error creating quotation: {0}").format(str(e)))
    
    def create_sales_order_from_quotation(self, quotation_name):
        """Create Sales Order when Quotation is accepted"""
        try:
            quotation = frappe.get_doc("Quotation", quotation_name)
            if quotation.status != "Open":
                frappe.throw(_("Quotation must be in 'Open' status to create Sales Order"))
            
            # Create Sales Order
            sales_order = frappe.new_doc("Sales Order")
            sales_order.customer = quotation.party_name
            sales_order.delivery_date = self.delivery_date
            sales_order.work_order_estimation = self.name
            sales_order.quotation = quotation_name
            
            # Add items
            for item in quotation.items:
                sales_order.append("items", {
                    "item_code": item.item_code,
                    "qty": item.qty,
                    "rate": item.rate,
                    "description": item.description,
                    "work_order_estimation": self.name
                })
            
            sales_order.insert()
            
            # Update status
            self.status = "Sales Order Created"
            self.sales_order_reference = sales_order.name
            self.save()
            
            frappe.msgprint(_("Sales Order {0} created successfully!").format(sales_order.name))
            return sales_order.name
            
        except Exception as e:
            # Log error with shorter message to avoid truncation
            error_msg = f"Sales Order creation failed for {self.name}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            frappe.throw(_("Error creating sales order: {0}").format(str(e)))
    
    def create_work_order_from_sales_order(self, sales_order_name):
        """Create Work Order from Sales Order for in-house production"""
        try:
            sales_order = frappe.get_doc("Sales Order", sales_order_name)
            if sales_order.status not in ["Draft", "To Deliver and Bill"]:
                frappe.throw(_("Sales Order must be in 'Draft' or 'To Deliver and Bill' status to create Work Order"))
            
            # Check if BOM exists for paper type
            bom = self.get_bom_for_paper_type()
            if not bom:
                frappe.throw(_("No BOM found for paper type {0}. Please create a BOM first.").format(self.paper_type))
            
            # Create Work Order
            work_order = frappe.new_doc("Work Order")
            work_order.production_item = self.paper_type
            work_order.qty = self.quantity
            work_order.bom_no = bom.name
            work_order.sales_order = sales_order_name
            work_order.work_order_estimation = self.name
            work_order.planned_start_date = frappe.utils.today()
            work_order.planned_end_date = self.delivery_date
            work_order.fg_warehouse = "Finished Goods - PM"  # Default warehouse
            work_order.source_warehouse = "Stores - PM"  # Default warehouse
            
            # Add operations from estimation processes
            for process in self.estimation_processes:
                work_order.append("operations", {
                    "operation": process.process_type,
                    "workstation": process.workstation,
                    "time_in_mins": 60,  # Default time, can be customized
                    "description": process.details
                })
            
            work_order.insert()
            
            # Update status
            self.status = "Work Order Created"
            self.work_order_reference = work_order.name
            self.save()
            
            frappe.msgprint(_("Work Order {0} created successfully!").format(work_order.name))
            return work_order.name
            
        except Exception as e:
            # Log error with shorter message to avoid truncation
            error_msg = f"Work Order creation failed for {self.name}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            frappe.throw(_("Error creating work order: {0}").format(str(e)))
    
    def get_bom_for_paper_type(self):
        """Get BOM for the paper type"""
        print(self.paper_type)
        try:
            bom_list = frappe.get_all("BOM", 
                filters={
                    "item": self.paper_type,
                    "is_active": 1,
                    "is_default": 1
                },
                fields=["name"],
                limit=1
            )
            if bom_list:
                return frappe.get_doc("BOM", bom_list[0].name)
            else:
                # Try to find any active BOM
                bom_list = frappe.get_all("BOM", 
                    filters={
                        "item": self.paper_type,
                        "is_active": 1
                    },
                    fields=["name"],
                    limit=1
                )
                
                if bom_list:
                    return frappe.get_doc("BOM", bom_list[0].name)
            
            return None
            
        except Exception as e:
            # Log error with shorter message to avoid truncation
            error_msg = f"BOM retrieval failed for {self.paper_type}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            return None
    
    def create_stock_entries_from_work_order(self, work_order_name):
        """Create Stock Entries when Work Order is completed"""
        try:
            work_order = frappe.get_doc("Work Order", work_order_name)
            if work_order.status != "Completed":
                frappe.throw(_("Work Order must be completed to create Stock Entries"))
            
            # Create Stock Entry for consumption of raw materials
            consumption_entry = frappe.new_doc("Stock Entry")
            consumption_entry.stock_entry_type = "Material Issue for Manufacture"
            consumption_entry.work_order = work_order_name
            consumption_entry.work_order_estimation = self.name
            consumption_entry.from_warehouse = work_order.source_warehouse
            
            # Add raw materials from BOM
            bom = frappe.get_doc("BOM", work_order.bom_no)
            for item in bom.items:
                consumption_entry.append("items", {
                    "item_code": item.item_code,
                    "qty": item.qty * work_order.qty,
                    "s_warehouse": work_order.source_warehouse,
                    "basic_rate": item.rate or 0
                })
            
            consumption_entry.insert()
            
            # Create Stock Entry for finished goods
            finished_goods_entry = frappe.new_doc("Stock Entry")
            finished_goods_entry.stock_entry_type = "Manufacture"
            finished_goods_entry.work_order = work_order_name
            finished_goods_entry.work_order_estimation = self.name
            finished_goods_entry.to_warehouse = work_order.fg_warehouse
            
            # Add finished goods
            finished_goods_entry.append("items", {
                "item_code": work_order.production_item,
                "qty": work_order.qty,
                "t_warehouse": work_order.fg_warehouse,
                "basic_rate": self.cost_per_unit or 0
            })
            
            # Add waste if any
            if self.waste_kg and self.waste_kg > 0:
                finished_goods_entry.append("items", {
                    "item_code": "Waste Paper",  # Create this item in Item Master
                    "qty": self.waste_kg,
                    "t_warehouse": "Waste - WOS",  # Create this warehouse
                    "basic_rate": 0
                })
            
            finished_goods_entry.insert()
            
            # Update status
            self.status = "Production Completed"
            self.save()
            
            frappe.msgprint(_("Stock Entries created successfully for Work Order {0}").format(work_order_name))
            return {
                "consumption_entry": consumption_entry.name,
                "finished_goods_entry": finished_goods_entry.name
            }
            
        except Exception as e:
            # Log error with shorter message to avoid truncation
            error_msg = f"Stock Entry creation failed for {self.name}: {str(e)[:100]}"
            frappe.log_error(error_msg, "Work Order Estimation Error")
            frappe.throw(_("Error creating stock entries: {0}").format(str(e)))
    

    def get_cost_breakdown(self):
        """Get detailed cost breakdown for dashboard"""
        breakdown = {
            "paper_cost": self.total_paper_cost or 0,
            "process_cost": 0,
            "total_cost": self.total_cost or 0,
            "profit_margin": self.profit_margin or 0,
            "margin_amount": self.margin_amount or 0,
            "sales_price": self.sales_price or 0,
            "cost_per_unit": self.cost_per_unit or 0
        }
        
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    breakdown["process_cost"] += process.total_cost
        
        return breakdown
    
    def update_quotation_item_with_woe_reference(self):
        """Update quotation item with WOE reference when WOE is created"""
        if self.quotation_reference and self.paper_type:
            try:
                # Get the quotation
                quotation = frappe.get_doc("Quotation", self.quotation_reference)
                
                # Find the item that matches this WOE's paper type
                for item in quotation.items:
                    if item.item_code == self.paper_type:
                        # Update the quotation item with WOE reference
                        item.custom_work_order_estimation_references = self.name
                        break
                
                # Save the quotation
                quotation.save()
                frappe.db.commit()
                
                frappe.msgprint(_("Quotation item updated with WOE reference: {0}").format(self.name))
                
            except Exception as e:
                frappe.log_error(f"Error updating quotation item with WOE reference: {str(e)}")
    
    def update_quotation_item_on_status_change(self):
        """Update quotation item with cost and rate when WOE status changes to 'Estimation Done'"""
        if self.status == "Estimation Done" and self.quotation_reference and self.paper_type:
            try:
                # Get the quotation
                quotation = frappe.get_doc("Quotation", self.quotation_reference)
                
                # Find the item that matches this WOE's paper type
                for item in quotation.items:
                    if item.item_code == self.paper_type:
                        # Update the quotation item with WOE data
                        item.custom_work_order_estimation_references = self.name
                        item.custom_total_cost_from_woe = self.total_cost or 0
                        item.custom_rate_from_woe = self.cost_per_unit or 0
                        item.qty = self.quantity
                        item.rate = self.cost_per_unit or 0
                        item.amount = (self.cost_per_unit or 0) * (self.quantity or 0)
                        break
                
                # Recalculate quotation totals
                quotation.calculate_taxes_and_totals()
                
                # Save the quotation
                quotation.save()
                frappe.db.commit()
                
                frappe.msgprint(_("Quotation item updated with WOE cost data: Total Cost: {0}, Rate: {1}, Qty: {2}").format(
                    self.total_cost or 0, self.cost_per_unit or 0, self.quantity or 0
                ))
                
            except Exception as e:
                frappe.log_error(f"Error updating quotation item with WOE cost data: {str(e)}")


