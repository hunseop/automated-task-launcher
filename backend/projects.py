# backend/projects.py

from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
from task_manager import TaskType, InputFormat

# Task 클래스 정의
class Task(BaseModel):
    name: str
    status: str
    type: str

# Project 클래스 정의
class Project(BaseModel):
    id: str
    name: str
    status: str
    date: str
    tasks: List[Task]

    @classmethod
    def create(cls, name: str, tasks: List[tuple]):
        return cls(
            id=str(uuid.uuid4()),
            name=name,
            status="Waiting",
            date=datetime.now().strftime("%Y-%m-%d"),
            tasks=[Task(name=task_name, status="Waiting", type=task_type) for task_name, task_type in tasks]
        )

# 프로젝트 템플릿 정의 - TaskType Enum 사용
project_templates = [
    {
        "name": "Export Security Rules",
        "tasks": [
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Importing configurations", "type": TaskType.CONFIG_IMPORT},
            {"name": "Processing policies", "type": TaskType.POLICY_PROCESSING},
            {"name": "Download Security Rules", "type": TaskType.RULE_DOWNLOAD}
        ]
    },
    {
        "name": "Analyze Shadow Rules",
        "tasks": [
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Enter Policy for Analysis", "type": TaskType.POLICY_ANALYSIS},
            {"name": "Processing Analysis", "type": TaskType.POLICY_PROCESSING},
            {"name": "Download Analysis Result", "type": TaskType.RULE_DOWNLOAD}
        ]
    }
]

# 실제 프로젝트 목록 (앱 실행 시 빈 상태로 시작)
projects = []
