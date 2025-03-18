/**
 * Quản lý hợp tác xã - Script xử lý dữ liệu Google Sheets
 * Version: 2.0.1
 * 
 * FILE: Config.gs - Chứa các biến cấu hình
 */

// === CẤU HÌNH ===
// ID của Google Sheet chứa dữ liệu HTX
const SPREADSHEET_ID = '1M98H4rqyFMu-vWubMEcxPoDDitezN2vfCgV-nzxEtgs';
// ID của Google Sheet chứa dữ liệu tham chiếu (danh mục)
const REFERENCE_SPREADSHEET_ID = '1qLPAkZOPtNHAouaP2-_Cc94IaHCB3Sk9GF0X9DsKc4o';
// Tên sheet chứa dữ liệu chính
const MAIN_SHEET_NAME = 'HTX';
// Tên sheet chứa lịch sử thay đổi
const LOGS_SHEET_NAME = 'Logs';
// Cột lưu thời gian audit (S = 19 - đã dịch chuyển do thêm cột Loại hình)
const TIMESTAMP_COLUMN = 19;
// Cột lưu người dùng audit (T = 20 - đã dịch chuyển do thêm cột Loại hình)
const USER_COLUMN = 20;
// Múi giờ được sử dụng cho định dạng thời gian
const TIMEZONE = "Asia/Ho_Chi_Minh";
// Tiền tố cho sheet xuất dữ liệu
const EXPORT_SHEET_PREFIX = 'Export_';