/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: DataService.gs - Xử lý dữ liệu và thao tác với Google Sheets
 */

// Kiểm tra xem các hằng số đã được khai báo chưa
// Sử dụng typeof để kiểm tra biến đã tồn tại hay chưa
if (typeof SPREADSHEET_ID === 'undefined') {
  const SPREADSHEET_ID = '1M98H4rqyFMu-vWubMEcxPoDDitezN2vfCgV-nzxEtgs'; // ID của Google Sheet
}

if (typeof MAIN_SHEET_NAME === 'undefined') {
  const MAIN_SHEET_NAME = 'HTX';                // Tên sheet chính chứa dữ liệu HTX
}

if (typeof LOGS_SHEET_NAME === 'undefined') {
  const LOGS_SHEET_NAME = 'Logs';               // Tên sheet chứa logs
}

if (typeof EXPORT_SHEET_PREFIX === 'undefined') {
  const EXPORT_SHEET_PREFIX = 'Export_';        // Tiền tố cho sheet xuất dữ liệu
}

if (typeof TIMEZONE === 'undefined') {
  const TIMEZONE = "Asia/Ho_Chi_Minh";          // Múi giờ
}

if (typeof TIMESTAMP_COLUMN === 'undefined') {
  const TIMESTAMP_COLUMN = 19;                  // Cột lưu timestamp cập nhật cuối cùng (đã cập nhật)
}

if (typeof USER_COLUMN === 'undefined') {
  const USER_COLUMN = 20;                       // Cột lưu thông tin người dùng cập nhật cuối cùng (đã cập nhật)
}

// Cập nhật giá trị ô với audit log
function updateCellValueWithAudit(rowIndex, columnIndex, newValue, timestamp, user) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Kiểm tra đầu vào
    if (rowIndex === undefined || columnIndex === undefined) {
      console.error("Chỉ số hàng hoặc cột không hợp lệ:", rowIndex, columnIndex);
      return false;
    }
    
    console.log("Thông tin cập nhật:", {rowIndex, columnIndex, newValue, timestamp, user});
    
    // Lấy giá trị cũ trước khi cập nhật
    const actualRow = rowIndex + 2; // +2 vì rowIndex là 0-based và tính cả hàng tiêu đề
    const actualCol = columnIndex + 1; // +1 vì columnIndex là 0-based
    
    // Kiểm tra phạm vi
    if (actualRow <= 1 || actualRow > sheet.getLastRow() || 
        actualCol <= 0 || actualCol > sheet.getLastColumn()) {
      console.error("Vị trí cập nhật nằm ngoài phạm vi hợp lệ:", actualRow, actualCol);
      return false;
    }
    
    const oldValue = sheet.getRange(actualRow, actualCol).getValue();
    console.log("Giá trị cũ:", oldValue, "Giá trị mới:", newValue);
    
    // Cập nhật dữ liệu
    sheet.getRange(actualRow, actualCol).setValue(newValue);
    sheet.getRange(actualRow, TIMESTAMP_COLUMN).setValue(timestamp);
    sheet.getRange(actualRow, USER_COLUMN).setValue(user);
    
    console.log("Đã cập nhật dữ liệu thành công");
    
    // Ghi log chi tiết
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fieldName = headers[columnIndex];
    const rowName = sheet.getRange(actualRow, 1).getValue(); // Lấy tên HTX từ cột đầu tiên
    
    logsSheet.appendRow([
      timestamp,
      user,
      'UPDATE',
      `Cập nhật trường "${fieldName}" của HTX "${rowName}"`,
      oldValue,
      newValue
    ]);
    
    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    return false;
  }
}

// Xóa dòng HTX
function deleteHTXRow(rowIndex) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Xác định hàng thực tế (+2 vì rowIndex là 0-based và có hàng tiêu đề)
    const actualRow = parseInt(rowIndex) + 2;
    
    // Kiểm tra phạm vi
    if (actualRow <= 1 || actualRow > sheet.getLastRow()) {
      return {
        success: false,
        message: "Vị trí hàng nằm ngoài phạm vi hợp lệ"
      };
    }
    
    // Lấy thông tin HTX trước khi xóa để ghi log
    const rowData = sheet.getRange(actualRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const htxName = rowData[0]; // Tên HTX là cột đầu tiên
    
    // Xóa hàng
    sheet.deleteRow(actualRow);
    
    // Lấy thông tin người dùng hiện tại
    const userInfo = getCurrentUser();
    
    // Ghi log
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    logsSheet.appendRow([
      userInfo.formattedTime,
      userInfo.email,
      'DELETE',
      `Xóa HTX "${htxName}"`,
      JSON.stringify(rowData),
      ''
    ]);
    
    return {
      success: true,
      message: "Đã xóa dữ liệu HTX thành công"
    };
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return {
      success: false,
      message: "Lỗi khi xóa dữ liệu: " + error.toString()
    };
  }
}

