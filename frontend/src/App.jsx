import { useEffect, useState } from 'react';
import { RefreshCw, Eye, X, User, Calendar, ChevronRight, CheckCircle } from 'lucide-react';

function AttendanceDisplay({ data }) {
  // Updated to use attendance_summary instead of today_attendance
  if (!data?.attendance_summary || !Array.isArray(data.attendance_summary) || data.attendance_summary.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No attendance data for today.</p>
      </div>
    );
  }

  // Function to parse today's attendance string
  const parseAttendanceString = (attendanceStr) => {
    if (!attendanceStr) return [];
    
    const statusMap = {
      'P': 'Present',
      'A': 'Absent',
      'L': 'Late',
      'E': 'Excused'
    };
    
    return attendanceStr.split('').map((char, index) => ({
      period: index + 1,
      status: statusMap[char] || 'Unknown',
      char: char
    }));
  };

  return (
    <div className="space-y-4">
      {data.attendance_summary.map((item, idx) => {
        const todayAttendance = parseAttendanceString(item.attendance_today);
        
        return (
          <div key={item.subject + idx} className="bg-white rounded-xl p-5 shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900 text-base md:text-lg">{item.subject}</h4>
                <p className="text-gray-600 mt-1 text-sm md:text-base">
                  Today's Sessions: {todayAttendance.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Overall</div>
                <div className="text-lg font-bold text-gray-900">
                  {data.subjectwise_summary.find(s => s.subject_name === item.subject)?.percentage || 'N/A'}%
                </div>
              </div>
            </div>
            
            {todayAttendance.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {todayAttendance.map((session, sessionIdx) => (
                  <div 
                    key={sessionIdx}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      session.status === 'Present' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={`Period ${session.period}: ${session.status}`}
                  >
                    {session.char}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [roll, setRoll] = useState('');
  const [pass, setPass] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [showBelow75, setShowBelow75] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  const backendUrl = 'https://attendance-4dtj.onrender.com/api/attendance';

  // Storage helper functions with fallback
  const setStorage = (key, value) => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        // Fallback to sessionStorage for Claude.ai environment
        sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Storage not available:', error);
    }
  };

  const getStorage = (key) => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } else {
        // Fallback to sessionStorage for Claude.ai environment
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (error) {
      console.warn('Storage not available:', error);
      return null;
    }
  };

  const removeStorage = (key) => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.removeItem(key);
      } else {
        // Fallback to sessionStorage for Claude.ai environment
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Storage not available:', error);
    }
  };

  const fetchAttendance = async (student_id, password) => {
    setError('');
    setIsOffline(false);
    try {
      const res = await fetch(`${backendUrl}?student_id=${encodeURIComponent(student_id)}&password=${encodeURIComponent(password)}`);
      if (!res.ok) throw new Error('Invalid credentials or server error');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      // Store both credentials and attendance data
      setStorage('attendanceCredentials', {
        storedRoll: student_id,
        storedPass: password
      });
      setStorage('attendanceData', {
        data: json,
        timestamp: Date.now()
      });
      
      setData(json);
      setError('');
      return true;
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance');
      
      // If fetch fails, try to load cached data
      const cachedData = getStorage('attendanceData');
      if (cachedData) {
        setData(cachedData.data);
        setIsOffline(true);
        const cacheAge = Math.floor((Date.now() - cachedData.timestamp) / (1000 * 60 * 60)); // hours
        setError(`Using cached data (${cacheAge} hours old) - Check connection and refresh`);
      } else {
        setData(null);
      }
      return false;
    }
  };

  useEffect(() => {
    setFadeIn(true);
    
    // Try to load stored credentials and data
    const storedCredentials = getStorage('attendanceCredentials');
    const storedData = getStorage('attendanceData');
    
    if (storedCredentials && storedCredentials.storedRoll && storedCredentials.storedPass) {
      setRoll(storedCredentials.storedRoll);
      setPass(storedCredentials.storedPass);
      setShowLogin(false);
      
      // If we have cached data, show it immediately
      if (storedData && storedData.data) {
        setData(storedData.data);
        const cacheAge = Math.floor((Date.now() - storedData.timestamp) / (1000 * 60 * 60)); // hours
        if (cacheAge > 0) {
          setError(`Showing cached data (${cacheAge} hours old) - Refreshing...`);
        }
      }
      
      // Then try to fetch fresh data
      fetchAttendance(storedCredentials.storedRoll, storedCredentials.storedPass);
    }
  }, []);

  const handleSubmit = async () => {
    if (!roll || !pass) {
      setError('Please provide both Roll Number and Password.');
      return;
    }
    setLoading(true);
    const ok = await fetchAttendance(roll, pass);
    setLoading(false);
    if (ok) {
      setShowLogin(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAttendance(roll, pass);
    setLoading(false);
  };

  const handleLogout = () => {
    // Clear all stored data
    removeStorage('attendanceCredentials');
    removeStorage('attendanceData');
    setRoll('');
    setPass('');
    setData(null);
    setShowLogin(true);
    setError('');
    setIsOffline(false);
  };

  const getAttendanceColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 85) return 'text-green-600';
    if (pct >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBg = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 85) return 'bg-green-50 border-green-200';
    if (pct >= 75) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // Check if there are any subjects below 75%
  const hasSubjectsBelow75 = data?.subjectwise_summary?.some(subject => parseFloat(subject.percentage) < 75) || false;

  // Derived values for progress bar and hero section
  const attendancePercentage = data?.total_info?.total_percentage || 0;
  const isGoodAttendance = attendancePercentage >= 75;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`container mx-auto px-2 md:px-4 py-6 md:py-8 transition-all duration-700 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Attendance
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Track your academic progress with precision and clarity
          </p>
        </div>

        {/* Offline/Cache Status */}
        {isOffline && (
          <div className="mb-4 md:mb-6 text-center text-orange-600 font-medium bg-orange-50 border border-orange-200 rounded-xl py-2 px-3 md:py-3 md:px-4">
            📱 Offline Mode - Using cached data
          </div>
        )}

        {error && (
          <div className={`mb-4 md:mb-6 text-center font-medium rounded-xl py-2 px-3 md:py-3 md:px-4 ${
            isOffline ? 'text-orange-600 bg-orange-50 border border-orange-200' : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            {error}
          </div>
        )}

        {showLogin ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow border border-gray-100">
              <div className="text-center mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <User className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Welcome</h2>
                <p className="text-gray-600 text-sm md:text-base">Sign in to continue</p>
              </div>
              <div className="space-y-4 md:space-y-5">
                <input
                  type="text"
                  value={roll}
                  onChange={e => setRoll(e.target.value)}
                  placeholder="Roll Number"
                  className="w-full px-4 py-2 md:px-5 md:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-base placeholder-gray-400"
                  onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                />
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-2 md:px-5 md:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-base placeholder-gray-400"
                  onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-black text-white font-semibold py-2 md:py-3 px-4 md:px-5 rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : null}
                  {loading ? 'Signing in...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5 md:space-y-6">
            {/* Stats Overview */}
            <div className="bg-white rounded-3xl p-4 md:p-6 shadow border border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between mb-4 md:mb-6 gap-3 md:gap-0">
                <div className="text-center md:text-left">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Overview</h2>
                  <p className="text-gray-600 text-sm md:text-base">Your attendance summary</p>
                  {data?.roll_number && (
                    <p className="text-gray-500 text-xs md:text-sm mt-1">Roll: {data.roll_number}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 md:space-x-3">
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 md:px-4 md:py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 font-medium text-gray-700"
                  >
                    Switch User
                  </button>
                </div>
              </div>
              {/* Main Content */}
              {data?.total_info && (
                <div className="p-8">
                  {/* Attendance Percentage - Hero Section */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-36 h-36 rounded-full text-white mb-4 ${
                      isGoodAttendance ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
                    }`}>
                      <span className="text-4xl font-bold p-2">
                        {attendancePercentage}%
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Overall Attendance Rate</h3>
                    <p className={`text-lg font-semibold ${
                      isGoodAttendance ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isGoodAttendance ? 'Excellent Attendance!' : 'Needs Improvement'}
                    </p>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Classes Attended */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-500 p-2 rounded-lg">
                          <CheckCircle className="text-white" size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">Classes Attended</h4>
                          <p className="text-sm text-gray-600">Present in class</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {data.total_info.total_attended}
                      </div>
                    </div>

                    {/* Total Classes */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <Calendar className="text-white" size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">Total Classes</h4>
                          <p className="text-sm text-gray-600">Classes conducted</p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-blue-600">
                        {data.total_info.total_held}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Attendance Progress</span>
                      <span className="text-sm font-medium text-gray-700">{attendancePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isGoodAttendance ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'
                        }`}
                        style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span className="text-orange-600 font-medium">75% (Required)</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button - Only show if there are subjects below 75% */}
            {hasSubjectsBelow75 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowBelow75(!showBelow75)}
                  className="bg-white rounded-2xl px-5 py-2 md:px-6 md:py-3 shadow border border-gray-100 hover:shadow transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900 text-base">
                      {showBelow75 ? 'Hide' : 'View'} Low Attendance
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              </div>
            )}

            {/* Below 75% Alert */}
            {showBelow75 && data?.subjectwise_summary && (
              <div className="bg-white rounded-3xl p-4 md:p-6 shadow border border-red-200">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-red-600 mb-1">Attention Required</h3>
                    <p className="text-gray-600 text-xs md:text-base">Subjects below 75% attendance threshold</p>
                  </div>
                  <button
                    onClick={() => setShowBelow75(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="grid gap-2 md:gap-3">
                  {data.subjectwise_summary
                    .filter(subject => parseFloat(subject.percentage) < 75)
                    .map((subject, idx) => (
                      <div key={subject.subject_name + idx} className={`${getAttendanceBg(subject.percentage)} border rounded-xl p-3 md:p-4 flex items-center justify-between`}>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">{subject.subject_name}</h4>
                          <p className="text-gray-600 mt-1 text-xs md:text-sm">
                            {subject.attended_held} - Needs improvement
                          </p>
                        </div>
                        <div className={`${getAttendanceColor(subject.percentage)} text-base md:text-lg font-bold`}>
                          {subject.percentage}%
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
           
            {/* Today's Attendance */}
            <div className="bg-white rounded-3xl p-4 md:p-6 shadow border border-gray-100">
              <div className="mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Today's Attendance</h2>
                <p className="text-gray-600 text-sm md:text-base">Current session attendance breakdown</p>
              </div>
              {data ? <AttendanceDisplay data={data} /> : (
                <div className="text-center py-6 md:py-10">
                  <div className="animate-pulse">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-2xl mx-auto mb-2"></div>
                    <div className="h-2 md:h-3 bg-gray-200 rounded w-24 md:w-32 mx-auto"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Subject-wise Summary */}
            {data?.subjectwise_summary && (
              <div className="bg-white rounded-3xl p-4 md:p-6 shadow border border-gray-100">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Subject-wise Summary</h2>
                  <p className="text-gray-600 text-sm md:text-base">Detailed attendance breakdown by subject</p>
                </div>
                <div className="grid gap-3 md:gap-4">
                  {data.subjectwise_summary.map((subject, idx) => (
                    <div key={subject.subject_name + idx} className={`${getAttendanceBg(subject.percentage)} border rounded-xl p-3 md:p-4 flex items-center justify-between`}>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm md:text-base">{subject.subject_name}</h4>
                        <p className="text-gray-600 mt-1 text-xs md:text-sm">
                          Attended: {subject.attended_held}
                        </p>
                      </div>
                      <div className={`${getAttendanceColor(subject.percentage)} text-base md:text-lg font-bold`}>
                        {subject.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;