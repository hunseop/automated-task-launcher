from typing import List, Dict, Any
import random

# 방화벽 타입 정의
FIREWALL_TYPES = {
    "paloalto": {
        "name": "Paloalto",
        "connection_type": "api"
    },
    "mf2": {
        "name": "MF2",
        "connection_type": "ssh"
    },
    "ngf": {
        "name": "NGF",
        "connection_type": "api"
    }
}

def generate_random_policies(count: int = 30000) -> List[Dict[str, Any]]:
    # 랜덤 데이터 생성을 위한 샘플 데이터
    vsys_list = ["vsys1", "vsys2", "vsys3"]
    actions = ["allow", "deny", "drop"]
    networks = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "any"]
    users = ["any", "authenticated-users", "domain-users"]
    services = ["any", "application-default", "tcp/80", "tcp/443", "tcp/22", "udp/53"]
    applications = ["any", "web-browsing", "ssl", "ssh", "dns"]
    
    policies = []
    for i in range(count):
        policy = {
            "vsys": random.choice(vsys_list),
            "seq": i + 1,  # 순차적인 시퀀스 번호
            "rulename": f"Rule_{i+1:05d}",  # 예: Rule_00001
            "enable": random.choice([True, False]),
            "action": random.choice(actions),
            "source": random.sample(networks, random.randint(1, 3)),  # 1~3개의 소스 네트워크
            "user": random.sample(users, random.randint(1, 2)),  # 1~2개의 사용자
            "destination": random.sample(networks, random.randint(1, 3)),  # 1~3개의 목적지 네트워크
            "service": random.sample(services, random.randint(1, 3)),  # 1~3개의 서비스
            "application": random.sample(applications, random.randint(1, 3)),  # 1~3개의 애플리케이션
            "description": f"Auto generated rule {i+1}"
        }
        policies.append(policy)
    
    return policies

# 방화벽 연결 시뮬레이션 함수
def simulate_firewall_connection(ip: str, id: str, pw: str, fw_type: str) -> bool:
    # 테스트용 자격증명
    return ip == "1.1.1.1" and id == "admin" and pw == "1234" and fw_type in FIREWALL_TYPES

# 정책 위험도 평가 함수
def assess_policy_risk(policy: Dict[str, Any]) -> str:
    # 'any'가 source나 destination에 있으면 high risk
    if "any" in policy["source"] or "any" in policy["destination"]:
        return "high"
    return "low" 