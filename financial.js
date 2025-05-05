// Financial calculation functions
function calculateMortgagePayment(principal, annualRate, years) {
    const numPayments = years * 12;
    
    // Handle 0% interest rate (avoid divide-by-zero)
    if (annualRate === 0) {
        return principal / numPayments;
    }
    
    // Standard formula for non-zero interest rates
    const monthlyRate = (annualRate / 100) / 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculate Internal Rate of Return (IRR) for real estate investment
 * @param {Array} cashFlows - Array of cash flows, starting with the initial investment (negative)
 * @returns {number} The IRR as a percentage
 */
function calculateIRR(cashFlows) {
    // IRR cannot be calculated with all-positive or all-negative cash flows
    let hasPositive = false;
    let hasNegative = false;
    
    for (const flow of cashFlows) {
        if (flow > 0) hasPositive = true;
        if (flow < 0) hasNegative = true;
        if (hasPositive && hasNegative) break;
    }
    
    if (!hasPositive || !hasNegative) {
        return NaN;
    }
    
    // Newton-Raphson method to find IRR
    const maxIterations = 1000;
    const tolerance = 0.000001;
    
    let guess = 0.1; // Initial guess (10%)
    
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;
        
        for (let j = 0; j < cashFlows.length; j++) {
            const flow = cashFlows[j];
            const denominator = Math.pow(1 + guess, j);
            
            npv += flow / denominator;
            derivative -= j * flow / Math.pow(1 + guess, j + 1);
        }
        
        // Break if NPV is close enough to zero
        if (Math.abs(npv) < tolerance) {
            return guess * 100; // Convert to percentage
        }
        
        // Avoid division by zero or very small derivative
        if (Math.abs(derivative) < tolerance) {
            break;
        }
        
        // Update guess using Newton-Raphson formula
        guess = guess - npv / derivative;
        
        // Check for non-convergence or invalid results
        if (guess < -1 || isNaN(guess) || !isFinite(guess)) {
            return NaN;
        }
    }
    
    // Return as percentage
    return guess * 100;
}

function calculateMonthlyInterestAndPrincipal(principal, annualRate, years, paymentNumber) {
    const payment = calculateMortgagePayment(principal, annualRate, years);
    
    // Handle 0% interest rate
    if (annualRate === 0) {
        return {
            interest: 0,
            principalPaid: payment
        };
    }
    
    const monthlyRate = (annualRate / 100) / 12;

    // Calculate remaining principal at the start of this payment
    let remainingPrincipal = principal;

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
    // Handle zero or negative appreciation rates properly
    if (appreciationRate <= 0) {
        return condoPrice * Math.pow(1 + appreciationRate / 100, year);
    }
    
    // For positive appreciation, use standard compound growth formula
    return condoPrice * Math.pow(1 + appreciationRate / 100, year);
}

/**
 * Calculate loan payments for a given year
 * @param {number} year - Current year in analysis
 * @param {number} loanAmount - Original loan amount
 * @param {number} annualRate - Interest rate in percentage
 * @param {number} loanYears - Term of loan in years
 * @returns {Object} Loan payment details for this year
 */
function calculateLoanPayments(year, loanAmount, annualRate, loanYears) {
    // Check if the loan is still active this year
    const loanActive = year <= loanYears;

    // If loan amount is 0, short-circuit with zeros
    if (loanAmount === 0) {
        return {
            annualInterest: 0,
            annualPrincipal: 0,
            annualPayment: 0,
            loanActive: false
        };
    }

    // Monthly loan calculation
    const monthlyPayment = loanActive ?
        calculateMortgagePayment(loanAmount, annualRate, loanYears) : 0;
    const annualPayment = monthlyPayment * 12;

    // Break down the loan payments for the year into interest and principal
    let annualInterest = 0;
    let annualPrincipal = 0;

    if (loanActive) {
        // Special case for 0% interest
        if (annualRate === 0) {
            annualInterest = 0;
            annualPrincipal = annualPayment;
        } else {
            const startPaymentNum = (year - 1) * 12 + 1;
            const endPaymentNum = year * 12;

            for (let paymentNumber = startPaymentNum; paymentNumber <= endPaymentNum; paymentNumber++) {
                const { interest, principalPaid } = calculateMonthlyInterestAndPrincipal(
                    loanAmount, annualRate, loanYears, paymentNumber
                );
                annualInterest += interest;
                annualPrincipal += principalPaid;
            }
        }
    }

    return {
        annualInterest,
        annualPrincipal,
        annualPayment,
        loanActive
    };
}

