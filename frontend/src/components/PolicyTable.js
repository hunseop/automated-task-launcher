import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const PolicyTable = ({ policies }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredPolicies, setFilteredPolicies] = useState([]);
    const [filters, setFilters] = useState({
        vsys: '',
        action: '',
        riskLevel: ''
    });
    const policiesPerPage = 10;

    useEffect(() => {
        console.log("PolicyTable received policies:", policies); // 상세 로깅
        console.log("Type of policies:", typeof policies);
        console.log("Is Array?", Array.isArray(policies));
        
        if (policies) {
            if (Array.isArray(policies)) {
                setFilteredPolicies(policies);
            } else if (typeof policies === 'object') {
                // policies가 객체인 경우 처리
                const policiesArray = policies.policies || [];
                console.log("Converted policies array:", policiesArray);
                setFilteredPolicies(policiesArray);
            } else {
                console.error("Unexpected policies format:", policies);
                setFilteredPolicies([]);
            }
        } else {
            setFilteredPolicies([]);
        }
    }, [policies]);

    // 페이지네이션 처리
    const indexOfLastPolicy = currentPage * policiesPerPage;
    const indexOfFirstPolicy = indexOfLastPolicy - policiesPerPage;
    const currentPolicies = Array.isArray(filteredPolicies) 
        ? filteredPolicies.slice(indexOfFirstPolicy, indexOfLastPolicy)
        : [];
    const totalPages = Math.ceil((filteredPolicies?.length || 0) / policiesPerPage);

    // 통계 정보 계산
    const stats = {
        total: filteredPolicies?.length || 0,
        highRisk: Array.isArray(filteredPolicies) 
            ? filteredPolicies.filter(p => p.risk_level === 'high').length 
            : 0,
        allowRules: Array.isArray(filteredPolicies) 
            ? filteredPolicies.filter(p => p.action === 'allow').length 
            : 0,
        denyRules: Array.isArray(filteredPolicies) 
            ? filteredPolicies.filter(p => p.action === 'deny').length 
            : 0
    };

    // 안전한 join 함수 추가
    const safeJoin = (arr) => {
        return Array.isArray(arr) ? arr.join(', ') : '';
    };

    // 엑셀 다운로드 핸들러 수정
    const handleDownload = () => {
        const exportData = filteredPolicies.map(policy => ({
            'VSYS': policy.vsys || '',
            'Sequence': policy.seq || '',
            'Rule Name': policy.rulename || '',
            'Enabled': policy.enable === true ? 'Yes' : 'No',
            'Action': policy.action || '',
            'Source': Array.isArray(policy.source) ? policy.source.join(', ') : '',
            'User': Array.isArray(policy.user) ? policy.user.join(', ') : '',
            'Destination': Array.isArray(policy.destination) ? policy.destination.join(', ') : '',
            'Service': Array.isArray(policy.service) ? policy.service.join(', ') : '',
            'Application': Array.isArray(policy.application) ? policy.application.join(', ') : '',
            'Description': policy.description || '',
            'Risk Level': policy.risk_level || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Policies");
        XLSX.writeFile(wb, "firewall_policies.xlsx");
    };

    return (
        <div className="mt-4">
            <div className="flex justify-between mb-4">
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Hide Policies' : 'View Policies'}
                </button>
                <button
                    className="bg-green-500 text-white px-4 py-2 rounded"
                    onClick={handleDownload}
                >
                    Download Excel
                </button>
            </div>

            {/* 통계 정보 */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-100 p-4 rounded">
                    <div className="text-lg font-bold">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Rules</div>
                </div>
                <div className="bg-red-100 p-4 rounded">
                    <div className="text-lg font-bold">{stats.highRisk}</div>
                    <div className="text-sm text-gray-600">High Risk Rules</div>
                </div>
                <div className="bg-green-100 p-4 rounded">
                    <div className="text-lg font-bold">{stats.allowRules}</div>
                    <div className="text-sm text-gray-600">Allow Rules</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded">
                    <div className="text-lg font-bold">{stats.denyRules}</div>
                    <div className="text-sm text-gray-600">Deny Rules</div>
                </div>
            </div>

            {isExpanded && (
                <>
                    {/* 필터 */}
                    <div className="flex gap-4 mb-4">
                        <select
                            className="border p-2 rounded"
                            value={filters.vsys}
                            onChange={e => setFilters({...filters, vsys: e.target.value})}
                        >
                            <option value="">All VSYS</option>
                            <option value="vsys1">VSYS1</option>
                            <option value="vsys2">VSYS2</option>
                            <option value="vsys3">VSYS3</option>
                        </select>
                        <select
                            className="border p-2 rounded"
                            value={filters.action}
                            onChange={e => setFilters({...filters, action: e.target.value})}
                        >
                            <option value="">All Actions</option>
                            <option value="allow">Allow</option>
                            <option value="deny">Deny</option>
                            <option value="drop">Drop</option>
                        </select>
                        <select
                            className="border p-2 rounded"
                            value={filters.riskLevel}
                            onChange={e => setFilters({...filters, riskLevel: e.target.value})}
                        >
                            <option value="">All Risk Levels</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2">VSYS</th>
                                    <th className="px-4 py-2">Seq</th>
                                    <th className="px-4 py-2">Rule Name</th>
                                    <th className="px-4 py-2">Action</th>
                                    <th className="px-4 py-2">Source</th>
                                    <th className="px-4 py-2">Destination</th>
                                    <th className="px-4 py-2">Service</th>
                                    <th className="px-4 py-2">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPolicies.map((policy) => (
                                    <tr key={`${policy.vsys}-${policy.seq}`} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{policy.vsys || ''}</td>
                                        <td className="px-4 py-2">{policy.seq || ''}</td>
                                        <td className="px-4 py-2">{policy.rulename || ''}</td>
                                        <td className="px-4 py-2">{policy.action || ''}</td>
                                        <td className="px-4 py-2">{safeJoin(policy.source)}</td>
                                        <td className="px-4 py-2">{safeJoin(policy.destination)}</td>
                                        <td className="px-4 py-2">{safeJoin(policy.service)}</td>
                                        <td className={`px-4 py-2 ${
                                            policy.risk_level === 'high' ? 'text-red-500' : 'text-green-500'
                                        }`}>
                                            {policy.risk_level || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 */}
                    <div className="flex justify-center mt-4">
                        <button
                            className="px-3 py-1 bg-gray-200 rounded mr-2"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="px-3 py-1 bg-gray-200 rounded ml-2"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PolicyTable; 