import { Route, Routes } from "react-router";
import { Home } from "./pages/Home";

/**
 * One route for now (step-02 §2c). The board (step 06), the pickers (step 07), the
 * overrides sheet (step 08) and The Kitchen (step 09) all add routes/views later — this
 * file is deliberately thin until they do.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
