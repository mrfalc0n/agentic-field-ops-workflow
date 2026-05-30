// ============================================================
// FieldOpsController.gs - SANITIZED PUBLIC SAMPLE
// Derived from a real 1,955-line Google Apps Script controller.
// Client identifiers, operator names, document links, and private
// property keys have been replaced with generic field-operations terms.
// Logic, function structure, workflow coverage, and implementation detail
// are intentionally preserved for public review.
// ============================================================
// ============================================================
// FieldOpsController.gs - CONSOLIDATED v6.1
// Master sheet: FieldOps_Master_Sheet
// Changes from v6:
//   - Extended all row ranges from 200 to 500
//   - QC clear range now includes col J (Painter Order)
//
// Changes from v5:
//   - Added Painter Order column (J) to Scheduler tab
//   - Added Save Painter Order menu item + syncPainterOrderToJobs()
//   - Added Repair Split Override (AG col) with setRepairSplitOverride()
//   - Added PayoutSummary tab with refreshPayoutSummary()
//   - Added fixExistingJobDates() for UTC timezone rollback fix
//   - clearJobsData() + clearSelectedRow() now include col 33 (AG)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔧 Field Ops Tools')
    .addItem('Refresh Scheduler', 'refreshScheduler')
    .addItem('Save Schedule to Jobs', 'syncScheduleToJobs')
    .addSeparator()
    .addItem('Process App Intake', 'processAppIntake')
    .addSeparator()
    .addItem('Refresh Weekly View', 'refreshWeeklyView')
    .addItem('Refresh Payout Summary', 'refreshPayoutSummary')
      .addItem('Repeat Last Property', 'repeatLastProperty')
    .addSeparator()
    .addItem('Clear Selected Job', 'clearSelectedRow')
    // 'Clear All Job Data (Safe)' hidden — destructive, for demo/setup only.
    // Re-enable by uncommenting the line below when needed.
    // .addItem('Clear All Job Data (Safe)', 'clearJobsData')
    .addSeparator()
    .addItem('📋 Instructions', 'openInstructions')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('⚙️ Advanced')
      .addItem('Set Repair Split Override', 'setRepairSplitOverride')
      .addSeparator()
      .addItem('🔒 Protect Jobs Structure', 'protectJobsStructure')
      .addItem('🔓 Remove Jobs Protection', 'removeJobsProtection')
      .addSeparator()
      .addItem('Repair Jobs Formula Columns', 'repairJobsFormulaColumns')
      .addSeparator()
      .addItem('Setup App Intake Automation', 'setupAppIntakeAutomation')
      .addItem('Remove App Intake Automation', 'removeAppIntakeAutomation')
      .addSeparator()
      .addItem('Setup Payout Summary Automation', 'setupPayoutSummaryAutomation')
      .addItem('Remove Payout Summary Automation', 'removePayoutSummaryAutomation')
      .addSeparator()
      .addItem('↕️ Auto-Resize Job Rows', 'autoResizeJobRows')
      .addSeparator()
      .addItem('💾 Run Backup Now', 'runBackupNow')
      .addItem('📅 Setup Weekly Backup', 'setupWeeklyBackupTrigger')
      .addItem('📦 Check Backup Status', 'checkBackupStatus')
      .addItem('🗑️ Remove Backup Schedule', 'removeWeeklyBackupTrigger'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🔗 QuickBooks')
      .addItem('Push Invoices to QBO', 'qboPushWeeklyInvoices')
      .addSeparator()
      .addItem('Connect to QuickBooks', 'qboAuthorize')
      .addItem('Check Connection Status', 'qboCheckConnection')
      .addItem('Disconnect', 'qboDisconnect')
      .addSeparator()
      .addItem('⚙️ Save Redirect URI', 'qboSaveRedirectUri')
      .addItem('⚙️ Setup Jobs Column (one-time)', 'qboSetupJobsColumn'))
    .addToUi();
}

// ============================================================
// APP INTAKE PROCESSOR
// Promotes AppSheet intake rows into Jobs without changing the Jobs schema.
// ============================================================

const APP_INTAKE_TRIGGER_HANDLER = 'processAppIntakeTrigger';

function processAppIntake() {
  const result = processAppIntake_({ showUi: true });
  return result;
}

function processAppIntakeTrigger() {
  processAppIntake_({ showUi: false });
}

function setupAppIntakeAutomation() {
  removeAppIntakeAutomation_();
  ScriptApp.newTrigger(APP_INTAKE_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(5)
    .create();

  SpreadsheetApp.getUi().alert(
    'App Intake automation is on.\n\n' +
    'New App_Intake rows will be checked about every 5 minutes.'
  );
}

function removeAppIntakeAutomation() {
  const removed = removeAppIntakeAutomation_();
  SpreadsheetApp.getUi().alert(
    removed
      ? 'App Intake automation was removed.'
      : 'No App Intake automation trigger was found.'
  );
}

function removeAppIntakeAutomation_() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = false;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === APP_INTAKE_TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
      removed = true;
    }
  }
  return removed;
}

function processAppIntake_(options) {
  const showUi = options && options.showUi;
  const ss = getFieldOpsSpreadsheet_();
  const intake = ss.getSheetByName('App_Intake');
  const jobs = ss.getSheetByName('Jobs');

  if (!intake || !jobs) {
    return finishAppIntake_('Missing App_Intake or Jobs tab.', showUi);
  }

  const intakeLastRow = intake.getLastRow();
  if (intakeLastRow < 2) {
    return finishAppIntake_('No App_Intake rows found.', showUi);
  }

  const intakeLastCol = intake.getLastColumn();
  const intakeHeaders = intake.getRange(1, 1, 1, intakeLastCol).getValues()[0];
  const intakeMap = buildHeaderMap_(intakeHeaders);
  const intakeData = intake.getRange(2, 1, intakeLastRow - 1, intakeLastCol).getValues();

  const jobsLastCol = jobs.getLastColumn();
  const jobsHeaders = jobs.getRange(1, 1, 1, jobsLastCol).getValues()[0];
  const jobsMap = buildHeaderMap_(jobsHeaders);
  const jobsMaxRow = Math.min(500, jobs.getMaxRows());
  if (jobsMaxRow < 2) {
    return finishAppIntake_('Jobs tab has no writable data rows.', showUi);
  }
  const jobsData = jobs.getRange(2, 1, jobsMaxRow - 1, jobsLastCol).getValues();
  const jobsFormulas = jobs.getRange(2, 1, jobsMaxRow - 1, jobsLastCol).getFormulas();

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < intakeData.length; i++) {
    const row = intakeData[i];
    const intakeRowNumber = i + 2;

    if (isProcessed_(getByHeader_(row, intakeMap, ['Processed']))) {
      skipped++;
      continue;
    }

    const intakeId = String(getByHeader_(row, intakeMap, ['IntakeID']) || '').trim();
    const jobDate = getByHeader_(row, intakeMap, ['Job Date', 'JobDate']);
    const property = String(getByHeader_(row, intakeMap, ['Property']) || '').trim();
    const unitType = String(getByHeader_(row, intakeMap, ['Unit Type', 'UnitType']) || '').trim();

    try {
      if (!property || !jobDate || !unitType) {
        throw new Error('Missing required field: Property, Job Date, and Unit Type are required.');
      }

      const existingJobsRow = intakeId
        ? findJobsRowByIntakeId_(jobsData, jobsMap, intakeId)
        : null;

      if (existingJobsRow) {
        markIntakeProcessed_(intake, intakeMap, intakeRowNumber, existingJobsRow, '');
        skipped++;
        continue;
      }

      const targetRow = findNextAvailableJobsRow_(jobsData, jobsMap);
      if (!targetRow) {
        throw new Error('No open Jobs row found between rows 2 and 500.');
      }

      writeIntakeToJobs_(jobs, jobsMap, jobsFormulas[targetRow - 2], targetRow, row, intakeMap);
      reserveJobsRow_(jobsData, jobsMap, targetRow, row, intakeMap);
      markIntakeProcessed_(intake, intakeMap, intakeRowNumber, targetRow, '');
      processed++;
    } catch (err) {
      markIntakeError_(intake, intakeMap, intakeRowNumber, err.message);
      failed++;
    }
  }

  return finishAppIntake_(
    'App Intake processing complete.\n\n' +
    'Processed: ' + processed + '\n' +
    'Skipped: ' + skipped + '\n' +
    'Failed: ' + failed,
    showUi
  );
}

function writeIntakeToJobs_(jobs, jobsMap, targetFormulas, targetRow, intakeRow, intakeMap) {
  const mappings = [
    { intake: ['Job Date', 'JobDate'], jobs: ['Job Date', 'JobDate'] },
    { intake: ['Property'], jobs: ['Property'] },
    { intake: ['Unit#', 'Unit #', 'Unit'], jobs: ['Unit#', 'Unit #', 'Unit'] },
    { intake: ['Unit Type', 'UnitType'], jobs: ['Unit Type', 'UnitType'] },
    { intake: ['Painter'], jobs: ['Painter'] },
    { intake: ['Status'], jobs: ['Status'], fallback: 'Scheduled' },
    { intake: ['Repair Desc', 'Repair Description'], jobs: ['Repair Desc', 'Repair Description'] },
    { intake: ['Repair $', 'Repair'], jobs: ['Repair $', 'Repair'] },
    { intake: ['PO#', 'PO'], jobs: ['PO#', 'PO'] },
    { intake: ['Notes'], jobs: ['Notes'] },
    { intake: ['IntakeID'], jobs: ['IntakeID', 'Intake ID'] },
    { intake: ['AddOn 1', 'Add On 1'], jobs: ['AddOn 1', 'Add On 1'] },
    { intake: ['AddOn 2', 'Add On 2'], jobs: ['AddOn 2', 'Add On 2'] },
    { intake: ['AddOn 3', 'Add On 3'], jobs: ['AddOn 3', 'Add On 3'] }
  ];

  for (const mapping of mappings) {
    let value = getByHeader_(intakeRow, intakeMap, mapping.intake);
    if ((value === '' || value === null || value === undefined) && mapping.fallback !== undefined) {
      value = mapping.fallback;
    }
    setJobsValueIfWritable_(jobs, jobsMap, targetFormulas, targetRow, mapping.jobs, value);
  }

  const repairAmount = parseFloat(getByHeader_(intakeRow, intakeMap, ['Repair $', 'Repair']));
  if (!isNaN(repairAmount) && repairAmount > 0) {
    setJobsValueIfWritable_(jobs, jobsMap, targetFormulas, targetRow, ['Repair Pay', 'Repair Payout'], Math.round(repairAmount * 0.5 * 100) / 100);
  }
}

