// frontend/src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProjectBoard from "./pages/ProjectBoard"; // ProjectBoard 페이지 임포트

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ProjectBoard />} />
            </Routes>
        </Router>
    );
}

export default App;
