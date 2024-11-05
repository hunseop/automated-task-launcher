// frontend/src/pages/ProjectBoard.js
import React, { useEffect, useState } from "react";
import ProjectCard from "../components/ProjectCard";

// ProjectBoard.js - 프로젝트 목록을 관리하고 표시하는 메인 컴포넌트

const ProjectBoard = () => {
    // 상태 관리
    const [projects, setProjects] = useState([]); // 프로젝트 목록
    const [showDropdown, setShowDropdown] = useState(false); // 새 프로젝트 드롭다운 표시 여부
    const [projectTypes, setProjectTypes] = useState([]); // 사용 가능한 프로젝트 타입 목록
    const [loading, setLoading] = useState(true); // 초기 로딩 상태

    // 프로젝트 목록 조회 함수
    const fetchProjects = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/projects", {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`Failed to fetch projects: ${response.statusText}`);
            const data = await response.json();
            setProjects(data);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    // 프로젝트 타입 목록 조회 함수
    const fetchProjectTypes = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/project-types", {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch project types: ${response.statusText}`);
            }
            const data = await response.json();
            setProjectTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch project types:", error);
            setProjectTypes([]);
        }
    };

    // 태스크 상태 업데이트 핸들러
    const handleUpdateTask = async (projectId, taskName, newStatus, projectStatus) => {
        // 로컬 상태 업데이트
        setProjects((prevProjects) =>
            prevProjects.map((project) => {
                if (project.id === projectId) {
                    const updatedTasks = project.tasks.map((task) =>
                        task.name === taskName ? { ...task, status: newStatus } : task
                    );
                    
                    return {
                        ...project,
                        status: projectStatus || project.status,
                        tasks: updatedTasks
                    };
                }
                return project;
            })
        );

        // DB 상태 동기화
        await fetchProjects();
    };

    // 프로젝트 삭제 핸들러
    const handleDeleteProject = async (projectId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/delete-project/${projectId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setProjects((prevProjects) => 
                    prevProjects.filter((project) => project.id !== projectId)
                );
            } else {
                console.error("Failed to delete project:", response.statusText);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    // 새 프로젝트 드롭다운 토글
    const handleNewProjectClick = () => setShowDropdown(!showDropdown);

    // 새 프로젝트 생성 핸들러
    const handleProjectSelect = async (projectType) => {
        const newProject = {
            name: projectType.name,
            tasks: projectType.tasks.map(task => ({
                name: task.name,
                type: task.type  // TaskType Enum 값이 문자열로 변환됨
            }))
        };

        try {
            const response = await fetch("http://127.0.0.1:8000/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newProject)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create project');
            }
            
            await fetchProjects();
        } catch (error) {
            console.error("Error creating project:", error);
        }

        setShowDropdown(false);
    };

    // 초기 데이터 로딩
    useEffect(() => {
        fetchProjects();
        fetchProjectTypes();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-indigo-500/20">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                {/* Hero Section */}
                <div className="text-center py-16">
                    <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 
                                 bg-clip-text text-transparent animate-gradient">
                        FPAT
                    </h1>
                    <p className="text-xl text-gray-600 mb-12 font-light">
                        Firewall Policy Analysis Tool
                    </p>
                    <button 
                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-8 py-3 rounded-lg
                                 shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105
                                 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800
                                 border border-blue-400/20 backdrop-blur-sm"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        New Project
                    </button>

                    {/* Project Type Dropdown */}
                    {showDropdown && (
                        <div className="absolute mt-2 w-64 bg-white/80 rounded-lg shadow-xl border border-blue-100
                                      backdrop-blur-md z-20 left-1/2 transform -translate-x-1/2">
                            {projectTypes.map((projectType, index) => (
                                <div
                                    key={index}
                                    className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                                             cursor-pointer first:rounded-t-lg last:rounded-b-lg transition-all duration-150
                                             border-b border-blue-50 last:border-0"
                                    onClick={() => handleProjectSelect(projectType)}
                                >
                                    {projectType.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Projects Grid */}
                <div className="grid gap-6 mb-8">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 
                                          border-t-transparent shadow-lg"></div>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onDelete={handleDeleteProject}
                                onUpdateTask={handleUpdateTask}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectBoard;