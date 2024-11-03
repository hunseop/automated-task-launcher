from typing import Dict, Any, List
import asyncio
from datetime import datetime
from enum import Enum
from utils.firewall_utils import generate_random_policies, MOCK_FIREWALL_TYPES
import json
import os
from pathlib import Path

# 태스크 타입 정의
class TaskType(str, Enum):
    FIREWALL_CONNECTION = "firewall_connection"
    FIREWALL_TYPE_SELECTION = "firewall_type_selection"
    CONFIG_IMPORT = "config_import"
    POLICY_PROCESSING = "policy_processing"
    RULE_DOWNLOAD = "rule_download"

# 입력 포맷 정의
class InputFormat(str, Enum):
    IP_ID_PW = "IP-ID-PW"
    FIREWALL_TYPE = "FIREWALL_TYPE"
    NONE = "NONE"

# 입력 필드 정의
INPUT_FORMATS = {
    InputFormat.IP_ID_PW: {
        "fields": [
            {"name": "ip", "type": "text", "placeholder": "IP Address"},
            {"name": "id", "type": "text", "placeholder": "ID"},
            {"name": "pw", "type": "password", "placeholder": "Password"}
        ]
    },
    InputFormat.FIREWALL_TYPE: {
        "fields": [
            {
                "name": "type",
                "type": "select",
                "options": [
                    {"value": "paloalto", "label": "Paloalto"},
                    {"value": "mf2", "label": "MF2"},
                    {"value": "ngf", "label": "NGF"}
                ]
            }
        ]
    }
}

class TaskManager:
    @staticmethod
    async def handle_firewall_type_selection(params: Dict[str, Any], previous_result: Dict[str, Any] = None) -> Dict[str, Any]:
        fw_type = params.get('type')
        if not fw_type or fw_type not in MOCK_FIREWALL_TYPES:
            raise ValueError("Invalid firewall type selected")

        return {
            "success": True,
            "message": f"Selected firewall type: {fw_type}",
            "data": {
                "firewall_type": fw_type,
                "type_info": MOCK_FIREWALL_TYPES[fw_type]
            }
        }

    @staticmethod
    async def handle_firewall_connection(params: Dict[str, Any], previous_result: Dict[str, Any] = None) -> Dict[str, Any]:
        ip = params.get('ip')
        id = params.get('id')
        pw = params.get('pw')
        fw_type = previous_result.get('data', {}).get('firewall_type') if previous_result else None

        if not all([ip, id, pw, fw_type]):
            print(f"Missing parameters: ip={ip}, id={id}, pw={pw}, fw_type={fw_type}")
            raise ValueError("Missing required connection parameters")

        await asyncio.sleep(1)
        if ip == "1.1.1.1" and id == "admin" and pw == "1234":
            return {
                "success": True,
                "message": "Successfully connected to firewall",
                "data": {
                    "connection_info": {
                        "ip": ip,
                        "id": id,
                        "type": fw_type,
                        "connected_at": datetime.now().isoformat()
                    }
                }
            }
        return {
            "success": False,
            "message": "Failed to connect to firewall",
            "data": {}
        }

    @staticmethod
    async def handle_config_import(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Valid firewall connection required")

        connection_info = previous_result.get('data', {}).get('connection_info')
        if not connection_info:
            raise ValueError("Connection information not found")

        fw_type = connection_info.get('type')
        policies = generate_random_policies(30000)
        
        return {
            "success": True,
            "message": f"Successfully extracted {len(policies)} policies",
            "data": {
                "policies": policies,
                "total_policies": len(policies),
                "extracted_at": datetime.now().isoformat()
            }
        }

    @staticmethod
    async def handle_policy_processing(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Policy data required for processing")

        policies = previous_result.get('data', {}).get('policies', [])
        processed_policies = []

        for policy in policies:
            risk_level = "high" if "any" in (policy["source"] + policy["destination"]) else "low"
            processed_policies.append({
                **policy,
                "risk_level": risk_level,
                "processed_at": datetime.now().isoformat()
            })

        high_risk_count = len([p for p in processed_policies if p["risk_level"] == "high"])

        return {
            "success": True,
            "message": f"Processed {len(processed_policies)} policies, found {high_risk_count} high-risk policies",
            "data": {
                "policies": processed_policies,
                "total_policies": len(processed_policies),
                "high_risk_policies": high_risk_count,
                "processed": True
            }
        }

    @staticmethod
    async def handle_rule_download(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Processed policy data required for download")
        
        if not previous_result.get('data', {}).get('processed'):
            raise ValueError("Policies must be processed first")

        policies = previous_result.get('data', {}).get('policies', [])
        
        return {
            "success": True,
            "message": "Rules ready for download",
            "data": {
                "policies": policies,
                "total_policies": len(policies),
                "download_ready": True
            }
        }

    @staticmethod
    async def save_task_result(task_id: str, result_data: dict) -> dict:
        # 결과 저장 디렉토리 생성
        task_dir = RESULT_STORAGE_PATH / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        
        # 전체 데이터는 파일로 저장
        result_file = task_dir / "result.json"
        with open(result_file, 'w') as f:
            json.dump(result_data.get("data", []), f)
        
        # DB에는 요약 정보만 저장
        summary = {
            "success": result_data.get("success", False),
            "total_count": len(result_data.get("data", [])),
            "message": result_data.get("message", ""),
            "result_file": str(result_file)
        }
        
        return summary

    @staticmethod
    async def get_task_result(task_id: str, load_full_data: bool = False) -> dict:
        result_file = RESULT_STORAGE_PATH / task_id / "result.json"
        if not result_file.exists():
            return None
            
        if load_full_data:
            with open(result_file, 'r') as f:
                return json.load(f)
        
        # 기본적으로는 요약 정보만 반환
        return {
            "result_file": str(result_file)
        }

# 태스크 타입과 핸들러 매핑
TASK_TYPE_HANDLERS = {
    TaskType.FIREWALL_TYPE_SELECTION: {
        "handler": TaskManager.handle_firewall_type_selection,
        "input_format": InputFormat.FIREWALL_TYPE,
        "requires_previous": False
    },
    TaskType.FIREWALL_CONNECTION: {
        "handler": TaskManager.handle_firewall_connection,
        "input_format": InputFormat.IP_ID_PW,
        "requires_previous": True
    },
    TaskType.CONFIG_IMPORT: {
        "handler": TaskManager.handle_config_import,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.POLICY_PROCESSING: {
        "handler": TaskManager.handle_policy_processing,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.RULE_DOWNLOAD: {
        "handler": TaskManager.handle_rule_download,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    }
}

def get_task_type_info(task_type: TaskType) -> Dict:
    task_config = TASK_TYPE_HANDLERS.get(task_type)
    if not task_config:
        return None
    
    return {
        "input_format": INPUT_FORMATS.get(task_config["input_format"]),
        "requires_previous": task_config["requires_previous"]
    }