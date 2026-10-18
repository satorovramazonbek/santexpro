import React, { useState, useEffect } from 'react';
import { User } from './types';
import { api } from './api/client';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsListPage } from './pages/ProjectsListPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { RoomEditorPage } from './pages/RoomEditorPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { QuickCalculatorPage } from './pages/QuickCalculatorPage';
import { RadiatorCatalogPage } from './pages/RadiatorCatalogPage';
import { AdminPage } from './pages/AdminPage';
import { ShieldAlert, Heart } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check auth session on start
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (api.getToken()) {
          const res = await api.getMe();
          setCurrentUser(res.user);
        } else {
          // Auto-login to demo account for smooth initial experience
          try {
            const res = await api.login('usta_xasan', 'santex2026');
            setCurrentUser(res.user);
          } catch {
            // If demo login fails, keep guest
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleOpenProject = (id: number) => {
    setSelectedProjectId(id);
    setActiveTab('project-detail');
  };

  const handleOpenRoomEditor = (id: number) => {
    setSelectedRoomId(id);
    setActiveTab('room-editor');
  };

  const handleOpenMaterials = (id: number) => {
    setSelectedProjectId(id);
    setActiveTab('materials');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 animate-pulse shadow-lg shadow-blue-500/20">
            <span className="font-extrabold text-lg">SP</span>
          </div>
          <p className="text-slate-600 font-semibold text-sm">SantexPro platformasi yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'projects') setSelectedProjectId(null);
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Asosiy Kontent */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onOpenProject={handleOpenProject}
            onOpenProjectsList={() => setActiveTab('projects')}
            onOpenQuickCalc={() => setActiveTab('quick-calc')}
            onOpenCatalog={() => setActiveTab('catalog')}
            onCreateProjectSuccess={(id) => {
              setSelectedProjectId(id);
              setActiveTab('project-detail');
            }}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsListPage
            onOpenProject={handleOpenProject}
            onCreateNew={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'project-detail' && selectedProjectId && (
          <ProjectDetailPage
            projectId={selectedProjectId}
            onBack={() => setActiveTab('projects')}
            onOpenRoomEditor={handleOpenRoomEditor}
            onOpenMaterials={handleOpenMaterials}
          />
        )}

        {activeTab === 'room-editor' && selectedRoomId && (
          <RoomEditorPage
            roomId={selectedRoomId}
            onBack={() => setActiveTab('project-detail')}
          />
        )}

        {activeTab === 'materials' && selectedProjectId && (
          <MaterialsPage
            projectId={selectedProjectId}
            onBack={() => setActiveTab('project-detail')}
          />
        )}

        {activeTab === 'quick-calc' && (
          <QuickCalculatorPage
            onCreateProjectFromCalc={async (calcData) => {
              let createdProjectId: number | null = null;
              try {
                const proj = await api.createProject({
                  name: `Tezkor hisob loyihasi (${calcData.length}x${calcData.width}m)`,
                  outdoor_design_temp: calcData.tOutside !== undefined ? calcData.tOutside : -15.0,
                  notes: `Tezkor hisoblangan issiqlik quvvati: ${calcData.totalHeatLossW} Vt`,
                });
                createdProjectId = proj.id;
                await api.createRoom({
                  project: proj.id,
                  name: "Asosiy xona",
                  length: calcData.length,
                  width: calcData.width,
                  height: calcData.height,
                  desired_temp: calcData.tInside !== undefined ? calcData.tInside : 22.0,
                });
                setSelectedProjectId(proj.id);
                setActiveTab('project-detail');
              } catch (err: any) {
                if (createdProjectId) {
                  try {
                    await api.deleteProject(createdProjectId);
                  } catch {}
                }
                alert("Loyiha yaratishda xatolik: " + err.message);
              }
            }}
          />
        )}

        {activeTab === 'catalog' && <RadiatorCatalogPage currentUser={currentUser} />}

        {activeTab === 'admin' && (
          currentUser && (currentUser.is_staff || currentUser.is_superuser) ? (
            <AdminPage />
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-red-200 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Ruxsat cheklangan (Faqat Admin)</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Ushbu bo‘lim faqat tizim administratorlari uchun mo‘ljallangan. Agar sizda administrator login va paroli bo‘lsa, tizimga admin sifatida kiring.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Bosh sahifaga qaytish
                </button>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition shadow-xs"
                >
                  Admin sifatida kirish
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Quyi qism (Footer) va muhandislik eslatmasi */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-500 space-y-3">
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Muhandislik xavfsizligi eslatmasi:</b> SantexPro isitish tizimlari montajchilari va muhandislari uchun hisoblash yordamchisi hisoblanadi.
              Barcha hisob-kitoblar dastlabki muhandislik baholash hisoblanib, montaj qilishdan avval amaldagi qurilish me’yorlari (KMK, ShNK) hamda ishlab chiqaruvchilarning texnik pasportlariga muvofiqligi tekshirilishi shart.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
            <div>
              © 2026 <b>SantexPro</b> — Isitish Tizimlarini Loyihalash va Hisoblash Platformasi. Barcha huquqlar himoyalangan.
            </div>
            <div>
              Metrik o‘lchov birliklari: metr (m), sm, m², Vt, l/soat, mm
            </div>
          </div>
        </div>
      </footer>

      {/* Login / Register Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
};

export default App;
