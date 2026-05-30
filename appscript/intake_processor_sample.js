/**
 * Sanitized Apps Script-style sample.
 * Demonstrates intake validation and promotion into an operational Jobs table.
 */

const INTAKE_SHEET_NAME = 'App_Intake';
const JOBS_SHEET_NAME = 'Jobs';
const REQUIRED_FIELDS = ['Job Date', 'Property', 'Job Type'];

function processIntakeRowsSample() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const intakeSheet = spreadsheet.getSheetByName(INTAKE_SHEET_NAME);
  const jobsSheet = spreadsheet.getSheetByName(JOBS_SHEET_NAME);

  const intakeValues = intakeSheet.getDataRange().getValues();
  const headers = intakeValues[0];
  const rows = intakeValues.slice(1);

  rows.forEach((row, index) => {
    const record = rowToObject_(headers, row);

    if (record.Processed === true || record.Processed === 'TRUE') {
      return;
    }

    const missing = REQUIRED_FIELDS.filter((field) => !record[field]);
    if (missing.length > 0) {
      markIntakeStatus_(intakeSheet, index + 2, `Needs review: missing ${missing.join(', ')}`);
      return;
    }

    const jobRow = [
      Utilities.getUuid(),
      record['Job Date'],
      record.Property,
      record.Unit || '',
      record['Job Type'],
      record.Painter || '',
      'Scheduled',
      record.Notes || ''
    ];

    jobsSheet.appendRow(jobRow);
    markIntakeStatus_(intakeSheet, index + 2, 'Promoted');
  });
}

function rowToObject_(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index];
    return record;
  }, {});
}

function markIntakeStatus_(sheet, rowNumber, status) {
  const statusColumn = 1;
  sheet.getRange(rowNumber, statusColumn).setValue(status);
}
