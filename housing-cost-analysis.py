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
    """
    Calculate the fixed monthly mortgage payment using a standard mortgage formula.
    Returns a positive number representing the monthly outflow.
    """
    monthly_rate = (annual_rate / 100) / 12
    num_payments = years * 12
    return -pmt(monthly_rate, num_payments, principal)

def calculate_monthly_interest_and_principal(principal, annual_rate, years, payment_number):
    """
    Calculate the interest and principal portion of a specific monthly mortgage payment.
    payment_number starts at 1 for the first payment, goes up to years*12.
    Returns (interest, principal) both positive.
    """
    monthly_rate = (annual_rate / 100) / 12
    interest = -ipmt(monthly_rate, payment_number, years * 12, principal)
    principal_paid = -ppmt(monthly_rate, payment_number, years * 12, principal)
    return interest, principal_paid

def annual_property_value(condo_price, appreciation_rate, year):
    """
    Calculate the property value at the given year.
    Year starts at 1 for the first year.
    Returns the value after that many years of appreciation.
    """
    return condo_price * (1 + appreciation_rate/100)**year

def calculate_annual_costs(year, loan_amount, mortgage_rate, mortgage_years,
                           condo_price, appreciation_rate, property_tax_rate, hoa_rate):
    """
    Calculate all annual costs for a given year:
    - Mortgage: interest and principal portions
    - Property tax and HOA: adjusted for the appreciated property value each year
    Returns a dictionary with annual_interest, annual_principal,
    annual_mortgage, annual_property_tax, annual_hoa,
    and updated remaining principal.
    """
    # Determine property value this year
    current_property_value = annual_property_value(condo_price, appreciation_rate, year)

    # Monthly mortgage calculation (fixed)
    monthly_mortgage = calculate_mortgage_payment(loan_amount, mortgage_rate, mortgage_years)
    annual_mortgage = monthly_mortgage * 12

    # Break down the mortgage payments for the year into interest and principal
    annual_interest = 0
    annual_principal = 0
    start_payment_num = (year - 1) * 12 + 1
    end_payment_num = year * 12

    for payment_number in range(start_payment_num, end_payment_num + 1):
        month_interest, month_principal = calculate_monthly_interest_and_principal(
            loan_amount, mortgage_rate, mortgage_years, payment_number
        )
        annual_interest += month_interest
        annual_principal += month_principal

    # Annual property tax and HOA adjust each year based on new property value
    # property_tax_rate is annual $ per $100 of value (e.g. 0.0109 means 1.09%)
    annual_property_tax = (current_property_value * property_tax_rate)

    # HOA is a percentage per MONTH of the initial condo price.
    # So hoa_rate=0.1 means 0.1% per month of property value.
    monthly_hoa = current_property_value * (hoa_rate / 100)
    annual_hoa = monthly_hoa * 12

    return {
        "annual_interest": annual_interest,
        "annual_principal": annual_principal,
        "annual_mortgage": annual_mortgage,
        "annual_property_tax": annual_property_tax,
        "annual_hoa": annual_hoa
    }