// Thêm mới HTX
function addNewHTX(htxData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Validate dữ liệu đầu vào
    if (!htxData || !htxData.name || !htxData.establishDate) {
      return {
        success: false,
        message: "Thiếu thông tin cần thiết để thêm HTX mới"
      };
    }
    
    // Lấy thông tin người dùng hiện tại
    const userInfo = getCurrentUser();
    
    // Chuẩn bị dữ liệu để thêm vào sheet
    const rowData = [
      htxData.name || '',
      htxData.establishDate || '',
      htxData.code || '',
      htxData.representative || '',
      htxData.gender || '',
      htxData.birthdate || '',
      htxData.ethnicity || '',
      htxData.industry || '',
      htxData.district || '',
      htxData.ward || '',
      htxData.capital ? htxData.capital.replace(/\./g, '').replace(/,/g, '') : '',
      htxData.phone || '',
      htxData.members ? htxData.members.replace(/\./g, '').replace(/,/g, '') : '',
      htxData.totalLabor ? htxData.totalLabor.replace(/\./g, '').replace(/,/g, '') : '',
      htxData.memberLabor ? htxData.memberLabor.replace(/\./g, '').replace(/,/g, '') : '',
      htxData.hiredLabor ? htxData.hiredLabor.replace(/\./g, '').replace(/,/g, '') : '',
      htxData.type || '',              // Thêm trường loại hình
      htxData.status || '',            // Dịch chuyển trạng thái sang vị trí mới
      '',  // Cột dự trữ
      userInfo.formattedTime,  // Timestamp
      userInfo.email  // User
    ];
    
    // Thêm dữ liệu vào sheet
    sheet.appendRow(rowData);
    
    // Ghi log
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    logsSheet.appendRow([
      userInfo.formattedTime,
      userInfo.email,
      'ADD',
      `Thêm mới HTX "${htxData.name}"`,
      '',
      JSON.stringify(htxData)
    ]);
    
    return {
      success: true,
      message: "Đã thêm HTX mới thành công",
      data: { htxName: htxData.name }
    };
  } catch (error) {
    console.error("Lỗi khi thêm HTX mới:", error);
    return {
      success: false,
      message: "Lỗi khi thêm HTX mới: " + error.toString()
    };
  }
}

