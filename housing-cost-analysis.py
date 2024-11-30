# /// script
# dependencies = [
#    "pandas~=2.2.0",
#    "numpy~=1.26.0",
#    "tabulate>=0.9.0"
# ]
# ///

import pandas as pd
import numpy as np
import tabulate

def calculate_housing_costs(
    apartment_rent=3000,
    condo_price=1000000,          # Initial assumption - adjust to find equivalent cost
    down_payment_pct=20,
    mortgage_rate=6.5,
    property_tax_rate=10.90/1000, # Annual rate in $ per $ of value
    hoa_rate=0.1,                 # Monthly percentage of purchase price
    federal_tax_rate=24,          # Assuming middle-high income bracket
    state_tax_rate=5,             # Moderate state tax assumption
    appreciation_rate=4,          # Conservative annual appreciation (more likely 5-6%)
    analysis_years=10,
    realtor_fee_pct=5,            # Standard realtor commission
    capital_gains_rate=15,        # Long-term capital gains tax rate
    initial_interest_portion=0.85 # Assuming 85% of payment is interest initially (w/ 20% down pmt)
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
    monthly_rate = mortgage_rate/12/100
    num_payments = 30 * 12  # 30-year mortgage
    monthly_mortgage = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # Calculate monthly costs
    monthly_property_tax = (condo_price * property_tax_rate)/12
    monthly_hoa = condo_price * (hoa_rate/100)
    
    # Calculate tax deductions
    combined_tax_rate = (federal_tax_rate + state_tax_rate)/100
    mortgage_interest_deduction = monthly_mortgage * initial_interest_portion * combined_tax_rate
    property_tax_deduction = monthly_property_tax * combined_tax_rate
    
    # Track remaining mortgage principal
    remaining_principal = loan_amount
    total_mortgage_paid = 0
    interest_portion = initial_interest_portion
    
    # Calculate costs for each year
    for year in range(1, analysis_years + 1):
        # Apartment costs
        annual_apartment = apartment_rent * 12
        
        # Calculate mortgage principal and interest for the year
        annual_mortgage = monthly_mortgage * 12
        annual_interest = annual_mortgage * interest_portion
        annual_principal = annual_mortgage - annual_interest
        remaining_principal -= annual_principal
        total_mortgage_paid += annual_mortgage
        interest_portion = max(0.5, interest_portion - 0.05)  # Decrease interest portion each year
        
        # Other annual costs
        annual_property_tax = monthly_property_tax * 12
        annual_hoa = monthly_hoa * 12
        annual_tax_savings = (mortgage_interest_deduction + property_tax_deduction) * 12
        
        # Calculate appreciation
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
    
    # Before printing, set pandas display options
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', None)

    # Create and display assumptions table
    assumptions = {
        'Condo Price': f"${condo_price:,}",
        'Down Payment': f"{down_payment_pct}% = ${condo_price*down_payment_pct/100.0/1000:.0f}k",
        'Mortgage Rate': f"{mortgage_rate}%",
        'Property Tax': f"{property_tax_rate*1000:.2f}/1000",
        'HOA Fee': f"{hoa_rate}%/mo",
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

    # Return everything for the main function
    return df, summary, assumptions_df

# Generate analysis and print results
df, summary, assumptions_df = calculate_housing_costs()

print("============================================")
print("= Housing Cost Analysis (5-Year Comparison)")
print("============================================")

print("\nAssumptions")
print("===========")
print(tabulate.tabulate(assumptions_df, tablefmt='plain', showindex=False))

print("\nCost Analysis")
print("=========================================")
print(tabulate.tabulate(df, headers='keys', tablefmt='plain', showindex=False))

print("\nSale and Total Cost Summary")
print("===========================")
print(summary.to_string(index=False))