function setJobsValueIfWritable_(sheet, jobsMap, targetFormulas, rowNumber, headers, value) {
  if (value === undefined || value === null || value === '') return;

  const colIndex = findHeaderIndex_(jobsMap, headers);
  if (colIndex === null) return;

  if (targetFormulas && targetFormulas[colIndex]) return;
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
}

function findNextAvailableJobsRow_(jobsData, jobsMap) {
  const propertyIdx = findHeaderIndex_(jobsMap, ['Property']);
  const jobDateIdx = findHeaderIndex_(jobsMap, ['Job Date', 'JobDate']);
  const intakeIdIdx = findHeaderIndex_(jobsMap, ['IntakeID', 'Intake ID']);

  for (let i = 0; i < jobsData.length; i++) {
    const row = jobsData[i];
    const hasProperty = propertyIdx !== null && row[propertyIdx];
    const hasDate = jobDateIdx !== null && row[jobDateIdx];
    const hasIntakeId = intakeIdIdx !== null && row[intakeIdIdx];
    if (!hasProperty && !hasDate && !hasIntakeId) return i + 2;
  }
  return null;
}

function reserveJobsRow_(jobsData, jobsMap, rowNumber, intakeRow, intakeMap) {
  const localRow = jobsData[rowNumber - 2];
  setLocalByHeader_(localRow, jobsMap, ['Job Date', 'JobDate'], getByHeader_(intakeRow, intakeMap, ['Job Date', 'JobDate']));
  setLocalByHeader_(localRow, jobsMap, ['Property'], getByHeader_(intakeRow, intakeMap, ['Property']));
  setLocalByHeader_(localRow, jobsMap, ['IntakeID', 'Intake ID'], getByHeader_(intakeRow, intakeMap, ['IntakeID']));
}

function findJobsRowByIntakeId_(jobsData, jobsMap, intakeId) {
  const intakeIdIdx = findHeaderIndex_(jobsMap, ['IntakeID', 'Intake ID']);
  if (intakeIdIdx === null) return null;

  for (let i = 0; i < jobsData.length; i++) {
    if (String(jobsData[i][intakeIdIdx] || '').trim() === intakeId) return i + 2;
  }
  return null;
}

function markIntakeProcessed_(sheet, intakeMap, rowNumber, jobsRow, errorMessage) {
  setByHeader_(sheet, intakeMap, rowNumber, ['Processed'], true);
  setByHeader_(sheet, intakeMap, rowNumber, ['JobsRow', 'Jobs Row'], jobsRow);
  setByHeader_(sheet, intakeMap, rowNumber, ['ProcessedAt', 'Processed At'], new Date());
  setByHeader_(sheet, intakeMap, rowNumber, ['Error'], errorMessage || '');
}

function markIntakeError_(sheet, intakeMap, rowNumber, message) {
  setByHeader_(sheet, intakeMap, rowNumber, ['Error'], message);
}

function finishAppIntake_(message, showUi) {
  if (showUi) {
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (err) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
  return message;
}

function buildHeaderMap_(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    map[normalizeHeader_(headers[i])] = i;
  }
  return map;
}

function findHeaderIndex_(headerMap, names) {
  for (const name of names) {
    const key = normalizeHeader_(name);
    if (Object.prototype.hasOwnProperty.call(headerMap, key)) return headerMap[key];
  }
  return null;
}

function getByHeader_(row, headerMap, names) {
  const idx = findHeaderIndex_(headerMap, names);
  return idx === null ? '' : row[idx];
}

function setByHeader_(sheet, headerMap, rowNumber, names, value) {
  const idx = findHeaderIndex_(headerMap, names);
  if (idx !== null) sheet.getRange(rowNumber, idx + 1).setValue(value);
}

function setLocalByHeader_(row, headerMap, names, value) {
  const idx = findHeaderIndex_(headerMap, names);
  if (idx !== null) row[idx] = value;
}

function normalizeHeader_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isProcessed_(value) {
  const text = String(value || '').trim().toLowerCase();
  return value === true || text === 'true' || text === 'yes' || text === 'processed';
}

function getWeekMonday_(value) {
  if (!value) return '';
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (isNaN(date.getTime())) return '';
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}


// ============================================================
//  FIELD OPS TOOLS — refreshScheduler() + syncScheduleToJobs() v4
//
//  FIXES IN THIS VERSION:
//  1. Merge error → breakApart() now runs on ENTIRE sheet (all rows,
//     all columns) before any other operation. No more partial-merge issues.
//  2. Stale H/I data → full sheet width cleared from row 4 down.
//  3. Unit #s alignment → col D explicitly set to LEFT after write.
//  4. Jobs hyperlink → new visible col F "Jobs" links directly to the
//     job row(s) in the Jobs tab. Multi-unit rows show "3 jobs →".
//  5. Status display → "—" shown when status is blank instead of empty cell.
//
//  COLUMN LAYOUT (7 visible + 2 hidden):
//    A = Stop         (editable, yellow when sequencing needed)
//    B = Property
//    C = Units        (count)
//    D = Unit #s      (comma-separated, left-aligned)
//    E = Status/Painter
//    F = Jobs         (hyperlink → Jobs tab row)
//    G = Job row refs (HIDDEN — internal use by syncScheduleToJobs)
//    H = Row type tag (HIDDEN — internal use by syncScheduleToJobs)
//
//  ── COLOR PALETTE ────────────────────────────────────────────────────────
//  All colors are defined as constants near the top of refreshScheduler().
//  To change any color, edit the hex value and re-run Refresh Scheduler.
//
//    Day banners:           C_DAY      = '#1F3864'  (dark navy)
//    QC Route header:       C_QC_HDR   = '#6A0DAD'  (purple)
//    Painter Dispatch hdr:  C_PT_HDR   = '#1E5631'  (dark green)
//    Column header rows:    C_COL_HDR  = '#D0E4F7'  (light blue)
//    Painter sub-banners:   C_PT_SUB   = '#BDD7EE'  (pale blue)
//    Stop cells (editable): C_YELLOW   = '#FFF2CC'  (yellow)
//    Painter data rows:     C_GREY     = '#F3F3F3'  (light grey)
//
//  Status row background colors live in statusColor() function below.
//    Scheduled   → '#FCE4D6'  (peach)
//    In Progress → '#FCE8B2'  (amber)
//    Complete    → '#D9EAD3'  (green)
//    Invoice Sent    → '#CFE2F3'  (blue)
//    Follow-Up   → '#EFEFEF'  (grey)
//  ─────────────────────────────────────────────────────────────────────────
//
//  REPLACE your existing refreshScheduler() AND syncScheduleToJobs().
//  Everything else in FieldOpsController.gs is unchanged.
// ============================================================


// ============================================================
//  refreshScheduler() — v5 PATCH
//
//  FIXES FROM v4:
//  1. Col F (Jobs hyperlink) was hidden from old script run that called
//     hideColumns(5,2). Fix: showColumns(1, maxCols) at start to unhide
//     everything before re-hiding only G and H at the end.
//  2. B1 date format was showing "3/9/2026 9:00:00" — fix: set number
//     format 'M/d/yyyy' on B1 after reading the week value.
//  3. setupQCHeaders_() is now dead code — safe to delete from FieldOpsController.gs.
//     It was a helper for the old QC Assignment layout.
//
//  REPLACE your existing refreshScheduler() with this one.
//  syncScheduleToJobs() and everything else UNCHANGED.
//
//  ── COLOR REFERENCE ──────────────────────────────────────────────────────
//  Edit these constants near the top of the function to change colors.
//  Re-run Refresh Scheduler to apply.
//
//    C_DAY      '#1F3864'  Dark navy      — Day banners
//    C_QC_HDR   '#6A0DAD'  Purple         — QC Route header
//    C_PT_HDR   '#1E5631'  Dark green     — Painter Dispatch header
//    C_COL_HDR  '#D0E4F7'  Light blue     — Column header rows
//    C_PT_SUB   '#BDD7EE'  Pale blue      — Painter sub-banners
//    C_YELLOW   '#FFF2CC'  Yellow         — Editable Stop cells
//    C_GREY     '#F3F3F3'  Light grey     — Painter data rows
//
//  Status row colors are in statusColor() below the palette.
//    Scheduled   '#FCE4D6'  Peach
//    In Progress '#FCE8B2'  Amber
//    Complete    '#D9EAD3'  Green
//    Invoice Sent    '#CFE2F3'  Blue
//    Follow-Up   '#EFEFEF'  Grey
// ============================================================

