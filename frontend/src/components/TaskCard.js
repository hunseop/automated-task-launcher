// frontend/src/components/TaskCard.js
import React, { useState, useEffect, useCallback } from "react";
import PolicyTable from "./PolicyTable";
import ProjectResultCard from "./ProjectResultCard";

const TaskCard = ({ task, projectId, previousTask, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [inputFormat, setInputFormat] = useState(null);

    useEffect(() => {
        if (previousTask) {
            if (previousTask.status === 'Completed') {
                setIsOpen(true);
            }
        } else {
            if (task.name === "Select a Firewall Type") {
                setIsOpen(true);
            }
        }
    }, [previousTask, task.name, previousTask?.status]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderInputField = (field) => {
        const baseInputClasses = "w-full px-3 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50";
        
        switch (field.type) {
            case "text":
            case "password":
                return (
                    <div key={field.name} className="flex-1">
                        <input
                            name={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            className={baseInputClasses}
                            value={formData[field.name] || ""}
                            onChange={handleInputChange}
                        />
                    </div>
                );
            case "select":
                return (
                    <div key={field.name} className="flex-1">
                        <select
                            name={field.name}
                            className={`${baseInputClasses} pr-10`}
                            value={formData[field.name] || ""}
                            onChange={handleInputChange}
                        >
                            <option value="">Select {field.name}</option>
                            {field.options.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );
            case "textarea":
                return (
                    <div key={field.name} className="w-full">
                        <textarea
                            name={field.name}
                            placeholder={field.placeholder}
                            className={`${baseInputClasses} min-h-[100px] resize-y`}
                            value={formData[field.name] || ""}
                            onChange={handleInputChange}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const handleContinue = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let previousResult = null;
            if (previousTask) {
                const resultResponse = await fetch(
                    `http://127.0.0.1:8000/task-result/${projectId}/${previousTask.name}`
                );
                if (resultResponse.ok) {
                    const resultData = await resultResponse.json();
                    previousResult = resultData.result?.data 
                        ? { 
                            success: resultData.result.success,
                            data: resultData.result.data,
                            message: resultData.result.message
                        } 
                        : resultData.result;
                }
            }

            const body = {
                project_id: projectId,
                task_name: task.name,
                previous_result: previousResult,
                ...formData
            };

            console.log("Sending request body:", body);

            const response = await fetch("http://127.0.0.1:8000/update-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update task');
            }

            const data = await response.json();
            if (data.task) {
                await onUpdate(
                    task.name, 
                    data.task.status, 
                    data.project?.status
                );

                if (data.task.status === 'Completed') {
                    setIsOpen(false);  // 태스크 완료 시 접기
                    const nextTaskName = getNextTaskName(task.name);
                    if (nextTaskName) {
                        const nextTask = document.querySelector(`[data-task-name="${nextTaskName}"]`);
                        if (nextTask) {
                            setTimeout(() => {
                                nextTask.click();
                            }, 1000);
                        }
                    }
                }
            }
        } catch (error) {
            setError(error.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    }, [projectId, task.name, formData, onUpdate, previousTask]);

    useEffect(() => {
        let isMounted = true;

        const fetchTaskTypeInfo = async () => {
            if (task.status === 'Completed') {
                return;
            }

            if (!task.type || !isOpen) {
                return;
            }

            try {
                const response = await fetch(`http://127.0.0.1:8000/task-type-info/${task.type}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch task type info: ${response.status}`);
                }

                const data = await response.json();
                if (!isMounted) return;

                if (data.input_format) {
                    setInputFormat(data.input_format);
                    const initialFormData = {};
                    data.input_format.fields.forEach(field => {
                        initialFormData[field.name] = "";
                    });
                    setFormData(initialFormData);
                }

                const shouldAutoExecute = 
                    task.status === 'Waiting' &&
                    (!data.input_format || !data.input_format.fields || data.input_format.fields.length === 0) &&
                    (!data.requires_previous || (previousTask && previousTask.status === 'Completed'));

                if (shouldAutoExecute) {
                    handleContinue();
                }
            } catch (error) {
                console.error("Error fetching task type info:", error);
            }
        };

        fetchTaskTypeInfo();

        return () => {
            isMounted = false;
        };
    }, [isOpen, task.type, task.status, previousTask?.status]);

    const getNextTaskName = (currentTaskName) => {
        const exportSecurityTasks = [
            "Select a Firewall Type",
            "Connect to Firewall",
            "Import Configuration",
            "Process Policies",
            "Download Rules"
        ];

        const shadowPolicyTasks = [
            "Select a Firewall Type",
            "Connect to Firewall",
            "Import Configuration",
            "Process Shadow Policies",
            "Download Rules"
        ];

        const blockImpactTasks = [
            "Select a Firewall Type",
            "Connect to Firewall",
            "Import Configuration",
            "Input Target Rules",
            "Process Impact Analysis",
            "Download Rules"
        ];

        // 현재 태스크가 어느 시퀀스에 속하는지 확인
        let taskSequence;
        if (exportSecurityTasks.includes(currentTaskName)) {
            taskSequence = exportSecurityTasks;
        } else if (shadowPolicyTasks.includes(currentTaskName)) {
            taskSequence = shadowPolicyTasks;
        } else {
            taskSequence = blockImpactTasks;
        }
        
        const currentIndex = taskSequence.indexOf(currentTaskName);
        return taskSequence[currentIndex + 1];
    };

    const handleRestart = async () => {
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/restart-task/${projectId}/${task.name}`,
                { method: 'POST' }
            );
            
            if (response.ok) {
                // 태스크 상태 업데이트
                await onUpdate(task.name, 'Waiting', null);
                setFormData({});  // 입력 필드 초기화
                setError(null);   // 에러 상태 초기화
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail);
            }
        } catch (error) {
            setError(error.message);
            setShowErrorModal(true);
        }
    };

    return (
        <div className={`
            bg-white/60 backdrop-blur-sm rounded-lg shadow-sm transition-all duration-300
            ${isOpen ? 'shadow-lg ring-1 ring-blue-100' : 'hover:shadow-md'}
            border border-blue-100/50
        `} 
        data-task-name={task.name}>
            <div className="flex justify-between items-center p-4">
                <div 
                    className="flex items-center space-x-3 flex-grow cursor-pointer" 
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className={`w-2 h-2 rounded-full ${
                        task.status === 'Completed' ? 'bg-green-500' :
                        task.status === 'Error' ? 'bg-red-500' :
                        'bg-yellow-500'
                    }`}/>
                    <h3 className="font-medium text-gray-800">{task.name}</h3>
                </div>
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'Error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {task.status}
                    </span>
                    {(task.status === 'Completed' || task.status === 'Error') && (
                        <button
                            className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-600 
                                     hover:bg-blue-100 transition-all duration-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRestart();
                            }}
                        >
                            Restart
                        </button>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="border-t border-blue-50 p-4">
                    {inputFormat?.fields && (
                        <div className="space-y-4">
                            {inputFormat.fields.some(field => field.type === 'textarea') ? (
                                <div className="space-y-4">
                                    {inputFormat.fields.map(field => renderInputField(field))}
                                </div>
                            ) : (
                                <div className="flex space-x-4">
                                    {inputFormat.fields.map(field => renderInputField(field))}
                                </div>
                            )}
                            
                            {loading ? (
                                <div className="flex justify-center py-2">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 
                                                  border-blue-600 border-t-transparent"></div>
                                </div>
                            ) : (
                                <button 
                                    className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r 
                                             from-blue-600 to-blue-700 text-white hover:from-blue-700 
                                             hover:to-blue-800 transition-all duration-200 flex items-center 
                                             justify-center space-x-2"
                                    onClick={handleContinue}
                                    disabled={loading}
                                >
                                    <span>Continue</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                    
                    {task.name !== "Download Rules" && task.result && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                {task.result.message || JSON.stringify(task.result)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 에러 모달 */}
            {showErrorModal && error && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center space-x-3 text-red-600 mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-semibold">Error</h3>
                        </div>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                                     transition-colors duration-200"
                            onClick={() => setShowErrorModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskCard;