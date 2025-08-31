# Copyright (c) 2025, Ebkar Technology & Management Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "fieldname": "name",
            "label": _("Estimation No"),
            "fieldtype": "Link",
            "options": "Work Order Estimation",
            "width": 120
        },
        {
            "fieldname": "project_name",
            "label": _("Project"),
            "fieldtype": "Data",
            "width": 150
        },
        {
            "fieldname": "client_name",
            "label": _("Client"),
            "fieldtype": "Link",
            "options": "Customer",
            "width": 120
        },
        {
            "fieldname": "quantity",
            "label": _("Quantity"),
            "fieldtype": "Int",
            "width": 80
        },
        {
            "fieldname": "total_cost",
            "label": _("Total Cost"),
            "fieldtype": "Currency",
            "width": 100
        },
        {
            "fieldname": "cost_per_unit",
            "label": _("Cost/Unit"),
            "fieldtype": "Currency",
            "width": 100
        },
        {
            "fieldname": "profit_margin",
            "label": _("Margin %"),
            "fieldtype": "Percent",
            "width": 80
        },
        {
            "fieldname": "margin_amount",
            "label": _("Margin Amount"),
            "fieldtype": "Currency",
            "width": 100
        },
        {
            "fieldname": "status",
            "label": _("Status"),
            "fieldtype": "Data",
            "width": 100
        },
        {
            "fieldname": "creation",
            "label": _("Created"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "delivery_date",
            "label": _("Delivery Date"),
            "fieldtype": "Date",
            "width": 100
        }
    ]

def get_data(filters):
    conditions = []
    
    if filters.get("from_date"):
        conditions.append(["Work Order Estimation", "creation", ">=", filters.get("from_date")])
    if filters.get("to_date"):
        conditions.append(["Work Order Estimation", "creation", "<=", filters.get("to_date")])
    if filters.get("status"):
        conditions.append(["Work Order Estimation", "status", "=", filters.get("status")])
    if filters.get("client_name"):
        conditions.append(["Work Order Estimation", "client_name", "=", filters.get("client_name")])
    
    data = frappe.get_all(
        "Work Order Estimation",
        fields=[
            "name", "project_name", "client_name", "quantity",
            "total_cost", "cost_per_unit", "profit_margin", "margin_amount",
            "status", "creation", "delivery_date"
        ],
        filters=conditions,
        order_by="creation desc"
    )
    
    return data
