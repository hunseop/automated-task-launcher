# backend/projects.py

from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
from task_manager import TaskType

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
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Import Configuration", "type": TaskType.CONFIG_IMPORT},
            {"name": "Process Policies", "type": TaskType.POLICY_PROCESSING},
            {"name": "Download Rules", "type": TaskType.RULE_DOWNLOAD}
        ]
    },
    {
        "name": "Shadow Policy Analysis",
        "tasks": [
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Import Configuration", "type": TaskType.CONFIG_IMPORT},
            {"name": "Process Shadow Policies", "type": TaskType.SHADOW_POLICY_PROCESSING},
            {"name": "Download Rules", "type": TaskType.RULE_DOWNLOAD}
        ]
    },
    {
        "name": "Block Impact Analysis",
        "tasks": [
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Import Configuration", "type": TaskType.CONFIG_IMPORT},
            {"name": "Input Target Rules", "type": TaskType.INPUT_TARGET_RULES},
            {"name": "Process Impact Analysis", "type": TaskType.IMPACT_ANALYSIS},
            {"name": "Download Rules", "type": TaskType.RULE_DOWNLOAD}
        ]
    },
    {
        "name": "Analysis of Policy Deletion Targets",
        "tasks": [
            {"name": "Select a Firewall Type", "type": TaskType.FIREWALL_TYPE_SELECTION},
            {"name": "Connect to Firewall", "type": TaskType.FIREWALL_CONNECTION},
            {"name": "Import Configuration", "type": TaskType.CONFIG_IMPORT},
            {"name": "Parse Request Number", "type": TaskType.PARSE_REQUEST_NUMBER},
            {"name": "Extract Request Number", "type": TaskType.EXTRACT_REQUEST_NUMBER},
            {"name": "Add MIS ID", "type": TaskType.ADD_MIS_ID},
            {"name": "Process Request Info", "type": TaskType.PROCESS_REQUEST_INFO},
            {"name": "Add Request Info", "type": TaskType.ADD_REQUEST_INFO},
            {"name": "Handle Exceptions", "type": TaskType.HANDLE_EXCEPTIONS},
            {"name": "Analyze Duplicate Policies", "type": TaskType.ANALYZE_DUPLICATE_POLICIES},
            {"name": "Parse Request Number", "type": TaskType.PARSE_REQUEST_NUMBER},
            {"name": "Classify Duplicate Tasks", "type": TaskType.CLASSIFY_DUPLICATE_TASKS},
            {"name": "Classify Deletion Tasks", "type": TaskType.CLASSIFY_DELETION_TASKS}
        ]
    }
]

# 실제 프로젝트 목록 (앱 실행 시 빈 상태로 시작)
projects = []
