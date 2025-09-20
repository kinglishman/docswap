"""
Central conversion manager that orchestrates all conversion engines.
Provides a unified interface for format conversion with intelligent routing.
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import mimetypes

from .engines.base_engine import ConversionEngine, ConversionError
from .engines.image_engine import ImageEngine
from .engines.document_engine import DocumentEngine

logger = logging.getLogger(__name__)

class ConversionManager:
    """Central manager for all file format conversions."""
    
    def __init__(self):
        self.engines = {}
        self._initialize_engines()
        self._build_global_conversion_matrix()
    
    def _initialize_engines(self) -> None:
        """Initialize all available conversion engines."""
        try:
            # Initialize image engine
            image_engine = ImageEngine()
            self.engines['image'] = image_engine
            logger.info(f"Initialized {image_engine.name}")
            
            # Initialize document engine
            document_engine = DocumentEngine()
            self.engines['document'] = document_engine
            logger.info(f"Initialized {document_engine.name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize engines: {str(e)}")
    
    def _build_global_conversion_matrix(self) -> None:
        """Build a global conversion matrix from all engines."""
        self.global_matrix = {}
        self.format_to_engine = {}
        
        for engine_name, engine in self.engines.items():
            for input_format, output_formats in engine.conversion_matrix.items():
                if input_format not in self.global_matrix:
                    self.global_matrix[input_format] = []
                
                for output_format in output_formats:
                    if output_format not in self.global_matrix[input_format]:
                        self.global_matrix[input_format].append(output_format)
                    
                    # Map format pairs to engines
                    conversion_key = f"{input_format}_{output_format}"
                    if conversion_key not in self.format_to_engine:
                        self.format_to_engine[conversion_key] = []
                    self.format_to_engine[conversion_key].append(engine_name)
    
    def get_supported_formats(self) -> Dict[str, List[str]]:
        """Get all supported input and output formats."""
        all_inputs = set()
        all_outputs = set()
        
        for engine in self.engines.values():
            all_inputs.update(engine.supported_inputs)
            all_outputs.update(engine.supported_outputs)
        
        return {
            'inputs': sorted(list(all_inputs)),
            'outputs': sorted(list(all_outputs))
        }
    
    def get_conversion_matrix(self) -> Dict[str, List[str]]:
        """Get the complete conversion matrix."""
        return self.global_matrix.copy()
    
    def can_convert(self, input_format: str, output_format: str) -> bool:
        """Check if conversion between formats is supported."""
        input_format = input_format.lower()
        output_format = output_format.lower()
        
        return (input_format in self.global_matrix and 
                output_format in self.global_matrix[input_format])
    
    def get_conversion_options(self, input_format: str, output_format: str) -> Dict[str, Any]:
        """Get available conversion options for a format pair."""
        input_format = input_format.lower()
        output_format = output_format.lower()
        
        conversion_key = f"{input_format}_{output_format}"
        options = {
            'supported': self.can_convert(input_format, output_format),
            'engines': self.format_to_engine.get(conversion_key, []),
            'options': {}
        }
        
        # Add format-specific options
        if input_format in ['pdf']:
            options['options']['page_range'] = {
                'type': 'tuple',
                'description': 'Page range (start, end) for conversion',
                'optional': True
            }
        
        if input_format in ['docx', 'pdf']:
            options['options']['preserve_formatting'] = {
                'type': 'boolean',
                'description': 'Preserve original formatting when possible',
                'default': True
            }
        
        if output_format in ['jpg', 'png']:
            options['options']['quality'] = {
                'type': 'integer',
                'description': 'Output quality (1-100)',
                'default': 95,
                'range': [1, 100]
            }
            options['options']['dpi'] = {
                'type': 'integer',
                'description': 'Output DPI',
                'default': 300,
                'range': [72, 600]
            }
        
        return options
    
    def convert(self, input_path: str, output_path: str, 
                input_format: str, output_format: str,
                options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Convert file from input format to output format.
        
        Returns:
            Dict with conversion results including success status, engine used, etc.
        """
        try:
            input_format = input_format.lower()
            output_format = output_format.lower()
            options = options or {}
            
            # Validate conversion support
            if not self.can_convert(input_format, output_format):
                return {
                    'success': False,
                    'error': f"Conversion from {input_format} to {output_format} not supported",
                    'supported_outputs': self.global_matrix.get(input_format, [])
                }
            
            # Validate input file
            if not os.path.exists(input_path):
                return {
                    'success': False,
                    'error': f"Input file not found: {input_path}"
                }
            
            # Get appropriate engine
            conversion_key = f"{input_format}_{output_format}"
            available_engines = self.format_to_engine.get(conversion_key, [])
            
            if not available_engines:
                return {
                    'success': False,
                    'error': f"No engine available for {input_format} to {output_format}"
                }
            
            # Try engines in order of preference
            last_error = None
            for engine_name in available_engines:
                engine = self.engines[engine_name]
                
                try:
                    logger.info(f"Attempting conversion with {engine.name}")
                    success = engine.convert(input_path, output_path, input_format, output_format, options)
                    
                    if success and os.path.exists(output_path):
                        return {
                            'success': True,
                            'engine': engine.name,
                            'input_format': input_format,
                            'output_format': output_format,
                            'output_path': output_path,
                            'file_size': os.path.getsize(output_path)
                        }
                    
                except ConversionError as e:
                    last_error = str(e)
                    logger.warning(f"Engine {engine.name} failed: {last_error}")
                    continue
                except Exception as e:
                    last_error = str(e)
                    logger.error(f"Unexpected error in {engine.name}: {last_error}")
                    continue
            
            return {
                'success': False,
                'error': f"All engines failed. Last error: {last_error}",
                'attempted_engines': available_engines
            }
            
        except Exception as e:
            logger.error(f"Conversion manager error: {str(e)}")
            return {
                'success': False,
                'error': f"Conversion manager error: {str(e)}"
            }
    
    def convert_file(self, input_path: str, output_path: str, 
                     input_format: str, output_format: str,
                     options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Alias for convert method to maintain compatibility.
        """
        return self.convert(input_path, output_path, input_format, output_format, options)
    
    def get_engine_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status and capabilities of all engines."""
        status = {}
        
        for engine_name, engine in self.engines.items():
            try:
                features = engine.get_available_features() if hasattr(engine, 'get_available_features') else {}
                status[engine_name] = {
                    'name': engine.name,
                    'supported_inputs': engine.supported_inputs,
                    'supported_outputs': engine.supported_outputs,
                    'conversion_matrix': engine.conversion_matrix,
                    'conversion_count': len(engine.conversion_matrix),
                    'features': features,
                    'status': 'active'
                }
            except Exception as e:
                status[engine_name] = {
                    'name': engine_name,
                    'status': 'error',
                    'error': str(e)
                }
        
        return status
    
    def detect_format_from_file(self, file_path: str) -> Optional[str]:
        """Detect file format from file extension and MIME type."""
        try:
            # Get extension
            extension = Path(file_path).suffix.lower().lstrip('.')
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            
            # Format mapping
            format_map = {
                'pdf': 'pdf',
                'docx': 'docx',
                'doc': 'doc',
                'xlsx': 'xlsx',
                'xls': 'xls',
                'pptx': 'pptx',
                'ppt': 'ppt',
                'txt': 'txt',
                'html': 'html',
                'htm': 'html',
                'csv': 'csv',
                'jpg': 'jpg',
                'jpeg': 'jpg',
                'png': 'png',
                'gif': 'gif',
                'bmp': 'bmp',
                'tiff': 'tiff',
                'tif': 'tiff',
                'webp': 'webp'
            }
            
            return format_map.get(extension)
            
        except Exception as e:
            logger.error(f"Format detection failed: {str(e)}")
            return None
    
    def get_format_info(self, format_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific format."""
        format_name = format_name.lower()
        
        format_info = {
            'pdf': {
                'name': 'Portable Document Format',
                'category': 'document',
                'description': 'Universal document format',
                'mime_types': ['application/pdf'],
                'extensions': ['.pdf']
            },
            'docx': {
                'name': 'Microsoft Word Document',
                'category': 'document',
                'description': 'Modern Word document format',
                'mime_types': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                'extensions': ['.docx']
            },
            'xlsx': {
                'name': 'Microsoft Excel Spreadsheet',
                'category': 'spreadsheet',
                'description': 'Modern Excel spreadsheet format',
                'mime_types': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                'extensions': ['.xlsx']
            },
            'jpg': {
                'name': 'JPEG Image',
                'category': 'image',
                'description': 'Compressed image format',
                'mime_types': ['image/jpeg'],
                'extensions': ['.jpg', '.jpeg']
            },
            'png': {
                'name': 'PNG Image',
                'category': 'image',
                'description': 'Lossless image format',
                'mime_types': ['image/png'],
                'extensions': ['.png']
            },
            'txt': {
                'name': 'Plain Text',
                'category': 'text',
                'description': 'Simple text format',
                'mime_types': ['text/plain'],
                'extensions': ['.txt']
            },
            'html': {
                'name': 'HTML Document',
                'category': 'web',
                'description': 'Web page format',
                'mime_types': ['text/html'],
                'extensions': ['.html', '.htm']
            },
            'csv': {
                'name': 'Comma Separated Values',
                'category': 'data',
                'description': 'Tabular data format',
                'mime_types': ['text/csv'],
                'extensions': ['.csv']
            }
        }
        
        info = format_info.get(format_name, {
            'name': format_name.upper(),
            'category': 'unknown',
            'description': f'{format_name.upper()} format',
            'mime_types': [],
            'extensions': [f'.{format_name}']
        })
        
        # Add conversion capabilities
        info['can_convert_to'] = self.global_matrix.get(format_name, [])
        info['can_convert_from'] = [
            fmt for fmt, outputs in self.global_matrix.items() 
            if format_name in outputs
        ]
        
        return info