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
            const response = await fetch("http://127.0.0.1:8000/projects");
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
            const response = await fetch("http://127.0.0.1:8000/project-types");
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

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className="container mx-auto mt-5">
            <h1 className="text-2xl font-semibold mb-4">FPAT</h1>
            <button className="btn-primary mb-4" onClick={handleNewProjectClick}>
                New Project
            </button>

            {showDropdown && (
                <div className="dropdown bg-white border rounded shadow-lg p-2">
                    {projectTypes.map((projectType, index) => (
                        <div
                            key={index}
                            className="dropdown-item p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleProjectSelect(projectType)}
                        >
                            {projectType.name}
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-2">
                {projects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        onDelete={() => handleDeleteProject(project.id)}
                        onUpdateTask={handleUpdateTask}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProjectBoard;