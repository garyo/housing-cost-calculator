// UI Functions
function createTable(data, columns, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create body rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(column => {
            const td = document.createElement('td');
            
            // Check for special formatting
            if (column.format) {
                td.innerHTML = column.format(row[column.field], row);
            } else {
                td.textContent = row[column.field];
            }
            
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
}

function createCrossoverTable(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    ['Year', 'Apartment Cost', 'Net Condo Cost'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create body rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        // Year column
        const yearCell = document.createElement('td');
        yearCell.textContent = row.year;
        tr.appendChild(yearCell);
        
        // Apartment cost
        const apartmentCell = document.createElement('td');
        apartmentCell.textContent = formatCurrency(row.apartmentCost);
        if (row.apartmentCost < row.condoCost) {
            apartmentCell.classList.add('winner');
        }
        tr.appendChild(apartmentCell);
        
        // Condo cost
        const condoCell = document.createElement('td');
        condoCell.textContent = formatCurrency(row.condoCost);
        if (row.condoCost < row.apartmentCost) {
            condoCell.classList.add('winner');
        }
        tr.appendChild(condoCell);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add crossover information
    let crossoverPoint = null;
    for (let i = 0; i < data.length - 1; i++) {
        if (
            (data[i].apartmentCost < data[i].condoCost && data[i+1].apartmentCost >= data[i+1].condoCost) ||
            (data[i].apartmentCost > data[i].condoCost && data[i+1].apartmentCost <= data[i+1].condoCost)
        ) {
            crossoverPoint = i + 1;
            break;
        }
    }
    
    const crossoverInfo = document.createElement('p');
    if (crossoverPoint) {
        crossoverInfo.textContent = `The crossover point occurs between years ${crossoverPoint} and ${crossoverPoint + 1}.`;
    } else if (data[0].apartmentCost < data[0].condoCost) {
        if (data[data.length - 1].apartmentCost < data[data.length - 1].condoCost) {
            crossoverInfo.textContent = `Renting remains cheaper than buying throughout the ${data.length}-year period.`;
        }
    } else {
        crossoverInfo.textContent = `Buying remains cheaper than renting throughout the ${data.length}-year period.`;
    }
    
    document.getElementById('crossover-point').innerHTML = '';
    document.getElementById('crossover-point').appendChild(crossoverInfo);
}

function createAnnualExpensesChart(data, yearlyData) {
    const container = document.getElementById('annual-expenses-container');

    // Clear the container
    container.innerHTML = '';

    // Create a canvas element
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Get the years (using the data from calculateHousingCosts)
    const years = yearlyData.map(d => d.year);

    // Get annual costs directly from the yearlyData
    const apartmentExpenses = yearlyData.map(d => d.apartmentCost / 1000);
    const condoExpenses = yearlyData.map(d => d.netCondoCost / 1000);

    // Create the chart
    const annualExpensesChart = new Chart(canvas, {
        // Chart configuration remains the same
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Apartment Annual Cost',
                    data: apartmentExpenses,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                },
                {
                    label: 'Condo Annual Cost',
                    data: condoExpenses,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 0 // disable animations
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cost (Thousands)'
                    }
                }
            },
        }
    });
    return annualExpensesChart;
}

let myChart = null;
function createChart(data) {
    const container = document.getElementById('chart-container');
    
    // Clear the container
    container.innerHTML = '';
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Get the 2d context
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (myChart) {
        myChart.destroy();
    }
    
    // Prepare data
    const years = data.map(d => d.year);
    const apartmentCosts = data.map(d => d.apartmentCost / 1000);
    const condoCosts = data.map(d => d.condoCost / 1000);
    
    myChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Apartment (Cumulative)',
                    data: apartmentCosts,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    borderWidth: 2
                },
                {
                    label: 'Condo (Net Cost after sale in year N)',
                    data: condoCosts,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    borderWidth: 2
                }

            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 0 // disable animations
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cost (Thousands)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative Housing Costs Over Time'
                },
                tooltip: {
                    callbacks: {
                      label: function(context) {
                        const formattedValue = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0
                        }).format(context.raw * 1000);

                        return context.dataset.label + ': ' + formattedValue;

                      }
                    }
                }
            }
        }
    });
}