function refreshScheduler() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const jobsSheet = ss.getSheetByName('Jobs');
  const sched     = ss.getSheetByName('Scheduler');

  if (!sched) {
    SpreadsheetApp.getUi().alert('Scheduler tab not found. Tab must be named exactly "Scheduler".');
    return;
  }

  const maxRows = sched.getMaxRows();
  const maxCols = sched.getMaxColumns();

  // ── FIX 1: Unhide ALL columns first ──────────────────────────────────────
  // Previous script versions hid cols 5–6 (E, F). Without this, col F
  // (Jobs hyperlink) stays hidden even after we moved hidden cols to G & H.
  sched.showColumns(1, maxCols);

  // ── Week selection ────────────────────────────────────────────────────────
  const weekVal = sched.getRange('B1').getValue();

  // ── FIX 2: Format B1 as date only (no time) ──────────────────────────────
  sched.getRange('B1').setNumberFormat('M/d/yyyy');

  if (!weekVal) {
    SpreadsheetApp.getUi().alert('Select a week from the dropdown in cell B1 first.');
    return;
  }

  const weekStart = new Date(weekVal);
  weekStart.setHours(12, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const tz = Session.getScriptTimeZone();

  // ── Break ALL merges across entire sheet ─────────────────────────────────
  sched.getRange(1, 1, maxRows, maxCols).breakApart();

  // ── Clear full sheet width from row 4 down ───────────────────────────────
  const clearRows = Math.max(sched.getLastRow() - 3, 10);
  sched.getRange(4, 1, clearRows, maxCols).clearContent().clearFormat();

  // ── Read Jobs tab ─────────────────────────────────────────────────────────
  // 0-based offsets from col A:
  //   B=1(date)  C=2(property)  D=3(unit#)  F=5(painter)
  //   H=7(status)  AD=29(painterOrder)  AE=30(qcOrder)
  const JOBS_LAST_ROW = 500;
  const jobsData = jobsSheet.getRange(2, 1, JOBS_LAST_ROW - 1, 33).getValues();

  const ssId    = ss.getId();
  const jobsGid = jobsSheet.getSheetId();

  // ── Aggregate into dayMap ─────────────────────────────────────────────────
  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const dayMap    = {};

  for (let i = 0; i < jobsData.length; i++) {
    const row     = jobsData[i];
    const jobDate = row[1];
    if (!jobDate || !(jobDate instanceof Date)) continue;

    const d = new Date(jobDate);
    d.setHours(12, 0, 0, 0);
    if (d < weekStart || d > weekEnd) continue;

    const property   = String(row[2]  || '').trim();
    const unitNum    = String(row[3]  || '').trim();
    const painter    = String(row[5]  || '').trim();
    const status     = String(row[7]  || '').trim();
    const qcOrder    = row[31];
    const painterOrd = row[30];
    if (!property) continue;

    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
    const jobRow  = i + 2;

    if (!dayMap[dayName]) dayMap[dayName] = { date: d, qcProps: {}, painters: {} };
    const day = dayMap[dayName];

    // QC — by property
    if (!day.qcProps[property]) {
      day.qcProps[property] = { units: 0, unitNums: [], painters: [], statusCounts: {}, jobRows: [], savedStop: '' };
    }
    const qp = day.qcProps[property];
    qp.units++;
    if (unitNum) qp.unitNums.push(unitNum);
      if (painter && !qp.painters.includes(painter)) qp.painters.push(painter);
    qp.statusCounts[status] = (qp.statusCounts[status] || 0) + 1;
    qp.jobRows.push(jobRow);
    if (qp.savedStop === '' && qcOrder !== '' && qcOrder != null) qp.savedStop = qcOrder;

    // Painter — by painter → property
    if (painter) {
      if (!day.painters[painter]) day.painters[painter] = {};
      if (!day.painters[painter][property]) {
        day.painters[painter][property] = { units: 0, unitNums: [], jobRows: [], savedStop: '' };
      }
      const pp = day.painters[painter][property];
      pp.units++;
      if (unitNum) pp.unitNums.push(unitNum);
      pp.jobRows.push(jobRow);
      if (pp.savedStop === '' && painterOrd !== '' && painterOrd != null) pp.savedStop = painterOrd;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sortedProps(obj) {
    return Object.entries(obj).sort((a, b) => {
      const aS = a[1].savedStop, bS = b[1].savedStop;
      const aN = Number(aS), bN = Number(bS);
      const aH = aS !== '' && !isNaN(aN);
      const bH = bS !== '' && !isNaN(bN);
      if (aH && bH) return aN - bN;
      if (aH) return -1;
      if (bH) return  1;
      return a[0].localeCompare(b[0]);
    });
  }

  function dominantStatus(counts) {
    const entries = Object.entries(counts).filter(e => e[0] !== '');
    if (!entries.length) return '';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // ── STATUS COLORS — edit hex values here, re-run Refresh to apply ─────────
  function statusColor(s) {
    const map = {
      'Scheduled':    '#FCE4D6',
      'In Progress':  '#FCE8B2',
      'Complete':     '#D9EAD3',
      'Invoiced':     '#CFE2F3', // written by QBO push — blue
      'Invoice Sent': '#CFE2F3', // legacy label — same blue
      'Follow-Up':    '#EFEFEF',
    };
    return map[s] || '#FFFFFF';
  }

  function jobLink(rowNum) {
    return 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit#gid=' + jobsGid + '&range=A' + rowNum;
  }

  // ── COLOR PALETTE — edit hex values here, re-run Refresh to apply ─────────
  const C_DAY       = '#1F3864';
  const C_QC_HDR    = '#6A0DAD';
  const C_PT_HDR    = '#1E5631';
  const C_COL_HDR   = '#D0E4F7';
  const C_PT_SUB    = '#BDD7EE';
  const C_YELLOW    = '#FFF2CC';
  const C_GREY      = '#F3F3F3';
  const C_WHITE     = '#FFFFFF';
  const C_WHITE_TXT = '#FFFFFF';
  const C_BLACK     = '#000000';
  const C_DARK_BLU  = '#1F3864';

  // ── Build row descriptors ─────────────────────────────────────────────────
  // vals[8]: [Stop, Property, Units, Unit#s, Status/Painter, Jobs, JobRefs(hidden), RowType(hidden)]
  const rows          = [];
  const orderedDays   = DAY_ORDER.filter(d => dayMap[d]);

  if (orderedDays.length === 0) {
    rows.push({
      vals: ['No jobs found for this week.','','','','','','',''],
      bg: C_WHITE, fgColor: '#888888', bold: false, fontSize: 10, type: 'INFO'
    });
  }

  for (const dayName of orderedDays) {
    const day     = dayMap[dayName];
    const dateStr = Utilities.formatDate(day.date, tz, 'M/d/yyyy');

    // Day banner
    rows.push({
      vals: [dayName.toUpperCase() + '   —   ' + dateStr,'','','','','','',''],
      bg: C_DAY, fgColor: C_WHITE_TXT, bold: true, fontSize: 11,
      mergeAF: true, type: 'DAY_BANNER'
    });

    // QC Route header
    rows.push({
      vals: ['📋  QC ROUTE — GABE','','','','','','',''],
      bg: C_QC_HDR, fgColor: C_WHITE_TXT, bold: true, fontSize: 11,
      mergeAF: true, type: 'SECTION_HDR'
    });
    rows.push({
      vals: ['Stop','Property','Painter','Units','Unit #s','Status','Jobs',''],
      bg: C_COL_HDR, fgColor: C_BLACK, bold: true, fontSize: 10, type: 'COL_HDR'
    });

    for (const [prop, data] of sortedProps(day.qcProps)) {
      const status   = dominantStatus(data.statusCounts);
      const unitList = data.unitNums.join(', ');
      const linkText = data.jobRows.length === 1 ? 'View →' : data.jobRows.length + ' jobs →';
      const linkUrl  = jobLink(data.jobRows[0]);
      rows.push({
        vals: [
          data.savedStop !== '' ? data.savedStop : '',
          prop, data.painters.join(', '), data.units, unitList,
          status !== '' ? status : '—',
          linkText,
          data.jobRows.join(','),
          'QC'
        ],
        bg: statusColor(status), colAbg: C_YELLOW,
        fgColor: C_BLACK, bold: false, fontSize: 10,
        type: 'QC_ROW', linkUrl, linkCol: 7
      });
    }

    rows.push({ vals: ['','','','','','','',''], bg: C_WHITE, type: 'SPACER' });

    // Painter Dispatch header
    rows.push({
      vals: ['🎨  PAINTER DISPATCH','','','','','','',''],
      bg: C_PT_HDR, fgColor: C_WHITE_TXT, bold: true, fontSize: 11,
      mergeAF: true, type: 'SECTION_HDR'
    });
    rows.push({
      vals: ['Stop','Property','Units','Unit #s','Painter','Jobs','',''],
      bg: C_COL_HDR, fgColor: C_BLACK, bold: true, fontSize: 10, type: 'COL_HDR'
    });

    const painterNames = Object.keys(day.painters).sort();

    if (painterNames.length === 0) {
      rows.push({
        vals: ['','No painter assigned to any job this day.','','','','','',''],
        bg: C_WHITE, fgColor: '#888888', bold: false, fontSize: 10, type: 'INFO'
      });
    }

    for (const painter of painterNames) {
      const painterProps = day.painters[painter];
      const propCount    = Object.keys(painterProps).length;
      const multiLabel   = propCount > 1 ? '  (' + propCount + ' properties)' : '';

      rows.push({
        vals: ['', '▸  ' + painter.toUpperCase() + multiLabel,'','','','','','PAINTER_BANNER'],
        bg: C_PT_SUB, fgColor: C_DARK_BLU, bold: true, fontSize: 10,
        mergeAF: true, type: 'PAINTER_BANNER'
      });

      for (const [prop, data] of sortedProps(painterProps)) {
        const unitList = data.unitNums.join(', ');
        const linkText = data.jobRows.length === 1 ? 'View →' : data.jobRows.length + ' jobs →';
        const linkUrl  = jobLink(data.jobRows[0]);
        rows.push({
          vals: [
            data.savedStop !== '' ? data.savedStop : '',
            prop, data.units, unitList, painter,
            linkText,
            data.jobRows.join(','),
            'PAINTER'
          ],
          bg: C_GREY, colAbg: propCount > 1 ? C_YELLOW : C_GREY,
          fgColor: C_BLACK, bold: false, fontSize: 10,
          type: 'PAINTER_ROW', linkUrl, linkCol: 6
        });
      }
    }

    rows.push({ vals: ['','','','','','','',''], bg: C_WHITE, type: 'SPACER' });
    rows.push({ vals: ['','','','','','','',''], bg: C_WHITE, type: 'SPACER' });
  }

  // ── Write values ──────────────────────────────────────────────────────────
  const DATA_START = 4;
  const NUM_COLS   = 8;
  const grid = rows.map(r => { while (r.vals.length < 9) r.vals.push(''); return r.vals; });
  sched.getRange(DATA_START, 1, grid.length, 9).setValues(grid);

  // ── Format row by row + collect hyperlink cells ───────────────────────────
  const hyperlinkCells = [];

  for (let i = 0; i < rows.length; i++) {
    const r        = rows[i];
    const sheetRow = DATA_START + i;

    sched.getRange(sheetRow, 1, 1, NUM_COLS)
      .setBackground(r.bg || C_WHITE)
      .setFontColor(r.fgColor || C_BLACK)
      .setFontWeight(r.bold ? 'bold' : 'normal')
      .setFontSize(r.fontSize || 10)
      .setFontFamily('Arial')
      .setHorizontalAlignment('left');

    if (r.colAbg) sched.getRange(sheetRow, 1).setBackground(r.colAbg);

    if (r.mergeAF) sched.getRange(sheetRow, 1, 1, 6).merge();

    if (r.linkUrl && r.linkCol) {
      hyperlinkCells.push({ sheetRow, col: r.linkCol, text: r.vals[r.linkCol - 1], url: r.linkUrl });
    }

    const heights = { DAY_BANNER: 30, SECTION_HDR: 26, SPACER: 10 };
    sched.setRowHeight(sheetRow, heights[r.type] || 22);
  }

  // ── Apply hyperlinks ──────────────────────────────────────────────────────
  for (const h of hyperlinkCells) {
    const rtv = SpreadsheetApp.newRichTextValue()
      .setText(h.text)
      .setLinkUrl(h.url)
      .build();
    sched.getRange(h.sheetRow, h.col)
      .setRichTextValue(rtv)
      .setFontColor('#1155CC')
      .setFontLine('underline');
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  sched.setColumnWidth(1,  55);   // A: Stop
  sched.setColumnWidth(2, 265);   // B: Property
  sched.setColumnWidth(3,  50);   // C: Units count
  sched.setColumnWidth(4, 175);   // D: Unit #s
  sched.setColumnWidth(5, 130);   // E: Status / Painter
  sched.setColumnWidth(6,  70);   // F: Jobs hyperlink  ← was hidden in old runs
  sched.setColumnWidth(7,  20);   // G: Job row refs    (hidden)
  sched.setColumnWidth(8,  20);   // H: Row type tag    (hidden)

  // Hide only G and H
  sched.hideColumns(7, 2);

  // ── Instructions row 2 ───────────────────────────────────────────────────
  sched.getRange(2, 1, 1, 6).breakApart().merge();
  sched.getRange(2, 1)
    .setValue('Enter Stop # in yellow cells → 🔧 Field Ops Tools → Save Schedule to Jobs   |   Status is a snapshot — re-run Refresh to update')
    .setFontStyle('italic')
    .setFontColor('#555555')
    .setFontSize(9)
    .setFontFamily('Arial')
    .setBackground(C_WHITE);
  sched.setRowHeight(2, 18);

  SpreadsheetApp.getUi().alert(
    '✅ Scheduler refreshed for week of ' + Utilities.formatDate(weekStart, tz, 'M/d/yyyy')
  );
}

//
//
// ── Instructions ────────────────────────────────────────────────────────
//  Link to internal field-operations documentation.
//
//

function openInstructions() {
  var url = 'https://example.com/internal-field-ops-instructions';
  var html = HtmlService.createHtmlOutput(
    '<script>window.open("' + url + '", "_blank"); google.script.host.close();</script>'
  )
  .setWidth(10).setHeight(10);
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening Instructions...');
}

// ── syncScheduleToJobs ────────────────────────────────────────────────────────
//
//  Reads Scheduler tab and writes Stop # values back to Jobs tab.
//  Col G (index 6) = Job row refs  → was col F in v3
//  Col H (index 7) = Row type tag  → was col G in v3
//
//  QC rows    → Jobs tab col AE (column 31)
//  Painter rows → Jobs tab col AD (column 30)
//
//  Fans out to ALL job rows listed in col G (comma-separated).

function syncScheduleToJobs() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sched     = ss.getSheetByName('Scheduler');
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!sched || !jobsSheet) {
    SpreadsheetApp.getUi().alert('Could not find Scheduler or Jobs tab.');
    return;
  }

  const lastRow   = sched.getLastRow();
  const DATA_START = 4;
  if (lastRow < DATA_START) {
    SpreadsheetApp.getUi().alert('No scheduler data found. Run Refresh Scheduler first.');
    return;
  }

  const numRows   = lastRow - DATA_START + 1;
  const schedData = sched.getRange(DATA_START, 1, numRows, 8).getValues();
  // 0-based: 0=Stop, 1=Prop, 2=Units, 3=Unit#s, 4=Status/Painter, 5=Jobs(link), 6=JobRefs, 7=RowType

  const updates = [];

  for (let i = 0; i < schedData.length; i++) {
    const stopVal = schedData[i][0];
    // Dynamic scan: find type tag from right (handles both 8-col PT and 9-col QC rows)
    let rowType = '', jobRefs = '';
    for (let c = schedData[i].length - 1; c >= 1; c--) {
      const val = String(schedData[i][c] || '').trim();
      if (val === 'QC' || val === 'PAINTER') {
        rowType = val;
        jobRefs = String(schedData[i][c - 1] || '').trim();
        break;
      }
    }

    if (rowType !== 'QC' && rowType !== 'PAINTER') continue;
    if (!jobRefs) continue;

    const jobRows = jobRefs.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 2 && n <= 500);

    const targetCol = rowType === 'QC' ? 31 : 30;  // AE=31, AD=30

    for (const jobRow of jobRows) {
      updates.push({ row: jobRow, col: targetCol, val: stopVal !== '' ? stopVal : '' });
    }
  }

  if (updates.length === 0) {
    SpreadsheetApp.getUi().alert('Nothing to save. Run Refresh Scheduler first.');
    return;
  }

  const qcUpdates = updates.filter(u => u.col === 32);
  const ptUpdates = updates.filter(u => u.col === 31);

  for (const u of qcUpdates) jobsSheet.getRange(u.row, u.col).setValue(u.val);
  for (const u of ptUpdates) jobsSheet.getRange(u.row, u.col).setValue(u.val);

  const qcJobs = new Set(qcUpdates.map(u => u.row)).size;
  const ptJobs = new Set(ptUpdates.map(u => u.row)).size;

  SpreadsheetApp.getUi().alert(
    '✅ Schedule saved to Jobs tab.\n\n' +
    '📋 QC stops written:      ' + qcJobs + ' job rows\n' +
    '🎨 Painter stops written: ' + ptJobs + ' job rows'
  );
}

// ============================================================
// QBO NOTE BUILDER
// Aggregates job data into a customer-facing invoice description
// Format: Unit 302 | 2BR | Paint: $280.00 | Cabinets: $250.00 | Repair: Replace sheetrock $160.00
// ============================================================
function buildQBONote_(job) {
  var parts = [];

  // 1. Unit # and Unit Type
  var unitPart = '';
  if (job.unitNum)  unitPart += 'Unit ' + job.unitNum;
  if (job.unitType) unitPart += (unitPart ? ' | ' : '') + job.unitType;
  if (unitPart) parts.push(unitPart);

  // 2. Paint Charge
  if (job.baseCharge && job.baseCharge !== '') {
    parts.push('Paint Charge: $' + parseFloat(job.baseCharge).toFixed(2));
  }

  // 3. Repair Charge
  if (job.repairAmt && job.repairAmt !== '') {
    parts.push('Repair Charge: $' + parseFloat(job.repairAmt).toFixed(2));
  }

  // 4. Repair Desc
  if (job.repairDesc && job.repairDesc !== '') {
    parts.push('Repair Desc: ' + job.repairDesc);
  }

  // 5. PO# (customer-provided reference — appears on invoice)
  // AE# (col AA) was Owner's manual QBO invoice # backfill — now auto-populated
  // in col AI by the push script, so it is intentionally excluded here.
  if (job.po) parts.push('PO# ' + job.po);

  // 6. Notes
  if (job.notes && job.notes !== '') {
    parts.push('Notes: ' + job.notes);
  }

  // 7. AddOns (name + charge)
  if (job.addon1 && job.addon1 !== '' && job.addon1$ && job.addon1$ !== '') {
    parts.push(job.addon1 + ' Charge: $' + parseFloat(job.addon1$).toFixed(2));
  }
  if (job.addon2 && job.addon2 !== '' && job.addon2$ && job.addon2$ !== '') {
    parts.push(job.addon2 + ' Charge: $' + parseFloat(job.addon2$).toFixed(2));
  }
  if (job.addon3 && job.addon3 !== '' && job.addon3$ && job.addon3$ !== '') {
    parts.push(job.addon3 + ' Charge: $' + parseFloat(job.addon3$).toFixed(2));
  }

  return parts.join(' | ');
}

// ============================================================
// ============================================================
// WEEKLY VIEW TAB
// Full job detail grouped by day for a selected week
// Columns: A:Day, B:Job Date, C:Property, D:Unit#, E:Unit Type,
//   F:Painter, G:Status, H:Base Charge, I:Total Charge,
//   J:Repair Desc, K:Repair $, L:AddOn 1, M:AddOn 2, N:AddOn 3, O:Notes
// ============================================================

function refreshWeeklyView() {
  var ss = getFieldOpsSpreadsheet_();
  var jobs = ss.getSheetByName("Jobs");
  if (!jobs) {
    SpreadsheetApp.getUi().alert("Jobs tab not found.");
    return;
  }
  
  var wv = ss.getSheetByName("Weekly View");
  if (!wv) {
    wv = ss.insertSheet("Weekly View");
    var jobsIndex = jobs.getIndex();
    ss.setActiveSheet(wv);
    ss.moveActiveSheet(jobsIndex + 1);
    setupWeeklyViewHeaders_(wv);
  }
  
  var weekOf = wv.getRange("B1").getValue();
  if (!weekOf || !(weekOf instanceof Date)) {
    var today = new Date();
    var dow = today.getDay();
    var monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0,0,0,0);
    wv.getRange("B1").setValue(monday);
    weekOf = monday;
  }
  
  var weekStart = new Date(weekOf);
  weekStart.setHours(0,0,0,0);
  var weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23,59,59,999);
  
  // Read Jobs data: B through AI (includes col AI = QBO Invoice # at index 33)
  var jobsData = jobs.getRange("B2:AI500").getValues();
  
  var weekJobs = [];
  var dayOrder = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7};
  
  for (var r = 0; r < jobsData.length; r++) {
    var jobDate = jobsData[r][0]; // B
    if (!(jobDate instanceof Date)) continue;
    jobDate.setHours(12, 0, 0, 0);
    
    var jobDateOnly = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate());
    var weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    var weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
    if (jobDateOnly < weekStartOnly || jobDateOnly > weekEndOnly) continue;
    
    var property = jobsData[r][1];  // C
    if (property === "") continue;
    
    // Jobs column mapping (0-indexed from B):
    // 0=B(date), 1=C(property), 2=D(unit#), 3=E(unittype), 4=F(painter)
    // 5=G(totalcharge), 6=H(status), 7=I(basecharge), 8=J(basepayout)
    // 9=K(repairdesc), 10=L(repair$), 11=M(repairpay)
    // 12=N(addon1), 13=O(addon1$), 14=P(addon1pay)
    // 15=Q(addon2), 16=R(addon2$), 17=S(addon2pay)
    // 18=T(addon3), 19=U(addon3$), 20=V(addon3pay)
    // 21=W(ownermargin), 22=X(margin%), 23=Y(totalpayout)
    // 24=Z(?), 25=AA(notes)
    // 30=AF(day)
    
    var dayName = jobsData[r][31];  // AG
    
    weekJobs.push({
      day: dayName,
      daySort: dayOrder[dayName] || 99,
      date: jobDate,
      property: property,
      unitNum: jobsData[r][2],       // D
      unitType: jobsData[r][3],      // E
      painter: jobsData[r][4],       // F
      status: jobsData[r][6],        // H
      baseCharge: jobsData[r][7],    // I
      totalCharge: jobsData[r][5],   // G
      repairDesc: jobsData[r][9],    // K
      repairAmt: jobsData[r][10],    // L
      addon1:     jobsData[r][12],       // N
      addon2:     jobsData[r][15],       // Q
      addon3:     jobsData[r][18],       // T
      addon1$:    jobsData[r][13],       // O
      addon2$:    jobsData[r][16],       // R
      addon3$:    jobsData[r][19],       // U
      notes:         jobsData[r][26],                          // AB
      po:            String(jobsData[r][24] || '').trim(),    // Z  (PO#)
      ae:            String(jobsData[r][25] || '').trim(),    // AA (AE#)
      qboInvoiceNum: String(jobsData[r][33] || '').trim(),   // AI (QBO Invoice #)
    });
  }
  
  // Sort by day then property
  weekJobs.sort(function(a, b) {
    if (a.daySort !== b.daySort) return a.daySort - b.daySort;
    return a.property.localeCompare(b.property);
  });
  
  // Break apart ALL merges first (rows 2-500), then clear
  wv.getRange("A2:O500").breakApart();

  // Refresh headers (rows 1-3)
  setupWeeklyViewHeaders_(wv);

  // Clear data area (A:O = 15 columns)
  wv.getRange("A4:O500").clearContent();
  wv.getRange("A4:O500").clearFormat();
  
  if (weekJobs.length === 0) {
    wv.getRange("A4").setValue("No jobs found for this week.");
    return;
  }
  
  var writeRow = 4;
  var totalCols = 15;
  
  for (var j = 0; j < weekJobs.length; j++) {
    var job = weekJobs[j];

    // Data row: Day, Date, Property, Unit#, UnitType, Painter, Status, TotalCharge, QBONotes, BaseCharge, Repair$, AddOn1, AddOn2, AddOn3, QBOInvoice#
    wv.getRange(writeRow, 1, 1, totalCols).setValues([[
      job.day, job.date, job.property, job.unitNum, job.unitType,
      job.painter, job.status, job.totalCharge, buildQBONote_(job),
      job.baseCharge, job.repairAmt, job.addon1, job.addon2, job.addon3,
      job.qboInvoiceNum
    ]]);
    
    // Base formatting
    wv.getRange(writeRow, 1, 1, totalCols)
      .setFontFamily("Arial").setFontSize(10)
      .setVerticalAlignment("middle").setFontWeight("normal")
      .setBackground("#ffffff").setFontColor("#000000");
    
    // Alignment
    // Alignment
    wv.getRange(writeRow, 1).setHorizontalAlignment("center");  // Day
    wv.getRange(writeRow, 2).setHorizontalAlignment("center").setNumberFormat("M/d/yyyy"); // Date
    wv.getRange(writeRow, 4).setHorizontalAlignment("center");  // Unit#
    wv.getRange(writeRow, 5).setHorizontalAlignment("center");  // Unit Type
    wv.getRange(writeRow, 7).setHorizontalAlignment("center");  // Status
    
    // Currency
    wv.getRange(writeRow, 8).setNumberFormat("$#,##0.00").setHorizontalAlignment("right");   // Total Charge
    wv.getRange(writeRow, 9).setWrap(true);                                                   // QBO All Notes
    wv.getRange(writeRow, 10).setNumberFormat("$#,##0.00").setHorizontalAlignment("right");  // Base Charge
    wv.getRange(writeRow, 11).setNumberFormat("$#,##0.00").setHorizontalAlignment("right");  // Repair $
    wv.getRange(writeRow, 15).setHorizontalAlignment("center").setFontColor("#444444");       // QBO Invoice #

    // Status color coding
    var statusColors = {
      "Scheduled":   "#ead1dc",
      "In Progress": "#f9cb9c",
      "Complete":    "#b6d7a8",
      "Invoiced":    "#a4c2f4", // written by QBO push — blue
      "Invoice Sent":"#a4c2f4", // legacy label — same blue
      "Follow-Up":   "#d9d9d9"
    };
    if (statusColors[job.status]) {
      wv.getRange(writeRow, 7).setBackground(statusColors[job.status]);
    }
    
    writeRow++;
  }
  
  // Summary row
  writeRow++;
  wv.getRange(writeRow, 7).setValue("WEEK TOTAL:");
  wv.getRange(writeRow, 7).setFontWeight("bold").setFontFamily("Arial").setFontSize(10).setHorizontalAlignment("right");
  
  // Count jobs (subtract day header rows)
  var jobCount = weekJobs.length;
  var totalChargeSum = 0;
  var baseChargeSum = 0;
  for (var s = 0; s < weekJobs.length; s++) {
    if (typeof weekJobs[s].totalCharge === "number") totalChargeSum += weekJobs[s].totalCharge;
    if (typeof weekJobs[s].baseCharge === "number") baseChargeSum += weekJobs[s].baseCharge;
  }
  
 wv.getRange(writeRow, 8).setValue(totalChargeSum);
  wv.getRange(writeRow, 8).setNumberFormat("$#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  wv.getRange(writeRow, 10).setValue(baseChargeSum);
  wv.getRange(writeRow, 10).setNumberFormat("$#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  
  wv.getRange(writeRow + 1, 7).setValue("Job Count:");
  wv.getRange(writeRow + 1, 7).setFontWeight("bold").setFontFamily("Arial").setFontSize(10).setHorizontalAlignment("right");
  wv.getRange(writeRow + 1, 8).setValue(jobCount);
  wv.getRange(writeRow + 1, 8).setFontWeight("bold").setHorizontalAlignment("center").setNumberFormat("0");
  
  console.log("Weekly View refreshed: " + jobCount + " jobs.");
}


function setupWeeklyViewHeaders_(sheet) {
  // Week picker
  sheet.getRange("A1").setValue("Week Of (Monday):");
  sheet.getRange("A1").setFontWeight("bold").setFontFamily("Arial").setFontSize(11);
  
  var today = new Date();
  var dow = today.getDay();
  var monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0,0,0,0);
  var existingDate = sheet.getRange("B1").getValue();
  if (!existingDate || !(existingDate instanceof Date)) {
    sheet.getRange("B1").setValue(monday);
  }
  sheet.getRange("B1").setNumberFormat("M/d/yyyy").setFontWeight("bold").setFontFamily("Arial").setFontSize(12);
  sheet.getRange("B1").setBackground("#fff2cc").setBorder(true, true, true, true, false, false);
  
  sheet.getRange("C1").setFormula('="through "&TEXT(B1+6,"M/d/yyyy")');
  sheet.getRange("C1").setFontFamily("Arial").setFontSize(11);
  
  sheet.getRange("F1").setValue("Use \u{1F527} Field Ops Tools \u2192 Refresh Weekly View");
  sheet.getRange("F1").setFontFamily("Arial").setFontSize(9).setFontColor("#999999").setFontStyle("italic");
  
  // Instructions
  sheet.getRange("A2").setValue("1) Set week date above  2) Field Ops Tools \u2192 Refresh Weekly View");
  sheet.getRange("A2:O2").merge();
  sheet.getRange("A2").setFontFamily("Arial").setFontSize(9).setFontColor("#666666").setFontStyle("italic");
  
  // Column headers
  var headers = ["Day", "Job Date", "Property", "Unit#", "Unit Type", "Painter", "Status", "Total Charge", "QBO All Notes", "Base Charge", "Repair Charge", "AddOn 1", "AddOn 2", "AddOn 3", "Invoice #"];
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length)
    .setFontWeight("bold").setFontFamily("Arial").setFontSize(10)
    .setBackground("#4285f4").setFontColor("#ffffff").setHorizontalAlignment("center");
  
  // Column widths
  sheet.setColumnWidth(1, 85);   // Day
  sheet.setColumnWidth(2, 90);   // Job Date
  sheet.setColumnWidth(3, 180);  // Property
  sheet.setColumnWidth(4, 55);   // Unit#
  sheet.setColumnWidth(5, 80);   // Unit Type
  sheet.setColumnWidth(6, 80);   // Painter
  sheet.setColumnWidth(7, 90);   // Status
  sheet.setColumnWidth(8, 95);   // Total Charge
  sheet.setColumnWidth(9, 400);  // QBO All Notes
  sheet.setColumnWidth(10, 90);  // Base Charge
  sheet.setColumnWidth(11, 100);  // Repair Charge
  sheet.setColumnWidth(12, 80);  // AddOn 1
  sheet.setColumnWidth(13, 80);  // AddOn 2
  sheet.setColumnWidth(14, 80);   // AddOn 3
  sheet.setColumnWidth(15, 110);  // QBO Invoice #

  sheet.setFrozenRows(3);
  
  // Protect tab (read-only except B1 week picker)
  var protection = sheet.protect().setDescription("Weekly View - read only");
  protection.setUnprotectedRanges([sheet.getRange("B1")]);
  protection.setWarningOnly(true);
}


