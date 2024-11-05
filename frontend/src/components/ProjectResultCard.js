import React, { useState } from 'react';
import PolicyTable from './PolicyTable';

const ProjectResultCard = ({ result }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderResult = () => {
        if (!result) return null;

        switch (result.type) {
            case 'policy':
                return <PolicyTable policies={result.data} isExpanded={isExpanded} />;
            case 'text':
                return (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-100/50">
                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                            {result.data}
                        </pre>
                    </div>
                );
            case 'json':
                return (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-100/50">
                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                            {JSON.stringify(result.data, null, 2)}
                        </pre>
                    </div>
                );
            default:
                return (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>지원되지 않는 결과 형식입니다.</span>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-lg border border-blue-100/50 transition-all duration-200">
            <div 
                className="p-4 border-b border-blue-50 cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h2 className="text-lg font-semibold text-gray-800">Results</h2>
                    </div>
                    <svg 
                        className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
            <div className="p-4">
                <div className="result-content">
                    {renderResult()}
                </div>
            </div>
        </div>
    );
};

export default ProjectResultCard; 