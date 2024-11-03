from typing import Dict, Any, List
import asyncio
from datetime import datetime
from enum import Enum
from utils.firewall_utils import generate_random_policies, MOCK_FIREWALL_TYPES
import json
import os
from pathlib import Path

# 결과 저장 디렉토리 설정
RESULT_STORAGE_PATH = Path("../storage/results")
if not RESULT_STORAGE_PATH.exists():
    RESULT_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# 태스크 타입 정의
class TaskType(str, Enum):
    FIREWALL_CONNECTION = "firewall_connection"
    FIREWALL_TYPE_SELECTION = "firewall_type_selection"
    CONFIG_IMPORT = "config_import"
    POLICY_PROCESSING = "policy_processing"
    SHADOW_POLICY_PROCESSING = "shadow_policy_processing"
    RULE_DOWNLOAD = "rule_download"
    INPUT_TARGET_RULES = "input_target_rules"
    IMPACT_ANALYSIS = "impact_analysis"

# 입력 포맷 정의
class InputFormat(str, Enum):
    IP_ID_PW = "IP-ID-PW"
    FIREWALL_TYPE = "FIREWALL_TYPE"
    NONE = "NONE"
    TARGET_RULES = "TARGET-RULES"

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
    InputFormat.TARGET_RULES: {
        "fields": [
            {
                "name": "text",
                "type": "textarea",
                "placeholder": "Enter rule names separated by commas (e.g., Rule_00001, Rule_00002)"
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
            raise ValueError("Configuration data required")
        
        policies = previous_result.get('data', {}).get('policies', [])
        
        return {
            "success": True,
            "message": f"Processed {len(policies)} policies",
            "type": "policy",  # 결과 타입 명시
            "data": policies   # 처리된 정책 데이터
        }

    @staticmethod
    async def handle_shadow_policy_processing(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Policy data required for processing")

        policies = previous_result.get('data', {}).get('policies', [])
        
        # Shadow 정책 분석 로직 최적화
        shadow_policies = []
        policy_count = len(policies)
        
        # 정책 비교를 위한 집합 미리 생성
        policy_sets = [{
            'source': set(policy['source']),
            'destination': set(policy['destination']),
            'service': set(policy['service'])
        } for policy in policies]

        for i in range(policy_count):
            current_policy = policies[i]
            current_sets = policy_sets[i]

            # 현재 정책 이후의 정책들만 비교
            for j in range(i + 1, policy_count):
                next_policy = policies[j]
                next_sets = policy_sets[j]

                # 집합 연산으로 중복 확인
                if (current_sets['source'] & next_sets['source'] and 
                    current_sets['destination'] & next_sets['destination'] and 
                    current_sets['service'] & next_sets['service']):
                    
                    # 정책 액션 비교
                    if current_policy['action'] == next_policy['action']:
                        shadow_type = "Redundant"
                    else:
                        shadow_type = "Conflicting"
                    
                    shadow_policies.append({
                        **current_policy,
                        "shadowed_by": next_policy['rulename'],
                        "shadowed_rule_number": next_policy['seq'],
                        "shadow_type": shadow_type,
                        "shadow_details": {
                            "overlapping_sources": list(current_sets['source'] & next_sets['source']),
                            "overlapping_destinations": list(current_sets['destination'] & next_sets['destination']),
                            "overlapping_services": list(current_sets['service'] & next_sets['service'])
                        }
                    })
                    break  # 첫 번째 shadowing 정을 찾으면 중단

        return {
            "success": True,
            "message": f"Found {len(shadow_policies)} shadow policies",
            "data": {
                "policies": shadow_policies,
                "total_policies": len(shadow_policies),
                "processed": True,
                "analysis_summary": {
                    "total_analyzed": policy_count,
                    "shadow_count": len(shadow_policies),
                    "redundant_count": sum(1 for p in shadow_policies if p['shadow_type'] == 'Redundant'),
                    "conflicting_count": sum(1 for p in shadow_policies if p['shadow_type'] == 'Conflicting')
                }
            }
        }

    @staticmethod
    async def handle_rule_download(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Previous task result required")
        
        # previous_result의 구조 확인
        if isinstance(previous_result.get('data'), list):
            # 데이터가 직접 리스트로 온 경우
            policies = previous_result.get('data', [])
        else:
            # 데이터가 딕셔너리 안에 있는 경우
            policies = previous_result.get('data', {}).get('policies', [])
        
        if not policies:
            raise ValueError("No policy data available")

        return {
            "success": True,
            "message": f"Rules ready for download ({len(policies)} policies)",
            "type": "policy",
            "data": {
                "policies": policies,
                "total_count": len(policies),
                "download_timestamp": datetime.now().isoformat()
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

    @staticmethod
    async def handle_input_target_rules(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Configuration data required")

        text = params.get('text')
        if not text:
            raise ValueError("Please enter rule names")

        text = text.strip()
        if not text:
            raise ValueError("Please enter rule names")

        # 콤마로 구분된 정책명 파싱
        rule_names = [name.strip() for name in text.split(',') if name.strip()]
        if not rule_names:
            raise ValueError("Please enter valid rule names separated by commas")

        # 원본 정책 데이터 확인
        original_policies = previous_result.get('data', {}).get('policies', [])
        if not original_policies:
            raise ValueError("No policy data available for analysis")

        # 입력된 정책명이 실제 존재하는지 확인
        existing_rule_names = {policy['rulename'] for policy in original_policies}
        valid_rules = [name for name in rule_names if name in existing_rule_names]
        invalid_rules = [name for name in rule_names if name not in existing_rule_names]

        if not valid_rules:
            if invalid_rules:
                raise ValueError(f"None of the entered rule names exist. Invalid rules: {', '.join(invalid_rules)}")
            else:
                raise ValueError("No valid rule names provided")

        if invalid_rules:
            # 일부 규칙만 유효한 경우 경고 메시지 포함
            message = f"Found {len(valid_rules)} valid rules. Ignored {len(invalid_rules)} invalid rules: {', '.join(invalid_rules)}"
        else:
            message = f"Successfully validated {len(valid_rules)} rules"

        return {
            "success": True,
            "message": message,
            "data": {
                "rule_names": valid_rules,
                "original_policies": original_policies,
                "validation_summary": {
                    "total_input": len(rule_names),
                    "valid_count": len(valid_rules),
                    "invalid_count": len(invalid_rules),
                    "invalid_rules": invalid_rules
                }
            }
        }

    @staticmethod
    async def handle_impact_analysis(params: Dict[str, Any], previous_result: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_result or not previous_result.get('success'):
            raise ValueError("Target rules required for analysis")

        rule_names = previous_result.get('data', {}).get('rule_names', [])
        all_policies = previous_result.get('data', {}).get('original_policies', [])

        # 분석 대상 정책 찾기
        target_policies = [
            policy for policy in all_policies 
            if policy['rulename'] in rule_names
        ]

        if not target_policies:
            raise ValueError("No matching policies found")

        # 결과를 단순화하여 PolicyTable에서 표시할 수 있는 형태로 변환
        result_policies = []
        for policy in target_policies:
            result_policies.append({
                **policy,  # 기존 정책 정보 유지
                "analysis_type": "Target Rule",  # 분석 대상임을 표시
                "impact_summary": "Sample Impact Analysis Result"  # 실제 분석 결과가 들어갈 자리
            })

        return {
            "success": True,
            "message": f"Analyzed impact for {len(target_policies)} rules",
            "type": "policy",  # PolicyTable에서 처리할 수 있도록 type을 policy로 설정
            "data": {
                "policies": result_policies,
                "total_count": len(result_policies)
            }
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
    TaskType.SHADOW_POLICY_PROCESSING: {
        "handler": TaskManager.handle_shadow_policy_processing,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.RULE_DOWNLOAD: {
        "handler": TaskManager.handle_rule_download,
        "input_format": InputFormat.NONE,
        "requires_previous": True
    },
    TaskType.INPUT_TARGET_RULES: {
        "handler": TaskManager.handle_input_target_rules,
        "input_format": InputFormat.TARGET_RULES,
        "requires_previous": True
    },
    TaskType.IMPACT_ANALYSIS: {
        "handler": TaskManager.handle_impact_analysis,
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