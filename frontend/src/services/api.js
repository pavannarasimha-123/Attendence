import axios from 'axios';

// Smart API URL detection:
// 1. Explicit VITE_API_URL if provided
// 2. http://localhost:3000 if running in local Vite dev server (port 5173)
// 3. Relative path (empty string) in production when deployed together on Render
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location.port === '5173') {
        return 'http://localhost:3000';
    }
    return '';
};

const API_URL = getBaseUrl();

/**
 * Marks attendance for a given roll number.
 * @param {string} rollNo - The student's roll number.
 * @returns {Promise<Object>} - The server response containing message and student details.
 * @throws {Error} - Throws an error if the request fails.
 */
export const markAttendance = async (rollNo) => {
    try {
        const response = await axios.post(`${API_URL}/api/mark-attendance`, { rollNo });
        return response.data;
    } catch (error) {
        console.error("API Error Details:", {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });

        // Enhance error object with useful message
        const responseData = error.response?.data;
        const errorMessage = responseData?.error || responseData?.suggestion || error.message || "Connection Error";

        const enhancedError = new Error(errorMessage);
        enhancedError.status = error.response?.status;
        enhancedError.data = responseData;
        enhancedError.originalError = error;
        throw enhancedError;
    }
};

/**
 * Fetches the full attendance list.
 * @returns {Promise<Object>} The list of students.
 */
export const getAttendance = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/attendance`);
        return response.data;
    } catch (error) {
        const responseData = error.response?.data;
        const errorMessage = responseData?.error || (error.code === 'ECONNABORTED' || error.message.includes('timeout')
            ? 'Cloud connection slow. Retrying sync...'
            : 'Failed to fetch attendance list');

        throw new Error(errorMessage);
    }
};

/**
 * Verifies the portal password (Admin).
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export const verifyPassword = async (password) => {
    try {
        const response = await axios.post(`${API_URL}/api/verify-password`, { password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Verification failed');
    }
};

/**
 * Verifies the coordinator password.
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export const verifyCoordinatorPassword = async (password) => {
    try {
        const response = await axios.post(`${API_URL}/api/verify-coordinator`, { password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Verification failed');
    }
};

/**
 * Clears all attendance records (resets isPresent to FALSE).
 * @param {string} password - The portal password for authorization.
 * @returns {Promise<Object>}
 */
export const clearAttendance = async (password) => {
    try {
        const response = await axios.post(`${API_URL}/api/clear-attendance`, { password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to clear attendance');
    }
};

/**
 * Registers a new student on the spot and optionally marks them present.
 * @param {Object} studentData - { rollNo, name, branch, semester, section, isPresent }
 * @returns {Promise<Object>}
 */
export const registerStudent = async (studentData) => {
    try {
        const response = await axios.post(`${API_URL}/api/register-student`, studentData);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Registration failed');
    }
};

/**
 * Gets server runtime status and configuration mode.
 * @returns {Promise<Object>}
 */
export const getServerStatus = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/status`);
        return response.data;
    } catch (error) {
        return { status: 'offline', mode: 'unknown', totalStudents: 0 };
    }
};

/**
 * Pings the server to check if it represents a backend wakeup.
 * @returns {Promise<boolean>}
 */
export const pingServer = async () => {
    try {
        await axios.get(`${API_URL}/api/status`);
        return true;
    } catch (error) {
        return false;
    }
};
