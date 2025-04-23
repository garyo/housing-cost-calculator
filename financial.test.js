// Unit tests for financial.js using Jest

// Create a module from the financial.js content
// This is a more robust approach than using regex and eval
// It properly preserves function references within the code
const financial = (function() {
  // Create a module-like environment
  const module = {};
  
  // Define window and document to prevent errors
  const window = {};
  const document = { addEventListener: () => {} };
  
  // Load the source file using Node's fs module
  const fs = require('fs');
  const path = require('path');
  const financialJsPath = path.join(__dirname, 'financial.js');
  const financialJs = fs.readFileSync(financialJsPath, 'utf8');
  
  // Execute the code in our controlled context, capturing functions
  const allFunctions = {};
  
  // First find and extract all function declarations
  const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
  let match;
  while ((match = functionRegex.exec(financialJs)) !== null) {
    const funcName = match[1];
    allFunctions[funcName] = null; // Placeholder
  }
  
  // Create wrapper that will capture all functions
  let wrapperCode = `
    (function() {
      // Execute the source file code
      ${financialJs}
      
      // Return all the functions we want to test
      return {
  `;
  
  // Add each function to the return object
  Object.keys(allFunctions).forEach(funcName => {
    wrapperCode += `      ${funcName},\n`;
  });
  
  wrapperCode += `    };
    })()
  `;
  
  // Execute the wrapper and get the functions
  return eval(wrapperCode);
})();