// ============================================================
// WEEK PICKER DROPDOWN (52 Mondays)
// Sets dropdown on BOTH Scheduler and Weekly View tabs
// ============================================================

function setupWeekPicker() {
  var ss = getFieldOpsSpreadsheet_();
  var lists = ss.getSheetByName("Lists");
  if (!lists) {
    SpreadsheetApp.getUi().alert("Lists tab not found.");
    return;
  }
  
  // Generate 52 Mondays (1 back, 50 forward)
  var today = new Date();
  var day = today.getDay(); // 0=Sun, 1=Mon...
  var diff = (day === 0) ? -6 : 1 - day; // days to get to this Monday
  var thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + diff);
  thisMonday.setHours(12, 0, 0, 0); // Anchor to noon to prevent timezone rollback
  
  var mondays = [];
  for (var i = -1; i <= 50; i++) {
    var d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() + (i * 7));
    d.setHours(12, 0, 0, 0); // Force noon on every date
    mondays.push([d]);
  }
  
  // Write to Lists column F
  lists.getRange("F1").setValue("WeekMondays");
  lists.getRange("F2:F53").setValues(mondays);
  lists.getRange("F2:F53").setNumberFormat("M/d/yyyy");
  
  // Set dropdown on Scheduler B1
  var qc = ss.getSheetByName("Scheduler");
  if (qc) {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(lists.getRange("F2:F53"), true)
      .setAllowInvalid(true)
      .build();
    qc.getRange("B1").setDataValidation(rule);
  }
  
  // Set dropdown on Weekly View B1
  var wv = ss.getSheetByName("Weekly View");
  if (wv) {
    var rule2 = SpreadsheetApp.newDataValidation()
      .requireValueInRange(lists.getRange("F2:F53"), true)
      .setAllowInvalid(true)
      .build();
    wv.getRange("B1").setDataValidation(rule2);
  }
  
  SpreadsheetApp.getUi().alert("✅ Week picker updated on Scheduler + Weekly View.");
}

