/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: ExportService.gs - Xử lý xuất dữ liệu
 */

/**
 * Xuất dữ liệu đã lọc ra một sheet mới
 * 
 * @param {string} filtersJson - Các bộ lọc dưới dạng JSON string
 * @return {Object} - Kết quả xuất dữ liệu
 */
function exportFilteredData(filtersJson) {
  try {
    const filters = JSON.parse(filtersJson);
    
    // Lấy dữ liệu gốc
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    let data = values.slice(1);
    
    // Áp dụng các bộ lọc
    if (filters) {
      data = data.filter(row => {
        let match = true;
        
        // Lọc theo năm thành lập
        if (filters.year && match) {
          const establishDate = row[1]; // Cột ngày thành lập
          let year = null;
          
          if (establishDate instanceof Date) {
            year = establishDate.getFullYear().toString();
          } else if (typeof establishDate === 'string') {
            const parts = establishDate.split('/');
            if (parts.length === 3) {
              year = parts[2];
            }
          }
          
          match = (year === filters.year);
        }
        
        // Lọc theo giới tính người đại diện
        if (filters.gender && match) {
          match = (row[4] === filters.gender);
        }
        
        // Lọc theo dân tộc
        if (filters.ethnicity && match) {
          match = (row[6] === filters.ethnicity);
        }
        
        // Lọc theo ngành nghề
        if (filters.industry && match) {
          match = (row[7] === filters.industry);
        }
        
        // Lọc theo huyện/thành phố
        if (filters.district && match) {
          match = (row[8] === filters.district);
        }
        
        // Lọc theo xã/phường
        if (filters.ward && match) {
          match = (row[9] === filters.ward);
        }
        
        // Lọc theo trạng thái
        if (filters.status && match) {
          match = (row[16] === filters.status);
        }
        
        return match;
      });
    }
    
    // Tạo sheet mới để xuất dữ liệu
    const now = new Date();
    const timestamp = Utilities.formatDate(now, TIMEZONE, "yyyyMMdd_HHmmss");
    const newSheetName = `Xuất dữ liệu ${timestamp}`;
    const newSheet = ss.insertSheet(newSheetName);
    
    // Ghi dữ liệu vào sheet mới
    // Ghi tiêu đề
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Ghi dữ liệu
    if (data.length > 0) {
      newSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    
    // Định dạng cho sheet mới
    newSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    newSheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3');
    newSheet.setFrozenRows(1);
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      newSheet.autoResizeColumn(i);
    }
    
    // Ghi log xuất dữ liệu
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    const user = getCurrentUser();
    logsSheet.appendRow([
      Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
      user.email,
      'EXPORT',
      `Xuất dữ liệu với bộ lọc: ${JSON.stringify(filters)}`,
      `Tổng số: ${data.length} bản ghi`,
      newSheetName
    ]);
    
    return {
      success: true,
      message: `Đã xuất ${data.length} bản ghi dữ liệu thành công`,
      data: {
        sheetName: newSheetName,
        recordCount: data.length,
        url: ss.getUrl() + '#gid=' + newSheet.getSheetId()
      }
    };
  } catch (error) {
    console.error("Lỗi khi xuất dữ liệu:", error);
    return {
      success: false,
      message: "Lỗi khi xuất dữ liệu: " + error.toString()
    };
  }
}

/**
 * Tạo báo cáo PDF từ dữ liệu hiện có
 * 
 * @param {Object} reportParams - Tham số báo cáo
 * @return {Object} - Kết quả tạo báo cáo
 */
function generateReport(reportParams) {
  try {
    const params = JSON.parse(reportParams);
    const reportType = params.reportType || "summary";
    const filters = params.filters || {};
    
    // Chuẩn bị dữ liệu cho báo cáo
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Tạo tên file báo cáo
    const now = new Date();
    const timestamp = Utilities.formatDate(now, TIMEZONE, "yyyyMMdd_HHmmss");
    const reportName = `Báo_cáo_${reportType}_${timestamp}`;
    
    // Tạo sheet tạm thời
    const tempSheet = ss.insertSheet(reportName);
    
    // Format báo cáo theo loại
    let reportTitle, reportData;
    
    switch (reportType) {
      case "summary":
        reportTitle = "BÁO CÁO TỔNG HỢP TÌNH HÌNH HOẠT ĐỘNG HỢP TÁC XÃ";
        reportData = generateSummaryReport(sheet, tempSheet);
        break;
      case "district":
        reportTitle = "BÁO CÁO THEO HUYỆN/THÀNH PHỐ";
        reportData = generateDistrictReport(sheet, tempSheet);
        break;
      case "industry":
        reportTitle = "BÁO CÁO THEO NGÀNH NGHỀ";
        reportData = generateIndustryReport(sheet, tempSheet);
        break;
      default:
        throw new Error("Loại báo cáo không được hỗ trợ");
    }
    
    // Định dạng trang
    tempSheet.getRange(1, 1, 1, 6).merge();
    tempSheet.getRange(1, 1).setValue(reportTitle).setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center');
    
    tempSheet.getRange(2, 1, 1, 6).merge();
    tempSheet.getRange(2, 1).setValue(`Thời gian xuất báo cáo: ${Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm")}`).setHorizontalAlignment('center');
    
    // Định dạng trang in
    tempSheet.setPageWidth(842); // A4 ngang (mm)
    tempSheet.setPageHeight(595); // A4 ngang (mm)
    tempSheet.setMargins(10, 10, 10, 10); // Trái, trên, phải, dưới (mm)
    
    // Đặt tên sheet theo tên báo cáo
    tempSheet.setName(reportName);
    
    // Tạo URL của sheet để truy cập
    const url = ss.getUrl() + '#gid=' + tempSheet.getSheetId();
    
    // Ghi log
    const currentUser = getCurrentUser();
    const logTimestamp = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    logsSheet.appendRow([
      logTimestamp,
      currentUser.email,
      'REPORT',
      `Tạo báo cáo ${reportType}`,
      JSON.stringify(filters),
      reportName
    ]);
    
    return {
      success: true,
      message: "Đã tạo báo cáo thành công",
      data: {
        reportName: reportName,
        reportType: reportType,
        url: url,
        reportData: reportData
      }
    };
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo:", error);
    return {
      success: false,
      message: "Lỗi khi tạo báo cáo: " + error.toString()
    };
  }
}

