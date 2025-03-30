// Financial calculation functions
function calculateMortgagePayment(principal, annualRate, years) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = years * 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function calculateMonthlyInterestAndPrincipal(principal, annualRate, years, paymentNumber) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = years * 12;
    
    // Calculate remaining principal at the start of this payment
    let remainingPrincipal = principal;
    const payment = calculateMortgagePayment(principal, annualRate, years);
    
    for (let i = 1; i < paymentNumber; i++) {
        const interestPart = remainingPrincipal * monthlyRate;
        const principalPart = payment - interestPart;
        remainingPrincipal -= principalPart;
    }
    
    // Calculate interest and principal for this payment
    const interest = remainingPrincipal * monthlyRate;
    const principalPaid = payment - interest;
    
    return { interest, principalPaid };
}

function annualPropertyValue(condoPrice, appreciationRate, year) {
    return condoPrice * Math.pow(1 + appreciationRate / 100, year);
}

function calculateAnnualCosts(year, loanAmount, mortgageRate, mortgageYears,
                             condoPrice, appreciationRate, propertyTaxRate, hoaRate) {
    // Determine property value this year
    const currentPropertyValue = annualPropertyValue(condoPrice, appreciationRate, year);
    
    // Check if the mortgage is still active this year
    const mortgageActive = year <= mortgageYears;
    // Monthly mortgage calculation
    const monthlyMortgage = mortgageActive ? 
      calculateMortgagePayment(loanAmount, mortgageRate, mortgageYears) : 0;
    const annualMortgage = monthlyMortgage * 12;
    
    // Break down the mortgage payments for the year into interest and principal
    let annualInterest = 0;
    let annualPrincipal = 0;
    if (mortgageActive) {
      const startPaymentNum = (year - 1) * 12 + 1;
      const endPaymentNum = year * 12;
    
      for (let paymentNumber = startPaymentNum; paymentNumber <= endPaymentNum; paymentNumber++) {
        const { interest, principalPaid } = calculateMonthlyInterestAndPrincipal(
          loanAmount, mortgageRate, mortgageYears, paymentNumber
        );
        annualInterest += interest;
        annualPrincipal += principalPaid;
      }
    }
    
    // Annual property tax - propertyTaxRate is per $1000 of value
    const annualPropertyTax = currentPropertyValue * (propertyTaxRate / 1000);
    
    // HOA is a percentage per MONTH of the current property value
    const monthlyHoa = currentPropertyValue * (hoaRate / 100);
    const annualHoa = monthlyHoa * 12;
    
    return {
        annualInterest,
        annualPrincipal,
        annualMortgage,
        annualPropertyTax,
        annualHoa,
        mortgageActive
    };
}

