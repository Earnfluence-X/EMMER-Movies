import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Download, Film, Home as HomeIcon, List, User, Bell, HardDrive } from "lucide-react";
import { useDownloads } from "../context/DownloadContext";
import { useMyList } from "../context/MyListContext";
import { SmartSearchBar } from "./SmartSearchBar";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const { items } = useDownloads();
  const { items: myListItems } = useMyList();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hidden md:flex items-center gap-1.5 ${
      isActive ? "text-white" : "text-zinc-300 hover:text-white"
    }`;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/95 backdrop-blur-md shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-10 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-[#e50914] text-2xl md:text-3xl font-black tracking-tighter">EMMER</span>
          <span className="text-white text-xs md:text-sm font-light tracking-widest mt-1">MOVIES</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-5">
          <NavLink to="/" end className={linkCls}>
            <HomeIcon size={16} /> Home
          </NavLink>
          <NavLink to="/browse" className={linkCls}>
            <Film size={16} /> Browse
          </NavLink>
          <NavLink to="/mylist" className={linkCls}>
            <List size={16} /> My List
            {myListItems.length > 0 && (
              <span className="ml-1 bg-[#e50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {myListItems.length}
              </span>
            )}
          </NavLink>
          <NavLink to="/downloads" className={linkCls}>
            <Download size={16} /> Library
            {items.length > 0 && (
              <span className="ml-1 bg-[#e50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {items.length}
              </span>
            )}
          </NavLink>
          <NavLink to="/offline-downloads" className={linkCls}>
            <HardDrive size={16} /> Offline
          </NavLink>
        </nav>

        {/* Smart Search */}
        <SmartSearchBar />

        {/* Right side icons */}
        <div className="flex items-center gap-3">
          <button className="text-zinc-300 hover:text-white transition hidden md:block">
            <Bell size={20} />
          </button>
          
          <NavLink to="/mylist" className="md:hidden text-zinc-300 hover:text-white relative">
            <List size={20} />
            {myListItems.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#e50914] text-white text-[9px] rounded-full px-1 font-bold">
                {myListItems.length}
              </span>
            )}
          </NavLink>
          
          <NavLink to="/downloads" className="md:hidden text-zinc-300 hover:text-white relative">
            <Download size={20} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#e50914] text-white text-[9px] rounded-full px-1 font-bold">
                {items.length}
              </span>
            )}
          </NavLink>

          <NavLink to="/offline-downloads" className="md:hidden text-zinc-300 hover:text-white relative">
            <HardDrive size={20} />
          </NavLink>
          
          <button className="text-zinc-300 hover:text-white transition">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}