function calculateAnnualCosts(year, loanAmount, mortgageRate, mortgageYears,
                             condoPrice, appreciationRate, propertyTaxRate, hoaRate, insuranceRate,
                             heatingCost, maintenanceCost) {
    // Determine property value this year
    const currentPropertyValue = annualPropertyValue(condoPrice, appreciationRate, year);

    // Calculate mortgage payments
    const mortgagePayments = calculateLoanPayments(year, loanAmount, mortgageRate, mortgageYears);

    // Annual property tax - propertyTaxRate is per $1000 of value
    const annualPropertyTax = currentPropertyValue * (propertyTaxRate / 1000);

    // HOA is a percentage per MONTH of the current property value
    const monthlyHoa = currentPropertyValue * (hoaRate / 100);
    const annualHoa = monthlyHoa * 12;
    
    // Homeowners insurance is a percentage per YEAR of the current property value
    const annualInsurance = currentPropertyValue * (insuranceRate / 100);
    
    // Heating and maintenance costs are fixed monthly amounts
    const annualHeating = heatingCost * 12;
    const annualMaintenance = maintenanceCost * 12;

    return {
        annualInterest: mortgagePayments.annualInterest,
        annualPrincipal: mortgagePayments.annualPrincipal,
        annualMortgage: mortgagePayments.annualPayment,
        annualPropertyTax,
        annualHoa,
        annualInsurance,
        annualHeating,
        annualMaintenance,
        mortgageActive: mortgagePayments.loanActive
    };
}

/**
 * Apply present value discount to a value based on year
 * @param {number} value - The value to discount
 * @param {number} year - The year of the value
 * @param {number} discountRate - Annual discount rate in percent
 * @returns {number} The present value of the amount
 */
function calculatePresentValue(value, year, discountRate) {
    return value / Math.pow(1 + discountRate / 100, year);
}

