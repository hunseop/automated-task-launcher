import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';

const PolicyTable = ({ policies }) => {
    const [globalFilter, setGlobalFilter] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    
    const columnHelper = createColumnHelper();
    
    const data = useMemo(() => {
        if (!policies) return [];
        if (Array.isArray(policies)) return policies;
        if (typeof policies === 'object' && Array.isArray(policies.policies)) {
            return policies.policies;
        }
        return [];
    }, [policies]);
    
    const columns = useMemo(
        () => {
            const baseColumns = [
                columnHelper.accessor('vsys', {
                    header: 'VSYS',
                    cell: info => info.getValue(),
                }),
                columnHelper.accessor('seq', {
                    header: 'Sequence',
                    cell: info => info.getValue(),
                }),
                columnHelper.accessor('rulename', {
                    header: 'Rule Name',
                    cell: info => info.getValue(),
                }),
                columnHelper.accessor('action', {
                    header: 'Action',
                    cell: info => info.getValue(),
                }),
                columnHelper.accessor('source', {
                    header: 'Source',
                    cell: info => Array.isArray(info.getValue()) ? info.getValue().join(', ') : info.getValue(),
                }),
                columnHelper.accessor('destination', {
                    header: 'Destination',
                    cell: info => Array.isArray(info.getValue()) ? info.getValue().join(', ') : info.getValue(),
                }),
                columnHelper.accessor('service', {
                    header: 'Service',
                    cell: info => Array.isArray(info.getValue()) ? info.getValue().join(', ') : info.getValue(),
                })
            ];

            // 첫 번째 정책에 shadow_type이 있으면 Shadow Policy Analysis 결과로 판단
            if (data[0]?.shadow_type) {
                baseColumns.push(
                    columnHelper.accessor('shadow_type', {
                        header: 'Shadow Type',
                        cell: info => (
                            <span className={info.getValue() === 'Redundant' ? 'text-yellow-500' : 'text-red-500'}>
                                {info.getValue()}
                            </span>
                        ),
                    }),
                    columnHelper.accessor('shadowed_by', {
                        header: 'Shadowed By',
                        cell: info => info.getValue(),
                    })
                );
            }
            // 첫 번째 정책에 impact_details가 있으면 Block Impact Analysis 결과로 판단
            else if (data[0]?.impact_details) {
                baseColumns.push(
                    columnHelper.accessor('impact_details', {
                        header: 'Impact Details',
                        cell: info => {
                            const details = info.getValue();
                            return (
                                <div className="text-sm">
                                    <div>Overlapping Sources: {details.overlapping_sources.join(', ')}</div>
                                    <div>Overlapping Destinations: {details.overlapping_destinations.join(', ')}</div>
                                    <div>Overlapping Services: {details.overlapping_services.join(', ')}</div>
                                </div>
                            );
                        },
                    })
                );
            }
            // Block Impact Analysis 결과 처리
            else if (data[0]?.analysis_type === "Target Rule") {
                baseColumns.push(
                    columnHelper.accessor('analysis_type', {
                        header: 'Analysis Type',
                        cell: info => (
                            <span className="text-blue-500 font-medium">
                                {info.getValue()}
                            </span>
                        ),
                    }),
                    columnHelper.accessor('impact_summary', {
                        header: 'Impact Summary',
                        cell: info => info.getValue(),
                    })
                );
            }
            // 기본 정책 목록인 경우
            else {
                baseColumns.push(
                    columnHelper.accessor('risk_level', {
                        header: 'Risk Level',
                        cell: info => (
                            <span className={info.getValue() === 'high' ? 'text-red-500' : 'text-green-500'}>
                                {info.getValue()}
                            </span>
                        ),
                    })
                );
            }

            return baseColumns;
        },
        [data]
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // 통계 정보 계산 수정
    const stats = useMemo(() => {
        const safeData = Array.isArray(data) ? data : [];
        
        // Block Impact Analysis 결과인 경우
        if (safeData[0]?.impact_details) {
            return {
                total: safeData.length,
                impactedRules: safeData.reduce((acc, curr) => acc + (curr.impacted_rules?.length || 0), 0),
                targetRules: safeData.length,
                averageImpact: Math.round(safeData.reduce((acc, curr) => acc + (curr.impacted_rules?.length || 0), 0) / safeData.length)
            };
        }
        // Shadow Policy Analysis 결과인 경우
        else if (safeData[0]?.shadow_type) {
            return {
                total: safeData.length,
                redundantRules: safeData.filter(p => p.shadow_type === 'Redundant').length,
                conflictingRules: safeData.filter(p => p.shadow_type === 'Conflicting').length,
                shadowedRules: safeData.length
            };
        }
        // 기본 정책 목록인 경우
        else {
            return {
                total: safeData.length,
                highRisk: safeData.filter(p => p?.risk_level === 'high').length,
                allowRules: safeData.filter(p => p?.action === 'allow').length,
                denyRules: safeData.filter(p => p?.action === 'deny').length
            };
        }
    }, [data]);

    const handleDownload = () => {
        const exportData = data.map(policy => ({
            'VSYS': policy.vsys || '',
            'Sequence': policy.seq || '',
            'Rule Name': policy.rulename || '',
            'Action': policy.action || '',
            'Source': Array.isArray(policy.source) ? policy.source.join(', ') : '',
            'Destination': Array.isArray(policy.destination) ? policy.destination.join(', ') : '',
            'Service': Array.isArray(policy.service) ? policy.service.join(', ') : '',
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
                <div className="space-y-4">
                    {/* 검색 필드 */}
                    <div className="mb-4">
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search all columns..."
                            className="px-4 py-2 border rounded w-full"
                        />
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-100">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th key={header.id} className="px-4 py-2">
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-4 py-2">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 */}
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1">
                            Page {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyTable; 