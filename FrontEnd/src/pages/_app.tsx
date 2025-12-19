import { HeaderProvider } from "@/context/HeaderContext";
import { Outlet } from "react-router-dom";


export default function AppLayout() {
  return (
      <HeaderProvider>
        <Outlet />
      </HeaderProvider>
  )
}
