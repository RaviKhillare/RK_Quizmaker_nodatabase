/**
 * ============================================================================
 * BLOGGER SUITE PRO - GOOGLE SHEETS CLOUD DATABASE BACKEND (Code.gs)
 * ============================================================================
 * 
 * This Google Apps Script acts as a lightweight serverless REST API that turns
 * any Google Spreadsheet into a permanent cloud database for Blogger Suite Pro.
 * 
 * Features:
 *  - Auto-creates and formats 3 Sheets: "Quizzes", "Widgets", "Settings"
 *  - Full CRUD operations for Quizzes and Custom Button Groups
 *  - Persistent storage for Social Profiles & Application Settings
 *  - Fast batch synchronization (Push / Pull)
 *  - Zero-CORS preflight issues (accepts both GET and text/plain POST)
 * 
 * DEPLOYMENT INSTRUCTIONS (2 Minutes):
 *  1. Open or create a Google Spreadsheet at https://sheets.new
 *  2. Go to: Extensions > Apps Script
 *  3. Delete any default code in "Code.gs" and paste this entire file
 *  4. Click "Save" (Floppy icon or Ctrl+S)
 *  5. Click "Deploy" > "New deployment"
 *  6. Select type: "Web app" (Click gear icon next to "Select type" if needed)
 *  7. Set Description: "Blogger Suite Pro Cloud Database"
 *  8. Set "Execute as": "Me"
 *  9. Set "Who has access": "Anyone"  <-- CRITICAL!
 * 10. Click "Deploy", Authorize access if prompted, and copy the Web App URL (ends in /exec)
 * 11. Paste that Web App URL into Blogger Suite Pro Dashboard ("Sheets Cloud" button)
 * ============================================================================
 */

// Global Sheet Names
var SHEET_QUIZZES = "Quizzes";
var SHEET_WIDGETS = "Widgets";
var SHEET_SETTINGS = "Settings";

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "fetchAll";

    initSheetsIfMissing();

    if (action === "ping" || action === "test") {
      return jsonResponse({
        status: "success",
        message: "Google Sheets Cloud Database is connected and active!",
        sheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "fetchAll") {
      return jsonResponse({
        status: "success",
        quizzes: readAllQuizzes(),
        widgets: readAllWidgets(),
        settings: readAllSettings(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "getQuizzes") {
      return jsonResponse({
        status: "success",
        quizzes: readAllQuizzes()
      });
    }

    if (action === "getWidgets") {
      return jsonResponse({
        status: "success",
        widgets: readAllWidgets()
      });
    }

    if (action === "getSettings") {
      return jsonResponse({
        status: "success",
        settings: readAllSettings()
      });
    }

    return jsonResponse({
      status: "error",
      message: "Unknown GET action: " + action
    });

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString(),
      stack: err.stack
    });
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    initSheetsIfMissing();

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Empty POST body received" });
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ status: "error", message: "Malformed JSON payload: " + parseErr.message });
    }

    var action = payload.action;

    // 1. Save Quiz
    if (action === "saveQuiz") {
      var quiz = payload.payload || payload.quiz;
      if (!quiz) return jsonResponse({ status: "error", message: "Missing quiz payload" });
      var savedQuiz = upsertQuiz(quiz);
      return jsonResponse({ status: "success", message: "Quiz saved to Google Sheet", quiz: savedQuiz });
    }

    // 2. Delete Quiz
    if (action === "deleteQuiz") {
      var quizId = (payload.payload && payload.payload.id) || payload.id;
      if (!quizId) return jsonResponse({ status: "error", message: "Missing quiz id to delete" });
      var deleted = removeQuizById(quizId);
      return jsonResponse({ status: "success", message: "Quiz deleted from Google Sheet", deleted: deleted });
    }

    // 3. Save Widget Group
    if (action === "saveWidgetGroup") {
      var widget = payload.payload || payload.widget;
      if (!widget) return jsonResponse({ status: "error", message: "Missing widget payload" });
      var savedWidget = upsertWidget(widget);
      return jsonResponse({ status: "success", message: "Widget group saved to Google Sheet", widget: savedWidget });
    }

    // 4. Delete Widget Group
    if (action === "deleteWidgetGroup") {
      var widgetId = (payload.payload && payload.payload.id) || payload.id;
      if (!widgetId) return jsonResponse({ status: "error", message: "Missing widget id to delete" });
      var deletedWidget = removeWidgetById(widgetId);
      return jsonResponse({ status: "success", message: "Widget group deleted from Google Sheet", deleted: deletedWidget });
    }

    // 5. Save Settings
    if (action === "saveSettings") {
      var settingsObj = payload.payload || payload.settings || {};
      upsertSettings(settingsObj);
      return jsonResponse({ status: "success", message: "Settings saved to Google Sheet", settings: readAllSettings() });
    }

    // 6. Bulk Sync All (Quizzes, Widgets, Settings)
    if (action === "syncAll") {
      var data = payload.payload || payload;
      if (Array.isArray(data.quizzes)) {
        data.quizzes.forEach(function (q) { upsertQuiz(q); });
      }
      if (Array.isArray(data.widgets)) {
        data.widgets.forEach(function (w) { upsertWidget(w); });
      }
      if (data.settings && typeof data.settings === "object") {
        upsertSettings(data.settings);
      }
      return jsonResponse({
        status: "success",
        message: "Complete database synchronized successfully",
        quizzes: readAllQuizzes(),
        widgets: readAllWidgets(),
        settings: readAllSettings()
      });
    }

    return jsonResponse({ status: "error", message: "Unsupported POST action: " + action });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString(), stack: err.stack });
  }
}

