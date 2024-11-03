from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, String, DateTime, ForeignKey, create_engine, JSON, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from uuid import uuid4
import json
import os
from pathlib import Path
import traceback
import shutil
from contextlib import contextmanager

# 프로젝트 관련 임포트
from projects import project_templates
from task_manager import TASK_TYPE_HANDLERS, get_task_type_info, TaskType, TaskManager

# 결과 저장 디렉토리 설정
RESULT_STORAGE_PATH = Path("../storage/results")
RESULT_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# 데이터베이스 설정
DATABASE_URL = "sqlite:///../database/atl.db"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 메모리 캐시
task_results_cache = {}

# SQLAlchemy 모델 정의
class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Waiting")
    created_at = Column(DateTime, default=datetime.now)
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Waiting")
    type = Column(String)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.now)
    result_path = Column(String, nullable=True)
    result_summary = Column(JSON, nullable=True)
    intermediate_result = Column(JSON, nullable=True)
    is_restartable = Column(Boolean, default=True)
    project = relationship("Project", back_populates="tasks")

# Pydantic 모델
class TaskCreate(BaseModel):
    name: str
    type: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    tasks: List[TaskCreate]

class UpdateTaskRequest(BaseModel):
    project_id: str
    task_name: str
    ip: Optional[str] = None
    id: Optional[str] = None
    pw: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    previous_result: Optional[Dict[str, Any]] = None