def calculate_housing_costs(
    # Note: these values are just defaults. See __main__ for actual values.
    analysis_years,
    apartment_rent=3100,
    condo_price=1300000,
    down_payment_pct=20,
    mortgage_rate=6.5,
    mortgage_years=20,
    # property_tax_rate: decimal fraction: e.g. 0.0109 (1.09%)
    property_tax_rate=0.0109,
    # hoa_rate: interpret as monthly percentage of property value.
    # e.g. hoa_rate=0.1 means 0.1% per month.
    hoa_rate=0.1,
    federal_tax_rate=24,
    state_tax_rate=5,
    appreciation_rate=4,
    rent_increase_rate=3,
    realtor_fee_pct=5,
    capital_gains_rate=15
):
    """
    Calculate the cumulative costs for renting vs buying over a given number of years,
    including property appreciation, taxes, and sale of the condo at the end.
    Returns:
      df (DataFrame): Detailed year-by-year breakdown
      summary (DataFrame): One-row summary of final outcome
      assumptions_df (DataFrame): Table of assumptions
      metrics (dict): Key metric values for further analysis
    """
    # Column names
    COL_MAP = {
        "year": "Year",
        "apartment_cost": "Apt Rent",
        "mortgage_payment": "Mortgage\nPayment",
        "property_tax": "Property\nTax",
        "hoa": "HOA",
        "tax_savings": "Tax\nSavings",
        "net_condo_cost": "Net Condo\nCost",
        "property_value": "Property\nValue",
        "equity": "Equity",
        "remaining_mortgage": "Remaining\nMortgage"
    }
    df = pd.DataFrame(columns=COL_MAP.values())

    # Compute basic initial values
    down_payment = condo_price * (down_payment_pct * 0.01)
    # Have to sell some stocks to get the down payment, so include those in total cost
    cap_gains_tax_on_down_payment = down_payment * (capital_gains_rate * 0.01)
    loan_amount = condo_price - down_payment

    # Combined marginal tax rate for simplicity
    combined_tax_rate = (federal_tax_rate + state_tax_rate) / 100

    # Track mortgage balance
    remaining_principal = loan_amount
    total_mortgage_paid = 0

    # For accumulating total yearly tax savings
    # We'll compute tax savings each year based on that year's interest and property tax
    # (assuming all deductible for simplicity).

    # Year-by-year calculation
    for year in range(1, analysis_years + 1):
        # Calculate apartment rent for this year
        annual_apartment = apartment_rent * 12 * (1 + rent_increase_rate/100)**(year - 1)

        # Get the annual costs of owning the condo for this year
        annual_costs = calculate_annual_costs(
            year=year,
            loan_amount=loan_amount,
            mortgage_rate=mortgage_rate,
            mortgage_years=mortgage_years,
            condo_price=condo_price,
            appreciation_rate=appreciation_rate,
            property_tax_rate=property_tax_rate,
            hoa_rate=hoa_rate
        )

        # Update remaining principal after paying principal portion this year
        remaining_principal -= annual_costs["annual_principal"]
        total_mortgage_paid += annual_costs["annual_mortgage"]

        # Calculate tax savings from interest and property tax
        # Deductible amounts: interest + property tax
        deductible_amount = annual_costs["annual_interest"] + annual_costs["annual_property_tax"]
        annual_tax_savings = deductible_amount * combined_tax_rate

        # Net condo cost for the year
        net_condo_cost = (annual_costs["annual_mortgage"]
                          + annual_costs["annual_property_tax"]
                          + annual_costs["annual_hoa"]
                          - annual_tax_savings)

        # Property value and equity
        property_value = annual_property_value(condo_price, appreciation_rate, year)
        equity_built = property_value - remaining_principal

        # Populate DataFrame
        df.loc[year, COL_MAP["year"]] = year
        df.loc[year, COL_MAP["apartment_cost"]] = annual_apartment
        df.loc[year, COL_MAP["mortgage_payment"]] = annual_costs["annual_mortgage"]
        df.loc[year, COL_MAP["property_tax"]] = annual_costs["annual_property_tax"]
        df.loc[year, COL_MAP["hoa"]] = annual_costs["annual_hoa"]
        df.loc[year, COL_MAP["tax_savings"]] = annual_tax_savings
        df.loc[year, COL_MAP["net_condo_cost"]] = net_condo_cost
        df.loc[year, COL_MAP["property_value"]] = property_value
        df.loc[year, COL_MAP["equity"]] = equity_built
        df.loc[year, COL_MAP["remaining_mortgage"]] = remaining_principal

    # Final year calculations
    final_property_value = annual_property_value(condo_price, appreciation_rate, analysis_years)
    realtor_fees = final_property_value * (realtor_fee_pct / 100)
    capital_gains = max(0, final_property_value - condo_price)
    capital_gains_tax = capital_gains * (capital_gains_rate / 100)
    net_sale_proceeds = final_property_value - realtor_fees - capital_gains_tax - remaining_principal

    # Calculate total costs over entire period
    total_apartment_cost = df[COL_MAP["apartment_cost"]].sum()
    total_condo_cost = df[COL_MAP["net_condo_cost"]].sum() - net_sale_proceeds + down_payment + cap_gains_tax_on_down_payment

    # Summary DataFrame
    summary_data = {
        'Description': ['Final Property Value', 'Realtor Fees', 'Capital Gains Tax',
                        'Remaining Mortgage', 'Net Sale Proceeds', 'Total Condo Costs',
                        'Total Apartment Costs', 'Difference (Condo - Apartment)'],
        'Amount': [final_property_value, realtor_fees, capital_gains_tax,
                   remaining_principal, net_sale_proceeds, total_condo_cost,
                   total_apartment_cost, total_condo_cost - total_apartment_cost]
    }
    summary = pd.DataFrame(summary_data)

    # Assumptions
    assumptions_data = [
        ("Condo Price", f"${condo_price:,.0f}"),
        (f"Down Payment ({down_payment_pct}%)", f"${down_payment:,.0f}"),
        ("Cap Gains Tax on Down Payment", f"${cap_gains_tax_on_down_payment:,.0f}"),
        ("Mortgage Rate", f"{mortgage_rate}%"),
        ("Mortgage Term", f"{mortgage_years} years"),
        ("Property Tax Rate", f"{property_tax_rate*100:.3f}%/yr"),
        ("HOA Fee", f"{hoa_rate}%/mo of property value"),
        ("Rent Increase", f"{rent_increase_rate}%/yr"),
        ("Federal Tax Rate", f"{federal_tax_rate}%"),
        ("State Tax Rate", f"{state_tax_rate}%"),
        ("Appreciation", f"{appreciation_rate}%/yr"),
        ("Realtor Fee", f"{realtor_fee_pct}%"),
        ("Capital Gains Tax", f"{capital_gains_rate}%")
    ]
    assumptions_df = pd.DataFrame(assumptions_data, columns=['Assumption', 'Value'])

    # Formatting currency fields in df
    currency_cols = [COL_MAP["apartment_cost"], COL_MAP["mortgage_payment"], COL_MAP["property_tax"],
                     COL_MAP["hoa"], COL_MAP["tax_savings"], COL_MAP["net_condo_cost"],
                     COL_MAP["property_value"], COL_MAP["equity"], COL_MAP["remaining_mortgage"]]
    for c in currency_cols:
        df[c] = df[c].apply(lambda x: f"${x:,.0f}")

    summary['Amount'] = summary['Amount'].apply(lambda x: f"${x:,.0f}")

    metrics = {
        'total_apartment_cost': total_apartment_cost,
        'total_condo_cost': total_condo_cost,
        'final_property_value': final_property_value,
        'net_sale_proceeds': net_sale_proceeds
    }

    return df, summary, assumptions_df, metrics


