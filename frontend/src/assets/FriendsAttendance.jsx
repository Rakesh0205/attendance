import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users, Star, TrendingUp } from 'lucide-react';

const FriendsAttendance = () => {
  const backendUrl = 'https://attendance-4dtj.onrender.com/api/attendance';
  // Fetch attendance percentage for a single friend (using their roll and password)
  const fetchSingleAttendance = async (roll, encodedPassword) => {
    try {
      // Decode the friend's password
      const password = decode(encodedPassword || "");
      const res = await fetch(`${backendUrl}?student_id=${encodeURIComponent(roll)}&password=${encodeURIComponent(password)}`);
      const data = await res.json();
      // Try to extract percentage from subjectwise_summary[0]
      if (
        data &&
        Array.isArray(data.subjectwise_summary) &&
        data.subjectwise_summary.length > 0 &&
        data.subjectwise_summary[0].percentage
      ) {
        return data.subjectwise_summary[0].percentage;
      }
      // fallback: try total_info.total_percentage
      if (data && data.total_info && data.total_info.total_percentage) {
        return data.total_info.total_percentage;
      }
      return null;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return null;
    }
  }
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [roll, setRoll] = useState("");
  const [password, setPassword] = useState("");

  const [friends, setFriends] = useState(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem("friends");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Store attendance percentages for each friend by roll
  const [attendanceMap, setAttendanceMap] = useState({});

  // Fetch attendance for all friends when list changes or when opened
  useEffect(() => {
    if (!open || friends.length === 0) return;
    let cancelled = false;
    const fetchAll = async () => {
      const results = {};
      await Promise.all(
        friends.map(async (friend) => {
          const perc = await fetchSingleAttendance(friend.roll, friend.password);
          results[friend.roll] = perc;
        })
      );
      if (!cancelled) setAttendanceMap(results);
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [open, friends]);

  // Simple base64 encode/decode helpers
  function encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return str;
    }
  }
  function decode(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch {
      return str;
    }
  }

  // Add friend handler
  const handleAddFriend = (e) => {
    e.preventDefault();
    if (!roll || !password) return;
    // Check for duplicate roll
    if (friends.some(f => f.roll === roll)) {
      alert("This roll number is already added.");
      return;
    }
    const newFriend = {
      name: roll, // You can fetch/display name from backend if needed
      attendance: 0,
      streak: 0,
      avatar: '👤',
      trend: 'up',
      roll,
      password: encode(password)
    };
    const updated = [...friends, newFriend];
    setFriends(updated);
    localStorage.setItem("friends", JSON.stringify(updated));
    setRoll("");
    setPassword("");
    setShowAdd(false);
  };

  return (
    <div className="max-w-2xl rounded-5xl mx-auto mt-10 mb-8 px-2 md:px-0">
      <div className="relative bg-white rounded-lg border border-gray-200 shadow-lg">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-6 text-left hover:bg-gray-100 transition-all duration-300 rounded-t-lg"
          aria-label="Toggle friends attendance"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full flex items-center justify-center shadow-md mr-3 md:mr-5">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Friends' Attendance</h3>
              <p className="text-gray-500 text-xs md:text-sm mt-1">See how your squad is doing</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-500 rounded-full text-white font-medium text-xs md:text-sm mr-2 md:mr-3">
              {open ? 'Hide' : 'Show'}
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-300">
              {open ? (
                <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              )}
            </div>

          </div>

        </button>
        {/* Add Friend Button */}
        {open && (
        <div>
          <div className="flex justify-end px-4 md:px-6 pt-2">
            <button
              className="bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded shadow"
              onClick={() => setShowAdd((v) => !v)}
            >
              {showAdd ? 'Cancel' : 'Add Friend'}
            </button>
          </div>
          {/* Add Friend Form */}
          {showAdd && (
            <form className="px-4 md:px-6 py-2 flex flex-col gap-2" onSubmit={handleAddFriend}>
              <input
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Roll Number"
                value={roll}
                onChange={e => setRoll(e.target.value)}
                required
              />
              <input
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm font-semibold px-3 py-2 rounded mt-1"
              >
                Add
              </button>
            </form>
          )}
          {/* Expandable content with smooth animation */}
          {open && (
            friends.length === 0 ? (
              <div className="px-4 md:px-6 py-4 text-center text-gray-500">
                No friends added yet.
              </div>
            ) : (
              <div className="overflow-y-auto bg-gray-50 rounded-b-lg">
                <div className="px-3 md:px-6 py-3 md:py-4 pb-2">
                  <div className="space-y-3">
                    {friends.map((friend, index) => (
                      <div key={index} className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full flex items-center justify-center text-base md:text-lg font-bold text-gray-700 mr-3 md:mr-4">
                            {friend.avatar}
                          </div>
                          <div>
                            <div className="flex items-center mb-1">
                              <span className="font-semibold text-gray-900 mr-2 text-sm md:text-base">{friend.name}</span>
                              {friend.streak > 5 && <Star className="w-4 h-4 text-yellow-500" />}
                            </div>
                            <div className="flex items-center text-xs md:text-sm text-gray-500">
                              <span className="mr-2">{friend.streak} day streak</span>
                              <TrendingUp className={`w-3 h-3 ${friend.trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end mb-1 md:mb-2">
                            <span className="text-xl md:text-2xl font-bold text-gray-900">
                              {attendanceMap[friend.roll] !== undefined && attendanceMap[friend.roll] !== null
                                ? `${attendanceMap[friend.roll]}%`
                                : <span className="text-gray-400 text-base">...</span>}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-12 md:w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-blue-500 rounded-full transition-all duration-500`}
                              style={{ width: attendanceMap[friend.roll] ? `${attendanceMap[friend.roll]}%` : '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default FriendsAttendance;