function calculateHousingCosts(params) {
    const {
        analysisYears,
        apartmentRent,
        condoPrice,
        downPaymentPct,
        downPaymentSource,
        heatingCost,
        maintenanceCost,
        equityLoanRate,
        equityLoanYears,
        mortgageRate,
        mortgageYears,
        propertyTaxRate,
        hoaRate,
        insuranceRate,
        federalTaxRate,
        stateTaxRate,
        appreciationRate,
        rentIncreaseRate,
        realtorFeePct,
        capitalGainsRate,
        stockGainPct,
        discountRate,
        useTodaysDollars,
        isPrimaryResidence // New parameter for primary residence status
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
    const stockGainAmount = useStocks ? downPayment * (stockGainPct / 100) : 0;
    const capGainsTaxOnDownPayment = useStocks ? stockGainAmount * (capitalGainsRate * 0.01) : 0;

    // Loan, only when using that option
    const equityLoanAmount = useEquityLoan ? downPayment : 0;
    const loanAmount = condoPrice - downPayment;

    // Combined marginal tax rate
    const combinedTaxRate = (federalTaxRate + stateTaxRate) / 100;

    // Track mortgage balance
    let remainingPrincipal = loanAmount;
    let remainingEquityLoanPrincipal = equityLoanAmount;
    let totalMortgagePaid = 0;
    let totalEquityLoanPaid = 0;

    // Calculate initial expenses (down payment and any taxes on it)
    const initialExpenses = (useEquityLoan ? 0 : downPayment) + capGainsTaxOnDownPayment;

    // Year-by-year calculation
    for (let year = 1; year <= analysisYears; year++) {
        // Calculate apartment rent for this year
        const annualApartment = apartmentRent * 12 * Math.pow(1 + rentIncreaseRate / 100, year - 1);

        // Adjust heating and maintenance costs for inflation based on years passed
        // Using a fixed 2% inflation rate for these costs
        const inflationFactor = Math.pow(1.02, year - 1);
        const inflationAdjustedHeating = heatingCost * inflationFactor;
        const inflationAdjustedMaintenance = maintenanceCost * inflationFactor;

        // Get the annual costs of owning the condo for this year
        const annualCosts = calculateAnnualCosts(
            year,
            loanAmount,
            mortgageRate,
            mortgageYears,
            condoPrice,
            appreciationRate,
            propertyTaxRate,
            hoaRate,
            insuranceRate,
            inflationAdjustedHeating,
            inflationAdjustedMaintenance
        );

        // Calculate equity loan payments for this year if applicable
        let equityLoanPayments = { annualInterest: 0, annualPrincipal: 0, annualPayment: 0, loanActive: false };

        if (useEquityLoan) {
            equityLoanPayments = calculateLoanPayments(
                year,
                equityLoanAmount,
                equityLoanRate,
                equityLoanYears
            );

            if (equityLoanPayments.loanActive) {
                remainingEquityLoanPrincipal -= equityLoanPayments.annualPrincipal;
                totalEquityLoanPaid += equityLoanPayments.annualPayment;
            } else {
                remainingEquityLoanPrincipal = 0;
            }
        }

        // Update remaining principal after paying principal portion this year
        if (annualCosts.mortgageActive) {
            remainingPrincipal -= annualCosts.annualPrincipal;
        } else {
            remainingPrincipal = 0;
        }
        totalMortgagePaid += annualCosts.annualMortgage;

        // Calculate tax savings from interest and property tax
        // Apply SALT and mortgage interest deduction limits
        
        // SALT deduction limit - $10,000 cap on state/local tax deductions
        const saltDeductionLimit = 10000;
        // Mortgage interest deduction limit - interest on up to $750,000 of acquisition debt
        const mortgageInterestDeductionLimit = 750000;
        
        // Calculate estimated state income tax (rough approximation, this would typically depend on income)
        // We'll use a rough estimate based on a percentage of the mortgage/property costs as a proxy for income level
        const approximateIncome = (annualCosts.annualMortgage + annualCosts.annualPropertyTax) * 4; // Rough estimate
        const estimatedStateIncomeTax = approximateIncome * (stateTaxRate / 100);
        
        // Apply SALT deduction limit to COMBINED state income tax and property tax
        const totalStateLocalTaxes = estimatedStateIncomeTax + annualCosts.annualPropertyTax;
        const deductiblePropertyTax = Math.min(totalStateLocalTaxes, saltDeductionLimit);
        
        // Fix mortgage interest deduction calculation for loans over $750,000
        let deductibleMortgageInterest;
        if (loanAmount <= mortgageInterestDeductionLimit) {
            // If loan is under the limit, all interest is deductible
            deductibleMortgageInterest = annualCosts.annualInterest;
        } else {
            // Only interest on the first $750K is deductible - pro-rate based on remaining balances
            // This is an approximation - a truly accurate calculation would track separate balances
            const nonDeductiblePortion = Math.max(0, (remainingPrincipal - mortgageInterestDeductionLimit) / remainingPrincipal);
            deductibleMortgageInterest = annualCosts.annualInterest * (1 - nonDeductiblePortion);
        }
        
        // Note: loan interest for down payment is not tax deductible
        const deductibleAmount = deductibleMortgageInterest + deductiblePropertyTax;
        const annualTaxSavings = deductibleAmount * combinedTaxRate;

        // Net condo cost for the year
        const netCondoCost = annualCosts.annualMortgage +
            annualCosts.annualPropertyTax +
            annualCosts.annualHoa +
            annualCosts.annualInsurance +
            annualCosts.annualHeating +
            annualCosts.annualMaintenance +
            equityLoanPayments.annualPayment -
            annualTaxSavings;

        // Property value and equity (prevent negative equity)
        const propertyValue = annualPropertyValue(condoPrice, appreciationRate, year);
        const equityBuilt = Math.max(0, propertyValue - remainingPrincipal - remainingEquityLoanPrincipal);

        // Calculate investment metrics

        // Calculate yearly IRR - what would the IRR be if we sold at this point
        const yearIRRCashFlows = [];
        
        // Initial investment (negative cash flow)
        yearIRRCashFlows.push(-initialExpenses);
        
        // Add all cash flows up to the current year
        for (let i = 0; i < year; i++) {
            // For past years, use the actual yearlyData we've already calculated
            if (i < yearlyData.length) {
                yearIRRCashFlows.push(-yearlyData[i].netCondoCost);
            } else {
                // For the current year
                yearIRRCashFlows.push(-netCondoCost);
            }
        }
        
        // Add potential sale proceeds for the final cash flow in this year
        const currentSaleValue = propertyValue;
        const currentRealtorFees = currentSaleValue * (realtorFeePct / 100);
        
        // Calculate capital gains tax for current year
        const currentCapitalGains = Math.max(0, currentSaleValue - condoPrice);
        let currentTaxableCapitalGains = currentCapitalGains;
        
        // Apply primary residence exclusion if applicable
        if (isPrimaryResidence && currentCapitalGains > 0) {
            const primaryResidenceExclusion = 250000;
            currentTaxableCapitalGains = Math.max(0, currentCapitalGains - primaryResidenceExclusion);
        }
        
        const currentCapitalGainsTax = currentTaxableCapitalGains * (capitalGainsRate / 100);
        const currentNetSaleProceeds = currentSaleValue - currentRealtorFees - currentCapitalGainsTax - 
                                       remainingPrincipal - remainingEquityLoanPrincipal;
        
        // Adjust the last cash flow to include the potential sale proceeds
        yearIRRCashFlows[yearIRRCashFlows.length - 1] += currentNetSaleProceeds;
        
        // Calculate the yearly IRR
        const yearIrr = calculateIRR(yearIRRCashFlows);
        
        // Add to yearly data array
        yearlyData.push({
            year,
            apartmentCost: annualApartment,
            mortgagePayment: annualCosts.annualMortgage,
            equityLoanPayment: equityLoanPayments.annualPayment,
            propertyTax: annualCosts.annualPropertyTax,
            hoa: annualCosts.annualHoa,
            insurance: annualCosts.annualInsurance,
            heating: annualCosts.annualHeating,
            maintenance: annualCosts.annualMaintenance,
            taxSavings: annualTaxSavings,
            netCondoCost,
            propertyValue,
            equity: equityBuilt,
            remainingMortgage: remainingPrincipal,
            remainingEquityLoan: remainingEquityLoanPrincipal,
            irr: yearIrr, // Add IRR for this year
        });
    }

    // Final year calculations
    const finalPropertyValue = annualPropertyValue(condoPrice, appreciationRate, analysisYears);
    const realtorFees = finalPropertyValue * (realtorFeePct / 100);
    
    // Calculate capital gains tax, applying primary residence exclusion if applicable
    const capitalGains = Math.max(0, finalPropertyValue - condoPrice);
    let taxableCapitalGains = capitalGains;
    
    // Apply primary residence exclusion if enabled
    // Standard exclusion is $250,000 for single, $500,000 for married filing jointly
    // We'll use $250,000 as a default exclusion amount
    if (isPrimaryResidence && capitalGains > 0) {
        const primaryResidenceExclusion = 250000;
        taxableCapitalGains = Math.max(0, capitalGains - primaryResidenceExclusion);
    }
    
    const capitalGainsTax = taxableCapitalGains * (capitalGainsRate / 100);
    const netSaleProceeds = finalPropertyValue - realtorFees - capitalGainsTax - remainingPrincipal - remainingEquityLoanPrincipal;

    // Store the sale-related amounts for year-specific calculations
    const saleData = {
        finalPropertyValue,
        realtorFees,
        capitalGainsTax,
        remainingPrincipal,
        remainingEquityLoanPrincipal,
        netSaleProceeds
    };

    // Calculate total costs over entire period
    const totalApartmentCost = yearlyData.reduce((sum, data) => sum + data.apartmentCost, 0);

    // When calculating total cost, only add down payment when using cash or stocks
    const totalCondoCost = yearlyData.reduce((sum, data) => sum + data.netCondoCost, 0) -
                           netSaleProceeds +
                           initialExpenses;

    // Calculate Internal Rate of Return (IRR)
    // Prepare cash flow array for IRR calculation
    const cashFlows = [];
    
    // Initial investment (negative cash flow)
    cashFlows.push(-initialExpenses);  // This is safe because initialExpenses is defined earlier
    
    // Annual cash flows (negative for ownership costs, not counting equity)
    for (let i = 0; i < yearlyData.length; i++) {
        cashFlows.push(-yearlyData[i].netCondoCost);
    }
    
    // Final year includes the sale proceeds (positive cash flow)
    cashFlows[cashFlows.length - 1] += netSaleProceeds;
    
    // Calculate IRR
    const irr = calculateIRR(cashFlows);
    
    // Summary data
    const summaryData = [
        { description: 'Final Property Value', amount: finalPropertyValue },
        { description: 'Realtor Fees', amount: realtorFees },
        { description: 'Capital Gains Tax', amount: capitalGainsTax },
        { description: 'Remaining Mortgage', amount: remainingPrincipal },
        { description: 'Remaining Loan', amount: remainingEquityLoanPrincipal },
        { description: 'Net Sale Proceeds', amount: netSaleProceeds },
        { description: 'Total Condo Costs', amount: totalCondoCost },
        { description: 'Total Apartment Costs', amount: totalApartmentCost },
        { description: 'Difference (Condo - Apartment)', amount: totalCondoCost - totalApartmentCost },
        { description: 'Investment Return (IRR)', amount: irr, isPercentage: true },
    ];

    // Assumptions
    const assumptionsData = [
        { assumption: 'Condo Price', value: formatCurrency(condoPrice) },
        { assumption: `Down Payment (${downPaymentPct}%)`, value: formatCurrency(downPayment) },
        { assumption: 'Down Payment Source', value: downPaymentSource === 'cash'
                                                  ? 'Cash on Hand'
                                                  : (downPaymentSource === 'stocks'
                                                    ? 'Sell Stocks (capital gains)'
                                                    : 'Loan (interest not tax-deductible)') },
        // Only show capital gains tax for stocks
        ...(useStocks ? [{ assumption: 'Cap Gains Tax on Down Payment', value: formatCurrency(capGainsTaxOnDownPayment) }] : []),
        // Only show equity loan rate and term for loan option
        ...(useEquityLoan ? [
            { assumption: 'Loan Rate', value: `${equityLoanRate}%` },
            { assumption: 'Loan Term', value: `${equityLoanYears} years` }
        ] : []),
        { assumption: 'Mortgage Rate', value: `${mortgageRate}%` },
        { assumption: 'Mortgage Term', value: `${mortgageYears} years` },
        { assumption: 'Property Tax Rate', value: `${propertyTaxRate} per $1000/yr` },
        { assumption: 'HOA Fee', value: `${hoaRate}%/mo of property value (${formatCurrency(condoPrice * (hoaRate / 100))}/month)` },
        { assumption: 'Heating Cost', value: `${formatCurrency(heatingCost)}/month (with 2% annual inflation)` },
        { assumption: 'Maintenance Cost', value: `${formatCurrency(maintenanceCost)}/month (with 2% annual inflation)` },
        { assumption: 'Homeowners Insurance', value: `${insuranceRate}% of property value/yr` },
        { assumption: 'Rent Increase', value: `${rentIncreaseRate}%/yr` },
        { assumption: 'Federal Tax Rate', value: `${federalTaxRate}%` },
        { assumption: 'State Tax Rate', value: `${stateTaxRate}%` },
        { assumption: 'SALT Deduction Limit', value: formatCurrency(10000) },
        { assumption: 'Mortgage Interest Deduction Limit', value: `Interest on up to ${formatCurrency(750000)}` },
        { assumption: 'Appreciation', value: `${appreciationRate}%/yr` },
        { assumption: 'Realtor Fee', value: `${realtorFeePct}%` },
        { assumption: 'Primary Residence', value: isPrimaryResidence ? 'Yes (eligible for capital gains exclusion)' : 'No' },
        { assumption: 'Capital Gains Tax', value: `${capitalGainsRate}%${isPrimaryResidence ? ' (after $250K exclusion)' : ''}` }
    ];

    // Metrics data
    const metrics = {
        totalApartmentCost,
        totalCondoCost,
        finalPropertyValue,
        netSaleProceeds,
        initialExpenses,
        saleData,
        yearlyData
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
    const useTodaysDollars = params.useTodaysDollars || false;
    const discountRate = params.discountRate || 0;
    
    for (let year = 1; year <= maxYears; year++) {
        const yearParams = { ...params, analysisYears: year };
        const { metrics } = calculateHousingCosts(yearParams);
        
        let apartmentCost, condoCost, propertyValue;
        
        if (useTodaysDollars && discountRate > 0) {
            // For today's dollars calculation, we need to handle each component individually
            
            // Initial expenses (down payment, etc.) are in year 0
            const discountedInitialExpenses = calculatePresentValue(metrics.initialExpenses, 0, discountRate);
            
            // Annual costs need to be discounted by their respective years
            const discountedYearlyCosts = metrics.yearlyData.reduce((sum, data, index) => {
                const yearNumber = index + 1; // because array is 0-indexed but years start at 1
                return sum + calculatePresentValue(data.netCondoCost, yearNumber, discountRate);
            }, 0);
            
            // Sale proceeds happen in the final year
            const saleYear = year;
            const discountedSaleProceeds = calculatePresentValue(metrics.saleData.netSaleProceeds, saleYear, discountRate);
            
            // Final property value also happens in the final year
            propertyValue = calculatePresentValue(metrics.finalPropertyValue, saleYear, discountRate);
            
            // Total apartment costs also need year-by-year discounting
            apartmentCost = metrics.yearlyData.reduce((sum, data, index) => {
                const yearNumber = index + 1;
                return sum + calculatePresentValue(data.apartmentCost, yearNumber, discountRate);
            }, 0);
            
            // Total condo cost is initial expenses + annual costs - sale proceeds
            condoCost = discountedInitialExpenses + discountedYearlyCosts - discountedSaleProceeds;
        } else {
            // Normal case - no discounting
            apartmentCost = metrics.totalApartmentCost;
            condoCost = metrics.totalCondoCost;
            propertyValue = metrics.finalPropertyValue;
        }
        
        comparisonData.push({
            year,
            apartmentCost,
            condoCost,
            finalPropertyValue: propertyValue
        });
    }

    return comparisonData;
}

// Utility function for formatting currency
function formatCurrency(value) {
    // For large values (over 1 million), use compact notation
    if (Math.abs(value) >= 1000000) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2
        }).format(value);
    }
    
    // For normal values, use standard formatting
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
}

// Utility function for formatting percentages or ratios
function formatPercentOrRatio(value, isPercentage = true) {
    if (isNaN(value)) {
        return 'N/A';
    }
    
    if (isPercentage) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    } else {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
}
