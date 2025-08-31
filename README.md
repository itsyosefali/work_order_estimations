# Work Order Estimations

A comprehensive paper consumption and cost estimation tool for printing and manufacturing companies, built specifically for ERPNext.

## Overview

The Work Order Estimations app provides a complete solution for calculating paper consumption, waste allowance, production costs, and profit margins for printing jobs. It's designed to streamline the estimation process and ensure accurate cost calculations.

## Features

### 🎯 Core Functionality
- **Paper Calculations**: Automatic weight and consumption calculations based on GSM, dimensions, and quantity
- **Waste Management**: Configurable waste allowance with automatic weight calculations
- **Cost Analysis**: Comprehensive cost breakdown including paper, processes, and profit margins
- **Process Tracking**: Detailed production process costing (printing, cutting, folding, etc.)

### 📊 Smart Calculations
- **Weight per Piece**: `(length_cm × width_cm × gsm) / 100,000`
- **Waste Calculation**: `net_weight × (waste_percentage / 100)`
- **Cost per Piece**: `(total_weight × rate_per_kg) / quantity`
- **Real-time Updates**: Instant calculations as specifications change

### 🔄 Integration Path
- **Estimation → Quotation**: One-click conversion
- **Quotation → Sales Order**: Standard ERPNext flow
- **Sales Order → Work Order**: Future enhancement

### 📋 Document Management
- **Status Tracking**: Draft → Sent → Converted to Quotation → Cancelled
- **Professional Reports**: PDF generation with company branding
- **Custom Reports**: Summary reports with filtering and export options

## Installation

1. **Install the app**:
   ```bash
   bench --site [site_name] install-app work_order_estimations
   ```

2. **Migrate the site**:
   ```bash
   bench --site [site_name] migrate
   ```

3. **Build assets**:
   ```bash
   bench build --app work_order_estimations
   ```

## Usage

### Creating a Work Order Estimation

1. **Navigate to**: Work Order Estimations → Work Order Estimation → New
2. **Fill Job Details**:
   - Client Name (required)
   - Project Name (required)
   - Delivery Date (required)
   - Urgency Level
   - Sales Price (optional)

3. **Specify Paper Details**:
   - Quantity (pieces)
   - GSM (grams per square meter)
   - Length and Width (cm)
   - Finish (Matte, Glossy, etc.)
   - Waste Percentage
   - Paper Type (from Item Master)
   - Rate per KG

4. **Add Production Processes**:
   - Process Type (Printing, Cutting, Folding, etc.)
   - Details
   - Rate per Unit
   - Quantity

5. **Review Calculations**:
   - All calculations are automatic
   - Use "Refresh Calculations" button if needed
   - Check profit margins and costs

### Key Calculations

#### Paper Metrics
- **Weight per Piece**: `(length × width × gsm) / 100,000`
- **Net Weight**: `weight_per_piece × quantity`
- **Waste Weight**: `net_weight × (waste_percentage / 100)`
- **Total Weight**: `net_weight + waste_weight`

#### Cost Analysis
- **Paper Cost**: `total_weight × rate_per_kg`
- **Process Cost**: Sum of all process costs
- **Total Cost**: `paper_cost + process_cost`
- **Cost per Unit**: `total_cost / quantity`
- **Margin Amount**: `total_cost × (profit_margin / 100)`

## Doctypes

### Work Order Estimation (Main)
The primary document for creating and managing job estimations.

**Key Fields**:
- Job Details (Client, Project, Delivery Date)
- Paper Specifications (GSM, Dimensions, Type)
- Auto-calculated Metrics (Weight, Cost)
- Production Processes (Child Table)
- Cost Analysis (Total Cost, Margins)

### Estimation Process (Child Table)
Stores individual production processes and their costs.

**Fields**:
- Process Type (Printing, Cutting, etc.)
- Details
- Rate per Unit
- Quantity
- Total Cost (auto-calculated)

## Reports

### Work Order Estimation Summary
A comprehensive report showing all estimations with key metrics:
- Estimation details
- Cost breakdown
- Profit margins
- Status tracking
- Date filtering

## Print Formats

### Professional PDF Report
Includes:
- Company branding
- Complete job specifications
- Detailed calculations
- Process breakdown
- Cost analysis
- Professional styling

## Permissions

- **Sales User**: Create, read, write, delete estimations
- **Production Manager**: Full access to estimations
- **System Manager**: Administrative access

## Configuration

### Paper Types
Ensure paper types exist in the Item Master with:
- Item Group: "Paper"
- Proper pricing in the Price List

### Customers
Link estimations to existing ERPNext customers for client management.

## Future Enhancements

### Phase 2 Features
- **Auto-generate BOM**: Create Bill of Materials from estimation
- **Direct Work Order Creation**: Skip quotation step
- **Multi-paper Types**: Support for complex paper combinations
- **Machine Integration**: API integration with printing machines

### Advanced Features
- **Template System**: Save common estimation configurations
- **Bulk Operations**: Process multiple estimations
- **Advanced Analytics**: Profitability analysis and trends
- **Mobile Support**: Mobile-friendly interface

## Technical Details

### Architecture
- **Frontend**: JavaScript with real-time calculations
- **Backend**: Python with comprehensive validation
- **Database**: MySQL with optimized queries
- **Reports**: Custom report builder with filtering

### Dependencies
- ERPNext 14+
- Frappe Framework
- MySQL Database

## Support

For support and feature requests:
- **Company**: Ebkar – Technology & Management Solutions
- **Email**: admin@ebkar.com
- **Documentation**: This README and inline code comments

## License

This app is licensed under the MIT License.

## Contributing

Contributions are welcome! Please ensure:
- Code follows ERPNext/Frappe standards
- Tests are included for new features
- Documentation is updated
- Code is properly formatted

---

**Built with ❤️ for the ERPNext Community**