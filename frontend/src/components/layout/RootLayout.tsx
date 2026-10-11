import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <VoiceAssistantModal />
    </div>
  );
}