// ============================================================
// SAFE DATA CLEAR
// ============================================================

function clearJobsData() {
  var ss = getFieldOpsSpreadsheet_();
  var jobs = ss.getSheetByName("Jobs");
  
  var inputCols = [2,3,4,5,6,8,11,12,13,14,15,17,18,20,21,27,30,31,35]; // 35=AI (QBO Invoice #)

  for (var i = 0; i < inputCols.length; i++) {
    jobs.getRange(2, inputCols[i], 499, 1).clearContent();
  }
  
  // Clear any leftover borders
     jobs.getRange("A2:AF500").setBorder(false, false, false, false, false, false);
  repairJobsFormulaColumns_(jobs);
  
  SpreadsheetApp.getUi().alert("\u2705 Job data cleared. Formulas intact.");
}

function repairJobsFormulaColumns() {
  var ss = getFieldOpsSpreadsheet_();
  var jobs = ss.getSheetByName("Jobs");
  if (!jobs) {
    SpreadsheetApp.getUi().alert("Jobs tab not found.");
    return;
  }

  repairJobsFormulaColumns_(jobs);
  SpreadsheetApp.getUi().alert("Jobs formula columns repaired.");
}

function repairJobsFormulaColumns_(jobs) {
  jobs.getRange("A3:A500").clearContent();
  jobs.getRange("A2").setFormula('=ARRAYFORMULA(IF(B2:B="","",B2:B-WEEKDAY(B2:B,3)))');
}

// ============================================================
// SAFE CLEAR SELECTED ROW ONLY
// ============================================================

function clearSelectedRow() {
  var ui = SpreadsheetApp.getUi();
  var activeSheet = SpreadsheetApp.getActiveSheet();
  
  // Must be on Jobs tab
  if (activeSheet.getName() !== "Jobs") {
    ui.alert("⛔ Please click on a row in the Jobs tab first.");
    return;
  }
  
  var row = SpreadsheetApp.getActiveRange().getRow();
  
  // Safety: never touch rows 1-2
  if (row <= 2) {
    ui.alert("⛔ Cannot clear row " + row + ". Rows 1-2 are protected (headers + formulas).");
    return;
  }
  
  // Confirm
  var property = activeSheet.getRange(row, 3).getValue();
  var unit = activeSheet.getRange(row, 4).getValue();
  var confirm = ui.alert("Delete row " + row + "?\n\n" + property + " — Unit " + unit, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  // Clear input columns only
  var inputCols = [2,3,4,5,6,8,11,12,13,14,15,17,18,20,21,27,30,31,35]; // 35=AI (QBO Invoice #)
  for (var i = 0; i < inputCols.length; i++) {
    activeSheet.getRange(row, inputCols[i]).clearContent();
  }
  
  ui.alert("✅ Row " + row + " cleared.");
}
//============================================================
// SET REPAIR SPLIT OVERRIDE
// (Run while clicked on a row in the Jobs tab)
// Default split is 50/50. Use this to override per row.
// AG column (col 33) stores the painter's % (e.g. 70 = painter gets 70%)
// PayoutSummary uses this; the M formula on sheet is separate (see TODO below)
//
// TODO: To make the M column (repairpay) formula also respect this override,
//       update the formula in cell M2 to:
//       =IF(L2="","",IF(AG2<>"",L2*(AG2/100),L2*0.5))
//       Then drag/extend it down to all rows.
// ============================================================
function setRepairSplitOverride() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  if (sheet.getName() !== "Jobs") {
    ui.alert("\u26D4 Please click on a row in the Jobs tab first.");
    return;
  }

  var row = ss.getActiveRange().getRow();
  if (row <= 2) {
    ui.alert("\u26D4 Cannot edit rows 1-2 (headers/formulas).");
    return;
  }

  var property = sheet.getRange(row, 3).getValue();
  var painter  = sheet.getRange(row, 6).getValue();
  var repairAmt = parseFloat(sheet.getRange(row, 12).getValue()) || 0;
  var current   = sheet.getRange(row, 33).getValue(); // AG

  if (repairAmt === 0) {
    ui.alert("\u26A0\uFE0F Row " + row + " has no Repair $ amount.\nSet the repair dollar amount first.");
    return;
  }

  var msg = "Row " + row + "  \u2014  " + (property || "(no property)") + " | " + (painter || "(no painter)") +
            "\nRepair Amount: $" + repairAmt.toFixed(2);
  if (current !== "" && current !== null) {
    msg += "\nCurrent split: Painter " + current + "% / Owner " + (100 - current) + "%";
  } else {
    msg += "\nCurrent split: Default 50/50";
  }
  msg += "\n\nEnter painter\u2019s repair split % (e.g., 50, 60, 70)\nLeave blank to reset to default 50/50:";

  var result = ui.prompt("Set Repair Split Override", msg, ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;

  var val = result.getResponseText().trim();

  if (val === "") {
    sheet.getRange(row, 33).clearContent();
    ui.alert("\u2705 Reset to default 50/50 split.\n\n" +
             "Painter payout from repair: $" + (repairAmt * 0.5).toFixed(2) +
             "\nOwner cut from repair: $" + (repairAmt * 0.5).toFixed(2));
  } else {
    var pct = parseFloat(val);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      ui.alert("\u26D4 Invalid. Enter a number from 0\u2013100.");
      return;
    }
    sheet.getRange(row, 33).setValue(pct);
    ui.alert(
      "\u2705 Repair split saved!\n\n" +
      "Painter gets " + pct + "%  \u2192  $" + (repairAmt * pct / 100).toFixed(2) +
      "\nOwner gets " + (100 - pct) + "%  \u2192  $" + (repairAmt * (100 - pct) / 100).toFixed(2)
    );
  }
}

