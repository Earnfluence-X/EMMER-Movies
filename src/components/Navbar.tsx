import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Download, Film, Home as HomeIcon } from "lucide-react";
import { useDownloads } from "../context/DownloadContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { items } = useDownloads();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

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
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-[#e50914] text-2xl md:text-3xl font-black tracking-tighter">EMMER</span>
          <span className="text-white text-xs md:text-sm font-light tracking-widest mt-1">MOVIES</span>
        </Link>

        <nav className="flex items-center gap-5">
          <NavLink to="/" end className={linkCls}>
            <HomeIcon size={16} /> Home
          </NavLink>
          <NavLink to="/browse" className={linkCls}>
            <Film size={16} /> Browse
          </NavLink>
          <NavLink to="/downloads" className={linkCls}>
            <Download size={16} /> Library
            {items.length > 0 && (
              <span className="ml-1 bg-[#e50914] text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {items.length}
              </span>
            )}
          </NavLink>
        </nav>

        <form onSubmit={submit} className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search movies, shows..."
              className="bg-black/70 border border-zinc-700 focus:border-zinc-400 outline-none rounded-md pl-9 pr-3 py-2 text-sm text-white w-40 sm:w-56 md:w-72 transition-all"
            />
          </div>
          <NavLink to="/downloads" className="md:hidden text-zinc-300 hover:text-white relative">
            <Download size={20} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#e50914] text-white text-[9px] rounded-full px-1 font-bold">
                {items.length}
              </span>
            )}
          </NavLink>
        </form>
      </div>
    </header>
  );
}
