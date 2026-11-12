import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateEvent from "./pages/CreateEvent";
import MyEvents from "./pages/MyEvents";
import EventDetails from "./pages/EventDetails";
import ProfileSettings from "./pages/ProfileSettings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/create-event" element={<CreateEvent />} />
      <Route path="/events" element={<MyEvents />} />
      <Route path="/events/:id" element={<EventDetails />} />

      <Route path="/profile" element={<ProfileSettings />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}




