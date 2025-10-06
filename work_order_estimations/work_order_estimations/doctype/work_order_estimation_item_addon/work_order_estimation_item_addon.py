# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WorkOrderEstimationItemAddon(Document):
    def validate(self):
        """Validate that the appropriate field is filled based on addon type"""
        if self.addon_type == "Wrapper" and not self.wrapper_item:
            frappe.throw("Wrapper Item is required when Addon Type is Wrapper")
        elif self.addon_type == "Color" and not self.color_item:
            frappe.throw("Color is required when Addon Type is Color")
        elif self.addon_type == "Handle" and not self.handle_item:
            frappe.throw("Handle Item is required when Addon Type is Handle")
    
    def before_save(self):
        """Populate item_name from the linked item"""
        if self.item:
            try:
                item = frappe.get_doc("Item", self.item)
                self.item_name = item.item_name or item.name
            except:
                self.item_name = self.item
