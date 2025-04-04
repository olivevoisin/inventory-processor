// Main Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Bootstrap components
  initializeBootstrap();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load initial data
  loadDashboardData();
  loadProducts();
  loadInventory();
});

// Initialize Bootstrap components
function initializeBootstrap() {
  // Activate tabs based on hash
  const hash = window.location.hash || '#dashboard';
  const tabEl = document.querySelector(`a[href="${hash}"]`);
  if (tabEl) {
    const tab = new bootstrap.Tab(tabEl);
    tab.show();
  }
  
  // Update hash when tabs change
  const tabEls = document.querySelectorAll('a[data-bs-toggle="tab"]');
  tabEls.forEach(tabEl => {
    tabEl.addEventListener('shown.bs.tab', (event) => {
      window.location.hash = event.target.getAttribute('href');
    });
  });
}

// Set up event listeners
function setupEventListeners() {
  // Voice recording
  setupVoiceRecording();
  
  // Invoice processing
  setupInvoiceProcessing();
  
  // Products management
  setupProductsManagement();
  
  // Inventory management
  setupInventoryManagement();
  
  // Reports
  setupReports();
}

// ----- Voice Recording -----
function setupVoiceRecording() {
  const recordButton = document.getElementById('record-button');
  const submitRecording = document.getElementById('submit-recording');
  const audioPlayer = document.getElementById('audio-player');
  const recordingProgress = document.getElementById('recording-progress');
  const recordingTime = document.getElementById('recording-time');
  const recordingSeconds = document.getElementById('recording-seconds');
  const audioPlayback = document.getElementById('audio-playback');
  const recordIcon = document.getElementById('record-icon');
  const voiceForm = document.getElementById('voice-form');
  const resultsCard = document.getElementById('results-card');
  
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;
  let recordingInterval;
  let recordingDuration = 0;
  let audioBlob;
  
  // Record button click handler
  if (recordButton) {
    recordButton.addEventListener('click', async () => {
      if (!isRecording) {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];
          
          mediaRecorder.addEventListener('dataavailable', (event) => {
            audioChunks.push(event.data);
          });
          
          mediaRecorder.addEventListener('stop', () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayback.classList.remove('visually-hidden');
            submitRecording.classList.remove('visually-hidden');
          });
          
          // Start recording
          mediaRecorder.start();
          isRecording = true;
          recordButton.textContent = 'Stop Recording';
          recordIcon.textContent = '⏹️';
          recordButton.classList.replace('btn-primary', 'btn-danger');
          
          // Show progress
          recordingProgress.classList.remove('visually-hidden');
          recordingTime.classList.remove('visually-hidden');
          
          // Update recording time
          recordingDuration = 0;
          recordingInterval = setInterval(() => {
            recordingDuration++;
            recordingSeconds.textContent = recordingDuration;
            const progressBar = recordingProgress.querySelector('.progress-bar');
            progressBar.style.width = `${Math.min(recordingDuration / 60 * 100, 100)}%`;
          }, 1000);
          
        } catch (error) {
          console.error('Error accessing microphone:', error);
          alert('Error accessing microphone: ' + error.message);
        }
      } else {
        // Stop recording
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        recordButton.textContent = 'Start Recording';
        recordIcon.textContent = '🎙️';
        recordButton.classList.replace('btn-danger', 'btn-primary');
        
        // Stop progress updates
        clearInterval(recordingInterval);
      }
    });
  }
  
  // Form submission handler
  if (voiceForm) {
    voiceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const location = document.getElementById('voice-location').value;
      
      if (!location) {
        alert('Please select a location');
        return;
      }
      
      if (!audioBlob) {
        alert('Please record audio first');
        return;
      }
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.mp3');
        formData.append('location', location);
        
        // Show loading state
        submitRecording.disabled = true;
        submitRecording.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send to server
        const response = await fetch('/api/voice/process', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Display results
        displayVoiceResults(result);
        
        // Reset form state
        submitRecording.disabled = false;
        submitRecording.textContent = 'Process Recording';
        
      } catch (error) {
        console.error('Error processing recording:', error);
        alert('Error processing recording: ' + error.message);
        submitRecording.disabled = false;
        submitRecording.textContent = 'Process Recording';
      }
    });
  }
}

