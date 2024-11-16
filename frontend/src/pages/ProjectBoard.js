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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);  // 삭제 확인 모달 상태
    const [projectToDelete, setProjectToDelete] = useState(null);  // 삭제할 프로젝트
    const [showNameModal, setShowNameModal] = useState(false);
    const [selectedProjectType, setSelectedProjectType] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [showLimitModal, setShowLimitModal] = useState(false);  // 제한 알림 모달 상태 추가
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // localStorage에서 다크모드 설정 불러오기
        const savedMode = localStorage.getItem('darkMode');
        // 시스템 다크모드 설정 확인
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // 저장된 설정이 있으면 그 값을, 없으면 시스템 설정 사용
        return savedMode ? savedMode === 'true' : systemDarkMode;
    });
    const [showLimitAlert, setShowLimitAlert] = useState(false);  // 프로젝트 제한 알림 모달 상태 추가

    // 다크모드 설정이 변경될 때마다 localStorage에 저장하고 클래스 적용
    useEffect(() => {
        localStorage.setItem('darkMode', isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // 시스템 다크모드 설정 변경 감지
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // localStorage에 저장된 설정이 없을 때만 시스템 설정 따르기
            if (!localStorage.getItem('darkMode')) {
                setIsDarkMode(e.matches);
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

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

    // 프로젝트 삭제 핸들러 수정
    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!projectToDelete) return;

        try {
            const response = await fetch(`http://127.0.0.1:8000/delete-project/${projectToDelete.id}`, {
                method: "DELETE"
            });
            
            if (response.ok) {
                setProjects(projects.filter(project => project.id !== projectToDelete.id));
                setShowDeleteConfirm(false);
                setProjectToDelete(null);
            } else {
                console.error("Failed to delete project");
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    // 새 프로젝트 드롭다운 토글
    const handleNewProjectClick = () => setShowDropdown(!showDropdown);

    // 프로젝트 타입 선택 핸들러 수정
    const handleProjectTypeSelect = (projectType) => {
        setSelectedProjectType(projectType);
        setShowNameModal(true);
        setShowDropdown(false);
    };

    // 프로젝트 생성 핸들러 수정
    const handleCreateProject = async () => {
        if (!projectName.trim()) {
            return;
        }

        // 프로젝트 수 제한 체크
        if (projects.length >= 5) {
            setShowLimitModal(true);  // 모달 표시
            setShowNameModal(false);
            setSelectedProjectType(null);
            setProjectName('');
            return;
        }

        const newProject = {
            name: `${projectName} - ${selectedProjectType.name}`,
            tasks: selectedProjectType.tasks.map(task => ({
                name: task.name,
                type: task.type
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
            setShowNameModal(false);
            setSelectedProjectType(null);
            setProjectName('');
        } catch (error) {
            console.error("Error creating project:", error);
        }
    };

    // 초기 데이터 로딩
    useEffect(() => {
        fetchProjects();
        fetchProjectTypes();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-indigo-500/20 
                      dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* 다크모드 토글 버튼 */}
            <button
                className="fixed top-4 right-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700
                         hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                onClick={() => setIsDarkMode(!isDarkMode)}
            >
                {isDarkMode ? (
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
                {/* Hero Section */}
                <div className="text-center py-16">
                    <h1 className={`text-6xl font-bold mb-4 ${
                        isDarkMode 
                            ? 'text-white' 
                            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent'
                    } animate-gradient`}>
                        FPAT
                    </h1>
                    <p className="text-xl text-gray-400 dark:text-gray-300 mb-12 font-light">
                        Firewall Policy Analysis Tool
                    </p>
                    <button 
                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 
                                 dark:from-blue-700 dark:via-indigo-700 dark:to-blue-800 
                                 text-white px-8 py-3 rounded-lg shadow-lg 
                                 hover:shadow-xl hover:transform hover:scale-105
                                 active:scale-100
                                 transition-all duration-300 ease-in-out
                                 border border-blue-400/20 dark:border-blue-500/20 backdrop-blur-sm"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        New Project
                    </button>

                    {/* Project Type Dropdown */}
                    {showDropdown && (
                        <div className="absolute mt-2 w-64 bg-white/80 dark:bg-gray-800/80 rounded-lg 
                                      shadow-xl border border-blue-100/50 dark:border-gray-700/50
                                      backdrop-blur-md z-20 left-1/2 transform -translate-x-1/2">
                            {projectTypes.map((projectType, index) => (
                                <div
                                    key={index}
                                    className="px-4 py-3 hover:bg-gradient-to-r 
                                             hover:from-blue-50 hover:to-indigo-50 
                                             dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20
                                             cursor-pointer transition-all duration-150
                                             first:rounded-t-lg last:rounded-b-lg"
                                    onClick={() => handleProjectTypeSelect(projectType)}
                                >
                                    {projectType.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Projects Grid - 상단 여백 추가 */}
                <div className="w-full min-w-0 overflow-x-auto mb-8 mt-2">
                    <div className="grid gap-6 p-0.5">
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
                                    onDelete={handleDeleteClick}
                                    onUpdateTask={handleUpdateTask}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && projectToDelete && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm 
                             flex items-center justify-center z-[100]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" 
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                프로젝트 삭제
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            정말로 "{projectToDelete.name}" 프로젝트를 삭제하시겠습니까?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 
                                         hover:text-gray-800 dark:hover:text-gray-100 font-medium
                                         hover:bg-gray-100 dark:hover:bg-gray-700 
                                         rounded-lg transition-colors duration-200"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setProjectToDelete(null);
                                }}
                            >
                                취소
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white font-medium rounded-lg
                                         hover:bg-red-600 dark:hover:bg-red-700 
                                         transition-colors duration-200"
                                onClick={handleDeleteConfirm}
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Name Modal */}
            {showNameModal && selectedProjectType && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm 
                              flex items-center justify-center z-[100]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Create New Project
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Project Type
                            </label>
                            <div className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 
                                          px-3 py-2 rounded-lg">
                                {selectedProjectType.name}
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Enter project name"
                                className="w-full px-4 py-2 rounded-lg 
                                         border border-gray-200 dark:border-gray-600
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                         bg-white dark:bg-gray-700 
                                         text-gray-900 dark:text-gray-100
                                         placeholder-gray-400 dark:placeholder-gray-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 
                                         hover:text-gray-800 dark:hover:text-gray-100 font-medium
                                         hover:bg-gray-100 dark:hover:bg-gray-700 
                                         rounded-lg transition-colors duration-200"
                                onClick={() => {
                                    setShowNameModal(false);
                                    setSelectedProjectType(null);
                                    setProjectName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg
                                         hover:bg-blue-700 dark:hover:bg-blue-600 
                                         transition-colors duration-200
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleCreateProject}
                                disabled={!projectName.trim()}
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Limit Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm 
                              flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center space-x-3 text-yellow-600 dark:text-yellow-400 mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                프로젝트 생성 제한
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            최대 5개의 프로젝트만 생성할 수 있습니다. 새 프로젝트를 생성하려면 기존 프로젝트를 삭제해주세요.
                        </p>
                        <div className="flex justify-end">
                            <button
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg
                                         hover:bg-blue-700 dark:hover:bg-blue-600 
                                         transition-colors duration-200"
                                onClick={() => setShowLimitModal(false)}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Limit Alert Modal */}
            {showLimitAlert && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm 
                              flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center space-x-3 text-yellow-600 dark:text-yellow-400 mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                프로젝트 생성 제한
                            </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            최대 5개의 프로젝트만 생성할 수 있습니다.
                        </p>
                        <button
                            className="w-full py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg 
                                     hover:bg-blue-700 dark:hover:bg-blue-600 
                                     transition-colors duration-200"
                            onClick={() => setShowLimitAlert(false)}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectBoard;