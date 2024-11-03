import React from 'react';
import PolicyTable from './PolicyTable';

const ProjectResultCard = ({ result, onDownload }) => {
    // 결과 타입에 따른 렌더링 함수
    const renderResult = () => {
        if (!result) return null;

        console.log("Result data in ProjectResultCard:", result); // 디버깅용

        // 결과 타입에 따라 다른 컴포넌트를 렌더링
        switch (result.type) {
            case 'policy':
                // result.data가 배열인지 확인하고 로그 출력
                console.log("Policies being passed to PolicyTable:", result.data);
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
            {onDownload && (
                <button
                    className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                    onClick={onDownload}
                >
                    Download Results
                </button>
            )}
        </div>
    );
};

export default ProjectResultCard; 