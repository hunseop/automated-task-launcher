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
from task_manager import TASK_TYPE_HANDLERS, get_task_type_info, TaskType

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

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 앱의 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 HTTP 헤더 허용
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
    result = Column(JSON, nullable=True)  # 태스크 결과 저장을 위한 JSON 필드
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
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    current_task = db.query(Task).filter(
        Task.project_id == project.id,
        Task.name == request.task_name
    ).first()
    if not current_task:
        raise HTTPException(status_code=404, detail="Task not found")

    all_tasks = db.query(Task).filter(
        Task.project_id == project.id
    ).order_by(Task.created_at).all()

    current_task_index = next(
        (i for i, task in enumerate(all_tasks) if task.id == current_task.id), 
        -1
    )

    if current_task_index > 0:
        previous_task = all_tasks[current_task_index - 1]
        if previous_task.status != "Completed":
            raise HTTPException(
                status_code=400, 
                detail="Previous task must be completed first"
            )

    try:
        # 이전 태스크의 결과 가져오기
        previous_task = None
        if current_task_index > 0:
            previous_task = all_tasks[current_task_index - 1]
            if previous_task.status != "Completed":
                raise HTTPException(
                    status_code=400,
                    detail="Previous task must be completed first"
                )

        # 태스크 처리
        task_config = TASK_TYPE_HANDLERS.get(current_task.type)
        if task_config:
            try:
                params = request.dict(exclude_unset=True)
                result = await task_config["handler"](
                    params,
                    previous_task.result if previous_task else None
                )
                current_task.result = result
                
                # 태스크 결과에 따라 상태 설정
                if result.get("success", False):
                    current_task.status = "Completed"
                else:
                    current_task.status = "Error"
                    
            except ValueError as e:
                current_task.status = "Error"
                raise HTTPException(status_code=400, detail=str(e))
        else:
            current_task.status = "Completed"

        db.commit()

        # 프로젝트 상태 업데이트를 위해 최신 태스크 상태 조회
        updated_tasks = db.query(Task).filter(Task.project_id == project.id).all()
        
        # 프로젝트 상태 업데이트
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
                "result": current_task.result
            },
            "project": {
                "id": project.id,
                "status": project.status
            }
        }

    except Exception as e:
        db.rollback()
        current_task.status = "Error"
        project.status = "Error"
        db.commit()
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
    
    return {
        "task_name": task.name,
        "status": task.status,
        "result": task.result
    }

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