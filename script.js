let uploadedData = null;
let mappingConfig = {};
let deconstructedData = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dataFile').addEventListener('change', handleFileUpload);
    document.getElementById('deconstructFormUrl').addEventListener('input', deconstructUrl);
    switchMode('construct'); // Start in construct mode
});

function switchMode(mode) {
    document.querySelectorAll('.mode-content').forEach(el => el.style.display = 'none');
    document.getElementById(mode + 'Mode').style.display = 'block';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        uploadedData = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header.trim()] = values[index] ? values[index].trim() : '';
                return obj;
            }, {});
        });

        displayUploadedColumns();
    };

    reader.readAsText(file);
}

function displayUploadedColumns() {
    const columnsList = document.getElementById('uploadedColumnsList');
    columnsList.innerHTML = '';

    if (uploadedData && uploadedData.length > 0) {
        const columns = Object.keys(uploadedData[0]);
        columns.forEach(column => {
            if (column !== 'Missing Field Name') {
                const li = document.createElement('li');
                li.textContent = column;
                li.draggable = true;
                li.addEventListener('dragstart', drag);
                columnsList.appendChild(li);
            }
        });
    }
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.textContent);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData("text");
    event.target.textContent = data;
}

function saveTemplate() {
    const templateName = prompt("Enter a name for this template:");
    if (templateName) {
        const templates = JSON.parse(localStorage.getItem('mappingTemplates') || '{}');
        templates[templateName] = mappingConfig;
        localStorage.setItem('mappingTemplates', JSON.stringify(templates));
        alert("Template saved successfully!");
    }
}

function loadTemplate() {
    const templates = JSON.parse(localStorage.getItem('mappingTemplates') || '{}');
    const templateNames = Object.keys(templates);
    if (templateNames.length === 0) {
        alert("No saved templates found.");
        return;
    }

    const selectedTemplate = prompt("Enter the name of the template to load:\n" + templateNames.join(", "));
    if (selectedTemplate && templates[selectedTemplate]) {
        mappingConfig = templates[selectedTemplate];
        applyMappingConfig();
        alert("Template loaded successfully!");
    } else {
        alert("Template not found.");
    }
}

function applyMappingConfig() {
    console.log("Applying mapping config:", mappingConfig);
}

function previewUrl() {
    alert("Preview functionality not yet implemented.");
}

function generateBulkUrls() {
    if (!uploadedData || uploadedData.length === 0) {
        alert("Please upload a file first.");
        return;
    }

    const baseUrl = document.getElementById('constructFormUrl').value;
    if (!baseUrl) {
        alert("Please enter a base Form URL.");
        return;
    }

    const urls = uploadedData.map(row => {
        const params = new URLSearchParams();
        for (const [formField, uploadedColumn] of Object.entries(mappingConfig)) {
            if (row[uploadedColumn] && row['Field ID']) {
                params.append(row['Field ID'], row[uploadedColumn]);
            }
        }
        return `${baseUrl}?${params.toString()}`;
    });

    displayGeneratedUrls(urls);
}

function displayGeneratedUrls(urls) {
    const output = document.getElementById('constructOutput');
    output.innerHTML = '<h3>Generated URLs:</h3>';
    const ul = document.createElement('ul');
    urls.forEach(url => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.target = '_blank';
        li.appendChild(a);
        ul.appendChild(li);
    });
    output.appendChild(ul);
}

function deconstructUrl() {
    const url = document.getElementById('deconstructFormUrl').value;
    const [baseUrl, query] = url.split('?');
    
    if (!query) {
        alert("No parameters found in the URL.");
        return;
    }

    const params = new URLSearchParams(query);
    deconstructedData = [];

    let output = '<h3>Deconstructed URL:</h3>';
    output += `<p>Base URL: ${baseUrl}</p>`;
    output += '<h4>Parameters:</h4><table id="deconstructedTable"><tr><th>Field ID</th><th>Prefill Value</th><th>Field Name</th><th>Missing Field Name</th></tr>';
    
    for (const [key, value] of params.entries()) {
        const knownField = uploadedData.find(row => row['Field ID'] === key);
        const fieldName = knownField ? knownField['Field Name'] : '';
        const rowId = `row-${key}`;
        output += `<tr id="${rowId}">
            <td>${key}</td>
            <td><input type="text" value="${decodeURIComponent(value)}" onchange="updateDeconstructedData('${rowId}')"></td>
            <td>${fieldName}</td>
            <td><input type="text" placeholder="Enter field name" onchange="updateDeconstructedData('${rowId}')"></td>
        </tr>`;
        deconstructedData.push({
            fieldId: key,
            prefillValue: decodeURIComponent(value),
            fieldName: fieldName,
            missingFieldName: ''
        });
    }
    output += '</table>';

    document.getElementById('deconstructOutput').innerHTML = output;
    updateNewLink();
}

function updateDeconstructedData(rowId) {
    const row = document.getElementById(rowId);
    const fieldId = row.cells[0].textContent;
    const prefillValue = row.cells[1].querySelector('input').value;
    const fieldName = row.cells[2].textContent;
    const missingFieldName = row.cells[3].querySelector('input').value;

    const dataIndex = deconstructedData.findIndex(item => item.fieldId === fieldId);
    if (dataIndex !== -1) {
        deconstructedData[dataIndex] = { fieldId, prefillValue, fieldName, missingFieldName };
    }

    updateNewLink();
}

function updateNewLink() {
    const baseUrl = document.getElementById('deconstructFormUrl').value.split('?')[0];
    const params = new URLSearchParams();
    
    deconstructedData.forEach(item => {
        params.append(item.fieldId, item.prefillValue);
    });

    const newLink = `${baseUrl}?${params.toString()}`;
    document.getElementById('newLink').value = newLink;
}

function exportDeconstructed() {
    let csv = 'Field Name,Field ID,Prefill Value,Missing Field Name\n';
    deconstructedData.forEach(item => {
        csv += `${item.fieldName || item.missingFieldName},${item.fieldId},${item.prefillValue},${item.missingFieldName}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "deconstructed_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function copyNewLink() {
    const newLink = document.getElementById('newLink');
    newLink.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

// Close help modal
document.querySelector('.close').onclick = function() {
    document.getElementById('helpModal').style.display = 'none';
}

// Close modal if clicked outside
window.onclick = function(event) {
    if (event.target == document.getElementById('helpModal')) {
        document.getElementById('helpModal').style.display = 'none';
    }
}
