/**
 * 平板借還系統 Google Apps Script 後端
 * 用於處理表單提交並記錄到Google Sheets
 */

// 設置您的Google Sheets試算表ID
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// 處理GET請求（用於測試）
function doGet() {
  // 初始化試算表（如果需要）
  initializeSheetHeaders();
  return ContentService.createTextOutput("OK");
}

// 處理POST請求（表單提交）
function doPost(e) {
  try {
    // 獲取表單數據
    const params = e.parameter;
    
    // 處理表單數據
    const result = processFormData(params);
    
    // 返回結果
    return ContentService.createTextOutput(result);
  } catch (error) {
    // 記錄錯誤
    Logger.log("錯誤: " + error.message);
    return ContentService.createTextOutput("ERROR: " + error.message);
  }
}

/**
 * 處理表單數據
 * @param {Object} params - 表單參數
 * @returns {string} - 處理結果
 */
function processFormData(params) {
  // 驗證必要參數
  if (!params.operation || !params.studentName || !params.studentId) {
    throw new Error("缺少必要參數");
  }
  
  // 獲取當前日期和時間
  const now = new Date();
  const date = Utilities.formatDate(now, "Asia/Hong_Kong", "yyyy/MM/dd");
  const time = Utilities.formatDate(now, "Asia/Hong_Kong", "HH:mm:ss");
  
  // 獲取操作類型
  const operation = params.operation === "borrow" ? "借出" : "歸還";
  
  // 獲取學生資訊
  const studentName = params.studentName;
  const studentId = params.studentId;
  
  // 獲取問題和備註
  const issues = params.issues || "";
  const remarks = params.remarks || "";
  
  // 檢查操作有效性
  if (operation === "借出") {
    // 檢查是否已經借出未歸還
    if (hasUnreturnedDevice(studentId)) {
      throw new Error("該學生已有借出未歸還的平板");
    }
  } else if (operation === "歸還") {
    // 檢查是否有對應的借出記錄
    if (!hasBorrowRecord(studentId)) {
      throw new Error("找不到該學生的借出記錄");
    }
  }
  
  // 寫入數據到試算表
  writeToSheet(date, time, studentName, studentId, operation, issues, remarks);
  
  return "OK";
}

/**
 * 寫入數據到試算表
 */
function writeToSheet(date, time, studentName, studentId, operation, issues, remarks) {
  // 獲取試算表
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("借還記錄") || spreadsheet.getSheets()[0];
  
  // 初始化表頭（如果需要）
  if (sheet.getLastRow() === 0) {
    initializeSheetHeaders();
  }
  
  // 準備行數據
  const row = [
    date,
    time,
    studentName,
    studentId,
    operation,
    issues,
    remarks,
    "正常"  // 狀態
  ];
  
  // 添加到試算表
  sheet.appendRow(row);
}

/**
 * 初始化試算表表頭
 */
function initializeSheetHeaders() {
  // 獲取試算表
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("借還記錄") || spreadsheet.getSheets()[0];
  
  // 如果已經有數據，不需要初始化
  if (sheet.getLastRow() > 0) {
    return;
  }
  
  // 設置表頭
  const headers = [
    "日期",
    "時間",
    "學生姓名",
    "序號",
    "操作類型",
    "其他問題",
    "備註",
    "狀態"
  ];
  
  // 添加表頭
  sheet.appendRow(headers);
  
  // 凍結表頭
  sheet.setFrozenRows(1);
  
  // 設置表頭樣式
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#5f72bd");
  headerRange.setFontColor("white");
  headerRange.setFontWeight("bold");
  
  // 設置列寬
  sheet.setColumnWidth(1, 100);  // 日期
  sheet.setColumnWidth(2, 100);  // 時間
  sheet.setColumnWidth(3, 150);  // 學生姓名
  sheet.setColumnWidth(4, 100);  // 序號
  sheet.setColumnWidth(5, 100);  // 操作類型
  sheet.setColumnWidth(6, 250);  // 其他問題
  sheet.setColumnWidth(7, 200);  // 備註
  sheet.setColumnWidth(8, 100);  // 狀態
}

/**
 * 檢查學生是否有未歸還的平板
 * @param {string} studentId - 學生序號
 * @returns {boolean} - 是否有未歸還的平板
 */
function hasUnreturnedDevice(studentId) {
  // 獲取試算表
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("借還記錄") || spreadsheet.getSheets()[0];
  
  // 如果沒有數據，返回false
  if (sheet.getLastRow() <= 1) {
    return false;
  }
  
  // 獲取所有數據
  const data = sheet.getDataRange().getValues();
  
  // 跳過表頭
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowStudentId = row[3];
    const operation = row[4];
    
    // 如果找到相同學生序號的借出記錄
    if (rowStudentId === studentId) {
      // 檢查最後一條記錄是否為借出
      let lastOperation = null;
      for (let j = data.length - 1; j >= 1; j--) {
        if (data[j][3] === studentId) {
          lastOperation = data[j][4];
          break;
        }
      }
      
      // 如果最後一條記錄是借出，則表示未歸還
      if (lastOperation === "借出") {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 檢查學生是否有借出記錄
 * @param {string} studentId - 學生序號
 * @returns {boolean} - 是否有借出記錄
 */
function hasBorrowRecord(studentId) {
  // 獲取試算表
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("借還記錄") || spreadsheet.getSheets()[0];
  
  // 如果沒有數據，返回false
  if (sheet.getLastRow() <= 1) {
    return false;
  }
  
  // 獲取所有數據
  const data = sheet.getDataRange().getValues();
  
  // 跳過表頭
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowStudentId = row[3];
    const operation = row[4];
    
    // 如果找到相同學生序號的借出記錄
    if (rowStudentId === studentId && operation === "借出") {
      return true;
    }
  }
  
  return false;
}

/**
 * 獲取借還統計
 * @returns {Object} - 統計結果
 */
function getBorrowStats() {
  // 獲取試算表
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("借還記錄") || spreadsheet.getSheets()[0];
  
  // 如果沒有數據，返回空統計
  if (sheet.getLastRow() <= 1) {
    return {
      totalBorrow: 0,
      totalReturn: 0,
      currentBorrowed: 0,
      issues: {}
    };
  }
  
  // 獲取所有數據
  const data = sheet.getDataRange().getValues();
  
  // 統計變量
  let totalBorrow = 0;
  let totalReturn = 0;
  let currentBorrowed = 0;
  let issues = {};
  let studentStatus = {};
  
  // 跳過表頭
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const studentId = row[3];
    const operation = row[4];
    const issue = row[5];
    
    // 統計借出和歸還
    if (operation === "借出") {
      totalBorrow++;
      studentStatus[studentId] = "借出";
    } else if (operation === "歸還") {
      totalReturn++;
      studentStatus[studentId] = "歸還";
    }
    
    // 統計問題
    if (issue) {
      const issueList = issue.split("、");
      for (const item of issueList) {
        if (item.trim()) {
          issues[item.trim()] = (issues[item.trim()] || 0) + 1;
        }
      }
    }
  }
  
  // 計算當前借出數量
  for (const id in studentStatus) {
    if (studentStatus[id] === "借出") {
      currentBorrowed++;
    }
  }
  
  return {
    totalBorrow,
    totalReturn,
    currentBorrowed,
    issues
  };
}