function getParameters() {
    try {
        const analysisYears = parseInt(document.getElementById('analysis-years').value);
        const apartmentRent = parseFloat(document.getElementById('apartment-rent').value);
        const condoPrice = parseFloat(document.getElementById('condo-price').value);
        const downPaymentPct = parseFloat(document.getElementById('down-payment').value);
        const downPaymentSource = document.getElementById('down-payment-source').value;
        const equityLoanRate = parseFloat(document.getElementById('equity-loan-rate').value);
        const equityLoanYears = parseInt(document.getElementById('equity-loan-term').value);
        const mortgageRate = parseFloat(document.getElementById('mortgage-rate').value);
        const mortgageYears = parseInt(document.getElementById('mortgage-years').value);
        const propertyTaxRate = parseFloat(document.getElementById('property-tax').value);
        const hoaRate = parseFloat(document.getElementById('hoa-rate').value);
        const federalTaxRate = parseFloat(document.getElementById('federal-tax').value);
        const stateTaxRate = parseFloat(document.getElementById('state-tax').value);
        const appreciationRate = parseFloat(document.getElementById('appreciation').value);
        const rentIncreaseRate = parseFloat(document.getElementById('rent-increase').value);
        const realtorFeePct = parseFloat(document.getElementById('realtor-fee').value);
        const capitalGainsRate = parseFloat(document.getElementById('capital-gains').value);

        const stockGainPct = document.getElementById('stock-gain-container').style.display !== 'none' ? parseFloat(document.getElementById('stock-gain').value) : 0;

        // Validate inputs
        if (isNaN(analysisYears) || analysisYears <= 0) throw new Error('Analysis years must be a positive number');
        if (isNaN(apartmentRent) || apartmentRent < 0) throw new Error('Apartment rent must be a non-negative number');
        if (isNaN(condoPrice) || condoPrice <= 0) throw new Error('Condo price must be a positive number');
        if (isNaN(downPaymentPct) || downPaymentPct < 0 || downPaymentPct > 100) throw new Error('Down payment must be between 0 and 100%');
        if (isNaN(equityLoanRate) || equityLoanRate < 0) throw new Error('Loan rate must be a non-negative number');
        if (isNaN(mortgageRate) || mortgageRate < 0) throw new Error('Mortgage rate must be a non-negative number');
        if (isNaN(mortgageYears) || mortgageYears <= 0) throw new Error('Mortgage term must be a positive number');
        if (downPaymentSource === 'loan' && (isNaN(equityLoanYears) || equityLoanYears <= 0)) throw new Error('Loan term must be a positive number');
        if (isNaN(propertyTaxRate) || propertyTaxRate < 0) throw new Error('Property tax rate must be a non-negative number');
        if (isNaN(hoaRate) || hoaRate < 0) throw new Error('HOA rate must be a non-negative number');
        if (isNaN(federalTaxRate) || federalTaxRate < 0 || federalTaxRate > 100) throw new Error('Federal tax rate must be between 0 and 100%');
        if (isNaN(stateTaxRate) || stateTaxRate < 0 || stateTaxRate > 100) throw new Error('State tax rate must be between 0 and 100%');
        if (isNaN(appreciationRate) || appreciationRate < 0) throw new Error('Appreciation rate must be a non-negative number');
        if (isNaN(rentIncreaseRate) || rentIncreaseRate < 0) throw new Error('Rent increase rate must be a non-negative number');
        if (isNaN(realtorFeePct) || realtorFeePct < 0 || realtorFeePct > 100) throw new Error('Realtor fee must be between 0 and 100%');
        if (isNaN(capitalGainsRate) || capitalGainsRate < 0 || capitalGainsRate > 100) throw new Error('Capital gains rate must be between 0 and 100%');

        return {
            analysisYears,
            apartmentRent,
            condoPrice,
            downPaymentPct,
            downPaymentSource,
            equityLoanRate,
            equityLoanYears,
            mortgageRate,
            mortgageYears,
            propertyTaxRate,
            hoaRate,
            federalTaxRate,
            stateTaxRate,
            appreciationRate,
            rentIncreaseRate,
            realtorFeePct,
            capitalGainsRate,
            stockGainPct
        };
    } catch (error) {
        document.getElementById('error-alert').textContent = error.message;
        document.getElementById('error-alert').style.display = 'block';
        throw error;
    }
}