# 데이터베이스 의존성
@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI 앱 설정
app = FastAPI(title="Automated Task Launcher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 에러 핸들러
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    return {
        "status_code": 500,
        "detail": f"Database error: {str(exc)}",
        "traceback": traceback.format_exc()
    }

# API 엔드포인트
@app.get("/projects")
async def get_projects():
    with get_db() as db:
        try:
            # 데이터베이스가 존재하는지 확인
            if not os.path.exists("../database/atl.db"):
                Base.metadata.create_all(bind=engine)
            
            projects = db.query(Project).order_by(Project.created_at.desc()).all()
            return [
                {
                    "id": project.id,
                    "name": project.name,
                    "status": project.status,
                    "created_at": project.created_at.isoformat(),
                    "tasks": [
                        {
                            "id": task.id,
                            "name": task.name,
                            "status": task.status,
                            "type": task.type,
                            "created_at": task.created_at.isoformat(),
                        }
                        for task in sorted(project.tasks, key=lambda x: x.created_at)
                    ],
                }
                for project in projects
            ]
        except Exception as e:
            print(f"Error in get_projects: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )

@app.post("/projects")
def create_project(project: ProjectCreate):
    with get_db() as db:
        try:
            db_project = Project(
                id=str(uuid4()),
                name=project.name,
                status="Waiting",
                created_at=datetime.now()
            )
            db.add(db_project)

            for task_data in project.tasks:
                db_task = Task(
                    id=str(uuid4()),
                    name=task_data.name,
                    type=task_data.type,
                    project_id=db_project.id,
                    created_at=datetime.now(),
                    is_restartable=True
                )
                db.add(db_task)

            db.commit()
            return {"message": "Project created successfully"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/project-types")
async def get_project_types():
    return project_templates

@app.get("/task-type-info/{task_type}")
async def get_task_type_information(task_type: str):
    try:
        task_enum = TaskType(task_type)
        info = get_task_type_info(task_enum)
        if not info:
            raise HTTPException(status_code=404, detail="Task type not found")
        return info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {task_type}")

@app.get("/task-result/{project_id}/{task_name}")
async def get_task_result(project_id: str, task_name: str):
    with get_db() as db:
        task = db.query(Task).filter(
            Task.project_id == project_id,
            Task.name == task_name
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # 메모리 캐시에서 결과 조회
        cache_key = f"{project_id}_{task_name}"
        result = task_results_cache.get(cache_key)
        
        if result is None:
            # 캐시에 없는 경우 DB에서 조회
            result = task.intermediate_result or task.result_summary
        
        return {
            "task_name": task.name,
            "status": task.status,
            "result": result
        }

@app.get("/project-result/{project_id}")
async def get_project_result(project_id: str):
    with get_db() as db:
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            # 마지막 태스크의 결과를 가져옴
            last_task = db.query(Task).filter(
                Task.project_id == project_id
            ).order_by(Task.created_at.desc()).first()

            if not last_task or not last_task.result_summary:
                return {"result": None}

            return {
                "result": {
                    "type": last_task.result_summary.get("type", "text"),
                    "data": last_task.result_summary.get("data", {}),
                    "message": last_task.result_summary.get("message", "")
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-task")
async def update_task(request: UpdateTaskRequest):
    with get_db() as db:
        try:
            project = db.query(Project).filter(Project.id == request.project_id).first()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            current_task = db.query(Task).filter(
                Task.project_id == project.id,
                Task.name == request.task_name
            ).first()
            
            if not current_task:
                raise HTTPException(status_code=404, detail="Task not found")

            task_config = TASK_TYPE_HANDLERS.get(current_task.type)
            if task_config:
                params = request.dict(exclude_unset=True)
                
                # 이전 태스크의 결과를 가져옴
                previous_result = None
                if task_config["requires_previous"]:
                    previous_tasks = db.query(Task).filter(
                        Task.project_id == project.id,
                        Task.created_at < current_task.created_at
                    ).order_by(Task.created_at.desc()).first()
                    
                    if previous_tasks:
                        previous_result = previous_tasks.result_summary
                
                # 태스크 실행
                result = await task_config["handler"](params, previous_result)
                
                # 최종 결과인 경우 파일로 저장
                is_final_task = current_task.name in ["Process Policies", "Process Shadow Policies", "Process Impact Analysis"]
                if is_final_task and result.get("success", False):
                    # TaskManager를 통해 결과 저장
                    summary = await TaskManager.save_task_result(current_task.id, result)
                    current_task.result_path = summary.get("result_file")
                    current_task.result_summary = {
                        "success": result.get("success", False),
                        "message": result.get("message", ""),
                        "data": result.get("data", {}),
                        "type": result.get("type", "text")
                    }
                else:
                    # 중간 태스크는 메모리와 DB에만 저장
                    current_task.result_summary = {
                        "success": result.get("success", False),
                        "message": result.get("message", ""),
                        "data": result.get("data", {}),
                        "type": result.get("type", "text")
                    }
                
                if result.get("success", False):
                    current_task.status = "Completed"
                else:
                    current_task.status = "Error"
                
                # 프로젝트 상태 업데이트
                all_tasks = db.query(Task).filter(Task.project_id == project.id).all()
                if all(task.status == "Completed" for task in all_tasks):
                    project.status = "Completed"
                elif any(task.status == "Error" for task in all_tasks):
                    project.status = "Error"
                else:
                    project.status = "In Progress"
                
                db.commit()
                
                return {
                    "message": "Task updated successfully",
                    "task": {
                        "name": current_task.name,
                        "status": current_task.status,
                        "result": current_task.result_summary
                    },
                    "project": {
                        "id": project.id,
                        "status": project.status
                    }
                }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/restart-task/{project_id}/{task_name}")
async def restart_task(project_id: str, task_name: str):
    with get_db() as db:
        try:
            task = db.query(Task).filter(
                Task.project_id == project_id,
                Task.name == task_name
            ).first()
            
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
                
            if not task.is_restartable:
                raise HTTPException(status_code=400, detail="Task cannot be restarted")
            
            # 상태 초기화
            task.status = "Waiting"
            task.result_summary = None
            task.intermediate_result = None
            
            # 캐시에서 결과 제거
            cache_key = f"{project_id}_{task_name}"
            task_results_cache.pop(cache_key, None)
            
            # 이후 태스크들도 초기화
            subsequent_tasks = db.query(Task).filter(
                Task.project_id == project_id,
                Task.created_at > task.created_at
            ).all()
            
            for subsequent_task in subsequent_tasks:
                subsequent_task.status = "Waiting"
                subsequent_task.result_summary = None
                subsequent_task.intermediate_result = None
                cache_key = f"{project_id}_{subsequent_task.name}"
                task_results_cache.pop(cache_key, None)
            
            db.commit()
            
            return {"message": "Task and subsequent tasks reset successfully"}
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete-project/{project_id}")
async def delete_project(project_id: str):
    with get_db() as db:
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # 프로젝트의 모든 태스크 결과 캐시 제거
            for task in project.tasks:
                cache_key = f"{project_id}_{task.name}"
                task_results_cache.pop(cache_key, None)
            
            db.delete(project)
            db.commit()
            
            return {"message": "Project deleted successfully"}
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

# 데이터베이스 초기화 함수
def init_db():
    try:
        # database 디렉토리 생성
        os.makedirs("../database", exist_ok=True)
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")

# 앱 시작 시 실행
@app.on_event("startup")
async def startup_event():
    init_db()

# 앱 종료 시 실행
@app.on_event("shutdown")
async def shutdown_event():
    # 캐시 정리 등 필요한 정리 작업 수행
    task_results_cache.clear()