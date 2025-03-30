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

    // Set up calculate button (keep it for accessibility, but it's redundant now)
    document.getElementById('calculate-btn').addEventListener('click', calculateAndDisplay);

    // Initial calculation
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

// Calculate and update the UI
function calculateAndDisplay() {
    try {
        document.getElementById('error-alert').style.display = 'none';
        
        // Get parameters
        const params = getParameters();
        
        // Update the years display
        document.getElementById('analysis-years-display').textContent = params.analysisYears.toString();
        
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
                params.useEquityLoan ? { 
                    field: 'equityLoanPayment', 
                    header: 'Equity Loan Pmt', 
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
                params.useEquityLoan ? { 
                    field: 'remainingEquityLoan', 
                    header: 'Remaining Equity Loan', 
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
        const maxYears = Math.max(10, params.analysisYears);
        const comparisonData = generateCostComparison(maxYears, params);
        
        // Create crossover table
        createCrossoverTable(comparisonData, 'summary-table-container');
        
        // Create chart
        createChart(comparisonData);
        
    } catch (error) {
        console.error('Calculation error:', error);
    }
}