// ============================================================================
// DATABASE OPERATIONS (QUIZZES)
// ============================================================================

function readAllQuizzes() {
  var sheet = getSheet(SHEET_QUIZZES);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var quizzes = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = String(row[0] || "");
    if (!id) continue;

    var title = String(row[1] || "Untitled Quiz");
    var category = String(row[2] || "General");
    var slug = String(row[3] || "");
    var questionCount = Number(row[4] || 0);
    var updatedAt = String(row[5] || "");
    var rawJson = String(row[6] || "");

    var quizData = null;
    if (rawJson) {
      try {
        quizData = JSON.parse(rawJson);
      } catch (e) {
        quizData = null;
      }
    }

    quizzes.push({
      id: id,
      title: title,
      category: category,
      slug: slug,
      questionCount: questionCount,
      updatedAt: updatedAt,
      data: quizData || {
        title: title,
        category: category,
        slug: slug,
        questions: []
      }
    });
  }

  return quizzes;
}

function upsertQuiz(quiz) {
  var sheet = getSheet(SHEET_QUIZZES);
  var id = quiz.id || ("quiz_" + new Date().getTime());
  var title = (quiz.title || (quiz.data && quiz.data.title) || "Untitled Quiz").toString().trim();
  var category = (quiz.category || (quiz.data && quiz.data.category) || "General").toString().trim();
  var slug = (quiz.slug || (quiz.data && quiz.data.slug) || "").toString().trim();
  var qCount = (quiz.questionCount || (quiz.data && quiz.data.questions && quiz.data.questions.length) || 0);
  var updatedAt = new Date().toISOString();
  var fullJson = JSON.stringify(quiz.data || quiz);

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(id).trim()) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 7).setValues([[id, title, category, slug, qCount, updatedAt, fullJson]]);
  } else {
    sheet.appendRow([id, title, category, slug, qCount, updatedAt, fullJson]);
  }

  return { id: id, title: title, category: category, slug: slug, questionCount: qCount, updatedAt: updatedAt };
}

