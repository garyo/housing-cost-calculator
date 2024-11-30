# /// script
# dependencies = [
#    "pandas~=2.2.0",
#    "numpy~=1.26.0",
#    "tabulate>=0.9.0",
#    "numpy-financial>=1.0.0",
#    "matplotlib>=3.8.0"
# ]
# ///

import pandas as pd
import numpy as np
from numpy_financial import pmt, ipmt, ppmt
import tabulate
import matplotlib.pyplot as plt

def calculate_mortgage_payment(principal, annual_rate, years):
    """Calculate monthly mortgage payment"""
    monthly_rate = annual_rate / 12 / 100
    num_payments = years * 12
    return -pmt(monthly_rate, num_payments, principal)

def calculate_monthly_payment_breakdown(principal, annual_rate, years, payment_number):
    """Calculate interest and principal portions of a specific payment"""
    monthly_rate = annual_rate / 12 / 100
    interest = -ipmt(monthly_rate, payment_number, years * 12, principal)
    principal_paid = -ppmt(monthly_rate, payment_number, years * 12, principal)
    return interest, principal_paid

def calculate_housing_costs(
    analysis_years,              # Move this to first position since we'll vary it
    apartment_rent=3100,
    condo_price=1300000,        # Initial assumption - adjust to find equivalent cost
    down_payment_pct=20,
    mortgage_rate=6.5,
    mortgage_years=20,          # Length of mortgage
    property_tax_rate=10.90/1000, # Annual rate in $ per $ of value
    hoa_rate=0.1,              # Monthly percentage of purchase price
    federal_tax_rate=24,       # Assuming middle-high income bracket
    state_tax_rate=5,          # Moderate state tax assumption
    appreciation_rate=4,       # Conservative annual appreciation (more likely 5-6%)
    rent_increase_rate=3,      # Annual rent increase percentage
    realtor_fee_pct=5,         # Standard realtor commission
    capital_gains_rate=15      # Long-term capital gains tax rate
):
    # Initialize dataframe
    COL_NAMES = {
        "year": "Year",
        "apartment_cost": "Apt\nRent",
        "mortgage_payment": "Mortgage\nPayment",
        "property_tax": "Property\nTax",
        "hoa": "HOA",
        "tax_savings": "Tax\nSavings",
        "net_condo_cost": "Net Condo\nCost",
        "property_value": "Property\nValue",
        "equity": "Equity",
        "remaining_mortgage": "Remaining\nMortgage"
    }
    df = pd.DataFrame(columns=COL_NAMES.values())

    # Calculate mortgage details
    down_payment = condo_price * (down_payment_pct/100)
    loan_amount = condo_price - down_payment
    monthly_mortgage = calculate_mortgage_payment(loan_amount, mortgage_rate, mortgage_years)
    
    # Calculate monthly costs
    monthly_property_tax = (condo_price * property_tax_rate)/12
    monthly_hoa = condo_price * (hoa_rate/100)
    
    # Calculate tax deductions
    combined_tax_rate = (federal_tax_rate + state_tax_rate)/100
    
    # Track remaining mortgage principal
    remaining_principal = loan_amount
    total_mortgage_paid = 0
    
    # Calculate costs for each year
    for year in range(1, analysis_years + 1):
        # Apartment costs with annual increase
        annual_apartment = apartment_rent * 12 * (1 + rent_increase_rate/100)**(year-1)
        
        # Calculate mortgage principal and interest for the year
        annual_mortgage = monthly_mortgage * 12
        annual_interest = 0
        annual_principal = 0
        
        # Calculate exact interest and principal for each month
        for month in range(12):
            payment_number = (year - 1) * 12 + month + 1
            month_interest, month_principal = calculate_monthly_payment_breakdown(
                loan_amount, mortgage_rate, mortgage_years, payment_number
            )
            annual_interest += month_interest
            annual_principal += month_principal
        
        remaining_principal -= annual_principal
        total_mortgage_paid += annual_mortgage
        
        # Calculate tax deductions based on actual interest paid
        mortgage_interest_deduction = (annual_interest/12) * combined_tax_rate
        property_tax_deduction = monthly_property_tax * combined_tax_rate
        annual_tax_savings = (mortgage_interest_deduction + property_tax_deduction) * 12
        
        # Other annual costs
        annual_property_tax = monthly_property_tax * 12
        annual_hoa = monthly_hoa * 12
        
        # Calculate appreciation and equity
        property_value = condo_price * (1 + appreciation_rate/100)**year
        equity_built = property_value - remaining_principal
        
        # Add to dataframe
        df.loc[year, COL_NAMES["year"]] = year
        df.loc[year, COL_NAMES["apartment_cost"]] = annual_apartment
        df.loc[year, COL_NAMES["mortgage_payment"]] = annual_mortgage
        df.loc[year, COL_NAMES["property_tax"]] = annual_property_tax
        df.loc[year, COL_NAMES["hoa"]] = annual_hoa
        df.loc[year, COL_NAMES["tax_savings"]] = annual_tax_savings
        df.loc[year, COL_NAMES["net_condo_cost"]] = (annual_mortgage + annual_property_tax + annual_hoa - annual_tax_savings)
        df.loc[year, COL_NAMES["property_value"]] = property_value
        df.loc[year, COL_NAMES["equity"]] = equity_built
        df.loc[year, COL_NAMES["remaining_mortgage"]] = remaining_principal
    
    # Calculate sale costs and proceeds
    final_property_value = condo_price * (1 + appreciation_rate/100)**analysis_years
    realtor_fees = final_property_value * (realtor_fee_pct/100)
    capital_gains = max(0, final_property_value - condo_price)  # Exclude primary residence exemption for simplicity
    capital_gains_tax = capital_gains * (capital_gains_rate/100)
    net_sale_proceeds = final_property_value - realtor_fees - capital_gains_tax - remaining_principal
    
    # Calculate total costs over entire period
    total_payments = total_mortgage_paid + (annual_property_tax * analysis_years) + (annual_hoa * analysis_years)
    total_tax_savings = annual_tax_savings * analysis_years
    total_cost = total_payments - total_tax_savings - net_sale_proceeds + down_payment
    total_apartment_cost = annual_apartment * analysis_years
    
    # Add summary row
    summary = pd.DataFrame({
        'Description': ['Final Property Value', 'Realtor Fees', 'Capital Gains Tax', 
                       'Remaining Mortgage', 'Net Sale Proceeds', 'Total Housing Costs',
                       'Total Apartment Costs', 'Difference'],
        'Amount': [final_property_value, realtor_fees, capital_gains_tax,
                  remaining_principal, net_sale_proceeds, total_cost,
                  total_apartment_cost, total_cost - total_apartment_cost]
    })
    
    # Format numbers
    for col in df.columns:
        if col != 'Year':
            df[col] = df[col].round(0)
            df[col] = df[col].apply(lambda x: f"${x:,.0f}")
    
    summary['Amount'] = summary['Amount'].round(0)
    summary['Amount'] = summary['Amount'].apply(lambda x: f"${x:,.0f}")

    # Create and display assumptions table
    assumptions = {
        'Condo Price': f"${condo_price:,}",
        'Down Payment': f"{down_payment_pct}% = ${condo_price*down_payment_pct/100.0/1000:.0f}k",
        'Mortgage Rate': f"{mortgage_rate}%",
        'Mortgage Term': f"{mortgage_years} years",
        'Property Tax': f"{property_tax_rate*1000:.2f}/1000",
        'HOA Fee': f"{hoa_rate}%/mo",
        'Rent Increase': f"{rent_increase_rate}%/yr",
        'Federal Tax': f"{federal_tax_rate}%",
        'State Tax': f"{state_tax_rate}%",
        'Appreciation': f"{appreciation_rate}%/yr",
        'Realtor Fee': f"{realtor_fee_pct}%",
        'Cap Gains': f"{capital_gains_rate}%"
    }

    # Convert assumptions to DataFrame for tabulate
    assumptions_df = pd.DataFrame([
        [k, v] for k, v in list(assumptions.items())[:len(assumptions)//2]
    ] + [['', '']] * (len(assumptions) % 2))  # Padding for odd number of items
    assumptions_df2 = pd.DataFrame([
        [k, v] for k, v in list(assumptions.items())[len(assumptions)//2:]
    ] + [['', '']] * (len(assumptions) % 2))
    assumptions_df = pd.concat([assumptions_df, assumptions_df2], axis=1)

    # Return metrics for comparison
    metrics = {
        'total_apartment_cost': total_apartment_cost,
        'total_condo_cost': total_cost,
        'final_property_value': final_property_value,
        'net_sale_proceeds': net_sale_proceeds
    }
    
    return df, summary, assumptions_df, metrics

def generate_cost_comparison(max_years=10, **kwargs):
    """Generate year-by-year cost comparison"""
    years = range(1, max_years + 1)
    comparison_data = []
    
    for year in years:
        _, _, _, metrics = calculate_housing_costs(year, **kwargs)
        comparison_data.append({
            'Year': year,
            'Apartment Cost': metrics['total_apartment_cost'],
            'Condo Cost': metrics['total_condo_cost'],
            'Property Value': metrics['final_property_value']
        })
    
    return pd.DataFrame(comparison_data)

# Main analysis and output
if __name__ == "__main__":
    # Parameters for the analysis
    ANALYSIS_YEARS = 10
    params = {
        'apartment_rent': 3000,
        'condo_price': 1000000,
        'down_payment_pct': 20,
        'mortgage_rate': 6.5,
        'mortgage_years': 20,
        'property_tax_rate': 10.90/1000,
        'hoa_rate': 0.1,
        'federal_tax_rate': 24,
        'state_tax_rate': 5,
        'appreciation_rate': 4,
        'rent_increase_rate': 3,
        'realtor_fee_pct': 5,
        'capital_gains_rate': 15
    }
    
    # Generate detailed analysis for the specified year
    df, summary, assumptions_df, metrics = calculate_housing_costs(ANALYSIS_YEARS, **params)
    
    # Generate comparison data
    comparison_df = generate_cost_comparison(20, **params)
    
    # Create the comparison plot
    plt.figure(figsize=(12, 6))
    plt.plot(comparison_df['Year'], comparison_df['Apartment Cost']/1000, 
             label='Apartment (Cumulative)', linewidth=2)
    plt.plot(comparison_df['Year'], comparison_df['Condo Cost']/1000, 
             label='Condo (Net Cost)', linewidth=2)
    # plt.plot(comparison_df['Year'], comparison_df['Property Value']/1000, 
    #          label='Property Value', linewidth=2)

    plt.xlabel('Years')
    plt.ylabel('Cost (Thousands)')
    plt.title('Cumulative Housing Costs Over Time')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend()
    
    # Print all results
    print("============================================")
    print("= Housing Cost Analysis")
    print("============================================")

    print("\nAssumptions")
    print("===========")
    print(tabulate.tabulate(assumptions_df, tablefmt='plain', showindex=False))

    print(f"\nDetailed Cost Analysis (First {ANALYSIS_YEARS} Years)")
    print("=========================================")
    print(tabulate.tabulate(df, headers='keys', tablefmt='plain', showindex=False))

    print("\nSale and Total Cost Summary")
    print("===========================")
    print(summary.to_string(index=False))

    show_year_by_year = False
    if show_year_by_year:
        print("\nYear by Year Comparison")
        print("=======================")
        comparison_display = comparison_df.copy()
        for col in ['Apartment Cost', 'Condo Cost', 'Property Value']:
            comparison_display[col] = comparison_display[col].apply(lambda x: f"${x/1000:.0f}k")
        print(tabulate.tabulate(comparison_display, headers='keys', tablefmt='plain', showindex=False))

    plt.show()