// Display voice processing results
function displayVoiceResults(result) {
  const resultsCard = document.getElementById('results-card');
  const transcriptResult = document.getElementById('transcript-result');
  const recognizedItems = document.getElementById('recognized-items');
  
  if (!resultsCard || !transcriptResult || !recognizedItems) return;
  
  // Show results card
  resultsCard.classList.remove('visually-hidden');
  
  // Display transcript
  transcriptResult.textContent = result.result.transcript || 'No transcript available';
  
  // Display recognized items
  recognizedItems.innerHTML = '';
  
  if (result.result.recognizedItems && result.result.recognizedItems.length > 0) {
    result.result.recognizedItems.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.product}</td>
        <td>${item.count}</td>
        <td>${item.unit || '-'}</td>
      `;
      recognizedItems.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3" class="text-center">No items recognized</td>';
    recognizedItems.appendChild(row);
  }
  
  // Scroll to results
  resultsCard.scrollIntoView({ behavior: 'smooth' });
}

// ----- Invoice Processing -----
function setupInvoiceProcessing() {
  const invoiceForm = document.getElementById('invoice-form');
  const batchForm = document.getElementById('batch-form');
  
  // Process single invoice
  if (invoiceForm) {
    invoiceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const location = document.getElementById('invoice-location').value;
      const fileInput = document.getElementById('invoice-file');
      
      if (!location) {
        alert('Please select a location');
        return;
      }
      
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select an invoice file');
        return;
      }
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('location', location);
        
        // Show loading state
        const submitButton = invoiceForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send to server
        const response = await fetch('/api/invoice/process', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Display results
        displayInvoiceResults(result);
        
        // Reset form state
        submitButton.disabled = false;
        submitButton.textContent = 'Process Invoice';
        
      } catch (error) {
        console.error('Error processing invoice:', error);
        alert('Error processing invoice: ' + error.message);
        const submitButton = invoiceForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Process Invoice';
      }
    });
  }
  
  // Process batch invoices
  if (batchForm) {
    batchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const sourceDir = document.getElementById('source-dir').value;
      const processedDir = document.getElementById('processed-dir').value;
      
      if (!sourceDir || !processedDir) {
        alert('Please enter both source and processed directories');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = batchForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send to server
        const response = await fetch('/api/invoice/process-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sourceDir,
            processedDir
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Show success message
        alert(`Processing complete: ${result.result.processed} invoices processed with ${result.result.errors} errors`);
        
        // Reset form state
        submitButton.disabled = false;
        submitButton.textContent = 'Process Batch';
        
      } catch (error) {
        console.error('Error processing batch:', error);
        alert('Error processing batch: ' + error.message);
        const submitButton = batchForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Process Batch';
      }
    });
  }
}

// Display invoice processing results
function displayInvoiceResults(result) {
  const resultsCard = document.getElementById('invoice-results-card');
  const invoiceDateResult = document.getElementById('invoice-date-result');
  const invoiceItems = document.getElementById('invoice-items');
  const invoiceTotalResult = document.getElementById('invoice-total-result');
  
  if (!resultsCard || !invoiceDateResult || !invoiceItems || !invoiceTotalResult) return;
  
  // Show results card
  resultsCard.classList.remove('visually-hidden');
  
  // Display invoice date
  invoiceDateResult.textContent = result.result.invoiceDate || 'Not available';
  
  // Display invoice items
  invoiceItems.innerHTML = '';
  
  if (result.result.items && result.result.items.length > 0) {
    result.result.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.product}</td>
        <td>${item.count}</td>
        <td>${item.price || '-'}</td>
      `;
      invoiceItems.appendChild(row);
    });
  } else {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3" class="text-center">No items extracted</td>';
    invoiceItems.appendChild(row);
  }
  
  // Display total
  invoiceTotalResult.textContent = result.result.total || 'Not available';
  
  // Scroll to results
  resultsCard.scrollIntoView({ behavior: 'smooth' });
}

