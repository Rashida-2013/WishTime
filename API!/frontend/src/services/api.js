import axios from "axios";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// AUTHENTICATION
// ============================================

export async function loginUser(payload) {
  return api.post("/auth/login", payload);
}

export function loginWithGoogle() {
  window.location.href = `${API_BASE}/auth/google`;
}

export async function registerUser(payload) {
  return api.post("/auth/register", payload);
}

export async function getCurrentUser() {
  return api.get("/auth/me");
}

export async function logoutUser() {
  return api.post("/auth/logout");
}

// ============================================
// GENERAL EVENTS
// These paths match the Event endpoints in main.py.
// ============================================

// Get all events belonging to the logged-in user
export async function getEvents(payload) {
  return api.get("/events", {
    params: payload,
  });
}

// Get scheduled events for display when the user
// is not currently logged in.
export async function getPublicEvents() {
  return api.get("/public/events");
}

// Get a single event
export async function getEventById(id) {
  return api.get(`/events/${id}`);
}

// Create a new event
export async function createEvent(payload) {
  return api.post("/events", payload);
}

// Update an event
export async function updateEvent(id, payload) {
  return api.put(`/events/${id}`, payload);
}

// Delete an event
export async function deleteEvent(id) {
  return api.delete(`/events/${id}`);
}

// Cancel an event schedule
export async function cancelEvent(id) {
  return api.post(`/events/${id}/cancel`);
}

// ============================================
// PROFILE
// Note: verify that this endpoint exists in main.py.
// ============================================

export async function updateProfile(payload) {
  return api.put("/profile", payload);
}

// ============================================
// WISH GENERATION
// Note: verify that this endpoint exists in main.py.
// ============================================

export async function generateWish(payload) {
  return api.post("/wishes/generate", payload);
}
