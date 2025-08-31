# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class EstimationProcess(Document):
    def validate(self):
        """Calculate total cost when rate or quantity changes"""
        if self.rate and self.qty:
            self.total_cost = self.rate * self.qty
