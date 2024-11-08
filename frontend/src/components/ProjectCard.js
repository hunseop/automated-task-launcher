// ProjectCard.js - 개별 프로젝트를 관리하고 표시하는 컴포넌트

import React, { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import ProjectResultCard from "./ProjectResultCard";

const ProjectCard = ({ project, onDelete, onUpdateTask }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectStatus, setProjectStatus] = useState(project.status);
    const [resultData, setResultData] = useState(null);

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
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg transition-all duration-200 w-full min-w-0 overflow-hidden">
            {/* Project Header */}
            <div className="p-4 cursor-pointer" onClick={toggleAccordion}>
                <div className="flex justify-between items-center">
                    <div className="flex-grow min-w-0">
                        <h2 className="text-xl font-semibold text-gray-800 truncate">{project.name}</h2>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(project.created_at)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                                ${projectStatus === 'Completed' ? 'bg-green-100 text-green-800' : 
                                  projectStatus === 'Error' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {projectStatus}
                            </span>
                        </div>
                    </div>
                    <button
                        className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50
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
                <div className="border-t border-gray-100 w-full min-w-0">
                    <div className="p-4 space-y-4 w-full min-w-0">
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

                    {project.status === 'Completed' && resultData && (
                        <div className="border-t border-gray-100 p-4 w-full min-w-0">
                            <ProjectResultCard result={resultData} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectCard;