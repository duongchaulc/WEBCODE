/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: ChartService.gs - Xử lý biểu đồ và phân tích dữ liệu
 */

/**
 * Lấy dữ liệu cho biểu đồ
 * 
 * @param {string} chartType - Loại biểu đồ cần dữ liệu
 * @return {Object} - Kết quả trả về bao gồm dữ liệu biểu đồ
 */
function getChartData(chartType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const data = values.slice(1);
    
    let chartData = [];
    let columnIndex;
    
    // Xác định cột dữ liệu dựa trên loại biểu đồ
    switch (chartType) {
      case 'district':
        columnIndex = 8; // Cột huyện/TP
        break;
      case 'industry':
        columnIndex = 7; // Cột ngành nghề
        break;
      case 'status':
        columnIndex = 16; // Cột trạng thái
        break;
      case 'year':
        // Xử lý đặc biệt cho năm thành lập
        const yearData = {};
        data.forEach(row => {
          let establishDate = row[1]; // Cột ngày thành lập
          
          // Chuyển đổi về định dạng Date nếu cần
          if (!(establishDate instanceof Date)) {
            const parts = establishDate.toString().split('/');
            if (parts.length === 3) {
              establishDate = new Date(parts[2], parts[1] - 1, parts[0]);
            }
          }
          
          if (establishDate instanceof Date && !isNaN(establishDate.getTime())) {
            const year = establishDate.getFullYear().toString();
            yearData[year] = (yearData[year] || 0) + 1;
          }
        });
        
        // Chuyển đổi dữ liệu sang định dạng biểu đồ
        for (const year in yearData) {
          chartData.push({
            label: year,
            value: yearData[year]
          });
        }
        
        // Sắp xếp theo năm tăng dần
        chartData.sort((a, b) => parseInt(a.label) - parseInt(b.label));
        
        return {
          success: true,
          message: "Đã lấy dữ liệu biểu đồ thành công",
          data: {
            chartType: chartType,
            data: chartData
          }
        };
      default:
        throw new Error("Loại biểu đồ không được hỗ trợ");
    }
    
    // Xử lý cho các loại biểu đồ khác (district, industry, status)
    const countData = {};
    data.forEach(row => {
      const value = row[columnIndex] || 'Không xác định';
      countData[value] = (countData[value] || 0) + 1;
    });
    
    // Chuyển đổi dữ liệu sang định dạng biểu đồ
    for (const key in countData) {
      chartData.push({
        label: key,
        value: countData[key]
      });
    }
    
    // Sắp xếp theo số lượng giảm dần
    chartData.sort((a, b) => b.value - a.value);
    
    return {
      success: true,
      message: "Đã lấy dữ liệu biểu đồ thành công",
      data: {
        chartType: chartType,
        data: chartData
      }
    };
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu biểu đồ:", error);
    return {
      success: false,
      message: "Lỗi khi lấy dữ liệu biểu đồ: " + error.toString()
    };
  }
}

/**
 * Phân tích dữ liệu thống kê nâng cao
 * 
 * @param {string} analysisType - Loại phân tích 
 *                                 ("growth", "capital", "district", "industry")
 * @return {Object} - Kết quả phân tích
 */
function getAdvancedAnalytics(analysisType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Bỏ qua hàng tiêu đề
    const headers = values[0];
    const data = values.slice(1);
    
    let analysisData = {};
    
    switch (analysisType) {
      case "growth":
        // Phân tích tăng trưởng qua các năm
        analysisData = analyzeGrowthByYear(data);
        break;
      case "capital":
        // Phân tích thống kê vốn điều lệ
        analysisData = analyzeCapitalDistribution(data);
        break;
      case "district":
        // Phân tích chi tiết theo huyện/thành phố
        analysisData = analyzeDistrictDetails(data);
        break;
      case "industry":
        // Phân tích chi tiết theo ngành nghề
        analysisData = analyzeIndustryDetails(data);
        break;
      default:
        throw new Error("Loại phân tích không được hỗ trợ");
    }
    
    return {
      success: true,
      message: "Phân tích dữ liệu thành công",
      data: {
        analysisType: analysisType,
        results: analysisData
      }
    };
  } catch (error) {
    console.error("Lỗi khi phân tích dữ liệu:", error);
    return {
      success: false,
      message: "Lỗi khi phân tích dữ liệu: " + error.toString()
    };
  }
}

/**
 * Phân tích tăng trưởng số lượng HTX theo năm
 * 
 * @param {Array} data - Dữ liệu HTX
 * @return {Object} - Kết quả phân tích
 */
