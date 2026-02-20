import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

type AdminTab = "questions" | "tests" | "subjects" | "bugs";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  userEmail?: string;
  onLogout: () => void;
  bugCount: number;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "questions",
    label: "Questions",
    icon: (
      <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "tests",
    label: "Tests",
    icon: (
      <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: "subjects",
    label: "Subjects",
    icon: (
      <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "bugs",
    label: "Bug Reports",
    icon: (
      <svg width="20" height="20" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

export default function AdminSidebar({
  activeTab,
  onTabChange,
  userEmail,
  onLogout,
  bugCount,
  sidebarOpen,
  onCloseSidebar,
}: AdminSidebarProps) {
  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 transform transition-transform duration-300 lg:transform-none ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo/Title */}
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/beaver-images/logo.png"
              alt="Regents Ready"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
              Regents Ready
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  onClick={() => {
                    onTabChange(tab.key);
                    onCloseSidebar();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.key === "bugs" && bugCount > 0 && (
                    <span
                      className={`ml-auto px-1.5 py-0.5 text-xs font-bold rounded-full ${
                        activeTab === "bugs"
                          ? "bg-white text-black dark:bg-black dark:text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {bugCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info + Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
          {userEmail && (
            <p className="text-xs text-gray-500 dark:text-neutral-400 truncate mb-3">
              {userEmail}
            </p>
          )}
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:border-black dark:hover:border-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 rounded-full transition-all"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </aside>
  );
}
