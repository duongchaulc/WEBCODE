/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: Main.gs - Điểm vào chính của ứng dụng
 */

// Điểm vào duy nhất cho tất cả các request từ client
function handleRequest(params) {
  try {
    let result = { success: false, message: "Không xác định được action" };
    
    // Kiểm tra action
    if (!params || !params.action) {
      return result;
    }
    
    switch (params.action) {
      case 'getChartData':
        const chartType = params.chartType;
        if (chartType) {
          result = getChartDataByType(chartType);
        } else {
          result = { success: false, message: "Thiếu thông tin loại biểu đồ" };
        }
        break;
        
      case 'exportData':
        if (params.filters) {
          let filters = {};
          try {
            if (typeof params.filters === 'string') {
              filters = JSON.parse(params.filters);
            } else {
              filters = params.filters;
            }
            result = exportFilteredData(filters);
          } catch (e) {
            result = { success: false, message: "Lỗi xử lý bộ lọc: " + e.toString() };
          }
        } else {
          result = exportFilteredData({});
        }
        break;
        
      case 'getUserInfo':
        result = { 
          success: true, 
          data: getCurrentUser()
        };
        break;
        
      case 'updateCell': // Thêm xử lý action updateCell
        if (params.data) {
          let dataObj;
          try {
            dataObj = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
            console.log("Dữ liệu updateCell nhận được:", JSON.stringify(dataObj)); // Log dữ liệu nhận được
            result = processEditChanges(dataObj);
            console.log("Kết quả xử lý updateCell:", JSON.stringify(result)); // Log kết quả 
          } catch (e) {
            result = { 
              success: false, 
              message: "Lỗi xử lý dữ liệu JSON: " + e.toString() 
            };
            console.error("Lỗi parse JSON:", e);
          }
        } else {
          result = { 
            success: false, 
            message: "Thiếu dữ liệu cập nhật" 
          };
        }
        break;
        
      case 'deleteRow': // Thêm xử lý action deleteRow
        if (params.rowIndex !== undefined) {
          result = deleteHTXRow(params.rowIndex);
        } else {
          result = { success: false, message: "Thiếu chỉ số hàng cần xóa" };
        }
        break;
        
      case 'addHTX':
        if (params.htxData) {
          let htxDataObj;
          try {
            htxDataObj = typeof params.htxData === 'string' ? JSON.parse(params.htxData) : params.htxData;
            result = addNewHTX(htxDataObj);
          } catch (e) {
            result = { success: false, message: "Lỗi xử lý dữ liệu HTX mới: " + e.toString() };
          }
        } else {
          result = { success: false, message: "Thiếu dữ liệu HTX mới" };
        }
        break;
      
      case 'getHTXHistory':
        if (params.htxName) {
          result = getHTXHistory(params.htxName);
        } else {
          result = { success: false, message: "Thiếu tên HTX" };
        }
        break;

      default:
        result = { success: false, message: `Action '${params.action}' không được hỗ trợ` };
    }
    
    return result;
  } catch (error) {
    console.error("Lỗi xử lý request:", error);
    return {
      success: false,
      message: "Lỗi server: " + error.toString()
    };
  }
}

/**
 * Lấy lịch sử thay đổi của một HTX
 *
 * @param {string} htxName - Tên HTX cần lấy lịch sử
 * @return {Object} - Kết quả và dữ liệu lịch sử
 */
