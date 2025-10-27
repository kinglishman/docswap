"""
Asynchronous Conversion System with Progress Tracking
Provides background conversion processing with real-time progress updates
"""

import os
import time
import uuid
import json
import threading
import logging
from typing import Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import queue

logger = logging.getLogger(__name__)

class ConversionStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ConversionJob:
    job_id: str
    session_id: str
    file_id: str
    input_path: str
    output_path: str
    input_format: str
    output_format: str
    options: Dict[str, Any]
    status: ConversionStatus
    progress: int  # 0-100
    message: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    file_size: int = 0
    estimated_duration: Optional[int] = None  # seconds

    def to_dict(self):
        """Convert job to dictionary for JSON serialization"""
        data = asdict(self)
        data['status'] = self.status.value
        data['created_at'] = self.created_at.isoformat()
        data['started_at'] = self.started_at.isoformat() if self.started_at else None
        data['completed_at'] = self.completed_at.isoformat() if self.completed_at else None
        
        # Filter out non-serializable objects from options
        if 'options' in data and isinstance(data['options'], dict):
            serializable_options = {}
            for key, value in data['options'].items():
                try:
                    # Test if the value is JSON serializable
                    json.dumps(value)
                    serializable_options[key] = value
                except (TypeError, ValueError):
                    # Skip non-serializable values (like functions)
                    continue
            data['options'] = serializable_options
            
        return data