// ----- Products Management -----
function setupProductsManagement() {
  const filterButton = document.getElementById('filter-products');
  const saveButton = document.getElementById('save-product');
  
  // Filter products
  if (filterButton) {
    filterButton.addEventListener('click', () => {
      loadProducts();
    });
  }
  
  // Save new product
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const name = document.getElementById('product-name').value;
      const unit = document.getElementById('product-unit').value;
      const price = document.getElementById('product-price').value;
      const location = document.getElementById('product-location').value;
      
      if (!name || !unit || !price || !location) {
        alert('Please fill in all fields');
        return;
      }
      
      try {
        // Show loading state
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        // Send to server
        const response = await fetch('/api/inventory/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            unit,
            price,
            location
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        // Reset form
        document.getElementById('product-name').value = '';
        document.getElementById('product-unit').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-location').value = '';
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('add-product-modal'));
        modal.hide();
        
        // Reload products
        loadProducts();
        
        // Reset button state
        saveButton.disabled = false;
        saveButton.textContent = 'Save Product';
        
      } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product: ' + error.message);
        saveButton.disabled = false;
        saveButton.textContent = 'Save Product';
      }
    });
  }
}

// Load products from server
async function loadProducts() {
  const productsTable = document.getElementById('products-table');
  const locationFilter = document.getElementById('product-location-filter');
  
  if (!productsTable) return;
  
  try {
    // Show loading state
    productsTable.innerHTML = '<tr><td colspan="4" class="text-center">Loading products...</td></tr>';
    
    // Get location filter value
    const location = locationFilter ? locationFilter.value : '';
    
    // Fetch products
    const response = await fetch(`/api/inventory/products${location ? `?location=${location}` : ''}`);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Display products
    productsTable.innerHTML = '';
    
    if (result.data && result.data.length > 0) {
      result.data.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${product.name}</td>
          <td>${product.unit}</td>
          <td>$${parseFloat(product.price).toFixed(2)}</td>
          <td>${product.location}</td>
        `;
        productsTable.appendChild(row);
      });
    } else {
      productsTable.innerHTML = '<tr><td colspan="4" class="text-center">No products found</td></tr>';
    }
    
    // Update dashboard counter
    const totalProducts = document.getElementById('total-products');
    if (totalProducts) {
      totalProducts.textContent = result.data ? result.data.length : 0;
    }
    
  } catch (error) {
    console.error('Error loading products:', error);
    productsTable.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading products: ${error.message}</td></tr>`;
  }
}

// ----- Inventory Management -----
function setupInventoryManagement() {
  const filterButton = document.getElementById('filter-inventory');
  const refreshButton = document.getElementById('refresh-inventory');
  
  // Filter inventory
  if (filterButton) {
    filterButton.addEventListener('click', () => {
      loadInventory();
    });
  }
  
  // Refresh inventory
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      loadInventory();
    });
  }
}