function getHTXHistory(htxName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
    
    // Lấy toàn bộ dữ liệu logs
    const dataRange = logsSheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const data = values.slice(1);
    
    // Lọc log theo tên HTX
    const logs = data
      .filter(row => {
        const description = row[3] || ''; // Cột D (index 3) chứa mô tả
        return description.includes(`HTX "${htxName}"`);
      })
      .map(row => ({
        timestamp: row[0], // Thời gian
        user: row[1],      // Người thực hiện
        action: row[2],    // Hành động
        description: row[3], // Mô tả
        oldValue: row[4],  // Giá trị cũ
        newValue: row[5]   // Giá trị mới
      }));
    
    return {
      success: true,
      message: `Đã lấy lịch sử HTX "${htxName}" thành công`,
      data: {
        htxName: htxName,
        logs: logs
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

// Xử lý thay đổi dữ liệu
function processEditChanges(params) {
  try {
    // Phân tích tham số từ JSON string nếu chưa được parse
    let data;
    if (typeof params === 'string') {
      data = JSON.parse(params);
    } else {
      data = params;
    }
    
    console.log("Dữ liệu nhận được:", JSON.stringify(data)); // Thêm log để debug
    
    const { rowIndex, columnIndex, newValue, timestamp, user } = data;
    
    // Validate dữ liệu
    if (rowIndex === undefined || columnIndex === undefined || newValue === undefined) {
      return {
        success: false,
        message: "Thiếu thông tin cần thiết để cập nhật dữ liệu"
      };
    }
    
    // Kiểm tra timestamp và user, nếu không có thì lấy hiện tại
    let currentTimestamp = timestamp;
    let currentUser = user;
    
    if (!currentTimestamp || !currentUser) {
      const userInfo = getCurrentUser();
      currentTimestamp = currentTimestamp || userInfo.formattedTime;
      currentUser = currentUser || userInfo.email;
    }
    
    // Gọi hàm cập nhật dữ liệu
    const result = updateCellValueWithAudit(
      parseInt(rowIndex), 
      parseInt(columnIndex), 
      newValue, 
      currentTimestamp, 
      currentUser
    );
    
    return {
      success: result,
      message: result ? "Cập nhật dữ liệu thành công" : "Không thể cập nhật dữ liệu",
      data: { rowIndex, columnIndex }
    };
  } catch (error) {
    console.error("Lỗi khi xử lý thay đổi dữ liệu:", error);
    return {
      success: false,
      message: "Lỗi khi xử lý thay đổi dữ liệu: " + error.toString()
    };
  }
}

// Lấy thông tin người dùng hiện tại
function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  const now = new Date();
  const formattedTime = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
  
  return {
    email: email,
    formattedTime: formattedTime
  };
}

/**
 * Lấy tất cả dữ liệu từ sheet chính và metadata
 * 
 * @return {Object} - Dữ liệu từ sheet và metadata
 */
function getTableData() {
  try {
    // Lấy dữ liệu từ sheet chính
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    
    if (!sheet) {
      return {
        success: false,
        message: `Không tìm thấy sheet "${MAIN_SHEET_NAME}"`
      };
    }
    
    // Lấy toàn bộ dữ liệu
    const dataRange = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const data = values.slice(1);
    
    // Lấy dữ liệu tham chiếu (danh mục)
    const referenceResult = getReferenceData();
    if (!referenceResult.success) {
      return referenceResult;
    }
    
    const referenceData = referenceResult.data;
    
    // Lấy tất cả năm thành lập
    const years = getEstablishmentYears(data);
    
    // Thêm dữ liệu tham chiếu vào metadata
    const metadata = {
      years: years,
      ethnicities: referenceData.ethnicities,
      industries: referenceData.industries,
      types: referenceData.types,         // Thêm danh sách loại hình
      statuses: referenceData.statuses,
      districts: Object.keys(referenceData.districts).sort(),
      wardsByDistrict: referenceData.districts
    };
    
    return {
      success: true,
      message: `Đã lấy ${data.length} dòng dữ liệu`,
      data: data,
      metadata: metadata
    };
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu bảng:", error);
    return {
      success: false,
      message: "Lỗi khi lấy dữ liệu bảng: " + error.toString()
    };
  }
}

/**
 * Lấy danh sách các năm thành lập từ dữ liệu
 * 
 * @param {Array} data - Dữ liệu HTX
 * @return {Array} - Danh sách các năm đã sắp xếp
 */
function getEstablishmentYears(data) {
  const yearsSet = new Set();
  
  // Lấy năm từ ngày thành lập (cột B, index 1)
  data.forEach(row => {
    if (row[1] && row[1] instanceof Date) {
      const year = row[1].getFullYear();
      yearsSet.add(year.toString());
    }
  });
  
  // Sắp xếp năm giảm dần (mới nhất lên đầu)
  return Array.from(yearsSet).sort((a, b) => b - a);
}