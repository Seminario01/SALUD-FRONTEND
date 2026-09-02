import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import Citas from "./pages/Citas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/citas" element={<Citas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}