def generate_cost_comparison(max_years=10, **kwargs):
    """
    Generate a DataFrame comparing total apartment vs condo costs over a range of years.
    Shows cumulative effects as the holding period extends.
    """
    comparison_data = []
    for year in range(1, max_years + 1):
        _, _, _, metrics = calculate_housing_costs(year, **kwargs)
        comparison_data.append({
            'Year': year,
            'Apartment Cost': metrics['total_apartment_cost'],
            'Condo Cost': metrics['total_condo_cost'],
            'Final Property Value': metrics['final_property_value']
        })
    return pd.DataFrame(comparison_data)


def print_net_cost_table(max_years, **kwargs):
    """
    Print a table showing the cumulative net cost for apartment vs condo for each year up to max_years.
    The apartment cost column shows the total cumulative rent paid up to that year.
    The condo cost column shows the total net cost of buying and selling at that year.
    A "*" is prepended to whichever option is cheaper each year.
    """
    comparison_df = generate_cost_comparison(max_years, **kwargs)
    formatted_rows = []

    for _, row in comparison_df.iterrows():
        year = int(row['Year'])
        apt_val = row['Apartment Cost']
        condo_val = row['Condo Cost']

        # Format as currency
        apt_str = f"${apt_val:,.0f}"
        condo_str = f"${condo_val:,.0f}"

        # Determine which is smaller and append "*"
        if apt_val < condo_val:
            apt_str = apt_str + "*"
        elif condo_val < apt_val:
            condo_str = condo_str + "*"

        formatted_rows.append([year, apt_str, condo_str])

    print("\nTotal Net Cost by Year (Cumulative Scenario)")
    print("(Assuming condo is sold in year Y)")
    print("===========================================")
    print(tabulate.tabulate(
        formatted_rows,
        headers=['Year', 'Apartment Cost', 'Condo Cost'],
        tablefmt='plain',
        showindex=False
    ))

if __name__ == "__main__":
    # Example parameters for the analysis
    ANALYSIS_YEARS = 5
    MAX_YEARS = 10
    params = {
        'apartment_rent': 3100,
        'condo_price': 1200000,
        'down_payment_pct': 20,
        'mortgage_rate': 6.5,
        'mortgage_years': 20,
        'property_tax_rate': 10.90/1000, # This is ~1.09%. We'll treat it as fraction in code: 10.90/1000=0.0109
        'hoa_rate': 0.1,    # 0.1% per month
        'federal_tax_rate': 24,
        'state_tax_rate': 5,
        'appreciation_rate': 4,
        'rent_increase_rate': 3,
        'realtor_fee_pct': 5,
        'capital_gains_rate': 15
    }

    # Generate the detailed analysis for a set number of years
    df, summary, assumptions_df, metrics = calculate_housing_costs(ANALYSIS_YEARS, **params)

    # Comparison data for multiple years
    comparison_df = generate_cost_comparison(MAX_YEARS, **params)

    # Plot the cumulative costs
    plt.figure(figsize=(12, 6))
    plt.plot(comparison_df['Year'], comparison_df['Apartment Cost']/1000, label='Apartment (Cumulative)', linewidth=2)
    plt.plot(comparison_df['Year'], comparison_df['Condo Cost']/1000, label='Condo (Net Cost)', linewidth=2)
    plt.xlabel('Years')
    plt.ylabel('Cost (Thousands)')
    plt.title('Cumulative Housing Costs Over Time')
    plt.text(0.02, 0.85, f"Apartment rent: ${params['apartment_rent']}/mo\nCondo cost: ${params['condo_price']}",
             transform=plt.gca().transAxes)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend()

    # Print assumptions, tables, and summary
    print("============================================")
    print("= Housing Cost Analysis")
    print("============================================")

    print("\nAssumptions")
    print("===========")
    print(tabulate.tabulate(assumptions_df, headers='keys', tablefmt='plain', showindex=False))

    print(f"\nDetailed Cost Analysis (First {ANALYSIS_YEARS} Years)")
    print("=========================================")
    print(tabulate.tabulate(df, headers='keys', tablefmt='plain', showindex=False))

    print(f"\nSale and Total Cost Summary After {ANALYSIS_YEARS} Years")
    print("=========================================")
    print(summary.to_string(index=False))

    # Print simplified net cost table
    print_net_cost_table(MAX_YEARS, **params)

    plt.show()
