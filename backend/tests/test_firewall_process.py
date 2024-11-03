import pytest
from datetime import datetime
from typing import Dict, Any, List
import random

from utils.firewall_utils import generate_random_policies, MOCK_FIREWALL_TYPES

class TestFirewallProcess:
    @pytest.fixture
    def mock_firewall_connection(self):
        def _connect(fw_type: str, ip: str, id: str, pw: str) -> Dict[str, Any]:
            if fw_type not in MOCK_FIREWALL_TYPES:
                return {"success": False, "message": "Invalid firewall type"}
            if ip == "1.1.1.1" and id == "admin" and pw == "1234":
                return {
                    "success": True,
                    "connection_info": {
                        "ip": ip,
                        "id": id,
                        "type": fw_type,
                        "connected_at": datetime.now().isoformat()
                    }
                }
            return {"success": False, "message": "Invalid credentials"}
        return _connect

    @pytest.fixture
    def mock_data_extraction(self):
        def _extract(connection_info: Dict[str, Any]) -> Dict[str, Any]:
            fw_type = connection_info.get("type")
            if not fw_type or fw_type not in MOCK_FIREWALL_TYPES:
                return {"success": False, "message": "Invalid firewall type"}
            
            # generate_random_policies 사용
            policies = generate_random_policies(100)  # 테스트용으로 100개만 생성
            return {
                "success": True,
                "data": policies,
                "extracted_at": datetime.now().isoformat()
            }
        return _extract

    @pytest.fixture
    def mock_policy_processing(self):
        def _process(policy_data: list) -> Dict[str, Any]:
            processed_data = []
            for policy in policy_data:
                processed_data.append({
                    **policy,
                    "risk_level": "high" if "any" in [policy["source"], policy["destination"]] else "low",
                    "processed_at": datetime.now().isoformat()
                })
            return {
                "success": True,
                "data": processed_data,
                "total_policies": len(processed_data),
                "high_risk_policies": len([p for p in processed_data if p["risk_level"] == "high"])
            }
        return _process

    def test_full_process(self, mock_firewall_connection, mock_data_extraction, mock_policy_processing):
        # 1. 방화벽 타입 선택
        fw_type = "paloalto"
        assert fw_type in MOCK_FIREWALL_TYPES

        # 2. 방화벽 연결
        connection_result = mock_firewall_connection(fw_type, "1.1.1.1", "admin", "1234")
        assert connection_result["success"] is True
        assert "connection_info" in connection_result

        # 3. 데이터 추출
        extraction_result = mock_data_extraction(connection_result["connection_info"])
        assert extraction_result["success"] is True
        assert "data" in extraction_result
        assert isinstance(extraction_result["data"], list)
        assert len(extraction_result["data"]) > 0
        
        # 추출된 데이터의 구조 확인
        sample_policy = extraction_result["data"][0]
        required_fields = ["vsys", "seq", "rulename", "enable", "action", 
                         "source", "destination", "service", "application"]
        for field in required_fields:
            assert field in sample_policy, f"Missing field: {field}"

        # 4. 정책 처리
        processing_result = mock_policy_processing(extraction_result["data"])
        assert processing_result["success"] is True
        assert "data" in processing_result
        assert isinstance(processing_result["data"], list)
        assert len(processing_result["data"]) == len(extraction_result["data"])
        
        # 처리된 정책의 구조 확인
        processed_policy = processing_result["data"][0]
        assert "risk_level" in processed_policy
        assert processed_policy["risk_level"] in ["high", "low"]
        assert "processed_at" in processed_policy

        # 통계 정보 확인
        assert "total_policies" in processing_result
        assert "high_risk_policies" in processing_result
        assert processing_result["total_policies"] == len(processing_result["data"])
        assert processing_result["high_risk_policies"] <= processing_result["total_policies"]

    def test_invalid_connection(self, mock_firewall_connection):
        # 잘못된 자격 증명으로 연결 시도
        result = mock_firewall_connection("paloalto", "1.1.1.1", "wrong", "wrong")
        assert result["success"] is False

    def test_invalid_firewall_type(self, mock_firewall_connection):
        # 잘못된 방화벽 타입으로 연결 시도
        result = mock_firewall_connection("invalid_type", "1.1.1.1", "admin", "1234")
        assert result["success"] is False

    def test_policy_data_generation(self):
        # 정책 데이터 생성 테스트
        policies = generate_random_policies(100)  # 테스트용으로 100개만 생성
        assert len(policies) == 100
        
        # 첫 번째 정책의 구조 확인
        policy = policies[0]
        assert all(key in policy for key in [
            "vsys", "seq", "rulename", "enable", "action",
            "source", "user", "destination", "service",
            "application", "description"
        ])
        
        # 데이터 타입 확인
        assert isinstance(policy["vsys"], str)
        assert isinstance(policy["seq"], int)
        assert isinstance(policy["rulename"], str)
        assert isinstance(policy["enable"], bool)
        assert isinstance(policy["action"], str)
        assert isinstance(policy["source"], list)
        assert isinstance(policy["user"], list)
        assert isinstance(policy["destination"], list)
        assert isinstance(policy["service"], list)
        assert isinstance(policy["application"], list)
        assert isinstance(policy["description"], str)

    def test_policy_processing_with_random_data(self, mock_policy_processing):
        # 랜덤 정책 데이터로 처리 테스트
        policies = generate_random_policies(1000)  # 테스트용으로 1000개 생성
        result = mock_policy_processing(policies)
        
        assert result["success"] is True
        assert result["total_policies"] == 1000
        assert "high_risk_policies" in result
        assert isinstance(result["data"], list)
        assert len(result["data"]) == 1000

    def test_data_extraction_failure(self, mock_data_extraction):
        # 잘못된 연결 정보로 데이터 추출 시도
        result = mock_data_extraction({"type": "invalid_type"})
        assert result["success"] is False

    def test_policy_processing_failure(self, mock_policy_processing):
        # 빈 정책 데이터로 처리 시도
        result = mock_policy_processing([])
        assert result["success"] is True
        assert result["total_policies"] == 0
        assert result["high_risk_policies"] == 0