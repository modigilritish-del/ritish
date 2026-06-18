"""models/ocr.py - COMPLETE Database Models"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class OCRDocument(Base):
    """Document storage"""
    __tablename__ = "ocr_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), unique=True, index=True)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, failed
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    results = relationship("OCRResult", back_populates="document", cascade="all, delete-orphan")
    cache = relationship("OCRCache", back_populates="document", cascade="all, delete-orphan")
    logs = relationship("OCRProcessingLog", back_populates="document", cascade="all, delete-orphan")

class OCRResult(Base):
    """OCR extraction results"""
    __tablename__ = "ocr_results"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("ocr_documents.id", ondelete="CASCADE"))
    
    engine_name = Column(String(50), nullable=False)  # tesseract, easyocr, paddleocr
    extracted_text = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.0)
    processing_time = Column(Float, default=0.0)
    
    word_confidences = Column(JSON, nullable=True)  # {"word": confidence}
    bounding_boxes = Column(JSON, nullable=True)  # [{"text": "word", "x": 0, "y": 0, ...}]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    document = relationship("OCRDocument", back_populates="results")

class OCRCache(Base):
    """Cache for OCR results"""
    __tablename__ = "ocr_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("ocr_documents.id", ondelete="CASCADE"))
    file_hash = Column(String(64), unique=True, index=True)
    
    cached_result = Column(JSON, nullable=False)
    hit_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    document = relationship("OCRDocument", back_populates="cache")

class OCRProcessingLog(Base):
    """Processing logs for debugging"""
    __tablename__ = "ocr_processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("ocr_documents.id", ondelete="CASCADE"))
    
    engine_name = Column(String(50))
    status = Column(String(50))  # started, completed, failed
    error_message = Column(Text, nullable=True)
    
    preprocessing_time = Column(Float, default=0.0)
    extraction_time = Column(Float, default=0.0)
    postprocessing_time = Column(Float, default=0.0)
    total_time = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    document = relationship("OCRDocument", back_populates="logs")