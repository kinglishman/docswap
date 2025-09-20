"""
Enhanced conversion system for comprehensive file format conversions.
Provides a unified interface for converting between various document, image, and data formats.
"""

from .conversion_manager import ConversionManager
from .engines.base_engine import ConversionEngine, ConversionError

__all__ = ['ConversionManager', 'ConversionEngine', 'ConversionError']

# Version info
__version__ = '2.0.0'
__author__ = 'DocSwap Team'
__description__ = 'Enhanced file format conversion system'