/**
 * Sanitized Apps Script-style sample.
 * Demonstrates intake validation and promotion into an operational Jobs table.
 */

const INTAKE_SHEET_NAME = 'App_Intake';
const JOBS_SHEET_NAME = 'Jobs';
const REQUIRED_FIELDS = ['Job Date', 'Property', 'Job Type'];
const INTAKE_STATUS_FIELD = 'Processing Status';
const JOB_HEADERS = [
  'Job ID',
  'Job Date',
  'Property',
  'Unit',
  'Job Type',
  'Painter',
  'Status',
  'Notes',
  'Source Intake ID',
  'Intake Fingerprint'
];

function processIntakeRowsSample() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const intakeSheet = spreadsheet.getSheetByName(INTAKE_SHEET_NAME);
  const jobsSheet = spreadsheet.getSheetByName(JOBS_SHEET_NAME);

  const intakeValues = intakeSheet.getDataRange().getValues();
  const headers = intakeValues[0];
  const rows = intakeValues.slice(1);
  const existingFingerprints = loadExistingJobFingerprints_(jobsSheet);

  rows.forEach((row, index) => {
    const record = rowToObject_(headers, row);

    if (isAlreadyProcessed_(record)) {
      return;
    }

    const missing = REQUIRED_FIELDS.filter((field) => !record[field]);
    if (missing.length > 0) {
      markIntakeStatus_(intakeSheet, headers, index + 2, `Needs review: missing ${missing.join(', ')}`);
      return;
    }

    const fingerprint = buildIntakeFingerprint_(record);
    if (existingFingerprints.has(fingerprint)) {
      markIntakeStatus_(intakeSheet, headers, index + 2, 'Needs review: possible duplicate');
      return;
    }

    const jobRow = buildJobRow_(record, fingerprint);
    jobsSheet.appendRow(jobRow);
    existingFingerprints.add(fingerprint);
    markIntakeStatus_(intakeSheet, headers, index + 2, 'Promoted');
  });
}

function buildJobRow_(record, fingerprint) {
  return [
      Utilities.getUuid(),
      record['Job Date'],
      normalizeText_(record.Property),
      normalizeText_(record.Unit),
      record['Job Type'],
      normalizeText_(record.Painter),
      'Scheduled',
      normalizeText_(record.Notes),
      record['Intake ID'] || '',
      fingerprint
  ];
}

function rowToObject_(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index];
    return record;
  }, {});
}

function isAlreadyProcessed_(record) {
  const status = String(record[INTAKE_STATUS_FIELD] || record.Processed || '').toLowerCase();
  return status === 'promoted' || status === 'true' || status === 'skipped';
}

function markIntakeStatus_(sheet, headers, rowNumber, status) {
  const statusColumn = headers.indexOf(INTAKE_STATUS_FIELD) + 1;
  if (statusColumn < 1) {
    throw new Error(`Missing required intake status column: ${INTAKE_STATUS_FIELD}`);
  }
  sheet.getRange(rowNumber, statusColumn).setValue(status);
}

function loadExistingJobFingerprints_(jobsSheet) {
  const values = jobsSheet.getDataRange().getValues();
  if (values.length < 2) {
    return new Set();
  }

  const headers = values[0];
  const fingerprintColumn = headers.indexOf('Intake Fingerprint');
  if (fingerprintColumn < 0) {
    return new Set();
  }

  return new Set(
    values
      .slice(1)
      .map((row) => row[fingerprintColumn])
      .filter(Boolean)
  );
}

function buildIntakeFingerprint_(record) {
  const parts = [
    record['Job Date'],
    record.Property,
    record.Unit,
    record['Job Type'],
    record.Notes
  ].map(normalizeText_);

  return Utilities.base64EncodeWebSafe(parts.join('|')).slice(0, 48);
}

function normalizeText_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}
