#!/usr/bin/env python3
"""
DocSwap File Cleanup Service
Automatically removes old uploaded and converted files to prevent disk space issues.
"""

import os
import time
import logging
import schedule
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/docswap/cleanup.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class FileCleanupService:
    def __init__(self):
        self.app_dir = Path('/var/www/docswap')
        self.uploads_dir = self.app_dir / 'uploads'
        self.output_dir = self.app_dir / 'output'
        self.logs_dir = self.app_dir / 'logs'
        
        # Cleanup settings (in hours)
        self.upload_retention = int(os.getenv('UPLOAD_RETENTION_HOURS', '24'))  # 24 hours
        self.output_retention = int(os.getenv('OUTPUT_RETENTION_HOURS', '72'))  # 72 hours
        self.log_retention = int(os.getenv('LOG_RETENTION_HOURS', '168'))       # 7 days
        
        # Size limits (in MB)
        self.max_upload_size = int(os.getenv('MAX_UPLOAD_DIR_SIZE_MB', '1000'))  # 1GB
        self.max_output_size = int(os.getenv('MAX_OUTPUT_DIR_SIZE_MB', '2000'))  # 2GB
        
    def get_directory_size(self, directory):
        """Calculate total size of directory in MB."""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(directory):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    if os.path.exists(filepath):
                        total_size += os.path.getsize(filepath)
        except Exception as e:
            logger.error(f"Error calculating directory size for {directory}: {e}")
        
        return total_size / (1024 * 1024)  # Convert to MB
    
    def cleanup_old_files(self, directory, retention_hours):
        """Remove files older than retention_hours."""
        if not directory.exists():
            logger.warning(f"Directory does not exist: {directory}")
            return 0
        
        cutoff_time = datetime.now() - timedelta(hours=retention_hours)
        removed_count = 0
        removed_size = 0
        
        try:
            for file_path in directory.rglob('*'):
                if file_path.is_file():
                    file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                    
                    if file_mtime < cutoff_time:
                        try:
                            file_size = file_path.stat().st_size
                            file_path.unlink()
                            removed_count += 1
                            removed_size += file_size
                            logger.debug(f"Removed old file: {file_path}")
                        except Exception as e:
                            logger.error(f"Error removing file {file_path}: {e}")
            
            # Remove empty directories
            for dir_path in directory.rglob('*'):
                if dir_path.is_dir() and not any(dir_path.iterdir()):
                    try:
                        dir_path.rmdir()
                        logger.debug(f"Removed empty directory: {dir_path}")
                    except Exception as e:
                        logger.debug(f"Could not remove directory {dir_path}: {e}")
        
        except Exception as e:
            logger.error(f"Error during cleanup of {directory}: {e}")
        
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} files ({removed_size / (1024*1024):.2f} MB) from {directory}")
        
        return removed_count
    
    def cleanup_by_size(self, directory, max_size_mb):
        """Remove oldest files if directory exceeds size limit."""
        if not directory.exists():
            return 0
        
        current_size = self.get_directory_size(directory)
        
        if current_size <= max_size_mb:
            return 0
        
        logger.info(f"Directory {directory} size ({current_size:.2f} MB) exceeds limit ({max_size_mb} MB)")
        
        # Get all files with their modification times
        files_with_times = []
        try:
            for file_path in directory.rglob('*'):
                if file_path.is_file():
                    mtime = file_path.stat().st_mtime
                    size = file_path.stat().st_size
                    files_with_times.append((mtime, file_path, size))
        except Exception as e:
            logger.error(f"Error listing files in {directory}: {e}")
            return 0
        
        # Sort by modification time (oldest first)
        files_with_times.sort(key=lambda x: x[0])
        
        removed_count = 0
        removed_size = 0
        
        for mtime, file_path, file_size in files_with_times:
            if current_size <= max_size_mb:
                break
            
            try:
                file_path.unlink()
                current_size -= file_size / (1024 * 1024)
                removed_count += 1
                removed_size += file_size
                logger.debug(f"Removed file for size limit: {file_path}")
            except Exception as e:
                logger.error(f"Error removing file {file_path}: {e}")
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} files ({removed_size / (1024*1024):.2f} MB) to meet size limit")
        
        return removed_count
    
    def cleanup_logs(self):
        """Clean up old log files."""
        if not self.logs_dir.exists():
            return 0
        
        removed_count = 0
        cutoff_time = datetime.now() - timedelta(hours=self.log_retention)
        
        try:
            for log_file in self.logs_dir.glob('*.log*'):
                if log_file.is_file():
                    file_mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                    
                    if file_mtime < cutoff_time:
                        try:
                            log_file.unlink()
                            removed_count += 1
                            logger.debug(f"Removed old log file: {log_file}")
                        except Exception as e:
                            logger.error(f"Error removing log file {log_file}: {e}")
        except Exception as e:
            logger.error(f"Error during log cleanup: {e}")
        
        return removed_count
    
    def run_cleanup(self):
        """Run the complete cleanup process."""
        logger.info("Starting file cleanup process...")
        
        start_time = time.time()
        total_removed = 0
        
        # Clean up uploads
        logger.info(f"Cleaning uploads older than {self.upload_retention} hours...")
        total_removed += self.cleanup_old_files(self.uploads_dir, self.upload_retention)
        total_removed += self.cleanup_by_size(self.uploads_dir, self.max_upload_size)
        
        # Clean up output files
        logger.info(f"Cleaning output files older than {self.output_retention} hours...")
        total_removed += self.cleanup_old_files(self.output_dir, self.output_retention)
        total_removed += self.cleanup_by_size(self.output_dir, self.max_output_size)
        
        # Clean up logs
        logger.info(f"Cleaning logs older than {self.log_retention} hours...")
        total_removed += self.cleanup_logs()
        
        # Report disk usage
        try:
            uploads_size = self.get_directory_size(self.uploads_dir)
            output_size = self.get_directory_size(self.output_dir)
            
            logger.info(f"Current disk usage - Uploads: {uploads_size:.2f} MB, Output: {output_size:.2f} MB")
        except Exception as e:
            logger.error(f"Error calculating disk usage: {e}")
        
        elapsed_time = time.time() - start_time
        logger.info(f"Cleanup completed in {elapsed_time:.2f} seconds. Total files removed: {total_removed}")
    
    def start_scheduler(self):
        """Start the cleanup scheduler."""
        logger.info("Starting DocSwap file cleanup service...")
        
        # Schedule cleanup every hour
        schedule.every().hour.do(self.run_cleanup)
        
        # Run initial cleanup
        self.run_cleanup()
        
        # Keep the service running
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                logger.info("Cleanup service stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in cleanup scheduler: {e}")
                time.sleep(60)

def main():
    """Main entry point."""
    cleanup_service = FileCleanupService()
    cleanup_service.start_scheduler()

if __name__ == "__main__":
    main()