// Xuất dữ liệu đã lọc ra sheet mới
function exportFilteredData(filters) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Lấy toàn bộ dữ liệu
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headers = headerRange.getValues()[0];
    
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const allData = dataRange.getValues();
    
    // Lọc dữ liệu dựa trên filters
    let filteredData = allData;
    
    if (filters.year) {
      filteredData = filteredData.filter(row => {
        const date = new Date(row[1]); // Ngày thành lập ở cột B (index 1)
        return date && date.getFullYear().toString() === filters.year;
      });
    }
    
    if (filters.gender) {
      filteredData = filteredData.filter(row => row[4] === filters.gender); // Giới tính ở cột E (index 4)
    }
    
    if (filters.ethnicity) {
      filteredData = filteredData.filter(row => row[6] === filters.ethnicity); // Dân tộc ở cột G (index 6)
    }
    
    if (filters.industry) {
      filteredData = filteredData.filter(row => row[7] === filters.industry); // Ngành nghề ở cột H (index 7)
    }
    
    if (filters.district) {
      filteredData = filteredData.filter(row => row[8] === filters.district); // Huyện ở cột I (index 8)
    }
    
    if (filters.ward) {
      filteredData = filteredData.filter(row => row[9] === filters.ward); // Xã ở cột J (index 9)
    }
    
    if (filters.type) {
      filteredData = filteredData.filter(row => row[16] === filters.type); // Loại hình ở cột Q (index 16)
    }
    
    if (filters.status) {
      filteredData = filteredData.filter(row => row[17] === filters.status); // Trạng thái ở cột R (index 17, đã dịch chuyển)
    }
    
    // Tạo sheet mới để xuất dữ liệu
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, TIMEZONE, "yyyyMMdd_HHmmss");
    const exportSheetName = EXPORT_SHEET_PREFIX + formattedDate;
    const newSheet = ss.insertSheet(exportSheetName);
    
    // Ghi tiêu đề
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Ghi dữ liệu đã lọc
    if (filteredData.length > 0) {
      newSheet.getRange(2, 1, filteredData.length, headers.length).setValues(filteredData);
    }
    
    // Định dạng sheet
    newSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    newSheet.setFrozenRows(1);
    
    // Điều chỉnh kích thước cột
    for (let i = 1; i <= headers.length; i++) {
      newSheet.autoResizeColumn(i);
    }
    
    // Ghi log
    const userInfo = getCurrentUser();
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    logsSheet.appendRow([
      userInfo.formattedTime,
      userInfo.email,
      'EXPORT',
      `Xuất dữ liệu vào sheet "${exportSheetName}" với bộ lọc: ${JSON.stringify(filters)}`,
      '',
      `${filteredData.length} dòng dữ liệu`
    ]);
    
    // Trả về thông tin sheet đã xuất
    return {
      success: true,
      message: `Đã xuất ${filteredData.length} dòng dữ liệu vào sheet mới`,
      data: {
        sheetName: exportSheetName,
        recordCount: filteredData.length,
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

// Lấy dữ liệu cho biểu đồ theo loại
function getChartDataByType(chartType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    // Lấy dữ liệu từ sheet
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const allData = dataRange.getValues();
    
    let chartData = [];
    
    switch (chartType) {
      case 'district':
        // Thống kê theo huyện/thành phố
        chartData = countByColumn(allData, 8); // Huyện ở cột I (index 8)
        break;
        
      case 'industry':
        // Thống kê theo ngành nghề
        chartData = countByColumn(allData, 7); // Ngành nghề ở cột H (index 7)
        break;
        
      case 'type':
        // Thống kê theo loại hình (mới)
        chartData = countByColumn(allData, 16); // Loại hình ở cột Q (index 16)
        break;
        
      case 'status':
        // Thống kê theo trạng thái
        chartData = countByColumn(allData, 17); // Trạng thái ở cột R (index 17, đã dịch chuyển)
        break;
        
      case 'year':
        // Thống kê theo năm thành lập
        chartData = countByYear(allData, 1); // Ngày thành lập ở cột B (index 1)
        break;
        
      default:
        return {
          success: false,
          message: `Loại biểu đồ '${chartType}' không hỗ trợ`
        };
    }
    
    return {
      success: true,
      data: {
        type: chartType,
        data: chartData
      }
    };
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu biểu đồ ${chartType}:`, error);
    return {
      success: false,
      message: `Lỗi khi lấy dữ liệu biểu đồ ${chartType}: ` + error.toString()
    };
  }
}

// Hàm đếm số lượng theo cột
function countByColumn(data, columnIndex) {
  const counts = {};
  
  data.forEach(row => {
    const value = row[columnIndex] || 'Không xác định';
    if (!counts[value]) {
      counts[value] = 1;
    } else {
      counts[value]++;
    }
  });
  
  // Chuyển đổi thành mảng để dễ sắp xếp
  let result = Object.keys(counts).map(key => ({
    label: key,
    value: counts[key]
  }));
  
  // Sắp xếp theo số lượng giảm dần
  result.sort((a, b) => b.value - a.value);
  
  return result;
}

// Hàm đếm số lượng theo năm
function countByYear(data, dateColumnIndex) {
  const counts = {};
  
  data.forEach(row => {
    let year = 'Không xác định';
    
    if (row[dateColumnIndex]) {
      const date = new Date(row[dateColumnIndex]);
      if (!isNaN(date.getTime())) {
        year = date.getFullYear().toString();
      }
    }
    
    if (!counts[year]) {
      counts[year] = 1;
    } else {
      counts[year]++;
    }
  });
  
  // Chuyển đổi thành mảng để dễ sắp xếp
  let result = Object.keys(counts).map(key => ({
    label: key,
    value: counts[key]
  }));
  
  // Sắp xếp theo năm tăng dần
  result.sort((a, b) => {
    if (a.label === 'Không xác định') return 1;
    if (b.label === 'Không xác định') return -1;
    return parseInt(a.label) - parseInt(b.label);
  });
  
  return result;
}