import { createHashRouter, RouterProvider } from "react-router";
import { ExplorerPage } from "@/pages/explorer";

// Hash-based history keeps routing self-contained under the tauri:// origin.
const router = createHashRouter([
  {
    path: "/",
    element: <ExplorerPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
