// ProjectCard.js - 개별 프로젝트를 관리하고 표시하는 컴포넌트

import React, { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import ProjectResultCard from "./ProjectResultCard";

const ProjectCard = ({ project, onDelete, onUpdateTask }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [projectStatus, setProjectStatus] = useState(project.status);
    const [resultData, setResultData] = useState(null);
    const [isTasksOpen, setIsTasksOpen] = useState(true);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleAccordion = () => setIsOpen(!isOpen);

    const updateTaskStatus = async (taskName, newStatus, newProjectStatus) => {
        if (newProjectStatus) {
            setProjectStatus(newProjectStatus);
        }
        await onUpdateTask(project.id, taskName, newStatus, newProjectStatus);
    };

    useEffect(() => {
        setProjectStatus(project.status);
    }, [project.status]);

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete(project);
    };

    useEffect(() => {
        const fetchResultData = async () => {
            if (!project.id || !isOpen) return;
            if (project.status !== 'Completed') {
                setResultData(null);
                return;
            }
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/project-result/${project.id}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.result) {
                        setResultData(data.result);
                    }
                }
            } catch (error) {
                console.error("Error fetching result data:", error);
            }
        };

        fetchResultData();
    }, [project.id, project.status, isOpen]);

    return (
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg 
            transition-all duration-300 border border-blue-100/50 dark:border-gray-700/50
            hover:shadow-xl hover:border-blue-300/50 dark:hover:border-blue-500/50 
            hover:transform hover:-translate-y-0.5
            max-w-full w-full overflow-hidden">
            {/* Project Header */}
            <div className="p-4 cursor-pointer" onClick={toggleAccordion}>
                <div className="flex justify-between items-center">
                    <div className="flex-grow">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                            {project.name}
                        </h2>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(project.created_at)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                ${projectStatus === 'Completed' 
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-100' 
                                    : projectStatus === 'Error' 
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-100' 
                                    : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-100'}`}>
                                {projectStatus}
                            </span>
                        </div>
                    </div>
                    <button
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 
                                 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50
                                 transition-colors duration-200"
                        onClick={handleDeleteClick}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Project Content */}
            {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Tasks Frame */}
                    <div className="p-4 space-y-4 bg-white/60 dark:bg-gray-800/60">
                        <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm 
                                   border border-blue-100/50 dark:border-gray-700/50 overflow-hidden">
                            {/* Tasks Header with Accordion */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 
                                       flex items-center justify-between cursor-pointer
                                       hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                 onClick={() => setIsTasksOpen(!isTasksOpen)}>
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" 
                                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        Tasks
                                    </h3>
                                </div>
                                <svg 
                                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 
                                             ${isTasksOpen ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Tasks Content */}
                            {isTasksOpen && (
                                <div className="p-4 space-y-4 overflow-x-auto">
                                    <div className="min-w-0 w-full">
                                        {project.tasks?.map((task, index) => (
                                            <TaskCard
                                                key={task.id || index}
                                                task={task}
                                                projectId={project.id}
                                                previousTask={index > 0 ? project.tasks[index - 1] : null}
                                                onUpdate={updateTaskStatus}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results Section */}
                    {project.status === 'Completed' && resultData && (
                        <div className="border-t border-gray-100 dark:border-gray-700 
                                    bg-white/60 dark:bg-gray-800/60 p-4 overflow-x-auto">
                            <div className="min-w-0 w-full">
                                <ProjectResultCard result={resultData} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectCard;