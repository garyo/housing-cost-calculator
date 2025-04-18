// Initialize tabs and set up auto-calculation
document.addEventListener('DOMContentLoaded', () => {
    // Set up tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');
            document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Set up all input elements to trigger calculation on change (no more often than every 100ms)
    const inputElements = document.querySelectorAll('input, select');
    inputElements.forEach(input => {
        input.addEventListener('input', debounce(calculateAndDisplay, 100));
    });

    // Set up today's dollars toggle
    document.getElementById('today-dollars-toggle').addEventListener('change', function() {
        updateTodaysDollarsIndicator(); // Update indicators immediately
        calculateAndDisplay();
    });
    
    // Also watch for changes to the discount rate
    document.getElementById('discount-rate').addEventListener('input', function() {
        if (document.getElementById('today-dollars-toggle').checked) {
            updateTodaysDollarsIndicator();
        }
    });

    // Set up calculate button (keep it for accessibility, but it's redundant now)
    document.getElementById('calculate-btn').addEventListener('click', calculateAndDisplay);

    // Initial calculation
    updateTodaysDollarsIndicator();
    calculateAndDisplay();
});

// Prevent too many calculations while dragging sliders
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Add an indicator for today's dollars status to relevant headings
function updateTodaysDollarsIndicator() {
    const useTodaysDollars = document.getElementById('today-dollars-toggle').checked;
    const discountRate = parseFloat(document.getElementById('discount-rate').value) || 0;
    
    // Only show indicators if today's dollars is enabled and discount rate is positive
    if (useTodaysDollars && discountRate > 0) {
        // Add indicator to any heading that needs it
        const indicators = document.querySelectorAll('.today-dollars-indicator');
        indicators.forEach(el => {
            el.style.display = 'inline';
            el.textContent = ` (Today's Dollars @ ${discountRate}%)`;
        });
    } else {
        // Hide all indicators
        const indicators = document.querySelectorAll('.today-dollars-indicator');
        indicators.forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Calculate and update the UI
function calculateAndDisplay() {
    try {
        document.getElementById('error-alert').style.display = 'none';
        
        // Get parameters
        const params = getParameters();
        
        // Update the years display
        document.getElementById('analysis-years-display').textContent = params.analysisYears.toString();
        
        // Update today's dollars indicators
        updateTodaysDollarsIndicator();
        
        // Calculate housing costs
        const results = calculateHousingCosts(params);
        
        // Create yearly breakdown table
        createTable(
          results.yearlyData,
          [
            { field: 'year', header: 'Year' },
            {
              field: 'apartmentCost',
              header: 'Apt Rent',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'mortgagePayment',
              header: 'Mortgage Payment',
              format: (value) => formatCurrency(value)
            },
            params.downPaymentSource === 'loan' ? {
              field: 'equityLoanPayment',
              header: 'Loan Pmt',
              format: (value) => formatCurrency(value)
            } : null,
            {
              field: 'propertyTax',
              header: 'Property Tax',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'hoa',
              header: 'HOA',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'insurance',
              header: 'Insurance',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'taxSavings',
              header: 'Tax Savings',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'netCondoCost',
              header: 'Net Condo Cost',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'propertyValue',
              header: 'Property Value',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'equity',
              header: 'Equity',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'remainingMortgage',
              header: 'Remaining Mortgage',
              format: (value) => formatCurrency(value)
            },
            params.downPaymentSource === 'loan' ? {
              field: 'remainingEquityLoan',
              header: 'Remaining Loan',
              format: (value) => formatCurrency(value)
            } : null
          ].filter(Boolean),  // Filter out null columns
        'yearly-table-container'
      );
        
        // Create summary table
        createTable(
            results.summaryData,
            [
                { field: 'description', header: 'Description' },
                { field: 'amount', header: 'Amount', format: (value) => formatCurrency(value) }
            ],
            'summary-table-container'
        );
        
        // Create assumptions table
        createTable(
            results.assumptionsData,
            [
                { field: 'assumption', header: 'Assumption' },
                { field: 'value', header: 'Value' }
            ],
            'assumptions-table-container'
        );
        
        // Generate comparison data for multiple years (for chart and crossover analysis)
        const maxYears = params.analysisYears;
        const comparisonData = generateCostComparison(maxYears, params);
        
        // Create crossover table
        createCrossoverTable(comparisonData, 'summary-table-container');
        
        // Create chart
        createChart(comparisonData);
        createAnnualExpensesChart(comparisonData, results.yearlyData);
        
    } catch (error) {
        console.error('Calculation error:', error);
    }
}

// Save current parameters to URL query params
function saveParamsToURL() {
    const params = getParameters();
    const queryParams = new URLSearchParams();

    // Create a mapping between parameter names and element IDs
    const paramToElementMap = {
        'analysisYears': 'analysis-years',
        'apartmentRent': 'apartment-rent',
        'condoPrice': 'condo-price',
        'downPaymentPct': 'down-payment',
        'downPaymentSource': 'down-payment-source',
        'stockGainPct': 'stock-gain',
        'equityLoanRate': 'equity-loan-rate',
        'equityLoanYears': 'equity-loan-term',
        'mortgageRate': 'mortgage-rate',
        'mortgageYears': 'mortgage-years',
        'propertyTaxRate': 'property-tax',
        'hoaRate': 'hoa-rate',
        'insuranceRate': 'insurance-rate',
        'federalTaxRate': 'federal-tax',
        'stateTaxRate': 'state-tax',
        'appreciationRate': 'appreciation',
        'rentIncreaseRate': 'rent-increase',
        'realtorFeePct': 'realtor-fee',
        'capitalGainsRate': 'capital-gains',
        'discountRate': 'discount-rate',
        'useTodaysDollars': 'today-dollars-toggle'
    };

    // Add all parameters to the URL using element IDs
    Object.keys(params).forEach(key => {
        const elementId = paramToElementMap[key] || key;
        queryParams.set(elementId, params[key]);
    });

    // Update the URL without reloading the page
    const newURL = window.location.pathname + '?' + queryParams.toString();
    window.history.pushState({ path: newURL }, '', newURL);

    // Show confirmation to user
    alert('Current scenario saved to URL. You can bookmark this page to save this scenario.');
}

function loadParamsFromURL() {
    const queryParams = new URLSearchParams(window.location.search);

    // Check if there are any parameters in the URL
    if (queryParams.toString() === '') {
        return false; // No parameters to load
    }

    // For each form input, try to load from URL
    const inputElements = document.querySelectorAll('input, select');
    let paramsLoaded = 0;

    inputElements.forEach(input => {
        // Skip elements without an ID
        if (!input.id) return;

        const paramValue = queryParams.get(input.id);

        if (paramValue !== null) {
            // Set the input value
            if (input.type === 'checkbox') {
                input.checked = paramValue === 'true';
            } else {
                input.value = paramValue;
            }

            // Trigger the input event to update any dependent UI
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            paramsLoaded++;
        }
    });

    return paramsLoaded > 0; // Successfully loaded parameters if at least one was set
}

function resetCalculator() {
    // Remove URL parameters
    const newURL = window.location.pathname;
    window.history.pushState({ path: newURL }, '', newURL);

    // Reset all form elements to their default values
    const form = document.querySelector('.input-panel');
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
        // Get default value from the original HTML attribute
        const defaultValue = input.getAttribute('value');

        if (input.type === 'checkbox') {
            input.checked = defaultValue === 'true';
        } else if (input.tagName.toLowerCase() === 'select') {
            // For select elements, find the option with the 'selected' attribute
            const defaultOption = input.querySelector('option[selected]');
            if (defaultOption) {
                input.value = defaultOption.value;
            } else if (defaultValue) {
                input.value = defaultValue;
            } else {
                // If no default specified, select the first option
                input.selectedIndex = 0;
            }
        } else if (defaultValue) {
            input.value = defaultValue;
        }

        // Trigger input event to update any dependent UI
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Recalculate with default values
    calculateAndDisplay();

    // Provide feedback to the user
    alert('Calculator has been reset to default values');
}


// Add save & reset buttons to the form
function addSaveResetButtons() {
    const calculateButton = document.getElementById('calculate-btn');
    const container = calculateButton.parentNode;

    // Create button container for better styling
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '15px';

    // Move calculate button to container
    container.removeChild(calculateButton);
    buttonContainer.appendChild(calculateButton);

    // Create save button
    const saveButton = document.createElement('button');
    saveButton.id = 'save-btn';
    saveButton.textContent = 'Save to URL';

    // Add event listener
    saveButton.addEventListener('click', function(e) {
        e.preventDefault();
        saveParamsToURL();
    });

    // Add save button to container
    buttonContainer.appendChild(saveButton);

    // Create reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-btn';
    resetButton.textContent = 'Reset';

    // Style reset button differently (optional)
    resetButton.style.backgroundColor = '#d9534f'; // Bootstrap danger red

    // Add event listener
    resetButton.addEventListener('click', function(e) {
        e.preventDefault();
        resetCalculator();
    });

    // Add reset button to container
    buttonContainer.appendChild(resetButton);

    // Add button container to form
    container.appendChild(buttonContainer);
}

// Initialize URL parameter functionality
document.addEventListener('DOMContentLoaded', function() {
    // Try to load parameters from URL
    const loaded = loadParamsFromURL();

    // If parameters were loaded, recalculate immediately
    if (loaded) {
        setTimeout(function() {
            calculateAndDisplay();
        }, 100);
    }

    // Add save and reset buttons
    addSaveResetButtons();
});

// Listen for browser navigation (back/forward buttons)
window.addEventListener('popstate', function(event) {
    console.log('Browser navigation detected');

    // Load parameters from current URL
    const loaded = loadParamsFromURL();

    // Recalculate if parameters were loaded
    if (loaded) {
        setTimeout(function() {
            calculateAndDisplay();
        }, 100);
    }
});

function showElt(elt) {
    elt.style.display = 'block';
    void elt.offsetWidth; // force reflow
    elt.classList.remove('hidden');
}

function hideElt(elt) {
    elt.classList.add('hidden');
    // After the transition completes, fully hide it
    setTimeout(() => {
      if (elt.classList.contains('hidden')) {
        elt.style.display = 'none';
      }
    }, 300); // Same duration as the CSS transition
}

document.getElementById('down-payment-source').addEventListener('change', function() {
  const stockGainContainer = document.getElementById('stock-gain-container');
  const homeEqRateContainer = document.getElementById('home-eq-rate-container');
  const homeEqTermContainer = document.getElementById('equity-loan-term-container');
  if (this.value === 'stocks') {
    showElt(stockGainContainer);
    hideElt(homeEqRateContainer);
    hideElt(homeEqTermContainer);
  } else if (this.value === 'loan') {
    hideElt(stockGainContainer);
    showElt(homeEqRateContainer);
    showElt(homeEqTermContainer);
  } else {
    hideElt(stockGainContainer);
    hideElt(homeEqRateContainer);
    hideElt(homeEqTermContainer);
  }
});

// Initial trigger
document.getElementById('down-payment-source').dispatchEvent(new Event('change'));