class AsyncConversionManager:
    """Manages asynchronous conversion jobs with progress tracking"""
    
    def __init__(self, max_workers: int = 3, job_timeout: int = 300):
        self.max_workers = max_workers
        self.job_timeout = job_timeout
        self.jobs: Dict[str, ConversionJob] = {}
        self.job_futures: Dict[str, Future] = {}
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="conversion")
        self.progress_callbacks: Dict[str, Callable] = {}
        self.lock = threading.RLock()
        
        # Job cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_expired_jobs, daemon=True)
        self.cleanup_thread.start()
        
        logger.info(f"AsyncConversionManager initialized with {max_workers} workers")

    def submit_conversion(self, session_id: str, file_id: str, input_path: str, 
                         output_path: str, input_format: str, output_format: str,
                         conversion_func: Callable, options: Dict[str, Any] = None) -> str:
        """Submit a conversion job for asynchronous processing"""
        
        if options is None:
            options = {}
            
        job_id = str(uuid.uuid4())
        
        # Get file size for progress estimation
        file_size = os.path.getsize(input_path) if os.path.exists(input_path) else 0
        
        # Estimate duration based on file size and format
        estimated_duration = self._estimate_duration(file_size, input_format, output_format)
        
        job = ConversionJob(
            job_id=job_id,
            session_id=session_id,
            file_id=file_id,
            input_path=input_path,
            output_path=output_path,
            input_format=input_format,
            output_format=output_format,
            options=options,
            status=ConversionStatus.PENDING,
            progress=0,
            message="Conversion queued",
            created_at=datetime.now(),
            file_size=file_size,
            estimated_duration=estimated_duration
        )
        
        with self.lock:
            self.jobs[job_id] = job
            
            # Submit job to thread pool
            future = self.executor.submit(self._process_conversion, job, conversion_func)
            self.job_futures[job_id] = future
            
        logger.info(f"Submitted conversion job {job_id}: {input_format} -> {output_format} ({file_size/1024/1024:.1f}MB)")
        return job_id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a conversion job"""
        with self.lock:
            job = self.jobs.get(job_id)
            if job:
                return job.to_dict()
            return None

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a conversion job"""
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return False
                
            if job.status in [ConversionStatus.COMPLETED, ConversionStatus.FAILED, ConversionStatus.CANCELLED]:
                return False
                
            # Cancel the future if it's still running
            future = self.job_futures.get(job_id)
            if future:
                future.cancel()
                
            job.status = ConversionStatus.CANCELLED
            job.message = "Conversion cancelled by user"
            job.completed_at = datetime.now()
            
            logger.info(f"Cancelled conversion job {job_id}")
            return True

    def get_session_jobs(self, session_id: str) -> list:
        """Get all jobs for a specific session"""
        with self.lock:
            return [job.to_dict() for job in self.jobs.values() if job.session_id == session_id]
    
    def get_queue_position(self, job_id: str) -> int:
        """Get the position of a job in the queue (0 if not pending or not found)"""
        with self.lock:
            job = self.jobs.get(job_id)
            if not job or job.status != ConversionStatus.PENDING:
                return 0
                
            # Get all pending jobs sorted by creation time
            pending_jobs = [
                j for j in self.jobs.values() 
                if j.status == ConversionStatus.PENDING
            ]
            pending_jobs.sort(key=lambda x: x.created_at)
            
            # Find position of this job (1-indexed)
            for i, pending_job in enumerate(pending_jobs):
                if pending_job.job_id == job_id:
                    return i + 1
                    
            return 0

    def _process_conversion(self, job: ConversionJob, conversion_func: Callable):
        """Process a conversion job with progress tracking"""
        job_id = job.job_id
        
        try:
            with self.lock:
                job.status = ConversionStatus.PROCESSING
                job.started_at = datetime.now()
                job.progress = 5
                job.message = "Starting conversion..."
                
            logger.info(f"Starting conversion job {job_id}")
            
            # Create progress callback
            def progress_callback(progress: int, message: str = None):
                with self.lock:
                    if job.status == ConversionStatus.CANCELLED:
                        raise Exception("Conversion cancelled")
                    job.progress = min(max(progress, 0), 95)  # Keep between 0-95, reserve 95-100 for finalization
                    if message:
                        job.message = message
                        
            # Add progress tracking to options
            job.options['progress_callback'] = progress_callback
            job.options['is_large_file'] = job.file_size > 5 * 1024 * 1024  # 5MB threshold
            job.options['file_size'] = job.file_size
            
            # Simulate initial progress
            progress_callback(10, "Preparing conversion...")
            time.sleep(0.1)
            
            progress_callback(20, "Processing file...")
            
            # Call the actual conversion function
            success = conversion_func(job.input_path, job.output_path, job.options)
            
            with self.lock:
                if job.status == ConversionStatus.CANCELLED:
                    return
                    
                if success and os.path.exists(job.output_path):
                    job.status = ConversionStatus.COMPLETED
                    job.progress = 100
                    job.message = "Conversion completed successfully"
                    job.completed_at = datetime.now()
                    
                    output_size = os.path.getsize(job.output_path)
                    duration = (job.completed_at - job.started_at).total_seconds()
                    
                    logger.info(f"Completed conversion job {job_id} in {duration:.2f}s (output: {output_size/1024/1024:.1f}MB)")
                else:
                    job.status = ConversionStatus.FAILED
                    job.progress = 0
                    job.message = "Conversion failed"
                    job.error = "Conversion function returned False or output file not created"
                    job.completed_at = datetime.now()
                    
                    logger.error(f"Failed conversion job {job_id}: {job.error}")
                    
        except Exception as e:
            with self.lock:
                if job.status != ConversionStatus.CANCELLED:
                    job.status = ConversionStatus.FAILED
                    job.progress = 0
                    job.message = f"Conversion failed: {str(e)}"
                    job.error = str(e)
                    job.completed_at = datetime.now()
                    
                    logger.error(f"Exception in conversion job {job_id}: {str(e)}")
                    
                    # Clean up partial output file
                    if os.path.exists(job.output_path):
                        try:
                            os.remove(job.output_path)
                        except:
                            pass

    def _estimate_duration(self, file_size: int, input_format: str, output_format: str) -> int:
        """Estimate conversion duration based on file size and formats"""
        # Base time in seconds per MB
        base_time_per_mb = {
            ('pdf', 'docx'): 3,
            ('pdf', 'txt'): 1,
            ('pdf', 'png'): 2,
            ('docx', 'pdf'): 2,
            ('image', 'pdf'): 1,
        }
        
        # Get conversion key
        if input_format in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            key = ('image', output_format)
        elif output_format in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            key = (input_format, 'image')
        else:
            key = (input_format, output_format)
            
        time_per_mb = base_time_per_mb.get(key, 2)  # Default 2 seconds per MB
        file_size_mb = max(file_size / (1024 * 1024), 0.1)  # Minimum 0.1 MB
        
        estimated = int(time_per_mb * file_size_mb)
        return max(estimated, 5)  # Minimum 5 seconds

    def _cleanup_expired_jobs(self):
        """Clean up old completed/failed jobs"""
        while True:
            try:
                time.sleep(300)  # Check every 5 minutes
                
                cutoff_time = datetime.now() - timedelta(hours=1)  # Keep jobs for 1 hour
                
                with self.lock:
                    expired_jobs = [
                        job_id for job_id, job in self.jobs.items()
                        if job.completed_at and job.completed_at < cutoff_time
                    ]
                    
                    for job_id in expired_jobs:
                        # Clean up future reference
                        self.job_futures.pop(job_id, None)
                        
                        # Remove job
                        job = self.jobs.pop(job_id, None)
                        if job:
                            logger.info(f"Cleaned up expired job {job_id}")
                            
            except Exception as e:
                logger.error(f"Error in job cleanup: {str(e)}")

    def get_queue_status(self) -> Dict[str, Any]:
        """Get overall queue status"""
        with self.lock:
            total_jobs = len(self.jobs)
            pending_jobs = sum(1 for job in self.jobs.values() if job.status == ConversionStatus.PENDING)
            processing_jobs = sum(1 for job in self.jobs.values() if job.status == ConversionStatus.PROCESSING)
            completed_jobs = sum(1 for job in self.jobs.values() if job.status == ConversionStatus.COMPLETED)
            failed_jobs = sum(1 for job in self.jobs.values() if job.status == ConversionStatus.FAILED)
            
            return {
                'total_jobs': total_jobs,
                'pending_jobs': pending_jobs,
                'processing_jobs': processing_jobs,
                'completed_jobs': completed_jobs,
                'failed_jobs': failed_jobs,
                'max_workers': self.max_workers,
                'active_workers': processing_jobs
            }

    def shutdown(self):
        """Shutdown the conversion manager"""
        logger.info("Shutting down AsyncConversionManager")
        self.executor.shutdown(wait=True)

# Global instance
async_conversion_manager = AsyncConversionManager()