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
            # Convert string values to float for calculations
            quantity = float(self.quantity) if isinstance(self.quantity, str) else self.quantity
            gsm = float(self.gsm) if isinstance(self.gsm, str) else self.gsm
            length_cm = float(self.length_cm) if isinstance(self.length_cm, str) else self.length_cm
            width_cm = float(self.width_cm) if isinstance(self.width_cm, str) else self.width_cm
            
            # Weight per piece in kg: (length_cm * width_cm * gsm) / 100000
            self.weight_per_piece_kg = (length_cm * width_cm * gsm) / 100000
            
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
        
        # Process costs
        total_process_cost = 0
        if self.estimation_processes:
            for process in self.estimation_processes:
                if process.total_cost:
                    total_process_cost += process.total_cost
        
        # Total cost
        self.total_cost = self.total_paper_cost + total_process_cost
        
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
    