// Load inventory from server
async function loadInventory() {
  const inventoryTable = document.getElementById('inventory-table');
  const locationFilter = document.getElementById('inventory-location-filter');
  const dateFilter = document.getElementById('inventory-date-filter');
  
  if (!inventoryTable) return;
  
  try {
    // Show loading state
    inventoryTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading inventory data...</td></tr>';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (locationFilter && locationFilter.value) {
      params.append('location', locationFilter.value);
    }
    if (dateFilter && dateFilter.value) {
      params.append('date', dateFilter.value);
    }
    
    // Fetch inventory data
    const response = await fetch(`/api/inventory?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Display inventory data
    inventoryTable.innerHTML = '';
    
    if (result.data && result.data.length > 0) {
      result.data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.date}</td>
          <td>${item.location}</td>
          <td>${item.product}</td>
          <td>${item.count}</td>
          <td>${item.unit || '-'}</td>
        `;
        inventoryTable.appendChild(row);
      });
    } else {
      inventoryTable.innerHTML = '<tr><td colspan="5" class="text-center">No inventory data found</td></tr>';
    }
    
    // Update dashboard counter
    const inventoryItems = document.getElementById('inventory-items');
    if (inventoryItems) {
      inventoryItems.textContent = result.data ? result.data.length : 0;
    }
    
  } catch (error) {
    console.error('Error loading inventory:', error);
    inventoryTable.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading inventory: ${error.message}</td></tr>`;
  }
}

// ----- Dashboard -----
async function loadDashboardData() {
  try {
    // Load counts for dashboard
    // Products count is loaded in loadProducts()
    // Inventory count is loaded in loadInventory()
    
    // Placeholder for processed invoices count
    const processedInvoices = document.getElementById('processed-invoices');
    if (processedInvoices) {
      // In a real implementation, this would fetch from server
      processedInvoices.textContent = '0';
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// ----- Reports -----
function setupReports() {
  const generateButton = document.getElementById('generate-report');
  const exportExcelButton = document.getElementById('export-excel');
  const exportCsvButton = document.getElementById('export-csv');
  const exportPdfButton = document.getElementById('export-pdf');
  
  // Generate report
  if (generateButton) {
    generateButton.addEventListener('click', async () => {
      const location = document.getElementById('report-location').value;
      const startDate = document.getElementById('report-start-date').value;
      const endDate = document.getElementById('report-end-date').value;
      
      if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
      }
      
      try {
        // Show loading state
        generateButton.disabled = true;
        generateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (location) {
          params.append('location', location);
        }
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        
        // Fetch inventory data for report
        const response = await fetch(`/api/inventory?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Generate report
        generateInventoryReport(result.data, location, startDate, endDate);
        
        // Reset button state
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Report';
        
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report: ' + error.message);
        generateButton.disabled = false;
        generateButton.textContent = 'Generate Report';
      }
    });
  }
  
  // Export buttons
  if (exportExcelButton) {
    exportExcelButton.addEventListener('click', () => {
      alert('Excel export functionality would be implemented here');
    });
  }
  
  if (exportCsvButton) {
    exportCsvButton.addEventListener('click', () => {
      alert('CSV export functionality would be implemented here');
    });
  }
  
  if (exportPdfButton) {
    exportPdfButton.addEventListener('click', () => {
      alert('PDF export functionality would be implemented here');
    });
  }
}

// Generate inventory report
function generateInventoryReport(data, location, startDate, endDate) {
  const reportContainer = document.getElementById('report-container');
  
  if (!reportContainer) return;
  
  // Format dates
  const formattedStartDate = new Date(startDate).toLocaleDateString();
  const formattedEndDate = new Date(endDate).toLocaleDateString();
  
  // Create report HTML
  let html = `
    <h4>Inventory Report</h4>
    <p><strong>Period:</strong> ${formattedStartDate} - ${formattedEndDate}</p>
    <p><strong>Location:</strong> ${location || 'All Locations'}</p>
  `;
  
  if (!data || data.length === 0) {
    html += '<p>No data available for the selected criteria.</p>';
  } else {
    // Group data by product
    const productGroups = {};
    
    data.forEach(item => {
      if (!productGroups[item.product]) {
        productGroups[item.product] = [];
      }
      productGroups[item.product].push(item);
    });
    
    // Create table
    html += `
      <table class="table table-striped mt-3">
        <thead>
          <tr>
            <th>Product</th>
            <th>Total Count</th>
            <th>Average Count</th>
            <th>Unit</th>
            <th>Last Count</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    Object.keys(productGroups).forEach(product => {
      const items = productGroups[product];
      const totalCount = items.reduce((sum, item) => sum + item.count, 0);
      const avgCount = (totalCount / items.length).toFixed(2);
      const unit = items[0].unit || '-';
      
      // Sort by date to find the most recent
      const sortedItems = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastCount = sortedItems[0].count;
      const lastDate = new Date(sortedItems[0].date).toLocaleDateString();
      
      html += `
        <tr>
          <td>${product}</td>
          <td>${totalCount}</td>
          <td>${avgCount}</td>
          <td>${unit}</td>
          <td>${lastCount} (${lastDate})</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
  }
  
  // Update report container
  reportContainer.innerHTML = html;
}
