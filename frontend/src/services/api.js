import axios from 'axios';

// Get API URL from environment variables or default to localhost, ensuring no trailing slash
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');

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
 * Verifies the portal password.
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
 * Pings the server to check if it represents a backend wakeup.
 * @returns {Promise<boolean>}
 */
export const pingServer = async () => {
    try {
        await axios.get(`${API_URL}/`);
        return true;
    } catch (error) {
        return false;
    }
};

