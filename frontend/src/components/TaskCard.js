// frontend/src/components/TaskCard.js
import React, { useState, useEffect } from "react";

const TaskCard = ({ task, projectId, previousTask, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [inputFormat, setInputFormat] = useState(null);

    useEffect(() => {
        const fetchTaskTypeInfo = async () => {
            if (!task.type) {
                console.error("No task type provided for task:", task);
                return;
            }

            try {
                const response = await fetch(`http://127.0.0.1:8000/task-type-info/${encodeURIComponent(task.type)}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch task type info: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.input_format) {
                    setInputFormat(data.input_format);
                    const initialFormData = {};
                    data.input_format.fields.forEach(field => {
                        initialFormData[field.name] = "";
                    });
                    setFormData(initialFormData);
                }
            } catch (error) {
                console.error("Error fetching task type info:", error);
            }
        };

        fetchTaskTypeInfo();
    }, [task]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderInputField = (field) => {
        switch (field.type) {
            case "text":
                return (
                    <input
                        key={field.name}
                        name={field.name}
                        type="text"
                        placeholder={field.placeholder}
                        className="input-field"
                        value={formData[field.name] || ""}
                        onChange={handleInputChange}
                    />
                );
            case "password":
                return (
                    <input
                        key={field.name}
                        name={field.name}
                        type="password"
                        placeholder={field.placeholder}
                        className="input-field"
                        value={formData[field.name] || ""}
                        onChange={handleInputChange}
                    />
                );
            case "select":
                return (
                    <select
                        key={field.name}
                        name={field.name}
                        className="input-field"
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
                );
            case "textarea":
                return (
                    <textarea
                        key={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        className="input-field"
                        value={formData[field.name] || ""}
                        onChange={handleInputChange}
                    />
                );
            default:
                return null;
        }
    };

    const handleContinue = async () => {
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
                    previousResult = resultData.result;
                }
            }

            const body = {
                project_id: projectId,
                task_name: task.name,
                previous_result: previousResult,
                ...formData
            };

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
            if (data.task && data.project) {
                await onUpdate(
                    task.name, 
                    data.task.status, 
                    data.project.status
                );
            }
        } catch (error) {
            setError(error.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-b p-2">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <h3 className="font-medium">{task.name}</h3>
                <span className={`${
                    task.status === 'Completed' ? 'text-green-500' :
                    task.status === 'Error' ? 'text-red-500' :
                    'text-gray-500'
                }`}>
                    {task.status}
                </span>
            </div>

            {isOpen && (
                <div className="mt-2 space-y-2">
                    {inputFormat?.fields ? (
                        inputFormat.fields.map(field => renderInputField(field))
                    ) : (
                        <p className="text-gray-500">No input fields required</p>
                    )}
                    {loading ? (
                        <span className="text-gray-500">Updating...</span>
                    ) : (
                        <button 
                            className={`btn-primary ${task.status === 'Error' ? 'bg-red-500' : ''}`}
                            onClick={handleContinue}
                            disabled={loading}
                        >
                            Continue
                        </button>
                    )}
                </div>
            )}

            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
                        <h3 className="text-lg font-medium mb-4">작업 순서 알림</h3>
                        <p className="mb-4 text-gray-600">
                            {error === "Previous task must be completed first" 
                                ? "이전 작업을 먼저 완료해주세요."
                                : error}
                        </p>
                        <div className="flex justify-end">
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={() => setShowErrorModal(false)}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskCard;