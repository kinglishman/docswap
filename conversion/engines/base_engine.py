"""
Base engine class for all conversion engines.
Provides common interface and functionality for format conversions.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ConversionEngine(ABC):
    """Abstract base class for all conversion engines."""
    
    def __init__(self, name: str):
        self.name = name
        self.supported_inputs: List[str] = []
        self.supported_outputs: List[str] = []
        self.conversion_matrix: Dict[str, List[str]] = {}
        self._initialize_formats()
    
    @abstractmethod
    def _initialize_formats(self) -> None:
        """Initialize supported input and output formats."""
        pass
    
    @abstractmethod
    def convert(self, input_path: str, output_path: str, 
                input_format: str, output_format: str, 
                options: Optional[Dict[str, Any]] = None) -> bool:
        """
        Convert a file from input format to output format.
        
        Args:
            input_path: Path to input file
            output_path: Path to output file
            input_format: Input file format (e.g., 'pdf', 'docx')
            output_format: Output file format (e.g., 'pdf', 'docx')
            options: Optional conversion parameters
            
        Returns:
            bool: True if conversion successful, False otherwise
        """
        pass
    
    def can_convert(self, input_format: str, output_format: str) -> bool:
        """Check if this engine can convert between the specified formats."""
        input_format = input_format.lower()
        output_format = output_format.lower()
        return (input_format in self.conversion_matrix and 
                output_format in self.conversion_matrix[input_format])
    
    def get_supported_outputs(self, input_format: str) -> List[str]:
        """Get list of supported output formats for given input format."""
        input_format = input_format.lower()
        return self.conversion_matrix.get(input_format, [])
    
    def validate_file(self, file_path: str, expected_format: str) -> bool:
        """Validate that file exists and matches expected format."""
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return False
        
        # Basic validation - can be enhanced with magic number checking
        file_ext = Path(file_path).suffix.lower().lstrip('.')
        return file_ext == expected_format.lower()
    
    def get_engine_info(self) -> Dict[str, Any]:
        """Get information about this engine."""
        return {
            'name': self.name,
            'supported_inputs': self.supported_inputs,
            'supported_outputs': self.supported_outputs,
            'conversion_matrix': self.conversion_matrix
        }

class ConversionError(Exception):
    """Custom exception for conversion errors."""
    
    def __init__(self, message: str, engine: str = None, 
                 input_format: str = None, output_format: str = None):
        self.message = message
        self.engine = engine
        self.input_format = input_format
        self.output_format = output_format
        super().__init__(self.message)
    
    def __str__(self):
        parts = [self.message]
        if self.engine:
            parts.append(f"Engine: {self.engine}")
        if self.input_format and self.output_format:
            parts.append(f"Conversion: {self.input_format} → {self.output_format}")
        return " | ".join(parts)