// Now test the functions using Jest
describe('Financial Calculations', () => {
  // Use a more generous tolerance for float comparisons
  // This accounts for slight differences in rounding and calculation methods
  const epsilon = 0.01;

  // Test suite for mortgage payment calculations
  describe('calculateMortgagePayment', () => {
    test('standard 30-year mortgage at 4.5%', () => {
      const result = financial.calculateMortgagePayment(200000, 4.5, 30);
      const expected = 1013.37;
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('zero interest mortgage', () => {
      const result = financial.calculateMortgagePayment(200000, 0, 30);
      const expected = 200000 / (30 * 12);
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('15-year mortgage at 4.5%', () => {
      const result = financial.calculateMortgagePayment(200000, 4.5, 15);
      // Directly check the implementation formula for consistency
      const monthlyRate = (4.5 / 100) / 12;
      const numPayments = 15 * 12;
      const expected = (200000 * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                       (Math.pow(1 + monthlyRate, numPayments) - 1);
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('high interest (10%) mortgage', () => {
      const result = financial.calculateMortgagePayment(200000, 10, 30);
      // Using actual result from financial.js implementation
      const expected = 1755.14;
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });
  });

  // Test suite for interest and principal breakdown
  describe('calculateMonthlyInterestAndPrincipal', () => {
    test('first month of standard mortgage', () => {
      const result = financial.calculateMonthlyInterestAndPrincipal(200000, 4.5, 30, 1);
      const expectedInterest = 750;
      const expectedPrincipal = 263.37;
      
      expect(Math.abs(result.interest - expectedInterest)).toBeLessThan(epsilon);
      expect(Math.abs(result.principalPaid - expectedPrincipal)).toBeLessThan(epsilon);
    });

    test('zero interest mortgage', () => {
      const result = financial.calculateMonthlyInterestAndPrincipal(200000, 0, 30, 1);
      const expectedInterest = 0;
      const expectedPrincipal = 200000 / (30 * 12);
      
      expect(Math.abs(result.interest - expectedInterest)).toBeLessThan(epsilon);
      expect(Math.abs(result.principalPaid - expectedPrincipal)).toBeLessThan(epsilon);
    });

    test('year 5 (payment 60) of standard mortgage', () => {
      const result = financial.calculateMonthlyInterestAndPrincipal(200000, 4.5, 30, 60);
      
      // Get the actual mortgage payment from the implementation
      const payment = financial.calculateMortgagePayment(200000, 4.5, 30);
      
      // Verify that interest + principal = payment (within rounding error)
      expect(Math.abs((result.interest + result.principalPaid) - payment)).toBeLessThan(epsilon);
      
      // With a 4.5% loan, after 5 years, the interest portion should be higher than principal
      expect(result.interest).toBeGreaterThan(result.principalPaid);
      
      // Interest should be positive 
      expect(result.interest).toBeGreaterThan(0);
      
      // Principal should be positive
      expect(result.principalPaid).toBeGreaterThan(0);
    });
  });

  // Test suite for property appreciation
  describe('annualPropertyValue', () => {
    test('year 0 property value (no appreciation)', () => {
      const result = financial.annualPropertyValue(300000, 3, 0);
      const expected = 300000;
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('year 1 property value with 3% appreciation', () => {
      const result = financial.annualPropertyValue(300000, 3, 1);
      const expected = 309000;
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('year 10 property value with 3% appreciation', () => {
      const result = financial.annualPropertyValue(300000, 3, 10);
      const expected = 300000 * Math.pow(1.03, 10);
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });

    test('zero appreciation over 10 years', () => {
      const result = financial.annualPropertyValue(300000, 0, 10);
      const expected = 300000;
      expect(Math.abs(result - expected)).toBeLessThan(epsilon);
    });
  });

  // Test suite for loan payment calculations
  describe('calculateLoanPayments', () => {
    test('annual payment for year 1 of a 10-year loan', () => {
      const result = financial.calculateLoanPayments(1, 100000, 5, 10);
      
      // Calculate the expected payment using the method from the implementation
      const monthlyPayment = financial.calculateMortgagePayment(100000, 5, 10);
      const expectedPayment = monthlyPayment * 12;
      
      expect(Math.abs(result.annualPayment - expectedPayment)).toBeLessThan(epsilon);
    });

    test('interest plus principal equals payment', () => {
      const result = financial.calculateLoanPayments(1, 100000, 5, 10);
      expect(Math.abs(result.annualInterest + result.annualPrincipal - result.annualPayment)).toBeLessThan(epsilon);
    });

    test('loan not active after term ends', () => {
      const result = financial.calculateLoanPayments(11, 100000, 5, 10);
      expect(result.loanActive).toBe(false);
      expect(result.annualPayment).toBe(0);
    });

    test('zero interest loan', () => {
      const result = financial.calculateLoanPayments(1, 100000, 0, 10);
      const expectedPayment = 10000;
      
      expect(Math.abs(result.annualPayment - expectedPayment)).toBeLessThan(epsilon);
      expect(Math.abs(result.annualInterest)).toBeLessThan(epsilon);
      expect(Math.abs(result.annualPrincipal - expectedPayment)).toBeLessThan(epsilon);
    });
  });

  // Test annual costs calculation
  describe('calculateAnnualCosts', () => {
    test('basic annual costs calculation for year 1', () => {
      const result = financial.calculateAnnualCosts(
        1,              // year
        300000,         // loan amount
        4.5,            // mortgage rate
        30,             // mortgage years
        400000,         // condo price
        3,              // appreciation rate
        10,             // property tax rate
        0.1,            // HOA rate
        0.5,            // insurance rate
        100,            // heating cost
        150             // maintenance cost
      );
      
      // Check mortgage payment
      const expectedMortgage = financial.calculateMortgagePayment(300000, 4.5, 30) * 12;
      expect(Math.abs(result.annualMortgage - expectedMortgage)).toBeLessThan(epsilon);
      
      // Check property value and derived costs
      const expectedPropertyValue = financial.annualPropertyValue(400000, 3, 1);
      
      // Property tax
      const expectedPropertyTax = expectedPropertyValue * (10 / 1000);
      expect(Math.abs(result.annualPropertyTax - expectedPropertyTax)).toBeLessThan(epsilon);
      
      // HOA
      const expectedHoa = expectedPropertyValue * (0.1 / 100) * 12;
      expect(Math.abs(result.annualHoa - expectedHoa)).toBeLessThan(epsilon);
      
      // Heating and maintenance
      expect(Math.abs(result.annualHeating - 1200)).toBeLessThan(epsilon);
      expect(Math.abs(result.annualMaintenance - 1800)).toBeLessThan(epsilon);
    });
  });

  // Test present value calculations
  describe('calculatePresentValue', () => {
    test('present value calculation for different years', () => {
      // Year 0 - should be unchanged
      let result = financial.calculatePresentValue(1000, 0, 3);
      expect(Math.abs(result - 1000)).toBeLessThan(epsilon);
      
      // Year 1 with 3% discount rate
      result = financial.calculatePresentValue(1000, 1, 3);
      // Using actual result from the implementation
      const expectedYear1 = 1000 / Math.pow(1 + 3/100, 1); // approx 970.87
      expect(Math.abs(result - expectedYear1)).toBeLessThan(epsilon);
      
      // Year 10 with 3% discount rate
      result = financial.calculatePresentValue(1000, 10, 3);
      // Using actual result from the implementation
      const expectedYear10 = 1000 / Math.pow(1 + 3/100, 10); // approx 744.09
      expect(Math.abs(result - expectedYear10)).toBeLessThan(epsilon);
    });
    
    test('zero discount rate', () => {
      const result = financial.calculatePresentValue(1000, 10, 0);
      expect(Math.abs(result - 1000)).toBeLessThan(epsilon);
    });
  });

  // Test formatCurrency function
  describe('formatCurrency', () => {
    test('formats regular currency values', () => {
      const result = financial.formatCurrency(12345);
      expect(result).toBe('$12,345');
    });

    test('formats large values with compact notation', () => {
      const result = financial.formatCurrency(1500000);
      // Should compact to something like $1.5M
      expect(result).toMatch(/^\$1\.50M$/);
    });

    test('formats negative values', () => {
      const result = financial.formatCurrency(-5000);
      expect(result).toBe('-$5,000');
    });
  });

  // Test calculateLoanPayments with zero loan amount
  describe('calculateLoanPayments edge cases', () => {
    test('zero loan amount', () => {
      const result = financial.calculateLoanPayments(1, 0, 5, 30);
      expect(result.loanActive).toBe(false);
      expect(result.annualPayment).toBe(0);
      expect(result.annualInterest).toBe(0);
      expect(result.annualPrincipal).toBe(0);
    });
  });

  // Test calculateHousingCosts function
  describe('calculateHousingCosts', () => {
    test('basic housing cost calculation', () => {
      const params = {
        analysisYears: 1,
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'cash',
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 3,
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false
      };

      const result = financial.calculateHousingCosts(params);

      // Check that the result contains the expected structure
      expect(result).toHaveProperty('yearlyData');
      expect(result).toHaveProperty('summaryData');
      expect(result).toHaveProperty('assumptionsData');
      expect(result).toHaveProperty('metrics');

      // Check that yearlyData has expected entries
      expect(result.yearlyData.length).toBe(1);
      const yearOneData = result.yearlyData[0];
      
      // Verify the calculated values are reasonable
      expect(yearOneData.year).toBe(1);
      expect(yearOneData.apartmentCost).toBeCloseTo(2000 * 12, -1); // Annual apartment cost
      expect(yearOneData.propertyValue).toBeGreaterThan(400000); // Should appreciate
      expect(yearOneData.equity).toBeGreaterThan(80000); // Down payment + some principal
      
      // Verify mortgage payments based on a $320,000 loan (after 20% down)
      const expectedMortgage = financial.calculateMortgagePayment(320000, 4.5, 30) * 12;
      expect(yearOneData.mortgagePayment).toBeCloseTo(expectedMortgage, -1);
    });

    test('using an equity loan for down payment', () => {
      const params = {
        analysisYears: 1,
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'loan',
        equityLoanRate: 6,
        equityLoanYears: 10,
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 3,
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false
      };

      const result = financial.calculateHousingCosts(params);
      const yearOneData = result.yearlyData[0];
      
      // Verify that there's an equity loan payment
      expect(yearOneData.equityLoanPayment).toBeGreaterThan(0);
      
      // Expected down payment = 20% of condo price
      const downPayment = 400000 * 0.2;
      
      // Expected equity loan payment based on a $80,000 loan at 6% for 10 years
      const expectedMonthlyEquityPayment = financial.calculateMortgagePayment(downPayment, 6, 10);
      const expectedAnnualEquityPayment = expectedMonthlyEquityPayment * 12;
      expect(yearOneData.equityLoanPayment).toBeCloseTo(expectedAnnualEquityPayment, -1);
    });

    test('using stocks for down payment incurs capital gains tax', () => {
      const params = {
        analysisYears: 1,
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'stocks',
        stockGainPct: 50, // 50% of the down payment is capital gains
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 3,
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false
      };

      const result = financial.calculateHousingCosts(params);
      
      // Capital gains tax should be reflected in the summary data
      const capGainsTaxAssumption = result.assumptionsData.find(
        item => item.assumption === 'Cap Gains Tax on Down Payment'
      );
      expect(capGainsTaxAssumption).toBeDefined();
      
      // Calculate expected tax: 
      // downPayment = $80,000, gains = 50% = $40,000, tax = 15% of gains = $6,000
      const downPayment = 400000 * 0.2;
      const gains = downPayment * 0.5;
      const expectedTax = gains * 0.15;
      
      // Extract just the number from the formatted currency string
      const taxValue = parseFloat(capGainsTaxAssumption.value.replace(/[^0-9.-]+/g, ''));
      expect(taxValue).toBeCloseTo(expectedTax, -1);
    });
    
    test('primary residence exemption reduces capital gains tax', () => {
      // First scenario: Calculate without primary residence exclusion
      const baseParams = {
        analysisYears: 10,
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'cash',
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 5, // Higher appreciation to ensure capital gains
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false,
        isPrimaryResidence: false
      };
      
      const resultWithoutExemption = financial.calculateHousingCosts(baseParams);
      
      // Calculate with primary residence exclusion
      const paramsWithExemption = {
        ...baseParams,
        isPrimaryResidence: true
      };
      
      const resultWithExemption = financial.calculateHousingCosts(paramsWithExemption);
      
      // Get capital gains tax from each result's summary data
      const findCapGainsTax = (summaryData) => {
        const capGainsTaxItem = summaryData.find(item => item.description === 'Capital Gains Tax');
        return capGainsTaxItem ? capGainsTaxItem.amount : 0;
      };
      
      const capGainsTaxWithoutExemption = findCapGainsTax(resultWithoutExemption.summaryData);
      const capGainsTaxWithExemption = findCapGainsTax(resultWithExemption.summaryData);
      
      // After 10 years with 5% appreciation, we should have significant capital gains
      expect(capGainsTaxWithoutExemption).toBeGreaterThan(0);
      
      // Verify that exemption reduces the tax amount
      if (capGainsTaxWithoutExemption > 250000 * 0.15) {
        // If the gains exceed the exemption amount, tax should be reduced but not eliminated
        expect(capGainsTaxWithExemption).toBeLessThan(capGainsTaxWithoutExemption);
        expect(capGainsTaxWithExemption).toBeGreaterThan(0);
      } else {
        // If the gains are less than the exemption amount, tax should be eliminated
        expect(capGainsTaxWithExemption).toBe(0);
      }
      
      // Verify that net sale proceeds are higher with exemption
      const findNetSaleProceeds = (summaryData) => {
        const item = summaryData.find(item => item.description === 'Net Sale Proceeds');
        return item ? item.amount : 0;
      };
      
      const proceedsWithoutExemption = findNetSaleProceeds(resultWithoutExemption.summaryData);
      const proceedsWithExemption = findNetSaleProceeds(resultWithExemption.summaryData);
      
      // Net sale proceeds should be higher with the exemption
      expect(proceedsWithExemption).toBeGreaterThan(proceedsWithoutExemption);
      
      // Check that the difference is exactly the tax saved
      const taxSavings = capGainsTaxWithoutExemption - capGainsTaxWithExemption;
      expect(proceedsWithExemption - proceedsWithoutExemption).toBeCloseTo(taxSavings, -1);
    });
    
    test('primary residence exemption has no effect when gains under threshold', () => {
      // Create a scenario with minimal appreciation (thus minimal capital gains)
      const params = {
        analysisYears: 2,
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'cash',
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 1, // Very low appreciation
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false,
        isPrimaryResidence: true
      };
      
      const result = financial.calculateHousingCosts(params);
      
      // Get property appreciation over 2 years
      const initialValue = params.condoPrice;
      const finalValue = financial.annualPropertyValue(initialValue, params.appreciationRate, params.analysisYears);
      const totalGains = finalValue - initialValue;
      
      // Verify the gains are less than the exemption amount
      expect(totalGains).toBeLessThan(250000);
      
      // Verify there's no capital gains tax in the results
      const capGainsTaxItem = result.summaryData.find(item => item.description === 'Capital Gains Tax');
      expect(capGainsTaxItem.amount).toBe(0);
      
      // Ensure primary residence status is indicated in assumptions
      const primaryResidenceAssumption = result.assumptionsData.find(
        item => item.assumption === 'Primary Residence'
      );
      expect(primaryResidenceAssumption).toBeDefined();
      expect(primaryResidenceAssumption.value).toContain('Yes');
    });
  });

  // Test generateCostComparison function
  describe('generateCostComparison', () => {
    test('generates multi-year cost comparisons', () => {
      const params = {
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'cash',
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 3,
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 3,
        useTodaysDollars: false
      };

      const result = financial.generateCostComparison(5, params);
      
      // Should return 5 years of data
      expect(result.length).toBe(5);
      
      // Each item should have year, apartment cost, condo cost and property value
      result.forEach((yearData, index) => {
        const year = index + 1;
        expect(yearData.year).toBe(year);
        expect(yearData).toHaveProperty('apartmentCost');
        expect(yearData).toHaveProperty('condoCost');
        expect(yearData).toHaveProperty('finalPropertyValue');
        
        // Property value should increase each year due to appreciation
        if (index > 0) {
          expect(yearData.finalPropertyValue).toBeGreaterThan(result[index-1].finalPropertyValue);
        }
      });
    });

    test('applies present value discounting when requested', () => {
      const params = {
        apartmentRent: 2000,
        condoPrice: 400000,
        downPaymentPct: 20,
        downPaymentSource: 'cash',
        heatingCost: 100,
        maintenanceCost: 150,
        mortgageRate: 4.5,
        mortgageYears: 30,
        propertyTaxRate: 10,
        hoaRate: 0.1,
        insuranceRate: 0.5,
        federalTaxRate: 22,
        stateTaxRate: 5,
        appreciationRate: 3,
        rentIncreaseRate: 2,
        realtorFeePct: 6,
        capitalGainsRate: 15,
        discountRate: 5,
        useTodaysDollars: true
      };

      const result = financial.generateCostComparison(3, params);
      const resultWithoutDiscounting = financial.generateCostComparison(3, {
        ...params,
        useTodaysDollars: false
      });
      
      // When using present value (today's dollars), the values should be lower
      // due to the discounting
      for (let i = 0; i < result.length; i++) {
        // The values with discounting should be lower than without discounting
        // especially for later years
        if (i > 0) { // Year 1 might be close due to minimal discounting
          expect(result[i].apartmentCost).toBeLessThan(resultWithoutDiscounting[i].apartmentCost);
          expect(result[i].finalPropertyValue).toBeLessThan(resultWithoutDiscounting[i].finalPropertyValue);
        }
      }
    });
  });
});