function calculateHousingCosts(params) {
    const {
        analysisYears,
        apartmentRent,
        condoPrice,
        downPaymentPct,
        downPaymentSource, // Updated parameter name
        equityLoanRate,
        mortgageRate,
        mortgageYears,
        propertyTaxRate,
        hoaRate,
        federalTaxRate,
        stateTaxRate,
        appreciationRate,
        rentIncreaseRate,
        realtorFeePct,
        capitalGainsRate
    } = params;

    // Results arrays
    const yearlyData = [];

    // Compute basic initial values
    const downPayment = condoPrice * (downPaymentPct * 0.01);

    // Calculate costs based on down payment source
    const useEquityLoan = downPaymentSource === 'loan';
    const useCash = downPaymentSource === 'cash';
    const useStocks = downPaymentSource === 'stocks';

    // Capital gains tax only applies when selling stocks
    const capGainsTaxOnDownPayment = useStocks ? downPayment * (capitalGainsRate * 0.01) : 0;

    // Equity loan only when using that option
    const equityLoanAmount = useEquityLoan ? downPayment : 0;
    const equityLoanMonthlyPayment = useEquityLoan ?
        calculateMortgagePayment(equityLoanAmount, equityLoanRate, mortgageYears) : 0;
    const annualEquityLoanPayment = equityLoanMonthlyPayment * 12;

    const loanAmount = condoPrice - downPayment;

    // Combined marginal tax rate
    const combinedTaxRate = (federalTaxRate + stateTaxRate) / 100;

    // Track mortgage balance
    let remainingPrincipal = loanAmount;
    let remainingEquityLoanPrincipal = equityLoanAmount;
    let totalMortgagePaid = 0;
    let totalEquityLoanPaid = 0;
    
    // Year-by-year calculation
    for (let year = 1; year <= analysisYears; year++) {
        // Calculate apartment rent for this year
        const annualApartment = apartmentRent * 12 * Math.pow(1 + rentIncreaseRate / 100, year - 1);
        
        // Get the annual costs of owning the condo for this year
        const annualCosts = calculateAnnualCosts(
            year,
            loanAmount,
            mortgageRate,
            mortgageYears,
            condoPrice,
            appreciationRate,
            propertyTaxRate,
            hoaRate
        );
        
        // Calculate equity loan payments for this year if applicable
        let equityLoanInterest = 0;
        let equityLoanPrincipal = 0;
        
        // Check if equity loan is still active
        const equityLoanActive = useEquityLoan && year <= mortgageYears;

        if (equityLoanActive) {
            for (let paymentNumber = (year - 1) * 12 + 1; paymentNumber <= year * 12; paymentNumber++) {
                const { interest, principalPaid } = calculateMonthlyInterestAndPrincipal(
                    equityLoanAmount, equityLoanRate, mortgageYears, paymentNumber
                );
                equityLoanInterest += interest;
                equityLoanPrincipal += principalPaid;
            }
            
            remainingEquityLoanPrincipal -= equityLoanPrincipal;
            totalEquityLoanPaid += annualEquityLoanPayment;
        } else if (useEquityLoan) {
          // If we're past the loan term, set the remaining balance to 0
          remainingEquityLoanPrincipal = 0;
        }
        
        // Update remaining principal after paying principal portion this year
        remainingPrincipal -= annualCosts.annualPrincipal;
        if (!annualCosts.mortgageActive) {
          remainingPrincipal = 0; // Ensure zero balance after mortgage term
        }
        totalMortgagePaid += annualCosts.annualMortgage;
        
        // Calculate tax savings from interest and property tax
        // Note: Equity loan interest for down payment is not tax deductible
        const deductibleAmount = annualCosts.annualInterest + annualCosts.annualPropertyTax;
        const annualTaxSavings = deductibleAmount * combinedTaxRate;
        
        // Net condo cost for the year
        const netCondoCost = annualCosts.annualMortgage + 
            annualCosts.annualPropertyTax + 
            annualCosts.annualHoa + 
            (equityLoanActive ? annualEquityLoanPayment : 0) - 
            annualTaxSavings;
        
        // Property value and equity
        const propertyValue = annualPropertyValue(condoPrice, appreciationRate, year);
        const equityBuilt = propertyValue - remainingPrincipal - remainingEquityLoanPrincipal;
        
        // Add to yearly data array
        yearlyData.push({
            year,
            apartmentCost: annualApartment,
            mortgagePayment: annualCosts.annualMortgage,
            equityLoanPayment: equityLoanActive ? annualEquityLoanPayment : 0,
            propertyTax: annualCosts.annualPropertyTax,
            hoa: annualCosts.annualHoa,
            taxSavings: annualTaxSavings,
            netCondoCost,
            propertyValue,
            equity: equityBuilt,
            remainingMortgage: remainingPrincipal,
            remainingEquityLoan: remainingEquityLoanPrincipal
        });
    }
    
    // Final year calculations
    const finalPropertyValue = annualPropertyValue(condoPrice, appreciationRate, analysisYears);
    const realtorFees = finalPropertyValue * (realtorFeePct / 100);
    const capitalGains = Math.max(0, finalPropertyValue - condoPrice);
    const capitalGainsTax = capitalGains * (capitalGainsRate / 100);
    const netSaleProceeds = finalPropertyValue - realtorFees - capitalGainsTax - remainingPrincipal - remainingEquityLoanPrincipal;
    
    // Calculate total costs over entire period
    const totalApartmentCost = yearlyData.reduce((sum, data) => sum + data.apartmentCost, 0);

    // When calculating total cost, only add down payment when using cash or stocks
    const totalCondoCost = yearlyData.reduce((sum, data) => sum + data.netCondoCost, 0) -
                           netSaleProceeds +
                           (useEquityLoan ? 0 : downPayment) + // Add down payment for cash and stocks
                           capGainsTaxOnDownPayment; // Capital gains tax only for stocks
    
    // Summary data
    const summaryData = [
        { description: 'Final Property Value', amount: finalPropertyValue },
        { description: 'Realtor Fees', amount: realtorFees },
        { description: 'Capital Gains Tax', amount: capitalGainsTax },
        { description: 'Remaining Mortgage', amount: remainingPrincipal },
        { description: 'Remaining Equity Loan', amount: remainingEquityLoanPrincipal },
        { description: 'Net Sale Proceeds', amount: netSaleProceeds },
        { description: 'Total Condo Costs', amount: totalCondoCost },
        { description: 'Total Apartment Costs', amount: totalApartmentCost },
        { description: 'Difference (Condo - Apartment)', amount: totalCondoCost - totalApartmentCost }
    ];
    
    // Assumptions
    const assumptionsData = [
        { assumption: 'Condo Price', value: formatCurrency(condoPrice) },
        { assumption: `Down Payment (${downPaymentPct}%)`, value: formatCurrency(downPayment) },
        { assumption: 'Down Payment Source', value: downPaymentSource === 'cash' 
                                                  ? 'Cash on Hand'
                                                  : (downPaymentSource === 'stocks'
                                                    ? 'Sell Stocks (capital gains)'
                                                    : 'Home Equity Loan (interest not tax-deductible)') },
        // Only show capital gains tax for stocks
        ...(useStocks ? [{ assumption: 'Cap Gains Tax on Down Payment', value: formatCurrency(capGainsTaxOnDownPayment) }] : []),
        // Only show equity loan rate for loan option
        ...(useEquityLoan ? [{ assumption: 'Equity Loan Rate', value: `${equityLoanRate}%` }] : []),
        { assumption: 'Mortgage Rate', value: `${mortgageRate}%` },
        { assumption: 'Mortgage Term', value: `${mortgageYears} years` },
        { assumption: 'Property Tax Rate', value: `${propertyTaxRate} per $1000/yr` },
        { assumption: 'HOA Fee', value: `${hoaRate}%/mo of property value` },
        { assumption: 'Rent Increase', value: `${rentIncreaseRate}%/yr` },
        { assumption: 'Federal Tax Rate', value: `${federalTaxRate}%` },
        { assumption: 'State Tax Rate', value: `${stateTaxRate}%` },
        { assumption: 'Appreciation', value: `${appreciationRate}%/yr` },
        { assumption: 'Realtor Fee', value: `${realtorFeePct}%` },
        { assumption: 'Capital Gains Tax', value: `${capitalGainsRate}%` }
    ];
    
    // Metrics data
    const metrics = {
        totalApartmentCost,
        totalCondoCost,
        finalPropertyValue,
        netSaleProceeds
    };
    
    return {
        yearlyData,
        summaryData,
        assumptionsData,
        metrics
    };
}

function generateCostComparison(maxYears, params) {
    const comparisonData = [];
    
    for (let year = 1; year <= maxYears; year++) {
        const yearParams = { ...params, analysisYears: year };
        const { metrics } = calculateHousingCosts(yearParams);
        
        comparisonData.push({
            year,
            apartmentCost: metrics.totalApartmentCost,
            condoCost: metrics.totalCondoCost,
            finalPropertyValue: metrics.finalPropertyValue
        });
    }
    
    return comparisonData;
}

// Utility function for formatting currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
}
