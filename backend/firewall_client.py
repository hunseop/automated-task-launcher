from typing import Dict, List, Optional
from datetime import datetime

class FirewallClient:
    def __init__(self, ip: str, id: str, pw: str):
        self.ip = ip
        self.id = id
        self.pw = pw
        self.api_key = None
        self.connected = False

    async def get_api_key(self) -> str:
        """방화벽 API 키 획득 (임시 구현)"""
        # 실제 구현에서는 방화벽 API를 호출하여 키를 획득
        self.api_key = "mock_api_key_" + datetime.now().strftime("%Y%m%d%H%M%S")
        self.connected = True
        return self.api_key

    async def get_policies(self) -> List[Dict]:
        """방화벽 정책 조회 (임시 구현)"""
        if not self.connected:
            raise Exception("Not connected to firewall")

        # 임시 정책 데이터 생성 (더 긴 데이터)
        mock_policies = [
            {
                "vsys": f"vsys{i%3 + 1}",
                "seq": f"{i+1}",
                "rulename": f"Rule_{i+1:05d}_{'ALLOW' if i % 2 == 0 else 'DENY'}_{'HIGH' if i % 3 == 0 else 'LOW'}_RISK",
                "action": "allow" if i % 2 == 0 else "deny",
                "source": [
                    f"10.{i%256}.{(i//256)%256}.0/24",
                    f"10.{i%256}.{(i//256)%256}.1/24",
                    f"10.{i%256}.{(i//256)%256}.2/24",
                    f"172.16.{i%256}.0/24"
                ],
                "destination": [
                    f"192.168.{i%256}.0/24",
                    f"192.168.{i%256}.1/24",
                    f"192.168.{i%256}.2/24",
                    f"203.0.{i%256}.0/24",
                    f"203.0.{i%256}.1/24"
                ],
                "service": [
                    "tcp/80",
                    "tcp/443",
                    "tcp/8080",
                    "tcp/8443",
                    f"tcp/{1000 + i%1000}",
                    "udp/53",
                    "udp/123",
                    f"udp/{2000 + i%1000}"
                ],
                "risk_level": "high" if i % 3 == 0 else ("medium" if i % 3 == 1 else "low"),
                "description": f"This is a very long description for rule number {i+1}. "
                             f"This rule is created for testing purposes and includes multiple lines of text. "
                             f"The rule is {'allowing' if i % 2 == 0 else 'denying'} traffic from multiple source networks "
                             f"to multiple destination networks using various services. "
                             f"Risk level is {'HIGH' if i % 3 == 0 else ('MEDIUM' if i % 3 == 1 else 'LOW')}.",
                "last_hit": f"2024-{(i%12)+1:02d}-{(i%28)+1:02d} {(i%24):02d}:{(i%60):02d}:{(i%60):02d}",
                "hit_count": i * 100,
                "created_by": f"admin_{i%5 + 1}",
                "created_date": f"2023-{(i%12)+1:02d}-{(i%28)+1:02d}",
                "modified_by": f"admin_{i%3 + 1}",
                "modified_date": f"2024-{(i%12)+1:02d}-{(i%28)+1:02d}",
                "tags": [
                    f"tag_{i%10 + 1}",
                    f"department_{i%5 + 1}",
                    f"project_{i%8 + 1}",
                    f"environment_{i%3 + 1}"
                ]
            }
            for i in range(300)  # 300개의 임시 정책 생성
        ]
        
        return mock_policies

    async def get_policy_by_name(self, rulename: str) -> Optional[Dict]:
        """특정 정책 조회 (임시 구현)"""
        policies = await self.get_policies()
        return next((p for p in policies if p["rulename"] == rulename), None)

    async def get_policy_by_id(self, rule_id: str) -> Optional[Dict]:
        """ID로 정책 조회 (임시 구현)"""
        policies = await self.get_policies()
        return next((p for p in policies if p["seq"] == rule_id), None)

    def is_connected(self) -> bool:
        """연결 상태 확인"""
        return self.connected

    async def disconnect(self) -> None:
        """연결 해제 (임시 구현)"""
        self.api_key = None
        self.connected = False 