function analyzeGrowthByYear(data) {
  // Thống kê số lượng HTX theo năm thành lập
  const yearCounts = {};
  const cumulativeGrowth = {};
  let total = 0;
  
  data.forEach(row => {
    let establishDate = row[1]; // Cột ngày thành lập
    
    // Chuyển đổi về định dạng Date
        if (!(establishDate instanceof Date)) {
      const parts = establishDate.toString().split('/');
      if (parts.length === 3) {
        establishDate = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    
    if (establishDate instanceof Date && !isNaN(establishDate.getTime())) {
      const year = establishDate.getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });
  
  // Sắp xếp năm tăng dần và tính tăng trưởng tích lũy
  const years = Object.keys(yearCounts).sort();
  years.forEach(year => {
    total += yearCounts[year];
    cumulativeGrowth[year] = total;
  });
  
  // Tính tốc độ tăng trưởng theo năm
  const growthRate = {};
  for (let i = 1; i < years.length; i++) {
    const prevYear = years[i-1];
    const curYear = years[i];
    const prevCount = cumulativeGrowth[prevYear];
    const curCount = cumulativeGrowth[curYear];
    
    // Tính tỷ lệ tăng trưởng (%)
    growthRate[curYear] = prevCount > 0 ? ((curCount - prevCount) / prevCount * 100).toFixed(2) : 100;
  }
  
  return {
    yearCounts: yearCounts,
    cumulativeGrowth: cumulativeGrowth,
    growthRate: growthRate
  };
}

/**
 * Phân tích phân bố vốn điều lệ
 * 
 * @param {Array} data - Dữ liệu HTX
 * @return {Object} - Kết quả phân tích
 */
function analyzeCapitalDistribution(data) {
  // Mảng vốn điều lệ
  const capitals = [];
  
  // Thống kê theo khoảng vốn
  const capitalRanges = {
    "Dưới 500 triệu": 0,
    "500 triệu - 1 tỷ": 0,
    "1 tỷ - 5 tỷ": 0,
    "5 tỷ - 10 tỷ": 0,
    "Trên 10 tỷ": 0
  };
  
  data.forEach(row => {
    const capitalValue = row[10]; // Cột vốn điều lệ
    
    if (capitalValue) {
      // Chuyển đổi thành số
      let capital;
      if (typeof capitalValue === 'string') {
        capital = parseFloat(capitalValue.replace(/\./g, '').replace(/,/g, '.'));
      } else {
        capital = parseFloat(capitalValue);
      }
      
      if (!isNaN(capital)) {
        capitals.push(capital);
        
        // Phân loại theo khoảng vốn (đơn vị triệu VNĐ)
        if (capital < 500000000) {
          capitalRanges["Dưới 500 triệu"]++;
        } else if (capital < 1000000000) {
          capitalRanges["500 triệu - 1 tỷ"]++;
        } else if (capital < 5000000000) {
          capitalRanges["1 tỷ - 5 tỷ"]++;
        } else if (capital < 10000000000) {
          capitalRanges["5 tỷ - 10 tỷ"]++;
        } else {
          capitalRanges["Trên 10 tỷ"]++;
        }
      }
    }
  });
  
  // Sắp xếp mảng vốn để tính thống kê
  capitals.sort((a, b) => a - b);
  
  // Tính các giá trị thống kê
  const stats = {};
  if (capitals.length > 0) {
    stats.min = capitals[0];
    stats.max = capitals[capitals.length - 1];
    stats.total = capitals.reduce((sum, val) => sum + val, 0);
    stats.avg = stats.total / capitals.length;
    
    // Tính trung vị (median)
    const midIndex = Math.floor(capitals.length / 2);
    if (capitals.length % 2 === 0) {
      stats.median = (capitals[midIndex - 1] + capitals[midIndex]) / 2;
    } else {
      stats.median = capitals[midIndex];
    }
  }
  
  // Tìm top 10 HTX có vốn điều lệ cao nhất
  const topCapital = [];
  const dataWithIndex = data.map((row, index) => ({row, index}));
  
  dataWithIndex.sort((a, b) => {
    const capA = parseFloat((a.row[10] || '0').toString().replace(/\./g, '').replace(/,/g, '.'));
    const capB = parseFloat((b.row[10] || '0').toString().replace(/\./g, '').replace(/,/g, '.'));
    return capB - capA;
  });
  
  for (let i = 0; i < Math.min(10, dataWithIndex.length); i++) {
    const item = dataWithIndex[i];
    topCapital.push({
      name: item.row[0],
      capital: item.row[10],
      rowIndex: item.index
    });
  }
  
  return {
    capitalStats: stats,
    capitalRanges: capitalRanges,
    topCapital: topCapital
  };
}

/**
 * Phân tích chi tiết theo huyện/thành phố
 * 
 * @param {Array} data - Dữ liệu HTX
 * @return {Object} - Kết quả phân tích
 */
function analyzeDistrictDetails(data) {
  // Thống kê theo huyện/thành phố
  const districtData = {};
  
  data.forEach(row => {
    const district = row[8] || "Không xác định"; // Cột huyện/TP
    const status = row[16] || "Không xác định"; // Cột trạng thái
    const capital = parseFloat((row[10] || '0').toString().replace(/\./g, '').replace(/,/g, '.'));
    const members = parseInt(row[12] || '0');
    
    if (!districtData[district]) {
      districtData[district] = {
        total: 0,
        statusCounts: {},
        totalCapital: 0,
        totalMembers: 0
      };
    }
    
    // Tăng tổng số HTX
    districtData[district].total++;
    
    // Tăng số lượng theo trạng thái
    districtData[district].statusCounts[status] = (districtData[district].statusCounts[status] || 0) + 1;
    
    // Tổng vốn điều lệ
    if (!isNaN(capital)) {
      districtData[district].totalCapital += capital;
    }
    
    // Tổng số thành viên
    if (!isNaN(members)) {
      districtData[district].totalMembers += members;
    }
  });
  
  // Tính toán thêm các chỉ số theo huyện/TP
  Object.keys(districtData).forEach(district => {
    const info = districtData[district];
    
    // Vốn điều lệ trung bình
    info.avgCapital = info.total > 0 ? info.totalCapital / info.total : 0;
    
    // Số thành viên trung bình
    info.avgMembers = info.total > 0 ? info.totalMembers / info.total : 0;
    
    // Tỷ lệ HTX đang hoạt động
    const activeCount = info.statusCounts["Hoạt động"] || info.statusCounts["Đang hoạt động"] || 0;
    info.activeRate = info.total > 0 ? (activeCount / info.total * 100).toFixed(2) : 0;
  });
  
  return districtData;
}

/**
 * Phân tích chi tiết theo ngành nghề
 * 
 * @param {Array} data - Dữ liệu HTX
 * @return {Object} - Kết quả phân tích
 */
function analyzeIndustryDetails(data) {
  // Thống kê theo ngành nghề
  const industryData = {};
  
  data.forEach(row => {
    const industry = row[7] || "Không xác định"; // Cột ngành nghề
    const status = row[16] || "Không xác định"; // Cột trạng thái
    const capital = parseFloat((row[10] || '0').toString().replace(/\./g, '').replace(/,/g, '.'));
    const laborData = {
      total: parseInt(row[13] || '0'),
      member: parseInt(row[14] || '0'),
      hired: parseInt(row[15] || '0')
    };
    
    if (!industryData[industry]) {
      industryData[industry] = {
        total: 0,
        statusCounts: {},
        totalCapital: 0,
        totalLabor: {
          total: 0,
          member: 0,
          hired: 0
        }
      };
    }
    
    // Tăng tổng số HTX
    industryData[industry].total++;
    
    // Tăng số lượng theo trạng thái
    industryData[industry].statusCounts[status] = (industryData[industry].statusCounts[status] || 0) + 1;
    
    // Tổng vốn điều lệ
    if (!isNaN(capital)) {
      industryData[industry].totalCapital += capital;
    }
    
    // Tổng số lao động
    if (!isNaN(laborData.total)) {
      industryData[industry].totalLabor.total += laborData.total;
    }
    if (!isNaN(laborData.member)) {
      industryData[industry].totalLabor.member += laborData.member;
    }
    if (!isNaN(laborData.hired)) {
      industryData[industry].totalLabor.hired += laborData.hired;
    }
  });
  
  // Tính toán thêm các chỉ số theo ngành nghề
  Object.keys(industryData).forEach(industry => {
    const info = industryData[industry];
    
    // Vốn điều lệ trung bình
    info.avgCapital = info.total > 0 ? info.totalCapital / info.total : 0;
    
    // Số lao động trung bình
    info.avgLabor = {
      total: info.total > 0 ? info.totalLabor.total / info.total : 0,
      member: info.total > 0 ? info.totalLabor.member / info.total : 0,
      hired: info.total > 0 ? info.totalLabor.hired / info.total : 0
    };
    
    // Tỷ lệ HTX đang hoạt động
    const activeCount = info.statusCounts["Hoạt động"] || info.statusCounts["Đang hoạt động"] || 0;
    info.activeRate = info.total > 0 ? (activeCount / info.total * 100).toFixed(2) : 0;
  });
  
  return industryData;
}