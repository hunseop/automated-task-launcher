// ProjectCard.js - 개별 프로젝트를 관리하고 표시하는 컴포넌트

import React, { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import ProjectResultCard from "./ProjectResultCard";

const ProjectCard = ({ project, onDelete, onUpdateTask }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectStatus, setProjectStatus] = useState(project.status);
    const [resultData, setResultData] = useState(null);

    // 날짜 포맷팅 함수
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

    // 아코디언 토글
    const toggleAccordion = () => setIsOpen(!isOpen);

    // 태스크 상태 업데이트 핸들러
    const updateTaskStatus = async (taskName, newStatus, newProjectStatus) => {
        if (newProjectStatus) {
            setProjectStatus(newProjectStatus); // 프로젝트 상태 업데이트
        }
        await onUpdateTask(project.id, taskName, newStatus, newProjectStatus);
    };

    // 프로젝트 상태 변경 감지 및 동기화
    useEffect(() => {
        setProjectStatus(project.status);
    }, [project.status]);

    // 삭제 관련 핸들러
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        onDelete(project.id);
        setShowDeleteConfirm(false);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    // 결과 데이터 가져오기
    useEffect(() => {
        const fetchResultData = async () => {
            if (!project.id || !isOpen) return;
            
            // 프로젝트가 완료 상태인지 확인
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
                } else {
                    console.error("Failed to fetch result data:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching result data:", error);
            }
        };

        fetchResultData();
    }, [project.id, project.status, isOpen]);

    return (
        <div className="p-2 border-b hover:bg-gray-100 relative border border-gray-300">
            <div className="flex justify-between items-center">
                <div className="flex-grow cursor-pointer" onClick={toggleAccordion}>
                    <h2 className="text-lg font-medium">{project.name}</h2>
                    <div className="text-sm text-gray-500 flex space-x-4">
                        <span>Created on: {formatDate(project.created_at)}</span>
                        <span className={`font-medium ${
                            projectStatus === 'Completed' ? 'text-green-500' : 
                            projectStatus === 'Error' ? 'text-red-500' : 
                            'text-yellow-500'
                        }`}>
                            {projectStatus}
                        </span>
                    </div>
                </div>
                <button
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    onClick={handleDeleteClick}
                >
                    Delete
                </button>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-medium mb-4">프로젝트 삭제</h3>
                        <p className="mb-4">정말로 "{project.name}" 프로젝트를 삭제하시겠습니까?</p>
                        <div className="flex justify-end space-x-2">
                            <button
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                                onClick={handleCancelDelete}
                            >
                                취소
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                onClick={handleConfirmDelete}
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <>
                    <div className="mt-2">
                        {project.tasks && project.tasks.map((task, index) => (
                            <TaskCard
                                key={task.id || index}
                                task={task}
                                projectId={project.id}
                                previousTask={index > 0 ? project.tasks[index - 1] : null}
                                onUpdate={updateTaskStatus}
                            />
                        ))}
                    </div>

                    {/* 프로젝트가 완료 상태이고 결과 데이터가 있을 때만 결과 카드 표시 */}
                    {project.status === 'Completed' && resultData && (
                        <div className="mt-4 border-t pt-4">
                            <ProjectResultCard result={resultData} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProjectCard;