# DocSwap

DocSwap is a modern web application for seamless file conversions with a focus on PDFs. It allows users to convert PDF files to various formats (Word, Excel, PowerPoint, images, etc.) and convert other file formats to PDF.

## Features

- **Multiple Format Support**: Convert to and from PDF with support for Word, Excel, PowerPoint, images, and more
- **Drag & Drop Interface**: Easy file uploading via drag-and-drop or file selection
- **AI Format Suggestions**: Intelligent format recommendations based on file content
- **OCR Technology**: Extract text from scanned documents and images
- **File Optimization**: Compress output files or adjust quality settings
- **Temporary Storage**: Files are stored for 24 hours with access via unique URLs
- **Multi-language Support**: Available in English, Spanish, and French
- **Mobile-Friendly**: Responsive design works on all devices

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python Flask
- **File Processing**: pdf2docx, PyMuPDF, pytesseract, img2pdf, docx2pdf

## Setup Instructions

### Prerequisites

- Python 3.7+ installed
- pip package manager

### Installation

1. Clone the repository or download the source code

2. Install the required Python packages:

```bash
pip install -r requirements.txt
```

3. Run the application:

```bash
python app.py
```

4. Open your browser and navigate to:

```
http://localhost:5000
```

## Usage

1. Drag and drop a file or click to select a file
2. Choose the desired output format
3. Configure advanced options (optional)
4. Click "Convert Now"
5. Preview and download the converted file

## Project Structure

```
├── index.html          # Main HTML file
├── css/                # Stylesheets
│   ├── styles.css      # Main styles
│   └── responsive.css  # Responsive design styles
├── js/                 # JavaScript files
│   ├── main.js         # Main application logic
│   └── translations.js # Multi-language support
├── app.py              # Flask backend server
├── requirements.txt    # Python dependencies
├── uploads/            # Temporary storage for uploaded files
└── output/             # Temporary storage for converted files
```

## License

All rights reserved. © 2025 DocSwap.

## Acknowledgements

Built with ❤️ for seamless conversions.