// ============================================================
//  REPAIR PAYOUT AUTO-FILL — onEdit Trigger
//
//  WHAT THIS DOES:
//  When Owner enters or changes a value in col L (Repair $) on the
//  Jobs tab, this automatically writes the 50% payout amount into
//  col M (Repair Pay) as a plain number — NOT a formula.
//
//  Owner can then type directly over col M with any dollar amount
//  he wants. His number stays permanently until he clears the row.
//
//  SETUP INSTRUCTIONS:
//  ─────────────────────────────────────────────────────────────
//  STEP 1 — Remove the formula from col M:
//    1. Open the Jobs tab
//    2. Click cell M2
//    3. Select M2:M500
//    4. Press Delete to clear all formulas
//    5. Leave the cells empty — the trigger will fill them on edit
//
//  STEP 2 — Remove col AH (Repair Split % override):
//    The AH column is no longer needed. You can leave it as-is
//    (it just won't do anything) or clear M2:M500 and AH2:AH500
//    together. Do NOT delete the column — just clear the values.
//
//  STEP 3 — Add this onEdit function to FieldOpsController.gs:
//    IMPORTANT: Google Sheets can only have ONE onEdit function
//    per script file. If you already have an onEdit() in the
//    script, merge this logic into it rather than adding a
//    second function with the same name.
//
//  STEP 4 — No trigger setup needed:
//    onEdit() is a simple trigger — it fires automatically on
//    any edit. No setup in the Triggers menu required.
//
//  STEP 5 — Update clearSelectedRow() and clearJobsData():
//    Col M (column 13) should remain in the input columns list
//    so it gets cleared when Owner clears a job row. It already
//    is — no change needed.
//    Col AH (column 34) can be removed from the input columns
//    list in both clear functions since it's no longer used.
//
//  ─────────────────────────────────────────────────────────────
//  BEHAVIOR SUMMARY:
//
//    L edited → M is empty or has old auto-value → write L*0.5
//    L cleared → M is cleared too
//    M edited directly by Owner → nothing happens (trigger only
//      watches col L, never col M)
//    L edited → M already has Owner's manual value → still
//      overwrites with new 50% calc (because L changed, the
//      repair amount changed, so payout should recalc)
//
//  NOTE ON THAT LAST POINT:
//    If Owner changes a repair amount after already overriding
//    the payout, col M will reset to 50% of the new amount.
//    He'll need to type his override again. This is intentional
//    and expected — a new repair $ means a new starting point.
// ============================================================


function onEdit(e) {
  // Only care about edits on the Jobs tab
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Jobs') return;

  const editedCol = e.range.getColumn();
  const editedRow = e.range.getRow();

  if (editedRow < 2 || editedRow > 500) return;

  // ── Col K (11) — Repair Desc: auto-resize row to fit wrapped text ──────
  if (editedCol === 11) {
    const val = e.range.getValue();
    if (val === '' || val === null || val === undefined) {
      sheet.setRowHeight(editedRow, 21); // reset to standard height when cleared
    } else {
      sheet.autoResizeRows(editedRow, 1);  // expand to fit content
    }
    return;
  }

  // ── Col L (12) — Repair $: auto-fill 50% payout to col M ───────────────
  if (editedCol !== 12) return;

  const repairAmount = e.range.getValue();
  const payoutCell   = sheet.getRange(editedRow, 13); // col M = column 13

  // If L was cleared, clear M too
  if (repairAmount === '' || repairAmount === null || repairAmount === undefined) {
    payoutCell.setValue('');
    return;
  }

  // If L has a valid number, write 50% to M as a plain value
  const amount = parseFloat(repairAmount);
  if (!isNaN(amount) && amount > 0) {
    payoutCell.setValue(Math.round(amount * 0.5 * 100) / 100); // rounded to cents
  }
}

// ============================================================
// autoResizeJobRows()
// Menu item — resizes all Jobs tab rows (2–500) to fit the
// content of col K (Repair Desc). Rows with no repair desc
// are reset to the standard height (21px).
// Run once to fix existing rows; onEdit handles future edits.
// ============================================================
function autoResizeJobRows() {
  var ss   = getFieldOpsSpreadsheet_();
  var jobs = ss.getSheetByName('Jobs');
  var data = jobs.getRange('K2:K500').getValues(); // col K = Repair Desc

  for (var i = 0; i < data.length; i++) {
    var rowNum = i + 2; // K2 = row 2
    if (data[i][0] !== '' && data[i][0] !== null) {
      jobs.autoResizeRows(rowNum, 1);
    } else {
      jobs.setRowHeight(rowNum, 21);
    }
  }

  try {
    SpreadsheetApp.getUi().alert('✅ Row heights updated for all ' + data.length + ' job rows.');
  } catch (uiErr) {
    console.log('autoResizeJobRows complete');
  }
}


// ============================================================
//  ALSO UPDATE: clearSelectedRow() and clearJobsData()
//
//  Remove column 34 (AH) from the inputCols array in both
//  functions, since the Repair Split % column is no longer used.
//
//  Current inputCols likely includes 33 or 34 for AH/AG.
//  Find this array in your existing code and remove that entry.
//
//  Example — change this:
//    const inputCols = [2,3,4,5,6,8,11,12,13,14,15,17,18,20,21,27,30,31];
//  To this:
//    const inputCols = [2,3,4,5,6,8,11,12,13,14,15,17,18,20,21,27,30,31];
//
//  Col M (13) stays in the list — it gets cleared by the safe
//  clear functions, which is correct behavior.
// ============================================================


// ============================================================
// REFRESH PAYOUT SUMMARY
// Builds the PayoutSummary tab:
//   - Grouped by week (most recent first)
//   - Per painter: job count, repair count, painter pay, Owner cut, total
//   - Week subtotals
//   - Handles repair-only jobs (no unit type required)
//   - Respects AG column repair split overrides
// ============================================================
function refreshPayoutSummary() {
  return refreshPayoutSummary_({ showUi: true, activateSheet: true });
}

function refreshPayoutSummaryFromAppSheet() {
  return refreshPayoutSummary_({ showUi: false, activateSheet: false });
}

const PAYOUT_SUMMARY_TRIGGER_HANDLER = 'refreshPayoutSummaryOnCompleteTrigger';
const PAYOUT_COMPLETE_SIGNATURE_PROP = 'PAYOUT_COMPLETE_SIGNATURE';

function setupPayoutSummaryAutomation() {
  const ss = getFieldOpsSpreadsheet_();
  PropertiesService.getScriptProperties().setProperty('FIELD_OPS_SPREADSHEET_ID', ss.getId());
  removePayoutSummaryAutomation_();

  ScriptApp.newTrigger(PAYOUT_SUMMARY_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(1)
    .create();

  const signature = getCompletedJobsSignature_(ss);
  PropertiesService.getScriptProperties().setProperty(PAYOUT_COMPLETE_SIGNATURE_PROP, signature);

  return finishPayoutSummary_(
    'Payout Summary automation is on.\n\n' +
    'The script will check completed jobs about every minute and refresh PayoutSummary when the completed-job data changes.',
    true
  );
}

function removePayoutSummaryAutomation() {
  const removed = removePayoutSummaryAutomation_();
  return finishPayoutSummary_(
    removed
      ? 'Payout Summary automation was removed.'
      : 'No Payout Summary automation trigger was found.',
    true
  );
}

function removePayoutSummaryAutomation_() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = false;
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === PAYOUT_SUMMARY_TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
      removed = true;
    }
  }
  return removed;
}

function refreshPayoutSummaryOnCompleteTrigger() {
  const ss = getFieldOpsSpreadsheet_();
  const props = PropertiesService.getScriptProperties();
  const currentSignature = getCompletedJobsSignature_(ss);
  const previousSignature = props.getProperty(PAYOUT_COMPLETE_SIGNATURE_PROP) || '';

  if (currentSignature === previousSignature) {
    console.log('Payout Summary refresh skipped: completed jobs did not change.');
    return 'No completed-job changes detected.';
  }

  props.setProperty(PAYOUT_COMPLETE_SIGNATURE_PROP, currentSignature);
  return refreshPayoutSummary_({ showUi: false, activateSheet: false, spreadsheet: ss });
}

