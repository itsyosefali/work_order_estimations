# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WorkOrderEstimationItem(Document):
    def validate(self):
        """Validate and calculate all fields"""
        self.calculate_paper_metrics()
        self.calculate_costs()
    
    def calculate_paper_metrics(self):
        """Calculate weight and paper consumption metrics"""
        if not all([self.gsm, self.length_cm, self.width_cm, self.quantity]):
            return
        
        # Calculate weight per piece (GSM * length * width / 10000) / 1000
        area_sqm = (self.length_cm * self.width_cm) / 10000  # Convert cm² to m²
        self.weight_per_piece_kg = (self.gsm * area_sqm) / 1000  # Convert grams to kg
        
        # Calculate pieces per kg
        if self.weight_per_piece_kg > 0:
            self.pieces_per_kg = 1 / self.weight_per_piece_kg
        
        # Calculate net weight needed
        self.net_weight_kg = self.weight_per_piece_kg * self.quantity
        
        # Calculate waste weight
        waste_percentage = self.waste_percentage or 0
        self.waste_kg = self.net_weight_kg * (waste_percentage / 100)
        
        # Calculate total weight including waste
        self.total_weight_kg = self.net_weight_kg + self.waste_kg
    
    def calculate_costs(self):
        """Calculate cost-related fields"""
        if not all([self.weight_per_piece_kg, self.rate_per_kg, self.total_weight_kg]):
            return
        
        # Calculate cost per piece
        self.cost_per_piece = self.weight_per_piece_kg * self.rate_per_kg
        
        # Calculate total paper cost
        self.total_paper_cost = self.total_weight_kg * self.rate_per_kg