/**
 * Tải xuống lịch sử thay đổi
 * 
 * @param {Object} params - Tham số (từ ngày, đến ngày, loại)
 * @return {Object} - Kết quả trả về với URL của sheet mới chứa lịch sử
 */
function downloadAuditLogs(params) {
  try {
    const options = JSON.parse(params);
    const fromDate = options.fromDate ? new Date(options.fromDate) : null;
    const toDate = options.toDate ? new Date(options.toDate) : null;
    const type = options.type || null; // ADD, UPDATE, DELETE, EXPORT, REPORT, ...
    const userFilter = options.user || null;
    
    // Mở sheet logs
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    const dataRange = logsSheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    let logs = values.slice(1);
    
    // Lọc lịch sử theo các điều kiện
    if (fromDate || toDate || type || userFilter) {
      logs = logs.filter(row => {
        const rowDate = row[0] instanceof Date ? row[0] : new Date(row[0]);
        const rowUser = row[1];
        const rowType = row[2];
        
        let match = true;
        
        if (fromDate && !isNaN(fromDate.getTime())) {
          match = match && rowDate >= fromDate;
        }
        
        if (toDate && !isNaN(toDate.getTime())) {
          match = match && rowDate <= toDate;
        }
        
        if (type) {
          match = match && rowType === type;
        }
        
        if (userFilter) {
          match = match && rowUser.toLowerCase().includes(userFilter.toLowerCase());
        }
        
        return match;
      });
    }
    
    // Nếu không có dữ liệu
    if (logs.length === 0) {
      return {
        success: false,
        message: "Không tìm thấy lịch sử thay đổi phù hợp với điều kiện lọc"
      };
    }
    
    // Tạo sheet mới để lưu kết quả
    const now = new Date();
    const timestamp = Utilities.formatDate(now, TIMEZONE, "yyyyMMdd_HHmmss");
    const exportSheetName = `Lịch_sử_${timestamp}`;
    const exportSheet = ss.insertSheet(exportSheetName);
    
    // Thêm tiêu đề
    exportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    exportSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    
    // Thêm dữ liệu
    exportSheet.getRange(2, 1, logs.length, headers.length).setValues(logs);
    
    // Định dạng sheet
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, headers.length);
    
    // Ghi log
    const currentUser = getCurrentUser();
    const actionTime = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
    logsSheet.appendRow([
      actionTime,
      currentUser.email,
      'EXPORT_LOGS',
      `Xuất lịch sử thay đổi (${logs.length} bản ghi)`,
      JSON.stringify(options),
      exportSheetName
    ]);
    
    return {
      success: true,
      message: `Đã xuất ${logs.length} bản ghi lịch sử thay đổi`,
      data: {
        sheetName: exportSheetName,
        recordCount: logs.length,
        url: ss.getUrl() + '#gid=' + exportSheet.getSheetId()
      }
    };
  } catch (error) {
    console.error("Lỗi khi tải xuống lịch sử:", error);
    return {
      success: false,
      message: "Lỗi khi tải xuống lịch sử: " + error.toString()
    };
  }
}

/**
 * Xem chi tiết lịch sử thay đổi của một HTX cụ thể
 * 
 * @param {string} htxName - Tên HTX cần xem lịch sử
 * @return {Object} - Lịch sử thay đổi của HTX
 */
function getHTXHistory(htxName) {
  try {
    if (!htxName) {
      throw new Error("Tên HTX không được để trống");
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    const dataRange = logsSheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const logs = values.slice(1);
    
    // Lọc lịch sử liên quan đến HTX này
    const htxLogs = logs.filter(row => {
      const description = row[3] || '';
      const oldValue = row[4] || '';
      const newValue = row[5] || '';
      
      return (
        description.includes(htxName) ||
        (typeof oldValue === 'string' && oldValue.includes(htxName)) ||
        (typeof newValue === 'string' && newValue.includes(htxName))
      );
    });
    
    // Sắp xếp theo thời gian mới nhất lên đầu
    htxLogs.sort((a, b) => {
      const dateA = a[0] instanceof Date ? a[0] : new Date(a[0]);
      const dateB = b[0] instanceof Date ? b[0] : new Date(b[0]);
      return dateB - dateA;
    });
    
    // Định dạng kết quả trả về
    const formattedLogs = htxLogs.map(row => ({
      timestamp: row[0] instanceof Date ? 
        Utilities.formatDate(row[0], TIMEZONE, "dd/MM/yyyy HH:mm:ss") : row[0],
      user: row[1],
      action: row[2],
      description: row[3],
      oldValue: row[4],
      newValue: row[5]
    }));
    
    return {
      success: true,
      message: `Tìm thấy ${formattedLogs.length} bản ghi lịch sử cho HTX "${htxName}"`,
      data: {
        htxName: htxName,
        logs: formattedLogs
      }
    };
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử HTX:", error);
    return {
      success: false,
      message: "Lỗi khi lấy lịch sử HTX: " + error.toString()
    };
  }
}