function refreshPayoutSummary_(options) {
  options = options || {};
  var showUi = options.showUi !== false;
  var activateSheet = options.activateSheet === true;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return finishPayoutSummary_("Payout Summary refresh skipped: another refresh is already running.", showUi);
  }

  try {
  var ss = options.spreadsheet || getFieldOpsSpreadsheet_();
  var jobs = ss.getSheetByName("Jobs");
  if (!jobs) {
    return finishPayoutSummary_("Jobs tab not found.", showUi);
  }

  // Get or create tab
  var ps = ss.getSheetByName("PayoutSummary");
  if (!ps) {
    ps = ss.insertSheet("PayoutSummary");
    // Move to a sensible position
    ss.setActiveSheet(ps);
    ss.moveActiveSheet(ss.getNumSheets());
  }

  var lastRow = jobs.getLastRow();
  if (lastRow < 3) {
    return finishPayoutSummary_("No job data found.", showUi);
  }

  // Read columns B (col 2) through AG (col 33) = 32 columns, rows 3+
  var numRows = lastRow - 2;
  var rawData = jobs.getRange(3, 2, numRows, 32).getValues();

  // Column index reference (0-based offset from column B):
  // 0=B(date), 1=C(property), 2=D(unit#), 3=E(unittype), 4=F(painter)
  // 5=G(totalcharge), 6=H(status), 7=I(basecharge), 8=J(basepayout)
  // 9=K(repairdesc), 10=L(repair$), 11=M(repairpay_formula)
  // 13=O(addon1$), 14=P(addon1pay), 16=R(addon2$), 17=S(addon2pay)
  // 19=U(addon3$), 20=V(addon3pay)
  // 31=AG(repairsplit override)  <-- NEW

  var weekMap   = {};   // weekKey -> true
  var weekOrder = [];
  var entryMap  = {};   // "weekKey|painter" -> aggregate object

  for (var r = 0; r < rawData.length; r++) {
    var row     = rawData[r];
    var jobDate = row[0];  // B
    var painter = row[4];  // F
    var status  = normalizePayoutStatus_(row[6]);  // H

    if (!(jobDate instanceof Date) || isNaN(jobDate.getTime())) continue;
    if (!painter || painter === "") continue;
    if (!isPayoutEligibleStatus_(status)) continue;

    // Normalize date to noon to avoid timezone drift
    jobDate = new Date(jobDate);
    jobDate.setHours(12, 0, 0, 0);

    // Derive Monday of this week
    var dow = jobDate.getDay();
    var weekStart = new Date(jobDate);
    weekStart.setDate(jobDate.getDate() - (dow === 0 ? 6 : dow - 1));
    weekStart.setHours(0, 0, 0, 0);
    var weekKey = Utilities.formatDate(weekStart, Session.getScriptTimeZone(), "yyyy-MM-dd");

    // === CALCULATE PAINTER PAY (handles repair-only and split overrides) ===
    var baseCharge   = parseFloat(row[7])  || 0;  // I
    var basePayout   = parseFloat(row[8])  || 0;  // J
    var repairDollar = parseFloat(row[10]) || 0;  // L
    var addon1dollar = parseFloat(row[13]) || 0;  // O
    var addon1pay    = parseFloat(row[14]) || 0;  // P
    var addon2dollar = parseFloat(row[16]) || 0;  // R
    var addon2pay    = parseFloat(row[17]) || 0;  // S
    var addon3dollar = parseFloat(row[19]) || 0;  // U
    var addon3pay    = parseFloat(row[20]) || 0;  // V

    // Repair split: use AG override if present, else default 50%
    var splitOverride = row[31]; // AG
    var painterRepairPct = (splitOverride !== "" && splitOverride !== null && !isNaN(parseFloat(splitOverride)))
      ? parseFloat(splitOverride) / 100
      : 0.5;
    var repairPay = repairDollar * painterRepairPct;

    // Total painter pay for this job
    var painterJobPay = basePayout + repairPay + addon1pay + addon2pay + addon3pay;

    // Total charge for this job (handles repair-only: baseCharge=0 is fine)
    var totalCharge = baseCharge + repairDollar + addon1dollar + addon2dollar + addon3dollar;

    // Owner cut for this job
    var ownerJobCut = totalCharge - painterJobPay;

    // === AGGREGATE ===
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = true;
      weekOrder.push(weekKey);
    }

    var mapKey = weekKey + "|" + painter;
    if (!entryMap[mapKey]) {
      entryMap[mapKey] = {
        weekKey:      weekKey,
        painter:      painter,
        painterPay:   0,
        ownerCut:     0,
        jobCount:     0,
        repairCount:  0
      };
    }
    entryMap[mapKey].painterPay  += painterJobPay;
    entryMap[mapKey].ownerCut    += ownerJobCut;
    entryMap[mapKey].jobCount++;
    if (repairDollar > 0) entryMap[mapKey].repairCount++;
  }

  // Sort weeks: most recent first
  weekOrder.sort().reverse();

  // ============================================================
  // BUILD OUTPUT
  // ============================================================
  ps.clearContents();
  ps.clearFormats();

  // Header row
  var headers = [
    "Week Of", "Painter", "Jobs", "w/ Repair",
    "Painter Pay", "Owner Cut", "Week Total"
  ];
  var numCols = headers.length;
  ps.getRange(1, 1, 1, numCols).setValues([headers]);
  ps.getRange(1, 1, 1, numCols)
    .setFontWeight("bold")
    .setBackground("#1a73e8")
    .setFontColor("#ffffff")
    .setFontFamily("Arial")
    .setFontSize(11)
    .setHorizontalAlignment("center");

  var writeRow = 2;

  for (var w = 0; w < weekOrder.length; w++) {
    var wk     = weekOrder[w];
    var wkDate = new Date(wk + "T12:00:00");
    var wkLabel = Utilities.formatDate(wkDate, Session.getScriptTimeZone(), "M/d/yyyy");

    // Gather painters for this week, sorted alphabetically
    var weekEntries = [];
    for (var key in entryMap) {
      if (entryMap[key].weekKey === wk) weekEntries.push(entryMap[key]);
    }
    weekEntries.sort(function(a, b) { return a.painter.localeCompare(b.painter); });

    var weekTotalPainter = 0;
    var weekTotalOwner   = 0;
    var weekTotalJobs    = 0;

    for (var p = 0; p < weekEntries.length; p++) {
      var e = weekEntries[p];
      var pPay  = Math.round(e.painterPay * 100) / 100;
      var nCut  = Math.round(e.ownerCut   * 100) / 100;
      var total = Math.round((pPay + nCut)  * 100) / 100;

      ps.getRange(writeRow, 1, 1, numCols).setValues([[
        wkLabel, e.painter, e.jobCount, e.repairCount, pPay, nCut, total
      ]]);

      // Alternating row color
      var rowBg = (p % 2 === 0) ? "#f8f9fa" : "#ffffff";
      ps.getRange(writeRow, 1, 1, numCols)
        .setBackground(rowBg)
        .setFontFamily("Arial")
        .setFontSize(10);

      weekTotalPainter += pPay;
      weekTotalOwner   += nCut;
      weekTotalJobs    += e.jobCount;
      writeRow++;
    }

    // Week subtotal row
    var wkPay   = Math.round(weekTotalPainter * 100) / 100;
    var wkOwner = Math.round(weekTotalOwner   * 100) / 100;
    var wkTotal = Math.round((wkPay + wkOwner) * 100) / 100;

    ps.getRange(writeRow, 1, 1, numCols).setValues([[
      "WEEK TOTAL — " + wkLabel, "", weekTotalJobs, "", wkPay, wkOwner, wkTotal
    ]]);
    ps.getRange(writeRow, 1, 1, numCols)
      .setFontWeight("bold")
      .setBackground("#fff2cc")
      .setFontFamily("Arial")
      .setFontSize(10)
      .setBorder(true, true, true, true, false, false);
    writeRow++;

    // Spacer row between weeks
    writeRow++;
  }

  // Format currency columns (E, F, G = cols 5, 6, 7)
  if (writeRow > 2) {
    ps.getRange(2, 5, writeRow - 2, 3).setNumberFormat("$#,##0.00");
  }

  // Column widths
  ps.setColumnWidth(1, 110);  // Week Of
  ps.setColumnWidth(2, 130);  // Painter
  ps.setColumnWidth(3, 50);   // Jobs
  ps.setColumnWidth(4, 70);   // w/ Repair
  ps.setColumnWidth(5, 105);  // Painter Pay
  ps.setColumnWidth(6, 105);  // Owner Cut
  ps.setColumnWidth(7, 105);  // Week Total

  // Freeze header
  ps.setFrozenRows(1);

  if (activateSheet) {
    ss.setActiveSheet(ps);
  }

  var entryCount = Object.keys(entryMap).length;
  var message = "\u2705 Payout Summary updated.\n\n" +
    "Weeks: " + weekOrder.length + "\n" +
    "Painter rows: " + entryCount;
  return finishPayoutSummary_(message, showUi);
  } finally {
    lock.releaseLock();
  }
}

function getFieldOpsSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  var spreadsheetId = PropertiesService.getScriptProperties().getProperty("FIELD_OPS_SPREADSHEET_ID");
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  throw new Error("No active spreadsheet found. Set script property FIELD_OPS_SPREADSHEET_ID for standalone execution.");
}

function getCompletedJobsSignature_(ss) {
  const jobs = ss.getSheetByName('Jobs');
  if (!jobs) return '';

  const lastRow = jobs.getLastRow();
  if (lastRow < 3) return '';

  const numRows = lastRow - 2;
  const values = jobs.getRange(3, 2, numRows, Math.min(34, jobs.getLastColumn() - 1)).getDisplayValues();
  const completedRows = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const status = normalizePayoutStatus_(row[6]);
    if (isPayoutEligibleStatus_(status)) {
      completedRows.push((i + 3) + '|' + row.join('|'));
    }
  }

  return completedRows.join('\n');
}

function normalizePayoutStatus_(value) {
  return String(value || '').trim().toLowerCase();
}

function isPayoutEligibleStatus_(status) {
  return status === 'complete' || status === 'invoiced';
}

function finishPayoutSummary_(message, showUi) {
  if (showUi) {
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (err) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
  return message;
}
// ============================================================
// repeatLastProperty()
//
// Field Ops Tools menu item: finds the last non-blank Property
// in Jobs col C and copies it into the next empty row below.
// Also moves the active cell to that row for easy continued entry.
// ============================================================
function repeatLastProperty() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const jobs  = ss.getSheetByName('Jobs');
  const ui    = SpreadsheetApp.getUi();
  if (!jobs) { ui.alert('Jobs tab not found.'); return; }

  const startRow = 2;
  const lastRow  = jobs.getLastRow();
  if (lastRow < startRow) { ui.alert('No job data found.'); return; }

  // Read cols B (date), C (property), F (painter)
  const bVals = jobs.getRange(startRow, 2, lastRow - startRow + 1, 1).getValues();
  const cVals = jobs.getRange(startRow, 3, lastRow - startRow + 1, 1).getValues();
  const fVals = jobs.getRange(startRow, 6, lastRow - startRow + 1, 1).getValues();

  // Scan bottom-up for last non-blank Property (col C)
  let lastIdx = -1;
  for (let i = cVals.length - 1; i >= 0; i--) {
    if (String(cVals[i][0]).trim()) { lastIdx = i; break; }
  }
  if (lastIdx === -1) { ui.alert('No properties found in column C.'); return; }

  const lastProp    = cVals[lastIdx][0];
  const lastDate    = bVals[lastIdx][0];
  const lastPainter = fVals[lastIdx][0];
  const targetRow   = startRow + lastIdx + 1;

  if (String(jobs.getRange(targetRow, 3).getValue()).trim()) {
    ui.alert('Row ' + targetRow + ' already has a property.');
    return;
  }

  // Fill B (Job Date), C (Property), F (Painter)
  if (lastDate)    jobs.getRange(targetRow, 2).setValue(lastDate);
  if (lastProp)    jobs.getRange(targetRow, 3).setValue(lastProp);
  if (lastPainter) jobs.getRange(targetRow, 6).setValue(lastPainter);

  // Park cursor on Unit# (col D) for continued entry
  jobs.setActiveCell(jobs.getRange(targetRow, 4));
  SpreadsheetApp.getActive().toast(
    lastProp + ' + date + painter filled in row ' + targetRow,
    'Repeat Last Property', 3);
}

