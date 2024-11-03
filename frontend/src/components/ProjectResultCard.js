import React from 'react';
import PolicyTable from './PolicyTable';

const ProjectResultCard = ({ result }) => {
    const renderResult = () => {
        if (!result) return null;

        switch (result.type) {
            case 'policy':
                return <PolicyTable policies={result.data} />;
            case 'text':
                return <pre className="whitespace-pre-wrap">{result.data}</pre>;
            case 'json':
                return (
                    <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                    </pre>
                );
            default:
                return <div>지원되지 않는 결과 형식입니다.</div>;
        }
    };

    return (
        <div className="border p-4 rounded shadow-md mt-4">
            <h2 className="text-lg font-bold mb-2">Results</h2>
            <div className="result-content">
                {renderResult()}
            </div>
        </div>
    );
};

export default ProjectResultCard; 