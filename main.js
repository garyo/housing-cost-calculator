// Define app version - automatically updated by git hooks
const APP_VERSION = '1.0.0';

// Define parameter to element ID mapping at the global level
const paramToElementMap = {
    'analysisYears': 'analysis-years',
    'apartmentRent': 'apartment-rent',
    'condoPrice': 'condo-price',
    'downPaymentPct': 'down-payment',
    'downPaymentSource': 'down-payment-source',
    'heatingCost': 'heating-cost',
    'maintenanceCost': 'maintenance-cost',
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
    'isPrimaryResidence': 'primary-residence',
    'discountRate': 'discount-rate',
    'useTodaysDollars': 'today-dollars-toggle'
};

// Initialize tabs and set up auto-calculation
document.addEventListener('DOMContentLoaded', () => {
    // Display version in About tab
    displayVersion();
    
    // Set up tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');
            document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
            
            // Remember active tab for next visit
            localStorage.setItem('activeTab', this.dataset.tab);
        });
    });
    
    // Set up instant update for HOA monthly display when either HOA rate or condo price changes
    function updateHoaMonthly() {
        const condoPrice = parseFloat(document.getElementById('condo-price').value) || 0;
        const hoaRate = parseFloat(document.getElementById('hoa-rate').value) || 0;
        const monthlyHoa = condoPrice * (hoaRate / 100);
        document.getElementById('hoa-monthly-display').textContent = `${formatCurrency(monthlyHoa)}/month`;
    }
    
    document.getElementById('hoa-rate').addEventListener('input', updateHoaMonthly);
    document.getElementById('condo-price').addEventListener('input', updateHoaMonthly);
    
    // Set up info icon for today's dollars explanation
    document.getElementById('discount-info').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Switch to the about tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        document.querySelector('.tab[data-tab="about"]').classList.add('active');
        document.getElementById('about-tab').classList.add('active');
        
        // Scroll to the explanation
        const explanationElement = document.getElementById('discount-explanation');
        if (explanationElement) {
            setTimeout(() => {
                explanationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Briefly highlight the section
                explanationElement.style.backgroundColor = 'rgba(51, 102, 153, 0.1)';
                setTimeout(() => {
                    explanationElement.style.backgroundColor = '';
                    explanationElement.style.transition = 'background-color 1s ease';
                }, 100);
            }, 100);
        }
    });

    // Function to save all settings to localStorage
    function saveSettingsToLocalStorage() {
        const params = getParameters();
        localStorage.setItem('housingCalculatorSettings', JSON.stringify(params));
    }
    
    // Function to load settings from localStorage
    function loadSettingsFromLocalStorage() {
        const savedSettings = localStorage.getItem('housingCalculatorSettings');
        if (!savedSettings) return false;
        
        try {
            const params = JSON.parse(savedSettings);
            
            // Update all form inputs with saved values
            Object.keys(params).forEach(key => {
                const elementId = paramToElementMap[key] || key;
                const element = document.getElementById(elementId);
                
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = params[key];
                    } else {
                        element.value = params[key];
                    }
                    // Trigger change events to update any dependent UI
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error loading settings:', error);
            return false;
        }
    }
    
    // Set up all input elements to trigger calculation and save settings
    const inputElements = document.querySelectorAll('input, select');
    inputElements.forEach(input => {
        input.addEventListener('input', debounce(() => {
            calculateAndDisplay();
            saveSettingsToLocalStorage();
        }, 100));
    });

    // Set up today's dollars toggle with localStorage saving
    document.getElementById('today-dollars-toggle').addEventListener('change', function() {
        updateTodaysDollarsIndicator(); // Update indicators immediately
        calculateAndDisplay();
        saveSettingsToLocalStorage();
    });
    
    // Also watch for changes to the discount rate
    document.getElementById('discount-rate').addEventListener('input', function() {
        if (document.getElementById('today-dollars-toggle').checked) {
            updateTodaysDollarsIndicator();
        }
    });

    // Load settings from local storage
    const settingsLoaded = loadSettingsFromLocalStorage();
    
    // Update HOA display with current values
    const initialCondoPrice = parseFloat(document.getElementById('condo-price').value) || 0;
    const initialHoaRate = parseFloat(document.getElementById('hoa-rate').value) || 0;
    const initialMonthlyHoa = initialCondoPrice * (initialHoaRate / 100);
    document.getElementById('hoa-monthly-display').textContent = `${formatCurrency(initialMonthlyHoa)}/month`;
    
    // Restore previously active tab
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        const tabElement = document.querySelector(`.tab[data-tab="${activeTab}"]`);
        if (tabElement) {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Activate the saved tab
            tabElement.classList.add('active');
            const tabContentElement = document.getElementById(`${activeTab}-tab`);
            if (tabContentElement) {
                tabContentElement.classList.add('active');
            }
        }
    }
    
    // Initial calculation (if not already done by loadSettings)
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
        
        // Calculate and display the current monthly HOA fee
        const condoPrice = params.condoPrice;
        const hoaRate = params.hoaRate;
        const monthlyHoa = condoPrice * (hoaRate / 100);
        document.getElementById('hoa-monthly-display').textContent = `${formatCurrency(monthlyHoa)}/month`;
        
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
              header: 'Rent',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'mortgagePayment',
              header: 'Mortgage',
              format: (value) => formatCurrency(value)
            },
            params.downPaymentSource === 'loan' ? {
              field: 'equityLoanPayment',
              header: 'Loan',
              format: (value) => formatCurrency(value)
            } : null,
            {
              field: 'propertyTax',
              header: 'Tax',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'hoa',
              header: 'HOA',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'insurance',
              header: 'Insur',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'heating',
              header: 'Heat',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'maintenance',
              header: 'Maint',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'taxSavings',
              header: 'Tax Savings',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'netCondoCost',
              header: 'Net Condo Cst',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'propertyValue',
              header: 'Prop Value',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'equity',
              header: 'Equity',
              format: (value) => formatCurrency(value)
            },
            {
              field: 'remainingMortgage',
              header: 'Rem Mortg',
              format: (value) => formatCurrency(value)
            },
            params.downPaymentSource === 'loan' ? {
              field: 'remainingEquityLoan',
              header: 'Rem Loan',
              format: (value) => formatCurrency(value)
            } : null,
            {
              field: 'irr',
              header: 'IRR',
              format: (value) => formatPercentOrRatio(value, true)
            }
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
    
    // Clear localStorage
    localStorage.removeItem('housingCalculatorSettings');
    localStorage.removeItem('activeTab');

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


// Add buttons for URL saving and resetting
function addSaveResetButtons() {
    // Find the button container div
    const container = document.getElementById('button-container');
    if (!container) return;

    // Create button container for styling
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '15px';

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
    resetButton.textContent = 'Reset All';

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
