"""
Enhanced document conversion engine supporting comprehensive document format conversions.
Uses existing libraries (python-docx, PyPDF2) with improved capabilities and error handling.
"""

import os
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import tempfile
import subprocess

try:
    from docx import Document
    from docx.shared import Inches
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import openpyxl
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False

try:
    from pdf2docx import Converter as PDFToDocxConverter
    PDF2DOCX_AVAILABLE = True
except ImportError:
    PDF2DOCX_AVAILABLE = False

from .base_engine import ConversionEngine, ConversionError

logger = logging.getLogger(__name__)

class DocumentEngine(ConversionEngine):
    """Enhanced document conversion engine with comprehensive format support."""
    
    def __init__(self):
        super().__init__("DocumentEngine")
    
    def _initialize_formats(self) -> None:
        """Initialize supported document formats and conversion matrix."""
        self.supported_inputs = []
        self.supported_outputs = []
        
        # Add formats based on available libraries
        if PDF_AVAILABLE:
            self.supported_inputs.extend(['pdf'])
            self.supported_outputs.extend(['pdf'])
        
        if DOCX_AVAILABLE:
            self.supported_inputs.extend(['docx'])
            self.supported_outputs.extend(['docx', 'txt', 'html'])
        
        if XLSX_AVAILABLE:
            self.supported_inputs.extend(['xlsx'])
            self.supported_outputs.extend(['xlsx', 'csv'])
        
        # Text formats (always available)
        self.supported_inputs.extend(['txt', 'html', 'csv'])
        self.supported_outputs.extend(['txt', 'html', 'csv'])
        
        # Build conversion matrix
        self._build_conversion_matrix()
    
    def _build_conversion_matrix(self) -> None:
        """Build the conversion matrix based on available libraries."""
        # PDF conversions
        if PDF_AVAILABLE:
            self.conversion_matrix['pdf'] = ['txt']  # Basic text extraction
            if DOCX_AVAILABLE:
                self.conversion_matrix['pdf'].append('docx')
        
        # DOCX conversions
        if DOCX_AVAILABLE:
            self.conversion_matrix['docx'] = ['txt', 'html']
            if PDF_AVAILABLE:
                self.conversion_matrix['docx'].append('pdf')
        
        # XLSX conversions
        if XLSX_AVAILABLE:
            self.conversion_matrix['xlsx'] = ['csv', 'txt', 'html']
            if PDF_AVAILABLE:
                self.conversion_matrix['xlsx'].append('pdf')
        
        # Text format conversions
        self.conversion_matrix['txt'] = ['html']
        if DOCX_AVAILABLE:
            self.conversion_matrix['txt'].append('docx')
        
        self.conversion_matrix['html'] = ['txt']
        if DOCX_AVAILABLE:
            self.conversion_matrix['html'].append('docx')
        
        self.conversion_matrix['csv'] = ['txt', 'html']
        if XLSX_AVAILABLE:
            self.conversion_matrix['csv'].append('xlsx')
    
    def convert(self, input_path: str, output_path: str, 
                input_format: str, output_format: str, 
                options: Optional[Dict[str, Any]] = None) -> bool:
        """
        Convert between document formats.
        
        Options:
            - preserve_formatting: Boolean for format preservation
            - extract_images: Boolean for image extraction from documents
            - page_range: Tuple (start, end) for page-specific operations
        """
        try:
            options = options or {}
            input_format = input_format.lower()
            output_format = output_format.lower()
            
            if not self.can_convert(input_format, output_format):
                raise ConversionError(
                    f"Cannot convert {input_format} to {output_format}",
                    engine=self.name,
                    input_format=input_format,
                    output_format=output_format
                )
            
            # Route to appropriate conversion method
            conversion_key = f"{input_format}_to_{output_format}"
            
            if hasattr(self, f"_convert_{conversion_key}"):
                return getattr(self, f"_convert_{conversion_key}")(input_path, output_path, options)
            else:
                return self._generic_convert(input_path, output_path, input_format, output_format, options)
                
        except Exception as e:
            logger.error(f"Document conversion failed: {str(e)}")
            raise ConversionError(f"Document conversion failed: {str(e)}", engine=self.name)
    
    def _convert_pdf_to_txt(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Extract text from PDF."""
        if not PDF_AVAILABLE:
            return False
        
        try:
            with open(input_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = []
                
                page_range = options.get('page_range')
                if page_range:
                    start_page, end_page = page_range
                    pages = range(start_page - 1, min(end_page, len(pdf_reader.pages)))
                else:
                    pages = range(len(pdf_reader.pages))
                
                for page_num in pages:
                    page = pdf_reader.pages[page_num]
                    text_content.append(page.extract_text())
                
                with open(output_path, 'w', encoding='utf-8') as output_file:
                    output_file.write('\n\n'.join(text_content))
                
                return True
                
        except Exception as e:
            logger.error(f"PDF to text conversion failed: {str(e)}")
            return False
    
    def _convert_pdf_to_docx(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Convert PDF to DOCX using pdf2docx."""
        if not PDF2DOCX_AVAILABLE:
            logger.error("pdf2docx library not available")
            return False
        
        try:
            # Create converter instance
            cv = PDFToDocxConverter(input_path)
            
            # Get page range if specified
            page_range = options.get('page_range')
            if page_range:
                start_page, end_page = page_range
                cv.convert(output_path, start=start_page-1, end=end_page-1)
            else:
                cv.convert(output_path)
            
            cv.close()
            
            # Verify output file was created and has content
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(f"Successfully converted PDF to DOCX: {output_path}")
                return True
            else:
                logger.error("PDF to DOCX conversion produced empty file")
                return False
                
        except Exception as e:
            logger.error(f"PDF to DOCX conversion failed: {str(e)}")
            return False
    
    def _convert_docx_to_txt(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Extract text from DOCX."""
        if not DOCX_AVAILABLE:
            return False
        
        try:
            doc = Document(input_path)
            text_content = []
            
            for paragraph in doc.paragraphs:
                text_content.append(paragraph.text)
            
            with open(output_path, 'w', encoding='utf-8') as output_file:
                output_file.write('\n'.join(text_content))
            
            return True
            
        except Exception as e:
            logger.error(f"DOCX to text conversion failed: {str(e)}")
            return False
    
    def _convert_docx_to_html(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Convert DOCX to HTML."""
        if not DOCX_AVAILABLE:
            return False
        
        try:
            doc = Document(input_path)
            html_content = ['<!DOCTYPE html>', '<html>', '<head>', 
                          '<meta charset="utf-8">', '<title>Document</title>', 
                          '</head>', '<body>']
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    html_content.append(f'<p>{paragraph.text}</p>')
            
            html_content.extend(['</body>', '</html>'])
            
            with open(output_path, 'w', encoding='utf-8') as output_file:
                output_file.write('\n'.join(html_content))
            
            return True
            
        except Exception as e:
            logger.error(f"DOCX to HTML conversion failed: {str(e)}")
            return False
    
    def _convert_txt_to_docx(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Convert text to DOCX."""
        if not DOCX_AVAILABLE:
            return False
        
        try:
            doc = Document()
            
            with open(input_path, 'r', encoding='utf-8') as input_file:
                content = input_file.read()
            
            # Split into paragraphs
            paragraphs = content.split('\n\n')
            
            for paragraph_text in paragraphs:
                if paragraph_text.strip():
                    doc.add_paragraph(paragraph_text.strip())
            
            doc.save(output_path)
            return True
            
        except Exception as e:
            logger.error(f"Text to DOCX conversion failed: {str(e)}")
            return False
    
    def _convert_xlsx_to_csv(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Convert XLSX to CSV."""
        if not XLSX_AVAILABLE:
            return False
        
        try:
            workbook = openpyxl.load_workbook(input_path)
            worksheet = workbook.active
            
            import csv
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                csv_writer = csv.writer(csvfile)
                
                for row in worksheet.iter_rows(values_only=True):
                    csv_writer.writerow(row)
            
            return True
            
        except Exception as e:
            logger.error(f"XLSX to CSV conversion failed: {str(e)}")
            return False
    
    def _convert_csv_to_xlsx(self, input_path: str, output_path: str, options: Dict[str, Any]) -> bool:
        """Convert CSV to XLSX."""
        if not XLSX_AVAILABLE:
            return False
        
        try:
            workbook = openpyxl.Workbook()
            worksheet = workbook.active
            
            import csv
            with open(input_path, 'r', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)
                
                for row_num, row in enumerate(csv_reader, 1):
                    for col_num, value in enumerate(row, 1):
                        worksheet.cell(row=row_num, column=col_num, value=value)
            
            workbook.save(output_path)
            return True
            
        except Exception as e:
            logger.error(f"CSV to XLSX conversion failed: {str(e)}")
            return False
    
    def _generic_convert(self, input_path: str, output_path: str, 
                        input_format: str, output_format: str, options: Dict[str, Any]) -> bool:
        """Generic conversion fallback."""
        # For now, return False for unsupported conversions
        # This can be enhanced with additional conversion logic
        logger.warning(f"Generic conversion not implemented for {input_format} to {output_format}")
        return False
    
    def get_available_features(self) -> Dict[str, bool]:
        """Get information about available features."""
        return {
            'pdf_support': PDF_AVAILABLE,
            'docx_support': DOCX_AVAILABLE,
            'xlsx_support': XLSX_AVAILABLE,
            'text_extraction': True,
            'html_generation': True,
            'csv_support': True
        }