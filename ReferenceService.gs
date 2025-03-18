/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: ReferenceService.gs - Xử lý dữ liệu tham chiếu
 */

/**
 * Lấy các danh mục tham chiếu (ngành nghề, loại hình, trạng thái, dân tộc, địa chỉ)
 * 
 * @return {Object} - Kết quả trả về bao gồm các danh mục tham chiếu
 */
function getReferenceData() {
  try {
    const ss = SpreadsheetApp.openById(REFERENCE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('SELECT');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const data = values.slice(1);
    
    // Xây dựng dữ liệu tham chiếu
    const ethnicities = new Set();
    const industries = new Set();
    const types = new Set(); // Thêm Set cho loại hình
    const statuses = new Set();
    const districts = {};
    
    data.forEach(row => {
      // Cột A: Huyện/TP
      const district = row[0];
      // Cột B: Xã/Phường
      const ward = row[1];
      // Cột C: Dân tộc
      const ethnicity = row[2];
      // Cột D: Ngành nghề
      const industry = row[3];
      // Cột E: Loại hình (mới)
      const type = row[4];
      // Cột F: Trạng thái (đã dịch từ cột E sang cột F)
      const status = row[5];
      
      if (ethnicity) ethnicities.add(ethnicity);
      if (industry) industries.add(industry);
      if (type) types.add(type);       // Thêm loại hình vào Set
      if (status) statuses.add(status);
      
      if (district && ward) {
        if (!districts[district]) {
          districts[district] = [];
        }
        districts[district].push(ward);
      }
    });
    
    return {
      success: true,
      message: "Đã lấy dữ liệu tham chiếu thành công",
      data: {
        ethnicities: Array.from(ethnicities).sort(),
        industries: Array.from(industries).sort(),
        types: Array.from(types).sort(),      // Thêm mảng loại hình
        statuses: Array.from(statuses).sort(),
        districts: districts
      }
    };
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu tham chiếu:", error);
    return {
      success: false,
      message: "Lỗi khi lấy dữ liệu tham chiếu: " + error.toString()
    };
  }
}

/**
 * Kiểm tra tính toàn vẹn và đồng nhất của dữ liệu
 * 
 * @return {Object} - Kết quả kiểm tra
 */
function validateDataIntegrity() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const data = values.slice(1);
    
    const issues = [];
    const duplicateNames = new Set();
    const duplicateCodes = new Set();
    const namesMap = new Map();
    const codesMap = new Map();
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 vì chỉ số bắt đầu từ 0 và có 1 hàng tiêu đề
      const name = row[0];
      const establishDate = row[1];
      const code = row[2];
      const type = row[16];      // Thêm trường loại hình (cột Q - index 16)
      const status = row[17];    // Cập nhật index của trạng thái (từ 16 lên 17)
      
      // Kiểm tra tên rỗng
      if (!name || name.trim() === "") {
        issues.push({
          row: rowNum,
          type: "missing_name",
          message: "Thiếu tên HTX"
        });
      } else {
        // Kiểm tra tên trùng lặp
        if (namesMap.has(name)) {
          duplicateNames.add(name);
          issues.push({
            row: rowNum,
            type: "duplicate_name",
            message: `Tên HTX "${name}" trùng lặp với hàng ${namesMap.get(name)}`
          });
        } else {
          namesMap.set(name, rowNum);
        }
      }
      
      // Kiểm tra ngày thành lập hợp lệ
      if (!establishDate) {
        issues.push({
          row: rowNum,
          type: "missing_date",
          message: "Thiếu ngày thành lập"
        });
      } else if (!(establishDate instanceof Date) || isNaN(establishDate.getTime())) {
        issues.push({
          row: rowNum,
          type: "invalid_date",
          message: "Ngày thành lập không hợp lệ"
        });
      }
      
      // Kiểm tra mã số HTX trùng lặp (nếu có)
      if (code) {
        if (codesMap.has(code)) {
          duplicateCodes.add(code);
          issues.push({
            row: rowNum,
            type: "duplicate_code",
            message: `Mã số HTX "${code}" trùng lặp với hàng ${codesMap.get(code)}`
          });
        } else {
          codesMap.set(code, rowNum);
        }
      }
      
      // Kiểm tra loại hình (nếu cần)
      if (!type) {
        issues.push({
          row: rowNum,
          type: "missing_type",
          message: "Thiếu loại hình"
        });
      }
      
      // Kiểm tra trạng thái hợp lệ
      if (!status) {
        issues.push({
          row: rowNum,
          type: "missing_status",
          message: "Thiếu trạng thái hoạt động"
        });
      }
    });
    
    const summary = {
      totalRows: data.length,
      issueCount: issues.length,
      duplicateNames: Array.from(duplicateNames),
      duplicateCodes: Array.from(duplicateCodes),
      issuesByType: {
        missing_name: issues.filter(i => i.type === "missing_name").length,
        duplicate_name: issues.filter(i => i.type === "duplicate_name").length,
        missing_date: issues.filter(i => i.type === "missing_date").length,
        invalid_date: issues.filter(i => i.type === "invalid_date").length,
        duplicate_code: issues.filter(i => i.type === "duplicate_code").length,
        missing_type: issues.filter(i => i.type === "missing_type").length,    // Thêm thống kê thiếu loại hình
        missing_status: issues.filter(i => i.type === "missing_status").length
      }
    };
    
    return {
      success: true,
      message: `Kiểm tra hoàn tất. Tìm thấy ${issues.length} vấn đề.`,
      data: {
        summary: summary,
        issues: issues
      }
    };
  } catch (error) {
    console.error("Lỗi khi kiểm tra tính toàn vẹn dữ liệu:", error);
    return {
      success: false,
      message: "Lỗi khi kiểm tra dữ liệu: " + error.toString()
    };
  }
}