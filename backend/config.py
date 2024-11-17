from pathlib import Path
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import traceback

# SQLAlchemy Base 정의
Base = declarative_base()

class AppConfig:
    # 기본 애플리케이션 디렉토리 설정
    APP_NAME = '.fpat'
    APP_DIR = Path.home() / APP_NAME
    
    # 하위 디렉토리 구조
    STORAGE_DIR = APP_DIR / 'storage'
    RESULT_DIR = STORAGE_DIR / 'results'
    DB_DIR = APP_DIR / 'database'
    LOG_DIR = APP_DIR / 'logs'
    
    @classmethod
    def init_directories(cls):
        """애플리케이션에 필요한 모든 디렉토리를 생성"""
        directories = [
            cls.APP_DIR,
            cls.STORAGE_DIR,
            cls.RESULT_DIR,
            cls.DB_DIR,
            cls.LOG_DIR
        ]
        
        for directory in directories:
            if not directory.exists():
                directory.mkdir(parents=True, exist_ok=True)
                logging.info(f"Created directory: {directory}") 

    @classmethod
    def init_logging(cls):
        """로깅 설정 초기화"""
        cls.LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_file_path = cls.LOG_DIR / 'app.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file_path),
                logging.StreamHandler()
            ]
        )
        logging.info("Logging initialized successfully")

    @classmethod
    def init_db(cls):
        """데이터베이스 초기화"""
        try:
            cls.DB_DIR.mkdir(parents=True, exist_ok=True)
            DATABASE_URL = f"sqlite:///{cls.DB_DIR}/firewall_policies.db"
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            Base.metadata.create_all(bind=engine)
            logging.info("Database initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing database: {str(e)}")
            logging.error(f"Traceback: {traceback.format_exc()}")