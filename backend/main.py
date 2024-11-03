from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, String, DateTime, ForeignKey, create_engine, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import asyncio
from uuid import uuid4
from projects import project_templates
from task_manager import TASK_TYPE_HANDLERS, get_task_type_info, TaskType, TaskManager
import json
from fastapi.responses import JSONResponse
import os
from pathlib import Path
import traceback

# 결과 저장 디렉토리 설정
RESULT_STORAGE_PATH = Path("../storage/results")
if not RESULT_STORAGE_PATH.exists():
    RESULT_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# 데이터베이스 세션 생성
def get_db():
    db = SessionLocal()  # 세션 로컬 생성
    try:
        yield db  # 세션 반환
    finally:
        db.close()  # 세션 종료

# 데이터베이스 URL 및 엔진 설정
DATABASE_URL = "sqlite:///../database/atl.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

# CORS 설정 수정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 앱의 도메인
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 HTTP 헤더 허용
    expose_headers=["*"],  # 모든 헤더 노출 허용
    max_age=3600,  # preflight 요청 캐시 시간 (1시간)
)

# Pydantic 모델 정의
class TaskCreate(BaseModel):
    name: str
    type: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    tasks: List[TaskCreate]

class ProjectResponse(BaseModel):
    name: str
    tasks: List[TaskCreate]

class TaskResult(BaseModel):
    task_name: str
    result: dict

class UpdateTaskRequest(BaseModel):
    project_id: str
    task_name: str
    ip: Optional[str] = None
    id: Optional[str] = None
    pw: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    previous_result: Optional[dict] = None

# SQLAlchemy 모델 정의
class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Waiting")
    created_at = Column(DateTime, default=datetime.now)
    tasks = relationship("Task", back_populates="project", cascade="all, delete")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Waiting")
    type = Column(String)
    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=datetime.now)
    result_path = Column(String, nullable=True)  # 파일 경로 저장
    result_summary = Column(JSON, nullable=True)  # 간단한 요약 정보만 저장
    project = relationship("Project", back_populates="tasks")

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

# 프로젝트 목록 조회 API
@app.get("/projects")
async def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    result = [
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
                for task in project.tasks
            ],
        }
        for project in projects
    ]
    return result