function removeQuizById(id) {
  var sheet = getSheet(SHEET_QUIZZES);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

// ============================================================================
// DATABASE OPERATIONS (WIDGETS)
// ============================================================================

function readAllWidgets() {
  var sheet = getSheet(SHEET_WIDGETS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var widgets = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = String(row[0] || "");
    if (!id) continue;

    var name = String(row[1] || "Untitled Group");
    var layout = String(row[2] || "horizontal");
    var style = String(row[3] || "pill_glow");
    var format = String(row[4] || "both");
    var buttonCount = Number(row[5] || 0);
    var updatedAt = String(row[6] || "");
    var rawJson = String(row[7] || "");

    var widgetData = null;
    if (rawJson) {
      try {
        widgetData = JSON.parse(rawJson);
      } catch (e) {
        widgetData = null;
      }
    }

    if (widgetData) {
      widgets.push(widgetData);
    } else {
      widgets.push({
        id: id,
        name: name,
        layout: layout,
        style: style,
        format: format,
        updatedAt: updatedAt,
        buttons: []
      });
    }
  }

  return widgets;
}

function upsertWidget(widget) {
  var sheet = getSheet(SHEET_WIDGETS);
  var id = widget.id || ("grp_" + new Date().getTime());
  var name = (widget.name || "Untitled Group").toString().trim();
  var layout = (widget.layout || "horizontal").toString().trim();
  var style = (widget.style || "pill_glow").toString().trim();
  var format = (widget.format || "both").toString().trim();
  var btnCount = (widget.buttons && Array.isArray(widget.buttons)) ? widget.buttons.length : 0;
  var updatedAt = new Date().toISOString();
  var fullJson = JSON.stringify(widget);

  var lastRow = sheet.getLastRow();
  var foundRow = -1;

  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(id).trim()) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 8).setValues([[id, name, layout, style, format, btnCount, updatedAt, fullJson]]);
  } else {
    sheet.appendRow([id, name, layout, style, format, btnCount, updatedAt, fullJson]);
  }

  return { id: id, name: name, layout: layout, style: style, format: format, updatedAt: updatedAt };
}

function removeWidgetById(id) {
  var sheet = getSheet(SHEET_WIDGETS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

// ============================================================================
// DATABASE OPERATIONS (SETTINGS)
// ============================================================================

function readAllSettings() {
  var sheet = getSheet(SHEET_SETTINGS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var settings = {};

  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0] || "").trim();
    var valRaw = String(data[i][1] || "");
    if (!key) continue;

    try {
      settings[key] = JSON.parse(valRaw);
    } catch (e) {
      settings[key] = valRaw;
    }
  }

  return settings;
}

function upsertSettings(settingsObj) {
  var sheet = getSheet(SHEET_SETTINGS);
  var updatedAt = new Date().toISOString();

  for (var key in settingsObj) {
    if (!settingsObj.hasOwnProperty(key)) continue;
    var val = settingsObj[key];
    var valStr = (typeof val === "object") ? JSON.stringify(val) : String(val);

    var lastRow = sheet.getLastRow();
    var foundRow = -1;

    if (lastRow > 1) {
      var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]).trim() === String(key).trim()) {
          foundRow = i + 2;
          break;
        }
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, 3).setValues([[key, valStr, updatedAt]]);
    } else {
      sheet.appendRow([key, valStr, updatedAt]);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS & SHEET INITIALIZER
// ============================================================================

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    setupHeaders(sheet, name);
  }
  return sheet;
}

function initSheetsIfMissing() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [SHEET_QUIZZES, SHEET_WIDGETS, SHEET_SETTINGS].forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      setupHeaders(sheet, name);
    }
  });

  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

function setupHeaders(sheet, name) {
  sheet.clear();
  var headers = [];
  if (name === SHEET_QUIZZES) {
    headers = ["ID", "Title", "Category", "Slug", "Question_Count", "Updated_At", "Full_Data_JSON"];
  } else if (name === SHEET_WIDGETS) {
    headers = ["ID", "Name", "Layout", "Style", "Format", "Button_Count", "Updated_At", "Widget_Data_JSON"];
  } else if (name === SHEET_SETTINGS) {
    headers = ["Key", "Value", "Updated_At"];
  }

  if (headers.length > 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4f46e5");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch (e) {}
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
