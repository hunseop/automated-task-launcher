from typing import Dict, Any
import asyncio
from datetime import datetime
from enum import Enum

# 태스크 타입 정의
class TaskType(str, Enum):
    FIREWALL_CONNECTION = "firewall_connection"
    FIREWALL_TYPE_SELECTION = "firewall_type_selection"
    CONFIG_IMPORT = "config_import"
    POLICY_PROCESSING = "policy_processing"
    RULE_DOWNLOAD = "rule_download"
    POLICY_ANALYSIS = "policy_analysis"

# 입력 포맷 정의
class InputFormat(str, Enum):
    IP_ID_PW = "IP-ID-PW"
    FIREWALL_TYPE = "FIREWALL_TYPE"
    POLICY_INPUT = "POLICY_INPUT"
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
    },
    InputFormat.POLICY_INPUT: {
        "fields": [
            {"name": "policy_number", "type": "text", "placeholder": "Policy Number"},
            {"name": "description", "type": "textarea", "placeholder": "Policy Description"}
        ]
    }
}

class TaskManager:
    @staticmethod
    async def handle_firewall_connection(params: Dict[str, Any], previous_result: Dict[str, Any] = None) -> Dict[str, Any]:
        ip = params.get('ip')
        id = params.get('id')
        pw = params.get('pw')
        
        await asyncio.sleep(1)
        success = ip == "1.1.1.1" and id == "admin" and pw == "1234"
        
        return {
            "success": success,
            "connection_info": {"ip": ip, "id": id} if success else None,
            "message": "Successfully connected" if success else "Connection failed"
        }

    @staticmethod
    async def handle_firewall_type_selection(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get("success"):
            raise ValueError("유효한 방화벽 연결이 필요합니다")
        
        firewall_type = params.get('type')
        if not firewall_type:
            raise ValueError("방화벽 타입을 선택해주세요")

        return {
            "success": True,
            "firewall_type": firewall_type,
            "connection_info": previous_result["connection_info"],
            "message": f"Selected firewall type: {firewall_type}"
        }

    @staticmethod
    async def import_configurations(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get("firewall_type"):
            raise ValueError("방화벽 타입 선택이 필요합니다")

        firewall_type = previous_result["firewall_type"]
        connection_info = previous_result["connection_info"]
        
        # 실제로는 여기서 방화벽 설정을 가져오는 로직 구현
        await asyncio.sleep(2)  # 설정 가져오기 시뮬레이션
        
        return {
            "success": True,
            "config_data": f"Imported configurations from {connection_info['ip']} ({firewall_type})",
            "timestamp": datetime.now().isoformat(),
            "message": "Configuration import completed"
        }

    @staticmethod
    async def process_policies(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get("config_data"):
            raise ValueError("방화벽 설정 데이터가 필요합니다")

        # 실제로는 여기서 정책 처리 로직 구현
        await asyncio.sleep(1.5)
        
        return {
            "success": True,
            "processed_policies": {
                "total": 100,
                "processed": 100,
                "timestamp": datetime.now().isoformat()
            },
            "message": "Policy processing completed"
        }

    @staticmethod
    async def download_rules(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get("processed_policies"):
            raise ValueError("처리된 정책 데이터가 필요합니다")

        # 실제로는 여기서 규칙 다운로드 로직 구현
        await asyncio.sleep(1)
        
        return {
            "success": True,
            "download_url": "http://example.com/rules.xlsx",
            "timestamp": datetime.now().isoformat(),
            "message": "Rules ready for download"
        }

    @staticmethod
    async def handle_policy_analysis(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get("firewall_type"):
            raise ValueError("방화벽 타입 선택이 필요합니다")

        policy_number = params.get('policy_number')
        description = params.get('description')

        if not policy_number:
            raise ValueError("정책 번호를 입력해주세요")

        # 실제로는 여기서 정책 분석 로직 구현
        await asyncio.sleep(2)

        return {
            "success": True,
            "analysis_result": {
                "policy_number": policy_number,
                "description": description,
                "analysis_data": "Policy analysis completed",
                "timestamp": datetime.now().isoformat()
            },
            "message": "Policy analysis completed"
        }

# 태스크 타입과 핸들러 매핑
TASK_TYPE_HANDLERS = {
    TaskType.FIREWALL_CONNECTION: {
        "handler": TaskManager.handle_firewall_connection,
        "input_format": InputFormat.IP_ID_PW,
        "requires_previous": False
    },
    TaskType.FIREWALL_TYPE_SELECTION: {
        "handler": TaskManager.handle_firewall_type_selection,
        "input_format": InputFormat.FIREWALL_TYPE,
        "requires_previous": True
    },
    TaskType.CONFIG_IMPORT: {
        "handler": TaskManager.import_configurations,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.POLICY_PROCESSING: {
        "handler": TaskManager.process_policies,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.RULE_DOWNLOAD: {
        "handler": TaskManager.download_rules,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.POLICY_ANALYSIS: {
        "handler": TaskManager.handle_policy_analysis,
        "input_format": InputFormat.POLICY_INPUT,
        "requires_previous": True
    }
}

# 태스크 타입 정보 조회 함수
def get_task_type_info(task_type: TaskType) -> Dict:
    task_config = TASK_TYPE_HANDLERS.get(task_type)
    if not task_config:
        return None
    
    input_format = task_config["input_format"]
    format_data = INPUT_FORMATS.get(input_format)
    
    return {
        "input_format": format_data,
        "requires_previous": task_config["requires_previous"]
    }