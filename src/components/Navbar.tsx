import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Download, Film, Home as HomeIcon, List, User, Bell, HardDrive, Search, Tv } from "lucide-react";
import { useDownloads } from "../context/DownloadContext";
import { useMyList } from "../context/MyListContext";
import { SmartSearchBar } from "./SmartSearchBar";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
      isActive ? "text-white" : "text-zinc-400 hover:text-white"
    }`;

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
      isActive 
        ? "text-white border-[#e50914] bg-white/5" 
        : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
    }`;

  return (
    <header
      className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}
    >
      <div className="flex items-center gap-6 w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-[#e50914] text-2xl md:text-3xl font-black tracking-tighter">EMMER</span>
          <span className="text-white text-xs md:text-sm font-light tracking-widest hidden sm:block">MOVIES</span>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          <button className="text-zinc-300 hover:text-white transition hidden md:block">
            <Bell size={20} />
          </button>
          
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          <button className="text-zinc-300 hover:text-white transition hidden md:block">
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-t border-zinc-800 md:hidden">
          <div className="flex flex-col py-2">
            <NavLink to="/" end className={mobileLinkCls} onClick={() => setShowMobileMenu(false)}>
              <HomeIcon size={16} className="inline mr-3" /> Home
            </NavLink>
            <NavLink to="/browse" className={mobileLinkCls} onClick={() => setShowMobileMenu(false)}>
              <Film size={16} className="inline mr-3" /> Browse
            </NavLink>
            <NavLink to="/mylist" className={mobileLinkCls} onClick={() => setShowMobileMenu(false)}>
              <List size={16} className="inline mr-3" /> My List
              {myListItems.length > 0 && (
                <span className="ml-2 bg-[#e50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {myListItems.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/downloads" className={mobileLinkCls} onClick={() => setShowMobileMenu(false)}>
              <Download size={16} className="inline mr-3" /> Library
              {items.length > 0 && (
                <span className="ml-2 bg-[#e50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {items.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/offline-downloads" className={mobileLinkCls} onClick={() => setShowMobileMenu(false)}>
              <HardDrive size={16} className="inline mr-3" /> Offline
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}