# 프로젝트 생성 API
@app.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(
        id=str(uuid4()), 
        name=project.name, 
        created_at=datetime.now()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    tasks = []
    for task_data in project.tasks:
        db_task = Task(
            id=str(uuid4()),
            name=task_data.name,
            type=task_data.type,
            project_id=db_project.id,
            created_at=datetime.now()
        )
        db.add(db_task)
        tasks.append(task_data)

    db.commit()

    # 생성된 프로젝트 확인
    created_tasks = db.query(Task).filter(Task.project_id == db_project.id).all()

    return ProjectResponse(name=db_project.name, tasks=tasks)

# 프로젝트 타입 목록 조회 API
@app.get("/project-types")
async def get_project_types():
    templates = [
        {
            "name": template["name"],
            "tasks": [
                {
                    "name": task["name"],
                    "type": task["type"].value  # Enum 값을 문자열로 변환
                } 
                for task in template["tasks"]
            ]
        } 
        for template in project_templates
    ]
    return templates

# 태스크 업데이트 API
@app.post("/update-task")
async def update_task(request: UpdateTaskRequest, db: Session = Depends(get_db)):
    try:
        # print("Request data:", request.dict())  # 요청 데이터 출력
        
        project = db.query(Project).filter(Project.id == request.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        current_task = db.query(Task).filter(
            Task.project_id == project.id,
            Task.name == request.task_name
        ).first()
        if not current_task:
            raise HTTPException(status_code=404, detail="Task not found")

        print("Current task:", current_task.name, current_task.type)  # 현재 태스크 정보 출력
        
        # 태스크 처리
        task_config = TASK_TYPE_HANDLERS.get(current_task.type)
        print("Task config:", task_config)  # 태스크 설정 정보 출력
        
        if task_config:
            try:
                params = request.dict(exclude_unset=True)
                # print("Previous result:", request.previous_result)  # 이전 결과 출력
                
                result = await task_config["handler"](
                    params,
                    request.previous_result
                )
                print("Handler result:", result)  # 핸들러 결과 출력
                
                # 결과 저장
                if result.get("data"):
                    # 결과 파일 저장
                    task_dir = RESULT_STORAGE_PATH / current_task.id
                    task_dir.mkdir(parents=True, exist_ok=True)
                    result_file = task_dir / "result.json"
                    
                    with open(result_file, 'w') as f:
                        json.dump(result.get("data", []), f)
                    
                    # 요약 정보 저장
                    current_task.result_summary = {
                        "success": result.get("success", False),
                        "total_count": len(result.get("data", [])),
                        "message": result.get("message", ""),
                        "result_file": str(result_file)
                    }
                    current_task.result_path = str(result_file)
                else:
                    current_task.result_summary = result
                
                # 태스크 상태 업데이트
                if result.get("success", False):
                    current_task.status = "Completed"
                else:
                    current_task.status = "Error"
                    
            except Exception as e:
                print(f"Error in task handler: {str(e)}")
                print(f"Error traceback: {traceback.format_exc()}")
                raise HTTPException(status_code=500, detail=f"Task handler error: {str(e)}")
                
        # 프로젝트 상태 업데이트
        updated_tasks = db.query(Task).filter(Task.project_id == project.id).all()
        if all(task.status == "Completed" for task in updated_tasks):
            project.status = "Completed"
        elif any(task.status == "Error" for task in updated_tasks):
            project.status = "Error"
        else:
            project.status = "In Progress"

        db.commit()

        return {
            "message": "Task status updated successfully",
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
        print(f"Error in update_task: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error traceback: {traceback.format_exc()}")  # 전체 에러 트레이스백 출력
        raise HTTPException(status_code=500, detail=str(e))

# 프로젝트 삭제 API
@app.delete("/delete-project/{project_id}")
async def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

# 태스크 결과 조회 API
@app.get("/task-result/{project_id}/{task_name}")
async def get_task_result(project_id: str, task_name: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(
        Task.project_id == project_id,
        Task.name == task_name
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = None
    if task.result_path:
        try:
            with open(task.result_path, 'r') as f:
                data = json.load(f)
                result = {
                    "success": task.result_summary.get("success", False),
                    "message": task.result_summary.get("message", ""),
                    "data": data
                }
        except Exception as e:
            print(f"Error loading result file: {str(e)}")
            result = task.result_summary
    else:
        result = task.result_summary
    
    response = JSONResponse({
        "task_name": task.name,
        "status": task.status,
        "result": result
    })
    
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# 태스크 타입 정보 조회 API
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

@app.get("/project-result/{project_id}")
async def get_project_result(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 프로젝트의 모든 태스크가 완료되었는지 확인
    if project.status != "Completed":
        return {"result": None}

    download_task = db.query(Task).filter(
        Task.project_id == project_id,
        Task.name == "Download Rules",
        Task.status == "Completed"
    ).first()
    
    if not download_task:
        return {"result": None}

    try:
        if download_task.result_path and os.path.exists(download_task.result_path):
            with open(download_task.result_path, 'r') as f:
                result_data = json.load(f)
                print("Loaded result data:", result_data)  # 디버깅용
                
            return {
                "result": {
                    "type": "policy",
                    "data": result_data,  # 이 부분이 배열인지 확인
                    "summary": download_task.result_summary
                }
            }
        else:
            # 파일이 없는 경우 요약 정보만 반환
            return {
                "result": {
                    "type": "policy",
                    "data": [],
                    "summary": download_task.result_summary
                }
            }
    except Exception as e:
        print(f"Error loading result data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load result data: {str(e)}")