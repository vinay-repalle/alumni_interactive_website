import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import ThreeSessions from '../components/ThreeSessions';
import { sessionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Sessions = () => {
  const [sessions, setSessions] = useState({
    ongoing: [],
    previous: [],
    upcoming: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await sessionService.getAllSessions();
        const allSessions = response.data?.sessions || [];

        // Categorize sessions
        const categorizedSessions = {
          ongoing: [],
          previous: [],
          upcoming: []
        };

        const now = new Date();

        allSessions.forEach(session => {
          if (!session) return; // Skip if session is null or undefined

          const sessionDate = new Date(session.date);
          const sessionTime = (session.time || '00:00').split(':');
          sessionDate.setHours(parseInt(sessionTime[0]), parseInt(sessionTime[1]));

          // Format the session data
          const formattedSession = {
            title: session.title || 'Untitled Session',
            description: session.description || 'No description available',
            conductedBy: session.sessionHead || { fullName: 'TBA' },
            profileImage: (session.sessionHead && session.sessionHead.profilePhoto) || '/default-profile.png',
            date: sessionDate.getDate().toString(),
            month: sessionDate.toLocaleString('default', { month: 'long' }),
            venue: session.venue || 'TBA',
            location: session.venue || 'TBA',
            id: session._id,
            status: session.status || 'upcoming'
          };

          if (session.status === 'ongoing') {
            categorizedSessions.ongoing.push(formattedSession);
          } else if (session.status === 'completed') {
            categorizedSessions.previous.push(formattedSession);
          } else {
            categorizedSessions.upcoming.push(formattedSession);
          }
        });

        setSessions(categorizedSessions);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err.response?.data?.message || 'Failed to load sessions. Please try again later.');
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await sessionService.deleteSession(sessionId);
        // Refresh sessions after deletion
        const response = await sessionService.getAllSessions();
        const allSessions = response.data?.sessions || [];
        
        // Re-categorize sessions
        const categorizedSessions = {
          ongoing: [],
          previous: [],
          upcoming: []
        };

        allSessions.forEach(session => {
          if (!session) return;

          const sessionDate = new Date(session.date);
          const sessionTime = (session.time || '00:00').split(':');
          sessionDate.setHours(parseInt(sessionTime[0]), parseInt(sessionTime[1]));

          const formattedSession = {
            title: session.title || 'Untitled Session',
            description: session.description || 'No description available',
            conductedBy: session.sessionHead || { fullName: 'TBA' },
            profileImage: (session.sessionHead && session.sessionHead.profilePhoto) || '/default-profile.png',
            date: sessionDate.getDate().toString(),
            month: sessionDate.toLocaleString('default', { month: 'long' }),
            venue: session.venue || 'TBA',
            location: session.venue || 'TBA',
            id: session._id,
            status: session.status || 'upcoming'
          };

          if (session.status === 'ongoing') {
            categorizedSessions.ongoing.push(formattedSession);
          } else if (session.status === 'completed') {
            categorizedSessions.previous.push(formattedSession);
          } else {
            categorizedSessions.upcoming.push(formattedSession);
          }
        });

        setSessions(categorizedSessions);
      } catch (err) {
        console.error('Error deleting session:', err);
        setError('Failed to delete session. Please try again later.');
      }
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to cancel this session? This will mark the session as cancelled.')) {
      try {
        await sessionService.updateSessionStatus(sessionId, 'cancelled');
        // Refresh sessions after cancellation
        const response = await sessionService.getAllSessions();
        const allSessions = response.data?.sessions || [];
        
        // Re-categorize sessions
        const categorizedSessions = {
          ongoing: [],
          previous: [],
          upcoming: []
        };

        allSessions.forEach(session => {
          if (!session) return;

          const sessionDate = new Date(session.date);
          const sessionTime = (session.time || '00:00').split(':');
          sessionDate.setHours(parseInt(sessionTime[0]), parseInt(sessionTime[1]));

          const formattedSession = {
            title: session.title || 'Untitled Session',
            description: session.description || 'No description available',
            conductedBy: session.sessionHead || { fullName: 'TBA' },
            profileImage: (session.sessionHead && session.sessionHead.profilePhoto) || '/default-profile.png',
            date: sessionDate.getDate().toString(),
            month: sessionDate.toLocaleString('default', { month: 'long' }),
            venue: session.venue || 'TBA',
            location: session.venue || 'TBA',
            id: session._id,
            status: session.status || 'upcoming'
          };

          if (session.status === 'ongoing') {
            categorizedSessions.ongoing.push(formattedSession);
          } else if (session.status === 'completed') {
            categorizedSessions.previous.push(formattedSession);
          } else {
            categorizedSessions.upcoming.push(formattedSession);
          }
        });

        setSessions(categorizedSessions);
      } catch (err) {
        console.error('Error cancelling session:', err);
        setError('Failed to cancel session. Please try again later.');
      }
    }
  };

  // Scroll to the top or specific section based on the hash fragment
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <Breadcrumb />
        <div className="bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 min-h-[calc(100vh-200px)]">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <Breadcrumb />
        <div className="bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 min-h-[calc(100vh-200px)]">
          <div className="container mx-auto px-4 py-8">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-6 text-center shadow-md">
              <p className="text-blue-700 text-lg font-medium">{error}</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Breadcrumb />
      
      <div className="bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 min-h-[calc(100vh-200px)]">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-800 text-center mb-12">
            Knowledge Sharing Sessions
          </h1>
          
          <div className="space-y-16">
            {/* Ongoing Sessions */}
            <section id="ongoing-sessions" className="bg-white/90 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-md border border-gray-300">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-700 mb-6 flex items-center">
                <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                Ongoing Sessions
              </h2>
              <ThreeSessions 
                sessions={sessions.ongoing} 
                type="ongoing" 
                isAdmin={user?.role === 'admin'}
                onDelete={handleDeleteSession}
                onCancel={handleCancelSession}
                sectionId="ongoing-sessions"
              />
            </section>

            {/* Upcoming Sessions */}
            <section id="upcoming-sessions" className="bg-white/90 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-md border border-gray-300">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-700 mb-6 flex items-center">
                <span className="inline-block w-3 h-3 bg-blue-400 rounded-full mr-3"></span>
                Upcoming Sessions
              </h2>
              <ThreeSessions 
                sessions={sessions.upcoming} 
                type="upcoming" 
                isAdmin={user?.role === 'admin'}
                onDelete={handleDeleteSession}
                onCancel={handleCancelSession}
                sectionId="upcoming-sessions"
              />
            </section>

            {/* Previous Sessions */}
            <section id="previous-sessions" className="bg-white/90 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-md border border-gray-300">
              <h2 className="text-2xl md:text-3xl font-bold text-blue-700 mb-6 flex items-center">
                <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-3"></span>
                Previous Sessions
              </h2>
              <ThreeSessions 
                sessions={sessions.previous} 
                type="previous" 
                isAdmin={user?.role === 'admin'}
                onDelete={handleDeleteSession}
                onCancel={handleCancelSession}
                sectionId="previous-sessions"
              />
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Sessions;