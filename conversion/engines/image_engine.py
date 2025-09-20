"""
Enhanced image conversion engine supporting comprehensive image format conversions.
Handles PDF to images, images to PDF, and image format conversions.
"""

import os
import logging
from typing import Dict, List, Optional, Any
from PIL import Image, ImageSequence
import io

# Increase PIL's image size limit to handle large PDFs
Image.MAX_IMAGE_PIXELS = None

try:
    import pdf2image
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    import img2pdf
    IMG2PDF_AVAILABLE = True
except ImportError:
    IMG2PDF_AVAILABLE = False

from .base_engine import ConversionEngine, ConversionError

logger = logging.getLogger(__name__)

class ImageEngine(ConversionEngine):
    """Enhanced image conversion engine with comprehensive format support."""
    
    def __init__(self):
        super().__init__("ImageEngine")
    
    def _initialize_formats(self) -> None:
        """Initialize supported image formats and conversion matrix."""
        # Core image formats
        image_formats = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'gif', 'webp']
        
        # Add PDF support if libraries are available
        if PDF2IMAGE_AVAILABLE:
            self.supported_inputs.append('pdf')
        if IMG2PDF_AVAILABLE:
            self.supported_outputs.append('pdf')
        
        self.supported_inputs.extend(image_formats)
        self.supported_outputs.extend(image_formats)
        
        # Build conversion matrix
        for input_fmt in self.supported_inputs:
            self.conversion_matrix[input_fmt] = []
            
            if input_fmt == 'pdf':
                # PDF can convert to all image formats
                self.conversion_matrix[input_fmt] = image_formats.copy()
            else:
                # Images can convert to other images and PDF
                self.conversion_matrix[input_fmt] = image_formats.copy()
                if IMG2PDF_AVAILABLE:
                    self.conversion_matrix[input_fmt].append('pdf')
    
    def convert(self, input_path: str, output_path: str, 
                input_format: str, output_format: str, 
                options: Optional[Dict[str, Any]] = None) -> bool:
        """
        Convert between image formats and PDF.
        
        Options:
            - quality: Image quality (1-100) for JPEG
            - dpi: DPI for PDF to image conversion (default: 200)
            - page_range: Tuple (start, end) for PDF pages
            - optimize: Boolean for image optimization
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
            
            if input_format == 'pdf':
                return self._pdf_to_image(input_path, output_path, output_format, options)
            elif output_format == 'pdf':
                return self._image_to_pdf(input_path, output_path, options)
            else:
                return self._image_to_image(input_path, output_path, output_format, options)
                
        except Exception as e:
            logger.error(f"Image conversion failed: {str(e)}")
            raise ConversionError(f"Image conversion failed: {str(e)}", engine=self.name)
    
    def _pdf_to_image(self, pdf_path: str, output_path: str, 
                     output_format: str, options: Dict[str, Any]) -> bool:
        """Convert PDF to image(s)."""
        if not PDF2IMAGE_AVAILABLE:
            raise ConversionError("pdf2image library not available", engine=self.name)
        
        try:
            dpi = options.get('dpi', 200)
            page_range = options.get('page_range')
            
            # Convert PDF pages to images
            if page_range:
                first_page, last_page = page_range
                images = pdf2image.convert_from_path(
                    pdf_path, dpi=dpi, first_page=first_page, last_page=last_page
                )
            else:
                images = pdf2image.convert_from_path(pdf_path, dpi=dpi)
            
            if len(images) == 1:
                # Single page - save directly
                self._save_image(images[0], output_path, output_format, options)
            else:
                # Multiple pages - save with page numbers
                base_path = os.path.splitext(output_path)[0]
                for i, image in enumerate(images, 1):
                    page_output = f"{base_path}_page_{i:03d}.{output_format}"
                    self._save_image(image, page_output, output_format, options)
            
            return True
            
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {str(e)}")
            return False
    
    def _image_to_pdf(self, image_path: str, output_path: str, 
                     options: Dict[str, Any]) -> bool:
        """Convert image(s) to PDF."""
        if not IMG2PDF_AVAILABLE:
            raise ConversionError("img2pdf library not available", engine=self.name)
        
        try:
            # Handle single image or list of images
            if isinstance(image_path, str):
                image_paths = [image_path]
            else:
                image_paths = image_path
            
            # Convert images to PDF with proper rotation handling
            with open(output_path, "wb") as f:
                f.write(img2pdf.convert(image_paths, rotation=img2pdf.Rotation.ifvalid))
            
            return True
            
        except Exception as e:
            logger.error(f"Image to PDF conversion failed: {str(e)}")
            return False
    
    def _image_to_image(self, input_path: str, output_path: str, 
                       output_format: str, options: Dict[str, Any]) -> bool:
        """Convert between image formats."""
        try:
            with Image.open(input_path) as img:
                # Handle animated GIFs
                if hasattr(img, 'is_animated') and img.is_animated and output_format != 'gif':
                    # Convert first frame for non-GIF outputs
                    img = img.convert('RGB')
                
                # Handle palette mode (P) for formats that don't support it
                if img.mode == 'P':
                    # Convert palette mode to RGB or RGBA depending on transparency
                    if 'transparency' in img.info:
                        img = img.convert('RGBA')
                    else:
                        img = img.convert('RGB')
                
                # Handle transparency for formats that don't support it
                if output_format.lower() in ['jpg', 'jpeg'] and img.mode in ['RGBA', 'LA']:
                    # Create white background for JPEG
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                
                self._save_image(img, output_path, output_format, options)
            
            return True
            
        except Exception as e:
            logger.error(f"Image to image conversion failed: {str(e)}")
            return False
    
    def _save_image(self, image: Image.Image, output_path: str, 
                   output_format: str, options: Dict[str, Any]) -> None:
        """Save image with format-specific options."""
        save_kwargs = {}
        
        if output_format.lower() in ['jpg', 'jpeg']:
            save_kwargs['quality'] = options.get('quality', 85)
            save_kwargs['optimize'] = options.get('optimize', True)
        elif output_format.lower() == 'png':
            save_kwargs['optimize'] = options.get('optimize', True)
        elif output_format.lower() == 'webp':
            save_kwargs['quality'] = options.get('quality', 80)
            save_kwargs['method'] = 6  # Best compression
        
        # Map format names to PIL-compatible format names
        format_map = {
            'jpg': 'JPEG',
            'jpeg': 'JPEG',
            'png': 'PNG',
            'gif': 'GIF',
            'bmp': 'BMP',
            'tiff': 'TIFF',
            'webp': 'WEBP'
        }
        
        pil_format = format_map.get(output_format.lower(), output_format.upper())
        image.save(output_path, format=pil_format, **save_kwargs)
    
    def get_available_features(self) -> Dict[str, bool]:
        """Get information about available features."""
        return {
            'pdf_to_image': PDF2IMAGE_AVAILABLE,
            'image_to_pdf': IMG2PDF_AVAILABLE,
            'animated_gif': True,
            'transparency': True,
            'quality_control': True
        }