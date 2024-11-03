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
                    previousResult = resultData.result;
                    console.log("Previous task result:", previousResult);
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
        const taskSequence = [
            "Select a Firewall Type",
            "Connect to Firewall",
            "Import Configuration",
            "Process Policies",
            "Download Rules"
        ];
        const currentIndex = taskSequence.indexOf(currentTaskName);
        return taskSequence[currentIndex + 1];
    };

    return (
        <div className="border rounded p-4 mb-2" data-task-name={task.name}>
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
                    {inputFormat?.fields && (
                        <>
                            {inputFormat.fields.map(field => renderInputField(field))}
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
                        </>
                    )}
                    
                    {task.name !== "Download Rules" && task.result && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">
                                {task.result.message || JSON.stringify(task.result)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {showErrorModal && error && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-medium mb-4">Error</h3>
                        <p className="mb-4 text-red-500">{error}</p>
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded"
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