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

const PolicyTable = ({ policies, isExpanded, projectInfo }) => {
    const [globalFilter, setGlobalFilter] = useState('');
    const columnHelper = createColumnHelper();
    
    const data = useMemo(() => {
        if (!policies) return [];
        if (Array.isArray(policies)) return policies;
        if (typeof policies === 'object' && Array.isArray(policies.policies)) {
            return policies.policies;
        }
        return [];
    }, [policies]);
    
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];

        const keys = Object.keys(data[0]);
        return keys.map(key => {
            return columnHelper.accessor(key, {
                header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                cell: info => {
                    const value = info.getValue();
                    if (Array.isArray(value)) {
                        return (
                            <>
                                {value.map((item, index) => (
                                    <div key={index}>{item}</div>
                                ))}
                            </>
                        );
                    }
                    if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value.overlapping_sources)) {
                            return value.overlapping_sources.map((source, index) => (
                                <div key={index}>{source}</div>
                            ));
                        }
                        return JSON.stringify(value);
                    }
                    return value;
                },
            });
        });
    }, [data]);

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
                title: "Impact Analysis Summary",
                items: [
                    { label: "Total Rules", value: safeData.length },
                    { label: "Impacted Rules", value: safeData.reduce((acc, curr) => acc + (curr.impacted_rules?.length || 0), 0) },
                    { label: "Average Impact", value: Math.round(safeData.reduce((acc, curr) => acc + (curr.impacted_rules?.length || 0), 0) / safeData.length) }
                ]
            };
        }
        // Shadow Policy Analysis 결과인 경우
        else if (safeData[0]?.shadow_type) {
            return {
                title: "Shadow Policy Summary",
                items: [
                    { label: "Total Rules", value: safeData.length },
                    { label: "Redundant Rules", value: safeData.filter(p => p.shadow_type === 'Redundant').length },
                    { label: "Conflicting Rules", value: safeData.filter(p => p.shadow_type === 'Conflicting').length }
                ]
            };
        }
        // Export Security Rules인 경우
        else {
            return {
                title: "Policy Summary",
                items: [
                    { label: "Total Rules", value: safeData.length }
                ]
            };
        }
    }, [data]);

    const handleDownload = () => {
        // 동적으로 모든 필드를 포함하여 exportData 생성
        const exportData = data.map(policy => {
            const formattedPolicy = {};
            Object.keys(policy).forEach(key => {
                // 언더스코어를 공백으로 변경하여 헤더 이름을 설정
                const headerName = key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1);
                formattedPolicy[headerName] = Array.isArray(policy[key]) ? policy[key].join(',') : policy[key];
            });
            return formattedPolicy;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Policies");

        // 현재 날짜 포맷팅 (YYYYMMDD)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        
        // 프로젝트명과 타입으로 파일명 생성
        const projectName = projectInfo || 'unknown';
        const fileName = `${dateStr}_${projectName}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="mt-4 max-w-full">
            {isExpanded && (
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-grow relative">
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search in all columns..."
                            className="w-full px-4 py-2 rounded-lg 
                                     border border-gray-200 dark:border-gray-600
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                     bg-white/50 dark:bg-gray-800/50 
                                     placeholder-gray-400 dark:placeholder-gray-500
                                     text-gray-900 dark:text-gray-100"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg 
                                 shadow-sm hover:shadow-md hover:bg-blue-700 dark:hover:bg-blue-600
                                 transition-all duration-200 flex items-center space-x-2
                                 active:transform active:scale-95"
                        onClick={handleDownload}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export</span>
                    </button>
                </div>
            )}

            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg 
                 border border-blue-100/50 dark:border-gray-700/50 overflow-hidden">
                {isExpanded ? (
                    <>
                        <div className="max-h-[600px] overflow-y-auto">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th key={header.id}
                                                        className="px-4 py-3 text-left text-xs font-medium 
                                                                 text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id}
                                                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 
                                                                 whitespace-nowrap align-top"
                                                    >
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
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 
                                      flex items-center justify-between">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 
                                             dark:border-gray-600 text-sm font-medium rounded-md 
                                             text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800
                                             hover:bg-gray-50 dark:hover:bg-gray-700
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 
                                             dark:border-gray-600 text-sm font-medium rounded-md 
                                             text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800
                                             hover:bg-gray-50 dark:hover:bg-gray-700
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing{' '}
                                        <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
                                        {' '}-{' '}
                                        <span className="font-medium">
                                            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getPrePaginationRowModel().rows.length)}
                                        </span>
                                        {' '}of{' '}
                                        <span className="font-medium">{table.getPrePaginationRowModel().rows.length}</span>
                                        {' '}results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" 
                                         aria-label="Pagination">
                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border 
                                                     border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 
                                                     text-sm font-medium text-gray-500 dark:text-gray-400
                                                     hover:bg-gray-50 dark:hover:bg-gray-700
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border 
                                                     border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 
                                                     text-sm font-medium text-gray-500 dark:text-gray-400
                                                     hover:bg-gray-50 dark:hover:bg-gray-700
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {data.length} policies available
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicyTable; 