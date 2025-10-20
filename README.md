# DocSwap - Universal Document Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com/)

A powerful, secure, and user-friendly web application for converting documents and images between various formats. Built with Flask and featuring a comprehensive admin portal for monitoring and management.

## 🌟 Features

### Document Conversion
- **Multi-format Support**: Convert between PDF, DOCX, TXT, HTML, and more
- **Image Processing**: Support for JPG, PNG, GIF, BMP, TIFF, WebP formats
- **Batch Processing**: Handle multiple files simultaneously
- **High Quality**: Maintains document formatting and image quality
- **Fast Processing**: Optimized conversion engines for quick results

### Security & Privacy
- **Secure File Handling**: Automatic file cleanup and secure temporary storage
- **Input Validation**: Comprehensive file type and size validation
- **CSRF Protection**: Built-in security against cross-site request forgery
- **Rate Limiting**: Protection against abuse and overuse
- **Privacy First**: Files are automatically deleted after processing

### Admin Portal
- **Real-time Monitoring**: System health, performance metrics, and usage statistics
- **File Management**: View and manage uploaded/converted files
- **User Activity**: Track conversion requests and system usage
- **System Metrics**: CPU, memory, disk usage monitoring
- **Log Analysis**: Comprehensive logging and error tracking

### User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Drag & Drop**: Intuitive file upload interface
- **Progress Tracking**: Real-time conversion progress updates
- **Multi-language Support**: Internationalization ready
- **Contact Form**: Integrated contact system with email notifications

## 🚀 Live Demo

Visit the live application: [https://www.mydocswap.com](https://www.mydocswap.com)

## 📋 Requirements

- Python 3.8 or higher
- Flask 2.3+
- LibreOffice (for document conversions)
- Pillow (for image processing)
- Additional dependencies listed in `requirements.txt`

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/docswap.git
   cd docswap
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the application**
   - Main app: http://localhost:5000
   - Admin portal: http://localhost:5000/admin/login

### Production Access
   - Main app: https://www.mydocswap.com
   - Admin portal: https://www.mydocswap.com/admin/login

### Production Deployment

For production deployment, use the included configuration files:

- **Nginx**: `nginx.conf` - Web server configuration
- **Supervisor**: `supervisor.conf` - Process management
- **Gunicorn**: `gunicorn.conf.py` - WSGI server configuration

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# Admin Portal
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_SECRET_KEY=your-admin-secret-key

# File Upload Settings
MAX_CONTENT_LENGTH=16777216  # 16MB
UPLOAD_FOLDER=uploads
OUTPUT_FOLDER=output

# Email Configuration (for contact form)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Admin Portal Access

Default admin credentials (change immediately):
- Username: `admin`
- Password: Set in environment variables

## 📁 Project Structure

```
docswap/
├── app.py                 # Main Flask application
├── admin.py              # Admin portal functionality
├── user_auth.py          # User authentication system
├── security_config.py    # Security configurations
├── cleanup_files.py      # Automated file cleanup
├── conversion/           # Conversion engine modules
│   ├── __init__.py
│   ├── conversion_manager.py
│   └── engines/
│       ├── base_engine.py
│       ├── document_engine.py
│       └── image_engine.py
├── admin_templates/      # Admin portal templates
├── static/              # Static assets (CSS, JS, images)
├── css/                 # Stylesheets
├── js/                  # JavaScript files
├── requirements.txt     # Python dependencies
├── nginx.conf          # Nginx configuration
├── supervisor.conf     # Supervisor configuration
└── gunicorn.conf.py   # Gunicorn configuration
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /` - Main application page
- `POST /convert` - File conversion endpoint
- `GET /download/<filename>` - Download converted files
- `POST /contact` - Contact form submission

### Admin Endpoints
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/api/metrics` - System metrics API
- `GET /admin/api/logs` - Application logs API

## 🛡️ Security Features

- **File Type Validation**: Strict file type checking
- **Size Limits**: Configurable file size restrictions
- **Secure Headers**: CSRF, XSS, and other security headers
- **Session Management**: Secure session handling
- **Input Sanitization**: All inputs are properly sanitized
- **Automatic Cleanup**: Temporary files are automatically removed

## 📊 Monitoring

The admin portal provides comprehensive monitoring:

- **System Health**: CPU, memory, disk usage
- **Application Metrics**: Conversion statistics, error rates
- **User Activity**: Request logs, popular file types
- **Performance**: Response times, throughput metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **Contact**: Use the contact form on the live application

## 🙏 Acknowledgments

- Flask framework and community
- LibreOffice for document conversion capabilities
- Pillow for image processing
- All contributors and users of DocSwap

---

**DocSwap** - Making document conversion simple, secure, and accessible to everyone.