// Xử lý yêu cầu HTTP GET khi người dùng truy cập ứng dụng web
function doGet(e) {
  try {
    // Tạo đối tượng template từ file HTML
    var template = HtmlService.createTemplateFromFile('xemthongtin');
    
    // Thực thi template để lấy HTML đã được xử lý
    var html = template.evaluate();
    
    // Thiết lập tiêu đề và chiều rộng tối đa cho ứng dụng
    html.setTitle('Quản lý Hợp tác xã');
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    // Trả về HTML để hiển thị
    return html;
  } catch (error) {
    // Xử lý lỗi
    Logger.log("Lỗi trong doGet: " + error.toString());
    
    // Trả về thông báo lỗi dạng HTML
    return HtmlService.createHtmlOutput(
      '<div style="text-align:center; margin-top:50px;">' +
      '<h2>Đã xảy ra lỗi</h2>' +
      '<p>' + error.toString() + '</p>' +
      '<p><a href="javascript:window.location.reload();">Tải lại trang</a></p>' +
      '</div>'
    );
  }
}

// Phương thức để thêm các file HTML khác vào file chính
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}