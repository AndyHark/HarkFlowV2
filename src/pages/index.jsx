import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Boards from "./Boards";

import Board from "./Board";

import Analytics from "./Analytics";

import Clients from "./Clients";

import TimeTracking from "./TimeTracking";

import ClientTasks from "./ClientTasks";

import ClientDetail from "./ClientDetail";

import Settings from "./Settings";

import LandingPage from "./LandingPage";

import Contact from "./Contact";

import Profile from "./Profile";

import Help from "./Help";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Boards: Boards,
    
    Board: Board,
    
    Analytics: Analytics,
    
    Clients: Clients,
    
    TimeTracking: TimeTracking,
    
    ClientTasks: ClientTasks,
    
    ClientDetail: ClientDetail,
    
    Settings: Settings,
    
    LandingPage: LandingPage,
    
    Contact: Contact,
    
    Profile: Profile,
    
    Help: Help,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Boards" element={<Boards />} />
                
                <Route path="/Board" element={<Board />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/TimeTracking" element={<TimeTracking />} />
                
                <Route path="/ClientTasks" element={<ClientTasks />} />
                
                <Route path="/ClientDetail" element={<ClientDetail />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/LandingPage" element={<LandingPage />} />
                
                <Route path="/Contact" element={<Contact />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Help" element={<Help />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}